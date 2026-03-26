// Silvuri Batul - Card Definitions
// Warriors (19), Spell Cards (12), Counter Cards (6)

const WARRIORS = [
  // ===== COMMON (5) =====
  {
    id: 'marinimabuzkut', name: 'Марин има Бъзкът', title: 'Фризьорският Майстор',
    image: '/images/cards/marinimabuzkut.png', rarity: 'common',
    atk: 5, def: 5, spd: 5,
    ability: { name: 'Фризьорски Удар', description: 'Премахва всички бафове от противника.', type: 'purge' }
  },
  {
    id: 'borkosbira', name: 'Борко с Бира', title: 'Пияният Берсеркер',
    image: '/images/cards/borkosbira.jpg', rarity: 'common',
    atk: 8, def: 2, spd: 4,
    ability: { name: 'Пиян Размах', description: '70% двойни щети, 30% промах.', type: 'drunk_swing', hitChance: 0.7, multiplier: 2 }
  },
  {
    id: 'naborkozatvora', name: 'На Борко Затвора', title: 'Вратарят на Затвора',
    image: '/images/cards/naborkozatvora.jpg', rarity: 'common',
    atk: 4, def: 8, spd: 3,
    ability: { name: 'Зад Решетките', description: 'Целта пропуска следващия си ход.', type: 'lock' }
  },
  {
    id: 'marinchad', name: 'Марин Чад', title: 'Алфа Доминаторът',
    image: '/images/cards/marinchad.jpg', rarity: 'common',
    atk: 6, def: 5, spd: 5,
    ability: { name: 'Чад Аура', description: 'Намалява ATK на целта с 3 за 1 рунд.', type: 'aura_debuff', debuffValue: 3 }
  },
  {
    id: 'polkovnikviki', name: 'Полковник Вики', title: 'Нощният Командир',
    image: '/images/cards/polkovnikviki.jpg', rarity: 'common',
    atk: 6, def: 6, spd: 4,
    ability: { name: 'Военна Стратегия', description: '+3 ATK и +3 DEF за следващия рунд.', type: 'buff_next', buffAtk: 3, buffDef: 3 }
  },

  // ===== RARE (5) =====
  {
    id: 'antoniopie', name: 'Антонио Пие', title: 'Вечният Купонджия',
    image: '/images/cards/antoniopie.png', rarity: 'rare',
    atk: 5, def: 4, spd: 7,
    ability: { name: 'На Здраве!', description: 'Лекува 5 HP и +2 ATK следващ ход.', type: 'heal_and_buff', healValue: 5, buffValue: 2 }
  },
  {
    id: 'borkoskotka', name: 'Борко с Котка', title: 'Котешкият Господар',
    image: '/images/cards/borkoskotka.png', rarity: 'rare',
    atk: 4, def: 7, spd: 6,
    ability: { name: 'Котешки Щит', description: 'Блокира напълно следващата атака.', type: 'full_block' }
  },
  {
    id: 'sashkoscigari', name: 'Сашко с Цигари', title: 'Димната Завеса',
    image: '/images/cards/sashkoscigari.png', rarity: 'rare',
    atk: 6, def: 3, spd: 8,
    ability: { name: 'Димна Завеса', description: 'Атакуващият те има 40% промах.', type: 'smoke_screen', missChance: 0.4 }
  },
  {
    id: 'marinkatadavaL', name: 'Маринката дава L', title: 'Раздавачът на Загуби',
    image: '/images/cards/marinkatadavaL.png', rarity: 'rare',
    atk: 6, def: 4, spd: 7,
    ability: { name: 'L за Теб', description: 'Зашеметява целта за 1 рунд.', type: 'stun' }
  },
  {
    id: 'borkodqdokoleda', name: 'Борко Дядо Коледа', title: 'Празничният Хаос',
    image: '/images/cards/borkodqdokoleda.png', rarity: 'rare',
    atk: 6, def: 5, spd: 5,
    ability: { name: 'Коледен Подарък', description: '50/50: +8 щети ИЛИ лекува 8 HP.', type: 'random_gift', value: 8 }
  },

  // ===== EPIC (4) =====
  {
    id: 'antoniopashata', name: 'Антонио Пашата', title: 'Огледалният Воин',
    image: '/images/cards/antoniopashata.png', rarity: 'epic',
    atk: 7, def: 5, spd: 6,
    ability: { name: 'Огледален Удар', description: 'Връща 50% от получените щети.', type: 'reflect', value: 0.5 }
  },
  {
    id: 'skultrupara', name: 'Скул Трупара', title: 'Жътварят на Души',
    image: '/images/cards/skultrupara.jpg', rarity: 'epic',
    atk: 9, def: 3, spd: 6,
    ability: { name: 'Жътва', description: 'При елиминация на целта, лекува 10 HP.', type: 'reap', healOnKill: 10 }
  },
  {
    id: 'teodorkapone', name: 'Теодор Капоне', title: 'Мафиотският Бос',
    image: '/images/cards/teodorkapone.jpg', rarity: 'epic',
    atk: 7, def: 5, spd: 6,
    ability: { name: 'Мафиотски Удар', description: 'Щети + 50% на случаен друг играч.', type: 'splash', splashMultiplier: 0.5 }
  },
  {
    id: 'pavlinzalaga', name: 'Павлин Залага', title: 'Високият Залог',
    image: '/images/cards/pavlinzalaga.jpg', rarity: 'epic',
    atk: 6, def: 5, spd: 6,
    ability: { name: 'Голям Залог', description: '50/50: двойни щети ИЛИ лекува противника.', type: 'gamble', chance: 0.5 }
  },

  // ===== LEGENDARY (2) =====
  {
    id: 'bezkuchki', name: 'Без Кучки', title: 'Тихият Хакер',
    image: '/images/cards/bezkuchki.png', rarity: 'legendary',
    atk: 6, def: 7, spd: 5,
    ability: { name: 'Хакерска Атака', description: 'Копира способността на противника.', type: 'copy_ability' }
  },
  {
    id: 'calofdutigrost', name: 'Call of Duty Грост', title: 'Призракът Снайперист',
    image: '/images/cards/calofdutigrost.png', rarity: 'legendary',
    atk: 9, def: 2, spd: 9,
    ability: { name: '360 No Scope', description: 'Най-висока инициатива = тройни щети.', type: 'speed_kill', multiplier: 3 }
  },

  // ===== SECRET (2) — ~5% chance to appear in draft =====
  {
    id: 'marinskvidgeima', name: 'Марин Сквид Гейм', title: 'Играч 067',
    image: '/images/cards/marinskvidgeima.jpg', rarity: 'secret',
    atk: 8, def: 5, spd: 7,
    ability: { name: 'Последен Шанс', description: 'Под 50% HP: +6 ATK. Под 25%: +12 ATK.', type: 'desperation', thresholds: [{ percent: 0.5, bonus: 6 }, { percent: 0.25, bonus: 12 }] }
  },
  {
    id: 'antoniosriba', name: 'Антонио с Риба', title: 'Рибарят на Съдбата',
    image: '/images/cards/antoniosriba.png', rarity: 'secret',
    atk: 7, def: 6, spd: 7,
    ability: { name: 'Рибен Капан', description: 'Краде случайна spell карта от целта.', type: 'spell_steal' }
  },

  // ===== COSMIC (1) — ~2% chance, 3 effects =====
  {
    id: 'sashkoebit', name: 'Сашко Елементалът', title: 'Космическият Страж',
    image: '/images/cards/sashkoebit.png', rarity: 'cosmic',
    atk: 7, def: 6, spd: 6,
    ability: {
      name: 'Космическа Троица',
      description: 'Краде 3 HP | Щит -3 щети | Всеки 2 рунда: 3 AoE.',
      type: 'cosmic_triple',
      effects: [
        { type: 'drain', value: 3 },
        { type: 'shield', value: 3 },
        { type: 'burst', value: 3, interval: 2 }
      ]
    }
  }
];

// ===== SPELL CARDS (12) =====
const SPELLS = [
  { id: 'phantom_strike', name: 'Фантомен Удар', description: '+6 ATK за тази атака.', type: 'atk_boost', value: 6, icon: '👻' },
  { id: 'steel_will', name: 'Стоманена Воля', description: '+6 DEF за този рунд.', type: 'def_boost', value: 6, icon: '🛡️' },
  { id: 'shadow_leap', name: 'Сенчест Скок', description: '+6 SPD за инициативата.', type: 'spd_boost', value: 6, icon: '🌑' },
  { id: 'soul_steal', name: 'Кражба на Душа', description: 'Лекува 8 HP.', type: 'heal', value: 8, icon: '💜' },
  { id: 'cascade_fire', name: 'Каскаден Огън', description: '4 щети на ВСИЧКИ врагове.', type: 'aoe_damage', value: 4, chain: true, icon: '🔥' },
  { id: 'twin_strike', name: 'Двоен Удар', description: 'Атаката удря два пъти.', type: 'double_hit', icon: '⚔️' },
  { id: 'venom_blade', name: 'Отровен Нож', description: '3 отрова за 2 рунда.', type: 'poison', value: 3, duration: 2, icon: '🗡️' },
  { id: 'frost_chain', name: 'Ледена Верига', description: 'Замразява целта + 1 случаен враг.', type: 'freeze_chain', chain: true, icon: '❄️' },
  { id: 'dark_pact', name: 'Тъмен Пакт', description: '-5 HP, +10 ATK.', type: 'sacrifice', hpCost: 5, atkBonus: 10, icon: '🩸' },
  { id: 'thunder_storm', name: 'Мълниена Буря', description: '50% шанс стън на всеки враг.', type: 'mass_stun', chance: 0.5, chain: true, icon: '⛈️' },
  { id: 'blood_ritual', name: 'Кървав Ритуал', description: 'Цел под 50% HP: +8 щети.', type: 'execute', threshold: 0.5, bonusDmg: 8, icon: '🩸' },
  { id: 'portal', name: 'Портал', description: 'Пренасочва щетите към случаен враг.', type: 'redirect', icon: '🌀' }
];

// ===== COUNTER CARDS (6) =====
const COUNTERS = [
  { id: 'mirror_wall', name: 'Огледална Стена', description: 'Отразява 75% щети обратно.', type: 'reflect', value: 0.75, icon: '🪞' },
  { id: 'phase_shift', name: 'Фазово Изместване', description: '80% шанс за пълен dodge.', type: 'dodge', chance: 0.8, icon: '💨' },
  { id: 'null_zone', name: 'Нулева Зона', description: 'Анулира spell-а на атакуващия.', type: 'spell_negate', icon: '🚫' },
  { id: 'absorption', name: 'Абсорбция', description: 'Превръща до 10 щети в HP.', type: 'absorb', maxAbsorb: 10, icon: '💚' },
  { id: 'vengeful_strike', name: 'Мъстителен Удар', description: 'Получаваш щети, но връщаш двойно.', type: 'vengeance', multiplier: 2, icon: '⚡' },
  { id: 'chain_reaction', name: 'Верижна Реакция', description: 'При 5+ щети: 5 на всички врагове.', type: 'chain_react', threshold: 5, damage: 5, chain: true, icon: '💥' }
];

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

// Rarity weights for draft appearance
const RARITY_WEIGHTS = {
  common: 35,
  rare: 28,
  epic: 20,
  legendary: 10,
  secret: 5,
  cosmic: 2
};

function getWeightedRarity() {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return 'common';
}

function generateDraftOptions(takenIds, count = 5) {
  const available = WARRIORS.filter(w => !takenIds.has(w.id));
  if (available.length <= count) return available;

  const options = [];
  const usedIds = new Set();

  for (let i = 0; i < count; i++) {
    let rarity = getWeightedRarity();
    let pool = available.filter(w => w.rarity === rarity && !usedIds.has(w.id));

    // Fallback: try adjacent rarities
    if (pool.length === 0) {
      pool = available.filter(w => !usedIds.has(w.id));
    }
    if (pool.length === 0) break;

    const pick = pool[Math.floor(Math.random() * pool.length)];
    options.push(pick);
    usedIds.add(pick.id);
  }

  return options;
}

function dealSpells(count = 3) {
  const hand = [];
  for (let i = 0; i < count; i++) {
    hand.push({ ...SPELLS[Math.floor(Math.random() * SPELLS.length)], uid: `spell_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}` });
  }
  return hand;
}

function dealCounters(count = 2) {
  const hand = [];
  for (let i = 0; i < count; i++) {
    hand.push({ ...COUNTERS[Math.floor(Math.random() * COUNTERS.length)], uid: `counter_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}` });
  }
  return hand;
}

module.exports = { WARRIORS, SPELLS, COUNTERS, RARITY_COLORS, RARITY_NAMES, RARITY_WEIGHTS, generateDraftOptions, dealSpells, dealCounters };
