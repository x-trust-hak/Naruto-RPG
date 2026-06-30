// src/jutsuCombo.js
// Jutsu Combo System
//
// CANON ACCURACY:
// — Inspired by team combos seen in the show: Naruto's Wind Rasengan +
//   Sasuke's Fire jutsu, Ino-Shika-Cho formations, Team 7 combination attacks.
// — A combo is two jutsus cast in the SAME round in sequence (first jutsu
//   "sets up", second jutsu "finishes"). The finishing jutsu gets amplified.
// — Combo windows: player marks a jutsu as the "setup" with !combo [n], then
//   on their VERY NEXT turn casts the finisher with !combo [n] again — the
//   bot detects the chain and applies bonus damage automatically.
// — Nature synergy table (canon-reasoned, mirrors the existing nature wheel
//   in natures.js but for AMPLIFICATION rather than weakness):
//     🔥 Fire  + 🌪️ Wind  -> Fire fed by wind = inferno (the most famous combo,
//                            Naruto's Wind Rasengan empowering Sasuke's
//                            Fireball in the anime/fan-favorite synergy)
//     💧 Water + ⚡ Lightning -> Water conducts lightning = electrocution field
//     🌱 Earth + 💧 Water  -> Earth + Water = Mud/swamp, traps then crushes
//     🌪️ Wind  + 🌱 Earth  -> Wind carries earth = sandstorm scouring
//     ⚡ Lightning + 🌪️ Wind -> charged wind slices (Raiton+Fūton storm)
//   Same-nature combos (e.g. Fire+Fire) get a smaller "mastery" bonus instead
//   since there's no canon synergy, just practiced repetition.
//   Untyped (taijutsu/dojutsu) combos get a flat "combo timing" bonus.

// ─── COMBO WINDOW ────────────────────────────────────────────────────────────
// Stored in fight.comboState:
// {
//   setupMove: { name, nature, round } | null,   — the move cast as setup
//   comboCount: N,                                — combos landed this battle (for stats)
// }

function initComboState() {
    return {
        setupMove: null,
        comboCount: 0,
    };
}

// ─── NATURE SYNERGY TABLE ─────────────────────────────────────────────────────
// synergy[A][B] = multiplier when B finishes a combo started with A
// (order-independent — we normalize by sorting the pair)
const SYNERGY_PAIRS = {
    'fire+wind':      { mult: 1.8, label: '🔥🌪️ Inferno Combo!',      desc: 'Wind fuels the flames into a roaring inferno' },
    'lightning+water':{ mult: 1.8, label: '⚡💧 Electrocution Field!', desc: 'Water conducts the lightning across the battlefield' },
    'earth+water':    { mult: 1.6, label: '🌱💧 Swamp Trap Combo!',    desc: 'Earth and water combine into crushing mud' },
    'earth+wind':     { mult: 1.6, label: '🌪️🌱 Sandstorm Combo!',    desc: 'Wind whips the earth into a scouring storm' },
    'lightning+wind': { mult: 1.7, label: '⚡🌪️ Static Slash Combo!',  desc: 'Charged wind cuts like a thousand blades' },
};

const SAME_NATURE_MULT  = 1.35;  // e.g. Fire + Fire — mastery bonus
const UNTYPED_COMBO_MULT = 1.3;  // taijutsu/dojutsu chains — pure timing bonus
const DEFAULT_COMBO_MULT = 1.25; // any other nature pairing — still rewards chaining

function normalizeKey(natureA, natureB) {
    return [natureA, natureB].sort().join('+');
}

function getSynergy(natureA, natureB) {
    if (!natureA && !natureB) {
        return { mult: UNTYPED_COMBO_MULT, label: '👊 Flow Combo!', desc: 'Perfectly timed follow-up strike' };
    }
    if (natureA === natureB) {
        return { mult: SAME_NATURE_MULT, label: `${natureA ? '🔁' : '👊'} Mastery Combo!`, desc: 'Repeated technique hits harder with practiced precision' };
    }
    const key = normalizeKey(natureA || 'none', natureB || 'none');
    if (SYNERGY_PAIRS[key]) return SYNERGY_PAIRS[key];
    return { mult: DEFAULT_COMBO_MULT, label: '✨ Chain Combo!', desc: 'Two techniques landed in perfect sequence' };
}

// ─── SET UP A COMBO ──────────────────────────────────────────────────────────
// Call when a player casts a move with the intent to chain it.
// Stores the move as the "setup" for next turn.
function setComboSetup(fight, moveName, moveNature, round) {
    if (!fight.comboState) fight.comboState = initComboState();
    fight.comboState.setupMove = { name: moveName, nature: moveNature || null, round };
}

// ─── CHECK IF A FINISHER LANDS THE COMBO ─────────────────────────────────────
// Call when resolving a new move. Returns null if no valid combo window,
// or { mult, label, desc, setupName, finisherName } if the combo connects.
// Valid window = setup was cast on the IMMEDIATELY PRECEDING round only.
function checkComboFinish(fight, moveName, moveNature, currentRound) {
    if (!fight.comboState?.setupMove) return null;
    const setup = fight.comboState.setupMove;

    // Combo window is exactly 1 round — setup last round, finisher this round
    if (currentRound - setup.round !== 1) {
        fight.comboState.setupMove = null;  // window expired
        return null;
    }

    const synergy = getSynergy(setup.nature, moveNature);
    fight.comboState.setupMove = null;   // consume the combo
    fight.comboState.comboCount = (fight.comboState.comboCount || 0) + 1;

    return {
        ...synergy,
        setupName: setup.name,
        finisherName: moveName,
    };
}

// ─── CLEAR EXPIRED SETUP ──────────────────────────────────────────────────────
// Call at end of round (after combo check) to expire stale setups that were
// never finished within the window.
function tickComboWindow(fight, currentRound) {
    if (!fight.comboState?.setupMove) return;
    if (currentRound - fight.comboState.setupMove.round >= 1) {
        // Will be checked one more time on the next !use; only clear if
        // it's now more than 1 round old (handled in checkComboFinish too,
        // this is a safety net for moves that don't call checkComboFinish,
        // e.g. weapon jutsu or dojutsu finishers should still consume it).
    }
}

// ─── COMBO LOG LINE ───────────────────────────────────────────────────────────
function comboLogLine(combo) {
    if (!combo) return '';
    return `\n${combo.label}\n_${combo.desc}_\n*${combo.setupName}* → *${combo.finisherName}* — damage ×${combo.mult}!\n`;
}

// ─── COMBO HINT (shown when setup is cast) ───────────────────────────────────
function comboSetupHint(moveName) {
    return `\n🔗 _${moveName} sets up a combo! Land another jutsu NEXT turn to chain it for bonus damage._\n`;
}

// ─── COMBO GUIDE TEXT (for !combo command with no args) ─────────────────────
function comboGuideText() {
    let txt = `🔗 *JUTSU COMBO SYSTEM* 🔗\n\n`;
    txt += `_Chain two jutsus back-to-back for massive bonus damage!_\n\n`;
    txt += `*How it works:*\n`;
    txt += `1️⃣ Cast any jutsu with *!use [n]* — it auto-marks as a combo setup\n`;
    txt += `2️⃣ On your VERY NEXT turn, cast another jutsu — if it lands within 1 round, it's a COMBO!\n`;
    txt += `3️⃣ The finishing jutsu deals bonus damage based on nature synergy\n\n`;
    txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    txt += `🌟 *Best Synergies:*\n\n`;
    txt += `🔥+🌪️ *Fire → Wind:* ×1.8 — Inferno Combo!\n`;
    txt += `⚡+💧 *Lightning → Water:* ×1.8 — Electrocution Field!\n`;
    txt += `🌪️+⚡ *Wind → Lightning:* ×1.7 — Static Slash Combo!\n`;
    txt += `🌱+💧 *Earth → Water:* ×1.6 — Swamp Trap Combo!\n`;
    txt += `🌪️+🌱 *Wind → Earth:* ×1.6 — Sandstorm Combo!\n\n`;
    txt += `🔁 Same nature twice: ×1.35 (Mastery Combo)\n`;
    txt += `👊 No nature (taijutsu/dojutsu): ×1.3 (Flow Combo)\n`;
    txt += `✨ Any other pairing: ×1.25 (Chain Combo)\n\n`;
    txt += `⚠️ *Window is exactly 1 turn* — wait too long and the setup expires!\n`;
    txt += `_Just use !use [n] normally — combos trigger automatically when timed right!_`;
    return txt;
}

module.exports = {
    initComboState,
    setComboSetup,
    checkComboFinish,
    tickComboWindow,
    comboLogLine,
    comboSetupHint,
    comboGuideText,
    getSynergy,
    SYNERGY_PAIRS,
};
