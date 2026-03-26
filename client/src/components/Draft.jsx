import React from 'react';
import Card from './Card';

export default function Draft({
  socket, playerId, draftPool, hand, currentPicker,
  draftOrder, cardsPerPlayer, players, onError
}) {
  const isMyTurn = currentPicker === playerId;
  const pickerPlayer = draftOrder.find(p => p.id === currentPicker);
  const pickerName = pickerPlayer?.name || '';

  const pickCard = (card) => {
    if (!isMyTurn) return onError('Не е твой ред!');
    socket.emit('draft_pick', { cardId: card.id }, (res) => {
      if (res.error) return onError(res.error);
    });
  };

  return (
    <div className="px-4 py-2 animate-slide-up">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-title text-purple-300 mb-2">
          🎴 ДРАФТ ФАЗА
        </h2>
        <div className={`inline-block px-6 py-2 rounded-full text-lg font-bold ${isMyTurn ? 'bg-green-600/30 text-green-300 animate-glow-pulse border border-green-500/40' : 'bg-dark-700 text-gray-400 border border-gray-700'}`}>
          {isMyTurn ? '🟢 ТВОЙ РЕД! Избери карта!' : `⏳ ${pickerName} избира...`}
        </div>
        <p className="text-sm text-gray-500 mt-2">Карти в ръка: {hand.length}/{cardsPerPlayer}</p>
      </div>

      {/* Draft Pool */}
      <div className="mb-8">
        <h3 className="text-sm text-gray-400 mb-3 uppercase tracking-wider">Налични Карти</h3>
        <div className="flex flex-wrap gap-4 justify-center">
          {draftPool.map(card => (
            <Card key={card.id} card={card} onClick={pickCard} disabled={!isMyTurn} small />
          ))}
        </div>
      </div>

      {/* Your Hand */}
      {hand.length > 0 && (
        <div className="border-t border-purple-500/20 pt-6">
          <h3 className="text-sm text-gray-400 mb-3 uppercase tracking-wider">Твоята Ръка</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {hand.map(card => (
              <Card key={card.id} card={card} small />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
