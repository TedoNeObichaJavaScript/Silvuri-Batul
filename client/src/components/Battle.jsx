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
      <div className="h-full flex items-center justify-center">
        <div className="text-center animate-shake">
          <div className="text-6xl mb-3">💫</div>
          <h2 className="text-2xl font-title text-yellow-400 mb-2">ЗАШЕМЕТЕН!</h2>
          <p className="text-steel-400 text-sm">Пропускаш този рунд...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden px-2 py-1 animate-slide-up">
      {/* Top: Round Table + Sidebar */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2">
        {/* LEFT: Round Table */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="round-table">
            <div className="table-center">
              <div className="text-center">
                <div className="text-2xl font-title text-accent-blue">{round}</div>
                <div className="text-[9px] text-steel-400 uppercase">РУНД</div>
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
                  {isTarget && (
                    <div className="absolute -top-2 text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse z-10">
                      TARGET
                    </div>
                  )}

                  <div className={`seat-avatar ${p.eliminated ? 'eliminated' : ''} ${isMe ? '!border-accent-blue/60' : ''} ${isTarget ? '!border-red-500' : ''}`}>
                    {p.warrior ? (
                      <img src={p.warrior.image} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{p.name[0]}</span>
                    )}
                  </div>

                  <div className={`text-[9px] font-bold mt-0.5 truncate max-w-[80px] text-center ${
                    isMe ? 'text-accent-blue' : isTurn ? 'text-white' : 'text-steel-400'
                  }`}>
                    {p.name} {isMe && '(ти)'}
                  </div>

                  <div className="seat-hp">
                    <div className="seat-hp-bar">
                      <div className="seat-hp-fill" style={{ width: `${hpPct}%`, backgroundColor: hpColor }} />
                    </div>
                    <div className="text-[7px] text-center text-steel-400">{p.hp}/{p.maxHp}</div>
                  </div>

                  <div className="flex gap-0.5 text-[9px] mt-0.5">
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

        {/* RIGHT: Initiative + Log */}
        <div className="lg:w-72 flex flex-col gap-2 min-h-0">
          {initiative.length > 0 && (
            <div className="bg-dark-800 border border-steel-600/20 rounded-xl p-2 shrink-0">
              <h3 className="text-[10px] text-steel-400 uppercase tracking-wider mb-1">Инициатива</h3>
              <div className="space-y-0.5">
                {initiative.map((i, idx) => (
                  <div key={i.id} className={`flex justify-between text-[11px] px-2 py-0.5 rounded ${
                    currentTurn === i.id ? 'bg-accent-blue/10 text-accent-blue' : 'text-steel-400'
                  }`}>
                    <span>#{idx + 1} {i.name}</span>
                    <span className="font-pixel text-[10px]">{i.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="battle-log flex-1 min-h-0" ref={logRef}>
            <h3 className="text-[10px] text-steel-400 uppercase tracking-wider mb-1 sticky top-0 bg-dark-800/80">Бойен Лог</h3>
            {battleLog.slice(-20).map((entry, i) => (
              <div key={i} className={`log-entry log-${entry.type}`}>
                <span className="text-[10px]">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Action Panel */}
      {!myState?.eliminated && (
        <div className="shrink-0 border-t border-steel-600/20 pt-2 pb-1">
          {/* Turn indicator */}
          <div className="text-center mb-1">
            {isMyTurn && !actionSubmitted ? (
              <span className="inline-block px-3 py-1 rounded-full bg-accent-blue/20 text-accent-blue font-bold text-xs animate-pulse border border-accent-blue/30">
                ТВОЙ ХОД — Избери цел и действие!
              </span>
            ) : roundComplete ? (
              <span className="text-steel-400 text-xs">Рундът приключи. Следващ рунд зарежда...</span>
            ) : (
              <span className="text-steel-400 text-xs">
                Ход на: {allPlayers.find(p => p.id === currentTurn)?.name || '...'}
              </span>
            )}
          </div>

          {/* Cards row: Warrior + Spells + Counters + Attack button all inline */}
          {isMyTurn && !actionSubmitted ? (
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {/* My Warrior (compact) */}
              {myState?.warrior && (
                <div className="flex items-center gap-2 bg-dark-800/60 rounded-lg px-2 py-1 border border-steel-600/20">
                  <img src={myState.warrior.image} alt="" className="w-8 h-8 rounded-full object-cover border border-steel-600/30" />
                  <div>
                    <div className="text-[10px] font-bold text-white">{myState.warrior.name}</div>
                    <div className="text-[9px] text-steel-400">
                      <span className="text-red-400">ATK {myState.warrior.atk}</span>{' '}
                      <span className="text-blue-400">DEF {myState.warrior.def}</span>{' '}
                      <span className="text-yellow-400">SPD {myState.warrior.spd}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Spells */}
              {spells.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-blue-400 uppercase tracking-wider mr-1">Spell</span>
                  {spells.map(s => (
                    <SpellCard
                      key={s.uid}
                      spell={s}
                      selected={selectedSpell?.uid === s.uid}
                      onClick={(sp) => setSelectedSpell(selectedSpell?.uid === sp.uid ? null : sp)}
                    />
                  ))}
                </div>
              )}

              {/* Counters */}
              {counters.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-amber-400 uppercase tracking-wider mr-1">Counter</span>
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
              )}

              {/* Submit */}
              {selectedTarget ? (
                <button className="btn-game btn-primary text-sm px-6 py-2 relative" onClick={submitAction}>
                  АТАКУВАЙ {allPlayers.find(p => p.id === selectedTarget)?.name}!
                  {selectedSpell && ` + ${selectedSpell.name}`}
                  <span className="btn-shine" />
                </button>
              ) : (
                <span className="text-accent-blue/60 text-xs animate-pulse">Кликни противник за цел</span>
              )}
            </div>
          ) : actionSubmitted ? (
            <div className="flex items-center justify-center gap-2 py-1">
              <div className="w-5 h-5 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
              <span className="text-steel-400 text-xs">Действие изпратено!</span>
            </div>
          ) : myState?.warrior ? (
            <div className="flex items-center justify-center gap-2">
              <img src={myState.warrior.image} alt="" className="w-7 h-7 rounded-full object-cover border border-steel-600/30" />
              <span className="text-[11px] text-steel-400">{myState.warrior.name}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Turn Results Overlay */}
      {turnResults && turnResults.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 bg-dark-800/95 border border-accent-blue/20 rounded-xl p-3 max-w-xs animate-slide-up backdrop-blur-sm">
          <div className="space-y-0.5">
            {turnResults.map((r, i) => (
              <div key={i} className={`result-entry result-${r.type}`} style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="text-xs">{r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
