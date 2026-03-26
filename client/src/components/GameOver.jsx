import React from 'react';

const CONFETTI_COLORS = ['#00b4ff', '#38bdf8', '#22c55e', '#ef4444', '#8b5cf6'];

export default function GameOver({ socket, winner, playerStates, playerId }) {
  const isWinner = winner?.id === playerId;
  const sortedPlayers = Object.values(playerStates).sort((a, b) => b.hp - a.hp);
  const playAgain = () => socket.emit('play_again');

  return (
    <div className="flex items-center justify-center min-h-[70vh] relative">
      {isWinner && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {[...Array(30)].map((_, i) => (
            <div key={i} className="confetti-piece" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              backgroundColor: CONFETTI_COLORS[i % 5]
            }} />
          ))}
        </div>
      )}

      <div className="relative z-10 bg-dark-800 border border-accent-blue/20 rounded-2xl p-8 w-full max-w-lg animate-slide-up">
        {winner ? (
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-float">
              {isWinner ? '👑' : '⚔️'}
            </div>
            <h2 className={`text-3xl font-title mb-2 ${isWinner ? 'text-accent-blue text-shadow-glow' : 'text-steel-400'}`}>
              {isWinner ? 'ПОБЕДА!' : `${winner.name} ПЕЧЕЛИ!`}
            </h2>
            <p className="text-steel-400">HP: {winner.hp}</p>
            {winner.warrior && (
              <p className="text-sm text-accent-blue/60 mt-1">Воин: {winner.warrior}</p>
            )}
          </div>
        ) : (
          <div className="text-center mb-8">
            <div className="text-7xl mb-4">💀</div>
            <h2 className="text-3xl font-title text-steel-400">РАВЕНСТВО!</h2>
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-sm text-steel-400 uppercase tracking-wider mb-3 text-center">Класиране</h3>
          <div className="space-y-2">
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                p.id === playerId ? 'bg-accent-blue/10 border border-accent-blue/30' : 'bg-dark-700'
              }`}>
                <span className="text-xl w-8 text-center">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span className="flex-1 font-bold text-sm">{p.name}</span>
                {p.warrior && <span className="text-xs text-steel-400">{p.warrior.name}</span>}
                <span className={`text-sm font-bold ${p.hp > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {p.hp} HP
                </span>
              </div>
            ))}
          </div>
        </div>

        <button className="btn-game btn-primary w-full text-lg relative" onClick={playAgain}>
          НОВА ИГРА
          <span className="btn-shine" />
        </button>
      </div>
    </div>
  );
}
