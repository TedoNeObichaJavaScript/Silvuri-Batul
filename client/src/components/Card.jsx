import React from 'react';

const RARITY_COLORS = {
  common: '#b0b0b0',
  rare: '#4a90d9',
  epic: '#a855f7',
  legendary: '#f59e0b'
};

const RARITY_NAMES = {
  common: 'Обикновена',
  rare: 'Рядка',
  epic: 'Епична',
  legendary: 'Легендарна'
};

export default function Card({ card, onClick, selected, disabled, small }) {
  if (!card) return null;
  const rc = RARITY_COLORS[card.rarity] || '#fff';

  return (
    <div
      className={`game-card animate-card-enter ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${small ? 'card-sm' : ''}`}
      style={{ '--rarity-color': rc }}
      onClick={() => !disabled && onClick?.(card)}
    >
      {/* Rarity top bar */}
      <div
        className="card-rarity-bar"
        style={{ background: `linear-gradient(90deg, transparent, ${rc}, transparent)` }}
      >
        {RARITY_NAMES[card.rarity]}
      </div>

      {/* Image */}
      <div className="card-img-wrap">
        <img src={card.image} alt={card.name} loading="lazy" />
      </div>

      {/* Name */}
      <div className="px-2 py-1 text-center">
        <h3 className="text-sm font-bold truncate" style={{ color: rc }}>{card.name}</h3>
        <p className="text-[10px] text-gray-500 italic truncate">{card.title}</p>
      </div>

      {/* Stats */}
      <div className="card-stats-row">
        <span className="stat-atk">⚔️ {card.atk}</span>
        <span className="stat-def">🛡️ {card.def}</span>
        <span className="stat-spd">⚡ {card.spd}</span>
      </div>

      {/* Ability */}
      <div className="card-ability-box">
        <span className="ability-name">{card.ability?.name}</span>
        <p className="ability-desc">{card.ability?.description}</p>
      </div>
    </div>
  );
}
