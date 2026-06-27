// src/akatsuki.js
// Akatsuki Organization & Bounty System
//
// CANON ACCURACY:
// — Akatsuki is an alternative to village membership
// — Members get unique buffs but become enemies of all villages
// — Villages post bounties on Akatsuki members
// — Akatsuki members can claim bounties on S-rank missing-nin
// — Each member gets a canon ring (Zetsu wears no ring — admin only)
// — Members earn Ryo by completing dark missions and collecting bounties
// — Kage can post official bounties on Akatsuki members

// ─── AKATSUKI RINGS (canon) ───────────────────────────────────────────────────
const AKATSUKI_RINGS = [
    { id: 'rei',    kanji: '零',  name: 'Zero',      finger: 'Right Thumb',  color: '⬜', member: 'Pain'    },
    { id: 'byaku',  kanji: '白',  name: 'White',     finger: 'Right Index',  color: '⬜', member: 'Konan'   },
    { id: 'sei',    kanji: '青',  name: 'Blue-Green', finger: 'Right Middle', color: '🔵', member: 'Itachi'  },
    { id: 'suzaku', kanji: '朱',  name: 'Vermilion', finger: 'Right Ring',   color: '🔴', member: 'Deidara' },
    { id: 'nanju',  kanji: '南',  name: 'South',     finger: 'Right Pinky',  color: '🟢', member: 'Zetsu'   },
    { id: 'hokuto', kanji: '北',  name: 'North',     finger: 'Left Thumb',   color: '🟣', member: 'Kisame'  },
    { id: 'santou', kanji: '三',  name: 'Three',     finger: 'Left Index',   color: '🟡', member: 'Orochimaru' },
    { id: 'ku',     kanji: '空',  name: 'Sky',       finger: 'Left Middle',  color: '⚫', member: 'Hidan'   },
    { id: 'gyoku',  kanji: '玉',  name: 'Jewel',     finger: 'Left Ring',    color: '🔵', member: 'Kakuzu'  },
    { id: 'kai',    kanji: '戒',  name: 'Commandment',finger: 'Left Pinky',  color: '🟠', member: 'Sasori'  },
];

// ─── AKATSUKI MEMBER BUFFS ────────────────────────────────────────────────────
// Being Akatsuki gives stat bonuses but makes ALL village npcs hostile
const AKATSUKI_BUFFS = {
    attackBonus: 25,          // flat ATK bonus
    defenseBonus: 15,
    ryoMissionMult: 1.4,      // 40% more Ryo from dark missions
    xpMissionMult: 1.3,       // 30% more XP from dark missions
    bountyCollectBonus: 0.1,  // +10% when collecting bounties
    // Penalties
    villageMissionBlocked: true,  // can't do village D/C rank missions
    pvpBountyTarget: true,        // other players can earn bounty by defeating you
};

// ─── DARK MISSIONS (Akatsuki only) ───────────────────────────────────────────
const DARK_MISSIONS = [
    {
        id: 'capture_jinchuriki',
        rank: 'S', rankEmoji: '💀',
        title: 'Capture a Jinchuriki',
        story: 'The leader has ordered extraction of a Tailed Beast. Track the Jinchuriki through the wilderness.',
        chakraCost: 90, minRyo: 8000, maxRyo: 14000, xp: 500,
        successChance: 28, failDmg: 400, gemChance: 0.6,
    },
    {
        id: 'assassinate_jonin',
        rank: 'A', rankEmoji: '🔴',
        title: 'Assassinate a Jonin',
        story: 'A Konoha Jonin knows too much. Silence them before they can report to the Hokage.',
        chakraCost: 75, minRyo: 5000, maxRyo: 9000, xp: 350,
        successChance: 38, failDmg: 280, gemChance: 0.3,
    },
    {
        id: 'steal_kinjutsu',
        rank: 'A', rankEmoji: '🔴',
        title: 'Steal Forbidden Jutsu Scrolls',
        story: 'Infiltrate the hidden library and extract the sealed kinjutsu before dawn.',
        chakraCost: 70, minRyo: 4500, maxRyo: 8000, xp: 320,
        successChance: 42, failDmg: 260, gemChance: 0.25,
    },
    {
        id: 'terrorize_village',
        rank: 'B', rankEmoji: '🟠',
        title: 'Terrorize a Border Village',
        story: 'Spread fear along the Fire Country border. Make them remember the Akatsuki exists.',
        chakraCost: 55, minRyo: 2500, maxRyo: 4500, xp: 200,
        successChance: 55, failDmg: 180, gemChance: 0.1,
    },
    {
        id: 'collect_bounty',
        rank: 'B', rankEmoji: '🟠',
        title: 'Collect a Bounty Target',
        story: 'A high-value missing-nin has been spotted. Bring them in dead or alive.',
        chakraCost: 60, minRyo: 3000, maxRyo: 5500, xp: 220,
        successChance: 50, failDmg: 200, gemChance: 0.12,
    },
    {
        id: 'intercept_anbu',
        rank: 'S', rankEmoji: '💀',
        title: 'Intercept ANBU Black Ops',
        story: 'An ANBU squad is hunting Akatsuki members. Eliminate them before they reach the hideout.',
        chakraCost: 85, minRyo: 7000, maxRyo: 12000, xp: 450,
        successChance: 32, failDmg: 360, gemChance: 0.5,
    },
];

// ─── BOUNTY SYSTEM ────────────────────────────────────────────────────────────
// Global bounty board — stored in memory, keyed by target jid
// { targetJid, targetUsername, postedBy, postedByName, amount, reason, timestamp }
const bountyBoard = new Map();

// Max active bounties at once
const MAX_BOUNTIES = 20;

// Minimum bounty a Kage can post
const MIN_BOUNTY = 5000;
const MAX_BOUNTY = 500000;

function postBounty(targetJid, targetUsername, posterJid, posterName, amount, reason) {
    // Remove old bounty on same target first
    bountyBoard.delete(targetJid);
    bountyBoard.set(targetJid, {
        targetJid, targetUsername,
        postedBy: posterJid, postedByName: posterName,
        amount, reason,
        timestamp: Date.now(),
    });
}

function getBounty(targetJid) {
    return bountyBoard.get(targetJid) || null;
}

function claimBounty(targetJid) {
    const b = bountyBoard.get(targetJid);
    if (b) bountyBoard.delete(targetJid);
    return b;
}

function bountyBoardText() {
    if (!bountyBoard.size) {
        return `📋 *BOUNTY BOARD* 📋\n\n_No active bounties right now._\n\n_Kage can post bounties with !bounty post @player [amount] [reason]_`;
    }
    const sorted = [...bountyBoard.values()].sort((a, b) => b.amount - a.amount);
    let txt = `💀 *BOUNTY BOARD* 💀\n`;
    txt += `_Dead or alive — collect rewards by defeating targets in PvP_\n\n`;
    for (const b of sorted.slice(0, 10)) {
        const ago = Math.round((Date.now() - b.timestamp) / 3600000);
        txt += `🎯 *${b.targetUsername}*\n`;
        txt += `   💰 ${b.amount.toLocaleString()} Ryo | Posted by: ${b.postedByName}\n`;
        txt += `   _"${b.reason}"_\n`;
        txt += `   ⏰ ${ago}h ago\n\n`;
    }
    txt += `_Defeat a target in !duel to automatically collect their bounty_`;
    return txt;
}

// ─── AKATSUKI MEMBER LIST (server-level) ─────────────────────────────────────
// In-memory set of member JIDs — also persisted on User.isAkatsuki
const akatsukiMembers = new Set();

function isAkatsukiMember(jid) {
    return akatsukiMembers.has(jid);
}

// ─── RING ASSIGNMENT ─────────────────────────────────────────────────────────
// Assign a random available ring to a new member
const assignedRings = new Map(); // jid -> ring

function assignRing(jid) {
    const taken = new Set([...assignedRings.values()].map(r => r.id));
    const available = AKATSUKI_RINGS.filter(r => !taken.has(r.id));
    if (!available.length) return AKATSUKI_RINGS[Math.floor(Math.random() * AKATSUKI_RINGS.length)];
    const ring = available[Math.floor(Math.random() * available.length)];
    assignedRings.set(jid, ring);
    return ring;
}

function getRing(jid) {
    return assignedRings.get(jid) || null;
}

// ─── JOIN REQUIREMENTS ────────────────────────────────────────────────────────
const JOIN_REQUIREMENTS = {
    minLevel: 30,
    minRank: ['Chunin', 'Jonin', 'Jonin Elite', 'Kage'],
    ryoCost: 10000,    // initiation fee
    mustLeaveVillage: true,
};

// ─── MEMBER PROFILE TEXT ─────────────────────────────────────────────────────
function akatsukiProfileText(user, ring) {
    const bounty = getBounty(user.phoneId);
    let txt = `🌑 *AKATSUKI MEMBER* 🌑\n\n`;
    txt += `👤 *${user.username}*\n`;
    if (ring) {
        txt += `💍 *Ring:* ${ring.color} ${ring.kanji} — "${ring.name}" (${ring.finger})\n`;
        txt += `   _Formerly worn by ${ring.member}_\n`;
    }
    txt += `\n⚔️ *Member Buffs:*\n`;
    txt += `  ATK +${AKATSUKI_BUFFS.attackBonus} | DEF +${AKATSUKI_BUFFS.defenseBonus}\n`;
    txt += `  💰 Dark missions: ×${AKATSUKI_BUFFS.ryoMissionMult} Ryo\n`;
    txt += `  📈 Dark missions: ×${AKATSUKI_BUFFS.xpMissionMult} XP\n\n`;
    txt += `⚠️ *Enemy of all villages — village missions blocked*\n`;
    if (bounty) {
        txt += `\n🎯 *BOUNTY ON YOUR HEAD: ${bounty.amount.toLocaleString()} Ryo*\n`;
        txt += `   Posted by: ${bounty.postedByName}\n`;
        txt += `   _"${bounty.reason}"_\n`;
    }
    txt += `\n_!darkmission [b/a/s] — Akatsuki-exclusive missions_\n`;
    txt += `_!bounty — view the bounty board_`;
    return txt;
}

module.exports = {
    AKATSUKI_RINGS,
    AKATSUKI_BUFFS,
    DARK_MISSIONS,
    bountyBoard,
    akatsukiMembers,
    assignedRings,
    JOIN_REQUIREMENTS,
    MIN_BOUNTY,
    MAX_BOUNTY,
    postBounty,
    getBounty,
    claimBounty,
    bountyBoardText,
    isAkatsukiMember,
    assignRing,
    getRing,
    akatsukiProfileText,
};
