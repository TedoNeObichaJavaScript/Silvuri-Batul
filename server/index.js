const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Game = require('./game');
const { CARDS } = require('./cards');

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

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// Active games
const games = new Map();
// Socket to game mapping
const socketToGame = new Map();

// --- REST API ---

// Get all cards (for display purposes)
app.get('/api/cards', (req, res) => {
  res.json(CARDS);
});

// Create a new lobby
app.post('/api/lobby', (req, res) => {
  const code = generateLobbyCode();
  res.json({ code });
});

// Get lobby info
app.get('/api/lobby/:code', (req, res) => {
  const game = games.get(req.params.code);
  if (!game) return res.status(404).json({ error: 'Лобито не е намерено!' });
  res.json(game.getPublicState());
});

// --- Socket.IO ---

io.on('connection', (socket) => {
  console.log(`Играч свързан: ${socket.id}`);

  // Create lobby
  socket.on('create_lobby', ({ playerName }, callback) => {
    const code = generateLobbyCode();
    const game = new Game(code, socket.id);
    const result = game.addPlayer(socket.id, playerName);

    if (result.error) {
      callback({ error: result.error });
      return;
    }

    games.set(code, game);
    socketToGame.set(socket.id, code);
    socket.join(code);

    callback({
      success: true,
      lobbyCode: code,
      playerId: socket.id,
      players: getPlayerList(game)
    });
  });

  // Join lobby
  socket.on('join_lobby', ({ lobbyCode, playerName }, callback) => {
    const code = lobbyCode.toUpperCase();
    const game = games.get(code);

    if (!game) {
      callback({ error: 'Лобито не е намерено!' });
      return;
    }

    const result = game.addPlayer(socket.id, playerName);
    if (result.error) {
      callback({ error: result.error });
      return;
    }

    socketToGame.set(socket.id, code);
    socket.join(code);

    const players = getPlayerList(game);

    // Notify others
    socket.to(code).emit('player_joined', {
      players,
      newPlayer: { id: socket.id, name: playerName }
    });

    callback({
      success: true,
      lobbyCode: code,
      playerId: socket.id,
      hostId: game.hostId,
      players
    });
  });

  // Start game (host only)
  socket.on('start_game', (_, callback) => {
    const code = socketToGame.get(socket.id);
    const game = games.get(code);
    if (!game) return callback({ error: 'Играта не е намерена!' });
    if (game.hostId !== socket.id) return callback({ error: 'Само хостът може да стартира!' });

    const result = game.startGame();
    if (result.error) return callback({ error: result.error });

    // Send draft state to all players
    io.to(code).emit('game_started', {
      state: 'draft',
      draftPool: result.draftPool,
      draftOrder: result.draftOrder,
      currentPicker: result.currentPicker,
      cardsPerPlayer: result.cardsPerPlayer
    });

    // Send individual hands (empty at start)
    for (const [playerId] of game.players) {
      io.to(playerId).emit('your_hand', { hand: [] });
    }

    callback({ success: true });
  });

  // Draft pick
  socket.on('draft_pick', ({ cardId }, callback) => {
    const code = socketToGame.get(socket.id);
    const game = games.get(code);
    if (!game) return callback({ error: 'Играта не е намерена!' });

    const result = game.draftPick(socket.id, cardId);
    if (result.error) return callback({ error: result.error });

    // Notify all about the pick
    io.to(code).emit('card_drafted', {
      pickedCardId: result.pickedCard.id,
      pickedBy: result.pickedBy,
      pickedByName: game.players.get(result.pickedBy).name,
      draftComplete: result.draftComplete,
      nextPicker: result.nextPicker || null,
      remainingPool: result.remainingPool || []
    });

    // Send updated hand to the picker
    const player = game.players.get(socket.id);
    io.to(socket.id).emit('your_hand', { hand: player.hand });

    if (result.draftComplete) {
      // Send hands to all players and start battle
      for (const [playerId, p] of game.players) {
        io.to(playerId).emit('your_hand', { hand: p.hand });
      }
      io.to(code).emit('phase_change', {
        state: 'battle',
        round: 1,
        playerStates: game.getPlayerStates()
      });
    }

    callback({ success: true });
  });

  // Submit battle action
  socket.on('submit_action', ({ cardId, targetId }, callback) => {
    const code = socketToGame.get(socket.id);
    const game = games.get(code);
    if (!game) return callback({ error: 'Играта не е намерена!' });

    const result = game.submitAction(socket.id, cardId, targetId);
    if (result.error) return callback({ error: result.error });

    // Notify all about how many are waiting
    io.to(code).emit('action_submitted', {
      playerId: socket.id,
      waitingFor: result.waitingFor
    });

    // If all actions submitted, resolve the round
    if (game.allActionsSubmitted()) {
      setTimeout(() => {
        const roundResult = game.resolveRound();

        io.to(code).emit('round_result', roundResult);

        // Send updated hands
        for (const [playerId, p] of game.players) {
          io.to(playerId).emit('your_hand', { hand: p.hand });
        }

        if (roundResult.gameOver) {
          io.to(code).emit('game_over', {
            winner: roundResult.winner,
            playerStates: roundResult.playerStates
          });
        }
      }, 1500); // Small delay for dramatic effect
    }

    callback({ success: true });
  });

  // Auto-submit for stunned players
  socket.on('stun_acknowledge', (_, callback) => {
    const code = socketToGame.get(socket.id);
    const game = games.get(code);
    if (!game) return;

    if (game.allActionsSubmitted()) {
      setTimeout(() => {
        const roundResult = game.resolveRound();
        io.to(code).emit('round_result', roundResult);

        for (const [playerId, p] of game.players) {
          io.to(playerId).emit('your_hand', { hand: p.hand });
        }

        if (roundResult.gameOver) {
          io.to(code).emit('game_over', {
            winner: roundResult.winner,
            playerStates: roundResult.playerStates
          });
        }
      }, 1500);
    }

    if (callback) callback({ success: true });
  });

  // Play again
  socket.on('play_again', (_, callback) => {
    const code = socketToGame.get(socket.id);
    const game = games.get(code);
    if (!game) return;

    // Reset game state
    const newGame = new Game(code, game.hostId);
    for (const [id, player] of game.players) {
      newGame.addPlayer(id, player.name);
    }
    games.set(code, newGame);

    io.to(code).emit('phase_change', {
      state: 'lobby',
      players: getPlayerList(newGame)
    });

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

    if (game.players.size === 0) {
      games.delete(code);
      return;
    }

    // Transfer host if needed
    if (game.hostId === socket.id) {
      game.hostId = [...game.players.keys()][0];
    }

    io.to(code).emit('player_left', {
      playerId: socket.id,
      players: getPlayerList(game),
      hostId: game.hostId
    });
  });
});

function getPlayerList(game) {
  return [...game.players.entries()].map(([id, p]) => ({
    id,
    name: p.name,
    isHost: id === game.hostId
  }));
}

function generateLobbyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // Make sure it's unique
  if (games.has(code)) return generateLobbyCode();
  return code;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎮 Сървър Уорс работи на порт ${PORT}`);
});
