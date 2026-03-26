import React, { useState } from 'react';

export default function Lobby({
  socket, playerId, playerName, setPlayerName,
  lobbyCode, setLobbyCode, hostId, setHostId,
  players, setPlayers, onError
}) {
  const [joinCode, setJoinCode] = useState('');
  const [inLobby, setInLobby] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const createLobby = () => {
    if (!nameInput.trim()) return onError('Въведи име!');
    socket.emit('create_lobby', { playerName: nameInput.trim() }, (res) => {
      if (res.error) return onError(res.error);
      setPlayerName(nameInput.trim());
      setLobbyCode(res.lobbyCode);
      setHostId(res.playerId);
      setPlayers(res.players);
      setInLobby(true);
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
    });
  };

  const startGame = () => {
    socket.emit('start_game', null, (res) => {
      if (res.error) return onError(res.error);
    });
  };

  if (!inLobby) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="relative bg-dark-800 border border-purple-500/20 rounded-2xl p-8 w-full max-w-md animate-slide-up">
          <div className="absolute inset-0 rounded-2xl animate-glow-pulse pointer-events-none" />

          <h2 className="text-3xl font-title text-center mb-8 text-shadow-glow text-purple-300">
            Влез в Арената
          </h2>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Твоето Име</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Как се казваш, воин?"
              maxLength={20}
              className="w-full bg-dark-700 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors font-game"
              onKeyDown={(e) => e.key === 'Enter' && createLobby()}
            />
          </div>

          <button className="btn-game btn-primary w-full mb-6 relative" onClick={createLobby}>
            Създай Лоби
            <span className="btn-shine" />
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-purple-500/20" />
            <span className="text-gray-500 text-sm">или</span>
            <div className="flex-1 h-px bg-purple-500/20" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="КОД"
              maxLength={6}
              className="flex-1 bg-dark-700 border border-purple-500/30 rounded-lg px-4 py-3 text-white text-center tracking-[0.3em] font-bold uppercase placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors font-game"
              onKeyDown={(e) => e.key === 'Enter' && joinLobby()}
            />
            <button className="btn-game btn-secondary" onClick={joinLobby}>
              Влез
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="relative bg-dark-800 border border-purple-500/20 rounded-2xl p-8 w-full max-w-lg animate-slide-up">
        <h2 className="text-2xl font-title text-center mb-6 text-purple-300">Лоби</h2>

        {/* Lobby Code */}
        <div className="flex items-center justify-center gap-3 mb-8 bg-dark-700 rounded-xl p-4">
          <span className="text-gray-400 text-sm">Код:</span>
          <span className="text-3xl font-bold tracking-[0.3em] text-amber-400 font-pixel">{lobbyCode}</span>
          <button
            className="text-xs bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 rounded px-2 py-1 transition-colors"
            onClick={() => { navigator.clipboard.writeText(lobbyCode); onError('Копирано!'); }}
          >
            Копирай
          </button>
        </div>

        {/* Players */}
        <h3 className="text-sm text-gray-400 mb-3">Играчи ({players.length}/8)</h3>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {players.map((p) => (
            <div key={p.id} className={`flex items-center gap-3 bg-dark-700 rounded-lg p-3 border ${p.id === playerId ? 'border-purple-500/50' : 'border-transparent'}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                {p.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-sm font-bold truncate">
                  {p.name} {p.isHost && '👑'}
                </span>
                {p.id === playerId && <span className="text-[10px] text-purple-400">(ти)</span>}
              </div>
            </div>
          ))}
          {[...Array(8 - players.length)].map((_, i) => (
            <div key={`e-${i}`} className="flex items-center gap-3 bg-dark-700/30 rounded-lg p-3 border border-dashed border-gray-700">
              <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center text-gray-600 text-lg">?</div>
              <span className="text-sm text-gray-600">Чака се...</span>
            </div>
          ))}
        </div>

        {hostId === playerId ? (
          <button
            className="btn-game btn-primary w-full text-lg relative"
            onClick={startGame}
            disabled={players.length < 2}
          >
            {players.length < 2 ? 'Нужни са поне 2 играча' : '⚔️ ЗАПОЧНИ ИГРАТА!'}
            <span className="btn-shine" />
          </button>
        ) : (
          <p className="text-center text-gray-500 animate-pulse">Чакаме хоста да започне...</p>
        )}
      </div>
    </div>
  );
}
