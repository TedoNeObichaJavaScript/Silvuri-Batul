import React from 'react';

const RARITY_COLORS = {
  common: '#8a9bb0',
  rare: '#3b82f6',
  epic: '#8b5cf6',
  legendary: '#f59e0b',
  secret: '#dc2626',
  cosmic: '#ff00ff'
};

const RARITY_NAMES = {
  common: 'Обикновена',
  rare: 'Рядка',
  epic: 'Епична',
  legendary: 'Легендарна',
  secret: 'Тайна',
  cosmic: 'Космическа'
};

export default function Card({ card, onClick, selected, disabled, small }) {
  if (!card) return null;
  const rc = RARITY_COLORS[card.rarity] || '#8a9bb0';

  return (
    <div
      className={`game-card animate-card-enter ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${small ? 'card-sm' : ''} rarity-${card.rarity}`}
      style={{ '--rarity-color': rc }}
      onClick={() => !disabled && onClick?.(card)}
    >
      <div
        className="card-rarity-bar"
        style={{ background: `linear-gradient(90deg, transparent, ${rc}, transparent)` }}
      >
        {RARITY_NAMES[card.rarity]}
      </div>

      <div className="card-img-wrap">
        <img src={card.image} alt={card.name} loading="lazy" />
      </div>

      <div className="px-2 py-1 text-center">
        <h3 className="text-sm font-bold truncate" style={{ color: rc }}>{card.name}</h3>
        <p className="text-[10px] text-steel-400 italic truncate">{card.title}</p>
      </div>

      <div className="card-stats-row">
        <span className="stat-atk">ATK {card.atk}</span>
        <span className="stat-def">DEF {card.def}</span>
        <span className="stat-spd">SPD {card.spd}</span>
      </div>

      <div className="card-ability-box">
        <span className="ability-name">{card.ability?.name}</span>
        <p className="ability-desc">{card.ability?.description}</p>
      </div>
    </div>
  );
}

export function SpellCard({ spell, onClick, selected, disabled, isCounter }) {
  if (!spell) return null;
  return (
    <div
      className={`spell-card ${isCounter ? 'counter-type' : ''} ${selected ? 'selected' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      onClick={() => !disabled && onClick?.(spell)}
    >
      <div className="text-2xl mb-1">{spell.icon}</div>
      <div className="text-[11px] font-bold text-white truncate">{spell.name}</div>
      <div className="text-[9px] text-steel-400 leading-tight mt-1">{spell.description}</div>
    </div>
  );
}
