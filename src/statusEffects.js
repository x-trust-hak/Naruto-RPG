// src/statusEffects.js
// Handles the `buff` field already present on 12 jutsus (Sage Mode, Susanoo,
// Tsukuyomi, Water Prison, Kamui, etc). Buff-only jutsus deal 0 damage and
// instead register an effect on the fight state.
//
// Timing rules:
//  - hp        -> instant heal, applied immediately by the caller (not tracked here)
//  - stun      -> lands on the OPPONENT, gates their action starting THIS round
//                 (the round it was cast — there's no "this round's attack" to
//                 retroactively protect since buff jutsus deal 0 damage)
//  - everything else (attack/defense/speed/evasion/reflect) -> buffs the CASTER,
//                 but only takes hold starting NEXT round, never retroactively
//                 boosting/protecting anything in the round it was cast

const DEFAULT_BUFF_DURATION = 3; // rounds

const STAT_KEYS = ['attack', 'defense', 'speed', 'evasion', 'reflect'];

function emptyEffects() {
    return { stun: 0, attack: 0, defense: 0, speed: 0, evasion: 0, reflect: 0, _timers: {} };
}

function initFightEffects() {
    return { self: emptyEffects(), enemy: emptyEffects() };
}

// Register a jutsu's buff object onto the fight state.
// `side` is whoever cast the jutsu; `otherSide` is their opponent's key.
// Works for PvE ('self'/'enemy') and PvP ('p1'/'p2', either order) alike.
// Returns a log line (may be empty string).
function applyBuff(effects, side, otherSide, buff, casterName) {
    if (!buff) return '';
    let line = '';

    if (buff.stun) {
        effects[otherSide].stun += buff.stun;
        line += `😵 ${casterName} is trapped — stunned for ${buff.stun} round${buff.stun > 1 ? 's' : ''}!\n`;
    }

    STAT_KEYS.forEach(stat => {
        if (buff[stat]) {
            effects[side][stat] += buff[stat];
            effects[side]._timers[stat] = Math.max(effects[side]._timers[stat] || 0, DEFAULT_BUFF_DURATION);
            const label = stat === 'reflect' ? `+${buff[stat]}% reflect` : `+${buff[stat]} ${stat}`;
            line += `✨ ${casterName} gains ${label} for ${DEFAULT_BUFF_DURATION} rounds (kicks in next round)\n`;
        }
    });

    return line;
}

function getStatBonus(effects, side, stat) {
    return (effects[side] && effects[side][stat]) || 0;
}

function isStunned(effects, side) {
    return effects[side].stun > 0;
}

// Consume one round of stun (called when that side's action is actually skipped)
function consumeStun(effects, side) {
    if (effects[side].stun > 0) effects[side].stun -= 1;
}

// Call once per completed round for each side — counts down active stat buffs,
// clearing any that expire. Does NOT touch stun (that's consumed separately,
// only on rounds where it actually blocks an action).
function tickStatBuffs(effects, side) {
    const e = effects[side];
    STAT_KEYS.forEach(stat => {
        if (e._timers[stat] > 0) {
            e._timers[stat] -= 1;
            if (e._timers[stat] <= 0) {
                e[stat] = 0;
                delete e._timers[stat];
            }
        }
    });
}

// Apply effects.self bonuses on top of a computed combat-stats object (in place)
function mergeStatBonuses(combatant, effects, side) {
    combatant.attack   += getStatBonus(effects, side, 'attack');
    combatant.defense  += getStatBonus(effects, side, 'defense');
    if (combatant.dodge !== undefined) combatant.dodge += getStatBonus(effects, side, 'evasion');
    return combatant;
}

module.exports = {
    DEFAULT_BUFF_DURATION,
    initFightEffects,
    applyBuff,
    getStatBonus,
    isStunned,
    consumeStun,
    tickStatBuffs,
    mergeStatBonuses,
};
