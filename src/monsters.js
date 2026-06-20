// src/monsters.js
// PvE enemies grouped by rank tier. Higher tiers = stronger stats + better rewards.
// Each enemy has its own move set { name, damage, cost? } used by the battle engine.

const MONSTERS = {
    d: [
        {
            id: 'bandit', name: 'Rogue Bandit', emoji: '🗡️', image: 'welcome',
            stats: { hp: 350, attack: 45, defense: 25, speed: 40, crit: 5 },
            moves: [
                { name: 'Rusty Slash', damage: 50 },
                { name: 'Dirty Throw', damage: 70 },
            ],
            reward: { minRyo: 200, maxRyo: 400, xp: 40, gemChance: 0 }
        },
        {
            id: 'wild_boar', name: 'Giant Boar', emoji: '🐗', image: 'welcome',
            stats: { hp: 420, attack: 40, defense: 35, speed: 30, crit: 3 },
            moves: [
                { name: 'Charge', damage: 60 },
                { name: 'Tusk Gore', damage: 80 },
            ],
            reward: { minRyo: 250, maxRyo: 450, xp: 45, gemChance: 0 }
        },
    ],
    c: [
        {
            id: 'missing_nin', name: 'Missing-Nin', emoji: '🥷', image: 'welcome',
            stats: { hp: 650, attack: 70, defense: 45, speed: 65, crit: 12 },
            moves: [
                { name: 'Kunai Barrage', damage: 90 },
                { name: 'Smoke Ambush', damage: 120 },
            ],
            reward: { minRyo: 600, maxRyo: 1000, xp: 90, gemChance: 0 }
        },
        {
            id: 'demon_brothers', name: 'Demon Brothers', emoji: '⛓️', image: 'welcome',
            stats: { hp: 700, attack: 75, defense: 50, speed: 60, crit: 10 },
            moves: [
                { name: 'Chain Shred', damage: 100 },
                { name: 'Poison Gauntlet', damage: 130 },
            ],
            reward: { minRyo: 700, maxRyo: 1100, xp: 100, gemChance: 0 }
        },
    ],
    b: [
        {
            id: 'zabuza_npc', name: 'Demon of the Mist', emoji: '🌫️', image: 'welcome',
            stats: { hp: 1000, attack: 100, defense: 70, speed: 80, crit: 15 },
            moves: [
                { name: 'Water Dragon', damage: 150 },
                { name: 'Silent Killing', damage: 200 },
                { name: 'Hidden Mist', damage: 110 },
            ],
            reward: { minRyo: 1500, maxRyo: 2800, xp: 180, gemChance: 0.1 }
        },
        {
            id: 'sound_four', name: 'Sound Elite', emoji: '🎵', image: 'welcome',
            stats: { hp: 1100, attack: 95, defense: 80, speed: 75, crit: 14 },
            moves: [
                { name: 'Sound Wave', damage: 140 },
                { name: 'Curse Mark Strike', damage: 210 },
            ],
            reward: { minRyo: 1600, maxRyo: 3000, xp: 190, gemChance: 0.12 }
        },
    ],
    a: [
        {
            id: 'orochimaru_npc', name: 'Orochimaru', emoji: '🐍', image: 'akatsuki',
            stats: { hp: 1600, attack: 130, defense: 100, speed: 110, crit: 20 },
            moves: [
                { name: 'Striking Shadow Snakes', damage: 200 },
                { name: 'Kusanagi Blade', damage: 280 },
                { name: 'Immortality Regen', damage: -150 },
            ],
            reward: { minRyo: 3500, maxRyo: 6000, xp: 320, gemChance: 0.25 }
        },
        {
            id: 'kabuto_npc', name: 'Kabuto Yakushi', emoji: '🩺', image: 'akatsuki',
            stats: { hp: 1500, attack: 120, defense: 110, speed: 100, crit: 18 },
            moves: [
                { name: 'Chakra Scalpel', damage: 210 },
                { name: 'Sage Regen', damage: -180 },
                { name: 'Dead Soul Jutsu', damage: 250 },
            ],
            reward: { minRyo: 3800, maxRyo: 6200, xp: 330, gemChance: 0.25 }
        },
    ],
    s: [
        {
            id: 'pain_npc', name: 'Pain (Six Paths)', emoji: '🌧️', image: 'akatsuki',
            stats: { hp: 2400, attack: 170, defense: 140, speed: 130, crit: 25 },
            moves: [
                { name: 'Almighty Push', damage: 320 },
                { name: 'Universal Pull', damage: 260 },
                { name: 'Planetary Devastation', damage: 420 },
            ],
            reward: { minRyo: 6000, maxRyo: 10000, xp: 500, gemChance: 0.5 }
        },
        {
            id: 'madara_npc', name: 'Madara Uchiha', emoji: '🌑', image: 'akatsuki',
            stats: { hp: 2800, attack: 190, defense: 150, speed: 140, crit: 30 },
            moves: [
                { name: 'Perfect Susanoo', damage: 380 },
                { name: 'Meteor Drop', damage: 450 },
                { name: 'Limbo Clone', damage: 300 },
            ],
            reward: { minRyo: 7000, maxRyo: 12000, xp: 600, gemChance: 0.6 }
        },
    ],
};

const RANK_LABELS = {
    d: 'D-Rank', c: 'C-Rank', b: 'B-Rank', a: 'A-Rank', s: 'S-Rank'
};

// Minimum player level recommended per tier (used for scaling, not hard-locked)
const RANK_MIN_LEVEL = { d: 1, c: 5, b: 15, a: 30, s: 50 };

// Pick a random monster from a tier, scaled slightly by the player's level so it
// stays challenging as they grow.
function getMonster(tier, playerLevel = 1) {
    const pool = MONSTERS[tier];
    if (!pool) return null;
    const base = pool[Math.floor(Math.random() * pool.length)];

    // Scale enemy stats up to +50% based on how far above the tier minimum the player is
    const over = Math.max(0, playerLevel - (RANK_MIN_LEVEL[tier] || 1));
    const scale = 1 + Math.min(0.5, over * 0.01);

    return {
        ...base,
        tier,
        stats: {
            hp:      Math.round(base.stats.hp * scale),
            attack:  Math.round(base.stats.attack * scale),
            defense: Math.round(base.stats.defense * scale),
            speed:   base.stats.speed,
            crit:    base.stats.crit,
        },
        hp: { current: Math.round(base.stats.hp * scale), max: Math.round(base.stats.hp * scale) },
    };
}

module.exports = { MONSTERS, RANK_LABELS, RANK_MIN_LEVEL, getMonster };
