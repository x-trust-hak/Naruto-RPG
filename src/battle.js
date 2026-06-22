// src/battle.js
// Core combat math + helpers shared by PvE and PvP. The interactive PvE state
// machine lives in case.js (using the activeFights map); this module provides the
// pure functions: clan-buff resolution, effective stats, damage calc, HP bars, and
// a full PvP duel simulator.

const Clan = require('../models/Clan');
const { getCharacter } = require('./characters');
const { natureMultiplier, natureResultLabel } = require('./natures');

// Resolve a user's clan buffs (returns {} if clanless / clan missing)
async function getClanBuffs(user) {
    if (!user.clan || user.clan === 'None') return {};
    try {
        const clan = await Clan.findOne({ nameLower: user.clan.toLowerCase() });
        return clan?.buffs || {};
    } catch {
        return {};
    }
}

// Build the combatant's effective stats from character base + level scaling + clan buffs.
// Clan leaders get a +10% leadership bonus to all combat buffs.
function getEffectiveStats(user, clanBuffs = {}) {
    const char = getCharacter(user.character);
    const b = { ...clanBuffs };

    // Leader leadership bonus
    if (user.clanRole === 'Leader') {
        for (const k in b) b[k] = Math.round(b[k] * 1.1);
    }

    const lvl = user.level || 1;
    const base = char.baseStats;

    const pct = (v, key) => v * (1 + (b[key] || 0) / 100);

    return {
        name:    user.username,
        emoji:   char.emoji,
        charId:  char.id,
        nature:  char.nature || null,
        maxHp:   user.hp.max,
        hp:      user.hp.current,
        maxChakra: user.chakra.max,
        chakra:  user.chakra.current,
        attack:  Math.round(pct(base.attack + (lvl - 1) * 2, 'attack')),
        defense: Math.round(pct(base.defense + (lvl - 1) * 1.5, 'defense')),
        speed:   Math.round(pct(base.speed, 'speed')),
        crit:    base.crit + (b.crit || 0),
        dodge:   b.dodge || 0,
        lifesteal: b.lifesteal || 0,
        jutsus:  char.jutsus,
        passive: char.passive,
    };
}

// 10-segment progress bar
function bar(current, max, fill = '█', empty = '░') {
    const ratio = Math.max(0, Math.min(1, max > 0 ? current / max : 0));
    const filled = Math.round(ratio * 10);
    return fill.repeat(filled) + empty.repeat(10 - filled);
}

function hpBar(current, max)     { return `❤️ [${bar(current, max)}] ${Math.max(0, Math.round(current))}/${max}`; }
function chakraBar(current, max) { return `⚡ [${bar(current, max)}] ${Math.max(0, Math.round(current))}/${max}`; }

// Compute outcome of one offensive action.
// baseDamage > 0 = damage, < 0 = heal (abs). attackNature is the nature of
// the move being used (or null/undefined for untyped moves). Returns
// { dealt, healed, crit, dodged, natureMult, natureLabel }.
function resolveHit(attacker, defender, baseDamage, attackNature = null) {
    // Heal move
    if (baseDamage < 0) {
        return { dealt: 0, healed: Math.abs(baseDamage), crit: false, dodged: false, natureMult: 1, natureLabel: null };
    }

    // Dodge check
    if (Math.random() * 100 < (defender.dodge || 0)) {
        return { dealt: 0, healed: 0, crit: false, dodged: true, natureMult: 1, natureLabel: null };
    }

    // Attack scaling: stronger attacker hits harder
    let dmg = baseDamage * (1 + (attacker.attack - 60) / 200);

    // Defense mitigation
    dmg = dmg * (100 / (100 + (defender.defense || 0)));

    // Nature Transformation matchup (Fire > Wind > Earth > Lightning > Water > Fire)
    const natureMult = natureMultiplier(attackNature, defender.nature);
    dmg *= natureMult;

    // Crit
    let crit = false;
    if (Math.random() * 100 < (attacker.crit || 0)) {
        dmg *= 1.75;
        crit = true;
    }

    // ±10% variance, floor at 1
    dmg *= 0.9 + Math.random() * 0.2;
    dmg = Math.max(1, Math.round(dmg));

    const healed = attacker.lifesteal ? Math.round(dmg * attacker.lifesteal / 100) : 0;
    return { dealt: dmg, healed, crit, dodged: false, natureMult, natureLabel: natureResultLabel(natureMult) };
}

// Enemy AI picks a move (prefers damage, sometimes heals if low).
// ppMap (optional) is { moveName: usesLeft }. Moves at 0 PP are skipped;
// if every move is exhausted, PP is ignored for this pick so the AI never
// gets stuck unable to act.
function enemyChooseMove(enemy, enemyHp, enemyMaxHp, ppMap = null) {
    const allMoves = enemy.enemyMoves || enemy.moves;
    const usable = ppMap ? allMoves.filter(m => (ppMap[m.name] ?? 1) > 0) : allMoves;
    const moves = usable.length ? usable : allMoves;

    const healMoves = moves.filter(m => m.damage < 0);
    if (healMoves.length && enemyHp < enemyMaxHp * 0.35 && Math.random() > 0.4) {
        return healMoves[Math.floor(Math.random() * healMoves.length)];
    }
    const dmgMoves = moves.filter(m => m.damage >= 0);
    const pool = dmgMoves.length ? dmgMoves : moves;
    return pool[Math.floor(Math.random() * pool.length)];
}

// Picks a move for a PvP "Shadow Clone" sparring bot. Unlike enemyChooseMove
// (monster moves, no chakra cost), this respects both PP and chakra budget.
// Returns the chosen jutsu, or null to signal Basic Strike.
function pickPvpBotMove(jutsuList, ppMap, chakraAvailable) {
    const usable = jutsuList.filter(j => (ppMap[j.id] ?? 0) > 0 && j.cost <= chakraAvailable);
    if (!usable.length) return null;
    return usable[Math.floor(Math.random() * usable.length)];
}

module.exports = {
    getClanBuffs,
    getEffectiveStats,
    hpBar,
    chakraBar,
    resolveHit,
    enemyChooseMove,
    pickPvpBotMove,
};
