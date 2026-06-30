// src/hospital.js
// Hospital System — HP recovery outside of items.
//
// CANON FLAVOR: Every village has a hospital (Sakura, Tsunade, and Shizune
// all work in Konoha's hospital). Injured ninja either rest naturally or
// pay for treatment to get back into action faster.
//
// Two recovery paths:
// 1. !rest — passive natural recovery. No cost, but takes real time
//    (1 hour = 200 HP regenerated, capped at max HP). Can check in anytime
//    to collect what's regenerated so far, or wait for a full heal.
// 2. !hospital heal — instant full HP restore for Ryo, scaled to how much
//    HP is missing (cheaper for minor injuries, expensive for near-death).

// ─── REST RECOVERY RATE ──────────────────────────────────────────────────────
const REST_HP_PER_HOUR = 200;

// ─── HOSPITAL TREATMENT COST ─────────────────────────────────────────────────
// Cost scales with % HP missing — a ninja at 95% HP pays almost nothing,
// a ninja near death pays the full rate.
const RYO_PER_MISSING_HP = 8;          // 8 Ryo per HP point missing
const MIN_TREATMENT_COST = 50;          // floor so it's never free
const EMERGENCY_SURGERY_MULT = 0.6;     // gem-based instant heal costs less overall but uses gems

// ─── START RESTING ────────────────────────────────────────────────────────────
// Stores user.restSession = { startedAt, startHp }
function startRest(user) {
    if (user.hp.current >= user.hp.max) {
        return { success: false, msg: '✅ You\'re already at full HP — no need to rest!' };
    }
    if (user.restSession?.active) {
        return { success: false, msg: '🛌 Already resting! Check progress with !rest status.' };
    }
    return {
        success: true,
        session: {
            active: true,
            startedAt: new Date(),
            startHp: user.hp.current,
        },
    };
}

// ─── CALCULATE CURRENT REST PROGRESS ─────────────────────────────────────────
function getRestStatus(user) {
    const session = user.restSession;
    if (!session?.active) return { resting: false };

    const startedAt = new Date(session.startedAt).getTime();
    const now = Date.now();
    const hoursElapsed = (now - startedAt) / 3600000;
    const hpRegenerated = Math.floor(hoursElapsed * REST_HP_PER_HOUR);
    const currentHp = Math.min(user.hp.max, session.startHp + hpRegenerated);
    const isFull = currentHp >= user.hp.max;
    const hpNeeded = user.hp.max - session.startHp;
    const hoursToFull = hpNeeded / REST_HP_PER_HOUR;
    const hoursRemaining = Math.max(0, hoursToFull - hoursElapsed);

    return {
        resting: true,
        startHp: session.startHp,
        currentHp,
        maxHp: user.hp.max,
        isFull,
        hoursElapsed,
        hoursRemaining,
        progress: Math.min(100, Math.round((currentHp - session.startHp) / hpNeeded * 100) || 100),
    };
}

// ─── COLLECT REST (check in / wake up) ───────────────────────────────────────
function collectRest(user) {
    const status = getRestStatus(user);
    if (!status.resting) return null;

    const hpGained = status.currentHp - status.startHp;
    user.hp.current = status.currentHp;
    user.restSession = { active: false, startedAt: null, startHp: 0 };

    return { hpGained, isFull: status.isFull, newHp: user.hp.current, maxHp: user.hp.max };
}

// ─── HOSPITAL INSTANT HEAL COST ──────────────────────────────────────────────
function calcTreatmentCost(user) {
    const missing = user.hp.max - user.hp.current;
    if (missing <= 0) return 0;
    return Math.max(MIN_TREATMENT_COST, Math.round(missing * RYO_PER_MISSING_HP));
}

function calcEmergencyGemCost(user) {
    const missing = user.hp.max - user.hp.current;
    if (missing <= 0) return 0;
    // Gem cost scales much more gently — roughly 1 gem per 150 missing HP, min 1
    return Math.max(1, Math.ceil(missing / 150));
}

// ─── EXECUTE TREATMENT ────────────────────────────────────────────────────────
function executeTreatment(user) {
    const healedAmount = user.hp.max - user.hp.current;
    user.hp.current = user.hp.max;
    // Treatment also cancels any active rest session (you're already healed)
    user.restSession = { active: false, startedAt: null, startHp: 0 };
    return healedAmount;
}

// ─── DISPLAY TEXT ─────────────────────────────────────────────────────────────
function hospitalText(user) {
    const missing = user.hp.max - user.hp.current;
    if (missing <= 0) {
        return `🏥 *HOSPITAL* 🏥\n\n✅ *${user.username}*, you're at full health!\n\n_No treatment needed._`;
    }

    const ryoCost = calcTreatmentCost(user);
    const gemCost = calcEmergencyGemCost(user);
    const hoursToFullRest = Math.ceil(missing / REST_HP_PER_HOUR);

    let txt = `🏥 *HOSPITAL* 🏥\n`;
    txt += `_"You're in no condition to fight." — the nurse eyes your wounds._\n\n`;
    txt += `❤️ HP: ${user.hp.current}/${user.hp.max} (${missing} missing)\n\n`;
    txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    txt += `🛌 *Option 1: Natural Rest* (Free)\n`;
    txt += `   Recovers ${REST_HP_PER_HOUR} HP/hour\n`;
    txt += `   Full recovery in ~${hoursToFullRest}h\n`;
    txt += `   _!rest — start resting_\n\n`;
    txt += `💰 *Option 2: Paid Treatment*\n`;
    txt += `   Instant full heal — ${ryoCost.toLocaleString()} Ryo\n`;
    txt += `   _!hospital heal — pay for instant treatment_\n\n`;
    txt += `💎 *Option 3: Emergency Surgery* (Gems)\n`;
    txt += `   Instant full heal — ${gemCost} 💎 Gems\n`;
    txt += `   _!hospital surgery — pay with gems_\n\n`;
    txt += `_Soldier Pill / Blood Replenishing Pill items also work — !bag_`;
    return txt;
}

function restProgressText(status) {
    if (!status.resting) {
        return `🛌 *Not currently resting.*\n\n_!rest — start resting | !hospital — see all options_`;
    }
    const filled = Math.round(status.progress / 10);
    const bar = `[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}] ${status.progress}%`;
    let txt = `🛌 *RESTING...*\n\n`;
    txt += `❤️ ${status.currentHp}/${status.maxHp} HP\n`;
    txt += `${bar}\n\n`;
    if (status.isFull) {
        txt += `✅ *Fully rested!*\n\n_!rest collect — wake up and apply your HP_`;
    } else {
        const hrs = Math.floor(status.hoursRemaining);
        const mins = Math.round((status.hoursRemaining - hrs) * 60);
        txt += `⏰ ~${hrs}h ${mins}m until fully healed\n\n`;
        txt += `_!rest collect — wake up early and keep what you've regenerated so far_`;
    }
    return txt;
}

function collectRestText(result, username) {
    let txt = `${result.isFull ? '✅ *FULLY RESTED!*' : '🛌 *Woke up early.*'}\n\n`;
    txt += `💚 +${result.hpGained} HP regenerated\n`;
    txt += `❤️ ${result.newHp}/${result.maxHp} HP\n\n`;
    if (!result.isFull) {
        txt += `_!rest — start resting again to continue recovery_`;
    } else {
        txt += `_Ready for battle!_`;
    }
    return txt;
}

module.exports = {
    REST_HP_PER_HOUR,
    RYO_PER_MISSING_HP,
    MIN_TREATMENT_COST,
    startRest,
    getRestStatus,
    collectRest,
    calcTreatmentCost,
    calcEmergencyGemCost,
    executeTreatment,
    hospitalText,
    restProgressText,
    collectRestText,
};
