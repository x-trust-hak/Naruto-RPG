// src/arenaSeason.js
// Arena Season System
//
// SEASONS:
// — Monthly seasons with start/end dates
// — Players earn Season Points (SP) from PvP wins
// — SP determine your tier: Academy → Genin → Chunin → Jonin → Kage → Hokage
// — Season ends on last day of each month — auto-reset at midnight
// — Top 3 players at season end get exclusive rewards + titles
// — After reset, SP reset to 0, titles are preserved, previous champions shown in Hall of Fame

const SEASON_TIERS = [
    { name: 'Academy Student', emoji: '📚', minSp: 0,    maxSp: 99,   color: '⬜', rpGain: 25,  rpLoss: 15  },
    { name: 'Genin',           emoji: '🍃', minSp: 100,  maxSp: 299,  color: '🟢', rpGain: 30,  rpLoss: 18  },
    { name: 'Chunin',          emoji: '🥋', minSp: 300,  maxSp: 699,  color: '🔵', rpGain: 38,  rpLoss: 22  },
    { name: 'Jonin',           emoji: '⚡', minSp: 700,  maxSp: 1299, color: '🟣', rpGain: 48,  rpLoss: 28  },
    { name: 'Kage',            emoji: '👑', minSp: 1300, maxSp: 2199, color: '🟠', rpGain: 60,  rpLoss: 35  },
    { name: 'Hokage',          emoji: '🌟', minSp: 2200, maxSp: Infinity, color: '🔴', rpGain: 75, rpLoss: 45 },
];

// Season rewards (distributed at end of season)
const SEASON_END_REWARDS = {
    rank1: {
        ryo: 100000, gems: 50, xp: 10000,
        title: '🌟 Season Champion',
        hpBonus: 300, chakraBonus: 100,
        exclusiveChar: null,  // future: give exclusive gacha pull
    },
    rank2: {
        ryo: 60000, gems: 30, xp: 6000,
        title: '🥈 Season Runner-Up',
        hpBonus: 150, chakraBonus: 50,
    },
    rank3: {
        ryo: 35000, gems: 15, xp: 3000,
        title: '🥉 Season Third Place',
        hpBonus: 100, chakraBonus: 30,
    },
    // Tier-based participation rewards
    tiers: {
        Hokage:  { ryo: 20000, gems: 10, xp: 2000 },
        Kage:    { ryo: 12000, gems: 6,  xp: 1200 },
        Jonin:   { ryo: 7000,  gems: 3,  xp: 700  },
        Chunin:  { ryo: 4000,  gems: 2,  xp: 400  },
        Genin:   { ryo: 2000,  gems: 1,  xp: 200  },
        'Academy Student': { ryo: 500, gems: 0, xp: 50 },
    },
};

// SP gained/lost per match outcome
const SP_GAIN_WIN  = 40;   // flat SP for winning
const SP_LOSS_LOSE = 20;   // SP lost for losing

// ─── SEASON METADATA ─────────────────────────────────────────────────────────
// Stored in memory — in a production app this would be in DB
// We derive the current season from the calendar month
function getCurrentSeason() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const seasonNames = [
        'Winter Storm', 'Frozen Tundra', 'Spring Awakening', 'Cherry Blossom',
        'Summer Blaze', 'Sand Storm', 'Harvest Moon', 'Crimson Leaf',
        'Thunder Season', 'Shadow Season', 'Frost Wind', 'Year\'s End'
    ];
    const name = seasonNames[month - 1];
    // Season end = last day of current month
    const lastDay = new Date(year, month, 0).getDate();
    const end = new Date(year, month - 1, lastDay, 23, 59, 59);
    const start = new Date(year, month - 1, 1, 0, 0, 0);
    const daysLeft = Math.ceil((end - now) / 86400000);

    return {
        id: `${year}-${String(month).padStart(2, '0')}`,
        name: `Season ${month} — ${name} ${year}`,
        month, year,
        start, end,
        daysLeft: Math.max(0, daysLeft),
    };
}

// In-memory Hall of Fame (previous season champions)
const hallOfFame = [];

// ─── TIER LOOKUP ─────────────────────────────────────────────────────────────
function getTier(sp) {
    for (let i = SEASON_TIERS.length - 1; i >= 0; i--) {
        if (sp >= SEASON_TIERS[i].minSp) return SEASON_TIERS[i];
    }
    return SEASON_TIERS[0];
}

function getTierProgress(sp) {
    const tier = getTier(sp);
    const idx  = SEASON_TIERS.indexOf(tier);
    const next = SEASON_TIERS[idx + 1];
    if (!next) return { tier, progress: 100, spToNext: 0, next: null };
    const range   = next.minSp - tier.minSp;
    const current = sp - tier.minSp;
    const progress = Math.min(100, Math.round((current / range) * 100));
    return { tier, progress, spToNext: next.minSp - sp, next };
}

// ─── SP PROGRESS BAR ─────────────────────────────────────────────────────────
function spBar(sp) {
    const { tier, progress, spToNext, next } = getTierProgress(sp);
    const filled = Math.round(progress / 10);
    const bar = `[${tier.color.repeat(filled)}${'░'.repeat(10 - filled)}]`;
    if (!next) return `${bar} MAX TIER`;
    return `${bar} ${progress}% → ${next.emoji} ${next.name} (${spToNext} SP needed)`;
}

// ─── SEASON LEADERBOARD TEXT ─────────────────────────────────────────────────
async function buildSeasonBoard(User, limit = 15) {
    const season = getCurrentSeason();
    const players = await User.find({
        registrationStep: 'COMPLETED',
        seasonSp: { $gt: 0 },
    }).sort({ seasonSp: -1 }).limit(limit);

    let txt = `🏆 *ARENA SEASON LEADERBOARD* 🏆\n`;
    txt += `📅 *${season.name}*\n`;
    txt += `⏰ ${season.daysLeft} day${season.daysLeft !== 1 ? 's' : ''} remaining\n\n`;

    if (!players.length) {
        txt += `_No PvP matches played this season yet!_\n\n_Challenge someone: !duel [name]_`;
        return txt;
    }

    players.forEach((p, i) => {
        const tier   = getTier(p.seasonSp || 0);
        const medal  = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const akStr  = p.isAkatsuki ? ' 🌑' : '';
        const kageStr = p.isKage   ? ' 👑' : '';
        txt += `${medal} ${tier.emoji} *${p.username}*${akStr}${kageStr}\n`;
        txt += `   ${(p.seasonSp || 0).toLocaleString()} SP | ${p.seasonWins || 0}W/${p.seasonLosses || 0}L | ${tier.name}\n\n`;
    });

    txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    txt += `🎁 *Season-end rewards for top 3!*\n`;
    txt += `🥇 ${SEASON_END_REWARDS.rank1.ryo.toLocaleString()} Ryo | ${SEASON_END_REWARDS.rank1.gems} 💎 | ${SEASON_END_REWARDS.rank1.xp.toLocaleString()} XP\n`;
    txt += `🥈 ${SEASON_END_REWARDS.rank2.ryo.toLocaleString()} Ryo | ${SEASON_END_REWARDS.rank2.gems} 💎\n`;
    txt += `🥉 ${SEASON_END_REWARDS.rank3.ryo.toLocaleString()} Ryo | ${SEASON_END_REWARDS.rank3.gems} 💎\n\n`;
    txt += `_!arena — your personal season stats_\n_!duel [name] — earn SP by winning PvP duels_`;

    return txt;
}

// ─── PERSONAL ARENA CARD ─────────────────────────────────────────────────────
async function buildArenaCard(user, User) {
    const season  = getCurrentSeason();
    const sp      = user.seasonSp || 0;
    const { tier, progress, spToNext, next } = getTierProgress(sp);

    // Find player rank
    const rank = await User.countDocuments({
        registrationStep: 'COMPLETED',
        seasonSp: { $gt: sp },
    }) + 1;

    let txt = `⚔️ *ARENA STATS — ${user.username}* ⚔️\n`;
    txt += `📅 ${season.name} | ${season.daysLeft}d left\n\n`;
    txt += `${tier.color} *Tier:* ${tier.emoji} ${tier.name}\n`;
    txt += `🏅 *Season Points:* ${sp.toLocaleString()} SP\n`;
    txt += `📊 ${spBar(sp)}\n\n`;
    txt += `🌍 *Global Rank:* #${rank}\n`;
    txt += `🏆 *Season Record:* ${user.seasonWins || 0}W / ${user.seasonLosses || 0}L\n`;
    txt += `🔥 *Win Streak:* ${user.winStreak || 0}\n\n`;
    txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    txt += `📈 *SP per win:* +${SP_GAIN_WIN} SP\n`;
    txt += `📉 *SP per loss:* -${SP_LOSS_LOSE} SP\n`;
    if (next) txt += `🎯 *Need ${spToNext} more SP* to reach ${next.emoji} ${next.name}\n`;
    else txt += `🌟 *MAX TIER — Hokage!* Maintain your position!\n`;
    txt += `\n`;

    // Tier rewards preview
    const tierRew = SEASON_END_REWARDS.tiers[tier.name];
    if (tierRew) {
        txt += `🎁 *Your tier reward at season end:*\n`;
        txt += `   💰 ${tierRew.ryo.toLocaleString()} Ryo | 📈 ${tierRew.xp.toLocaleString()} XP`;
        if (tierRew.gems) txt += ` | 💎 ${tierRew.gems} Gems`;
        txt += `\n`;
    }

    // Previous season titles
    if ((user.seasonTitles || []).length) {
        txt += `\n🏅 *Past Titles:* ${user.seasonTitles.slice(-3).join(', ')}\n`;
    }

    txt += `\n_!duel [player] to earn SP | !season for leaderboard_`;
    return txt;
}

// ─── PROCESS MATCH RESULT ────────────────────────────────────────────────────
// Call this after every PvP win/loss to update SP and season record
function processMatchResult(winner, loser) {
    const winTier  = getTier(winner.seasonSp || 0);
    const loseTier = getTier(loser.seasonSp  || 0);

    // SP changes
    winner.seasonSp     = (winner.seasonSp || 0) + SP_GAIN_WIN;
    loser.seasonSp      = Math.max(0, (loser.seasonSp || 0) - SP_LOSS_LOSE);

    // Season W/L
    winner.seasonWins   = (winner.seasonWins   || 0) + 1;
    loser.seasonLosses  = (loser.seasonLosses  || 0) + 1;

    // RP changes (tier-based)
    winner.rankPoints   = (winner.rankPoints || 0) + winTier.rpGain;
    loser.rankPoints    = Math.max(0, (loser.rankPoints || 0) - loseTier.rpLoss);

    const newWinTier = getTier(winner.seasonSp);
    const promoted   = newWinTier.name !== winTier.name;

    return {
        spGained: SP_GAIN_WIN,
        spLost:   SP_LOSS_LOSE,
        rpGained: winTier.rpGain,
        rpLost:   loseTier.rpLoss,
        promoted,
        newTier:  newWinTier,
        prevTier: winTier,
    };
}

// ─── SEASON RESET (called by admin or auto-timer) ────────────────────────────
async function endSeason(User, conn, announceJid) {
    const season = getCurrentSeason();

    // Get top 3
    const top3 = await User.find({ registrationStep: 'COMPLETED' })
        .sort({ seasonSp: -1 }).limit(3);

    // Award top 3
    const rewardKeys = ['rank1', 'rank2', 'rank3'];
    const announcements = [];

    for (let i = 0; i < top3.length; i++) {
        const p   = top3[i];
        const rew = SEASON_END_REWARDS[rewardKeys[i]];
        if (!rew) continue;

        p.ryo      = (p.ryo  || 0) + rew.ryo;
        p.gems     = (p.gems || 0) + rew.gems;
        p.hp.max  += rew.hpBonus || 0;
        p.chakra.max += rew.chakraBonus || 0;
        p.seasonTitles = [...(p.seasonTitles || []), rew.title];
        p.examTitles   = [...(p.examTitles   || []), rew.title];
        announcements.push(`${['🥇','🥈','🥉'][i]} *${p.username}* — ${(p.seasonSp||0).toLocaleString()} SP — ${rew.title}`);
        await p.save();
    }

    // Tier-based rewards for everyone
    const allPlayers = await User.find({ registrationStep: 'COMPLETED', seasonSp: { $gt: 0 } });
    for (const p of allPlayers) {
        const tier = getTier(p.seasonSp || 0);
        const rew  = SEASON_END_REWARDS.tiers[tier.name];
        if (rew) {
            p.ryo  = (p.ryo  || 0) + rew.ryo;
            p.gems = (p.gems || 0) + (rew.gems || 0);
            await p.save();
        }
    }

    // Save to Hall of Fame
    hallOfFame.unshift({
        season: season.name,
        date: new Date().toLocaleDateString(),
        champions: top3.map((p, i) => ({
            username: p.username,
            sp: p.seasonSp || 0,
            title: SEASON_END_REWARDS[rewardKeys[i]]?.title,
        })),
    });
    if (hallOfFame.length > 12) hallOfFame.pop(); // keep last 12 seasons

    // Reset all season stats
    await User.updateMany(
        { registrationStep: 'COMPLETED' },
        { $set: { seasonSp: 0, seasonWins: 0, seasonLosses: 0 } }
    );

    return { announcements, season };
}

// ─── HALL OF FAME TEXT ───────────────────────────────────────────────────────
function hallOfFameText() {
    if (!hallOfFame.length) return `🏛️ *HALL OF FAME*\n\n_No completed seasons yet._`;
    let txt = `🏛️ *ARENA HALL OF FAME* 🏛️\n\n`;
    for (const s of hallOfFame.slice(0, 6)) {
        txt += `📅 *${s.season}* (${s.date})\n`;
        s.champions.forEach((c, i) => {
            txt += `  ${['🥇','🥈','🥉'][i]} ${c.username} — ${c.sp.toLocaleString()} SP\n`;
        });
        txt += `\n`;
    }
    return txt;
}

module.exports = {
    SEASON_TIERS,
    SEASON_END_REWARDS,
    SP_GAIN_WIN,
    SP_LOSS_LOSE,
    getCurrentSeason,
    hallOfFame,
    getTier,
    getTierProgress,
    spBar,
    buildSeasonBoard,
    buildArenaCard,
    processMatchResult,
    endSeason,
    hallOfFameText,
};
