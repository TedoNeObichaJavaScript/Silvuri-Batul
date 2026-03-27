import React from 'react';
import Card from './Card';
import { SFX } from '../utils/sounds';
import { assetUrl } from '../utils/assetUrl';

export default function Draft({
  socket, playerId, draftRolls, draftOrder,
  currentPicker, setCurrentPicker, draftOptions, battleLog, lastDraftPick, onError
}) {
  const isMyTurn = currentPicker === playerId;
  const pickerPlayer = draftOrder.find(p => p.id === currentPicker);

  const pickWarrior = (card) => {
    if (!isMyTurn) return onError('Не е твой ред!');
    SFX.cardPick();
    socket.emit('draft_pick', { warriorId: card.id }, (res) => {
      if (res.error) return onError(res.error);
    });
  };

  return (
    <div className="px-4 py-4 animate-slide-up relative">
      {/* ===== PICK REVEAL OVERLAY ===== */}
      {lastDraftPick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="flex flex-col items-center animate-card-enter" style={{ filter: 'drop-shadow(0 0 30px rgba(0, 180, 255, 0.5))' }}>
            <Card card={lastDraftPick.warrior} />
            <div className="mt-3 text-center animate-slide-up">
              <span className="text-lg font-title text-accent-blue">{lastDraftPick.pickedByName}</span>
              <span className="text-steel-400 text-sm ml-2">избира</span>
              <span className="text-lg font-bold text-white ml-2">{lastDraftPick.warrior.name}!</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-title text-accent-blue mb-2">PENTAD SELECTION</h2>
        <p className="text-steel-400 text-sm mb-4">Избери своя силвър от 5-те предложени</p>

        <div className={`inline-block px-6 py-2 rounded-full text-lg font-bold ${
          isMyTurn
            ? 'bg-accent-blue/20 text-accent-blue animate-glow-pulse border border-accent-blue/40'
            : 'bg-dark-700 text-steel-400 border border-steel-600/30'
        }`}>
          {isMyTurn ? 'ТВОЙ РЕД! Избери силвър!' : `${pickerPlayer?.name || '...'} избира...`}
        </div>
      </div>

      {/* Initiative Rolls */}
      {draftRolls.length > 0 && (
        <div className="mb-6 bg-dark-800 border border-steel-600/20 rounded-xl p-4 max-w-md mx-auto">
          <h3 className="text-xs text-steel-400 uppercase tracking-wider mb-2 text-center">Ред на Избор (d20)</h3>
          <div className="space-y-1">
            {draftRolls.map((r, i) => (
              <div key={r.id} className={`flex items-center justify-between px-3 py-1.5 rounded ${
                r.id === currentPicker ? 'bg-accent-blue/10 text-accent-blue' : 'text-steel-400'
              }`}>
                <span className="text-sm font-bold">#{i + 1} {r.name}</span>
                <span className="text-xs font-pixel">d20: {r.roll}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warrior Options */}
      {isMyTurn && draftOptions.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm text-steel-400 mb-3 uppercase tracking-wider text-center">Твоите 5 Силвъра</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {draftOptions.map(card => (
              <Card key={card.id} card={card} onClick={pickWarrior} />
            ))}
          </div>
        </div>
      )}

      {/* Waiting message */}
      {!isMyTurn && !lastDraftPick && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-10 h-10 border-4 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          <p className="text-steel-400">Чакаме {pickerPlayer?.name || '...'} да избере...</p>
        </div>
      )}

      {/* Battle Log (draft picks) */}
      {battleLog.length > 0 && (
        <div className="mt-6 battle-log max-w-md mx-auto">
          <h3 className="text-xs text-steel-400 uppercase tracking-wider mb-2">Лог</h3>
          {battleLog.map((entry, i) => (
            <div key={i} className={`log-entry log-${entry.type}`}>
              <span>{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
