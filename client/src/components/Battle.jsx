import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Card, { SpellCard, SpellIcon } from './Card';

const SEAT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

// Countdown timer for counter prompt
function CountdownTimer({ seconds }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  const pct = (remaining / seconds) * 100;
  return (
    <div className="mt-3">
      <div className="h-1.5 bg-steel-600/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
          style={{ width: `${pct}%`, transition: 'width 1s linear' }}
        />
      </div>
      <div className="text-center text-[10px] text-steel-400 mt-1">{remaining}с</div>
    </div>
  );
}

export default function Battle({
  socket, playerId, playerStates, round, initiative,
  currentTurn, battleLog, spells, counters, turnResults,
  lastAction, roundComplete, counterPrompt, onCounterResponse, onError
}) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedSpell, setSelectedSpell] = useState(null);
  const [actionSubmitted, setActionSubmitted] = useState(false);
  const [turnAnim, setTurnAnim] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const logRef = useRef(null);
  const animTimeouts = useRef([]);

  const isMyTurn = currentTurn === playerId;
  const myState = playerStates[playerId];
  const allPlayers = useMemo(() => Object.values(playerStates), [playerStates]);

  // Reset on turn change
  useEffect(() => {
    if (isMyTurn) {
      setSelectedTarget(null);
      setSelectedSpell(null);
      setActionSubmitted(false);
    }
  }, [currentTurn]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battleLog]);

  // ===== TURN ANIMATION SYSTEM =====
  useEffect(() => {
    if (!turnResults?.length || !lastAction) return;

    animTimeouts.current.forEach(clearTimeout);
    animTimeouts.current = [];

    const totalDmg = turnResults
      .filter(r => r.type === 'attack')
      .reduce((sum, r) => sum + (r.damage || 0), 0);
    const totalHeal = turnResults
      .filter(r => r.type === 'heal')
      .reduce((sum, r) => sum + (r.heal || 0), 0);
    const hasElim = turnResults.some(r => r.type === 'elimination');
    const hasBan = turnResults.some(r => r.type === 'ban');
    const hasCounter = turnResults.some(r => r.type === 'counter_played' || r.type === 'counter');

    // Phase 1: Cards slam in
    setTurnAnim({ phase: 'play', action: lastAction, totalDmg, totalHeal, hasElim, hasBan, hasCounter });

    // Phase 1.5: Spell effect burst
    if (lastAction.spell) {
      animTimeouts.current.push(setTimeout(() => {
        setTurnAnim(prev => prev ? { ...prev, phase: 'spell' } : null);
      }, 500));
    }

    // Phase 2: Impact + shake
    animTimeouts.current.push(setTimeout(() => {
      setTurnAnim(prev => prev ? { ...prev, phase: 'impact' } : null);
      if (totalDmg > 0) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 400);
      }
    }, lastAction.spell ? 1000 : 700));

    // Phase 2.5: Counter flash
    if (hasCounter) {
      animTimeouts.current.push(setTimeout(() => {
        setTurnAnim(prev => prev ? { ...prev, phase: 'counter_flash' } : null);
      }, lastAction.spell ? 1300 : 1000));
    }

    // Phase 3: Resolve / fade
    animTimeouts.current.push(setTimeout(() => {
      setTurnAnim(prev => prev ? { ...prev, phase: 'resolve' } : null);
    }, lastAction.spell ? 1900 : 1600));

    // Phase 4: Clear
    animTimeouts.current.push(setTimeout(() => {
      setTurnAnim(null);
    }, lastAction.spell ? 2500 : 2200));

    return () => animTimeouts.current.forEach(clearTimeout);
  }, [turnResults, lastAction]);

  const submitAction = useCallback(() => {
    if (!selectedTarget) return onError('Избери цел!');
    socket.emit('turn_action', {
      targetId: selectedTarget,
      spellUid: selectedSpell?.uid || null
    }, (res) => {
      if (res.error) return onError(res.error);
      setActionSubmitted(true);
    });
  }, [selectedTarget, selectedSpell, socket, onError]);

  // Stunned screen
  if (myState?.stunned && isMyTurn) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center animate-shake">
          <div className="text-7xl mb-4">💫</div>
          <h2 className="text-3xl font-title text-yellow-400 mb-2">ЗАШЕМЕТЕН!</h2>
          <p className="text-steel-400">Пропускаш този рунд...</p>
        </div>
      </div>
    );
  }

  const myHpPct = myState ? (myState.hp / myState.maxHp) * 100 : 0;
  const myHpColor = myHpPct > 50 ? '#22c55e' : myHpPct > 25 ? '#f59e0b' : '#ef4444';

  return (
    <div className={`h-full flex flex-col overflow-hidden ${isShaking ? 'animate-battle-shake' : ''}`}>
      {/* ===== COUNTER PROMPT OVERLAY ===== */}
      {counterPrompt && (
        <div className="counter-prompt-overlay">
          <div className="counter-prompt-card animate-slide-up">
            <div className="counter-prompt-header">
              <h3 className="text-lg font-title text-red-400 animate-pulse">АТАКУВАН СИ!</h3>
            </div>
            <div className="flex items-center justify-center gap-3 my-3">
              {counterPrompt.attackerWarrior && (
                <img
                  src={counterPrompt.attackerWarrior.image}
                  alt=""
                  className="w-14 h-14 rounded-full border-2 border-red-500/60 shadow-lg shadow-red-500/20 object-cover"
                />
              )}
              <div className="text-left">
                <div className="text-sm font-bold text-white">{counterPrompt.attackerName}</div>
                {counterPrompt.spellUsed && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <SpellIcon icon={counterPrompt.spellUsed.icon} iconColor={counterPrompt.spellUsed.iconColor} size="sm" />
                    <span className="text-xs text-blue-300">{counterPrompt.spellUsed.name}</span>
                  </div>
                )}
                {!counterPrompt.spellUsed && (
                  <span className="text-xs text-steel-400">Без магия</span>
                )}
              </div>
            </div>

            <div className="text-[10px] text-amber-400 uppercase tracking-wider mb-2 text-center font-bold">
              Играй контра:
            </div>
            <div className="flex gap-2 justify-center flex-wrap mb-3">
              {counterPrompt.counters.map(c => (
                <SpellCard
                  key={c.uid}
                  spell={c}
                  isCounter
                  onClick={() => onCounterResponse(c.uid)}
                />
              ))}
            </div>

            <button
              className="btn-game btn-secondary w-full text-sm py-2"
              onClick={() => onCounterResponse(null)}
            >
              ПРОПУСНИ
            </button>

            <CountdownTimer seconds={counterPrompt.timeLimit} />
          </div>
        </div>
      )}

      {/* ===== MAIN 3-COLUMN LAYOUT ===== */}
      <div className="flex-1 min-h-0 flex">

        {/* LEFT: My Warrior Card (large screens) */}
        <div className="hidden lg:flex w-64 shrink-0 flex-col items-center justify-center p-3 border-r border-steel-600/10 bg-dark-900/40">
          {myState?.warrior && (
            <>
              <Card card={myState.warrior} />
              <div className="mt-3 w-48">
                <div className="hp-bar">
                  <div className="hp-bar-fill" style={{ width: `${myHpPct}%`, backgroundColor: myHpColor }} />
                  <div className="hp-bar-text">{myState.hp}/{myState.maxHp}</div>
                </div>
              </div>
              <div className="flex gap-1.5 mt-2 text-base">
                {myState.stunned && <span title="Зашеметен" className="status-icon status-stunned">💫</span>}
                {myState.poisoned && <span title="Отровен" className="status-icon status-poisoned">☠️</span>}
                {myState.shielded && <span title="Щит" className="status-icon status-shielded">🛡️</span>}
                {myState.frozen && <span title="Замразен" className="status-icon status-frozen">❄️</span>}
                {myState.silenced && <span title="Заглушен" className="status-icon status-silenced">🔇</span>}
              </div>
              {myState.bans > 0 && (
                <div className="mt-1 text-[10px] text-red-400 font-bold">
                  🔨 BANS: {myState.bans} (+{myState.bans * 2} ATK/DEF)
                </div>
              )}
            </>
          )}
        </div>

        {/* CENTER: Round Table */}
        <div className="flex-1 flex items-center justify-center relative min-h-0">
          <div className="round-table">
            <div className="table-center">
              <div className="text-center">
                <div className="text-3xl font-title text-accent-blue">{round}</div>
                <div className="text-[9px] text-steel-400 uppercase tracking-wider">РУНД</div>
              </div>
            </div>

            {allPlayers.map((p, i) => {
              const angle = SEAT_ANGLES[i] || 0;
              const hpPct = (p.hp / p.maxHp) * 100;
              const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#f59e0b' : '#ef4444';
              const isTarget = selectedTarget === p.id;
              const isMe = p.id === playerId;
              const isTurn = currentTurn === p.id;
              const isAnimAttacker = turnAnim?.action?.attackerId === p.id && turnAnim.phase !== 'resolve';
              const isAnimTarget = turnAnim?.action?.targetId === p.id && turnAnim.phase === 'impact';

              return (
                <div
                  key={p.id}
                  className={`table-seat ${isTurn ? 'active-turn' : ''} ${isTarget ? 'targeted' : ''} ${isAnimTarget ? 'anim-hit' : ''}`}
                  style={{ '--angle': `${angle}deg` }}
                  onClick={() => {
                    if (!isMe && !p.eliminated && isMyTurn && !actionSubmitted) {
                      setSelectedTarget(p.id);
                    }
                  }}
                >
                  {isTarget && (
                    <div className="target-badge animate-pulse">TARGET</div>
                  )}

                  <div className={`seat-avatar ${p.eliminated ? 'eliminated' : ''} ${isMe ? 'ring-accent' : ''} ${isTarget ? 'ring-target' : ''} ${isAnimAttacker ? 'anim-attacker-glow' : ''} ${p.banned ? 'banned-avatar' : ''}`}>
                    {p.warrior ? (
                      <img src={p.warrior.image} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{p.name[0]}</span>
                    )}
                    {p.banned && (
                      <div className="banned-stamp">BAN</div>
                    )}
                  </div>

                  <div className={`text-[10px] font-bold mt-0.5 truncate max-w-[90px] text-center ${
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
                    {p.stunned && <span title="Зашеметен" className="status-icon-sm">💫</span>}
                    {p.poisoned && <span title="Отровен" className="status-icon-sm status-poisoned">☠️</span>}
                    {p.shielded && <span title="Щит" className="status-icon-sm">🛡️</span>}
                    {p.frozen && <span title="Замразен" className="status-icon-sm status-frozen">❄️</span>}
                    {p.silenced && <span title="Заглушен" className="status-icon-sm status-silenced">🔇</span>}
                    {p.bans > 0 && <span title={`${p.bans} бана`} className="status-icon-sm text-red-500">🔨</span>}
                    {p.eliminated && !p.banned && <span>💀</span>}
                    {p.eliminated && p.banned && <span className="text-red-500 font-bold text-[8px]">BAN</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== TURN ANIMATION OVERLAY ===== */}
          {turnAnim && (
            <div className="turn-anim-overlay">
              <div className={`turn-anim-container ${turnAnim.phase === 'resolve' ? 'animate-fade-out' : ''}`}>
                {/* Attacker side */}
                <div className="anim-fighter animate-slam-left">
                  {turnAnim.action.attackerWarrior && (
                    <div className="anim-card-display">
                      <img
                        src={turnAnim.action.attackerWarrior.image}
                        alt=""
                        className={`w-20 h-20 rounded-xl object-cover border-2 shadow-lg ${
                          turnAnim.action.attackerWarrior.rarity === 'owner'
                            ? 'border-owner-glow shadow-red-500/30'
                            : 'border-accent-blue/60 shadow-accent-blue/20'
                        }`}
                      />
                      <div className="text-[10px] font-bold text-accent-blue mt-1 text-center truncate w-24">
                        {turnAnim.action.attackerName}
                      </div>
                    </div>
                  )}
                </div>

                {/* Center: VS / Damage / Spell / Counter */}
                <div className="anim-center">
                  {turnAnim.phase === 'play' && (
                    <div className="anim-vs-icon animate-spell-burst">⚔️</div>
                  )}

                  {/* Spell burst effect */}
                  {turnAnim.phase === 'spell' && turnAnim.action.spell && (
                    <div className="animate-spell-burst">
                      <SpellIcon
                        icon={turnAnim.action.spell.icon}
                        iconColor={turnAnim.action.spell.iconColor}
                        size="lg"
                      />
                      <div className="text-[10px] font-bold mt-1 text-center" style={{ color: turnAnim.action.spell.iconColor }}>
                        {turnAnim.action.spell.name}
                      </div>
                    </div>
                  )}

                  {turnAnim.phase === 'impact' && turnAnim.totalDmg > 0 && (
                    <div className="animate-damage-pop text-4xl font-title font-bold text-red-500 damage-text-shadow">
                      -{turnAnim.totalDmg}
                    </div>
                  )}
                  {turnAnim.phase === 'impact' && turnAnim.totalDmg === 0 && (
                    <div className="animate-damage-pop text-2xl font-title text-steel-400">MISS</div>
                  )}

                  {/* Counter flash */}
                  {turnAnim.phase === 'counter_flash' && turnAnim.action.counter && (
                    <div className="animate-spell-burst">
                      <SpellIcon
                        icon={turnAnim.action.counter.icon}
                        iconColor={turnAnim.action.counter.iconColor}
                        size="lg"
                      />
                      <div className="text-[10px] font-bold mt-1 text-center" style={{ color: turnAnim.action.counter.iconColor }}>
                        {turnAnim.action.counter.name}
                      </div>
                    </div>
                  )}

                  {turnAnim.phase === 'resolve' && turnAnim.hasElim && !turnAnim.hasBan && (
                    <div className="animate-elimination-skull text-5xl">💀</div>
                  )}
                  {turnAnim.phase === 'resolve' && turnAnim.hasBan && (
                    <div className="animate-elimination-skull text-center">
                      <div className="text-4xl">🔨</div>
                      <div className="text-red-500 font-title text-lg animate-pulse">BANNED</div>
                    </div>
                  )}

                  {/* Spell indicator (persistent small badge) */}
                  {turnAnim.action.spell && turnAnim.phase !== 'resolve' && turnAnim.phase !== 'spell' && (
                    <div className="anim-spell-badge" style={{ borderColor: `${turnAnim.action.spell.iconColor}50`, background: `${turnAnim.action.spell.iconColor}15` }}>
                      <SpellIcon icon={turnAnim.action.spell.icon} iconColor={turnAnim.action.spell.iconColor} size="sm" />
                      <span className="text-[8px] font-bold ml-1" style={{ color: turnAnim.action.spell.iconColor }}>{turnAnim.action.spell.name}</span>
                    </div>
                  )}

                  {/* Counter indicator */}
                  {turnAnim.action.counter && turnAnim.phase === 'impact' && (
                    <div className="anim-counter-badge" style={{ borderColor: `${turnAnim.action.counter.iconColor}50`, background: `${turnAnim.action.counter.iconColor}15` }}>
                      <SpellIcon icon={turnAnim.action.counter.icon} iconColor={turnAnim.action.counter.iconColor} size="sm" />
                      <span className="text-[8px] font-bold ml-1" style={{ color: turnAnim.action.counter.iconColor }}>{turnAnim.action.counter.name}</span>
                    </div>
                  )}
                </div>

                {/* Target side */}
                <div className="anim-fighter animate-slam-right">
                  {turnAnim.action.targetWarrior && (
                    <div className="anim-card-display">
                      <img
                        src={turnAnim.action.targetWarrior.image}
                        alt=""
                        className={`w-20 h-20 rounded-xl object-cover border-2 shadow-lg ${
                          turnAnim.phase === 'impact' ? 'border-red-500/80 shadow-red-500/30 animate-shake' : 'border-red-500/40 shadow-red-500/10'
                        }`}
                      />
                      <div className="text-[10px] font-bold text-red-400 mt-1 text-center truncate w-24">
                        {turnAnim.action.targetName}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Impact flash */}
              {turnAnim.phase === 'impact' && turnAnim.totalDmg > 0 && (
                <div className="impact-flash-ring animate-impact-flash" />
              )}

              {/* Heal glow */}
              {turnAnim.phase === 'impact' && turnAnim.totalHeal > 0 && (
                <div className="heal-flash animate-impact-flash" />
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Initiative + Battle Log */}
        <div className="w-72 shrink-0 flex flex-col gap-2 p-2 border-l border-steel-600/10 min-h-0 bg-dark-900/40">
          {initiative.length > 0 && (
            <div className="bg-dark-800 border border-steel-600/20 rounded-xl p-2 shrink-0">
              <h3 className="text-xs text-steel-400 uppercase tracking-wider mb-1 font-bold">Инициатива</h3>
              <div className="space-y-0.5">
                {initiative.map((init, idx) => (
                  <div key={init.id} className={`flex justify-between text-xs px-2 py-0.5 rounded transition-colors ${
                    currentTurn === init.id ? 'bg-accent-blue/10 text-accent-blue font-bold' : 'text-steel-400'
                  }`}>
                    <span>#{idx + 1} {init.name}</span>
                    <span className="font-pixel text-[11px]">🎲{init.roll}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="battle-log flex-1 min-h-0" ref={logRef}>
            <h3 className="text-xs text-steel-400 uppercase tracking-wider mb-1 sticky top-0 bg-dark-800/95 backdrop-blur-sm z-10 pb-1 font-bold">
              Бойен Лог
            </h3>
            {battleLog.slice(-30).map((entry, i) => (
              <div key={i} className={`log-entry log-${entry.type}`}>
                <span className="text-[11px]">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== BOTTOM: ACTION PANEL ===== */}
      {!myState?.eliminated && (
        <div className="shrink-0 border-t border-steel-600/20 bg-dark-900/80 backdrop-blur-sm">
          {/* Turn indicator */}
          <div className="text-center py-1.5">
            {isMyTurn && !actionSubmitted ? (
              <span className="inline-block px-4 py-1 rounded-full bg-accent-blue/20 text-accent-blue font-bold text-xs animate-pulse border border-accent-blue/30">
                ТВОЙ ХОД — Избери цел{myState?.silenced ? '' : ' и магия'}!
              </span>
            ) : roundComplete ? (
              <span className="text-steel-400 text-xs">Рундът приключи. Следващ рунд зарежда...</span>
            ) : (
              <span className="text-steel-400 text-xs">
                Ход на: {allPlayers.find(p => p.id === currentTurn)?.name || '...'}
              </span>
            )}
          </div>

          {/* Action row */}
          {isMyTurn && !actionSubmitted ? (
            <div className="flex items-center justify-center gap-4 pb-2 flex-wrap px-4">
              {/* Warrior info (mobile fallback) */}
              {myState?.warrior && (
                <div className="lg:hidden flex items-center gap-2 bg-dark-800/60 rounded-lg px-2 py-1 border border-steel-600/20">
                  <img src={myState.warrior.image} alt="" className="w-8 h-8 rounded-full object-cover border border-steel-600/30" />
                  <div>
                    <div className="text-[10px] font-bold text-white">{myState.warrior.name}</div>
                    <div className="text-[9px] text-steel-400">
                      <span className="text-red-400">ATK {myState.warrior.atk}</span>{' '}
                      <span className="text-blue-400">DEF {myState.warrior.def}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Spells (only if not silenced) */}
              {spells.length > 0 && !myState?.silenced && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-blue-400 uppercase tracking-wider mr-1 font-bold">Магия</span>
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

              {/* Silenced indicator */}
              {myState?.silenced && spells.length > 0 && (
                <div className="flex items-center gap-1 px-3 py-1 bg-red-900/20 rounded-lg border border-red-500/20">
                  <span className="text-lg">🔇</span>
                  <span className="text-[10px] text-red-400 font-bold">ЗАГЛУШЕН — без магии</span>
                </div>
              )}

              {/* Counter count indicator */}
              {counters.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-900/10 rounded-lg border border-amber-500/20">
                  <span className="text-xs">🛡️</span>
                  <span className="text-[10px] text-amber-400">{counters.length} контри готови</span>
                </div>
              )}

              {/* Submit button */}
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
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="w-5 h-5 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
              <span className="text-steel-400 text-xs">Действие изпратено!</span>
            </div>
          ) : myState?.warrior ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <img src={myState.warrior.image} alt="" className="w-7 h-7 rounded-full object-cover border border-steel-600/30" />
              <span className="text-[11px] text-steel-400">{myState.warrior.name}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Turn Results Toast (shows after animation) */}
      {turnResults && turnResults.length > 0 && !turnAnim && (
        <div className="fixed bottom-4 right-4 z-40 bg-dark-800/95 border border-accent-blue/20 rounded-xl p-3 max-w-xs animate-slide-up backdrop-blur-sm shadow-xl shadow-black/30">
          <div className="space-y-0.5">
            {turnResults.map((r, i) => (
              <div key={i} className={`result-entry result-${r.type}`} style={{ animationDelay: `${i * 0.08}s` }}>
                <span className="text-xs">{r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
