const { CARDS, getCardsPerPlayer } = require('./cards');

class Game {
  constructor(lobbyCode, hostId) {
    this.lobbyCode = lobbyCode;
    this.hostId = hostId;
    this.players = new Map(); // socketId -> { id, name, hp, hand, buffs, stunned }
    this.state = 'lobby'; // lobby | draft | battle | gameOver
    this.draftPool = [];
    this.draftOrder = [];
    this.draftIndex = 0;
    this.cardsPerPlayer = 0;
    this.round = 0;
    this.roundActions = new Map(); // socketId -> { cardId, targetId }
    this.roundTimer = null;
    this.roundResults = [];
    this.winner = null;
    this.maxHp = 30;
    this.turnTimeLimit = 30000; // 30 seconds
  }

  addPlayer(socketId, name) {
    if (this.players.size >= 8) return { error: 'Лобито е пълно!' };
    if (this.state !== 'lobby') return { error: 'Играта вече е започнала!' };

    this.players.set(socketId, {
      id: socketId,
      name,
      hp: this.maxHp,
      hand: [],
      buffs: { atk: 0, def: 0 },
      stunned: false,
      shielded: false,
      eliminated: false
    });

    return { success: true, playerCount: this.players.size };
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    if (this.state === 'lobby') return;

    // If in game, mark as eliminated
    const player = this.players.get(socketId);
    if (player) {
      player.eliminated = true;
      player.hp = 0;
    }
  }

  startGame() {
    if (this.players.size < 2) return { error: 'Нужни са поне 2 играча!' };

    // Shuffle cards for draft pool
    this.draftPool = this.shuffleArray([...CARDS]);
    this.cardsPerPlayer = getCardsPerPlayer(this.players.size);

    // Random draft order
    this.draftOrder = this.shuffleArray([...this.players.keys()]);
    this.draftIndex = 0;
    this.state = 'draft';

    return {
      success: true,
      draftPool: this.draftPool.map(c => ({
        id: c.id, name: c.name, title: c.title, image: c.image,
        rarity: c.rarity, atk: c.atk, def: c.def, spd: c.spd, ability: c.ability
      })),
      draftOrder: this.draftOrder.map(id => ({
        id,
        name: this.players.get(id).name
      })),
      currentPicker: this.draftOrder[0],
      cardsPerPlayer: this.cardsPerPlayer
    };
  }

  draftPick(socketId, cardId) {
    if (this.state !== 'draft') return { error: 'Не сме в драфт фаза!' };

    const currentPicker = this.draftOrder[this.draftIndex % this.draftOrder.length];
    if (socketId !== currentPicker) return { error: 'Не е твой ред!' };

    const cardIndex = this.draftPool.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { error: 'Тази карта вече е избрана!' };

    const card = this.draftPool.splice(cardIndex, 1)[0];
    const player = this.players.get(socketId);
    player.hand.push({ ...card });

    this.draftIndex++;

    // Check if draft is complete
    const allPlayersFull = [...this.players.values()].every(
      p => p.hand.length >= this.cardsPerPlayer
    );

    if (allPlayersFull || this.draftPool.length === 0) {
      this.state = 'battle';
      this.round = 1;
      return {
        success: true,
        pickedCard: card,
        pickedBy: socketId,
        draftComplete: true,
        hands: this.getPlayerHands()
      };
    }

    // Snake draft: reverse order at the end of each pass
    const passPosition = this.draftIndex % this.draftOrder.length;
    if (passPosition === 0) {
      this.draftOrder.reverse();
    }

    return {
      success: true,
      pickedCard: card,
      pickedBy: socketId,
      draftComplete: false,
      nextPicker: this.draftOrder[this.draftIndex % this.draftOrder.length],
      remainingPool: this.draftPool.map(c => c.id)
    };
  }

  submitAction(socketId, cardId, targetId) {
    if (this.state !== 'battle') return { error: 'Не сме в битка!' };

    const player = this.players.get(socketId);
    if (!player || player.eliminated) return { error: 'Елиминиран си!' };
    if (player.stunned) return { error: 'Зашеметен си този рунд!' };

    const card = player.hand.find(c => c.id === cardId);
    if (!card) return { error: 'Нямаш тази карта!' };

    const target = this.players.get(targetId);
    if (!target || target.eliminated) return { error: 'Невалидна цел!' };
    if (targetId === socketId) return { error: 'Не можеш да атакуваш себе си!' };

    this.roundActions.set(socketId, { cardId, targetId });

    return {
      success: true,
      waitingFor: this.getAlivePlayers().filter(
        p => !this.roundActions.has(p.id) && !p.stunned
      ).length
    };
  }

  allActionsSubmitted() {
    const alive = this.getAlivePlayers().filter(p => !p.stunned);
    return alive.every(p => this.roundActions.has(p.id));
  }

  resolveRound() {
    const results = [];
    const actions = [];

    // Gather all actions with card data
    for (const [playerId, action] of this.roundActions) {
      const player = this.players.get(playerId);
      const card = player.hand.find(c => c.id === action.cardId);
      if (!card) continue;

      actions.push({
        playerId,
        playerName: player.name,
        card: { ...card },
        targetId: action.targetId,
        effectiveAtk: card.atk + player.buffs.atk,
        effectiveDef: card.def + player.buffs.def,
        effectiveSpd: card.spd
      });
    }

    // Sort by speed (fastest first)
    actions.sort((a, b) => b.effectiveSpd - a.effectiveSpd);

    // Track round-specific states
    const smokeScreenActive = actions.some(a => a.card.ability.type === 'smoke_screen');
    const smokeMissChance = smokeScreenActive ? 0.4 : 0;
    const chadAuraActive = actions.find(a => a.card.ability.type === 'aura_debuff');
    const lockedPlayers = new Set();

    // Pre-resolution: apply aura debuffs, locks, smoke
    for (const action of actions) {
      const ability = action.card.ability;

      if (ability.type === 'lock') {
        lockedPlayers.add(action.targetId);
        results.push({
          type: 'ability',
          playerId: action.playerId,
          playerName: action.playerName,
          cardName: action.card.name,
          abilityName: ability.name,
          message: `${action.card.name} заключва картата на ${this.players.get(action.targetId).name}!`
        });
      }

      if (ability.type === 'aura_debuff') {
        for (const other of actions) {
          if (other.playerId !== action.playerId) {
            other.effectiveAtk = Math.max(0, other.effectiveAtk - ability.debuffValue);
          }
        }
        results.push({
          type: 'ability',
          playerId: action.playerId,
          playerName: action.playerName,
          cardName: action.card.name,
          abilityName: ability.name,
          message: `${action.card.name} намалява ATK на всички противници с ${ability.debuffValue}!`
        });
      }
    }

    // Main resolution
    for (const action of actions) {
      const attacker = this.players.get(action.playerId);
      const target = this.players.get(action.targetId);
      if (!target || target.eliminated) continue;
      if (lockedPlayers.has(action.playerId)) {
        results.push({
          type: 'locked',
          playerId: action.playerId,
          playerName: action.playerName,
          cardName: action.card.name,
          message: `${action.card.name} е заключен и не може да атакува!`
        });
        continue;
      }

      const ability = action.card.ability;
      let damage = 0;
      let blocked = false;
      let missed = false;

      // Check smoke screen miss
      if (smokeMissChance > 0 && ability.type !== 'smoke_screen') {
        if (Math.random() < smokeMissChance) {
          missed = true;
          results.push({
            type: 'miss',
            playerId: action.playerId,
            playerName: action.playerName,
            cardName: action.card.name,
            message: `${action.card.name} промахва заради димната завеса!`
          });
          continue;
        }
      }

      // Check if target has full block (Borko s Kotka)
      const targetAction = actions.find(a => a.playerId === action.targetId);
      if (targetAction && targetAction.card.ability.type === 'full_block') {
        blocked = true;
        results.push({
          type: 'blocked',
          playerId: action.playerId,
          playerName: action.playerName,
          cardName: action.card.name,
          targetName: target.name,
          message: `${targetAction.card.name} блокира атаката на ${action.card.name}!`
        });
        continue;
      }

      // Find target's defending card DEF
      const targetDef = targetAction ? targetAction.effectiveDef : 0;

      // Calculate base damage
      damage = Math.max(0, action.effectiveAtk - targetDef);

      // Apply ability effects
      switch (ability.type) {
        case 'reflect':
          // Damage goes through, but 50% reflects back
          target.hp -= damage;
          const reflectDmg = Math.floor(damage * ability.value);
          attacker.hp -= reflectDmg;
          results.push({
            type: 'attack',
            playerId: action.playerId,
            playerName: action.playerName,
            cardName: action.card.name,
            targetName: target.name,
            damage,
            message: `${action.card.name} нанася ${damage} щети на ${target.name}!`
          });
          if (reflectDmg > 0) {
            results.push({
              type: 'reflect',
              playerId: action.playerId,
              cardName: action.card.name,
              damage: reflectDmg,
              message: `Огледален Удар връща ${reflectDmg} щети обратно!`
            });
          }
          break;

        case 'heal_and_buff':
          damage = Math.max(0, action.effectiveAtk - targetDef);
          target.hp -= damage;
          attacker.hp = Math.min(this.maxHp, attacker.hp + ability.healValue);
          attacker.buffs.atk += ability.buffValue;
          results.push({
            type: 'attack',
            playerId: action.playerId,
            playerName: action.playerName,
            cardName: action.card.name,
            targetName: target.name,
            damage,
            message: `${action.card.name} нанася ${damage} щети, лекува ${ability.healValue} HP и получава +${ability.buffValue} ATK!`
          });
          break;

        case 'copy_ability':
          if (targetAction) {
            // Use the target's ability against them
            const copiedAtk = action.effectiveAtk;
            damage = Math.max(0, copiedAtk - targetDef);
            target.hp -= damage;
            results.push({
              type: 'attack',
              playerId: action.playerId,
              playerName: action.playerName,
              cardName: action.card.name,
              targetName: target.name,
              damage,
              message: `${action.card.name} копира ${targetAction.card.ability.name} и нанася ${damage} щети!`
            });
          } else {
            target.hp -= damage;
            results.push({
              type: 'attack',
              playerId: action.playerId,
              playerName: action.playerName,
              cardName: action.card.name,
              targetName: target.name,
              damage,
              message: `${action.card.name} нанася ${damage} щети!`
            });
          }
          break;

        case 'random_gift':
          const isGood = Math.random() > 0.5;
          if (isGood) {
            damage = Math.max(0, action.effectiveAtk - targetDef) + ability.value;
            target.hp -= damage;
            results.push({
              type: 'attack',
              playerId: action.playerId,
              playerName: action.playerName,
              cardName: action.card.name,
              targetName: target.name,
              damage,
              message: `Коледен подарък: БОМБА! ${action.card.name} нанася ${damage} щети!`
            });
          } else {
            attacker.hp = Math.min(this.maxHp, attacker.hp + ability.value);
            results.push({
              type: 'heal',
              playerId: action.playerId,
              playerName: action.playerName,
              cardName: action.card.name,
              heal: ability.value,
              message: `Коледен подарък: ЛЕЧЕНИЕ! ${action.card.name} лекува ${ability.value} HP!`
            });
          }
          break;

        case 'drunk_swing':
          if (Math.random() < ability.hitChance) {
            damage = Math.max(0, (action.effectiveAtk * ability.multiplier) - targetDef);
            target.hp -= damage;
            results.push({
              type: 'attack',
              playerId: action.playerId,
              playerName: action.playerName,
              cardName: action.card.name,
              targetName: target.name,
              damage,
              message: `${action.card.name} замахва пиян и УДРЯ за ${damage} щети!`
            });
          } else {
            results.push({
              type: 'miss',
              playerId: action.playerId,
              playerName: action.playerName,
              cardName: action.card.name,
              message: `${action.card.name} замахва пиян и ПРОМАХВА!`
            });
          }
          break;

        case 'full_block':
          // Defensive card — still deals damage but main purpose is blocking
          damage = Math.max(0, action.effectiveAtk - targetDef);
          target.hp -= damage;
          results.push({
            type: 'attack',
            playerId: action.playerId,
            playerName: action.playerName,
            cardName: action.card.name,
            targetName: target.name,
            damage,
            message: `${action.card.name} нанася ${damage} щети и вдига щит!`
          });
          break;

        case 'speed_kill':
          const isFastest = actions[0].playerId === action.playerId;
          const multiplier = isFastest ? ability.multiplier : 1;
          damage = Math.max(0, (action.effectiveAtk * multiplier) - targetDef);
          target.hp -= damage;
          results.push({
            type: 'attack',
            playerId: action.playerId,
            playerName: action.playerName,
            cardName: action.card.name,
            targetName: target.name,
            damage,
            message: isFastest
              ? `360 NO SCOPE! ${action.card.name} нанася ${damage} ТРОЙНИ щети!`
              : `${action.card.name} нанася ${damage} щети.`
          });
          break;

        case 'purge':
          if (targetAction) {
            const tp = this.players.get(action.targetId);
            tp.buffs = { atk: 0, def: 0 };
          }
          damage = Math.max(0, action.effectiveAtk - targetDef);
          target.hp -= damage;
          results.push({
            type: 'attack',
            playerId: action.playerId,
            playerName: action.playerName,
            cardName: action.card.name,
            targetName: target.name,
            damage,
            message: `${action.card.name} премахва бафовете и нанася ${damage} щети!`
          });
          break;

        case 'stun':
          damage = Math.max(0, action.effectiveAtk - targetDef);
          target.hp -= damage;
          const targetPlayer = this.players.get(action.targetId);
          targetPlayer.stunned = true;
          results.push({
            type: 'attack',
            playerId: action.playerId,
            playerName: action.playerName,
            cardName: action.card.name,
            targetName: target.name,
            damage,
            message: `${action.card.name} дава L на ${target.name} — зашеметен за 1 рунд! (${damage} щети)`
          });
          break;

        case 'desperation':
          const hpPercent = attacker.hp / this.maxHp;
          const bonusAtk = hpPercent < ability.threshold ? ability.bonusAtk : 0;
          damage = Math.max(0, (action.effectiveAtk + bonusAtk) - targetDef);
          target.hp -= damage;
          results.push({
            type: 'attack',
            playerId: action.playerId,
            playerName: action.playerName,
            cardName: action.card.name,
            targetName: target.name,
            damage,
            message: bonusAtk > 0
              ? `ПОСЛЕДЕН ШАНС! ${action.card.name} нанася ${damage} щети с бонус +${bonusAtk} ATK!`
              : `${action.card.name} нанася ${damage} щети.`
          });
          break;

        case 'gamble':
          damage = Math.max(0, action.effectiveAtk - targetDef);
          if (Math.random() < ability.chance) {
            damage *= 2;
            target.hp -= damage;
            results.push({
              type: 'attack',
              playerId: action.playerId,
              playerName: action.playerName,
              cardName: action.card.name,
              targetName: target.name,
              damage,
              message: `ПЕЧЕЛИВШ ЗАЛОГ! ${action.card.name} нанася ДВОЙНИ ${damage} щети!`
            });
          } else {
            target.hp = Math.min(this.maxHp, target.hp + damage);
            results.push({
              type: 'heal_enemy',
              playerId: action.playerId,
              playerName: action.playerName,
              cardName: action.card.name,
              targetName: target.name,
              heal: damage,
              message: `ЗАГУБЕН ЗАЛОГ! ${action.card.name} ЛЕКУВА ${target.name} за ${damage} HP!`
            });
          }
          break;

        case 'buff_next':
          damage = Math.max(0, action.effectiveAtk - targetDef);
          target.hp -= damage;
          attacker.buffs.atk += ability.buffAtk;
          attacker.buffs.def += ability.buffDef;
          results.push({
            type: 'attack',
            playerId: action.playerId,
            playerName: action.playerName,
            cardName: action.card.name,
            targetName: target.name,
            damage,
            message: `${action.card.name} нанася ${damage} щети и дава +${ability.buffAtk}ATK/+${ability.buffDef}DEF за следващия ход!`
          });
          break;

        case 'smoke_screen':
          damage = Math.max(0, action.effectiveAtk - targetDef);
          target.hp -= damage;
          results.push({
            type: 'attack',
            playerId: action.playerId,
            playerName: action.playerName,
            cardName: action.card.name,
            targetName: target.name,
            damage,
            message: `${action.card.name} пуска димна завеса и нанася ${damage} щети!`
          });
          break;

        case 'reap':
          damage = Math.max(0, action.effectiveAtk - targetDef);
          target.hp -= damage;
          const killed = target.hp <= 0;
          results.push({
            type: 'attack',
            playerId: action.playerId,
            playerName: action.playerName,
            cardName: action.card.name,
            targetName: target.name,
            damage,
            message: killed
              ? `ЖЪТВА! ${action.card.name} елиминира ${target.name} и лекува ${ability.healOnKill} HP!`
              : `${action.card.name} нанася ${damage} щети.`
          });
          if (killed) {
            attacker.hp = Math.min(this.maxHp, attacker.hp + ability.healOnKill);
          }
          break;

        case 'splash':
          damage = Math.max(0, action.effectiveAtk - targetDef);
          target.hp -= damage;
          // Splash to random other alive player
          const otherAlive = this.getAlivePlayers().filter(
            p => p.id !== action.playerId && p.id !== action.targetId
          );
          let splashTarget = null;
          let splashDmg = 0;
          if (otherAlive.length > 0) {
            splashTarget = otherAlive[Math.floor(Math.random() * otherAlive.length)];
            splashDmg = Math.floor(damage * ability.splashMultiplier);
            splashTarget.hp -= splashDmg;
          }
          results.push({
            type: 'attack',
            playerId: action.playerId,
            playerName: action.playerName,
            cardName: action.card.name,
            targetName: target.name,
            damage,
            message: splashTarget
              ? `${action.card.name} нанася ${damage} на ${target.name} и ${splashDmg} на ${splashTarget.name}!`
              : `${action.card.name} нанася ${damage} щети на ${target.name}!`
          });
          break;

        case 'lock':
        case 'aura_debuff':
          // Already handled in pre-resolution, just deal damage
          damage = Math.max(0, action.effectiveAtk - targetDef);
          target.hp -= damage;
          results.push({
            type: 'attack',
            playerId: action.playerId,
            playerName: action.playerName,
            cardName: action.card.name,
            targetName: target.name,
            damage,
            message: `${action.card.name} нанася ${damage} щети на ${target.name}!`
          });
          break;

        default:
          damage = Math.max(0, action.effectiveAtk - targetDef);
          target.hp -= damage;
          results.push({
            type: 'attack',
            playerId: action.playerId,
            playerName: action.playerName,
            cardName: action.card.name,
            targetName: target.name,
            damage,
            message: `${action.card.name} нанася ${damage} щети на ${target.name}!`
          });
      }
    }

    // Remove used cards from hands
    for (const [playerId, action] of this.roundActions) {
      const player = this.players.get(playerId);
      player.hand = player.hand.filter(c => c.id !== action.cardId);
    }

    // Check eliminations
    const eliminations = [];
    for (const [id, player] of this.players) {
      if (player.hp <= 0 && !player.eliminated) {
        player.eliminated = true;
        player.hp = 0;
        eliminations.push({ id, name: player.name });
      }
    }

    // Clear stuns from previous round, apply new stuns
    for (const [id, player] of this.players) {
      if (player.stunned && !this.roundActions.has(id)) {
        // Was stunned this round, clear it for next
        player.stunned = false;
      }
    }

    // Reset round
    this.roundActions.clear();
    this.round++;

    // Check win condition
    const alive = this.getAlivePlayers();
    if (alive.length <= 1) {
      this.state = 'gameOver';
      this.winner = alive.length === 1 ? alive[0] : null;
    }

    // Check if all players have no cards left
    const anyoneHasCards = alive.some(p => p.hand.length > 0);
    if (!anyoneHasCards && alive.length > 1) {
      // Whoever has most HP wins
      this.state = 'gameOver';
      alive.sort((a, b) => b.hp - a.hp);
      this.winner = alive[0];
    }

    return {
      results,
      eliminations,
      round: this.round,
      gameOver: this.state === 'gameOver',
      winner: this.winner ? { id: this.winner.id, name: this.winner.name, hp: this.winner.hp } : null,
      playerStates: this.getPlayerStates()
    };
  }

  getAlivePlayers() {
    return [...this.players.values()].filter(p => !p.eliminated);
  }

  getPlayerHands() {
    const hands = {};
    for (const [id, player] of this.players) {
      hands[id] = player.hand;
    }
    return hands;
  }

  getPlayerStates() {
    const states = {};
    for (const [id, player] of this.players) {
      states[id] = {
        id: player.id,
        name: player.name,
        hp: player.hp,
        maxHp: this.maxHp,
        cardsLeft: player.hand.length,
        eliminated: player.eliminated,
        stunned: player.stunned,
        buffs: { ...player.buffs }
      };
    }
    return states;
  }

  getPublicState() {
    return {
      lobbyCode: this.lobbyCode,
      state: this.state,
      round: this.round,
      playerStates: this.getPlayerStates(),
      hostId: this.hostId,
      winner: this.winner ? { id: this.winner.id, name: this.winner.name } : null
    };
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

module.exports = Game;
