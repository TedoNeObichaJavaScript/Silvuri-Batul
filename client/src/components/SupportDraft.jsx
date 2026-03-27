import React, { useState } from 'react';
import { SFX } from '../utils/sounds';
import { assetUrl } from '../utils/assetUrl';

export default function SupportDraft({ socket, playerId, supportCards, supportPicks, battleLog, onError }) {
  const [picked, setPicked] = useState(false);

  const pickSupport = (card) => {
    if (picked) return;
    SFX.cardPick();
    socket.emit('support_pick', { supportId: card.id }, (res) => {
      if (res?.error) return onError(res.error);
      setPicked(true);
    });
  };

  const myPick = supportPicks[playerId];

  return (
    <div className="px-4 py-4 animate-slide-up">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-title text-accent-blue mb-2">SUPPORT SELECTION</h2>
        <p className="text-steel-400 text-sm mb-4">Избери саппорт карта, която ще те придружава в битката</p>

        {picked ? (
          <div className="inline-block px-6 py-2 rounded-full text-lg font-bold bg-green-600/20 text-green-400 border border-green-500/40">
            Избра: {myPick?.card?.name || '...'}! Чакаме останалите...
          </div>
        ) : (
          <div className="inline-block px-6 py-2 rounded-full text-lg font-bold bg-accent-blue/20 text-accent-blue animate-glow-pulse border border-accent-blue/40">
            Избери саппорт карта!
          </div>
        )}
      </div>

      {/* Support Card Options */}
      {!picked && supportCards.length > 0 && (
        <div className="flex flex-wrap gap-6 justify-center mb-8">
          {supportCards.map(card => (
            <div
              key={card.id}
              onClick={() => pickSupport(card)}
              className="support-card group cursor-pointer bg-dark-800 border-2 border-steel-600/30 rounded-2xl p-3 w-48 text-center transition-all duration-200 hover:border-accent-blue/60 hover:shadow-lg hover:shadow-accent-blue/20 hover:scale-105"
            >
              <div className="w-full h-40 rounded-lg overflow-hidden mb-3">
                <img src={assetUrl(card.image)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <h3 className="text-base font-bold text-accent-blue mb-1">{card.name}</h3>
              <p className="text-[10px] text-steel-400 italic mb-2">{card.title}</p>
              <p className="text-xs text-steel-300 leading-snug">{card.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Who has picked */}
      {Object.keys(supportPicks).length > 0 && (
        <div className="max-w-md mx-auto bg-dark-800 border border-steel-600/20 rounded-xl p-4 mb-6">
          <h3 className="text-xs text-steel-400 uppercase tracking-wider mb-2 text-center">Избрали саппорт</h3>
          <div className="space-y-1">
            {Object.entries(supportPicks).map(([pid, info]) => (
              <div key={pid} className="flex items-center justify-between px-3 py-1.5 rounded bg-green-600/10 text-green-400">
                <span className="text-sm font-bold">{info.name}</span>
                <span className="text-xs">{info.card.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Battle Log */}
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
