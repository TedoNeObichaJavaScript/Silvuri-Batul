import React from 'react';

// Custom SVG icons for all spells and counters
// Each icon is a functional component that accepts size and color props

const I = ({ d, color, size = 24, stroke = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {stroke ? (
      <path d={d} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d={d} fill={color} />
    )}
  </svg>
);

// ===== SPELL ICONS =====

// Махленска Балтия — Axe
export function IconAxe({ color = '#ff4444', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14 2L6 10l2 2-6 6 2 2 6-6 2 2 8-8-6-6z" fill={color} opacity="0.9" />
      <path d="M14 2l6 6-3 3-6-6 3-3z" fill={color} />
      <path d="M4 20l2 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Акция респект — Shield with star
export function IconShieldStar({ color = '#4488ff', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L4 6v5c0 5.25 3.4 10.15 8 11.4 4.6-1.25 8-6.15 8-11.4V6l-8-4z" fill={color} opacity="0.25" stroke={color} strokeWidth="1.5" />
      <path d="M12 8l1.12 3.45h3.63l-2.93 2.13 1.12 3.45L12 14.9l-2.94 2.13 1.12-3.45-2.93-2.13h3.63L12 8z" fill={color} />
    </svg>
  );
}

// Крадеца на души — Eye / soul
export function IconSoulEye({ color = '#aa44ff', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8z" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" fill={color} opacity="0.6" />
      <circle cx="12" cy="12" r="2" fill={color} />
      <path d="M12 2v2M12 20v2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Умирайте всички — Radiation / explosion
export function IconRadiation({ color = '#ff8800', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" fill={color} />
      <path d="M12 2a10 10 0 0 1 8.66 5L15 12l5.66 5A10 10 0 0 1 12 22a10 10 0 0 1-8.66-5L9 12 3.34 7A10 10 0 0 1 12 2z" fill={color} opacity="0.3" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

// ляв десен — Double fist
export function IconDoubleFist({ color = '#ff6622', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 12l5-5v3h2V7l5 5-5 5v-3h-2v3L4 12z" fill={color} opacity="0.5" />
      <path d="M2 12l4-4 4 4-4 4-4-4z" fill={color} />
      <path d="M14 12l4-4 4 4-4 4-4-4z" fill={color} />
      <path d="M10 12h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// на мъро водата — Poison vial
export function IconPoison({ color = '#44cc66', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 3h6v3l3 4v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8l3-4V3z" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5" />
      <path d="M6 14h12v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-4z" fill={color} opacity="0.5" />
      <circle cx="10" cy="16" r="1" fill={color} />
      <circle cx="14" cy="17" r="0.7" fill={color} />
      <path d="M10 3h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// стоп игра — Ice / freeze hand
export function IconFreeze({ color = '#22ccbb', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2v20M2 12h20" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <circle cx="12" cy="12" r="3" fill={color} opacity="0.3" stroke={color} strokeWidth="1" />
      <circle cx="12" cy="2" r="1.5" fill={color} />
      <circle cx="12" cy="22" r="1.5" fill={color} />
      <circle cx="2" cy="12" r="1.5" fill={color} />
      <circle cx="22" cy="12" r="1.5" fill={color} />
    </svg>
  );
}

// едно за едно — Balance scale / sacrifice
export function IconSacrifice({ color = '#8844cc', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3v18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M5 7h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M3 13l4-6 4 6H3z" fill={color} opacity="0.4" stroke={color} strokeWidth="1" />
      <path d="M13 11l4-4 4 4h-8z" fill={color} opacity="0.7" stroke={color} strokeWidth="1" />
      <path d="M10 21h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// бум — Bomb
export function IconBomb({ color = '#cc2222', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="14" r="7" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5" />
      <path d="M14 7l2-3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M16 2l1 2-2 1" stroke="#ffaa00" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 3l2-1" stroke="#ffaa00" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="14" r="3" fill={color} opacity="0.5" />
    </svg>
  );
}

// играта на дявола — Devil card / execute
export function IconDevil({ color = '#6677aa', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="16" height="18" rx="2" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5" />
      <path d="M8 3l-2-2M16 3l2-2" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="11" r="1.5" fill={color} />
      <circle cx="15" cy="11" r="1.5" fill={color} />
      <path d="M9 16c1.5 1.5 4.5 1.5 6 0" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 7v2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// пепел от рози — Rose / redirect
export function IconRose({ color = '#cc4466', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 22c0-4 3-6 3-10a3 3 0 0 0-6 0c0 4 3 6 3 10z" fill={color} opacity="0.3" />
      <path d="M12 3c-2 2-5 4-5 8a5 5 0 0 0 10 0c0-4-3-6-5-8z" fill={color} opacity="0.5" stroke={color} strokeWidth="1.2" />
      <path d="M12 8c-1 1-2.5 2-2.5 4a2.5 2.5 0 0 0 5 0c0-2-1.5-3-2.5-4z" fill={color} />
      <path d="M12 14v8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 18l2-2 2 2" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

// ===== COUNTER ICONS =====

// поемай — Boomerang / reflect
export function IconReflect({ color = '#00bcd4', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 12C4 7.58 7.58 4 12 4l-3 3h5a6 6 0 0 1 0 12h-2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 19l-3 3v-6l3 3z" fill={color} />
      <path d="M14 9l3-3v6l-3-3z" fill={color} />
    </svg>
  );
}

// фиууу — Wind / dodge
export function IconWind({ color = '#b0bec5', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 8h10a3 3 0 1 0-3-3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M3 12h14a3 3 0 1 1-3 3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M3 16h6a2 2 0 1 0-2-2" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

// няма такива — X cancel / negate
export function IconNegate({ color = '#ff3333', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill={color} opacity="0.15" stroke={color} strokeWidth="2" />
      <path d="M8 8l8 8M16 8l-8 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// почерпка — Mug / absorb
export function IconAbsorb({ color = '#4caf50', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 6h11v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6z" fill={color} opacity="0.25" stroke={color} strokeWidth="1.5" />
      <path d="M5 10h11" stroke={color} strokeWidth="1" opacity="0.4" />
      <path d="M16 9h2a2 2 0 0 1 0 4h-2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 6V4M10.5 6V3M13 6V4" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <path d="M5 10h11v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-6z" fill={color} opacity="0.35" />
    </svg>
  );
}

// всичко се връща — Cycle / vengeance
export function IconVengeance({ color = '#9c27b0', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M21 12a9 9 0 0 1-15.36 6.36" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M3 12A9 9 0 0 1 18.36 5.64" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M16 2l3 4-4 1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 22l-3-4 4-1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2" fill={color} opacity="0.5" />
    </svg>
  );
}

// един за всички — Lightning bolt
export function IconLightning({ color = '#ff9800', size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14h7l-2 8 11-12h-7l2-8z" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M13 2L4 14h7l-2 8 11-12h-7l2-8z" fill={color} opacity="0.6" />
    </svg>
  );
}

// Map spell/counter IDs to their icon components
const SPELL_ICON_MAP = {
  mahlenska_baltia: IconAxe,
  akcia_respekt: IconShieldStar,
  kradeca_na_dushi: IconSoulEye,
  umirajte_vsichki: IconRadiation,
  lqv_desen: IconDoubleFist,
  na_muro_vodata: IconPoison,
  stop_igra: IconFreeze,
  edno_za_edno: IconSacrifice,
  bum: IconBomb,
  igrata_na_dyavola: IconDevil,
  pepel_ot_rozi: IconRose,
  // Counters
  poemaj: IconReflect,
  fiuuu: IconWind,
  nyama_takiva: IconNegate,
  pocherpka: IconAbsorb,
  vsichko_se_vrushta: IconVengeance,
  edin_za_vsichki: IconLightning,
};

export function getSpellIcon(spellId) {
  return SPELL_ICON_MAP[spellId] || null;
}

export default SPELL_ICON_MAP;
