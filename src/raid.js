// src/raid.js
// Weekly Boss Raid System — multiple players hit the same boss in turns.
// The killing blow wins the jackpot; all participants earn rewards scaled
// by their percentage of total damage dealt.

// ─── RAID BOSSES ────────────────────────────────────────────────────────────
// Each boss spawns on a fixed day of the week (0=Sun … 6=Sat).
// hp: total raid HP pool shared by all attackers.
// phase2Threshold: % HP at which the boss enters Rage mode (stat amplify).
// moves: array of {name, damage, nature, aoe (bool), desc}.
// reward: jackpot (kill-blow), perDmgRyo (ryo per 100 dmg dealt), perDmgXp.

const RAID_BOSSES = [
    {
        id: 'madara',
        name: 'Madara Uchiha',
        title: 'King of Hell — Infinite Tsukuyomi',
        emoji: '🌑',
        image: 'akatsuki',
        nature: 'fire',
        hp: 50000,
        phase2Threshold: 0.4,       // enters rage at 40% HP
        phase2Label: '🔥 SUSANO\'O RAGE MODE',
        phase2DmgMult: 1.5,
        stats: { attack: 200, defense: 120, crit: 30 },
        moves: [
            { name: 'Meteor Storm',         damage: 280, nature: 'earth', aoe: false, desc: 'Pulls meteors from the sky' },
            { name: 'Susano\'o Slash',      damage: 320, nature: 'fire',  aoe: false, desc: 'Perfect Susano\'o cleave' },
            { name: 'Limbo: Border Jail',   damage: 180, nature: null,    aoe: true,  desc: 'AOE — invisible clone hits ALL raiders!' },
            { name: 'Infinite Tsukuyomi',   damage: 0,   nature: null,    aoe: false, stun: true, desc: 'Stuns one raider for 1 turn' },
        ],
        rewards: {
            jackpotRyo: 100000, jackpotGems: 25, jackpotXp: 2000,
            perDmgRyo: 8, perDmgXp: 3,
            participantGems: 5,
        },
        spawnDay: 0,   // Sunday
    },
    {
        id: 'kaguya',
        name: 'Kaguya Otsutsuki',
        title: 'Mother of Chakra — The Rabbit Goddess',
        emoji: '🌙',
        image: 'akatsuki',
        nature: null,
        hp: 65000,
        phase2Threshold: 0.35,
        phase2Label: '🌌 DIVINE DIMENSION SHIFT',
        phase2DmgMult: 1.6,
        stats: { attack: 230, defense: 140, crit: 25 },
        moves: [
            { name: 'Ash Killing Bones',    damage: 300, nature: null,    aoe: false, desc: 'Bone that pierces any defense' },
            { name: 'All-Killing Ash Bones',damage: 260, nature: null,    aoe: true,  desc: 'AOE bone storm hits ALL raiders!' },
            { name: 'Dimension Shift',      damage: 0,   nature: null,    aoe: false, stun: true, desc: 'Ejects a raider from reality' },
            { name: 'Expansive Truth-Seeking', damage: 350, nature: null, aoe: false, desc: 'Ultimate destructive sphere' },
        ],
        rewards: {
            jackpotRyo: 150000, jackpotGems: 40, jackpotXp: 3000,
            perDmgRyo: 10, perDmgXp: 4,
            participantGems: 8,
        },
        spawnDay: 3,   // Wednesday
    },
    {
        id: 'ten_tails',
        name: 'Ten-Tails',
        title: 'The Progenitor — Divine Tree',
        emoji: '👁️‍🗨️',
        image: 'akatsuki',
        nature: null,
        hp: 80000,
        phase2Threshold: 0.5,
        phase2Label: '💀 JUUBI AWAKENING — ALL STATS SURGED',
        phase2DmgMult: 1.8,
        stats: { attack: 260, defense: 160, crit: 20 },
        moves: [
            { name: 'Tailed Beast Bomb',    damage: 400, nature: null,    aoe: false, desc: 'Pure destructive power' },
            { name: 'Bijuudama Barrage',    damage: 220, nature: null,    aoe: true,  desc: 'AOE — hits ALL raiders!' },
            { name: 'Tenpenchii',           damage: 350, nature: null,    aoe: false, desc: 'Divine punishment storms' },
            { name: 'Root Web Bind',        damage: 0,   nature: null,    aoe: false, stun: true, desc: 'Roots bind a raider — skip turn' },
        ],
        rewards: {
            jackpotRyo: 200000, jackpotGems: 60, jackpotXp: 5000,
            perDmgRyo: 15, perDmgXp: 6,
            participantGems: 12,
        },
        spawnDay: 5,   // Friday
    },
];

// ─── ACTIVE RAID STATE ───────────────────────────────────────────────────────
// One raid object per group (keyed by group JID).
// {
//   boss,           — the RAID_BOSSES entry
//   hp,             — current boss HP
//   phase2,         — bool: rage mode active
//   participants,   — Map<jid, { username, totalDmg, stunned }>
//   turnOrder,      — [ jid, jid, … ] rotation (auto-adds new joiners)
//   currentTurn,    — index into turnOrder
//   startTime,      — Date
//   endTime,        — Date (auto-expires after 6 hours)
//   ended,          — bool
// }
const activeRaids = new Map();

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getCurrentBoss() {
    const day = new Date().getDay();
    return RAID_BOSSES.find(b => b.spawnDay === day) || null;
}

function getActiveRaid(groupJid) {
    const raid = activeRaids.get(groupJid);
    if (!raid) return null;
    if (Date.now() > raid.endTime || raid.ended) {
        activeRaids.delete(groupJid);
        return null;
    }
    return raid;
}

function startRaid(groupJid, boss) {
    const raid = {
        boss,
        hp: boss.hp,
        maxHp: boss.hp,
        phase2: false,
        participants: new Map(),   // jid -> { username, totalDmg, stunned }
        turnOrder: [],
        currentTurn: 0,
        startTime: Date.now(),
        endTime: Date.now() + 6 * 60 * 60 * 1000,  // 6-hour window
        ended: false,
    };
    activeRaids.set(groupJid, raid);
    return raid;
}

function joinRaid(raid, jid, username) {
    if (!raid.participants.has(jid)) {
        raid.participants.set(jid, { username, totalDmg: 0, stunned: false });
        raid.turnOrder.push(jid);
    }
}

// Returns whose turn it is (jid), skipping stunned players once.
function currentTurnJid(raid) {
    if (!raid.turnOrder.length) return null;
    return raid.turnOrder[raid.currentTurn % raid.turnOrder.length];
}

function advanceTurn(raid) {
    raid.currentTurn = (raid.currentTurn + 1) % raid.turnOrder.length;
}

// Compute a raider's attack damage vs the boss.
// playerStats: getEffectiveStats() result.
// Returns { damage, crit }.
function calcRaidHit(playerStats, boss, jutsu = null) {
    const base = jutsu ? jutsu.damage : Math.round(playerStats.attack * 1.2);
    let dmg = base * (1 + (playerStats.attack - 60) / 200);
    dmg *= 100 / (100 + (boss.stats.defense || 0));

    // Phase 2 defense buff
    if (boss.phase2) dmg *= 0.85;

    let crit = false;
    if (Math.random() * 100 < (playerStats.crit || 10)) {
        dmg *= 1.75;
        crit = true;
    }
    dmg *= 0.9 + Math.random() * 0.2;
    return { damage: Math.max(1, Math.round(dmg)), crit };
}

// Boss counter-attack — returns { move, damage, stunTarget (jid|null) }
function bossFight(raid, attackerJid) {
    const boss = raid.boss;
    const inPhase2 = raid.phase2;
    const pool = boss.moves;
    const move = pool[Math.floor(Math.random() * pool.length)];

    let dmg = move.damage;
    if (inPhase2) dmg = Math.round(dmg * boss.phase2DmgMult);

    // AOE hits all participants; single hits the attacker
    const targets = move.aoe
        ? [...raid.participants.keys()]
        : [attackerJid];

    const stunTarget = move.stun
        ? (move.aoe
            ? raid.turnOrder[Math.floor(Math.random() * raid.turnOrder.length)]
            : attackerJid)
        : null;

    return { move, damage: dmg, targets, stunTarget };
}

// Compute final rewards for all participants after boss dies.
// killerJid: who dealt the killing blow.
function computeRewards(raid, killerJid) {
    const r = raid.boss.rewards;
    const totalDmg = [...raid.participants.values()].reduce((s, p) => s + p.totalDmg, 0) || 1;
    const results = [];

    for (const [jid, p] of raid.participants.entries()) {
        const isKiller = jid === killerJid;
        const dmgShare = p.totalDmg / totalDmg;
        const ryo = Math.round(p.totalDmg * r.perDmgRyo) + (isKiller ? r.jackpotRyo : 0);
        const xp  = Math.round(p.totalDmg * r.perDmgXp)  + (isKiller ? r.jackpotXp : 0);
        const gems = r.participantGems + (isKiller ? r.jackpotGems : 0);
        results.push({ jid, username: p.username, totalDmg: p.totalDmg, dmgShare, ryo, xp, gems, isKiller });
    }

    return results.sort((a, b) => b.totalDmg - a.totalDmg);
}

// HP bar for the raid boss (20 segments for drama)
function raidHpBar(current, max) {
    const ratio = Math.max(0, Math.min(1, current / max));
    const filled = Math.round(ratio * 20);
    return `[${'█'.repeat(filled)}${'░'.repeat(20 - filled)}] ${Math.max(0, current).toLocaleString()}/${max.toLocaleString()}`;
}

module.exports = {
    RAID_BOSSES,
    activeRaids,
    getCurrentBoss,
    getActiveRaid,
    startRaid,
    joinRaid,
    currentTurnJid,
    advanceTurn,
    calcRaidHit,
    bossFight,
    computeRewards,
    raidHpBar,
};
