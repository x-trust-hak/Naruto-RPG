// src/killAnnounce.js
// Kill Announcement System
//
// Makes every big moment in the bot feel like an EVENT — PvP duel wins,
// boss raid killing blows, war kills, bounty collections, and milestone
// achievements all get a punchy, formatted announcement instead of just
// being buried in a regular message. Announcements post to the group
// where the action happened (the bot has no cross-group broadcast
// capability since it's a single WhatsApp session per number).

// ─── HYPE LINE POOLS ──────────────────────────────────────────────────────────
// Randomized flavor text so announcements don't feel repetitive.
const PVP_KILL_LINES = [
    '{winner} has defeated {loser} in combat!',
    '{winner} struck down {loser}!',
    '{winner} proved superior over {loser}!',
    "{winner}'s blade found its mark — {loser} falls!",
    '{winner} claims victory over {loser}!',
    'With one final blow, {winner} ends the fight against {loser}!',
];

const STREAK_LINES = {
    3:  '🔥 {winner} is on a 3-win streak!',
    5:  '🔥🔥 {winner} is UNSTOPPABLE — 5 wins in a row!',
    10: '👑 {winner} has a LEGENDARY 10-win streak!',
    15: '🌟 {winner} is RAMPAGING — 15 wins straight!',
    20: '💀 {winner} is a WALKING NIGHTMARE — 20-win streak!',
};

const RAID_KILL_LINES = [
    '{killer} landed the killing blow on {boss}!',
    "{killer}'s final strike brought down {boss}!",
    '{boss} falls to {killer}!',
    '{killer} delivers the finishing blow against {boss}!',
];

const BOUNTY_LINES = [
    '{hunter} collected the bounty on {target}!',
    '{hunter} brought {target} to justice — bounty claimed!',
    '{target} is no more — {hunter} cashes in {amount} Ryo!',
];

function randomLine(pool, vars) {
    let line = pool[Math.floor(Math.random() * pool.length)];
    for (const [key, val] of Object.entries(vars)) {
        line = line.replaceAll(`{${key}}`, val);
    }
    return line;
}

// ─── PVP KILL ANNOUNCEMENT ────────────────────────────────────────────────────
function pvpKillAnnouncement({ winnerName, loserName, winnerStreak, isWarKill, warVillages, isBountyKill, bountyAmount, isAkatsukiKill, tierUp, newTier }) {
    let txt = `⚔️ *━━━ COMBAT RESULT ━━━* ⚔️\n\n`;
    txt += `${randomLine(PVP_KILL_LINES, { winner: `*${winnerName}*`, loser: `*${loserName}*` })}\n`;

    // Streak callout
    const streakThresholds = Object.keys(STREAK_LINES).map(Number).sort((a, b) => b - a);
    for (const threshold of streakThresholds) {
        if (winnerStreak === threshold) {
            txt += `\n${randomLine([STREAK_LINES[threshold]], { winner: `*${winnerName}*` })}\n`;
            break;
        }
    }

    // Special context tags
    const tags = [];
    if (isWarKill && warVillages) tags.push(`⚔️ War Kill (${warVillages})`);
    if (isBountyKill) tags.push(`💀 Bounty Collected: ${bountyAmount?.toLocaleString()} Ryo`);
    if (isAkatsukiKill) tags.push(`🌑 Akatsuki Member Defeated`);
    if (tierUp) tags.push(`🎉 Promoted to ${newTier}!`);

    if (tags.length) {
        txt += `\n${tags.join(' | ')}\n`;
    }

    return txt;
}

// ─── RAID BOSS KILL ANNOUNCEMENT ──────────────────────────────────────────────
function raidKillAnnouncement({ killerName, bossName, totalParticipants, isCrit }) {
    let txt = `💀 *━━━ BOSS DEFEATED ━━━* 💀\n\n`;
    txt += `${randomLine(RAID_KILL_LINES, { killer: `*${killerName}*`, boss: `*${bossName}*` })}\n`;
    if (isCrit) txt += `💥 *CRITICAL FINISHING BLOW!*\n`;
    txt += `\n👥 ${totalParticipants} raider${totalParticipants !== 1 ? 's' : ''} fought together to bring this victory.`;
    return txt;
}

// ─── BOUNTY COLLECTED ANNOUNCEMENT ────────────────────────────────────────────
function bountyKillAnnouncement({ hunterName, targetName, amount }) {
    let txt = `🎯 *━━━ BOUNTY COLLECTED ━━━* 🎯\n\n`;
    txt += `${randomLine(BOUNTY_LINES, { hunter: `*${hunterName}*`, target: `*${targetName}*`, amount: amount.toLocaleString() })}\n`;
    return txt;
}

// ─── MILESTONE ANNOUNCEMENTS ──────────────────────────────────────────────────
// Called when a player hits a big lifetime milestone (level, win count, etc.)
const MILESTONE_CHECKS = {
    level: [25, 50, 75, 100, 150],
    wins:  [10, 25, 50, 100, 250],
};

function checkMilestone(type, oldValue, newValue) {
    const thresholds = MILESTONE_CHECKS[type];
    if (!thresholds) return null;
    for (const t of thresholds) {
        if (oldValue < t && newValue >= t) return t;
    }
    return null;
}

function milestoneAnnouncement(username, type, value) {
    const labels = {
        level: { emoji: '🌟', text: `reached *Level ${value}*!` },
        wins:  { emoji: '🏆', text: `hit *${value} career wins*!` },
    };
    const info = labels[type];
    if (!info) return null;
    return `${info.emoji} *━━━ MILESTONE ━━━* ${info.emoji}\n\n*${username}* has ${info.text}\n\n_The village takes notice of this rising shinobi._`;
}

// ─── CHUNIN EXAM / SEASON CHAMPION CALLOUT ────────────────────────────────────
function championAnnouncement(username, title) {
    return `🎊 *━━━ CHAMPION CROWNED ━━━* 🎊\n\n` +
           `👑 *${username}* has earned the title:\n*"${title}"*\n\n` +
           `_A new legend rises in the shinobi world._`;
}

module.exports = {
    pvpKillAnnouncement,
    raidKillAnnouncement,
    bountyKillAnnouncement,
    checkMilestone,
    milestoneAnnouncement,
    championAnnouncement,
    MILESTONE_CHECKS,
};
