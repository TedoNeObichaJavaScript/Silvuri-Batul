// All 17 hardcoded cards — your Discord crew as game cards
// Each card has: id, name, title, image, rarity, stats (atk, def, spd), ability

const CARDS = [
  {
    id: 'antoniopashata',
    name: 'Антонио Пашата',
    title: 'Огледалният Воин',
    image: '/images/cards/antoniopashata.png',
    rarity: 'epic',
    atk: 7,
    def: 5,
    spd: 6,
    ability: {
      name: 'Огледален Удар',
      description: 'Връща 50% от получените щети обратно към атакуващия.',
      type: 'reflect',
      value: 0.5
    }
  },
  {
    id: 'antoniopie',
    name: 'Антонио Пие',
    title: 'Вечният Купонджия',
    image: '/images/cards/antoniopie.png',
    rarity: 'rare',
    atk: 4,
    def: 3,
    spd: 8,
    ability: {
      name: 'На Здраве!',
      description: 'Лекува 5 HP на играча и дава +3 ATK на следващия ход.',
      type: 'heal_and_buff',
      healValue: 5,
      buffValue: 3
    }
  },
  {
    id: 'bezkuchki',
    name: 'Без Кучки',
    title: 'Тихият Хакер',
    image: '/images/cards/bezkuchki.png',
    rarity: 'legendary',
    atk: 5,
    def: 7,
    spd: 4,
    ability: {
      name: 'Хакерска Атака',
      description: 'Копира способността на противниковата карта и я използва срещу него.',
      type: 'copy_ability'
    }
  },
  {
    id: 'borkodqdokoleda',
    name: 'Борко Дядо Коледа',
    title: 'Празничният Хаос',
    image: '/images/cards/borkodqdokoleda.png',
    rarity: 'epic',
    atk: 6,
    def: 6,
    spd: 5,
    ability: {
      name: 'Коледен Подарък',
      description: 'Рандом ефект: или лекува 8 HP, или нанася 8 допълнителни щети.',
      type: 'random_gift',
      value: 8
    }
  },
  {
    id: 'borkosbira',
    name: 'Борко с Бира',
    title: 'Пияният Берсеркер',
    image: '/images/cards/borkosbira.jpg',
    rarity: 'rare',
    atk: 9,
    def: 2,
    spd: 3,
    ability: {
      name: 'Пиян Размах',
      description: '70% шанс за двойни щети, 30% шанс да промахне напълно.',
      type: 'drunk_swing',
      hitChance: 0.7,
      multiplier: 2
    }
  },
  {
    id: 'borkoskotka',
    name: 'Борко с Котка',
    title: 'Котешкият Господар',
    image: '/images/cards/borkoskotka.png',
    rarity: 'rare',
    atk: 3,
    def: 8,
    spd: 7,
    ability: {
      name: 'Котешки Щит',
      description: 'Блокира напълно следващата атака срещу теб.',
      type: 'full_block'
    }
  },
  {
    id: 'calofdutigrost',
    name: 'Call of Duty Грост',
    title: 'Призракът Снайперист',
    image: '/images/cards/calofdutigrost.png',
    rarity: 'legendary',
    atk: 9,
    def: 1,
    spd: 9,
    ability: {
      name: '360 No Scope',
      description: 'Ако е най-бърз в рунда, нанася тройни щети.',
      type: 'speed_kill',
      multiplier: 3
    }
  },
  {
    id: 'marinchad',
    name: 'Марин Чад',
    title: 'Алфа Доминаторът',
    image: '/images/cards/marinchad.jpg',
    rarity: 'epic',
    atk: 7,
    def: 6,
    spd: 5,
    ability: {
      name: 'Чад Аура',
      description: 'Намалява ATK на всички противникови карти с 3 за този рунд.',
      type: 'aura_debuff',
      debuffValue: 3
    }
  },
  {
    id: 'marinimabuzkut',
    name: 'Марин има Бъзкът',
    title: 'Фризьорският Майстор',
    image: '/images/cards/marinimabuzkut.png',
    rarity: 'common',
    atk: 5,
    def: 5,
    spd: 5,
    ability: {
      name: 'Фризьорски Удар',
      description: 'Премахва всички бафове от противниковата карта.',
      type: 'purge'
    }
  },
  {
    id: 'marinkatadavaL',
    name: 'Маринката дава L',
    title: 'Раздавачът на Загуби',
    image: '/images/cards/marinkatadavaL.png',
    rarity: 'epic',
    atk: 6,
    def: 4,
    spd: 7,
    ability: {
      name: 'L за Теб',
      description: 'Противникът пропуска следващия си ход.',
      type: 'stun'
    }
  },
  {
    id: 'marinskvidgeima',
    name: 'Марин Сквид Гейм',
    title: 'Играч 067',
    image: '/images/cards/marinskvidgeima.jpg',
    rarity: 'legendary',
    atk: 8,
    def: 4,
    spd: 6,
    ability: {
      name: 'Последен Шанс',
      description: 'Ако HP-то ти е под 50%, получава +6 ATK.',
      type: 'desperation',
      threshold: 0.5,
      bonusAtk: 6
    }
  },
  {
    id: 'naborkozatvora',
    name: 'На Борко Затвора',
    title: 'Вратарят на Затвора',
    image: '/images/cards/naborkozatvora.jpg',
    rarity: 'rare',
    atk: 4,
    def: 9,
    spd: 2,
    ability: {
      name: 'Зад Решетките',
      description: 'Заключва противниковата карта — тя не може да атакува този рунд.',
      type: 'lock',
    }
  },
  {
    id: 'pavlinzalaga',
    name: 'Павлин Залага',
    title: 'Високият Залог',
    image: '/images/cards/pavlinzalaga.jpg',
    rarity: 'epic',
    atk: 5,
    def: 5,
    spd: 5,
    ability: {
      name: 'Голям Залог',
      description: '50/50: или удвоява нанесените щети, или лекува противника за същото.',
      type: 'gamble',
      chance: 0.5
    }
  },
  {
    id: 'polkovnikviki',
    name: 'Полковник Вики',
    title: 'Нощният Командир',
    image: '/images/cards/polkovnikviki.jpg',
    rarity: 'epic',
    atk: 7,
    def: 7,
    spd: 4,
    ability: {
      name: 'Военна Стратегия',
      description: 'Следващата ти карта получава +3 ATK и +3 DEF.',
      type: 'buff_next',
      buffAtk: 3,
      buffDef: 3
    }
  },
  {
    id: 'sashkoscigari',
    name: 'Сашко с Цигари',
    title: 'Димната Завеса',
    image: '/images/cards/sashkoscigari.png',
    rarity: 'rare',
    atk: 6,
    def: 3,
    spd: 8,
    ability: {
      name: 'Димна Завеса',
      description: 'Всички противници имат 40% шанс да промахнат този рунд.',
      type: 'smoke_screen',
      missChance: 0.4
    }
  },
  {
    id: 'skultrupara',
    name: 'Скул Трупара',
    title: 'Жътварят на Души',
    image: '/images/cards/skultrupara.jpg',
    rarity: 'legendary',
    atk: 10,
    def: 2,
    spd: 7,
    ability: {
      name: 'Жътва',
      description: 'Ако тази карта елиминира противник, лекува 10 HP.',
      type: 'reap',
      healOnKill: 10
    }
  },
  {
    id: 'teodorkapone',
    name: 'Теодор Капоне',
    title: 'Мафиотският Бос',
    image: '/images/cards/teodorkapone.jpg',
    rarity: 'legendary',
    atk: 8,
    def: 5,
    spd: 6,
    ability: {
      name: 'Мафиотски Удар',
      description: 'Нанася щети на целта И на случаен друг играч за половината.',
      type: 'splash',
      splashMultiplier: 0.5
    }
  }
];

// Rarity colors for frontend
const RARITY_COLORS = {
  common: '#b0b0b0',
  rare: '#4a90d9',
  epic: '#a855f7',
  legendary: '#f59e0b'
};

// How many cards per player based on player count
function getCardsPerPlayer(playerCount) {
  if (playerCount <= 3) return 5;
  if (playerCount <= 5) return 3;
  return 2;
}

module.exports = { CARDS, RARITY_COLORS, getCardsPerPlayer };
