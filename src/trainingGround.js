// src/trainingGround.js
// Training Ground — Passive Idle Progression
//
// Send your character off to train for a set duration. No chakra cost, no
// active engagement needed — come back later and collect the rewards.
// Designed as a "check in once or twice a day" loop that rewards players
// who can't be online constantly, alongside the active grind of !train.

// ─── TRAINING DURATIONS ──────────────────────────────────────────────────────
// Longer training = better XP/Ryo per hour rate (rewards planning ahead,
// not just spamming the shortest option).
const TRAINING_OPTIONS = [
    {
        id: 'quick',
        label: 'Quick Drill',
        emoji: '🥋',
        hours: 1,
        xpPerHour: 40,
        ryoPerHour: 150,
        desc: 'A short focused training session.',
    },
    {
        id: 'standard',
        label: 'Standard Training',
        emoji: '🏋️',
        hours: 4,
        xpPerHour: 55,
        ryoPerHour: 200,
        desc: 'A solid half-day regimen with a sensei.',
    },
    {
        id: 'intensive',
        label: 'Intensive Training',
        emoji: '🔥',
        hours: 8,
        xpPerHour: 70,
        ryoPerHour: 260,
        desc: 'A full day pushing your limits, like Naruto with Jiraiya.',
    },
    {
        id: 'isolation',
        label: 'Mountain Isolation Training',
        emoji: '🏔️',
        hours: 24,
        xpPerHour: 90,
        ryoPerHour: 320,
        desc: 'A full day and night of secluded training, away from distraction.',
    },
    {
        id: 'pilgrimage',
        label: "Sage's Pilgrimage",
        emoji: '🐸',
        hours: 72,
        xpPerHour: 110,
        ryoPerHour: 400,
        desc: 'Three days of legendary training, like Naruto\'s journey to Mount Myoboku.',
        minLevel: 20,   // gated — needs some progress first
    },
];

// Small chance per training session of a bonus discovery (canon flavor)
const BONUS_EVENTS = [
    { chance: 0.12, gems: 2,  msg: '💎 You found a hidden chakra crystal during training!' },
    { chance: 0.10, item: 'soldier_pill', msg: '💊 Your sensei gifted you a Soldier Pill!' },
    { chance: 0.08, gems: 5,  msg: '🌟 A breakthrough in your training yielded bonus chakra crystals!' },
    { chance: 0.05, xpMult: 1.5, msg: '⚡ A moment of perfect clarity — training efficiency boosted!' },
];

// ─── GET OPTION BY ID ────────────────────────────────────────────────────────
function getOption(id) {
    return TRAINING_OPTIONS.find(o => o.id === id) || null;
}

// ─── START TRAINING ──────────────────────────────────────────────────────────
// Returns { success, msg } or { success, session }
function startTraining(user, optionId) {
    const opt = getOption(optionId);
    if (!opt) {
        return { success: false, msg: `❌ Unknown training type. Use !trainingground to see options.` };
    }
    if (opt.minLevel && user.level < opt.minLevel) {
        return { success: false, msg: `❌ *${opt.label}* requires Level ${opt.minLevel}+. You are Level ${user.level}.` };
    }
    if (user.trainingSession?.active) {
        return { success: false, msg: `❌ Already training! Check progress with !trainingground status, or wait for it to finish.` };
    }

    const now = Date.now();
    const endsAt = now + opt.hours * 60 * 60 * 1000;

    return {
        success: true,
        session: {
            active: true,
            optionId: opt.id,
            startedAt: new Date(now),
            endsAt: new Date(endsAt),
        },
        opt,
    };
}

// ─── CHECK TRAINING STATUS ────────────────────────────────────────────────────
function getTrainingStatus(user) {
    const session = user.trainingSession;
    if (!session?.active) return { training: false };

    const opt = getOption(session.optionId);
    const now = Date.now();
    const endsAt = new Date(session.endsAt).getTime();
    const startedAt = new Date(session.startedAt).getTime();
    const totalMs = endsAt - startedAt;
    const elapsedMs = Math.min(totalMs, now - startedAt);
    const remainingMs = Math.max(0, endsAt - now);
    const progress = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
    const complete = now >= endsAt;

    return {
        training: true,
        opt,
        progress,
        complete,
        remainingMs,
        elapsedHours: elapsedMs / 3600000,
    };
}

// ─── COLLECT TRAINING REWARDS ────────────────────────────────────────────────
// Call when player checks in after training completes (or early-collects
// partial progress if they choose to cancel).
// Returns { xp, ryo, bonusEvents: [...], gems, items: [...] }
function collectTraining(user, forceEarly = false) {
    const status = getTrainingStatus(user);
    if (!status.training) return null;

    const { opt, elapsedHours, complete } = status;
    // If collecting early, only pay out for hours actually trained (no bonus rate)
    const hoursToPay = complete ? opt.hours : Math.floor(elapsedHours);

    let xp  = Math.round(hoursToPay * opt.xpPerHour);
    let ryo = Math.round(hoursToPay * opt.ryoPerHour);
    let gems = 0;
    const items = [];
    const bonusMsgs = [];

    // Early collection penalty — lose 40% of earned rewards for bailing
    if (!complete && forceEarly) {
        xp  = Math.round(xp * 0.6);
        ryo = Math.round(ryo * 0.6);
    }

    // Roll bonus events only if training completed fully
    if (complete) {
        for (const bonus of BONUS_EVENTS) {
            if (Math.random() < bonus.chance) {
                if (bonus.gems) { gems += bonus.gems; }
                if (bonus.item) { items.push(bonus.item); }
                if (bonus.xpMult) { xp = Math.round(xp * bonus.xpMult); }
                bonusMsgs.push(bonus.msg);
            }
        }
    }

    return { xp, ryo, gems, items, bonusMsgs, opt, complete, hoursToPay };
}

// ─── TRAINING GROUND DISPLAY TEXT ────────────────────────────────────────────
function trainingGroundText(user) {
    let txt = `🏯 *TRAINING GROUND* 🏯\n`;
    txt += `_Send your ninja to train passively — come back later to collect rewards!_\n\n`;
    txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const opt of TRAINING_OPTIONS) {
        const locked = opt.minLevel && user.level < opt.minLevel;
        txt += `${opt.emoji} *${opt.label}* ${locked ? `🔒 Lv.${opt.minLevel}+` : ''}\n`;
        txt += `   ⏱️ ${opt.hours}h | 📈 ${opt.xpPerHour} XP/h | 💰 ${opt.ryoPerHour} Ryo/h\n`;
        txt += `   _${opt.desc}_\n`;
        txt += `   Total: ${(opt.xpPerHour * opt.hours).toLocaleString()} XP, ${(opt.ryoPerHour * opt.hours).toLocaleString()} Ryo\n`;
        txt += `   _!trainingground start ${opt.id}_\n\n`;
    }
    txt += `_No chakra cost — purely passive! Check back with !trainingground status_`;
    return txt;
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
function trainingProgressBar(progress) {
    const filled = Math.round(progress / 10);
    return `[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}] ${progress}%`;
}

// ─── STATUS DISPLAY TEXT ──────────────────────────────────────────────────────
function trainingStatusText(status) {
    if (!status.training) {
        return `🏯 *Not currently training.*\n\n_!trainingground — see training options_`;
    }
    const { opt, progress, complete, remainingMs } = status;
    let txt = `${opt.emoji} *${opt.label}*\n\n`;
    txt += `${trainingProgressBar(progress)}\n\n`;

    if (complete) {
        txt += `✅ *Training complete!*\n\n`;
        txt += `_!trainingground collect — claim your rewards_`;
    } else {
        const hrs = Math.floor(remainingMs / 3600000);
        const mins = Math.floor((remainingMs % 3600000) / 60000);
        txt += `⏰ *${hrs}h ${mins}m remaining*\n\n`;
        txt += `_!trainingground cancel — collect early (60% rewards, forfeits the rest)_`;
    }
    return txt;
}

// ─── COLLECTION RESULT TEXT ───────────────────────────────────────────────────
function collectionResultText(result, username) {
    let txt = result.complete ? `🎉 *TRAINING COMPLETE!* 🎉\n\n` : `⏸️ *Training collected early.*\n\n`;
    txt += `${result.opt.emoji} *${result.opt.label}* (${result.hoursToPay}h trained)\n\n`;
    txt += `📈 +${result.xp.toLocaleString()} XP\n`;
    txt += `💰 +${result.ryo.toLocaleString()} Ryo\n`;
    if (result.gems > 0) txt += `💎 +${result.gems} Gems\n`;
    if (result.items.length) txt += `🎁 Items: ${result.items.join(', ')}\n`;

    if (result.bonusMsgs.length) {
        txt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        for (const m of result.bonusMsgs) txt += `${m}\n`;
    }

    if (!result.complete) {
        txt += `\n⚠️ _Early collection penalty applied — 40% of earned rewards forfeited._`;
    }

    txt += `\n\n_!trainingground — start a new session_`;
    return txt;
}

module.exports = {
    TRAINING_OPTIONS,
    BONUS_EVENTS,
    getOption,
    startTraining,
    getTrainingStatus,
    collectTraining,
    trainingGroundText,
    trainingProgressBar,
    trainingStatusText,
    collectionResultText,
};
