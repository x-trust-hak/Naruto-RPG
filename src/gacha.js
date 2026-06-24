// src/gacha.js
// Ninja Gacha — Summoning Scroll system.
// Players spend Gems (or Ryo for lesser pulls) to summon rare characters
// not available in the regular shop. Uses a pity system (guaranteed Legendary
// after 10 pulls with no Legendary) and weighted rarity tiers.

// ─── EXCLUSIVE GACHA POOL ────────────────────────────────────────────────────
// These characters are ONLY available through summoning — not in !shop.
// They reference character IDs already defined in characters.js PLUS new
// gacha-exclusive entries added here.

const GACHA_POOL = [
    // ── Mythic (0.5%) ─ gacha-exclusive legends ─────────────────────────────
    {
        id: 'hashirama',
        name: 'Hashirama Senju',
        rarity: 'Mythic',
        emoji: '🌲',
        nature: 'earth',
        village: 'Leaf',
        weight: 0.5,
        description: 'God of Shinobi — First Hokage. Wood Release beyond comprehension.',
        baseStats: { hp: 900, chakra: 800, attack: 110, defense: 130, speed: 70, crit: 20 },
        passive: '🌳 Wood God: Heals 100 HP per turn. Wood Release costs 20% less chakra.',
        jutsus: [
            { id: 'wood_dragon',    name: 'Wood Dragon', cost: 70, nature: 'earth', pp: 4, damage: 260, desc: 'Dragon of living wood' },
            { id: 'wood_human',     name: 'Wood Human Jutsu', cost: 100, nature: 'earth', pp: 3, damage: 340, desc: 'Giant wood titan crushes all' },
            { id: 'sage_wood_true', name: 'Sage Art: Wood Release — True Several Thousand Hands', cost: 150, nature: 'earth', pp: 1, damage: 500, desc: 'Ultimate wood technique' },
        ],
    },
    {
        id: 'kaguya_char',
        name: 'Kaguya Otsutsuki',
        rarity: 'Mythic',
        emoji: '🌙',
        nature: null,
        village: 'Otsutsuki',
        weight: 0.5,
        description: 'Mother of Chakra itself. The original source of all power.',
        baseStats: { hp: 750, chakra: 1000, attack: 130, defense: 110, speed: 90, crit: 25 },
        passive: '♾️ Byakugan Omniscience: Cannot be surprised — always attacks first. 30% dodge.',
        jutsus: [
            { id: 'ash_bones',      name: 'Ash Killing Bones', cost: 60, nature: null, pp: 4, damage: 240, desc: 'Bone that turns to ash on impact' },
            { id: 'divine_bones',   name: 'Eighty Gods Vacuum Attack', cost: 90, nature: null, pp: 3, damage: 320, desc: 'Vacuum fist barrage' },
            { id: 'truth_seeker',   name: 'All-Killing Ash Bones', cost: 140, nature: null, pp: 2, damage: 460, desc: 'Ultimate bone technique — instant kill chance' },
        ],
    },
    // ── Legendary (4%) ───────────────────────────────────────────────────────
    {
        id: 'tobirama',
        name: 'Tobirama Senju',
        rarity: 'Legendary',
        emoji: '💧',
        nature: 'water',
        village: 'Leaf',
        weight: 2,
        description: 'Second Hokage — Inventor of shadow clones & Edo Tensei.',
        baseStats: { hp: 620, chakra: 680, attack: 105, defense: 85, speed: 100, crit: 22 },
        passive: '🌊 Water Mastery: Water jutsus cost 15% less chakra and deal +20% damage.',
        jutsus: [
            { id: 'water_god',      name: 'Water God', cost: 50, nature: 'water', pp: 4, damage: 180, desc: 'Massive water technique' },
            { id: 'edo_tensei',     name: 'Edo Tensei Strike', cost: 80, nature: null, pp: 3, damage: 240, desc: 'Summon undead warriors to attack' },
            { id: 'flying_thunder_tobirama', name: 'Flying Thunder God — Second Step', cost: 120, nature: null, pp: 2, damage: 380, desc: 'Perfected teleportation jutsu' },
        ],
    },
    {
        id: 'hiruzen',
        name: 'Hiruzen Sarutobi',
        rarity: 'Legendary',
        emoji: '🐒',
        nature: null,
        village: 'Leaf',
        weight: 2,
        description: 'Third Hokage — Professor of all elements. God of shinobi of his era.',
        baseStats: { hp: 580, chakra: 720, attack: 100, defense: 95, speed: 75, crit: 20 },
        passive: '📖 Professor: Can use any chakra nature — nature damage never reduced.',
        jutsus: [
            { id: 'monkey_summon', name: 'Summoning: Enma', cost: 55, nature: null, pp: 4, damage: 180, desc: 'Summon the Monkey King' },
            { id: 'reaper_bind',   name: 'Dead Demon Consuming Seal', cost: 100, nature: null, pp: 2, damage: 0, buff: { stun: 3 }, desc: 'Seal enemy soul — 3-turn stun' },
            { id: 'five_elements', name: 'Five Elements Unseal', cost: 130, nature: null, pp: 2, damage: 400, desc: 'Master of all elements — combined strike' },
        ],
    },
    {
        id: 'nagato_rinnegan',
        name: 'Nagato (Six Paths)',
        rarity: 'Legendary',
        emoji: '🔵',
        nature: null,
        village: 'Rain',
        weight: 2,
        description: 'True Rinnegan wielder. Can attract, repel, and revive.',
        baseStats: { hp: 500, chakra: 750, attack: 108, defense: 80, speed: 65, crit: 18 },
        passive: '🌀 Six Paths: Each turn has 20% chance to negate all incoming damage.',
        jutsus: [
            { id: 'bancho_tensei', name: 'Banshō Ten\'in', cost: 60, nature: null, pp: 4, damage: 200, desc: 'Massive gravitational pull attack' },
            { id: 'chibaku_tensei', name: 'Chibaku Tensei', cost: 100, nature: null, pp: 3, damage: 300, desc: 'Create a gravitational star — crushing' },
            { id: 'rinne_rebirth', name: 'Rinne Rebirth', cost: 140, nature: null, pp: 1, damage: -9999, desc: 'Sacrifice chakra to fully restore own HP' },
        ],
    },
    // ── Epic (15%) ────────────────────────────────────────────────────────────
    {
        id: 'shisui',
        name: 'Shisui Uchiha',
        rarity: 'Epic',
        emoji: '💫',
        nature: 'fire',
        village: 'Leaf',
        weight: 7,
        description: 'Fastest Uchiha ever. Kotoamatsukami genjutsu master.',
        baseStats: { hp: 440, chakra: 560, attack: 95, defense: 65, speed: 115, crit: 28 },
        passive: '💨 Shunshin no Shisui: 30% dodge. First-turn crit guaranteed.',
        jutsus: [
            { id: 'shisui_fireball', name: 'Fire Style Barrage', cost: 40, nature: 'fire', pp: 4, damage: 150, desc: 'Lightning-fast fire attacks' },
            { id: 'kotoamatsukami', name: 'Kotoamatsukami', cost: 80, nature: null, pp: 2, damage: 0, buff: { stun: 2 }, desc: 'Rewrite enemy\'s mind — 2-turn stun' },
            { id: 'shisui_susanoo', name: 'Susano\'o', cost: 110, nature: 'fire', pp: 2, damage: 310, desc: 'Shisui\'s fully formed Susano\'o' },
        ],
    },
    {
        id: 'mei',
        name: 'Mei Terumī',
        rarity: 'Epic',
        emoji: '💦',
        nature: 'water',
        village: 'Mist',
        weight: 8,
        description: 'Fifth Mizukage — two simultaneous kekkei genkai.',
        baseStats: { hp: 520, chakra: 590, attack: 92, defense: 78, speed: 72, crit: 18 },
        passive: '⚗️ Dual Kekkei Genkai: Lava and Boil release deal +25% damage.',
        jutsus: [
            { id: 'lava_dragon',   name: 'Lava Style: Melting Apparition', cost: 55, nature: 'earth', pp: 4, damage: 190, desc: 'Dragon of lava dissolves defense' },
            { id: 'boil_release',  name: 'Boil Release: Skilled Mist', cost: 70, nature: 'water', pp: 3, damage: 230, desc: 'Acidic mist melts everything' },
            { id: 'water_beast',   name: 'Water Release: Great Water Mass', cost: 90, nature: 'water', pp: 3, damage: 280, desc: 'Tidal wave of destruction' },
        ],
    },
    // ── Rare (30%) ─────────────────────────────────────────────────────────
    {
        id: 'anko',
        name: 'Anko Mitarashi',
        rarity: 'Rare',
        emoji: '🐍',
        nature: null,
        village: 'Leaf',
        weight: 15,
        description: 'Former Orochimaru pupil. Snake style expert.',
        baseStats: { hp: 460, chakra: 440, attack: 82, defense: 68, speed: 82, crit: 16 },
        passive: '🐍 Curse Mark: When HP drops below 30%, attack increases by 40%.',
        jutsus: [
            { id: 'snake_attack',  name: 'Twin Snakes Mutual Death', cost: 35, nature: null, pp: 5, damage: 120, desc: 'Snake summon suicide attack' },
            { id: 'acid_venom',    name: 'Poison Snake Strike', cost: 50, nature: null, pp: 4, damage: 150, desc: 'Venomous snake fang' },
            { id: 'curse_seal',    name: 'Cursed Seal Activation', cost: 80, nature: null, pp: 3, damage: 0, buff: { attack: 70, defense: 40 }, desc: 'Channel Orochimaru\'s power' },
        ],
    },
    {
        id: 'temari',
        name: 'Temari',
        rarity: 'Rare',
        emoji: '🌬️',
        nature: 'wind',
        village: 'Sand',
        weight: 15,
        description: 'Wind Release master — long-range fan techniques.',
        baseStats: { hp: 430, chakra: 470, attack: 85, defense: 60, speed: 88, crit: 20 },
        passive: '🌪️ Cyclone Control: Wind jutsus always have 100% hit rate.',
        jutsus: [
            { id: 'wind_blade',    name: 'Blade of Wind', cost: 30, nature: 'wind', pp: 5, damage: 110, desc: 'Razor wind slash' },
            { id: 'vacuum_great',  name: 'Sickle Weasel: Great Cutting Whirlwind', cost: 60, nature: 'wind', pp: 4, damage: 200, desc: 'Weasel summon cyclone' },
            { id: 'greatest_fan',  name: 'Wind Release: Great Task of the Dragon', cost: 90, nature: 'wind', pp: 2, damage: 310, desc: 'Summon three wind weasels' },
        ],
    },
];

// ─── RARITY CONFIG ─────────────────────────────────────────────────────────
const RARITY_ORDER = ['Mythic', 'Legendary', 'Epic', 'Rare'];

// ─── PULL COSTS ──────────────────────────────────────────────────────────────
const PULL_COST = {
    single: { gems: 5 },     // 1 pull
    multi:  { gems: 40 },    // 10 pulls (10% discount vs 10x single)
    ryo:    { ryo: 25000 },  // 1 pull (Ryo option — more accessible)
};

// ─── PITY SYSTEM ─────────────────────────────────────────────────────────────
// After PITY_LIMIT pulls without a Legendary+, next pull is guaranteed Legendary+.
const PITY_LIMIT = 10;

// ─── WEIGHTED RANDOM ─────────────────────────────────────────────────────────
function weightedPull(pool, forceLegendary = false) {
    let filtered = pool;
    if (forceLegendary) {
        filtered = pool.filter(c => c.rarity === 'Legendary' || c.rarity === 'Mythic');
        if (!filtered.length) filtered = pool;
    }
    const totalWeight = filtered.reduce((s, c) => s + c.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const char of filtered) {
        roll -= char.weight;
        if (roll <= 0) return char;
    }
    return filtered[filtered.length - 1];
}

// ─── PERFORM PULL(S) ──────────────────────────────────────────────────────────
// pityCount: user's current pull count since last Legendary+.
// returns: { results: [charData], newPityCount, hadGuaranteed }
function performPulls(count, pityCount, ownedGachaChars = []) {
    const results = [];
    let currentPity = pityCount;
    let hadGuaranteed = false;

    for (let i = 0; i < count; i++) {
        currentPity++;
        const forceGuaranteed = currentPity >= PITY_LIMIT;
        const char = weightedPull(GACHA_POOL, forceGuaranteed);

        if (char.rarity === 'Legendary' || char.rarity === 'Mythic') {
            if (forceGuaranteed) hadGuaranteed = true;
            currentPity = 0;
        }

        const isDupe = ownedGachaChars.includes(char.id);
        results.push({ ...char, isDupe, dupeGems: isDupe ? 3 : 0 });
    }

    return { results, newPityCount: currentPity, hadGuaranteed };
}

// ─── FORMAT PULL RESULT ──────────────────────────────────────────────────────
function rarityStars(rarity) {
    return { Mythic: '🌟🌟🌟🌟🌟', Legendary: '⭐⭐⭐⭐', Epic: '💫💫💫', Rare: '✨✨' }[rarity] || '✨';
}

function formatPullResult(results, hadGuaranteed) {
    let msg = `🔮 *SUMMONING RESULTS* 🔮\n\n`;
    if (hadGuaranteed) msg += `✅ _Pity activated — guaranteed Legendary!_\n\n`;

    for (const char of results) {
        msg +=
            `${char.emoji} *${char.name}*\n` +
            `   ${rarityStars(char.rarity)} ${char.rarity}\n` +
            `   ${char.village} | ${char.nature ? char.nature.charAt(0).toUpperCase() + char.nature.slice(1) + ' Release' : 'No Nature'}\n` +
            `   _${char.description}_\n` +
            (char.isDupe ? `   ♻️ Duplicate — converted to +${char.dupeGems} 💎\n` : `   🆕 NEW CHARACTER UNLOCKED!\n`) +
            `\n`;
    }

    return msg;
}

// ─── SUMMON BANNER TEXT ──────────────────────────────────────────────────────
function bannerText(pityCount, userGems, userRyo) {
    const pullsToGuaranteed = PITY_LIMIT - pityCount;
    const lines = [
        `🔮 *NINJA SUMMONING SCROLL* 🔮`,
        `_Summon legendary shinobi not found in the regular shop!_`,
        ``,
        `💎 *Single Pull* — 5 Gems  (!summon single)`,
        `💎 *10-Pull* — 40 Gems  (!summon multi)  ✅ Save 10 Gems!`,
        `💰 *Ryo Pull* — 25,000 Ryo  (!summon ryo)`,
        ``,
        `📊 *Rates:*`,
        `   🌟 Mythic: 0.5%  |  ⭐ Legendary: 4%`,
        `   💫 Epic: 15%      |  ✨ Rare: 30%`,
        `   _(Remaining: Common characters from regular shop)_`,
        ``,
        `🎯 *Pity System:* Guaranteed Legendary in ${pullsToGuaranteed} pull${pullsToGuaranteed !== 1 ? 's' : ''}`,
        `💎 Your Gems: ${userGems}  |  💰 Your Ryo: ${userRyo.toLocaleString()}`,
        ``,
        `_Duplicates are converted to 3 Gems each!_`,
    ];
    return lines.join('\n');
}

module.exports = {
    GACHA_POOL,
    PULL_COST,
    PITY_LIMIT,
    performPulls,
    formatPullResult,
    bannerText,
    rarityStars,
};
