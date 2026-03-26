import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';
import { SpellCard } from './Card';

const SEAT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export default function Battle({
  socket, playerId, playerStates, round, initiative,
  currentTurn, battleLog, spells, counters, turnResults,
  roundComplete, onError
}) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedSpell, setSelectedSpell] = useState(null);
  const [selectedCounter, setSelectedCounter] = useState(null);
  const [actionSubmitted, setActionSubmitted] = useState(false);
  const logRef = useRef(null);

  const isMyTurn = currentTurn === playerId;
  const myState = playerStates[playerId];
  const allPlayers = Object.values(playerStates);
  const opponents = allPlayers.filter(p => p.id !== playerId && !p.eliminated);

  // Reset when turn changes
  useEffect(() => {
    if (isMyTurn) {
      setSelectedTarget(null);
      setSelectedSpell(null);
      setSelectedCounter(null);
      setActionSubmitted(false);
    }
  }, [currentTurn]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battleLog]);

  const submitAction = () => {
    if (!selectedTarget) return onError('Избери цел!');
    socket.emit('turn_action', {
      targetId: selectedTarget,
      spellUid: selectedSpell?.uid || null,
      counterUid: selectedCounter?.uid || null
    }, (res) => {
      if (res.error) return onError(res.error);
      setActionSubmitted(true);
    });
  };

  // Stunned screen
  if (myState?.stunned && isMyTurn) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-shake">
          <div className="text-7xl mb-4">💫</div>
          <h2 className="text-3xl font-title text-yellow-400 mb-2">ЗАШЕМЕТЕН!</h2>
          <p className="text-steel-400">Пропускаш този рунд...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 py-2 animate-slide-up">
      {/* Round Header */}
      <div className="text-center mb-2">
        <h2 className="text-xl font-title text-accent-blue">РУНД {round}</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* LEFT: Round Table */}
        <div className="flex-1 flex justify-center">
          <div className="round-table">
            <div className="table-center">
              <div className="text-center">
                <div className="text-3xl font-title text-accent-blue">{round}</div>
                <div className="text-[10px] text-steel-400 uppercase">РУНД</div>
              </div>
            </div>

            {allPlayers.map((p, i) => {
              const angle = SEAT_ANGLES[i] || 0;
              const hpPct = (p.hp / p.maxHp) * 100;
              const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#f59e0b' : '#ef4444';
              const isTarget = selectedTarget === p.id;
              const isMe = p.id === playerId;
              const isTurn = currentTurn === p.id;

              return (
                <div
                  key={p.id}
                  className={`table-seat ${isTurn ? 'active-turn' : ''}`}
                  style={{ '--angle': `${angle}deg` }}
                  onClick={() => {
                    if (!isMe && !p.eliminated && isMyTurn && !actionSubmitted) {
                      setSelectedTarget(p.id);
                    }
                  }}
                >
                  {/* Target indicator */}
                  {isTarget && (
                    <div className="absolute -top-3 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse z-10">
                      TARGET
                    </div>
                  )}

                  {/* Avatar */}
                  <div className={`seat-avatar ${p.eliminated ? 'eliminated' : ''} ${isMe ? '!border-accent-blue/60' : ''} ${isTarget ? '!border-red-500' : ''}`}>
                    {p.warrior ? (
                      <img src={p.warrior.image} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{p.name[0]}</span>
                    )}
                  </div>

                  {/* Name */}
                  <div className={`text-[10px] font-bold mt-0.5 truncate max-w-[90px] text-center ${
                    isMe ? 'text-accent-blue' : isTurn ? 'text-white' : 'text-steel-400'
                  }`}>
                    {p.name} {isMe && '(ти)'}
                  </div>

                  {/* HP Bar */}
                  <div className="seat-hp">
                    <div className="seat-hp-bar">
                      <div className="seat-hp-fill" style={{ width: `${hpPct}%`, backgroundColor: hpColor }} />
                    </div>
                    <div className="text-[8px] text-center text-steel-400">{p.hp}/{p.maxHp}</div>
                  </div>

                  {/* Status icons */}
                  <div className="flex gap-0.5 text-[10px] mt-0.5">
                    {p.stunned && <span title="Зашеметен">💫</span>}
                    {p.poisoned && <span title="Отровен">☠️</span>}
                    {p.shielded && <span title="Щит">🛡️</span>}
                    {p.hasCounter && <span title="Контра">⚡</span>}
                    {p.frozen && <span title="Замразен">❄️</span>}
                    {p.eliminated && <span>💀</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Battle Log */}
        <div className="lg:w-80 flex flex-col gap-3">
          {/* Initiative */}
          {initiative.length > 0 && (
            <div className="bg-dark-800 border border-steel-600/20 rounded-xl p-3">
              <h3 className="text-xs text-steel-400 uppercase tracking-wider mb-2">Инициатива</h3>
              <div className="space-y-1">
                {initiative.map((i, idx) => (
                  <div key={i.id} className={`flex justify-between text-xs px-2 py-1 rounded ${
                    currentTurn === i.id ? 'bg-accent-blue/10 text-accent-blue' : 'text-steel-400'
                  }`}>
                    <span>#{idx + 1} {i.name}</span>
                    <span className="font-pixel text-[10px]">{i.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Log */}
          <div className="battle-log" ref={logRef}>
            <h3 className="text-xs text-steel-400 uppercase tracking-wider mb-2 sticky top-0 bg-dark-800/80">Бойен Лог</h3>
            {battleLog.slice(-20).map((entry, i) => (
              <div key={i} className={`log-entry log-${entry.type}`}>
                <span className="text-[11px]">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Action Panel */}
      {!myState?.eliminated && (
        <div className="mt-4 border-t border-steel-600/20 pt-4">
          {/* Turn indicator */}
          <div className="text-center mb-3">
            {isMyTurn && !actionSubmitted ? (
              <span className="inline-block px-4 py-1.5 rounded-full bg-accent-blue/20 text-accent-blue font-bold text-sm animate-pulse border border-accent-blue/30">
                ТВОЙ ХОД — Избери цел и действие!
              </span>
            ) : roundComplete ? (
              <span className="text-steel-400 text-sm">Рундът приключи. Следващ рунд зарежда...</span>
            ) : (
              <span className="text-steel-400 text-sm">
                Ход на: {allPlayers.find(p => p.id === currentTurn)?.name || '...'}
              </span>
            )}
          </div>

          {/* My Warrior */}
          {myState?.warrior && (
            <div className="flex justify-center mb-4">
              <Card card={myState.warrior} small />
            </div>
          )}

          {/* Spell & Counter Hand */}
          {isMyTurn && !actionSubmitted && (
            <div className="flex flex-col lg:flex-row gap-4 justify-center items-start mb-4">
              {/* Spells */}
              {spells.length > 0 && (
                <div>
                  <h4 className="text-xs text-blue-400 uppercase tracking-wider mb-2 text-center">Spell Карти</h4>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {spells.map(s => (
                      <SpellCard
                        key={s.uid}
                        spell={s}
                        selected={selectedSpell?.uid === s.uid}
                        onClick={(sp) => setSelectedSpell(selectedSpell?.uid === sp.uid ? null : sp)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Counters */}
              {counters.length > 0 && (
                <div>
                  <h4 className="text-xs text-amber-400 uppercase tracking-wider mb-2 text-center">Counter Карти</h4>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {counters.map(c => (
                      <SpellCard
                        key={c.uid}
                        spell={c}
                        isCounter
                        selected={selectedCounter?.uid === c.uid}
                        onClick={(ct) => setSelectedCounter(selectedCounter?.uid === ct.uid ? null : ct)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          {isMyTurn && !actionSubmitted && selectedTarget && (
            <div className="text-center">
              <button className="btn-game btn-primary text-lg px-10 py-3 relative" onClick={submitAction}>
                АТАКУВАЙ {allPlayers.find(p => p.id === selectedTarget)?.name}!
                {selectedSpell && ` + ${selectedSpell.name}`}
                <span className="btn-shine" />
              </button>
            </div>
          )}

          {isMyTurn && !actionSubmitted && !selectedTarget && (
            <p className="text-center text-accent-blue/60 text-sm animate-pulse">Кликни на противник от масата за цел</p>
          )}

          {actionSubmitted && (
            <div className="flex flex-col items-center py-4 gap-2">
              <div className="w-8 h-8 border-4 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
              <p className="text-steel-400 text-sm">Действие изпратено!</p>
            </div>
          )}
        </div>
      )}

      {/* Turn Results Overlay */}
      {turnResults && turnResults.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 bg-dark-800/95 border border-accent-blue/20 rounded-xl p-4 max-w-sm animate-slide-up backdrop-blur-sm">
          <div className="space-y-1">
            {turnResults.map((r, i) => (
              <div key={i} className={`result-entry result-${r.type}`} style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="text-sm">{r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
