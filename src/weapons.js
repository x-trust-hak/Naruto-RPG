// src/weapons.js
// Signature Weapon System
//
// CANON ACCURACY:
// — Each weapon is tied to a specific character or character class
// — Weapons give flat stat bonuses (ATK/DEF/SPD) when equipped
// — Each weapon has 1 unique weapon jutsu slot — a special move only
//   available when that weapon is equipped
// — Weapons are bought from the weapon shop (!weaponshop)
// — Only ONE weapon can be equipped at a time
// — Some weapons are character-locked (only Sasuke can use Grass-Cutter etc.)
// — Weapons persist on the User model as equippedWeapon: weaponId

const WEAPONS = {

    // ── SASUKE / UCHIHA ──────────────────────────────────────────────────────
    grass_cutter: {
        id: 'grass_cutter',
        name: 'Grass-Cutter Sword (Kusanagi)',
        emoji: '⚔️',
        desc: 'Orochimaru\'s legendary blade, stolen by Sasuke. Can extend at will and cut through anything.',
        price: { ryo: 18000 },
        charLock: ['sasuke', 'obito'],   // only Sasuke/Uchiha line
        stats: { attack: 45, defense: 10, speed: 15 },
        weaponJutsu: {
            id: 'wj_kusanagi',
            name: 'Chidori Blade',
            cost: 70,
            damage: 280,
            nature: 'lightning',
            pp: 3,
            desc: 'Channel Chidori through Kusanagi — a blade of pure lightning',
        },
        rarity: 'Epic',
    },

    // ── KAKASHI ──────────────────────────────────────────────────────────────
    chakra_blade: {
        id: 'chakra_blade',
        name: 'Asuma\'s Chakra Blades',
        emoji: '🗡️',
        desc: 'Trench knives that channel chakra natures. Kakashi inherited them from Asuma.',
        price: { ryo: 14000 },
        charLock: ['kakashi'],
        stats: { attack: 35, defense: 8, speed: 25 },
        weaponJutsu: {
            id: 'wj_chakra_blade',
            name: 'Wind Release: Chakra Blade',
            cost: 55,
            damage: 220,
            nature: 'wind',
            pp: 4,
            desc: 'Wind-natured chakra flows through the blade — slices through defenses',
        },
        rarity: 'Rare',
    },

    // ── ZABUZA ───────────────────────────────────────────────────────────────
    kubikiribochi: {
        id: 'kubikiribochi',
        name: 'Kubikiribōchō (Executioner\'s Blade)',
        emoji: '🔪',
        desc: 'The legendary cleaver of the Seven Swordsmen. Regenerates by absorbing blood.',
        price: { ryo: 15000 },
        charLock: ['zabuza'],
        stats: { attack: 60, defense: 5, speed: -5 },   // heavy — trades speed for raw attack
        weaponJutsu: {
            id: 'wj_executioner',
            name: 'Silent Killing',
            cost: 60,
            damage: 300,
            nature: 'water',
            pp: 3,
            desc: 'Strike from the mist — undodgeable silent kill',
            undodgeable: true,
        },
        rarity: 'Epic',
    },

    // ── KISAME ───────────────────────────────────────────────────────────────
    samehada: {
        id: 'samehada',
        name: 'Samehada (Sharkskin)',
        emoji: '🦈',
        desc: 'A living sword that devours chakra. Kisame\'s partner — not just a weapon.',
        price: { ryo: 22000 },
        charLock: ['kisame'],
        stats: { attack: 40, defense: 20, speed: 10 },
        weaponJutsu: {
            id: 'wj_samehada',
            name: 'Samehada Fusion',
            cost: 0,         // costs 0 — steals chakra instead
            damage: 180,
            nature: 'water',
            pp: 4,
            desc: 'Samehada absorbs enemy chakra — deals damage and restores 80 of YOUR chakra',
            chakraSteal: 80,
        },
        rarity: 'Legendary',
    },

    // ── KILLER BEE ───────────────────────────────────────────────────────────
    seven_swords: {
        id: 'seven_swords',
        name: 'Seven Swords Style',
        emoji: '⚡',
        desc: 'Killer Bee\'s unique seven-blade fighting style. A sword in every limb — and his mouth.',
        price: { ryo: 20000 },
        charLock: ['killer_bee'],
        stats: { attack: 50, defense: 15, speed: 20 },
        weaponJutsu: {
            id: 'wj_seven_swords',
            name: 'Acrobat — Seven Swords Dance',
            cost: 80,
            damage: 340,
            nature: 'lightning',
            pp: 3,
            desc: 'Unstoppable seven-blade whirlwind attack — hits multiple times',
        },
        rarity: 'Legendary',
    },

    // ── PAIN / NAGATO ────────────────────────────────────────────────────────
    chakra_receiver: {
        id: 'chakra_receiver',
        name: 'Black Chakra Receiver Rods',
        emoji: '🖤',
        desc: 'Nagato\'s black rods that transmit chakra and can pierce anything.',
        price: { ryo: 16000 },
        charLock: ['pain', 'nagato_rinnegan'],
        stats: { attack: 30, defense: 25, speed: 5 },
        weaponJutsu: {
            id: 'wj_chakra_rod',
            name: 'Chakra Disruption Rod',
            cost: 65,
            damage: 200,
            nature: null,
            pp: 3,
            desc: 'Pierce the enemy with black rods — disrupts chakra flow, drains 100 enemy chakra',
            chakraDrain: 100,
        },
        rarity: 'Epic',
    },

    // ── ITACHI ───────────────────────────────────────────────────────────────
    totsuka_blade: {
        id: 'totsuka_blade',
        name: 'Totsuka Blade (Ethereal)',
        emoji: '🌀',
        desc: 'The sealing sword stored in Itachi\'s Susano\'o sake gourd. Seals anything it pierces.',
        price: { gems: 25 },
        charLock: ['itachi'],
        stats: { attack: 35, defense: 30, speed: 10 },
        weaponJutsu: {
            id: 'wj_totsuka',
            name: 'Totsuka Seal Strike',
            cost: 90,
            damage: 250,
            nature: null,
            pp: 2,
            desc: 'Ethereal blade seals the enemy — stun for 2 turns and sealed from jutsus',
            sealTurns: 2,
            stunTurns: 2,
        },
        rarity: 'Mythic',
    },

    // ── ANY CHARACTER (universal weapons) ────────────────────────────────────
    kunai_blade: {
        id: 'kunai_blade',
        name: 'Fuuma Shuriken',
        emoji: '✴️',
        desc: 'An oversized windmill shuriken. Long range, massive cutting power.',
        price: { ryo: 8000 },
        charLock: null,      // anyone can use
        stats: { attack: 25, defense: 0, speed: 10 },
        weaponJutsu: {
            id: 'wj_fuuma',
            name: 'Shadow Windmill',
            cost: 40,
            damage: 160,
            nature: 'wind',
            pp: 5,
            desc: 'Throw the massive shuriken with shadow clone guidance',
        },
        rarity: 'Rare',
    },

    explosive_tag_kunai: {
        id: 'explosive_tag_kunai',
        name: 'Minato\'s Flying Thunder Kunai',
        emoji: '⚡',
        desc: 'Special-formula kunai used by the Fourth Hokage for his Flying Thunder God Technique.',
        price: { ryo: 25000 },
        charLock: null,
        stats: { attack: 30, defense: 5, speed: 40 },   // huge speed bonus — Minato was the fastest
        weaponJutsu: {
            id: 'wj_ftg_kunai',
            name: 'Flying Thunder God Strike',
            cost: 85,
            damage: 260,
            nature: 'lightning',
            pp: 3,
            desc: 'Teleport to the marked kunai and strike — undodgeable',
            undodgeable: true,
        },
        rarity: 'Legendary',
    },

    war_fan: {
        id: 'war_fan',
        name: 'Temari\'s Iron War Fan',
        emoji: '🌬️',
        desc: 'The massive iron fan wielded by Temari. Generates devastating wind currents.',
        price: { ryo: 12000 },
        charLock: ['temari'],
        stats: { attack: 30, defense: 5, speed: 20 },
        weaponJutsu: {
            id: 'wj_war_fan',
            name: 'Cyclone Scythe Technique',
            cost: 50,
            damage: 200,
            nature: 'wind',
            pp: 4,
            desc: 'Summon three wind scythes — cannot miss',
            undodgeable: true,
        },
        rarity: 'Rare',
    },

    gentle_fist_wraps: {
        id: 'gentle_fist_wraps',
        name: 'Hyuga Gentle Fist Wraps',
        emoji: '⭕',
        desc: 'Chakra-infused hand wraps used by Hyuga clan. Amplify the Gentle Fist style.',
        price: { ryo: 10000 },
        charLock: ['neji'],
        stats: { attack: 20, defense: 15, speed: 15 },
        weaponJutsu: {
            id: 'wj_gentle_fist',
            name: 'Eight Trigrams: 128 Palms',
            cost: 75,
            damage: 320,
            nature: null,
            pp: 2,
            desc: '128 strikes to every chakra point — devastating Gentle Fist combo',
            chakraDrain: 120,
        },
        rarity: 'Epic',
    },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getWeapon(id) {
    return WEAPONS[id] || null;
}

function findWeapon(text) {
    const lower = text.trim().toLowerCase();
    return Object.values(WEAPONS).find(w =>
        w.id.toLowerCase().includes(lower) ||
        w.name.toLowerCase().includes(lower)
    ) || null;
}

function canEquip(characterId, weapon) {
    if (!weapon.charLock) return true;
    return weapon.charLock.includes(characterId);
}

function rarityEmoji(rarity) {
    return { Mythic: '🌟', Legendary: '⭐', Epic: '💫', Rare: '✨', Common: '⚪' }[rarity] || '⚪';
}

function priceLabel(weapon) {
    if (weapon.price.gems) return `💎 ${weapon.price.gems} Gems`;
    return `💰 ${weapon.price.ryo.toLocaleString()} Ryo`;
}

// Apply weapon stat bonuses on top of existing ps
function applyWeaponStats(ps, weapon) {
    if (!weapon) return ps;
    return {
        ...ps,
        attack:  (ps.attack  || 0) + (weapon.stats.attack  || 0),
        defense: (ps.defense || 0) + (weapon.stats.defense || 0),
        speed:   (ps.speed   || 0) + (weapon.stats.speed   || 0),
    };
}

// Weapon shop display
function weaponShopText(characterId, ownedWeaponIds = [], equippedWeaponId = null) {
    let txt = `🗡️ *SIGNATURE WEAPON SHOP* 🗡️\n\n`;
    txt += `_Each weapon grants flat stat bonuses + 1 exclusive weapon jutsu_\n\n`;

    const compatible   = [];
    const universal    = [];
    const incompatible = [];

    for (const w of Object.values(WEAPONS)) {
        const owned    = ownedWeaponIds.includes(w.id);
        const equipped = equippedWeaponId === w.id;
        const ok       = canEquip(characterId, w);
        const entry    = { w, owned, equipped, ok };
        if (ok && w.charLock) compatible.push(entry);
        else if (!w.charLock) universal.push(entry);
        else incompatible.push(entry);
    }

    const renderGroup = (label, entries) => {
        if (!entries.length) return '';
        let s = `*── ${label} ──*\n`;
        for (const { w, owned, equipped, ok } of entries) {
            s += `${w.emoji} *${w.name}* ${rarityEmoji(w.rarity)}\n`;
            s += `   ${w.desc.slice(0, 60)}...\n`;
            s += `   ⚔️ +${w.stats.attack} ATK | 🛡️ +${w.stats.defense} DEF | 💨 +${w.stats.speed} SPD\n`;
            s += `   🌀 Weapon Jutsu: *${w.weaponJutsu.name}* (${w.weaponJutsu.damage} dmg, ${w.weaponJutsu.cost} chakra)\n`;
            s += `   ${priceLabel(w)}`;
            if (equipped)      s += ` ✅ EQUIPPED`;
            else if (owned)    s += ` ✓ Owned`;
            else if (!ok)      s += ` 🔒 ${w.charLock?.join('/')} only`;
            s += `\n   _!buyweapon ${w.id}_\n\n`;
        }
        return s;
    };

    txt += renderGroup('Your Character\'s Weapons', compatible);
    txt += renderGroup('Universal Weapons', universal);
    if (incompatible.length) txt += renderGroup('Other Characters', incompatible);

    txt += `_!equipweapon [id] — equip a weapon you own_\n`;
    txt += `_!weaponinfo [id] — detailed info_`;
    return txt;
}

module.exports = {
    WEAPONS,
    getWeapon,
    findWeapon,
    canEquip,
    rarityEmoji,
    priceLabel,
    applyWeaponStats,
    weaponShopText,
};
