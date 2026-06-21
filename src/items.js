// src/items.js
// Consumable + utility items players can buy with ryo/gems and use in/out of battle.

const ITEMS = {
    soldier_pill: {
        id: 'soldier_pill', name: 'Soldier Pill', emoji: '💊',
        desc: 'Instantly restore 250 Chakra.',
        price: { ryo: 800 }, effect: { chakra: 250 }, usableInBattle: true, category: 'consumable',
    },
    ration_pill: {
        id: 'ration_pill', name: 'Blood Replenishing Pill', emoji: '🩹',
        desc: 'Instantly restore 300 HP.',
        price: { ryo: 1000 }, effect: { hp: 300 }, usableInBattle: true, category: 'consumable',
    },
    chakra_elixir: {
        id: 'chakra_elixir', name: 'Chakra Elixir', emoji: '🧪',
        desc: 'Fully restore HP and Chakra.',
        price: { gems: 2 }, effect: { fullHeal: true }, usableInBattle: true, category: 'consumable',
    },
    smoke_bomb: {
        id: 'smoke_bomb', name: 'Smoke Bomb', emoji: '💨',
        desc: 'Escape a losing battle with no penalty (battle item).',
        price: { ryo: 1500 }, effect: { flee: true }, usableInBattle: true, category: 'consumable',
    },
    kunai_set: {
        id: 'kunai_set', name: 'Explosive Kunai Set', emoji: '🔪',
        desc: 'Deal 150 bonus damage once in a battle.',
        price: { ryo: 1200 }, effect: { bonusDamage: 150 }, usableInBattle: true, category: 'consumable',
    },
    xp_scroll: {
        id: 'xp_scroll', name: 'Forbidden XP Scroll', emoji: '📜',
        desc: 'Grants 1,000 XP when used.',
        price: { gems: 3 }, effect: { xp: 1000 }, usableInBattle: false, category: 'boost',
    },
    lucky_charm: {
        id: 'lucky_charm', name: 'Lucky Charm', emoji: '🍀',
        desc: 'Doubles ryo from your next mission/battle win.',
        price: { ryo: 2500 }, effect: { luckyNext: true }, usableInBattle: false, category: 'boost',
    },
    clan_banner: {
        id: 'clan_banner', name: 'Clan Banner', emoji: '🏯',
        desc: 'Required material to found a new clan.',
        price: { ryo: 5000 }, effect: { clanToken: true }, usableInBattle: false, category: 'special',
    },
};

function getItem(id) {
    return ITEMS[id] || null;
}

// Find an item by typed name or id (fuzzy)
function findItem(text) {
    const lower = text.trim().toLowerCase();
    return Object.values(ITEMS).find(it =>
        it.id.toLowerCase().includes(lower) ||
        it.name.toLowerCase().includes(lower)
    ) || null;
}

function priceLabel(item) {
    if (item.price.gems) return `💎 ${item.price.gems} Gems`;
    return `💰 ${item.price.ryo.toLocaleString()} Ryo`;
}

module.exports = { ITEMS, getItem, findItem, priceLabel };
