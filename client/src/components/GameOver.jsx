import React from 'react';

const CONFETTI_COLORS = ['#f59e0b', '#a855f7', '#22c55e', '#ef4444', '#4a90d9'];

export default function GameOver({ socket, winner, playerStates, playerId }) {
  const isWinner = winner?.id === playerId;
  const sortedPlayers = Object.values(playerStates).sort((a, b) => b.hp - a.hp);

  const playAgain = () => socket.emit('play_again');

  return (
    <div className="flex items-center justify-center min-h-[70vh] relative">
      {/* Confetti for winner */}
      {isWinner && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: CONFETTI_COLORS[i % 5]
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 bg-dark-800 border border-purple-500/20 rounded-2xl p-8 w-full max-w-lg animate-slide-up">
        {winner ? (
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-float">🏆</div>
            <h2 className={`text-3xl font-title mb-2 ${isWinner ? 'text-amber-400 text-shadow-gold' : 'text-purple-300'}`}>
              {isWinner ? 'ТИ СПЕЧЕЛИ!' : `${winner.name} ПЕЧЕЛИ!`}
            </h2>
            <p className="text-gray-400">Оставащо HP: {winner.hp}</p>
          </div>
        ) : (
          <div className="text-center mb-8">
            <div className="text-7xl mb-4">💀</div>
            <h2 className="text-3xl font-title text-gray-400">РАВЕНСТВО!</h2>
            <p className="text-gray-500">Всички са паднали!</p>
          </div>
        )}

        {/* Final Standings */}
        <div className="mb-8">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-3 text-center">Крайно Класиране</h3>
          <div className="space-y-2">
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${p.id === playerId ? 'bg-purple-900/30 border border-purple-500/30' : 'bg-dark-700'}`}>
                <span className="text-xl w-8 text-center">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span className="flex-1 font-bold text-sm">{p.name}</span>
                <span className={`text-sm font-bold ${p.hp > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {p.hp} HP
                </span>
                {p.eliminated && <span className="text-sm">💀</span>}
              </div>
            ))}
          </div>
        </div>

        <button className="btn-game btn-primary w-full text-lg relative" onClick={playAgain}>
          ИГРАЙ ОТНОВО
          <span className="btn-shine" />
        </button>
      </div>
    </div>
  );
}
