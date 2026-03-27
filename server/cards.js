// Silvuri Batul - Card Definitions
// Warriors (25), Spell Cards (11), Counter Cards (6)

const WARRIORS = [
  // ===== COMMON (8) =====
  {
    id: 'marinimabuzkut', name: 'Марин с Бъзкът', title: 'Барбершопа',
    image: '/images/cards/marinimabuzkut.png', rarity: 'common',
    atk: 6, def: 5,
    ability: { name: 'Фризьорски Удар', description: 'Премахва всички бафове от противника и нанася +3 бонус щети.', type: 'purge', bonusDmg: 3 }
  },
  {
    id: 'borkosbira', name: 'Борко с Бира', title: 'Пияният Берсеркер',
    image: '/images/cards/borkosbira.jpg', rarity: 'common',
    atk: 8, def: 2,
    ability: { name: 'Пиян Размах', description: '70% двойни щети, 30% промах.', type: 'drunk_swing', hitChance: 0.7, multiplier: 2 }
  },
  {
    id: 'naborkozatvora', name: 'На Борко Затвора', title: 'Вратарят на Затвора',
    image: '/images/cards/naborkozatvora.jpg', rarity: 'common',
    atk: 4, def: 8,
    ability: { name: 'Зад Решетките', description: 'Целта пропуска следващия си ход.', type: 'lock' }
  },
  {
    id: 'marinchad', name: 'Марин Чад', title: 'Силвърската Алфа',
    image: '/images/cards/marinchad.jpg', rarity: 'common',
    atk: 6, def: 5,
    ability: { name: 'Чад Аура', description: 'Намалява ATK на целта с 3 за 1 рунд.', type: 'aura_debuff', debuffValue: 3 }
  },
  {
    id: 'polkovnikviki', name: 'Полковник Вики', title: 'Тъмната Алфа',
    image: '/images/cards/polkovnikviki.jpg', rarity: 'common',
    atk: 6, def: 6,
    ability: { name: 'Военна Стратегия', description: '+3 ATK и +3 DEF за следващия рунд.', type: 'buff_next', buffAtk: 3, buffDef: 3 }
  },
  {
    id: 'borkopotvurjdava', name: 'Борко Потвърждава', title: 'Гарантираният Удар',
    image: '/images/cards/borkopotvurjdava.png', rarity: 'common',
    atk: 6, def: 6,
    ability: { name: 'Потвърдено', description: 'Винаги нанася минимум 5 щети, независимо от DEF.', type: 'guaranteed_dmg', minDamage: 5 }
  },
  {
    id: 'vikislusha', name: 'Вики Слуша', title: 'Подслушвачката',
    image: '/images/cards/vikislusha.png', rarity: 'common',
    atk: 5, def: 7,
    ability: { name: 'Подслушване', description: 'Краде 1 случайна контра от противника и нанася +2 бонус щети.', type: 'counter_steal', bonusDmg: 2 }
  },
  {
    id: 'pavlinsublaznitelniq', name: 'Павлин Съблазнителния', title: 'Чарът на Карнобат',
    image: '/images/cards/pavlinsublaznitelniq.jpg', rarity: 'common',
    atk: 6, def: 5,
    ability: { name: 'Чар', description: '40% шанс целта да удари себе си за половин щети.', type: 'charm', chance: 0.40 }
  },

  // ===== RARE (8) =====
  {
    id: 'antoniopie', name: 'Антонио Пие', title: 'Шефа на чашата',
    image: '/images/cards/antoniopie.png', rarity: 'rare',
    atk: 5, def: 4,
    ability: { name: 'На Здраве!', description: 'Лекува 5 HP и +2 ATK следващ ход.', type: 'heal_and_buff', healValue: 5, buffValue: 2 }
  },
  {
    id: 'borkoskotka', name: 'Борко с Котка', title: 'Котешкият Господар',
    image: '/images/cards/borkoskotka.png', rarity: 'rare',
    atk: 4, def: 7,
    ability: { name: 'Котешки Щит', description: 'Блокира напълно следващата атака.', type: 'full_block' }
  },
  {
    id: 'sashkoscigari', name: 'Сашко с Цигари', title: 'Димната Завеса',
    image: '/images/cards/sashkoscigari.png', rarity: 'rare',
    atk: 6, def: 3,
    ability: { name: 'Димна Завеса', description: 'Атакуващият те има 40% промах.', type: 'smoke_screen', missChance: 0.4 }
  },
  {
    id: 'marinkatadavaL', name: 'Маринката дава L', title: 'Този който губи',
    image: '/images/cards/marinkatadavaL.png', rarity: 'rare',
    atk: 6, def: 4,
    ability: { name: 'L за Теб', description: 'Зашеметява целта за 1 рунд.', type: 'stun' }
  },
  {
    id: 'borkodqdokoleda', name: 'Борко Дядо Коледа', title: 'Празничният Хаос',
    image: '/images/cards/borkodqdokoleda.png', rarity: 'rare',
    atk: 6, def: 5,
    ability: { name: 'Коледен Подарък', description: '50/50: +8 щети ИЛИ лекува 8 HP.', type: 'random_gift', value: 8 }
  },
  {
    id: 'borkodjakpota', name: 'Борко Джакпота', title: 'Късметлията',
    image: '/images/cards/borkodjakpota.png', rarity: 'rare',
    atk: 6, def: 5,
    ability: { name: 'Джакпот', description: 'Ролва d6: 1=промах, 2-3=нормално, 4-5=+50%, 6=двойно.', type: 'jackpot' }
  },
  {
    id: 'teodorkolata', name: 'Теодор Колата', title: 'Шофьорът на Съдбата',
    image: '/images/cards/teodorkolata.png', rarity: 'rare',
    atk: 7, def: 4,
    ability: { name: 'Газ до Дупка', description: 'Бонус щети = 20% от текущия HP на целта.', type: 'ram', hpPercent: 0.2 }
  },
  {
    id: 'teodormuaythaya', name: 'Теодор Муай Тай', title: 'Ударът от Сянката',
    image: '/images/cards/teodormuaythaya.jpg', rarity: 'rare',
    atk: 7, def: 5,
    ability: { name: 'Комбо Удар', description: 'Намалява DEF на целта с 3 завинаги.', type: 'def_shred', shredValue: 3 }
  },

  // ===== EPIC (7) =====
  {
    id: 'antoniopashata', name: 'Антонио Пашата', title: 'Огледалният Силвър',
    image: '/images/cards/antoniopashata.png', rarity: 'epic',
    atk: 7, def: 5,
    ability: { name: 'Огледален Удар', description: 'Връща 50% от получените щети.', type: 'reflect', value: 0.5 }
  },
  {
    id: 'skultrupara', name: 'Скул Трупара', title: 'ог фортнайт императора',
    image: '/images/cards/skultrupara.jpg', rarity: 'epic',
    atk: 9, def: 3,
    ability: { name: 'Жътва', description: 'Краде 30% от нанесените щети като HP. При убийство: +15 HP.', type: 'reap', lifestealPercent: 0.3, healOnKill: 15 }
  },
  {
    id: 'teodorkapone', name: 'Теодор Капоне', title: 'Главата на мафията',
    image: '/images/cards/teodorkapone.jpg', rarity: 'epic',
    atk: 7, def: 5,
    ability: { name: 'Мафиотски Удар', description: 'Щети + 50% на случаен друг играч.', type: 'splash', splashMultiplier: 0.5 }
  },
  {
    id: 'pavlinzalaga', name: 'Павлин Залага', title: 'Високият Залог',
    image: '/images/cards/pavlinzalaga.jpg', rarity: 'epic',
    atk: 6, def: 5,
    ability: { name: 'Голям Залог', description: '50/50: двойни щети ИЛИ лекува противника.', type: 'gamble', chance: 0.5 }
  },
  {
    id: 'borkomusashito', name: 'Борко Мусашито', title: 'Пътят на Меча',
    image: '/images/cards/borkomusashito.png', rarity: 'epic',
    atk: 8, def: 4,
    ability: { name: 'Самурайски Удар', description: 'Игнорира 50% от DEF на противника.', type: 'armor_pierce', piercePercent: 0.5 }
  },
  {
    id: 'pavlinumira', name: 'Павлин Умира', title: 'Последният Дъх',
    image: '/images/cards/pavlinumira.png', rarity: 'epic',
    atk: 7, def: 4,
    ability: { name: 'Предсмъртен Удар', description: 'При под 25% HP: удвоява всички щети.', type: 'desperation', thresholds: [{ percent: 0.5, bonus: 4 }, { percent: 0.25, bonus: 10 }] }
  },
  {
    id: 'iliqnsnaipera', name: 'Илиян Снайпера', title: 'Точният Изстрел',
    image: '/images/cards/iliqnsnaipera.jpg', rarity: 'epic',
    atk: 8, def: 2,
    ability: { name: 'Точен Изстрел', description: 'Игнорира 100% от DEF на целта.', type: 'sniper' }
  },

  // ===== LEGENDARY (5) =====
  {
    id: 'muaythaya', name: 'Муай Тай', title: 'Легендата от Карнобат',
    image: '/images/cards/muaythaya.jpg', rarity: 'legendary',
    atk: 8, def: 5,
    ability: { name: 'Осем Крайника', description: 'Удря 3 пъти по 50% щети. Всеки удар: 30% стън. -2 DEF на целта завинаги.', type: 'eight_limbs', hits: 3, hitMultiplier: 0.5, stunChance: 0.3, defShred: 2 }
  },
  {
    id: 'bezkuchki', name: 'Без Кучки', title: 'Тихият Хакер',
    image: '/images/cards/bezkuchki.png', rarity: 'legendary',
    atk: 6, def: 7,
    ability: { name: 'Хакерска Атака', description: 'Копира способността на противника.', type: 'copy_ability' }
  },
  {
    id: 'calofdutigrost', name: 'Call of Duty Грост', title: 'Призракът Снайперист',
    image: '/images/cards/calofdutigrost.png', rarity: 'legendary',
    atk: 9, def: 2,
    ability: { name: '360 No Scope', description: 'Най-висока инициатива = двойни щети.', type: 'speed_kill', multiplier: 2 }
  },
  {
    id: 'pavlinchimaev', name: 'Павлин Чимаев', title: 'Дагестанския войн',
    image: '/images/cards/pavlinchimaev.jpg', rarity: 'legendary',
    atk: 8, def: 6,
    ability: { name: 'Тейкдаун', description: 'Зашеметява целта, +4 бонус щети и -2 DEF завинаги.', type: 'takedown', bonusDmg: 4, defShred: 2 }
  },
  {
    id: 'vulkutotkarnobatstreet', name: 'Вълкът от Карнобат Стрийт', title: 'Уолстрийт Измамникът',
    image: '/images/cards/vulkutotkarnobatstreet.jpg', rarity: 'legendary',
    atk: 7, def: 6,
    ability: { name: 'Схемата', description: 'Краде 1 spell от целта и +4 бонус щети.', type: 'scheme', bonusDmg: 4 }
  },

  // ===== SECRET (3) — ~5% chance to appear in draft =====
  {
    id: 'marinskvidgeima', name: 'Марин Сквид Гейм', title: 'Играч 067',
    image: '/images/cards/marinskvidgeima.jpg', rarity: 'secret',
    atk: 8, def: 5,
    ability: { name: 'Последен Шанс', description: 'Под 50% HP: +6 ATK. Под 25%: +12 ATK.', type: 'desperation', thresholds: [{ percent: 0.5, bonus: 6 }, { percent: 0.25, bonus: 12 }] }
  },
  {
    id: 'antoniosriba', name: 'Антонио с Риба', title: 'Рибарят на Съдбата',
    image: '/images/cards/antoniosriba.png', rarity: 'secret',
    atk: 7, def: 6,
    ability: { name: 'Рибен Капан', description: 'Краде случайна spell карта от целта.', type: 'spell_steal' }
  },
  {
    id: 'mafiaborko', name: 'Мафия Борко', title: 'Кръстника на Сървъра',
    image: '/images/cards/mafiaborko.jpg', rarity: 'secret',
    atk: 8, def: 5,
    ability: { name: 'Поръчка', description: 'Маркира целта: +8 бонус щети ако я атакуваш отново.', type: 'contract', bonusDmg: 8 }
  },

  // ===== COSMIC (2) — ~2% chance, 3 effects =====
  {
    id: 'muaythayaIglavata', name: 'Муай Тай и Главата', title: 'Прайм дуото на Созопол',
    image: '/images/cards/muaythayaIglavata.jpg', rarity: 'cosmic',
    atk: 7, def: 7,
    ability: {
      name: 'Тагтийм Ултимейт',
      description: 'Двоен удар по 85% щети | -3 получени щети | На всеки 3 рунда: стън + 5 по всички.',
      type: 'cosmic_triple',
      effects: [
        { type: 'tag_strike', hitMultiplier: 0.85 },
        { type: 'shield', value: 3 },
        { type: 'finisher', stunDuration: 1, aoeDamage: 5, interval: 3 }
      ]
    }
  },
  {
    id: 'sashkoebit', name: 'Сашко е бит', title: 'Оцелелият от Баща Му',
    image: '/images/cards/sashkoebit.png', rarity: 'cosmic',
    atk: 7, def: 6,
    ability: {
      name: 'Уличен Закон',
      description: 'Краде 3 HP | Издържа -3 щети | На всеки 2 рунда: 3 по всички.',
      type: 'cosmic_triple',
      effects: [
        { type: 'drain', value: 3 },
        { type: 'shield', value: 3 },
        { type: 'burst', value: 3, interval: 2 }
      ]
    }
  },

  // ===== OWNER (1) — ~1% chance, 3 abilities + passive =====
  {
    id: 'teodorglavata', name: 'Теодор Главата', title: 'Собственикът на Сървъра',
    image: '/images/cards/teodorglavata.jpg', rarity: 'owner',
    atk: 6, def: 5,
    ability: {
      name: 'Администратор',
      description: 'Passive: Banhammer +2/+2 per kill | Timeout: Silence +3 DMG | Пролетно Разчистване: на 2 рунда silence всички + стън на 2ма',
      type: 'owner_admin',
      effects: [
        { type: 'banhammer', atkPerKill: 2, defPerKill: 2 },
        { type: 'timeout', silenceDuration: 1, bonusDmg: 3 },
        { type: 'spring_cleaning', silenceDuration: 1, stunCount: 2, stunDuration: 1, atkReduction: 0.5, interval: 2 }
      ]
    }
  }
];

// ===== SPELL CARDS (11) =====
const SPELLS = [
  { id: 'mahlenska_baltia', name: 'Махленска Балтия', description: '+6 ATK за тази атака.', type: 'atk_boost', value: 6, iconColor: '#ff4444' },
  { id: 'akcia_respekt', name: 'Акция респект', description: '+6 DEF за този рунд.', type: 'def_boost', value: 6, iconColor: '#4488ff' },
  { id: 'kradeca_na_dushi', name: 'Крадеца на души', description: 'Лекува 8 HP.', type: 'heal', value: 8, iconColor: '#aa44ff' },
  { id: 'umirajte_vsichki', name: 'Умирайте всички', description: '4 щети на ВСИЧКИ врагове.', type: 'aoe_damage', value: 4, chain: true, iconColor: '#ff8800' },
  { id: 'lqv_desen', name: 'ляв десен', description: 'Атаката удря два пъти.', type: 'double_hit', iconColor: '#ff6622' },
  { id: 'na_muro_vodata', name: 'на мъро водата', description: '3 отрова за 2 рунда.', type: 'poison', value: 3, duration: 2, iconColor: '#44cc66' },
  { id: 'stop_igra', name: 'стоп игра', description: 'Замразява целта за 1 рунд.', type: 'freeze', iconColor: '#22ccbb' },
  { id: 'edno_za_edno', name: 'едно за едно', description: '-5 HP, +7 ATK.', type: 'sacrifice', hpCost: 5, atkBonus: 7, iconColor: '#8844cc' },
  { id: 'bum', name: 'бум', description: '35% шанс стън на всеки враг.', type: 'mass_stun', chance: 0.35, chain: true, iconColor: '#cc2222' },
  { id: 'igrata_na_dyavola', name: 'играта на дявола', description: 'Цел под 50% HP: +6 щети.', type: 'execute', threshold: 0.5, bonusDmg: 6, iconColor: '#6677aa' },
  { id: 'pepel_ot_rozi', name: 'пепел от рози', description: 'Пренасочва щетите към случаен враг.', type: 'redirect', iconColor: '#cc4466' }
];

// ===== COUNTER CARDS (6) =====
const COUNTERS = [
  { id: 'poemaj', name: 'поемай', description: 'Отразява 60% щети обратно.', type: 'reflect', value: 0.60, iconColor: '#00bcd4' },
  { id: 'fiuuu', name: 'фиууу', description: '65% шанс за пълен dodge.', type: 'dodge', chance: 0.65, iconColor: '#b0bec5' },
  { id: 'nyama_takiva', name: 'няма такива', description: 'Анулира spell-а на атакуващия.', type: 'spell_negate', iconColor: '#ff3333' },
  { id: 'pocherpka', name: 'почерпка', description: 'Превръща до 7 щети в HP.', type: 'absorb', maxAbsorb: 7, iconColor: '#4caf50' },
  { id: 'vsichko_se_vrushta', name: 'всичко се връща', description: 'Получаваш щети, но връщаш двойно (макс 15).', type: 'vengeance', multiplier: 2, maxReturn: 15, iconColor: '#9c27b0' },
  { id: 'edin_za_vsichki', name: 'един за всички', description: 'При 5+ щети: 5 на всички врагове.', type: 'chain_react', threshold: 5, damage: 5, chain: true, iconColor: '#ff9800' }
];

// ===== SUPPORT CARDS (6) — picked after warrior draft =====
const SUPPORT_CARDS = [
  {
    id: 'supportkreicho', name: 'Крейчо', title: 'Верният Другар',
    image: '/images/cards/supportkreicho.jpg',
    description: 'Лекува 3 HP в началото на всеки рунд.',
    type: 'heal_per_round', value: 3
  },
  {
    id: 'supportteodorsdjandaka', name: 'Теодор с Джанката', title: 'Въоръжен до Зъби',
    image: '/images/cards/supportteodorsdjandaka.jpg',
    description: '+3 ATK завинаги.',
    type: 'permanent_atk', value: 3
  },
  {
    id: 'supportstarshitoizbra', name: 'Старшият Избра', title: 'Гласът на Мъдростта',
    image: '/images/cards/supportstarshitoizbra.jpg',
    description: '+1 допълнителна контра на всеки рунд.',
    type: 'extra_counter', value: 1
  },
  {
    id: 'supportscarymarin', name: 'Страшният Марин', title: 'Плашещата Аура',
    image: '/images/cards/supportscarymarin.jpg',
    description: '+2 DEF завинаги.',
    type: 'permanent_def', value: 2
  },
  {
    id: 'supportteodortate', name: 'Теодор Тате', title: 'Връзки по Високите Места',
    image: '/images/cards/supportteodortate.jpg',
    description: '+1 допълнително заклинание на всеки рунд.',
    type: 'extra_spell', value: 1
  },
  {
    id: 'supportpavlinsrednqka', name: 'Павлин Средняка', title: 'Неубиваемият',
    image: '/images/cards/supportpavlinsrednqka.png',
    description: '+8 HP бонус (увеличава максималните HP).',
    type: 'hp_boost', value: 8
  }
];

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
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  secret: 'Secret',
  cosmic: 'Cosmic',
  owner: 'Owner'
};

// Rarity weights for draft appearance
const RARITY_WEIGHTS = {
  common: 35,
  rare: 28,
  epic: 20,
  legendary: 10,
  secret: 5,
  cosmic: 2,
  owner: 1
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

function dealSpells(count = 2) {
  const hand = [];
  for (let i = 0; i < count; i++) {
    hand.push({ ...SPELLS[Math.floor(Math.random() * SPELLS.length)], uid: `spell_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}` });
  }
  return hand;
}

function dealCounters(count = 1) {
  const hand = [];
  for (let i = 0; i < count; i++) {
    hand.push({ ...COUNTERS[Math.floor(Math.random() * COUNTERS.length)], uid: `counter_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}` });
  }
  return hand;
}

module.exports = { WARRIORS, SPELLS, COUNTERS, SUPPORT_CARDS, RARITY_COLORS, RARITY_NAMES, RARITY_WEIGHTS, generateDraftOptions, dealSpells, dealCounters };
