import React, { useState, useEffect } from 'react';
import Card from './Card';

export default function Battle({
  socket, playerId, hand, playerStates, round,
  roundResults, showResults, actionSubmitted, setActionSubmitted,
  waitingFor, onError
}) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);

  const myState = playerStates[playerId];
  const opponents = Object.values(playerStates).filter(p => p.id !== playerId && !p.eliminated);

  // Reset selections when new round starts
  useEffect(() => {
    if (!showResults && !actionSubmitted) {
      setSelectedCard(null);
      setSelectedTarget(null);
    }
  }, [round, showResults]);

  const submitAction = () => {
    if (!selectedCard) return onError('Избери карта!');
    if (!selectedTarget) return onError('Избери цел!');
    socket.emit('submit_action', { cardId: selectedCard.id, targetId: selectedTarget }, (res) => {
      if (res.error) return onError(res.error);
      setActionSubmitted(true);
      setSelectedCard(null);
      setSelectedTarget(null);
    });
  };

  // Stunned screen
  if (myState?.stunned) {
    socket.emit('stun_acknowledge');
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-shake">
          <div className="text-7xl mb-4">💫</div>
          <h2 className="text-3xl font-title text-yellow-400 mb-2">ЗАШЕМЕТЕН!</h2>
          <p className="text-gray-400">Пропускаш този рунд...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 animate-slide-up">
      {/* Round Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-title text-red-400">⚔️ РУНД {round}</h2>
      </div>

      {/* Player HP Bars */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
        {Object.values(playerStates).map(p => {
          const hpPct = (p.hp / p.maxHp) * 100;
          const hpColor = hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-amber-500' : 'bg-red-500';
          const isTarget = selectedTarget === p.id;
          const isMe = p.id === playerId;

          return (
            <div
              key={p.id}
              onClick={() => {
                if (!isMe && !p.eliminated && !actionSubmitted && !showResults) setSelectedTarget(p.id);
              }}
              className={`relative bg-dark-700 rounded-lg p-3 border-2 transition-all cursor-pointer
                ${isMe ? 'border-purple-500/50' : isTarget ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'border-transparent hover:border-gray-600'}
                ${p.eliminated ? 'opacity-40 cursor-default' : ''}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold truncate ${isMe ? 'text-purple-300' : 'text-gray-300'}`}>
                  {p.name} {isMe && '(ти)'}
                  {p.stunned && ' 💫'}
                </span>
                <span className="text-[10px] text-gray-500">🎴 {p.cardsLeft}</span>
              </div>

              {/* HP Bar */}
              <div className="hp-bar">
                <div className={`hp-bar-fill ${hpColor}`} style={{ width: `${hpPct}%` }} />
                <span className="hp-bar-text">{p.hp}/{p.maxHp}</span>
              </div>

              {/* Buffs */}
              {(p.buffs?.atk > 0 || p.buffs?.def > 0) && (
                <div className="flex gap-1 mt-1">
                  {p.buffs.atk > 0 && <span className="text-[10px] text-red-400">+{p.buffs.atk}⚔️</span>}
                  {p.buffs.def > 0 && <span className="text-[10px] text-blue-400">+{p.buffs.def}🛡️</span>}
                </div>
              )}

              {/* Target indicator */}
              {isTarget && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  🎯 ЦЕЛ
                </div>
              )}
              {p.eliminated && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-900/60 rounded-lg">
                  <span className="text-red-400 font-bold text-sm">💀 ЕЛИМИНИРАН</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Round Results Overlay */}
      {showResults && roundResults && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-dark-800 border border-purple-500/30 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto animate-slide-up">
            <h3 className="text-xl font-title text-center text-amber-400 mb-4">Резултати от Рунда</h3>
            <div className="space-y-2">
              {roundResults.results.map((r, i) => (
                <div key={i} className={`result-entry result-${r.type}`} style={{ animationDelay: `${i * 0.15}s` }}>
                  <span className="text-lg shrink-0">
                    {r.type === 'attack' ? '💥' : r.type === 'miss' ? '💨' : r.type === 'blocked' ? '🛡️' :
                     r.type === 'heal' ? '💚' : r.type === 'reflect' ? '🪞' : r.type === 'ability' ? '✨' :
                     r.type === 'locked' ? '🔒' : r.type === 'heal_enemy' ? '😱' : '⚡'}
                  </span>
                  <span className="text-sm text-gray-200">{r.message}</span>
                </div>
              ))}
              {roundResults.eliminations?.map((e, i) => (
                <div key={`e-${i}`} className="result-entry result-elimination">
                  <span className="text-lg">💀</span>
                  <span className="text-sm">{e.name} е ЕЛИМИНИРАН!</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Your Hand */}
      {!actionSubmitted && !showResults && (
        <div>
          <h3 className="text-sm text-gray-400 mb-3 uppercase tracking-wider text-center">
            Избери карта за атака
          </h3>
          <div className="flex flex-wrap gap-4 justify-center mb-6">
            {hand.map(card => (
              <Card
                key={card.id}
                card={card}
                selected={selectedCard?.id === card.id}
                onClick={(c) => setSelectedCard(c)}
              />
            ))}
          </div>

          {selectedCard && selectedTarget && (
            <div className="text-center">
              <button className="btn-game btn-primary text-lg px-10 py-4 relative" onClick={submitAction}>
                ⚔️ АТАКУВАЙ с {selectedCard.name}!
                <span className="btn-shine" />
              </button>
            </div>
          )}

          {selectedCard && !selectedTarget && (
            <p className="text-center text-amber-400 animate-pulse">Избери цел от играчите по-горе!</p>
          )}

          {!selectedCard && (
            <p className="text-center text-gray-500">Избери карта от ръката си</p>
          )}
        </div>
      )}

      {/* Waiting */}
      {actionSubmitted && !showResults && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-gray-400">Чакаме останалите играчи... ({waitingFor} останали)</p>
        </div>
      )}
    </div>
  );
}
