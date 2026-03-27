import React, { memo } from 'react';

const RARITY_COLORS = {
  common: '#8a9bb0',
  rare: '#3b82f6',
  epic: '#8b5cf6',
  legendary: '#f59e0b',
  secret: '#dc2626',
  cosmic: '#ff00ff',
  owner: '#ff0000'
};

const RARITY_NAMES = {
  common: 'Обикновена',
  rare: 'Рядка',
  epic: 'Епична',
  legendary: 'Легендарна',
  secret: 'Тайна',
  cosmic: 'Космическа',
  owner: 'Собственик'
};

// Styled icon component — renders icon symbol inside a colored glowing container
export const SpellIcon = memo(function SpellIcon({ icon, iconColor, size = 'md' }) {
  const sizes = {
    sm: { wrapper: 'w-7 h-7', font: 'text-sm' },
    md: { wrapper: 'w-9 h-9', font: 'text-lg' },
    lg: { wrapper: 'w-12 h-12', font: 'text-2xl' },
  };
  const s = sizes[size] || sizes.md;
  const color = iconColor || '#3b82f6';

  return (
    <div
      className={`spell-icon ${s.wrapper}`}
      style={{
        '--icon-color': color,
        borderColor: color,
        background: `radial-gradient(circle at center, ${color}20 0%, transparent 70%)`,
        boxShadow: `0 0 12px ${color}44, inset 0 0 8px ${color}22`,
      }}
    >
      <span className={s.font} style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}>
        {icon}
      </span>
    </div>
  );
});

const Card = memo(function Card({ card, onClick, selected, disabled, small }) {
  if (!card) return null;
  const rc = RARITY_COLORS[card.rarity] || '#8a9bb0';

  return (
    <div
      className={`game-card animate-card-enter ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${small ? 'card-sm' : ''} rarity-${card.rarity}`}
      style={{ '--rarity-color': rc }}
      onClick={() => !disabled && onClick?.(card)}
    >
      {/* Owner rarity animated border overlay */}
      {card.rarity === 'owner' && <div className="owner-border-glow" />}

      <div
        className="card-rarity-bar"
        style={{ background: card.rarity === 'owner'
          ? 'linear-gradient(90deg, #ff0000, #ff7700, #ffff00, #00ff00, #0077ff, #8800ff, #ff0088)'
          : `linear-gradient(90deg, transparent, ${rc}, transparent)`
        }}
      >
        {RARITY_NAMES[card.rarity]}
      </div>

      <div className="card-img-wrap">
        <img src={card.image} alt={card.name} loading="lazy" />
      </div>

      <div className="px-2 py-1 text-center">
        <h3 className="text-sm font-bold leading-tight" style={{ color: rc }}>{card.name}</h3>
        <p className="text-[10px] text-steel-400 italic leading-tight">{card.title}</p>
      </div>

      <div className="card-stats-row">
        <span className="stat-atk">ATK {card.atk}</span>
        <span className="stat-def">DEF {card.def}</span>
      </div>

      <div className="card-ability-box">
        <span className="ability-name">{card.ability?.name}</span>
        <p className="ability-desc">{card.ability?.description}</p>
      </div>
    </div>
  );
});

export default Card;

export const SpellCard = memo(function SpellCard({ spell, onClick, selected, disabled, isCounter }) {
  if (!spell) return null;
  const color = spell.iconColor || (isCounter ? '#f59e0b' : '#3b82f6');

  return (
    <div
      className={`spell-card ${isCounter ? 'counter-type' : ''} ${selected ? 'selected' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      style={{
        borderColor: selected ? color : `${color}50`,
        boxShadow: selected ? `0 0 20px ${color}66` : 'none',
      }}
      onClick={() => !disabled && onClick?.(spell)}
    >
      <SpellIcon icon={spell.icon} iconColor={color} size="md" />
      <div className="text-[11px] font-bold text-white truncate mt-1">{spell.name}</div>
      <div className="text-[9px] text-steel-400 leading-tight mt-1">{spell.description}</div>
    </div>
  );
});
