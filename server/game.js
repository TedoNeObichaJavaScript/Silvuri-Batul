const { WARRIORS, generateDraftOptions, dealSpells, dealCounters } = require('./cards');

class Game {
  constructor(lobbyCode, hostId) {
    this.lobbyCode = lobbyCode;
    this.hostId = hostId;
    this.players = new Map();
    this.state = 'lobby';
    this.maxHp = 40;

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

    // Counter-on-attack flow
    this.pendingAttack = null;
    this.counterTimeoutId = null;

    // Turn timer
    this.turnTimeoutId = null;
    this.turnTimeLimit = 30000; // 30 seconds
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
      buffs: { atk: 0, def: 0 },
      permanentBuffs: { atk: 0, def: 0 },
      debuffs: { atk: 0 },
      poison: { damage: 0, rounds: 0 },
      atkReduction: { multiplier: 1, rounds: 0 },
      stunned: false,
      frozen: false,
      shielded: false,
      silenced: 0,
      immune: false,
      bans: 0,
      banned: false,
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
    if (this.takenWarriors.has(warriorId)) return { error: 'Този силвър е зает!' };

    const warrior = WARRIORS.find(w => w.id === warriorId);
    if (!warrior) return { error: 'Невалиден силвър!' };

    const player = this.players.get(socketId);
    player.warrior = { ...warrior };
    this.takenWarriors.add(warriorId);
    this.draftIndex++;

    const draftComplete = this.draftIndex >= this.players.size;

    if (draftComplete) {
      // Deal 2 spells and 1 counter initially
      for (const [, p] of this.players) {
        p.spells = dealSpells(2);
        p.counters = dealCounters(1);
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

    // Deal +1 spell and +1 counter each round (stacking)
    for (const [, p] of this.players) {
      if (p.eliminated) continue;
      p.spells.push(...dealSpells(1));
      p.counters.push(...dealCounters(1));
    }

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

    // Clear temporary debuffs, immunity, decrement silence, decay ATK reduction
    for (const [, p] of this.players) {
      p.debuffs = { atk: 0 };
      p.immune = false;
      if (p.frozen) { p.frozen = false; }
      if (p.silenced > 0) { p.silenced--; }
      if (p.atkReduction.rounds > 0) {
        p.atkReduction.rounds--;
        if (p.atkReduction.rounds <= 0) {
          p.atkReduction = { multiplier: 1, rounds: 0 };
        }
      }
    }

    // Roll initiative (pure d6, no SPD)
    const alive = this.getAlivePlayers();
    this.initiative = alive.map(p => {
      const roll = Math.floor(Math.random() * 6) + 1;
      return { id: p.id, name: p.name, roll, total: roll };
    });
    this.initiative.sort((a, b) => b.total - a.total);
    this.turnOrder = this.initiative.map(i => i.id);
    this.currentTurnIndex = 0;

    // Skip stunned/frozen players
    this.skipIncapacitated();

    // Owner card: Пролетно Разчистване (every 3 rounds)
    for (const [, p] of this.players) {
      if (p.eliminated || !p.warrior) continue;
      if (p.warrior.ability.type === 'owner_admin' && this.round > 1 && this.round % 3 === 0) {
        const springCleaning = p.warrior.ability.effects.find(e => e.type === 'spring_cleaning');
        if (springCleaning) {
          for (const [, target] of this.players) {
            if (target.id !== p.id && !target.eliminated) {
              target.silenced = Math.max(target.silenced, springCleaning.silenceDuration);
            }
          }
          p.atkReduction = { multiplier: springCleaning.atkReduction, rounds: springCleaning.silenceDuration };
          this.battleLog.push({ type: 'ability', playerName: p.name, message: `🔨 Пролетно Разчистване: ${p.name} заглушава ВСИЧКИ за ${springCleaning.silenceDuration} рунда! (50% ATK)` });
        }
      }
    }

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

    // Check if poison or cosmic burst ended the game
    const aliveAfter = this.getAlivePlayers();
    let gameOver = false;
    if (aliveAfter.length <= 1) {
      gameOver = true;
      this.state = 'gameOver';
      this.winner = aliveAfter.length === 1 ? aliveAfter[0] : null;
    }

    return {
      round: this.round,
      initiative: this.initiative,
      turnOrder: this.turnOrder,
      currentTurn: this.turnOrder[this.currentTurnIndex] || null,
      battleLog: this.battleLog,
      playerStates: this.getPlayerStates(),
      gameOver,
      winner: this.winner ? { id: this.winner.id, name: this.winner.name, hp: this.winner.hp } : null
    };
  }

  skipIncapacitated() {
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

  // Phase 1: Attacker submits action (spell effects resolve, then check for counter prompt)
  submitTurn(socketId, targetId, spellUid) {
    if (this.state !== 'battle') return { error: 'Не сме в битка!' };
    if (this.turnOrder[this.currentTurnIndex] !== socketId) return { error: 'Не е твой ред!' };

    const attacker = this.players.get(socketId);
    const target = this.players.get(targetId);
    if (!attacker || attacker.eliminated) return { error: 'Елиминиран си!' };
    if (!target || target.eliminated) return { error: 'Невалидна цел!' };
    if (targetId === socketId) return { error: 'Не можеш да атакуваш себе си!' };
    // Immunity check — skip if ALL other alive players are immune (no valid targets)
    if (target.immune) {
      const allImmune = this.getAlivePlayers()
        .filter(p => p.id !== socketId)
        .every(p => p.immune);
      if (!allImmune) return { error: 'Тази цел е имунна този рунд!' };
      // All targets immune → allow attack (edge case fallback)
    }

    const results = [];
    const warrior = attacker.warrior;
    let spell = null;

    // Find and consume spell (only if not silenced)
    if (spellUid && attacker.silenced <= 0) {
      const idx = attacker.spells.findIndex(s => s.uid === spellUid);
      if (idx !== -1) { spell = attacker.spells.splice(idx, 1)[0]; }
    } else if (spellUid && attacker.silenced > 0) {
      results.push({ type: 'silence', playerName: attacker.name, message: `🔇 ${attacker.name} е заглушен и не може да използва магии!` });
    }

    // Pre-attack spell effects
    let atkBonus = attacker.buffs.atk - attacker.debuffs.atk;
    let defBonus = attacker.buffs.def;
    let doubleHit = false;
    let redirectTarget = null;

    if (spell) {
      results.push({ type: 'spell', playerName: attacker.name, spellName: spell.name, iconColor: spell.iconColor, message: `✦ ${attacker.name} използва ${spell.name}!` });

      switch (spell.type) {
        case 'atk_boost': atkBonus += spell.value; break;
        case 'def_boost': defBonus += spell.value; break;
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
            results.push({ type: 'redirect', message: `🥀 пепел от рози пренасочва атаката към ${redirectTarget.name}!` });
          }
          break;
        case 'aoe_damage':
          for (const [, p] of this.players) {
            if (p.id !== socketId && !p.eliminated) {
              const aoeDef = p.warrior ? p.warrior.def + (p.buffs.def || 0) + (p.permanentBuffs.def || 0) : 0;
              const aoeDmg = Math.max(1, spell.value - aoeDef);
              p.hp -= aoeDmg;
              if (p.hp <= 0) { p.hp = 0; p.eliminated = true; }
            }
          }
          results.push({ type: 'chain', message: `☢️ Умирайте всички нанася ${spell.value} щети на ВСИЧКИ врагове!` });
          break;
        case 'poison':
          target.poison = { damage: spell.value, rounds: spell.duration };
          results.push({ type: 'poison', targetName: target.name, message: `🧪 ${target.name} е отровен за ${spell.value} щети/${spell.duration} рунда!` });
          break;
        case 'freeze_chain':
          target.frozen = true;
          target.stunned = true;
          const freezeOthers = this.getAlivePlayers().filter(p => p.id !== socketId && p.id !== targetId);
          if (freezeOthers.length > 0) {
            const extra = freezeOthers[Math.floor(Math.random() * freezeOthers.length)];
            extra.frozen = true;
            extra.stunned = true;
            results.push({ type: 'chain', message: `✋ стоп игра замразява ${target.name} и ${extra.name}!` });
          } else {
            results.push({ type: 'chain', message: `✋ стоп игра замразява ${target.name}!` });
          }
          break;
        case 'mass_stun':
          for (const [, p] of this.players) {
            if (p.id !== socketId && !p.eliminated) {
              if (Math.random() < spell.chance) {
                p.stunned = true;
                results.push({ type: 'chain', message: `🧨 ${p.name} е зашеметен от бум!` });
              }
            }
          }
          break;
        case 'execute':
          if (target.hp / this.maxHp < spell.threshold) {
            atkBonus += spell.bonusDmg;
            results.push({ type: 'execute', message: `🎴 играта на дявола: +${spell.bonusDmg} щети срещу ранен враг!` });
          }
          break;
      }
    }

    // Determine actual target (after redirect)
    const actualTarget = redirectTarget || target;
    const actualTargetId = actualTarget.id || actualTarget;
    const actualTargetPlayer = this.players.get(actualTargetId) || actualTarget;

    // Owner card: Timeout ability (silence target + bonus dmg on every attack)
    if (warrior.ability.type === 'owner_admin') {
      const timeout = warrior.ability.effects.find(e => e.type === 'timeout');
      if (timeout) {
        actualTargetPlayer.silenced = Math.max(actualTargetPlayer.silenced, timeout.silenceDuration);
        atkBonus += timeout.bonusDmg;
        results.push({ type: 'ability', message: `⏱️ Timeout: ${actualTargetPlayer.name} е заглушен за ${timeout.silenceDuration} рунд! +${timeout.bonusDmg} DMG!` });
      }
    }

    // Store pending attack for counter resolution
    this.pendingAttack = {
      attackerId: socketId,
      targetId: actualTargetPlayer.id,
      spell,
      atkBonus,
      defBonus,
      doubleHit,
      preResults: results,
      warrior
    };

    // Check if target has counters available
    if (actualTargetPlayer.counters.length > 0 && !actualTargetPlayer.eliminated) {
      return {
        waitingForCounter: true,
        targetId: actualTargetPlayer.id,
        attackerName: attacker.name,
        attackerWarrior: attacker.warrior ? { id: attacker.warrior.id, name: attacker.warrior.name, image: attacker.warrior.image, rarity: attacker.warrior.rarity } : null,
        spellUsed: spell ? { name: spell.name, icon: spell.icon, iconColor: spell.iconColor, type: spell.type } : null
      };
    }

    // No counters available, resolve immediately
    return this.resolveTurn(null);
  }

  // Phase 2: Resolve the turn (with or without counter)
  resolveTurn(counterUid) {
    if (!this.pendingAttack) return { error: 'Няма чакаща атака!' };
    const pending = this.pendingAttack;
    this.pendingAttack = null;

    const attacker = this.players.get(pending.attackerId);
    const actualTargetPlayer = this.players.get(pending.targetId);
    const results = [...pending.preResults];
    let { atkBonus, defBonus, doubleHit, spell, warrior } = pending;
    let spellNegated = false;

    // Apply counter if provided
    let counter = null;
    if (counterUid) {
      const idx = actualTargetPlayer.counters.findIndex(c => c.uid === counterUid);
      if (idx !== -1) {
        counter = actualTargetPlayer.counters.splice(idx, 1)[0];
        results.push({ type: 'counter_played', playerName: actualTargetPlayer.name, counterName: counter.name, icon: counter.icon, iconColor: counter.iconColor, message: `${counter.icon} ${actualTargetPlayer.name} играе ${counter.name}!` });
      }
    }

    // Check if counter negates spell
    if (counter && counter.type === 'spell_negate' && spell) {
      spellNegated = true;
      atkBonus = attacker.buffs.atk - attacker.debuffs.atk;
      doubleHit = false;
      results.push({ type: 'counter', playerName: actualTargetPlayer.name, message: `✖️ ${actualTargetPlayer.name}: няма такива анулира ${spell.name}!` });
      counter = null;
    }

    // Full block check (Борко с Котка shield)
    if (actualTargetPlayer.shielded) {
      actualTargetPlayer.shielded = false;
      results.push({ type: 'ability', message: `🐱 Котешки Щит блокира НАПЪЛНО атаката на ${attacker.name}!` });

      // Still advance turn
      attacker.buffs = { atk: 0, def: 0 };
      if (!actualTargetPlayer.eliminated) actualTargetPlayer.immune = true;
      this.currentTurnIndex++;
      this.skipIncapacitated();
      const roundComplete = this.currentTurnIndex >= this.turnOrder.length;
      if (roundComplete) {
        for (const [, p] of this.players) {
          if (p.eliminated || !p.warrior) continue;
          if (p.warrior.ability.type === 'buff_next') {
            p.buffs.atk += p.warrior.ability.buffAtk;
            p.buffs.def += p.warrior.ability.buffDef;
          }
        }
      }
      const alive = this.getAlivePlayers();
      let gameOver = false;
      if (alive.length <= 1) { gameOver = true; this.state = 'gameOver'; this.winner = alive.length === 1 ? alive[0] : null; }
      this.battleLog.push(...results);
      return {
        action: { attackerId: pending.attackerId, attackerName: attacker.name, attackerWarrior: attacker.warrior ? { id: attacker.warrior.id, name: attacker.warrior.name, image: attacker.warrior.image, rarity: attacker.warrior.rarity } : null, targetId: actualTargetPlayer.id, targetName: actualTargetPlayer.name, targetWarrior: actualTargetPlayer.warrior ? { id: actualTargetPlayer.warrior.id, name: actualTargetPlayer.warrior.name, image: actualTargetPlayer.warrior.image, rarity: actualTargetPlayer.warrior.rarity } : null, spell: spell ? { name: spell.name, icon: spell.icon, iconColor: spell.iconColor, type: spell.type } : null, counter: counter ? { name: counter.name, icon: counter.icon, iconColor: counter.iconColor, type: counter.type } : null },
        results, roundComplete, nextTurn: !roundComplete ? this.turnOrder[this.currentTurnIndex] : null, gameOver,
        winner: this.winner ? { id: this.winner.id, name: this.winner.name, hp: this.winner.hp } : null,
        playerStates: this.getPlayerStates()
      };
    }

    // Smoke screen miss check (Сашко с Цигари passive)
    if (actualTargetPlayer.warrior?.ability?.type === 'smoke_screen') {
      if (Math.random() < actualTargetPlayer.warrior.ability.missChance) {
        results.push({ type: 'miss', playerName: attacker.name, message: `💨 Димна Завеса! ${attacker.name} промахва ${actualTargetPlayer.name}!` });

        attacker.buffs = { atk: 0, def: 0 };
        if (!actualTargetPlayer.eliminated) actualTargetPlayer.immune = true;
        this.currentTurnIndex++;
        this.skipIncapacitated();
        const roundComplete = this.currentTurnIndex >= this.turnOrder.length;
        if (roundComplete) {
          for (const [, p] of this.players) {
            if (p.eliminated || !p.warrior) continue;
            if (p.warrior.ability.type === 'buff_next') {
              p.buffs.atk += p.warrior.ability.buffAtk;
              p.buffs.def += p.warrior.ability.buffDef;
            }
          }
        }
        const alive = this.getAlivePlayers();
        let gameOver = false;
        if (alive.length <= 1) { gameOver = true; this.state = 'gameOver'; this.winner = alive.length === 1 ? alive[0] : null; }
        this.battleLog.push(...results);
        return {
          action: { attackerId: pending.attackerId, attackerName: attacker.name, attackerWarrior: attacker.warrior ? { id: attacker.warrior.id, name: attacker.warrior.name, image: attacker.warrior.image, rarity: attacker.warrior.rarity } : null, targetId: actualTargetPlayer.id, targetName: actualTargetPlayer.name, targetWarrior: actualTargetPlayer.warrior ? { id: actualTargetPlayer.warrior.id, name: actualTargetPlayer.warrior.name, image: actualTargetPlayer.warrior.image, rarity: actualTargetPlayer.warrior.rarity } : null, spell: spell ? { name: spell.name, icon: spell.icon, iconColor: spell.iconColor, type: spell.type } : null, counter: counter ? { name: counter.name, icon: counter.icon, iconColor: counter.iconColor, type: counter.type } : null },
          results, roundComplete, nextTurn: !roundComplete ? this.turnOrder[this.currentTurnIndex] : null, gameOver,
          winner: this.winner ? { id: this.winner.id, name: this.winner.name, hp: this.winner.hp } : null,
          playerStates: this.getPlayerStates()
        };
      } else {
        results.push({ type: 'ability', message: `💨 Димна Завеса не спасява ${actualTargetPlayer.name}!` });
      }
    }

    // Calculate damage
    const reductionMultiplier = attacker.atkReduction?.multiplier || 1;
    const effectiveAtk = Math.max(0, Math.floor((warrior.atk + atkBonus + attacker.permanentBuffs.atk) * reductionMultiplier));
    let targetDef = actualTargetPlayer.warrior ? actualTargetPlayer.warrior.def + (actualTargetPlayer.buffs.def || 0) + (actualTargetPlayer.permanentBuffs.def || 0) + defBonus : 0;

    // Armor pierce (Борко Мусашито)
    if (warrior.ability.type === 'armor_pierce') {
      targetDef = Math.floor(targetDef * (1 - warrior.ability.piercePercent));
      results.push({ type: 'ability', message: `⚔️ Самурайски Удар игнорира 50% от DEF!` });
    }

    // Cosmic shield
    let cosmicShield = 0;
    if (actualTargetPlayer.warrior?.ability?.type === 'cosmic_triple') {
      const shieldEffect = actualTargetPlayer.warrior.ability.effects.find(e => e.type === 'shield');
      if (shieldEffect) cosmicShield = shieldEffect.value;
    }

    let baseDamage = Math.max(1, effectiveAtk - targetDef - cosmicShield);

    // Guaranteed damage override (Борко Потвърждава)
    if (warrior.ability.type === 'guaranteed_dmg') {
      baseDamage = Math.max(warrior.ability.minDamage, baseDamage);
    }

    // Apply warrior ability (attacker)
    const abilityResults = this.applyWarriorAbility(attacker, actualTargetPlayer, baseDamage, spell);
    baseDamage = abilityResults.damage;
    results.push(...abilityResults.results);

    // Check counter effects (if not spell_negate which was already handled)
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
      const secondDmg = Math.max(1, effectiveAtk - targetDef - cosmicShield);
      actualTargetPlayer.hp -= secondDmg;
      results.push({ type: 'attack', playerName: attacker.name, targetName: actualTargetPlayer.name, damage: secondDmg, message: `🤜 ляв десен! Още ${secondDmg} щети!` });
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

    // Counter steal (Вики Слуша)
    if (warrior.ability.type === 'counter_steal' && actualTargetPlayer.counters.length > 0) {
      const stolenIdx = Math.floor(Math.random() * actualTargetPlayer.counters.length);
      const stolen = actualTargetPlayer.counters.splice(stolenIdx, 1)[0];
      attacker.counters.push(stolen);
      results.push({ type: 'ability', message: `👂 Подслушване: ${attacker.name} краде ${stolen.name} от ${actualTargetPlayer.name}!` });
    }

    // Ram bonus (Теодор Колата)
    if (warrior.ability.type === 'ram' && !abilityResults.damageHandled) {
      const ramBonus = Math.floor(actualTargetPlayer.hp * warrior.ability.hpPercent);
      if (ramBonus > 0) {
        actualTargetPlayer.hp -= ramBonus;
        results.push({ type: 'ability', message: `🚗 Газ до Дупка: +${ramBonus} бонус щети!` });
      }
    }

    // Clear temp buffs for this player
    attacker.buffs = { atk: 0, def: 0 };

    // Grant immunity to the attacked target (can't be attacked again this round)
    if (!actualTargetPlayer.eliminated) {
      actualTargetPlayer.immune = true;
    }

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

      // Banhammer check (Owner card)
      if (warrior.ability.type === 'owner_admin') {
        const banhammer = warrior.ability.effects.find(e => e.type === 'banhammer');
        if (banhammer) {
          attacker.permanentBuffs.atk += banhammer.atkPerKill;
          attacker.permanentBuffs.def += banhammer.defPerKill;
          attacker.bans++;
          actualTargetPlayer.banned = true;
          results.push({ type: 'ban', playerName: actualTargetPlayer.name, message: `🔨 BANHAMMER! ${actualTargetPlayer.name} е БАННАТ! ${attacker.name} +${banhammer.atkPerKill} ATK +${banhammer.defPerKill} DEF!` });
        }
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
      action: {
        attackerId: pending.attackerId,
        attackerName: attacker.name,
        attackerWarrior: attacker.warrior ? { id: attacker.warrior.id, name: attacker.warrior.name, image: attacker.warrior.image, rarity: attacker.warrior.rarity } : null,
        targetId: actualTargetPlayer.id,
        targetName: actualTargetPlayer.name,
        targetWarrior: actualTargetPlayer.warrior ? { id: actualTargetPlayer.warrior.id, name: actualTargetPlayer.warrior.name, image: actualTargetPlayer.warrior.image, rarity: actualTargetPlayer.warrior.rarity } : null,
        spell: spell ? { name: spell.name, icon: spell.icon, iconColor: spell.iconColor, type: spell.type } : null,
        counter: counter ? { name: counter.name, icon: counter.icon, iconColor: counter.iconColor, type: counter.type } : null
      },
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
        target.buffs = { atk: 0, def: 0 };
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
        // Passive: checked in resolveTurn when this warrior is the target
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
          results.push({ type: 'ability', message: `🎯 360 NO SCOPE! Двойни щети!` });
        }
        break;

      case 'copy_ability':
        if (target.warrior && target.warrior.ability) {
          const copiedAbility = target.warrior.ability;
          results.push({ type: 'ability', message: `💻 Хакерска Атака: копира ${copiedAbility.name}!` });
          // Temporarily swap ability and recurse (skip copy/owner/cosmic to prevent loops)
          const skipTypes = ['copy_ability', 'owner_admin', 'cosmic_triple'];
          if (!skipTypes.includes(copiedAbility.type)) {
            const originalAbility = attacker.warrior.ability;
            attacker.warrior.ability = copiedAbility;
            const copied = this.applyWarriorAbility(attacker, target, damage, spell);
            attacker.warrior.ability = originalAbility;
            damage = copied.damage;
            damageHandled = copied.damageHandled;
            results.push(...copied.results);
          }
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

      case 'jackpot': {
        const roll = Math.floor(Math.random() * 6) + 1;
        if (roll === 1) {
          damage = 0;
          results.push({ type: 'miss', playerName: attacker.name, message: `🎰 Джакпот ролва ${roll} — ПРОМАХ!` });
        } else if (roll <= 3) {
          results.push({ type: 'ability', message: `🎰 Джакпот ролва ${roll} — нормален удар.` });
        } else if (roll <= 5) {
          damage = Math.floor(damage * 1.5);
          results.push({ type: 'ability', message: `🎰 Джакпот ролва ${roll} — +50% щети!` });
        } else {
          damage = damage * 2;
          results.push({ type: 'ability', message: `🎰 Джакпот ролва 6 — ДВОЙНИ ЩЕТИ!` });
        }
        target.hp -= damage;
        if (damage > 0) {
          results.push({ type: 'attack', playerName: attacker.name, targetName: target.name, damage, message: `⚔️ ${attacker.warrior.name} нанася ${damage} щети!` });
        }
        damageHandled = true;
        break;
      }

      // guaranteed_dmg, armor_pierce, counter_steal, ram, owner_admin are handled elsewhere
    }

    return { damage, results, damageHandled };
  }

  applyCounter(counter, attacker, target, damage) {
    const results = [];

    switch (counter.type) {
      case 'reflect':
        const reflectDmg = Math.floor(damage * counter.value);
        attacker.hp -= reflectDmg;
        results.push({ type: 'counter', playerName: target.name, message: `🪃 поемай! ${reflectDmg} щети обратно на ${attacker.name}!` });
        break;

      case 'dodge':
        if (Math.random() < counter.chance) {
          damage = 0;
          results.push({ type: 'counter', playerName: target.name, message: `🌪️ фиууу! ${target.name} избягва атаката!` });
        } else {
          results.push({ type: 'counter', playerName: target.name, message: `🌪️ фиууу... НЕУСПЕШНО!` });
        }
        break;

      case 'absorb':
        const absorbed = Math.min(damage, counter.maxAbsorb);
        damage -= absorbed;
        target.hp = Math.min(this.maxHp, target.hp + absorbed);
        results.push({ type: 'counter', playerName: target.name, message: `🍺 почерпка! ${target.name} превръща ${absorbed} щети в HP!` });
        break;

      case 'vengeance':
        const vengDmg = Math.min(damage * counter.multiplier, counter.maxReturn || 15);
        attacker.hp -= vengDmg;
        results.push({ type: 'counter', playerName: target.name, message: `🔄 всичко се връща! ${attacker.name} получава ${vengDmg} обратно!` });
        break;

      case 'chain_react':
        if (damage >= counter.threshold) {
          for (const [, p] of this.players) {
            if (p.id !== target.id && !p.eliminated) {
              p.hp -= counter.damage;
              if (p.hp <= 0) { p.hp = 0; p.eliminated = true; }
            }
          }
          results.push({ type: 'chain', message: `⚡ един за всички! ${counter.damage} щети на ВСИЧКИ!` });
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
        warrior: p.warrior ? {
          id: p.warrior.id, name: p.warrior.name, title: p.warrior.title,
          image: p.warrior.image, rarity: p.warrior.rarity,
          atk: p.warrior.atk, def: p.warrior.def,
          ability: p.warrior.ability
        } : null,
        spellCount: p.spells.length,
        counterCount: p.counters.length,
        eliminated: p.eliminated,
        stunned: p.stunned,
        frozen: p.frozen,
        poisoned: p.poison.rounds > 0,
        shielded: p.shielded,
        silenced: p.silenced > 0,
        immune: p.immune,
        banned: p.banned,
        bans: p.bans,
        buffs: { ...p.buffs },
        permanentBuffs: { ...p.permanentBuffs }
      };
    }
    return states;
  }

  getPlayerPrivateState(socketId) {
    const p = this.players.get(socketId);
    if (!p) return null;
    return {
      spells: p.spells,
      counters: p.counters
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
