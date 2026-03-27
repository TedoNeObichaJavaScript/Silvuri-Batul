const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const Game = require('./game');
const { WARRIORS, SUPPORT_CARDS, RARITY_COLORS, RARITY_NAMES } = require('./cards');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://tedoneobichajavascript.github.io'
    ],
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

const games = new Map();
const socketToGame = new Map();
const actionTimestamps = new Map();
const disconnectedPlayers = new Map(); // key: `${lobbyCode}:${playerName}` → { oldSocketId, timestamp }
const RATE_LIMIT_MS = 500;
const COUNTER_TIMEOUT_MS = 10000;
const TURN_TIMEOUT_MS = 30000;

// Input sanitization
function sanitizeName(name) {
  return String(name || '').trim().slice(0, 20).replace(/[<>&"'/\\]/g, '');
}

function sanitizeCode(code) {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

// Clean up abandoned games every 5 minutes
setInterval(() => {
  for (const [code, game] of games) {
    if (game.players.size === 0) {
      games.delete(code);
    }
  }
}, 5 * 60 * 1000);

// Helper: start turn timer — auto-skip if player doesn't act in 30s
function startTurnTimer(code, game) {
  clearTurnTimer(game);
  const currentTurnId = game.turnOrder[game.currentTurnIndex];
  if (!currentTurnId) return;

  game.turnTimeoutId = setTimeout(() => {
    if (game.state !== 'battle' || game.pendingAttack) return;
    const player = game.players.get(currentTurnId);
    if (!player || player.eliminated) return;

    // Auto-skip: pick a random valid target and attack with no spell
    const targets = game.getAlivePlayers().filter(p => p.id !== currentTurnId && !p.immune);
    const validTargets = targets.length > 0 ? targets : game.getAlivePlayers().filter(p => p.id !== currentTurnId);
    if (validTargets.length === 0) return;

    const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
    const result = game.submitTurn(currentTurnId, randomTarget.id, null);
    if (result.error) return;

    io.to(code).emit('turn_timeout', { playerId: currentTurnId, playerName: player.name });

    if (result.waitingForCounter) {
      const defenderPrivate = game.getPlayerPrivateState(result.targetId);
      io.to(result.targetId).emit('counter_prompt', {
        attackerName: result.attackerName, attackerWarrior: result.attackerWarrior,
        spellUsed: result.spellUsed, counters: defenderPrivate ? defenderPrivate.counters : [],
        timeLimit: COUNTER_TIMEOUT_MS / 1000
      });
      io.to(code).emit('waiting_for_counter', { attackerName: result.attackerName, targetId: result.targetId });
      game.counterTimeoutId = setTimeout(() => {
        if (game.pendingAttack) {
          const resolveResult = game.resolveTurn(null);
          if (!resolveResult.error) broadcastTurnResult(code, game, resolveResult);
        }
      }, COUNTER_TIMEOUT_MS);
    } else {
      broadcastTurnResult(code, game, result);
    }
  }, TURN_TIMEOUT_MS);
}

function clearTurnTimer(game) {
  if (game.turnTimeoutId) { clearTimeout(game.turnTimeoutId); game.turnTimeoutId = null; }
}

// Helper: broadcast turn result and handle round/game transitions
function broadcastTurnResult(code, game, result) {
  io.to(code).emit('turn_result', {
    action: result.action,
    results: result.results,
    playerStates: result.playerStates,
    nextTurn: result.nextTurn,
    roundComplete: result.roundComplete,
    gameOver: result.gameOver,
    winner: result.winner
  });

  // Send updated private states
  for (const [playerId] of game.players) {
    io.to(playerId).emit('private_state', game.getPlayerPrivateState(playerId));
  }

  if (result.gameOver) {
    clearTurnTimer(game);
    io.to(code).emit('game_over', { winner: result.winner, playerStates: result.playerStates });
  } else if (result.roundComplete) {
    clearTurnTimer(game);
    // Start next round after delay
    setTimeout(() => {
      const roundData = game.startRound();
      if (roundData.gameOver) {
        // Emit game_over directly — don't emit round_start to avoid glitchy battle state
        if (roundData.battleLog && roundData.battleLog.length > 0) {
          io.to(code).emit('turn_result', {
            action: null, results: roundData.battleLog, playerStates: roundData.playerStates,
            nextTurn: null, roundComplete: false, gameOver: true, winner: roundData.winner
          });
        }
        io.to(code).emit('game_over', { winner: roundData.winner, playerStates: roundData.playerStates });
      } else {
        io.to(code).emit('round_start', roundData);
        for (const [playerId] of game.players) {
          io.to(playerId).emit('private_state', game.getPlayerPrivateState(playerId));
        }
        startTurnTimer(code, game);
      }
    }, 3000);
  } else {
    // Next turn — start timer
    startTurnTimer(code, game);
  }
}

app.get('/api/cards', (req, res) => res.json({ warriors: WARRIORS, rarityColors: RARITY_COLORS, rarityNames: RARITY_NAMES }));

io.on('connection', (socket) => {
  console.log(`Играч свързан: ${socket.id}`);

  // Create lobby
  socket.on('create_lobby', ({ playerName }, callback) => {
    if (typeof callback !== 'function') return;
    const name = sanitizeName(playerName);
    if (!name) return callback({ error: 'Невалидно име!' });

    const code = generateLobbyCode();
    const game = new Game(code, socket.id);
    game.addPlayer(socket.id, name);
    games.set(code, game);
    socketToGame.set(socket.id, code);
    socket.join(code);
    callback({ success: true, lobbyCode: code, playerId: socket.id, players: getPlayerList(game) });
  });

  // Join lobby
  socket.on('join_lobby', ({ lobbyCode, playerName }, callback) => {
    if (typeof callback !== 'function') return;
    const name = sanitizeName(playerName);
    if (!name) return callback({ error: 'Невалидно име!' });

    const code = sanitizeCode(lobbyCode);
    const game = games.get(code);
    if (!game) return callback({ error: 'Лобито не е намерено!' });

    const result = game.addPlayer(socket.id, name);
    if (result.error) return callback({ error: result.error });

    socketToGame.set(socket.id, code);
    socket.join(code);
    const players = getPlayerList(game);
    socket.to(code).emit('player_joined', { players, newPlayer: { id: socket.id, name } });
    callback({ success: true, lobbyCode: code, playerId: socket.id, hostId: game.hostId, players });
  });

  // Start game → draft phase
  socket.on('start_game', (_, callback) => {
    if (typeof callback !== 'function') return;
    const code = socketToGame.get(socket.id);
    const game = games.get(code);
    if (!game) return callback({ error: 'Играта не е намерена!' });
    if (game.hostId !== socket.id) return callback({ error: 'Само хостът може да стартира!' });

    const result = game.startGame();
    if (result.error) return callback({ error: result.error });

    // Send draft state to all
    io.to(code).emit('game_started', {
      state: 'draft',
      draftRolls: result.draftRolls,
      draftOrder: result.draftOrder,
      currentPicker: result.currentPicker
    });

    // Send options to first drafter only
    io.to(result.currentPicker).emit('draft_options', { options: result.options });

    callback({ success: true });
  });

  // Draft pick
  socket.on('draft_pick', ({ warriorId }, callback) => {
    if (typeof callback !== 'function') return;
    const code = socketToGame.get(socket.id);
    const game = games.get(code);
    if (!game) return callback({ error: 'Играта не е намерена!' });

    const result = game.draftPick(socket.id, warriorId);
    if (result.error) return callback({ error: result.error });

    // Broadcast the pick
    io.to(code).emit('warrior_picked', {
      pickedBy: result.pickedBy,
      pickedByName: result.pickedByName,
      warrior: result.warrior,
      draftComplete: result.draftComplete,
      nextPicker: result.nextPicker || null
    });

    if (result.draftComplete) {
      // Move to support card draft — send options to all players
      setTimeout(() => {
        io.to(code).emit('support_draft_start', { supportCards: SUPPORT_CARDS });
      }, 1500);
    } else {
      // Send options to next drafter
      io.to(result.nextPicker).emit('draft_options', { options: result.nextOptions });
    }

    callback({ success: true });
  });

  // Support card pick
  socket.on('support_pick', ({ supportId }, callback) => {
    if (typeof callback !== 'function') return;
    const code = socketToGame.get(socket.id);
    const game = games.get(code);
    if (!game) return callback({ error: 'Играта не е намерена!' });

    const result = game.supportPick(socket.id, supportId);
    if (result.error) return callback({ error: result.error });

    // Broadcast the pick to all
    io.to(code).emit('support_picked', {
      pickedBy: result.pickedBy,
      pickedByName: result.pickedByName,
      supportCard: result.supportCard,
      allPicked: result.allPicked
    });

    if (result.allPicked) {
      // Send private hands to each player
      for (const [playerId] of game.players) {
        const priv = game.getPlayerPrivateState(playerId);
        io.to(playerId).emit('cards_dealt', { spells: priv.spells, counters: priv.counters });
      }

      // Short delay then start battle
      setTimeout(() => {
        const roundData = game.startRound();
        io.to(code).emit('battle_start', {
          state: 'battle',
          playerStates: game.getPlayerStates()
        });
        io.to(code).emit('round_start', roundData);

        if (roundData.gameOver) {
          io.to(code).emit('game_over', { winner: roundData.winner, playerStates: roundData.playerStates });
        } else {
          for (const [playerId] of game.players) {
            io.to(playerId).emit('private_state', game.getPlayerPrivateState(playerId));
          }
          startTurnTimer(code, game);
        }
      }, 2000);
    }

    callback({ success: true });
  });

  // Submit turn action (now without counterUid — counters are reactive)
  socket.on('turn_action', ({ targetId, spellUid }, callback) => {
    if (typeof callback !== 'function') return;

    // Rate limit
    const lastTs = actionTimestamps.get(socket.id);
    const now = Date.now();
    if (lastTs && now - lastTs < RATE_LIMIT_MS) {
      return callback({ error: 'Твърде бързо!' });
    }
    actionTimestamps.set(socket.id, now);

    const code = socketToGame.get(socket.id);
    const game = games.get(code);
    if (!game) return callback({ error: 'Играта не е намерена!' });

    // Validate targetId is a string
    if (!targetId || typeof targetId !== 'string') {
      return callback({ error: 'Невалидна цел!' });
    }

    clearTurnTimer(game);
    const result = game.submitTurn(socket.id, targetId, spellUid || null);
    if (result.error) return callback({ error: result.error });

    if (result.waitingForCounter) {
      // Send counter prompt to the defender
      const defenderPrivate = game.getPlayerPrivateState(result.targetId);
      io.to(result.targetId).emit('counter_prompt', {
        attackerName: result.attackerName,
        attackerWarrior: result.attackerWarrior,
        spellUsed: result.spellUsed,
        counters: defenderPrivate ? defenderPrivate.counters : [],
        timeLimit: COUNTER_TIMEOUT_MS / 1000
      });

      // Notify everyone that we're waiting
      io.to(code).emit('waiting_for_counter', {
        attackerName: result.attackerName,
        targetId: result.targetId
      });

      // Set timeout — auto-resolve with no counter if defender doesn't respond
      game.counterTimeoutId = setTimeout(() => {
        if (game.pendingAttack) {
          const resolveResult = game.resolveTurn(null);
          if (!resolveResult.error) {
            broadcastTurnResult(code, game, resolveResult);
          }
        }
      }, COUNTER_TIMEOUT_MS);

      callback({ success: true, waiting: true });
    } else {
      // No counters available, already resolved
      broadcastTurnResult(code, game, result);
      callback({ success: true });
    }
  });

  // Counter response from defender
  socket.on('counter_response', ({ counterUid }, callback) => {
    const code = socketToGame.get(socket.id);
    const game = games.get(code);
    if (!game || !game.pendingAttack) {
      return callback?.({ error: 'Няма чакаща атака!' });
    }
    if (game.pendingAttack.targetId !== socket.id) {
      return callback?.({ error: 'Не е твоя контра!' });
    }

    // Clear timeout
    if (game.counterTimeoutId) {
      clearTimeout(game.counterTimeoutId);
      game.counterTimeoutId = null;
    }

    const result = game.resolveTurn(counterUid || null);
    if (result.error) return callback?.({ error: result.error });

    broadcastTurnResult(code, game, result);
    callback?.({ success: true });
  });

  // Play again
  socket.on('play_again', (_, callback) => {
    const code = socketToGame.get(socket.id);
    const game = games.get(code);
    if (!game) return;

    const newGame = new Game(code, game.hostId);
    for (const [id, player] of game.players) {
      newGame.addPlayer(id, player.name);
    }
    games.set(code, newGame);

    io.to(code).emit('phase_change', { state: 'lobby', players: getPlayerList(newGame) });
    if (callback) callback({ success: true });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Играч изключен: ${socket.id}`);
    const code = socketToGame.get(socket.id);
    if (!code) return;
    const game = games.get(code);
    if (!game) return;

    const player = game.players.get(socket.id);

    // Handle pending attack if this player is involved
    if (game.pendingAttack) {
      if (game.pendingAttack.attackerId === socket.id) {
        game.pendingAttack = null;
        if (game.counterTimeoutId) { clearTimeout(game.counterTimeoutId); game.counterTimeoutId = null; }
      } else if (game.pendingAttack.targetId === socket.id) {
        if (game.counterTimeoutId) { clearTimeout(game.counterTimeoutId); game.counterTimeoutId = null; }
        const result = game.resolveTurn(null);
        if (!result.error) broadcastTurnResult(code, game, result);
      }
    }

    // If game is in progress, allow reconnection instead of removing
    if (game.state !== 'lobby' && player) {
      const reconnectKey = `${code}:${player.name}`;
      disconnectedPlayers.set(reconnectKey, { oldSocketId: socket.id, timestamp: Date.now() });
      // Don't remove from game — mark as temporarily disconnected
      socketToGame.delete(socket.id);
      io.to(code).emit('player_disconnected', { playerId: socket.id, playerName: player.name });

      // Auto-eliminate after 60s if not reconnected
      setTimeout(() => {
        if (disconnectedPlayers.has(reconnectKey)) {
          disconnectedPlayers.delete(reconnectKey);
          game.removePlayer(socket.id);
          if (game.players.size === 0) { games.delete(code); return; }
          if (game.hostId === socket.id) game.hostId = [...game.players.keys()][0];
          io.to(code).emit('player_left', { playerId: socket.id, players: getPlayerList(game), hostId: game.hostId });
        }
      }, 60000);
    } else {
      game.removePlayer(socket.id);
      socketToGame.delete(socket.id);
      actionTimestamps.delete(socket.id);

      if (game.players.size === 0) { games.delete(code); return; }
      if (game.hostId === socket.id) game.hostId = [...game.players.keys()][0];

      io.to(code).emit('player_left', { playerId: socket.id, players: getPlayerList(game), hostId: game.hostId });
    }
  });

  // Emote
  socket.on('send_emote', ({ emoteId }) => {
    const code = socketToGame.get(socket.id);
    const game = games.get(code);
    if (!game) return;
    const player = game.players.get(socket.id);
    if (!player) return;
    const validEmotes = ['gg', 'haha', 'kontra', 'wp', 'bravo', 'gg_ez', 'oops', 'rage'];
    if (!validEmotes.includes(emoteId)) return;
    socket.to(code).emit('player_emote', { playerId: socket.id, playerName: player.name, emoteId });
  });

  // Reconnect
  socket.on('reconnect_game', ({ lobbyCode, playerName }, callback) => {
    if (typeof callback !== 'function') return;
    const name = sanitizeName(playerName);
    const code = sanitizeCode(lobbyCode);
    const reconnectKey = `${code}:${name}`;

    if (!disconnectedPlayers.has(reconnectKey)) {
      return callback({ error: 'Няма активна сесия за свързване!' });
    }

    const game = games.get(code);
    if (!game) return callback({ error: 'Играта не е намерена!' });

    const { oldSocketId } = disconnectedPlayers.get(reconnectKey);
    disconnectedPlayers.delete(reconnectKey);

    // Transfer player data from old socket to new socket
    const playerData = game.players.get(oldSocketId);
    if (!playerData) return callback({ error: 'Играчът не е намерен!' });

    game.players.delete(oldSocketId);
    playerData.id = socket.id;
    game.players.set(socket.id, playerData);

    // Update host if needed
    if (game.hostId === oldSocketId) game.hostId = socket.id;

    // Update turn order references
    game.turnOrder = game.turnOrder.map(id => id === oldSocketId ? socket.id : id);
    game.initiative = game.initiative.map(i => i.id === oldSocketId ? { ...i, id: socket.id } : i);
    game.draftOrder = game.draftOrder.map(id => id === oldSocketId ? socket.id : id);

    socketToGame.set(socket.id, code);
    socket.join(code);

    // Send full game state to reconnected player
    const priv = game.getPlayerPrivateState(socket.id);
    callback({
      success: true,
      state: game.state,
      playerId: socket.id,
      lobbyCode: code,
      playerStates: game.getPlayerStates(),
      round: game.round,
      initiative: game.initiative,
      currentTurn: game.turnOrder[game.currentTurnIndex] || null,
      spells: priv?.spells || [],
      counters: priv?.counters || [],
      battleLog: game.battleLog
    });

    io.to(code).emit('player_reconnected', { oldId: oldSocketId, newId: socket.id, playerName: name });
    console.log(`Играч реконектнат: ${name} (${oldSocketId} → ${socket.id})`);
  });
});

function getPlayerList(game) {
  return [...game.players.entries()].map(([id, p]) => ({ id, name: p.name, isHost: id === game.hostId }));
}

function generateLobbyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  if (games.has(code)) return generateLobbyCode();
  return code;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Silvuri Batul running on port ${PORT}`));
