import React, { useState } from 'react';

const TIPS = [
  'Космическите карти имат 3 способности!',
  'Контрите могат да обърнат играта!',
  'Легендарните карти са само 2 — хвани ги!',
  'Owner картата има бан способност.',
  'Отровата нанася щети всеки рунд.',
  'Замразяването блокира магиите.',
  'Стънът те кара да пропуснеш ход.',
];

function PlayerSlot({ player, isYou, isHost }) {
  if (!player) {
    return (
      <div className="group flex items-center gap-3 rounded-xl p-3 border border-dashed border-steel-600/20 bg-dark-800/30 transition-all hover:border-steel-600/40">
        <div className="w-11 h-11 rounded-full bg-dark-700/50 flex items-center justify-center border border-steel-600/15">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-steel-600/40">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div className="text-[11px] text-steel-600 font-bold">Свободно място</div>
          <div className="text-[9px] text-steel-600/50">Чака се играч...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${
      isYou
        ? 'border-accent-blue/30 bg-accent-blue/5 shadow-lg shadow-accent-blue/5'
        : 'border-steel-600/15 bg-dark-800/40'
    }`}>
      <div className={`relative w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 overflow-hidden ${
        isYou
          ? 'border-accent-blue/60 shadow-md shadow-accent-blue/20'
          : isHost
            ? 'border-amber-400/50'
            : 'border-steel-600/30'
      }`}
        style={{ background: `linear-gradient(135deg, ${isYou ? '#0077cc' : isHost ? '#b45309' : '#1a2236'}, ${isYou ? '#00b4ff' : isHost ? '#f59e0b' : '#243049'})` }}
      >
        {player.name[0].toUpperCase()}
        {isHost && (
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center border border-amber-600/50 shadow-sm shadow-amber-400/30">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="#78350f">
              <path d="M2 20h20l-2-8-4 4-4-8-4 8-4-4-2 8zM5 4l3 3M19 4l-3 3M12 1v4" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-bold truncate ${isYou ? 'text-accent-blue' : 'text-white'}`}>
            {player.name}
          </span>
          {isHost && <span className="text-[8px] font-black text-amber-400 uppercase tracking-wider">Хост</span>}
        </div>
        {isYou && <span className="text-[9px] text-accent-blue/60 font-bold">Това си ти</span>}
      </div>
      <div className={`w-2 h-2 rounded-full ${isYou ? 'bg-accent-blue' : 'bg-green-500'} animate-pulse`} />
    </div>
  );
}

export default function Lobby({
  socket, playerId, playerName, setPlayerName,
  lobbyCode, setLobbyCode, hostId, setHostId,
  players, setPlayers, onError
}) {
  const [joinCode, setJoinCode] = useState('');
  const [inLobby, setInLobby] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [tipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));

  const createLobby = () => {
    if (!nameInput.trim()) return onError('Въведи име!');
    socket.emit('create_lobby', { playerName: nameInput.trim() }, (res) => {
      if (res.error) return onError(res.error);
      setPlayerName(nameInput.trim());
      setLobbyCode(res.lobbyCode);
      setHostId(res.playerId);
      setPlayers(res.players);
      setInLobby(true);
      sessionStorage.setItem('sb_lobbyCode', res.lobbyCode);
      sessionStorage.setItem('sb_playerName', nameInput.trim());
    });
  };

  const joinLobby = () => {
    if (!nameInput.trim()) return onError('Въведи име!');
    if (!joinCode.trim()) return onError('Въведи код!');
    socket.emit('join_lobby', { lobbyCode: joinCode.trim().toUpperCase(), playerName: nameInput.trim() }, (res) => {
      if (res.error) return onError(res.error);
      setPlayerName(nameInput.trim());
      setLobbyCode(res.lobbyCode);
      setHostId(res.hostId);
      setPlayers(res.players);
      setInLobby(true);
      sessionStorage.setItem('sb_lobbyCode', res.lobbyCode);
      sessionStorage.setItem('sb_playerName', nameInput.trim());
    });
  };

  const startGame = () => {
    socket.emit('start_game', null, (res) => {
      if (res.error) return onError(res.error);
    });
  };

  // ===== JOIN / CREATE SCREEN =====
  if (!inLobby) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="w-full max-w-md">
          {/* Hero section */}
          <div className="text-center mb-8 animate-slide-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 relative"
              style={{ background: 'linear-gradient(135deg, rgba(0,180,255,0.15), rgba(0,100,200,0.08))', border: '1px solid rgba(0,180,255,0.2)' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6v5c0 5.25 3.4 10.15 8 11.4 4.6-1.25 8-6.15 8-11.4V6l-8-4z" fill="rgba(0,180,255,0.3)" stroke="#00b4ff" strokeWidth="1.5" />
                <path d="M9 12l2 2 4-4" stroke="#00b4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="absolute inset-0 rounded-2xl animate-glow-pulse pointer-events-none" />
            </div>
            <h2 className="text-3xl font-title text-white mb-2">
              Влез в <span className="text-accent-blue">Арената</span>
            </h2>
            <p className="text-steel-500 text-sm">Избери име и създай лоби или се присъедини с код</p>
          </div>

          {/* Main card */}
          <div className="relative rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {/* Background */}
            <div className="absolute inset-0 bg-dark-800 border border-steel-600/15 rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-accent-blue/[0.03] to-transparent rounded-2xl" />

            <div className="relative p-6">
              {/* Name input */}
              <div className="mb-5">
                <label className="flex items-center gap-1.5 text-[10px] text-steel-500 mb-2 uppercase tracking-widest font-bold">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                  </svg>
                  Твоето Име
                </label>
                <input
                  type="text" value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Как се казваш, силвър?"
                  maxLength={20}
                  className="w-full bg-dark-700/60 border border-steel-600/20 rounded-xl px-4 py-3 text-white placeholder-steel-600/50 focus:outline-none focus:border-accent-blue/50 focus:bg-dark-700 transition-all font-game text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && createLobby()}
                />
              </div>

              {/* Create button */}
              <button className="btn-game btn-primary w-full mb-5 relative py-3.5 text-sm" onClick={createLobby}>
                <span className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Създай Лоби
                </span>
                <span className="btn-shine" />
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-steel-600/20 to-transparent" />
                <span className="text-steel-600 text-[10px] uppercase tracking-widest font-bold">или влез с код</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-steel-600/20 to-transparent" />
              </div>

              {/* Join section */}
              <div className="flex gap-2">
                <input
                  type="text" value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="КОД" maxLength={6}
                  className="flex-1 bg-dark-700/60 border border-steel-600/20 rounded-xl px-4 py-3 text-white text-center tracking-[0.3em] font-bold uppercase placeholder-steel-600/50 focus:outline-none focus:border-accent-blue/50 transition-all font-game text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && joinLobby()}
                />
                <button className="btn-game btn-secondary px-5 flex items-center gap-1.5" onClick={joinLobby}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13 12H3" />
                  </svg>
                  Влез
                </button>
              </div>
            </div>
          </div>

          {/* Tip */}
          <div className="mt-4 text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" /></svg>
              <span className="text-[10px] text-amber-400/80">{TIPS[tipIdx]}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== LOBBY WAITING ROOM =====
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3"
            style={{ background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.15)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-accent-blue font-bold uppercase tracking-widest">Лоби активно</span>
          </div>
          <h2 className="text-2xl font-title text-white mb-1">Чакалня</h2>
          <p className="text-steel-500 text-xs">Сподели кода за да се присъединят приятели</p>
        </div>

        {/* Code display */}
        <div className="relative rounded-xl overflow-hidden mb-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="absolute inset-0 bg-dark-800 border border-accent-blue/15 rounded-xl" />
          <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/[0.03] via-transparent to-accent-blue/[0.03] rounded-xl" />
          <div className="relative flex items-center justify-between p-4">
            <div>
              <div className="text-[9px] text-steel-500 uppercase tracking-widest font-bold mb-1">Код на лобито</div>
              <div className="text-3xl font-bold tracking-[0.35em] text-accent-blue font-pixel">{lobbyCode}</div>
            </div>
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-accent-blue/15"
              style={{ background: 'rgba(0,180,255,0.08)', border: '1px solid rgba(0,180,255,0.2)', color: '#00b4ff' }}
              onClick={() => { navigator.clipboard.writeText(lobbyCode); onError('Копирано!'); }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Копирай
            </button>
          </div>
        </div>

        {/* Player list */}
        <div className="relative rounded-xl overflow-hidden mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-0 bg-dark-800 border border-steel-600/15 rounded-xl" />
          <div className="relative">
            <div className="flex items-center justify-between px-4 py-3 border-b border-steel-600/10">
              <h3 className="text-[10px] text-steel-500 uppercase tracking-widest font-bold">Играчи</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: players.length >= 2 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: players.length >= 2 ? '#22c55e' : '#f59e0b', border: `1px solid ${players.length >= 2 ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                {players.length}/8
              </span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {players.map((p) => (
                <PlayerSlot key={p.id} player={p} isYou={p.id === playerId} isHost={p.isHost} />
              ))}
              {[...Array(Math.max(0, (players.length < 4 ? 4 : 8) - players.length))].map((_, i) => (
                <PlayerSlot key={`e-${i}`} player={null} />
              ))}
            </div>
          </div>
        </div>

        {/* Start / waiting */}
        <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
          {hostId === playerId ? (
            <button
              className="btn-game btn-primary w-full text-base relative py-4 disabled:opacity-40"
              onClick={startGame}
              disabled={players.length < 2}
            >
              <span className="flex items-center justify-center gap-2">
                {players.length < 2 ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" strokeLinecap="round" />
                    </svg>
                    Нужни са поне 2 играча
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7L8 5z" />
                    </svg>
                    ЗАПОЧНИ ИГРАТА!
                  </>
                )}
              </span>
              {players.length >= 2 && <span className="btn-shine" />}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-4 rounded-xl"
              style={{ background: 'rgba(0,180,255,0.04)', border: '1px solid rgba(0,180,255,0.1)' }}>
              <div className="w-4 h-4 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
              <span className="text-steel-400 text-sm">Чакаме хоста да започне...</span>
            </div>
          )}
        </div>

        {/* Tip */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" /></svg>
            <span className="text-[10px] text-amber-400/80">{TIPS[tipIdx]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
