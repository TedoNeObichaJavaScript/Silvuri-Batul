import React, { useState, useEffect, useCallback } from 'react';
import socket from './socket';
import Lobby from './components/Lobby';
import Draft from './components/Draft';
import Battle from './components/Battle';
import GameOver from './components/GameOver';

export default function App() {
  const [phase, setPhase] = useState('lobby');
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [hostId, setHostId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [hand, setHand] = useState([]);
  const [draftPool, setDraftPool] = useState([]);
  const [draftOrder, setDraftOrder] = useState([]);
  const [currentPicker, setCurrentPicker] = useState(null);
  const [cardsPerPlayer, setCardsPerPlayer] = useState(0);
  const [playerStates, setPlayerStates] = useState({});
  const [round, setRound] = useState(0);
  const [roundResults, setRoundResults] = useState(null);
  const [winner, setWinner] = useState(null);
  const [waitingFor, setWaitingFor] = useState(0);
  const [actionSubmitted, setActionSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPlayerId(socket.id);

    socket.on('connect', () => setPlayerId(socket.id));
    socket.on('player_joined', ({ players: p }) => setPlayers(p));
    socket.on('player_left', ({ players: p, hostId: h }) => { setPlayers(p); setHostId(h); });

    socket.on('game_started', ({ draftPool: pool, draftOrder: order, currentPicker: picker, cardsPerPlayer: cpp }) => {
      setPhase('draft');
      setDraftPool(pool);
      setDraftOrder(order);
      setCurrentPicker(picker);
      setCardsPerPlayer(cpp);
    });

    socket.on('card_drafted', ({ pickedCardId, draftComplete, nextPicker }) => {
      setDraftPool(prev => prev.filter(c => c.id !== pickedCardId));
      if (!draftComplete && nextPicker) setCurrentPicker(nextPicker);
    });

    socket.on('your_hand', ({ hand: h }) => setHand(h));

    socket.on('phase_change', ({ state, round: r, playerStates: ps, players: p }) => {
      setPhase(state);
      if (r) setRound(r);
      if (ps) setPlayerStates(ps);
      if (p) setPlayers(p);
      setActionSubmitted(false);
      setShowResults(false);
      setRoundResults(null);
    });

    socket.on('action_submitted', ({ waitingFor: wf }) => setWaitingFor(wf));

    socket.on('round_result', (result) => {
      setRoundResults(result);
      setPlayerStates(result.playerStates);
      setRound(result.round);
      setShowResults(true);
      setActionSubmitted(false);
      if (!result.gameOver) {
        setTimeout(() => { setShowResults(false); setRoundResults(null); }, 6000);
      }
    });

    socket.on('game_over', ({ winner: w, playerStates: ps }) => {
      setWinner(w);
      setPlayerStates(ps);
      setPhase('gameOver');
    });

    return () => {
      ['connect','player_joined','player_left','game_started','card_drafted',
       'your_hand','phase_change','action_submitted','round_result','game_over']
        .forEach(e => socket.off(e));
    };
  }, []);

  const showError = useCallback((msg) => {
    setError(msg);
    setTimeout(() => setError(''), 3000);
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Background particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="bg-particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`
          }} />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 text-center py-4 border-b border-purple-500/10">
        <h1 className="text-4xl font-title">
          <span className="text-purple-400 text-shadow-glow">СЪРВЪР </span>
          <span className="text-amber-400 text-shadow-gold">УОРС</span>
        </h1>
        {lobbyCode && phase !== 'lobby' && (
          <span className="inline-block mt-1 text-xs bg-dark-700 text-gray-400 px-3 py-1 rounded-full">
            Лоби: {lobbyCode}
          </span>
        )}
      </header>

      {/* Error toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-up font-bold text-sm backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Main */}
      <main className="relative z-10 max-w-6xl mx-auto pb-8">
        {phase === 'lobby' && (
          <Lobby socket={socket} playerId={playerId} playerName={playerName} setPlayerName={setPlayerName}
            lobbyCode={lobbyCode} setLobbyCode={setLobbyCode} hostId={hostId} setHostId={setHostId}
            players={players} setPlayers={setPlayers} onError={showError} />
        )}
        {phase === 'draft' && (
          <Draft socket={socket} playerId={playerId} draftPool={draftPool} hand={hand}
            currentPicker={currentPicker} draftOrder={draftOrder} cardsPerPlayer={cardsPerPlayer}
            players={players} onError={showError} />
        )}
        {phase === 'battle' && (
          <Battle socket={socket} playerId={playerId} hand={hand} playerStates={playerStates}
            round={round} roundResults={roundResults} showResults={showResults}
            actionSubmitted={actionSubmitted} setActionSubmitted={setActionSubmitted}
            waitingFor={waitingFor} onError={showError} />
        )}
        {phase === 'gameOver' && (
          <GameOver socket={socket} winner={winner} playerStates={playerStates} playerId={playerId} />
        )}
      </main>
    </div>
  );
}
