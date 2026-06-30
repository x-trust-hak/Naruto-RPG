// src/secretTechnique.js
// Secret Technique System (formerly "Jutsu Combo")
//
// REDESIGNED: Instead of an automatic in-battle timing gimmick, this is now
// a genuine progression system — exactly like how Naruto developed the
// Rasengan or Sasuke developed Chidori through dedicated training.
//
// HOW IT WORKS:
// 1. Player picks TWO jutsus they currently own (from their character's
//    jutsu list) to fuse into a new Secret Technique.
// 2. Training costs Ryo + takes real time (like Training Ground), scaled by
//    the rarity/power of the two source jutsus.
// 3. Once training completes, the result is a PERMANENT new move — added to
//    the player's jutsu list, equippable like any other jutsu, with stats
//    derived from the nature-synergy of the two fused jutsus.
// 4. Each character can only have ONE active Secret Technique at a time
//    (you can retrain to replace it, but that costs Ryo + a cooldown).

// ─── NATURE SYNERGY TABLE ─────────────────────────────────────────────────────
// Determines the resulting technique's power tier and flavor name.
const SYNERGY_PAIRS = {
    'fire+wind':       { mult: 1.8, label: 'Inferno Style',       desc: 'Wind-fed flames that consume everything in their path' },
    'lightning+water': { mult: 1.8, label: 'Storm Style',         desc: 'Water charged with lightning — an electrified maelstrom' },
    'earth+water':     { mult: 1.6, label: 'Swamp Style',         desc: 'Earth and water fused into crushing, inescapable mud' },
    'earth+wind':      { mult: 1.6, label: 'Sandstorm Style',     desc: 'Wind-whipped earth scouring everything it touches' },
    'lightning+wind':  { mult: 1.7, label: 'Static Blade Style',  desc: 'Charged wind that cuts like a thousand blades' },
};
const SAME_NATURE_MULT   = 1.35;
const UNTYPED_MULT       = 1.3;
const DEFAULT_MULT       = 1.25;

function normalizeKey(a, b) { return [a, b].sort().join('+'); }

function getSynergy(natureA, natureB) {
    if (!natureA && !natureB) return { mult: UNTYPED_MULT, label: 'Flow Style', desc: 'A seamless taijutsu fusion technique' };
    if (natureA === natureB)  return { mult: SAME_NATURE_MULT, label: 'Mastery Style', desc: 'A refined, perfected version through repetition' };
    const key = normalizeKey(natureA || 'none', natureB || 'none');
    if (SYNERGY_PAIRS[key]) return SYNERGY_PAIRS[key];
    return { mult: DEFAULT_MULT, label: 'Hybrid Style', desc: 'An unconventional fusion of two distinct techniques' };
}

// ─── TRAINING COST ────────────────────────────────────────────────────────────
// Cost and duration scale with the combined chakra cost of the two source
// jutsus — fusing two powerful jutsus takes longer and costs more.
function calcTrainingCost(jutsuA, jutsuB) {
    const combinedCost = (jutsuA.cost || 0) + (jutsuB.cost || 0);
    const ryoCost  = Math.round(combinedCost * 80 + 5000);       // base 5k + scaling
    const hours    = Math.max(6, Math.round(combinedCost / 10)); // min 6h, scales up
    return { ryoCost, hours };
}

// ─── GENERATE THE FUSED TECHNIQUE ────────────────────────────────────────────
function generateSecretTechnique(jutsuA, jutsuB, customName = null) {
    const synergy = getSynergy(jutsuA.nature, jutsuB.nature);
    const baseDamage = Math.round(((jutsuA.damage || 0) + (jutsuB.damage || 0)) / 2 * synergy.mult);
    const baseCost   = Math.round(((jutsuA.cost || 0) + (jutsuB.cost || 0)) / 2 * 1.15); // slightly pricier than avg
    // Use whichever nature is "stronger" (higher damage source) as the resulting nature,
    // unless both are untyped
    const resultNature = jutsuA.damage >= jutsuB.damage ? (jutsuA.nature || jutsuB.nature) : (jutsuB.nature || jutsuA.nature);

    const name = customName?.trim() || `${synergy.label}: ${jutsuA.name} × ${jutsuB.name}`;

    return {
        id: `secret_${Date.now()}`,
        name,
        nature: resultNature,
        damage: baseDamage,
        cost: baseCost,
        pp: 3,                          // secret techniques get a generous 3 PP per battle
        desc: `${synergy.desc}. A fusion of *${jutsuA.name}* and *${jutsuB.name}*.`,
        isSecretTechnique: true,
        sourceJutsus: [jutsuA.id, jutsuB.id],
        synergyLabel: synergy.label,
        synergyMult: synergy.mult,
    };
}

// ─── TRAINING SESSION STATE ──────────────────────────────────────────────────
// Stored on user.secretTechTraining = { active, jutsuAId, jutsuBId, customName,
//                                        startedAt, endsAt, ryoCost }
function startTechniqueTraining(user, jutsuA, jutsuB, customName) {
    if (user.secretTechTraining?.active) {
        return { success: false, msg: '❌ Already training a Secret Technique! Check progress with !technique status.' };
    }
    if (jutsuA.id === jutsuB.id) {
        return { success: false, msg: '❌ You need TWO different jutsus to fuse.' };
    }
    const { ryoCost, hours } = calcTrainingCost(jutsuA, jutsuB);
    if ((user.ryo || 0) < ryoCost) {
        return {
            success: false,
            msg: `💰 *Not enough Ryo!*\n\nFusing *${jutsuA.name}* + *${jutsuB.name}* costs *${ryoCost.toLocaleString()} Ryo*\nYou have: ${(user.ryo || 0).toLocaleString()} Ryo`,
        };
    }

    const now = Date.now();
    return {
        success: true,
        ryoCost,
        hours,
        session: {
            active: true,
            jutsuAId: jutsuA.id,
            jutsuBId: jutsuB.id,
            jutsuAName: jutsuA.name,
            jutsuBName: jutsuB.name,
            customName: customName || '',
            startedAt: new Date(now),
            endsAt: new Date(now + hours * 3600000),
        },
    };
}

function getTechniqueTrainingStatus(user) {
    const s = user.secretTechTraining;
    if (!s?.active) return { training: false };

    const now = Date.now();
    const endsAt = new Date(s.endsAt).getTime();
    const startedAt = new Date(s.startedAt).getTime();
    const total = endsAt - startedAt;
    const elapsed = Math.min(total, now - startedAt);
    const progress = Math.min(100, Math.round((elapsed / total) * 100));
    const complete = now >= endsAt;
    const remainingMs = Math.max(0, endsAt - now);

    return { training: true, session: s, progress, complete, remainingMs };
}

// ─── DISPLAY TEXT ─────────────────────────────────────────────────────────────
function techniqueGuideText(char, currentTechnique) {
    let txt = `🌀 *SECRET TECHNIQUE TRAINING* 🌀\n`;
    txt += `_Fuse two of your jutsus into a permanent, unique technique — just like how Naruto created the Rasengan!_\n\n`;
    txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    txt += `📋 *How it works:*\n`;
    txt += `1️⃣ Pick two jutsus you own: *!technique fuse [jutsu1] | [jutsu2]*\n`;
    txt += `2️⃣ Pay the Ryo cost and wait (real time, like Training Ground)\n`;
    txt += `3️⃣ Collect your new permanent technique: *!technique collect*\n`;
    txt += `4️⃣ Equip it like any jutsu: *!equip [technique name]*\n\n`;
    txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    txt += `🌟 *Best Nature Fusions:*\n\n`;
    txt += `🔥+🌪️ Fire + Wind → *Inferno Style* (×1.8)\n`;
    txt += `⚡+💧 Lightning + Water → *Storm Style* (×1.8)\n`;
    txt += `🌪️+⚡ Wind + Lightning → *Static Blade Style* (×1.7)\n`;
    txt += `🌱+💧 Earth + Water → *Swamp Style* (×1.6)\n`;
    txt += `🌪️+🌱 Wind + Earth → *Sandstorm Style* (×1.6)\n`;
    txt += `🔁 Same nature twice → *Mastery Style* (×1.35)\n`;
    txt += `👊 No nature → *Flow Style* (×1.3)\n\n`;
    txt += `💰 *Cost:* scales with the power of jutsus you fuse (~5,000–20,000+ Ryo)\n`;
    txt += `⏰ *Time:* 6h minimum, scales with chakra cost of fused jutsus\n\n`;
    if (currentTechnique) {
        txt += `✅ *Your current Secret Technique:*\n`;
        txt += `   ${currentTechnique.name}\n`;
        txt += `   ${currentTechnique.damage} dmg | ${currentTechnique.cost} chakra\n\n`;
        txt += `_Retraining replaces it — !technique fuse to start over_`;
    } else {
        txt += `_You don't have a Secret Technique yet — train one with !technique fuse!_`;
    }
    return txt;
}

function trainingStartedText(session, ryoCost, hours, synergy) {
    return `🌀 *SECRET TECHNIQUE TRAINING STARTED!* 🌀\n\n` +
           `_Fusing:_ *${session.jutsuAName}* + *${session.jutsuBName}*\n` +
           `_Predicted style:_ ${synergy.label}\n\n` +
           `💰 -${ryoCost.toLocaleString()} Ryo\n` +
           `⏰ Training time: ${hours}h\n\n` +
           `_!technique status — check progress_\n` +
           `_!technique collect — claim when done_`;
}

function trainingStatusText(status) {
    if (!status.training) return `🌀 No active technique training.\n\n_!technique fuse [jutsu1] | [jutsu2] — start fusing_`;
    const filled = Math.round(status.progress / 10);
    const bar = `[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}] ${status.progress}%`;
    let txt = `🌀 *Training:* ${status.session.jutsuAName} + ${status.session.jutsuBName}\n\n${bar}\n\n`;
    if (status.complete) {
        txt += `✅ *Technique mastered!*\n\n_!technique collect — claim your new jutsu_`;
    } else {
        const hrs = Math.floor(status.remainingMs / 3600000);
        const mins = Math.floor((status.remainingMs % 3600000) / 60000);
        txt += `⏰ ${hrs}h ${mins}m remaining`;
    }
    return txt;
}

function collectedText(technique) {
    return `🎉 *SECRET TECHNIQUE MASTERED!* 🎉\n\n` +
           `🌀 *${technique.name}*\n` +
           `_${technique.desc}_\n\n` +
           `💥 ${technique.damage} damage | 💧 ${technique.cost} chakra | ⟳ ${technique.pp} PP\n` +
           `${technique.nature ? `Nature: ${technique.nature}\n` : ''}\n` +
           `_!equip ${technique.name} — equip it for battle!_`;
}

module.exports = {
    SYNERGY_PAIRS,
    getSynergy,
    calcTrainingCost,
    generateSecretTechnique,
    startTechniqueTraining,
    getTechniqueTrainingStatus,
    techniqueGuideText,
    trainingStartedText,
    trainingStatusText,
    collectedText,
};
