import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Card, { SpellCard, SpellIcon } from './Card';
import { assetUrl } from '../utils/assetUrl';
import { SFX } from '../utils/sounds';

// Distribute seats evenly around the circle based on player count
function getSeatAngles(count) {
  if (count <= 0) return [];
  // Start from top (-90°) and space evenly
  return Array.from({ length: count }, (_, i) => (360 / count) * i);
}

const EMOTES = [
  { id: 'gg', label: 'GG', icon: '🤝' },
  { id: 'haha', label: 'Хаха', icon: '😂' },
  { id: 'kontra', label: 'Контра!', icon: '🛡️' },
  { id: 'wp', label: 'WP', icon: '👏' },
  { id: 'bravo', label: 'Браво', icon: '🎉' },
  { id: 'gg_ez', label: 'EZ', icon: '😎' },
  { id: 'oops', label: 'Опа', icon: '😬' },
  { id: 'rage', label: 'RAGE', icon: '🤬' },
];

const RARITY_GLOW = {
  common: '#8a9bb0', rare: '#3b82f6', epic: '#8b5cf6',
  legendary: '#f59e0b', secret: '#dc2626', cosmic: '#ff00ff', owner: '#ff0000'
};

// Status badge component — replaces emoji icons
function StatusBadge({ label, color, pulse }) {
  return (
    <span
      className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${pulse ? 'animate-pulse' : ''}`}
      style={{ background: `${color}25`, color, border: `1px solid ${color}50`, textShadow: `0 0 6px ${color}88` }}
    >
      {label}
    </span>
  );
}

// Status entry with description — used in the left panel
function StatusEntry({ label, color, desc, pulse }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
      <span
        className={`shrink-0 inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider ${pulse ? 'animate-pulse' : ''}`}
        style={{ background: `${color}25`, color, border: `1px solid ${color}50`, textShadow: `0 0 6px ${color}88` }}
      >
        {label}
      </span>
      <span className="text-[9px] text-steel-400 leading-tight">{desc}</span>
    </div>
  );
}

// Turn timer bar
function TurnTimerBar({ seconds, total = 30 }) {
  const pct = (seconds / total) * 100;
  const color = seconds <= 5 ? '#ef4444' : seconds <= 10 ? '#f59e0b' : '#00b4ff';
  return (
    <div className="w-full h-1 rounded-full overflow-hidden bg-dark-600/50 mt-1">
      <div className="h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, boxShadow: `0 0 8px ${color}66` }} />
    </div>
  );
}

function CountdownTimer({ seconds }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    setRemaining(seconds);
    const interval = setInterval(() => {
      setRemaining(prev => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);
  const pct = (remaining / seconds) * 100;
  return (
    <div className="mt-3">
      <div className="h-1.5 bg-steel-600/20 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full" style={{ width: `${pct}%`, transition: 'width 1s linear' }} />
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
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const [showEmotes, setShowEmotes] = useState(false);
  const [floatingEmotes, setFloatingEmotes] = useState([]);
  const [roundRecap, setRoundRecap] = useState(null);
  const [turnBanner, setTurnBanner] = useState(null);
  const bannerTimeoutsRef = useRef([]);
  const lastResultsTime = useRef(0);

  // The card to show in the left panel — hovered player or self
  const previewCard = useMemo(() => {
    if (hoveredPlayer) {
      const p = playerStates[hoveredPlayer];
      return p?.warrior ? { warrior: p.warrior, name: p.name, hp: p.hp, maxHp: p.maxHp, isEnemy: true } : null;
    }
    if (myState?.warrior) return { warrior: myState.warrior, name: myState.name, hp: myState.hp, maxHp: myState.maxHp, isEnemy: false };
    return null;
  }, [hoveredPlayer, playerStates, myState]);

  // Turn timer countdown (30s)
  const [turnTimer, setTurnTimer] = useState(30);
  useEffect(() => {
    setTurnTimer(30);
    const interval = setInterval(() => { setTurnTimer(prev => prev > 0 ? prev - 1 : 0); }, 1000);
    return () => clearInterval(interval);
  }, [currentTurn]);

  useEffect(() => {
    if (isMyTurn) { setSelectedTarget(null); setSelectedSpell(null); setActionSubmitted(false); SFX.turnStart(); }
  }, [currentTurn]);

  useEffect(() => {
    if (roundComplete && battleLog.length > 0) {
      const roundEntries = battleLog.filter(e => e.type === 'attack' || e.type === 'elimination' || e.type === 'heal');
      const totalDmg = roundEntries.filter(e => e.type === 'attack').reduce((sum, e) => sum + (e.damage || 0), 0);
      const eliminations = roundEntries.filter(e => e.type === 'elimination').map(e => e.playerName);
      const mvp = roundEntries.filter(e => e.type === 'attack').reduce((best, e) => {
        if (!best || (e.damage || 0) > best.damage) return { name: e.playerName, damage: e.damage || 0 }; return best;
      }, null);
      setRoundRecap({ totalDmg, eliminations, mvp, round });
      setTimeout(() => setRoundRecap(null), 2800);
    }
  }, [roundComplete]);

  // Track when turn results arrive (for banner delay calculation)
  useEffect(() => {
    if (turnResults && turnResults.length > 0) {
      lastResultsTime.current = Date.now();
    }
  }, [turnResults]);

  // Turn announcement banner — shows for ALL players when turn changes
  useEffect(() => {
    bannerTimeoutsRef.current.forEach(clearTimeout);
    bannerTimeoutsRef.current = [];
    setTurnBanner(null);
    if (!currentTurn || roundComplete) return;
    const p = playerStates[currentTurn];
    if (!p || p.eliminated) return;

    const recentResults = Date.now() - lastResultsTime.current < 300;
    const delay = recentResults ? 4500 : 200;

    bannerTimeoutsRef.current.push(
      setTimeout(() => {
        setTurnBanner({ name: p.name, warrior: p.warrior, isMe: currentTurn === playerId });
        SFX.turnAnnounce();
      }, delay),
      setTimeout(() => setTurnBanner(null), delay + 2200)
    );
    return () => bannerTimeoutsRef.current.forEach(clearTimeout);
  }, [currentTurn]);

  useEffect(() => {
    const handleEmote = ({ playerId: pid, playerName: pname, emoteId }) => {
      const emote = EMOTES.find(e => e.id === emoteId);
      if (!emote) return;
      SFX.emote();
      const id = Date.now() + Math.random();
      setFloatingEmotes(prev => [...prev, { id, playerId: pid, playerName: pname, ...emote }]);
      setTimeout(() => setFloatingEmotes(prev => prev.filter(e => e.id !== id)), 3000);
    };
    socket.on('player_emote', handleEmote);
    return () => socket.off('player_emote', handleEmote);
  }, [socket]);

  const sendEmote = useCallback((emoteId) => {
    socket.emit('send_emote', { emoteId });
    SFX.emote();
    const emote = EMOTES.find(e => e.id === emoteId);
    if (emote) {
      const id = Date.now() + Math.random();
      setFloatingEmotes(prev => [...prev, { id, playerId, playerName: 'ти', ...emote }]);
      setTimeout(() => setFloatingEmotes(prev => prev.filter(e => e.id !== id)), 3000);
    }
    setShowEmotes(false);
  }, [socket, playerId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battleLog]);

  // ===== TURN ANIMATION (enhanced — sequential phases with roll support) =====
  useEffect(() => {
    animTimeouts.current.forEach(clearTimeout);
    animTimeouts.current = [];
    if (!turnResults?.length || !lastAction) { setTurnAnim(null); return; }
    const totalDmg = turnResults.filter(r => r.type === 'attack').reduce((sum, r) => sum + (r.damage || 0), 0);
    const totalHeal = turnResults.filter(r => r.type === 'heal').reduce((sum, r) => sum + (r.heal || 0), 0);
    const hasElim = turnResults.some(r => r.type === 'elimination');
    const hasBan = turnResults.some(r => r.type === 'ban');
    const hasCounter = turnResults.some(r => r.type === 'counter_played' || r.type === 'counter');

    // Extract rollData from any result that has it
    const rollEntry = turnResults.find(r => r.rollData);
    const rollData = rollEntry?.rollData || null;

    const hasSpell = !!lastAction.spell;

    const animState = { phase: 'play', action: lastAction, totalDmg, totalHeal, hasElim, hasBan, hasCounter, rollData };
    setTurnAnim(animState);
    SFX.attack();

    // Sequential phase scheduler
    let t = 700;
    const sched = (delay, fn) => { animTimeouts.current.push(setTimeout(fn, delay)); };

    // Spell phase
    if (hasSpell) {
      sched(t, () => { setTurnAnim(prev => prev ? { ...prev, phase: 'spell' } : null); SFX.spellCast(); });
      t += 900;
    }

    // Roll phase (coin/dice) — only if rollData exists
    if (rollData) {
      sched(t, () => {
        setTurnAnim(prev => prev ? { ...prev, phase: 'roll' } : null);
        if (rollData.rollType === 'dice') SFX.diceRoll(); else SFX.coinFlip();
      });
      // Show roll result after animation settles
      sched(t + 900, () => {
        setTurnAnim(prev => prev ? { ...prev, phase: 'roll_result' } : null);
        if (rollData.rollType === 'coin') { rollData.success ? SFX.rollSuccess() : SFX.rollFail(); }
        else { rollData.value >= 4 ? SFX.rollSuccess() : SFX.rollFail(); }
      });
      t += 1600;
    }

    // Impact phase
    sched(t, () => {
      setTurnAnim(prev => prev ? { ...prev, phase: 'impact' } : null);
      if (totalDmg > 0) { SFX.bigHit(); setIsShaking(true); setTimeout(() => setIsShaking(false), 600); } else if (totalHeal === 0) { SFX.miss(); }
      if (totalHeal > 0) SFX.heal();
    });
    t += 900;

    // Counter flash phase
    if (hasCounter) {
      sched(t, () => { setTurnAnim(prev => prev ? { ...prev, phase: 'counter_flash' } : null); SFX.counterReveal(); });
      t += 800;
    }

    // Resolve phase
    sched(t, () => { setTurnAnim(prev => prev ? { ...prev, phase: 'resolve' } : null); if (hasElim || hasBan) SFX.killConfirm(); });
    t += 900;

    // Clear
    sched(t, () => { setTurnAnim(null); });

    return () => animTimeouts.current.forEach(clearTimeout);
  }, [turnResults, lastAction]);

  const submitAction = useCallback(() => {
    if (!selectedTarget) return onError('Избери цел!');
    socket.emit('turn_action', { targetId: selectedTarget, spellUid: selectedSpell?.uid || null }, (res) => {
      if (res.error) return onError(res.error);
      setActionSubmitted(true);
    });
  }, [selectedTarget, selectedSpell, socket, onError]);

  // Stunned screen
  if (myState?.stunned && isMyTurn) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center animate-shake">
          <div className="stunned-icon-big" />
          <h2 className="text-3xl font-title text-yellow-400 mb-2">ЗАШЕМЕТЕН!</h2>
          <p className="text-steel-400">Пропускаш този рунд...</p>
        </div>
      </div>
    );
  }

  const previewHpPct = previewCard ? (previewCard.hp / previewCard.maxHp) * 100 : 0;
  const previewHpColor = previewHpPct > 50 ? '#22c55e' : previewHpPct > 25 ? '#f59e0b' : '#ef4444';

  return (
    <div className={`h-full flex flex-col overflow-hidden ${isShaking ? 'animate-heavy-shake' : ''}`}>
      {/* ===== KILL SCREEN FLASH ===== */}
      {turnAnim?.phase === 'resolve' && (turnAnim.hasElim || turnAnim.hasBan) && (
        <div className="kill-screen-flash" />
      )}

      {/* ===== TURN ANNOUNCEMENT BANNER ===== */}
      {turnBanner && (
        <div className="fixed inset-0 z-40 pointer-events-none turn-banner-overlay">
          <div className="absolute inset-x-0 top-0 h-[10%] bg-black turn-banner-bar" style={{ transformOrigin: 'top' }} />
          <div className="absolute inset-x-0 bottom-0 h-[10%] bg-black turn-banner-bar" style={{ transformOrigin: 'bottom' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-8 turn-banner-content">
              <div className="w-16 h-px rounded-full" style={{ background: `linear-gradient(to right, transparent, ${turnBanner.isMe ? '#00b4ff' : '#64748b'})` }} />
              {turnBanner.warrior && (
                <div className="relative">
                  <img src={assetUrl(turnBanner.warrior.image)} alt=""
                    className="w-28 h-28 rounded-2xl object-cover border-2 turn-banner-portrait"
                    style={{ borderColor: RARITY_GLOW[turnBanner.warrior.rarity] || '#00b4ff', boxShadow: `0 0 40px ${RARITY_GLOW[turnBanner.warrior.rarity] || '#00b4ff'}50, 0 0 80px ${RARITY_GLOW[turnBanner.warrior.rarity] || '#00b4ff'}20` }}
                  />
                  <div className="absolute -inset-2 rounded-3xl pointer-events-none" style={{ border: `1px solid ${RARITY_GLOW[turnBanner.warrior.rarity] || '#00b4ff'}30` }} />
                </div>
              )}
              <div>
                <div className="text-xs uppercase tracking-[0.3em] font-bold mb-1.5" style={{ color: turnBanner.isMe ? '#00b4ff' : '#94a3b8', textShadow: turnBanner.isMe ? '0 0 15px rgba(0,180,255,0.5)' : 'none' }}>
                  {turnBanner.isMe ? 'ТВОЯТ ХОД' : 'ХОД НА'}
                </div>
                <div className={`text-5xl font-title ${turnBanner.isMe ? 'text-accent-blue' : 'text-white'}`} style={{ textShadow: turnBanner.isMe ? '0 0 40px rgba(0,180,255,0.6)' : '0 2px 10px rgba(0,0,0,0.5)' }}>
                  {turnBanner.name}
                </div>
                {turnBanner.warrior && (
                  <div className="text-sm font-game mt-1" style={{ color: RARITY_GLOW[turnBanner.warrior.rarity] || '#94a3b8' }}>
                    {turnBanner.warrior.name}
                  </div>
                )}
              </div>
              <div className="w-16 h-px rounded-full" style={{ background: `linear-gradient(to left, transparent, ${turnBanner.isMe ? '#00b4ff' : '#64748b'})` }} />
            </div>
          </div>
        </div>
      )}

      {/* ===== COUNTER PROMPT OVERLAY ===== */}
      {counterPrompt && (
        <div className="counter-prompt-overlay">
          <div className="counter-prompt-card animate-slide-up">
            <div className="counter-prompt-header">
              <h3 className="text-lg font-title text-red-400 animate-pulse">АТАКУВАН СИ!</h3>
            </div>
            <div className="flex items-center justify-center gap-3 my-3">
              {counterPrompt.attackerWarrior && (
                <img src={assetUrl(counterPrompt.attackerWarrior.image)} alt="" className="w-14 h-14 rounded-full border-2 border-red-500/60 shadow-lg shadow-red-500/20 object-cover" />
              )}
              <div className="text-left">
                <div className="text-sm font-bold text-white">{counterPrompt.attackerName}</div>
                {counterPrompt.spellUsed ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <SpellIcon icon={counterPrompt.spellUsed.icon} iconColor={counterPrompt.spellUsed.iconColor} size="sm" spellId={counterPrompt.spellUsed.id} />
                    <span className="text-xs text-blue-300">{counterPrompt.spellUsed.name}</span>
                  </div>
                ) : <span className="text-xs text-steel-400">Без магия</span>}
              </div>
            </div>
            <div className="text-[10px] text-amber-400 uppercase tracking-wider mb-2 text-center font-bold">Играй контра:</div>
            <div className="flex gap-2 justify-center flex-wrap mb-3">
              {counterPrompt.counters.map(c => (
                <SpellCard key={c.uid} spell={c} isCounter onClick={() => onCounterResponse(c.uid)} />
              ))}
            </div>
            <button className="btn-game btn-secondary w-full text-sm py-2" onClick={() => onCounterResponse(null)}>ПРОПУСНИ</button>
            <CountdownTimer seconds={counterPrompt.timeLimit} />
          </div>
        </div>
      )}

      {/* ===== MAIN LAYOUT ===== */}
      <div className="flex-1 min-h-0 flex">

        {/* LEFT: Card Preview Panel */}
        <div className="hidden lg:flex w-64 shrink-0 flex-col items-center p-3 border-r border-steel-600/10 bg-gradient-to-b from-dark-900/60 to-dark-800/40">
          {previewCard ? (
            <div className={`transition-all duration-200 ${hoveredPlayer ? 'scale-[0.97]' : ''}`}>
              {hoveredPlayer && (
                <div className="text-center mb-2 animate-slide-up">
                  <span className="text-[9px] uppercase tracking-widest text-red-400 font-bold">Противник</span>
                </div>
              )}
              <Card card={previewCard.warrior} small />
              <div className="mt-3 w-full">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold ${previewCard.isEnemy ? 'text-red-400' : 'text-accent-blue'}`}>
                    {previewCard.name}
                  </span>
                  <span className="text-[10px] text-steel-400 font-bold">{previewCard.hp}/{previewCard.maxHp}</span>
                </div>
                <div className="hp-bar">
                  <div className="hp-bar-fill" style={{ width: `${previewHpPct}%`, backgroundColor: previewHpColor }} />
                </div>
              </div>
              {/* My status effects with descriptions */}
              {!previewCard.isEnemy && myState && (
                <div className="mt-3 w-full space-y-1">
                  {myState.immune && <StatusEntry label="ИМУНЕН" color="#22d3ee" desc="Не можеш да бъдеш атакуван." />}
                  {myState.stunned && <StatusEntry label="СТЪН" color="#eab308" desc="Пропускаш следващия си ход." pulse />}
                  {myState.poisoned && <StatusEntry label="ОТРОВА" color="#22c55e" desc="Получаваш щети всеки рунд." pulse />}
                  {myState.shielded && <StatusEntry label="ЩИТ" color="#3b82f6" desc="Намалява получените щети." />}
                  {myState.frozen && <StatusEntry label="ЗАМРЪЗ" color="#67e8f9" desc="Не можеш да използваш магии." pulse />}
                  {myState.silenced && <StatusEntry label="ЗАГЛУШЕН" color="#9ca3af" desc="Магиите ти са блокирани." />}
                  {myState.buffAtk > 0 && <StatusEntry label={`+${myState.buffAtk} ATK`} color="#ef4444" desc="Временен бонус на атака." />}
                  {myState.buffDef > 0 && <StatusEntry label={`+${myState.buffDef} DEF`} color="#3b82f6" desc="Временен бонус на защита." />}
                  {myState.bans > 0 && <StatusEntry label={`BAN ×${myState.bans}`} color="#ef4444" desc="Ще бъдеш баннат при елиминация." />}
                </div>
              )}
              {/* Enemy status effects */}
              {previewCard.isEnemy && hoveredPlayer && playerStates[hoveredPlayer] && (
                <div className="mt-3 w-full space-y-1">
                  {playerStates[hoveredPlayer].immune && <StatusEntry label="ИМУНЕН" color="#22d3ee" desc="Не може да бъде атакуван." />}
                  {playerStates[hoveredPlayer].stunned && <StatusEntry label="СТЪН" color="#eab308" desc="Пропуска следващия ход." pulse />}
                  {playerStates[hoveredPlayer].poisoned && <StatusEntry label="ОТРОВА" color="#22c55e" desc="Получава щети всеки рунд." pulse />}
                  {playerStates[hoveredPlayer].shielded && <StatusEntry label="ЩИТ" color="#3b82f6" desc="Намалени получени щети." />}
                  {playerStates[hoveredPlayer].frozen && <StatusEntry label="ЗАМРЪЗ" color="#67e8f9" desc="Не може да ползва магии." pulse />}
                  {playerStates[hoveredPlayer].silenced && <StatusEntry label="ЗАГЛУШЕН" color="#9ca3af" desc="Магиите са блокирани." />}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-steel-600 text-xs">Няма избран силвър</div>
          )}

          {/* Initiative in left panel */}
          {initiative.length > 0 && (
            <div className="w-full mt-auto pt-3 border-t border-steel-600/10">
              <h3 className="text-[9px] text-steel-500 uppercase tracking-widest mb-1.5 font-bold text-center">Ред на хода</h3>
              <div className="space-y-0.5">
                {initiative.map((init, idx) => (
                  <div key={init.id} className={`flex items-center justify-between text-[10px] px-2 py-1 rounded transition-all ${
                    currentTurn === init.id
                      ? 'bg-accent-blue/15 text-accent-blue font-bold border border-accent-blue/20'
                      : 'text-steel-500'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${
                        currentTurn === init.id ? 'bg-accent-blue text-dark-900' : 'bg-dark-600 text-steel-400'
                      }`}>{idx + 1}</span>
                      {init.name}
                    </span>
                    <span className="text-[9px] font-pixel" style={{ opacity: 0.7 }}>d6:{init.roll}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CENTER: Round Table */}
        <div className="flex-1 flex items-center justify-center relative min-h-0">
          {/* Ambient ring */}
          <div className="absolute rounded-full border border-accent-blue/5 pointer-events-none" style={{ width: 'min(55vh, 500px)', height: 'min(55vh, 500px)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />

          <div className="round-table">
            <div className="table-center">
              <div className="text-center">
                <div className="text-[9px] text-steel-500 uppercase tracking-widest mb-0.5">Рунд</div>
                <div className="text-4xl font-title text-accent-blue" style={{ textShadow: '0 0 30px rgba(0,180,255,0.4)' }}>{round}</div>
              </div>
            </div>

            {allPlayers.map((p, i) => {
              const angles = getSeatAngles(allPlayers.length);
              const angle = angles[i] || 0;
              const hpPct = (p.hp / p.maxHp) * 100;
              const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#f59e0b' : '#ef4444';
              const isTarget = selectedTarget === p.id;
              const isMe = p.id === playerId;
              const isTurn = currentTurn === p.id;
              const isAnimAttacker = turnAnim?.action?.attackerId === p.id && turnAnim.phase !== 'resolve';
              const isAnimTarget = turnAnim?.action?.targetId === p.id && turnAnim.phase === 'impact';
              const isHovered = hoveredPlayer === p.id;

              return (
                <div
                  key={p.id}
                  className={`table-seat ${isTurn ? 'active-turn' : ''} ${isTarget ? 'targeted' : ''} ${isAnimTarget ? 'anim-hit' : ''}`}
                  style={{ '--angle': `${angle}deg` }}
                  onClick={() => {
                    if (!isMe && !p.eliminated && !p.immune && isMyTurn && !actionSubmitted) setSelectedTarget(p.id);
                  }}
                  onMouseEnter={() => !isMe && p.warrior && setHoveredPlayer(p.id)}
                  onMouseLeave={() => setHoveredPlayer(null)}
                >
                  {isTarget && <div className="target-badge animate-pulse">ЦЕЛ</div>}

                  <div className={`seat-avatar ${p.eliminated ? 'eliminated' : ''} ${isMe ? 'ring-accent' : ''} ${isTarget ? 'ring-target' : ''} ${isAnimAttacker ? 'anim-attacker-glow' : ''} ${p.banned ? 'banned-avatar' : ''} ${p.immune && !p.eliminated && !isMe ? 'seat-immune' : ''} ${isHovered ? 'seat-hovered' : ''}`}>
                    {p.warrior ? (
                      <img src={assetUrl(p.warrior.image)} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : <span>{p.name[0]}</span>}
                    {p.banned && <div className="banned-stamp">BAN</div>}
                  </div>

                  <div className={`text-[11px] font-bold mt-1 truncate max-w-[100px] text-center ${
                    isMe ? 'text-accent-blue' : isTurn ? 'text-white' : 'text-steel-400'
                  }`}>
                    {p.name} {isMe && '(ти)'}
                  </div>

                  <div className="seat-hp">
                    <div className="seat-hp-bar">
                      <div className="seat-hp-fill" style={{ width: `${hpPct}%`, backgroundColor: hpColor }} />
                    </div>
                    <div className="text-[8px] text-center text-steel-400 font-bold">{p.hp}/{p.maxHp}</div>
                  </div>

                  {/* Status indicators */}
                  <div className="flex gap-1 mt-1 flex-wrap justify-center max-w-[110px]">
                    {p.immune && !p.eliminated && <StatusBadge label="IMM" color="#22d3ee" />}
                    {p.stunned && <StatusBadge label="STUN" color="#eab308" pulse />}
                    {p.poisoned && <StatusBadge label="PSN" color="#22c55e" pulse />}
                    {p.shielded && <StatusBadge label="SLD" color="#3b82f6" />}
                    {p.frozen && <StatusBadge label="FRZ" color="#67e8f9" pulse />}
                    {p.silenced && <StatusBadge label="MUT" color="#9ca3af" />}
                    {p.bans > 0 && <StatusBadge label={`BAN×${p.bans}`} color="#ef4444" />}
                    {!p.eliminated && p.spellCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold text-blue-400" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}>
                        <span style={{ fontSize: '7px' }}>✦</span>{p.spellCount}
                      </span>
                    )}
                    {!p.eliminated && p.counterCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold text-amber-400" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                        <span style={{ fontSize: '7px' }}>◆</span>{p.counterCount}
                      </span>
                    )}
                    {p.eliminated && !p.banned && <StatusBadge label="DEAD" color="#ef4444" />}
                    {p.eliminated && p.banned && <StatusBadge label="BANNED" color="#ef4444" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Emotes */}
          {floatingEmotes.map(e => (
            <div key={e.id} className="absolute z-40 animate-slide-up pointer-events-none" style={{ top: '20%', left: `${30 + Math.random() * 40}%` }}>
              <div className="bg-dark-800/90 border border-accent-blue/30 rounded-xl px-3 py-2 text-center backdrop-blur-sm" style={{ animation: 'float 2s ease-in-out, fade-out 2.5s ease-out forwards' }}>
                <div className="text-2xl">{e.icon}</div>
                <div className="text-[9px] text-steel-400 font-bold mt-0.5">{e.playerName}</div>
              </div>
            </div>
          ))}

          {/* Turn Animation — enhanced */}
          {turnAnim && (
            <div className="turn-anim-overlay">
              <div className={`turn-anim-container ${turnAnim.phase === 'resolve' ? 'animate-fade-out' : ''}`}>
                {/* Attacker */}
                <div className="anim-fighter-big animate-slam-left">
                  {turnAnim.action.attackerWarrior && (
                    <div className="anim-card-big relative">
                      {/* Energy ring behind attacker */}
                      <div className="anim-energy-ring" style={{ width: '140px', height: '140px', top: '-6px', left: '50%', marginLeft: '-70px', borderColor: `${RARITY_GLOW[turnAnim.action.attackerWarrior.rarity] || '#00b4ff'}40` }} />
                      <img src={assetUrl(turnAnim.action.attackerWarrior.image)} alt=""
                        style={{
                          borderColor: RARITY_GLOW[turnAnim.action.attackerWarrior.rarity] || '#00b4ff',
                          boxShadow: `0 0 30px ${RARITY_GLOW[turnAnim.action.attackerWarrior.rarity] || '#00b4ff'}40, 0 8px 25px rgba(0,0,0,0.4)`,
                          borderWidth: turnAnim.action.attackerWarrior.rarity === 'owner' ? '3px' : '2px',
                          borderStyle: 'solid'
                        }} />
                      <div className="fighter-name text-accent-blue">{turnAnim.action.attackerName}</div>
                      {/* Ability name tag */}
                      {turnAnim.action.attackerWarrior.ability && turnAnim.phase === 'play' && (
                        <div className="anim-ability-name">{turnAnim.action.attackerWarrior.ability.name}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Center content */}
                <div className="anim-center" style={{ minWidth: '120px' }}>
                  {turnAnim.phase === 'play' && <div className="anim-vs-big">VS</div>}

                  {turnAnim.phase === 'spell' && turnAnim.action.spell && (
                    <div className="anim-spell-reveal" style={{ borderColor: `${turnAnim.action.spell.iconColor}30` }}>
                      <SpellIcon icon={turnAnim.action.spell.icon} iconColor={turnAnim.action.spell.iconColor} size="lg" spellId={turnAnim.action.spell.id} />
                      <div className="spell-name-big" style={{ color: turnAnim.action.spell.iconColor }}>{turnAnim.action.spell.name}</div>
                    </div>
                  )}

                  {/* Coin / Dice Roll Animation */}
                  {turnAnim.phase === 'roll' && turnAnim.rollData && (
                    <div className="roll-container">
                      <div className="roll-label">{turnAnim.rollData.label}</div>
                      {turnAnim.rollData.rollType === 'coin' ? (
                        <div className="coin-flip">?</div>
                      ) : (
                        <div className="dice-roll">
                          <span style={{ animation: 'dice-tumble 1s ease-out' }}>?</span>
                        </div>
                      )}
                      <div className="roll-chance">
                        {turnAnim.rollData.rollType === 'coin'
                          ? `${Math.round((turnAnim.rollData.chance || 0.5) * 100)}% шанс`
                          : 'D6 зарче'}
                      </div>
                    </div>
                  )}

                  {/* Roll Result */}
                  {turnAnim.phase === 'roll_result' && turnAnim.rollData && (
                    <div className="roll-container">
                      <div className="roll-label">{turnAnim.rollData.label}</div>
                      {turnAnim.rollData.rollType === 'coin' ? (
                        <div className={`coin-flip ${turnAnim.rollData.success ? 'success' : 'fail'}`}>
                          {turnAnim.rollData.success ? '✓' : '✗'}
                        </div>
                      ) : (
                        <div className="dice-roll" style={{
                          boxShadow: turnAnim.rollData.value >= 4
                            ? '0 0 40px rgba(34, 197, 94, 0.5), 0 6px 20px rgba(0,0,0,0.4)'
                            : turnAnim.rollData.value === 1
                              ? '0 0 40px rgba(239, 68, 68, 0.5), 0 6px 20px rgba(0,0,0,0.4)'
                              : undefined
                        }}>
                          {turnAnim.rollData.value}
                        </div>
                      )}
                      <div className={`roll-result-text ${
                        turnAnim.rollData.rollType === 'coin'
                          ? (turnAnim.rollData.success ? 'success' : 'fail')
                          : (turnAnim.rollData.value >= 4 ? 'success' : turnAnim.rollData.value === 1 ? 'fail' : '')
                      }`}>
                        {turnAnim.rollData.rollType === 'coin'
                          ? (turnAnim.rollData.success ? 'УСПЕХ!' : 'НЕУСПЕХ!')
                          : (turnAnim.rollData.value === 6 ? 'ДЖАКПОТ!' : turnAnim.rollData.value >= 4 ? 'ДОБРО!' : turnAnim.rollData.value === 1 ? 'ПРОМАХ!' : 'НОРМАЛНО')}
                      </div>
                    </div>
                  )}

                  {turnAnim.phase === 'impact' && turnAnim.totalDmg > 0 && (
                    <div className="anim-damage-huge text-red-500">-{turnAnim.totalDmg}</div>
                  )}
                  {turnAnim.phase === 'impact' && turnAnim.totalDmg === 0 && (
                    <div className="anim-miss-big">MISS</div>
                  )}

                  {turnAnim.phase === 'counter_flash' && turnAnim.action.counter && (
                    <div className="anim-counter-reveal">
                      <SpellIcon icon={turnAnim.action.counter.icon} iconColor={turnAnim.action.counter.iconColor} size="lg" spellId={turnAnim.action.counter.id} />
                      <div className="text-sm font-bold" style={{ color: turnAnim.action.counter.iconColor }}>{turnAnim.action.counter.name}</div>
                    </div>
                  )}

                  {turnAnim.phase === 'resolve' && turnAnim.hasElim && !turnAnim.hasBan && (
                    <div className="anim-kill-big">KILL</div>
                  )}
                  {turnAnim.phase === 'resolve' && turnAnim.hasBan && (
                    <div className="anim-kill-big">BANNED</div>
                  )}

                  {/* Roll result badge during impact/counter/resolve */}
                  {turnAnim.rollData && (turnAnim.phase === 'impact' || turnAnim.phase === 'counter_flash') && (
                    <div className="flex items-center gap-2 mt-2 px-2 py-1 rounded-lg" style={{
                      border: `1px solid ${turnAnim.rollData.rollType === 'coin' ? (turnAnim.rollData.success ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)') : 'rgba(251,191,36,0.4)'}`,
                      background: turnAnim.rollData.rollType === 'coin' ? (turnAnim.rollData.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)') : 'rgba(251,191,36,0.1)'
                    }}>
                      <span className="text-lg">{turnAnim.rollData.rollType === 'dice' ? '🎲' : '🪙'}</span>
                      <span className="text-[9px] font-bold" style={{
                        color: turnAnim.rollData.rollType === 'coin' ? (turnAnim.rollData.success ? '#22c55e' : '#ef4444') : '#fbbf24'
                      }}>
                        {turnAnim.rollData.rollType === 'coin'
                          ? (turnAnim.rollData.success ? `${turnAnim.rollData.label} ✓` : `${turnAnim.rollData.label} ✗`)
                          : `${turnAnim.rollData.label}: ${turnAnim.rollData.value}`}
                      </span>
                    </div>
                  )}

                  {/* Spell badge during non-spell phases */}
                  {turnAnim.action.spell && turnAnim.phase !== 'resolve' && turnAnim.phase !== 'spell' && (
                    <div className="anim-spell-badge mt-2" style={{ borderColor: `${turnAnim.action.spell.iconColor}50`, background: `${turnAnim.action.spell.iconColor}15` }}>
                      <SpellIcon icon={turnAnim.action.spell.icon} iconColor={turnAnim.action.spell.iconColor} size="sm" spellId={turnAnim.action.spell.id} />
                      <span className="text-[9px] font-bold ml-1.5" style={{ color: turnAnim.action.spell.iconColor }}>{turnAnim.action.spell.name}</span>
                    </div>
                  )}
                  {/* Counter badge during impact */}
                  {turnAnim.action.counter && turnAnim.phase === 'impact' && (
                    <div className="anim-counter-badge mt-1" style={{ borderColor: `${turnAnim.action.counter.iconColor}50`, background: `${turnAnim.action.counter.iconColor}15` }}>
                      <SpellIcon icon={turnAnim.action.counter.icon} iconColor={turnAnim.action.counter.iconColor} size="sm" spellId={turnAnim.action.counter.id} />
                      <span className="text-[9px] font-bold ml-1.5" style={{ color: turnAnim.action.counter.iconColor }}>{turnAnim.action.counter.name}</span>
                    </div>
                  )}
                </div>

                {/* Target */}
                <div className="anim-fighter-big animate-slam-right">
                  {turnAnim.action.targetWarrior && (
                    <div className="anim-card-big">
                      <img src={assetUrl(turnAnim.action.targetWarrior.image)} alt=""
                        className={turnAnim.phase === 'impact' ? 'animate-shake' : ''}
                        style={{
                          borderColor: turnAnim.phase === 'impact' ? '#ef4444' : 'rgba(239,68,68,0.4)',
                          boxShadow: turnAnim.phase === 'impact' ? '0 0 30px rgba(239,68,68,0.5), 0 8px 25px rgba(0,0,0,0.4)' : '0 0 15px rgba(239,68,68,0.15), 0 8px 25px rgba(0,0,0,0.3)',
                          borderWidth: '2px',
                          borderStyle: 'solid'
                        }} />
                      <div className="fighter-name text-red-400">{turnAnim.action.targetName}</div>
                    </div>
                  )}
                </div>
              </div>
              {turnAnim.phase === 'impact' && turnAnim.totalDmg > 0 && <div className="impact-flash-ring animate-impact-flash" />}
              {turnAnim.phase === 'impact' && turnAnim.totalHeal > 0 && <div className="heal-flash animate-impact-flash" />}
            </div>
          )}
        </div>

        {/* RIGHT: Battle Log — far right edge */}
        <div className="w-64 shrink-0 flex flex-col border-l border-steel-600/10 min-h-0 bg-dark-900/60">
          <div className="px-3 py-2 border-b border-steel-600/10 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <h3 className="text-[10px] text-steel-400 uppercase tracking-widest font-bold">Бойен Лог</h3>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1" ref={logRef}>
            {battleLog.slice(-40).map((entry, i) => (
              <div key={i} className={`log-entry log-${entry.type}`}>
                <span className="text-[10px] leading-tight">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== BOTTOM: ACTION PANEL ===== */}
      {!myState?.eliminated && (
        <div className="shrink-0 border-t border-steel-600/20 bg-gradient-to-t from-dark-900 to-dark-900/90 backdrop-blur-sm">
          {/* Turn indicator + timer bar */}
          <div className="text-center pt-2 pb-1 px-4">
            {isMyTurn && !actionSubmitted ? (
              <div>
                <span className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full font-bold text-xs border"
                  style={{ background: 'rgba(0,180,255,0.08)', borderColor: 'rgba(0,180,255,0.25)', color: '#00b4ff' }}>
                  ТВОЙ ХОД — Избери цел{myState?.silenced ? '' : ' и магия'}
                  <span className={`font-pixel text-[10px] px-1.5 py-0.5 rounded ${turnTimer <= 10 ? 'bg-red-500/20 text-red-400' : 'text-steel-400'}`}>
                    {turnTimer}с
                  </span>
                </span>
                <div className="max-w-xs mx-auto mt-1">
                  <TurnTimerBar seconds={turnTimer} />
                </div>
              </div>
            ) : roundComplete ? (
              <span className="text-steel-500 text-xs font-bold uppercase tracking-wider">Следващ рунд зарежда...</span>
            ) : (
              <span className="text-steel-500 text-xs">
                Ход на: <span className="text-white font-bold">{allPlayers.find(p => p.id === currentTurn)?.name || '...'}</span>
              </span>
            )}
          </div>

          {/* Action row */}
          {isMyTurn && !actionSubmitted ? (
            <div className="pb-3 px-4">
              {/* Top row: ability + counters + submit */}
              <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                {/* Mobile warrior info */}
                {myState?.warrior && (
                  <div className="lg:hidden flex items-center gap-2 bg-dark-800/60 rounded-lg px-2 py-1 border border-steel-600/20">
                    <img src={assetUrl(myState.warrior.image)} alt="" className="w-7 h-7 rounded-full object-cover border border-steel-600/30" />
                    <div>
                      <div className="text-[9px] font-bold text-white">{myState.warrior.name}</div>
                      <div className="text-[8px] text-steel-400">
                        <span className="text-red-400">ATK {myState.warrior.atk}</span>{' '}
                        <span className="text-blue-400">DEF {myState.warrior.def}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ability reminder */}
                {myState?.warrior?.ability && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-help"
                    style={{ background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.15)' }}
                    title={myState.warrior.ability.description}>
                    <span className="text-[7px] text-accent-blue uppercase tracking-wider font-black">Сила</span>
                    <span className="text-[9px] text-white font-bold">{myState.warrior.ability.name}</span>
                  </div>
                )}

                {myState?.silenced && spells.length > 0 && (
                  <StatusBadge label="ЗАГЛУШЕН — БЕЗ МАГИИ" color="#ef4444" />
                )}

                {counters.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <span className="text-[7px] text-amber-400 uppercase tracking-wider font-black">Контри</span>
                    <span className="text-sm text-amber-300 font-bold">{counters.length}</span>
                  </div>
                )}

                {/* Submit button or prompt */}
                {selectedTarget ? (
                  <button className="btn-game btn-primary text-xs px-4 py-1.5 relative" onClick={submitAction}>
                    АТАКУВАЙ {allPlayers.find(p => p.id === selectedTarget)?.name}!
                    {selectedSpell && ` + ${selectedSpell.name}`}
                    <span className="btn-shine" />
                  </button>
                ) : (
                  <span className="text-accent-blue/40 text-[10px] tracking-wider uppercase">Кликни противник за цел</span>
                )}
              </div>

              {/* Bottom row: spell cards — horizontally scrollable */}
              {spells.length > 0 && !myState?.silenced && (
                <div className="flex items-center gap-2 justify-center overflow-x-auto pb-1">
                  <div className="spell-label shrink-0">МАГИЯ</div>
                  {spells.map(s => (
                    <SpellCard key={s.uid} spell={s} selected={selectedSpell?.uid === s.uid}
                      onClick={(sp) => setSelectedSpell(selectedSpell?.uid === sp.uid ? null : sp)} />
                  ))}
                </div>
              )}
            </div>
          ) : actionSubmitted ? (
            <div className="flex items-center justify-center gap-2 py-2.5">
              <div className="w-4 h-4 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
              <span className="text-steel-400 text-xs">Действие изпратено</span>
            </div>
          ) : myState?.warrior ? (
            <div className="flex items-center justify-center gap-2 py-2.5">
              <img src={assetUrl(myState.warrior.image)} alt="" className="w-6 h-6 rounded-full object-cover border border-steel-600/30" />
              <span className="text-[11px] text-steel-500">{myState.warrior.name}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Round Recap */}
      {roundRecap && (
        <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="bg-dark-800/95 border border-accent-blue/30 rounded-2xl p-6 max-w-sm w-full mx-4 animate-slide-up backdrop-blur-sm text-center">
            <div className="text-[9px] text-steel-500 uppercase tracking-widest mb-1">Край на</div>
            <div className="text-2xl font-title text-accent-blue mb-3">РУНД {roundRecap.round}</div>
            <div className="space-y-2 text-sm">
              <div className="text-red-400">Общо щети: <span className="font-bold text-lg">{roundRecap.totalDmg}</span></div>
              {roundRecap.mvp && <div className="text-yellow-400">MVP: <span className="font-bold">{roundRecap.mvp.name}</span> ({roundRecap.mvp.damage} DMG)</div>}
              {roundRecap.eliminations.length > 0 && <div className="text-red-500 font-bold">Елиминирани: {roundRecap.eliminations.join(', ')}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Emote Picker */}
      <div className="fixed bottom-20 left-4 z-40">
        <button className="w-9 h-9 rounded-full bg-dark-800/90 border border-steel-600/20 flex items-center justify-center text-sm hover:border-accent-blue/40 transition-all" onClick={() => setShowEmotes(!showEmotes)}>
          <span className="text-base">💬</span>
        </button>
        {showEmotes && (
          <div className="absolute bottom-12 left-0 bg-dark-800/95 border border-accent-blue/20 rounded-xl p-2 backdrop-blur-sm animate-slide-up grid grid-cols-4 gap-1.5 min-w-[180px]">
            {EMOTES.map(e => (
              <button key={e.id} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-accent-blue/10 transition-colors cursor-pointer" onClick={() => sendEmote(e.id)}>
                <span className="text-xl">{e.icon}</span>
                <span className="text-[8px] text-steel-400">{e.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Turn Results Toast */}
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
