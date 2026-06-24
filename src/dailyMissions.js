// src/dailyMissions.js
// Daily Story Mission System — 5 named missions rotate every day with actual
// Naruto lore context. Different from !mission (generic rank missions); these
// have story flavour, bonus objectives, and a daily completion limit of 3.

const STORY_MISSIONS = [
    // ── D-RANK STORY ────────────────────────────────────────────────────────
    {
        id: 'catch_tora',
        rank: 'D', rankEmoji: '🟢',
        title: 'Catch Tora the Cat',
        story: 'Lady Shijimi\'s cat Tora has escaped again. Track it through the Hidden Leaf before it causes a diplomatic incident.',
        chakraCost: 15, minRyo: 200, maxRyo: 400, xp: 30,
        successChance: 100, failDmg: 0, gemChance: 0,
        bonus: { type: 'xp', amount: 20, condition: 'Win in 1 turn (complete in under 5s)', auto: true },
    },
    {
        id: 'paint_mountain',
        rank: 'D', rankEmoji: '🟢',
        title: 'Paint the Hokage Rock',
        story: 'Annual repainting of the Hokage Monument. Naruto once painted it for fun — now you do it properly.',
        chakraCost: 15, minRyo: 180, maxRyo: 380, xp: 25,
        successChance: 100, failDmg: 0, gemChance: 0,
        bonus: null,
    },
    {
        id: 'lost_scroll',
        rank: 'D', rankEmoji: '🟢',
        title: 'Recover the Lost Scroll',
        story: 'A genin dropped a mission scroll in the forest of death. Retrieve it before the insects shred it.',
        chakraCost: 20, minRyo: 300, maxRyo: 500, xp: 35,
        successChance: 95, failDmg: 50, gemChance: 0,
        bonus: null,
    },
    // ── C-RANK STORY ────────────────────────────────────────────────────────
    {
        id: 'escort_wave',
        rank: 'C', rankEmoji: '🔵',
        title: 'Escort to the Land of Waves',
        story: 'Tazuna needs protection. Team 7\'s original mission — but this time it\'s your squad on the line.',
        chakraCost: 35, minRyo: 600, maxRyo: 1100, xp: 65,
        successChance: 78, failDmg: 100, gemChance: 0,
        bonus: { type: 'ryo', amount: 300, condition: 'Escort bonus for surviving without using items', autoCheck: 'no_items' },
    },
    {
        id: 'forest_patrol',
        rank: 'C', rankEmoji: '🔵',
        title: 'Forest of Death Patrol',
        story: 'Chunin exams are approaching. Patrol the deadly forest and clear it of missing-nin scouts.',
        chakraCost: 35, minRyo: 700, maxRyo: 1200, xp: 70,
        successChance: 75, failDmg: 120, gemChance: 0,
        bonus: null,
    },
    {
        id: 'spy_sand',
        rank: 'C', rankEmoji: '🔵',
        title: 'Infiltrate Hidden Sand Borders',
        story: 'Intelligence has spotted suspicious movement near Suna\'s outer walls. Identify the threat without being seen.',
        chakraCost: 40, minRyo: 800, maxRyo: 1300, xp: 80,
        successChance: 70, failDmg: 140, gemChance: 0,
        bonus: null,
    },
    // ── B-RANK STORY ────────────────────────────────────────────────────────
    {
        id: 'neutralize_bandits',
        rank: 'B', rankEmoji: '🟠',
        title: 'Neutralize Rogue Bandits',
        story: 'Former shinobi turned mercenaries are extorting villages near the border of Fire Country. Take them out.',
        chakraCost: 55, minRyo: 1300, maxRyo: 2600, xp: 130,
        successChance: 58, failDmg: 190, gemChance: 0.05,
        bonus: null,
    },
    {
        id: 'defend_chunin',
        rank: 'B', rankEmoji: '🟠',
        title: 'Defend the Chunin Exams Stadium',
        story: 'Intelligence reports Sound and Sand may strike during the exams. Hold your position in the stands.',
        chakraCost: 60, minRyo: 1500, maxRyo: 2800, xp: 150,
        successChance: 55, failDmg: 200, gemChance: 0.08,
        bonus: null,
    },
    {
        id: 'akatsuki_tail',
        rank: 'B', rankEmoji: '🟠',
        title: 'Tail the Akatsuki Agent',
        story: 'An Akatsuki member was spotted near your village. Shadow them without being detected — do NOT engage.',
        chakraCost: 55, minRyo: 1400, maxRyo: 2500, xp: 140,
        successChance: 60, failDmg: 180, gemChance: 0.06,
        bonus: { type: 'gems', amount: 1, condition: 'Intel bonus for not using any attacks', auto: false },
    },
    // ── A-RANK STORY ────────────────────────────────────────────────────────
    {
        id: 'pain_assault',
        rank: 'A', rankEmoji: '🔴',
        title: 'Survive Pain\'s Assault on Konoha',
        story: 'Nagato\'s six paths are destroying the village. Fight your way through before Konoha falls.',
        chakraCost: 75, minRyo: 3200, maxRyo: 5500, xp: 220,
        successChance: 42, failDmg: 260, gemChance: 0.2,
        bonus: null,
    },
    {
        id: 'rescue_gaara',
        rank: 'A', rankEmoji: '🔴',
        title: 'Rescue Gaara from the Akatsuki',
        story: 'The Akatsuki have captured the Kazekage. An elite squad must infiltrate their lair before Shukaku is extracted.',
        chakraCost: 80, minRyo: 3500, maxRyo: 6000, xp: 240,
        successChance: 38, failDmg: 280, gemChance: 0.22,
        bonus: null,
    },
    {
        id: 'infiltrate_orochimaru',
        rank: 'A', rankEmoji: '🔴',
        title: 'Infiltrate Orochimaru\'s Lair',
        story: 'Orochimaru has been experimenting on kidnapped shinobi. Breach the snake den and extract survivors.',
        chakraCost: 75, minRyo: 3000, maxRyo: 5200, xp: 210,
        successChance: 44, failDmg: 250, gemChance: 0.18,
        bonus: null,
    },
    // ── S-RANK STORY ────────────────────────────────────────────────────────
    {
        id: 'bijuu_containment',
        rank: 'S', rankEmoji: '💀',
        title: 'Bijuu Containment Operation',
        story: 'A Tailed Beast has broken free and is leveling a village. Only a ninja of legendary power can stop it.',
        chakraCost: 90, minRyo: 5000, maxRyo: 9000, xp: 400,
        successChance: 30, failDmg: 360, gemChance: 0.5,
        bonus: { type: 'gems', amount: 2, condition: 'Full containment — survive with over 50% HP', auto: false },
    },
    {
        id: 'kaguya_seal',
        rank: 'S', rankEmoji: '💀',
        title: 'Seal Kaguya Otsutsuki',
        story: 'Kaguya has returned. The Allied Shinobi Forces are falling. You are the last line of defense.',
        chakraCost: 90, minRyo: 6000, maxRyo: 10000, xp: 500,
        successChance: 25, failDmg: 400, gemChance: 0.6,
        bonus: null,
    },
    {
        id: 'fourth_ninja_war',
        rank: 'S', rankEmoji: '💀',
        title: 'The Fourth Great Ninja War — Front Lines',
        story: 'Ten-Tails Jinchuriki Obito towers over the battlefield. This is the climax of the war.',
        chakraCost: 90, minRyo: 5500, maxRyo: 8500, xp: 450,
        successChance: 28, failDmg: 380, gemChance: 0.55,
        bonus: null,
    },
];

// ─── DAILY ROTATION ──────────────────────────────────────────────────────────
// Each day pulls 5 missions (one per rank D/C/B/A/S), deterministic by date.
// This means every player sees the same 5 missions on the same day — community
// event feel.

function getTodaysMissions() {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

    const byRank = { D: [], C: [], B: [], A: [], S: [] };
    for (const m of STORY_MISSIONS) byRank[m.rank].push(m);

    // Seeded pick: (seed + rankOffset) % pool.length
    const offsets = { D: 0, C: 7, B: 13, A: 17, S: 23 };
    const result = [];
    for (const rank of ['D', 'C', 'B', 'A', 'S']) {
        const pool = byRank[rank];
        const idx = (seed + offsets[rank]) % pool.length;
        result.push(pool[idx]);
    }
    return result;
}

// ─── COMPLETION LIMIT ────────────────────────────────────────────────────────
const DAILY_MISSION_LIMIT = 3;   // max story missions per day

// Checks if user can still run a story mission today.
// user.dailyMissionCount: { date: 'YYYY-MM-DD', count: N }
function canRunDailyMission(user) {
    const today = todayStr();
    if (!user.dailyMissionData || user.dailyMissionData.date !== today) return { can: true, remaining: DAILY_MISSION_LIMIT };
    const remaining = DAILY_MISSION_LIMIT - (user.dailyMissionData.count || 0);
    return { can: remaining > 0, remaining: Math.max(0, remaining) };
}

function recordDailyMission(user) {
    const today = todayStr();
    if (!user.dailyMissionData || user.dailyMissionData.date !== today) {
        user.dailyMissionData = { date: today, count: 1 };
    } else {
        user.dailyMissionData.count = (user.dailyMissionData.count || 0) + 1;
    }
}

function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── MISSION BOARD DISPLAY ─────────────────────────────────────────────────
function missionBoardText(missions, user) {
    const { remaining } = canRunDailyMission(user);
    let msg = `📜 *DAILY MISSION BOARD* 📜\n`;
    msg += `_Missions reset at midnight. ${remaining}/${DAILY_MISSION_LIMIT} runs remaining today._\n\n`;

    for (const m of missions) {
        msg +=
            `${m.rankEmoji} *[${m.rank}-Rank]* ${m.title}\n` +
            `   📖 _${m.story}_\n` +
            `   💧 ${m.chakraCost} Chakra | 💰 ${m.minRyo.toLocaleString()}–${m.maxRyo.toLocaleString()} Ryo | 📈 ${m.xp} XP\n` +
            (m.bonus ? `   🎁 Bonus: ${m.bonus.condition}\n` : ``) +
            `   _!storymission ${m.rank.toLowerCase()}_\n\n`;
    }

    msg += `_These missions change every day at midnight!_`;
    return msg;
}

module.exports = {
    STORY_MISSIONS,
    getTodaysMissions,
    canRunDailyMission,
    recordDailyMission,
    missionBoardText,
    DAILY_MISSION_LIMIT,
};
