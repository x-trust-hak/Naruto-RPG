// src/clans.js
// Canon Naruto clans. If a player creates a clan whose name matches one of these
// (case-insensitive), they automatically inherit its fixed buff. Otherwise the
// clan is "custom" and receives a random buff via rollCustomClanBuff().

// Buff keys understood by the battle engine / stat system:
//   attack       -> flat % bonus to attack
//   defense      -> flat % bonus to defense
//   hp           -> % bonus to max HP
//   chakra       -> % bonus to max chakra
//   speed        -> flat % bonus to speed
//   crit         -> flat + to crit chance
//   chakraRegen  -> % bonus to passive chakra regen
//   lifesteal    -> % of damage dealt returned as HP in battle
//   dodge        -> + to dodge chance in battle

const CANON_CLANS = {
    uchiha: {
        name: 'Uchiha', emoji: '🔴', rarity: 'Legendary',
        description: 'Sharingan wielders — masters of fire and genjutsu.',
        buffs: { attack: 25, crit: 15, dodge: 10 }
    },
    senju: {
        name: 'Senju', emoji: '🌳', rarity: 'Legendary',
        description: 'The clan of the First Hokage — endless vitality.',
        buffs: { hp: 30, defense: 15, lifesteal: 10 }
    },
    uzumaki: {
        name: 'Uzumaki', emoji: '🌀', rarity: 'Epic',
        description: 'Monstrous chakra reserves and sealing mastery.',
        buffs: { chakra: 35, hp: 20, chakraRegen: 25 }
    },
    hyuga: {
        name: 'Hyuga', emoji: '👁️', rarity: 'Epic',
        description: 'Byakugan users — gentle fist pierces all defenses.',
        buffs: { attack: 15, crit: 20, dodge: 8 }
    },
    senju_uchiha: {
        name: 'Otsutsuki', emoji: '🌙', rarity: 'Mythic',
        description: 'Heavenly ancestors of all chakra — godlike power.',
        buffs: { attack: 30, chakra: 30, hp: 25, crit: 10 }
    },
    nara: {
        name: 'Nara', emoji: '🦌', rarity: 'Rare',
        description: 'Shadow manipulation and unmatched intellect.',
        buffs: { defense: 20, dodge: 12 }
    },
    akimichi: {
        name: 'Akimichi', emoji: '🍖', rarity: 'Rare',
        description: 'Calorie control — expansion jutsu and raw vitality.',
        buffs: { hp: 35, attack: 10 }
    },
    yamanaka: {
        name: 'Yamanaka', emoji: '🌸', rarity: 'Rare',
        description: 'Mind transfer specialists — disrupt the enemy.',
        buffs: { chakra: 20, crit: 10, dodge: 6 }
    },
    aburame: {
        name: 'Aburame', emoji: '🪲', rarity: 'Rare',
        description: 'Insect hosts — drain enemy chakra relentlessly.',
        buffs: { defense: 15, lifesteal: 15 }
    },
    inuzuka: {
        name: 'Inuzuka', emoji: '🐺', rarity: 'Rare',
        description: 'Beast companions — ferocious fang-over-fang assault.',
        buffs: { attack: 18, speed: 20 }
    },
    sarutobi: {
        name: 'Sarutobi', emoji: '🐒', rarity: 'Epic',
        description: 'The Will of Fire burns brightest in this clan.',
        buffs: { attack: 15, chakra: 15, defense: 10 }
    },
    hatake: {
        name: 'Hatake', emoji: '⚡', rarity: 'Epic',
        description: 'Copy ninja lineage — lightning-fast adaptation.',
        buffs: { speed: 25, crit: 12 }
    },
    namikaze: {
        name: 'Namikaze', emoji: '💛', rarity: 'Legendary',
        description: 'Yellow Flash bloodline — unrivaled speed.',
        buffs: { speed: 35, attack: 15, dodge: 10 }
    },
    kaguya: {
        name: 'Kaguya', emoji: '🦴', rarity: 'Epic',
        description: 'Dead Bone Pulse — weaponize the skeleton itself.',
        buffs: { attack: 22, defense: 18 }
    },
    hozuki: {
        name: 'Hozuki', emoji: '💧', rarity: 'Rare',
        description: 'Hydrification — become living water, hard to hit.',
        buffs: { dodge: 18, chakra: 15 }
    },
    yuki: {
        name: 'Yuki', emoji: '❄️', rarity: 'Rare',
        description: 'Ice release — freeze foes with crystal mirrors.',
        buffs: { defense: 20, speed: 12 }
    },
    kazekage: {
        name: 'Sabaku', emoji: '🏜️', rarity: 'Epic',
        description: 'Sand manipulation — the ultimate absolute defense.',
        buffs: { defense: 30, hp: 15 }
    },
    fuma: {
        name: 'Fuma', emoji: '🌪️', rarity: 'Rare',
        description: 'Giant shuriken specialists — wind-blade barrages.',
        buffs: { attack: 16, crit: 14 }
    },
    chinoike: {
        name: 'Chinoike', emoji: '🩸', rarity: 'Epic',
        description: 'Ketsuryugan — blood release genjutsu masters.',
        buffs: { attack: 20, lifesteal: 12 }
    },
    kurama: {
        name: 'Kurama', emoji: '🎴', rarity: 'Rare',
        description: 'Powerful genjutsu lineage — bend reality.',
        buffs: { crit: 18, dodge: 10 }
    },
};

// Random buffs for player-created custom clans (entirely new names)
const CUSTOM_BUFF_POOL = [
    { key: 'attack',      min: 8,  max: 20, label: 'Raw Power' },
    { key: 'defense',     min: 8,  max: 20, label: 'Iron Wall' },
    { key: 'hp',          min: 10, max: 25, label: 'Vitality' },
    { key: 'chakra',      min: 10, max: 25, label: 'Deep Reserves' },
    { key: 'speed',       min: 8,  max: 22, label: 'Swiftness' },
    { key: 'crit',        min: 6,  max: 15, label: 'Precision' },
    { key: 'chakraRegen', min: 10, max: 25, label: 'Flow' },
    { key: 'lifesteal',   min: 6,  max: 14, label: 'Bloodthirst' },
    { key: 'dodge',       min: 5,  max: 14, label: 'Evasion' },
];

const CUSTOM_RARITIES = ['Common', 'Common', 'Rare', 'Rare', 'Epic'];

// Look up a canon clan by the name a player typed (case-insensitive, matches name field)
function findCanonClan(typedName) {
    const lower = typedName.trim().toLowerCase();
    for (const key in CANON_CLANS) {
        if (CANON_CLANS[key].name.toLowerCase() === lower) {
            return { ...CANON_CLANS[key], type: 'canon' };
        }
    }
    return null;
}

// Roll a random buff set (1-2 buffs) for a custom clan
function rollCustomClanBuff() {
    const rarity = CUSTOM_RARITIES[Math.floor(Math.random() * CUSTOM_RARITIES.length)];
    const buffCount = rarity === 'Epic' ? 2 : (Math.random() > 0.5 ? 2 : 1);
    const pool = [...CUSTOM_BUFF_POOL];
    const buffs = {};
    const labels = [];

    for (let i = 0; i < buffCount && pool.length; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        const b = pool.splice(idx, 1)[0];
        const val = Math.floor(Math.random() * (b.max - b.min + 1)) + b.min;
        buffs[b.key] = (buffs[b.key] || 0) + val;
        labels.push(b.label);
    }

    return { rarity, buffs, labels };
}

// Build a readable buff string e.g. "⚔️ +25% ATK | 🎯 +15 Crit"
function describeBuffs(buffs) {
    if (!buffs || Object.keys(buffs).length === 0) return 'No bonuses';
    const map = {
        attack:      v => `⚔️ +${v}% ATK`,
        defense:     v => `🛡️ +${v}% DEF`,
        hp:          v => `❤️ +${v}% Max HP`,
        chakra:      v => `⚡ +${v}% Max Chakra`,
        speed:       v => `💨 +${v}% SPD`,
        crit:        v => `🎯 +${v} Crit%`,
        chakraRegen: v => `🌀 +${v}% Chakra Regen`,
        lifesteal:   v => `🩸 +${v}% Lifesteal`,
        dodge:       v => `👻 +${v}% Dodge`,
    };
    return Object.entries(buffs).map(([k, v]) => (map[k] ? map[k](v) : `${k} +${v}`)).join(' | ');
}

module.exports = { CANON_CLANS, findCanonClan, rollCustomClanBuff, describeBuffs };
