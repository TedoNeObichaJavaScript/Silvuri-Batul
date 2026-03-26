const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const Game = require('./game');
const { WARRIORS, RARITY_COLORS, RARITY_NAMES } = require('./cards');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
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

app.get('/api/cards', (req, res) => res.json({ warriors: WARRIORS, rarityColors: RARITY_COLORS, rarityNames: RARITY_NAMES }));

io.on('connection', (socket) => {
  console.log(`Играч свързан: ${socket.id}`);

  // Create lobby
  socket.on('create_lobby', ({ playerName }, callback) => {
    const code = generateLobbyCode();
    const game = new Game(code, socket.id);
    game.addPlayer(socket.id, playerName);
    games.set(code, game);
    socketToGame.set(socket.id, code);
    socket.join(code);
    callback({ success: true, lobbyCode: code, playerId: socket.id, players: getPlayerList(game) });
  });

  // Join lobby
  socket.on('join_lobby', ({ lobbyCode, playerName }, callback) => {
    const code = lobbyCode.toUpperCase();
    const game = games.get(code);
    if (!game) return callback({ error: 'Лобито не е намерено!' });

    const result = game.addPlayer(socket.id, playerName);
    if (result.error) return callback({ error: result.error });

    socketToGame.set(socket.id, code);
    socket.join(code);
    const players = getPlayerList(game);
    socket.to(code).emit('player_joined', { players, newPlayer: { id: socket.id, name: playerName } });
    callback({ success: true, lobbyCode: code, playerId: socket.id, hostId: game.hostId, players });
  });

  // Start game → draft phase
  socket.on('start_game', (_, callback) => {
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

        // Send private states
        for (const [playerId] of game.players) {
          io.to(playerId).emit('private_state', game.getPlayerPrivateState(playerId));
        }
      }, 2000);
    } else {
      // Send options to next drafter
      io.to(result.nextPicker).emit('draft_options', { options: result.nextOptions });
    }

    callback({ success: true });
  });

  // Submit turn action
  socket.on('turn_action', ({ targetId, spellUid, counterUid }, callback) => {
    const code = socketToGame.get(socket.id);
    const game = games.get(code);
    if (!game) return callback({ error: 'Играта не е намерена!' });

    const result = game.submitTurn(socket.id, targetId, spellUid || null, counterUid || null);
    if (result.error) return callback({ error: result.error });

    // Broadcast turn result
    io.to(code).emit('turn_result', {
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
      io.to(code).emit('game_over', { winner: result.winner, playerStates: result.playerStates });
    } else if (result.roundComplete) {
      // Start next round after delay
      setTimeout(() => {
        const roundData = game.startRound();
        io.to(code).emit('round_start', roundData);
        for (const [playerId] of game.players) {
          io.to(playerId).emit('private_state', game.getPlayerPrivateState(playerId));
        }
      }, 3000);
    }

    callback({ success: true });
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

    game.removePlayer(socket.id);
    socketToGame.delete(socket.id);

    if (game.players.size === 0) { games.delete(code); return; }
    if (game.hostId === socket.id) game.hostId = [...game.players.keys()][0];

    io.to(code).emit('player_left', { playerId: socket.id, players: getPlayerList(game), hostId: game.hostId });
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
