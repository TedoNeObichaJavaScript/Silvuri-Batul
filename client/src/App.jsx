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
  const [error, setError] = useState('');

  // Draft state
  const [draftRolls, setDraftRolls] = useState([]);
  const [draftOrder, setDraftOrder] = useState([]);
  const [currentPicker, setCurrentPicker] = useState(null);
  const [draftOptions, setDraftOptions] = useState([]);

  // Battle state
  const [playerStates, setPlayerStates] = useState({});
  const [round, setRound] = useState(0);
  const [initiative, setInitiative] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [battleLog, setBattleLog] = useState([]);
  const [spells, setSpells] = useState([]);
  const [counters, setCounters] = useState([]);
  const [turnResults, setTurnResults] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const [winner, setWinner] = useState(null);
  const [roundComplete, setRoundComplete] = useState(false);

  // Counter prompt state
  const [counterPrompt, setCounterPrompt] = useState(null);

  useEffect(() => {
    setPlayerId(socket.id);
    socket.on('connect', () => setPlayerId(socket.id));
    socket.on('player_joined', ({ players: p }) => setPlayers(p));
    socket.on('player_left', ({ players: p, hostId: h }) => { setPlayers(p); setHostId(h); });

    // Draft events
    socket.on('game_started', ({ draftRolls: rolls, draftOrder: order, currentPicker: picker }) => {
      setPhase('draft');
      setDraftRolls(rolls);
      setDraftOrder(order);
      setCurrentPicker(picker);
      setDraftOptions([]);
      setBattleLog([]);
    });

    socket.on('draft_options', ({ options }) => {
      setDraftOptions(options);
    });

    socket.on('warrior_picked', ({ pickedBy, pickedByName, warrior, draftComplete, nextPicker }) => {
      setBattleLog(prev => [...prev, { type: 'initiative', message: `${pickedByName} избира ${warrior.name}!` }]);
      setDraftOptions([]);
      if (!draftComplete && nextPicker) {
        setCurrentPicker(nextPicker);
      }
    });

    // Battle events
    socket.on('cards_dealt', ({ spells: s, counters: c }) => {
      setSpells(s);
      setCounters(c);
    });

    socket.on('battle_start', ({ playerStates: ps }) => {
      setPhase('battle');
      setPlayerStates(ps);
      setTurnResults(null);
      setRoundComplete(false);
    });

    socket.on('round_start', ({ round: r, initiative: init, turnOrder, currentTurn: ct, battleLog: log, playerStates: ps }) => {
      setRound(r);
      setInitiative(init);
      setCurrentTurn(ct);
      if (ps) setPlayerStates(ps);
      setTurnResults(null);
      setRoundComplete(false);
      if (log && log.length > 0) {
        setBattleLog(prev => [...prev, ...log.map(l => l)]);
      }
      // Initiative log (no SPD, just dice roll)
      const initLog = init.map(i => `${i.name}: 🎲${i.roll}`).join(' | ');
      setBattleLog(prev => [...prev, { type: 'initiative', message: `Рунд ${r} Инициатива: ${initLog}` }]);
    });

    socket.on('turn_result', ({ action, results, playerStates: ps, nextTurn, roundComplete: rc, gameOver, winner: w }) => {
      setCounterPrompt(null); // Clear any counter prompt
      setLastAction(action || null);
      setTurnResults(results);
      setPlayerStates(ps);
      setCurrentTurn(nextTurn);
      setRoundComplete(rc);
      setBattleLog(prev => [...prev, ...results]);

      if (gameOver) {
        setWinner(w);
        setTimeout(() => setPhase('gameOver'), 2000);
      }
    });

    socket.on('private_state', ({ spells: s, counters: c }) => {
      if (s) setSpells(s);
      if (c) setCounters(c);
    });

    // Counter prompt from server
    socket.on('counter_prompt', (data) => {
      setCounterPrompt(data);
    });

    // Waiting for counter (other players see this)
    socket.on('waiting_for_counter', (data) => {
      // Could show a subtle indicator, handled by battle log
    });

    socket.on('game_over', ({ winner: w, playerStates: ps }) => {
      setWinner(w);
      setPlayerStates(ps);
      setPhase('gameOver');
    });

    socket.on('phase_change', ({ state, players: p }) => {
      setPhase(state);
      if (p) setPlayers(p);
      if (state === 'lobby') {
        setBattleLog([]);
        setSpells([]);
        setCounters([]);
        setWinner(null);
        setLastAction(null);
        setRound(0);
        setDraftOptions([]);
        setCounterPrompt(null);
      }
    });

    return () => {
      ['connect','player_joined','player_left','game_started','draft_options','warrior_picked',
       'cards_dealt','battle_start','round_start','turn_result','private_state','game_over',
       'phase_change','counter_prompt','waiting_for_counter']
        .forEach(e => socket.off(e));
    };
  }, []);

  const showError = useCallback((msg) => {
    setError(msg);
    setTimeout(() => setError(''), 3000);
  }, []);

  const handleCounterResponse = useCallback((counterUid) => {
    socket.emit('counter_response', { counterUid }, (res) => {
      if (res?.error) showError(res.error);
    });
    setCounterPrompt(null);
  }, [showError]);

  return (
    <div className={`h-screen relative flex flex-col ${phase === 'battle' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
      {/* Particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`
          }} />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 text-center py-3 border-b border-accent-blue/10">
        <h1 className="text-3xl font-title">
          <span className="text-steel-400 text-shadow-steel">SILVURI </span>
          <span className="text-accent-blue text-shadow-glow">BATUL</span>
        </h1>
        {lobbyCode && phase !== 'lobby' && (
          <span className="inline-block mt-1 text-xs bg-dark-700 text-steel-400 px-3 py-1 rounded-full">
            {lobbyCode}
          </span>
        )}
      </header>

      {/* Error */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-up font-bold text-sm backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Main */}
      <main className={`relative z-10 max-w-7xl mx-auto ${phase === 'battle' ? 'flex-1 min-h-0 overflow-hidden' : 'pb-8'}`}>
        {phase === 'lobby' && (
          <Lobby socket={socket} playerId={playerId} playerName={playerName} setPlayerName={setPlayerName}
            lobbyCode={lobbyCode} setLobbyCode={setLobbyCode} hostId={hostId} setHostId={setHostId}
            players={players} setPlayers={setPlayers} onError={showError} />
        )}
        {phase === 'draft' && (
          <Draft socket={socket} playerId={playerId} draftRolls={draftRolls} draftOrder={draftOrder}
            currentPicker={currentPicker} setCurrentPicker={setCurrentPicker}
            draftOptions={draftOptions} battleLog={battleLog} onError={showError} />
        )}
        {phase === 'battle' && (
          <Battle socket={socket} playerId={playerId} playerStates={playerStates}
            round={round} initiative={initiative} currentTurn={currentTurn}
            battleLog={battleLog} spells={spells} counters={counters}
            turnResults={turnResults} lastAction={lastAction}
            roundComplete={roundComplete}
            counterPrompt={counterPrompt} onCounterResponse={handleCounterResponse}
            onError={showError} />
        )}
        {phase === 'gameOver' && (
          <GameOver socket={socket} winner={winner} playerStates={playerStates} playerId={playerId} />
        )}
      </main>
    </div>
  );
}
