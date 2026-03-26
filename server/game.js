const { WARRIORS, generateDraftOptions, dealSpells, dealCounters } = require('./cards');

class Game {
  constructor(lobbyCode, hostId) {
    this.lobbyCode = lobbyCode;
    this.hostId = hostId;
    this.players = new Map();
    this.state = 'lobby';
    this.maxHp = 30;

    // Draft
    this.draftOrder = [];
    this.draftIndex = 0;
    this.takenWarriors = new Set();

    // Battle
    this.round = 0;
    this.turnOrder = [];
    this.currentTurnIndex = -1;
    this.initiative = [];
    this.battleLog = [];
    this.winner = null;
  }

  addPlayer(socketId, name) {
    if (this.players.size >= 8) return { error: 'Лобито е пълно!' };
    if (this.state !== 'lobby') return { error: 'Играта вече е започнала!' };
    this.players.set(socketId, {
      id: socketId, name,
      warrior: null,
      hp: this.maxHp,
      spells: [],
      counters: [],
      activeCounter: null,
      buffs: { atk: 0, def: 0, spd: 0 },
      debuffs: { atk: 0 },
      poison: { damage: 0, rounds: 0 },
      stunned: false,
      frozen: false,
      shielded: false,
      eliminated: false
    });
    return { success: true, playerCount: this.players.size };
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player && this.state !== 'lobby') {
      player.eliminated = true;
      player.hp = 0;
    }
    if (this.state === 'lobby') this.players.delete(socketId);
  }

  // ===== DRAFT =====

  startGame() {
    if (this.players.size < 2) return { error: 'Нужни са поне 2 играча!' };
    this.state = 'draft';

    // RNG draft order with dice rolls
    const rolls = [];
    for (const [id, p] of this.players) {
      const roll = Math.floor(Math.random() * 20) + 1;
      rolls.push({ id, name: p.name, roll });
    }
    rolls.sort((a, b) => b.roll - a.roll);
    this.draftOrder = rolls.map(r => r.id);
    this.draftIndex = 0;

    // Generate options for first drafter
    const options = generateDraftOptions(this.takenWarriors);

    return {
      success: true,
      draftRolls: rolls,
      draftOrder: rolls.map(r => ({ id: r.id, name: r.name })),
      currentPicker: this.draftOrder[0],
      options
    };
  }

  getDraftOptions() {
    return generateDraftOptions(this.takenWarriors);
  }

  draftPick(socketId, warriorId) {
    if (this.state !== 'draft') return { error: 'Не сме в драфт!' };
    if (this.draftOrder[this.draftIndex] !== socketId) return { error: 'Не е твой ред!' };
    if (this.takenWarriors.has(warriorId)) return { error: 'Този воин е зает!' };

    const warrior = WARRIORS.find(w => w.id === warriorId);
    if (!warrior) return { error: 'Невалиден воин!' };

    const player = this.players.get(socketId);
    player.warrior = { ...warrior };
    this.takenWarriors.add(warriorId);
    this.draftIndex++;

    const draftComplete = this.draftIndex >= this.players.size;

    if (draftComplete) {
      // Deal spell and counter cards
      for (const [, p] of this.players) {
        p.spells = dealSpells(3);
        p.counters = dealCounters(2);
      }
      this.state = 'battle';
      this.round = 0;
    }

    return {
      success: true,
      warrior,
      pickedBy: socketId,
      pickedByName: player.name,
      draftComplete,
      nextPicker: draftComplete ? null : this.draftOrder[this.draftIndex],
      nextOptions: draftComplete ? null : generateDraftOptions(this.takenWarriors)
    };
  }

  // ===== BATTLE =====

  startRound() {
    this.round++;
    this.battleLog = [];

    // Apply poison at start
    for (const [, p] of this.players) {
      if (p.eliminated) continue;
      if (p.poison.rounds > 0) {
        p.hp -= p.poison.damage;
        p.poison.rounds--;
        this.battleLog.push({ type: 'poison', playerName: p.name, damage: p.poison.damage, message: `☠️ ${p.name} получава ${p.poison.damage} отрова!` });
        if (p.hp <= 0) { p.hp = 0; p.eliminated = true; this.battleLog.push({ type: 'elimination', playerName: p.name, message: `💀 ${p.name} е ЕЛИМИНИРАН от отрова!` }); }
        if (p.poison.rounds <= 0) p.poison = { damage: 0, rounds: 0 };
      }
    }

    // Clear temporary debuffs from last round
    for (const [, p] of this.players) {
      p.debuffs = { atk: 0 };
      if (p.frozen) { p.frozen = false; p.stunned = false; }
    }

    // Roll initiative
    const alive = this.getAlivePlayers();
    this.initiative = alive.map(p => {
      const spdBonus = p.buffs.spd || 0;
      const roll = Math.floor(Math.random() * 6) + 1;
      const total = (p.warrior?.spd || 0) + spdBonus + roll;
      return { id: p.id, name: p.name, spd: p.warrior?.spd || 0, bonus: spdBonus, roll, total };
    });
    this.initiative.sort((a, b) => b.total - a.total);
    this.turnOrder = this.initiative.map(i => i.id);
    this.currentTurnIndex = 0;

    // Skip stunned/frozen players
    this.skipIncapacitated();

    // Clear SPD buffs after initiative
    for (const [, p] of this.players) { p.buffs.spd = 0; }

    // Cosmic burst check
    for (const [, p] of this.players) {
      if (p.eliminated || !p.warrior) continue;
      if (p.warrior.ability.type === 'cosmic_triple' && this.round % 2 === 0) {
        const burstEffect = p.warrior.ability.effects.find(e => e.type === 'burst');
        if (burstEffect) {
          for (const [, target] of this.players) {
            if (target.id !== p.id && !target.eliminated) {
              target.hp -= burstEffect.value;
              if (target.hp <= 0) { target.hp = 0; target.eliminated = true; }
            }
          }
          this.battleLog.push({ type: 'chain', playerName: p.name, message: `🌌 Космическа Троица: ${p.name} нанася ${burstEffect.value} щети на ВСИЧКИ!` });
        }
      }
    }

    return {
      round: this.round,
      initiative: this.initiative,
      turnOrder: this.turnOrder,
      currentTurn: this.turnOrder[this.currentTurnIndex] || null,
      battleLog: this.battleLog,
      playerStates: this.getPlayerStates()
    };
  }

  skipIncapacitated() {
    const alive = this.getAlivePlayers();
    while (this.currentTurnIndex < this.turnOrder.length) {
      const pid = this.turnOrder[this.currentTurnIndex];
      const p = this.players.get(pid);
      if (p && !p.eliminated && !p.stunned) break;
      if (p && p.stunned) {
        this.battleLog.push({ type: 'stunned', playerName: p.name, message: `💫 ${p.name} е зашеметен и пропуска хода!` });
        p.stunned = false;
      }
      this.currentTurnIndex++;
    }
  }

  submitTurn(socketId, targetId, spellUid, counterUid) {
    if (this.state !== 'battle') return { error: 'Не сме в битка!' };
    if (this.turnOrder[this.currentTurnIndex] !== socketId) return { error: 'Не е твой ред!' };

    const attacker = this.players.get(socketId);
    const target = this.players.get(targetId);
    if (!attacker || attacker.eliminated) return { error: 'Елиминиран си!' };
    if (!target || target.eliminated) return { error: 'Невалидна цел!' };
    if (targetId === socketId) return { error: 'Не можеш да атакуваш себе си!' };

    const results = [];
    const warrior = attacker.warrior;
    let spell = null;
    let counter = null;

    // Find and consume spell
    if (spellUid) {
      const idx = attacker.spells.findIndex(s => s.uid === spellUid);
      if (idx !== -1) { spell = attacker.spells.splice(idx, 1)[0]; }
    }

    // Set counter (stays active until triggered)
    if (counterUid) {
      const idx = attacker.counters.findIndex(c => c.uid === counterUid);
      if (idx !== -1) {
        attacker.activeCounter = attacker.counters.splice(idx, 1)[0];
        results.push({ type: 'counter_set', playerName: attacker.name, message: `🛡️ ${attacker.name} подготвя ${attacker.activeCounter.name}!` });
      }
    }

    // Pre-attack spell effects
    let atkBonus = attacker.buffs.atk - attacker.debuffs.atk;
    let defBonus = attacker.buffs.def;
    let doubleHit = false;
    let redirectTarget = null;
    let spellNegated = false;

    if (spell) {
      results.push({ type: 'spell', playerName: attacker.name, spellName: spell.name, icon: spell.icon, message: `${spell.icon} ${attacker.name} използва ${spell.name}!` });

      switch (spell.type) {
        case 'atk_boost': atkBonus += spell.value; break;
        case 'def_boost': defBonus += spell.value; break;
        case 'spd_boost': break; // Already applied at initiative
        case 'heal':
          attacker.hp = Math.min(this.maxHp, attacker.hp + spell.value);
          results.push({ type: 'heal', playerName: attacker.name, heal: spell.value, message: `💚 ${attacker.name} лекува ${spell.value} HP!` });
          break;
        case 'sacrifice':
          attacker.hp -= spell.hpCost;
          atkBonus += spell.atkBonus;
          results.push({ type: 'sacrifice', playerName: attacker.name, message: `🩸 ${attacker.name} жертва ${spell.hpCost} HP за +${spell.atkBonus} ATK!` });
          break;
        case 'double_hit': doubleHit = true; break;
        case 'redirect':
          const others = this.getAlivePlayers().filter(p => p.id !== socketId && p.id !== targetId);
          if (others.length > 0) {
            redirectTarget = others[Math.floor(Math.random() * others.length)];
            results.push({ type: 'redirect', message: `🌀 Порталът пренасочва атаката към ${redirectTarget.name}!` });
          }
          break;
        case 'aoe_damage':
          for (const [, p] of this.players) {
            if (p.id !== socketId && !p.eliminated) {
              p.hp -= spell.value;
              if (p.hp <= 0) { p.hp = 0; p.eliminated = true; }
            }
          }
          results.push({ type: 'chain', message: `🔥 Каскаден Огън нанася ${spell.value} щети на ВСИЧКИ врагове!` });
          break;
        case 'poison':
          target.poison = { damage: spell.value, rounds: spell.duration };
          results.push({ type: 'poison', targetName: target.name, message: `🗡️ ${target.name} е отровен за ${spell.value} щети/${spell.duration} рунда!` });
          break;
        case 'freeze_chain':
          target.frozen = true;
          target.stunned = true;
          const freezeOthers = this.getAlivePlayers().filter(p => p.id !== socketId && p.id !== targetId);
          if (freezeOthers.length > 0) {
            const extra = freezeOthers[Math.floor(Math.random() * freezeOthers.length)];
            extra.frozen = true;
            extra.stunned = true;
            results.push({ type: 'chain', message: `❄️ Ледена Верига замразява ${target.name} и ${extra.name}!` });
          } else {
            results.push({ type: 'chain', message: `❄️ Ледена Верига замразява ${target.name}!` });
          }
          break;
        case 'mass_stun':
          for (const [, p] of this.players) {
            if (p.id !== socketId && !p.eliminated) {
              if (Math.random() < spell.chance) {
                p.stunned = true;
                results.push({ type: 'chain', message: `⛈️ ${p.name} е зашеметен от Мълниена Буря!` });
              }
            }
          }
          break;
        case 'execute':
          if (target.hp / this.maxHp < spell.threshold) {
            atkBonus += spell.bonusDmg;
            results.push({ type: 'execute', message: `🩸 Кървав Ритуал: +${spell.bonusDmg} щети срещу ранен враг!` });
          }
          break;
      }
    }

    // Determine actual target
    const actualTarget = redirectTarget || target;
    const actualTargetPlayer = this.players.get(actualTarget.id) || actualTarget;

    // Check target's counter
    if (actualTargetPlayer.activeCounter && !spellNegated) {
      counter = actualTargetPlayer.activeCounter;
      actualTargetPlayer.activeCounter = null;
    }

    // Check if counter negates spell
    if (counter && counter.type === 'spell_negate' && spell) {
      spellNegated = true;
      atkBonus = attacker.buffs.atk - attacker.debuffs.atk; // Reset to base
      doubleHit = false;
      results.push({ type: 'counter', playerName: actualTargetPlayer.name, message: `🚫 ${actualTargetPlayer.name}: Нулева Зона анулира ${spell.name}!` });
      counter = null; // Used up
    }

    // Calculate damage
    const effectiveAtk = Math.max(0, warrior.atk + atkBonus);
    const targetDef = actualTargetPlayer.warrior ? actualTargetPlayer.warrior.def + (actualTargetPlayer.buffs.def || 0) : 0;

    // Cosmic shield
    let cosmicShield = 0;
    if (actualTargetPlayer.warrior?.ability?.type === 'cosmic_triple') {
      const shieldEffect = actualTargetPlayer.warrior.ability.effects.find(e => e.type === 'shield');
      if (shieldEffect) cosmicShield = shieldEffect.value;
    }

    let baseDamage = Math.max(0, effectiveAtk - targetDef - cosmicShield);

    // Apply warrior ability (attacker)
    const abilityResults = this.applyWarriorAbility(attacker, actualTargetPlayer, baseDamage, spell);
    baseDamage = abilityResults.damage;
    results.push(...abilityResults.results);

    // Check counter effects
    if (counter && !spellNegated) {
      const counterResults = this.applyCounter(counter, attacker, actualTargetPlayer, baseDamage);
      baseDamage = counterResults.damage;
      results.push(...counterResults.results);
    }

    // Apply damage (if not already handled by ability/counter)
    if (!abilityResults.damageHandled && baseDamage > 0) {
      actualTargetPlayer.hp -= baseDamage;
      results.push({ type: 'attack', playerName: attacker.name, targetName: actualTargetPlayer.name, damage: baseDamage, message: `⚔️ ${warrior.name} нанася ${baseDamage} щети на ${actualTargetPlayer.name}!` });
    }

    // Double hit
    if (doubleHit && !spellNegated) {
      const secondDmg = Math.max(0, effectiveAtk - targetDef - cosmicShield);
      actualTargetPlayer.hp -= secondDmg;
      results.push({ type: 'attack', playerName: attacker.name, targetName: actualTargetPlayer.name, damage: secondDmg, message: `⚔️ Двоен Удар! Още ${secondDmg} щети!` });
    }

    // Cosmic drain
    if (warrior.ability.type === 'cosmic_triple') {
      const drainEffect = warrior.ability.effects.find(e => e.type === 'drain');
      if (drainEffect) {
        actualTargetPlayer.hp -= drainEffect.value;
        attacker.hp = Math.min(this.maxHp, attacker.hp + drainEffect.value);
        results.push({ type: 'drain', message: `🌌 Космическа Троица: Краде ${drainEffect.value} HP от ${actualTargetPlayer.name}!` });
      }
    }

    // Spell steal (secret warrior)
    if (warrior.ability.type === 'spell_steal' && actualTargetPlayer.spells.length > 0) {
      const stolenIdx = Math.floor(Math.random() * actualTargetPlayer.spells.length);
      const stolen = actualTargetPlayer.spells.splice(stolenIdx, 1)[0];
      attacker.spells.push(stolen);
      results.push({ type: 'ability', message: `🐟 Рибен Капан: ${attacker.name} краде ${stolen.name} от ${actualTargetPlayer.name}!` });
    }

    // Clear temp buffs for this player
    attacker.buffs = { atk: 0, def: 0, spd: 0 };

    // Check elimination
    if (actualTargetPlayer.hp <= 0) {
      actualTargetPlayer.hp = 0;
      actualTargetPlayer.eliminated = true;
      results.push({ type: 'elimination', playerName: actualTargetPlayer.name, message: `💀 ${actualTargetPlayer.name} е ЕЛИМИНИРАН!` });

      // Reap check
      if (warrior.ability.type === 'reap') {
        attacker.hp = Math.min(this.maxHp, attacker.hp + warrior.ability.healOnKill);
        results.push({ type: 'heal', message: `💀 ЖЪТВА! ${attacker.name} лекува ${warrior.ability.healOnKill} HP!` });
      }
    }

    if (attacker.hp <= 0) {
      attacker.hp = 0;
      attacker.eliminated = true;
      results.push({ type: 'elimination', playerName: attacker.name, message: `💀 ${attacker.name} е ЕЛИМИНИРАН!` });
    }

    // Advance turn
    this.currentTurnIndex++;
    this.skipIncapacitated();

    const roundComplete = this.currentTurnIndex >= this.turnOrder.length;
    let gameOver = false;

    if (roundComplete) {
      // Apply buff_next for players who have it
      for (const [, p] of this.players) {
        if (p.eliminated || !p.warrior) continue;
        if (p.warrior.ability.type === 'buff_next') {
          p.buffs.atk += p.warrior.ability.buffAtk;
          p.buffs.def += p.warrior.ability.buffDef;
        }
      }
    }

    // Check win
    const alive = this.getAlivePlayers();
    if (alive.length <= 1) {
      gameOver = true;
      this.state = 'gameOver';
      this.winner = alive.length === 1 ? alive[0] : null;
    }

    this.battleLog.push(...results);

    return {
      results,
      roundComplete,
      nextTurn: !roundComplete ? this.turnOrder[this.currentTurnIndex] : null,
      gameOver,
      winner: this.winner ? { id: this.winner.id, name: this.winner.name, hp: this.winner.hp } : null,
      playerStates: this.getPlayerStates()
    };
  }

  applyWarriorAbility(attacker, target, damage, spell) {
    const ability = attacker.warrior.ability;
    const results = [];
    let damageHandled = false;

    switch (ability.type) {
      case 'purge':
        target.buffs = { atk: 0, def: 0, spd: 0 };
        target.activeCounter = null;
        results.push({ type: 'ability', message: `✂️ Фризьорски Удар премахва бафовете на ${target.name}!` });
        break;

      case 'drunk_swing':
        if (Math.random() < ability.hitChance) {
          damage = Math.floor(damage * ability.multiplier);
          target.hp -= damage;
          results.push({ type: 'attack', playerName: attacker.name, targetName: target.name, damage, message: `🍺 Пиян Размах УДРЯ за ${damage} щети!` });
        } else {
          damage = 0;
          results.push({ type: 'miss', playerName: attacker.name, message: `🍺 Пиян Размах ПРОМАХВА!` });
        }
        damageHandled = true;
        break;

      case 'lock':
        target.stunned = true;
        results.push({ type: 'ability', message: `🔒 Зад Решетките: ${target.name} пропуска следващия ход!` });
        break;

      case 'aura_debuff':
        target.debuffs.atk += ability.debuffValue;
        results.push({ type: 'ability', message: `😎 Чад Аура: ${target.name} губи ${ability.debuffValue} ATK!` });
        break;

      case 'heal_and_buff':
        attacker.hp = Math.min(this.maxHp, attacker.hp + ability.healValue);
        attacker.buffs.atk += ability.buffValue;
        results.push({ type: 'heal', message: `🍻 На Здраве! ${attacker.name} лекува ${ability.healValue} HP и +${ability.buffValue} ATK!` });
        break;

      case 'full_block':
        attacker.shielded = true;
        results.push({ type: 'ability', message: `🐱 ${attacker.name} вдига Котешки Щит!` });
        break;

      case 'smoke_screen':
        results.push({ type: 'ability', message: `💨 Димна Завеса: атакуващите ${attacker.name} имат 40% промах!` });
        break;

      case 'stun':
        target.stunned = true;
        results.push({ type: 'ability', message: `💫 ${target.name} получава L — зашеметен!` });
        break;

      case 'random_gift':
        if (Math.random() > 0.5) {
          damage += ability.value;
          target.hp -= damage;
          results.push({ type: 'attack', playerName: attacker.name, targetName: target.name, damage, message: `🎄 БОМБА! ${damage} щети!` });
        } else {
          attacker.hp = Math.min(this.maxHp, attacker.hp + ability.value);
          results.push({ type: 'heal', message: `🎄 ЛЕЧЕНИЕ! ${attacker.name} +${ability.value} HP!` });
        }
        damageHandled = true;
        break;

      case 'reflect':
        target.hp -= damage;
        const reflectDmg = Math.floor(damage * ability.value);
        attacker.hp -= reflectDmg;
        results.push({ type: 'attack', playerName: attacker.name, targetName: target.name, damage, message: `⚔️ ${attacker.warrior.name} нанася ${damage} щети!` });
        if (reflectDmg > 0) results.push({ type: 'reflect', message: `🪞 Огледален Удар връща ${reflectDmg} обратно!` });
        damageHandled = true;
        break;

      case 'speed_kill':
        if (this.initiative.length > 0 && this.initiative[0].id === attacker.id) {
          damage = Math.floor(damage * ability.multiplier);
          results.push({ type: 'ability', message: `🎯 360 NO SCOPE! Тройни щети!` });
        }
        break;

      case 'copy_ability':
        if (target.warrior) {
          results.push({ type: 'ability', message: `💻 Хакерска Атака: копира ${target.warrior.ability.name}!` });
        }
        break;

      case 'gamble':
        if (Math.random() < ability.chance) {
          damage *= 2;
          target.hp -= damage;
          results.push({ type: 'attack', playerName: attacker.name, targetName: target.name, damage, message: `🎰 ПЕЧЕЛИВШ ЗАЛОГ! ${damage} двойни щети!` });
        } else {
          target.hp = Math.min(this.maxHp, target.hp + damage);
          results.push({ type: 'heal_enemy', message: `🎰 ЗАГУБЕН ЗАЛОГ! Лекува ${target.name} за ${damage}!` });
        }
        damageHandled = true;
        break;

      case 'splash':
        target.hp -= damage;
        results.push({ type: 'attack', playerName: attacker.name, targetName: target.name, damage, message: `⚔️ ${attacker.warrior.name} нанася ${damage} на ${target.name}!` });
        const others = this.getAlivePlayers().filter(p => p.id !== attacker.id && p.id !== target.id);
        if (others.length > 0) {
          const splashTarget = others[Math.floor(Math.random() * others.length)];
          const splashDmg = Math.floor(damage * ability.splashMultiplier);
          splashTarget.hp -= splashDmg;
          if (splashTarget.hp <= 0) { splashTarget.hp = 0; splashTarget.eliminated = true; }
          results.push({ type: 'chain', message: `💥 Мафиотски Удар: ${splashDmg} щети и на ${splashTarget.name}!` });
        }
        damageHandled = true;
        break;

      case 'desperation':
        const hpPct = attacker.hp / this.maxHp;
        let bonus = 0;
        for (const t of ability.thresholds) {
          if (hpPct <= t.percent) bonus = Math.max(bonus, t.bonus);
        }
        if (bonus > 0) {
          damage += bonus;
          results.push({ type: 'ability', message: `🔥 Последен Шанс: +${bonus} ATK!` });
        }
        break;
    }

    return { damage, results, damageHandled };
  }

  applyCounter(counter, attacker, target, damage) {
    const results = [];

    switch (counter.type) {
      case 'reflect':
        const reflectDmg = Math.floor(damage * counter.value);
        attacker.hp -= reflectDmg;
        results.push({ type: 'counter', playerName: target.name, message: `🪞 Огледална Стена! ${reflectDmg} щети обратно на ${attacker.name}!` });
        break;

      case 'dodge':
        if (Math.random() < counter.chance) {
          damage = 0;
          results.push({ type: 'counter', playerName: target.name, message: `💨 Фазово Изместване! ${target.name} избягва атаката!` });
        } else {
          results.push({ type: 'counter', playerName: target.name, message: `💨 Фазово Изместване... НЕУСПЕШНО!` });
        }
        break;

      case 'absorb':
        const absorbed = Math.min(damage, counter.maxAbsorb);
        damage -= absorbed;
        target.hp = Math.min(this.maxHp, target.hp + absorbed);
        results.push({ type: 'counter', playerName: target.name, message: `💚 Абсорбция! ${target.name} превръща ${absorbed} щети в HP!` });
        break;

      case 'vengeance':
        const vengDmg = damage * counter.multiplier;
        attacker.hp -= vengDmg;
        results.push({ type: 'counter', playerName: target.name, message: `⚡ Мъстителен Удар! ${attacker.name} получава ${vengDmg} обратно!` });
        break;

      case 'chain_react':
        if (damage >= counter.threshold) {
          for (const [, p] of this.players) {
            if (p.id !== target.id && !p.eliminated) {
              p.hp -= counter.damage;
              if (p.hp <= 0) { p.hp = 0; p.eliminated = true; }
            }
          }
          results.push({ type: 'chain', message: `💥 Верижна Реакция! ${counter.damage} щети на ВСИЧКИ!` });
        }
        break;
    }

    return { damage, results };
  }

  // ===== HELPERS =====

  getAlivePlayers() {
    return [...this.players.values()].filter(p => !p.eliminated);
  }

  getPlayerStates() {
    const states = {};
    for (const [id, p] of this.players) {
      states[id] = {
        id: p.id, name: p.name, hp: p.hp, maxHp: this.maxHp,
        warrior: p.warrior ? { id: p.warrior.id, name: p.warrior.name, title: p.warrior.title, image: p.warrior.image, rarity: p.warrior.rarity, atk: p.warrior.atk, def: p.warrior.def, spd: p.warrior.spd, ability: p.warrior.ability } : null,
        spellCount: p.spells.length,
        counterCount: p.counters.length,
        hasCounter: !!p.activeCounter,
        eliminated: p.eliminated,
        stunned: p.stunned,
        frozen: p.frozen,
        poisoned: p.poison.rounds > 0,
        shielded: p.shielded,
        buffs: { ...p.buffs }
      };
    }
    return states;
  }

  getPlayerPrivateState(socketId) {
    const p = this.players.get(socketId);
    if (!p) return null;
    return {
      spells: p.spells,
      counters: p.counters,
      activeCounter: p.activeCounter
    };
  }

  getPublicState() {
    return {
      lobbyCode: this.lobbyCode, state: this.state, round: this.round,
      playerStates: this.getPlayerStates(), hostId: this.hostId,
      winner: this.winner ? { id: this.winner.id, name: this.winner.name } : null,
      currentTurn: this.turnOrder[this.currentTurnIndex] || null
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
