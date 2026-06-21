// src/natures.js
// The Five Basic Nature Transformations (Chakra Natures), and the
// strength/weakness cycle between them.
//
// This isn't a Pokémon-style invented type chart — it's reasoned directly
// from how the techniques interact on-screen in canon:
//   💧 Water douses 🔥 Fire
//   🔥 Fire burns through (and is fed by) 🌪️ Wind
//   🌪️ Wind erodes 🌱 Earth
//   🌱 Earth grounds out ⚡ Lightning
//   ⚡ Lightning superconducts through 💧 Water
// That gives a clean five-point cycle, each nature strong against the next
// and weak against the previous.
//
// Advanced/combo releases (Ice, Lava, Wood, Boil, Scorch, Explosion) and the
// non-elemental Yin/Yang/Yin-Yang chakra types are flavor-only for now —
// they don't sit cleanly on this wheel and most of the roster doesn't use
// them, so they carry no nature and no combat multiplier.

const NATURES = {
    fire:      { id: 'fire',      name: 'Fire Release',      jp: 'Katon',  emoji: '🔥' },
    wind:      { id: 'wind',      name: 'Wind Release',      jp: 'Fūton',  emoji: '🌪️' },
    earth:     { id: 'earth',     name: 'Earth Release',     jp: 'Doton',  emoji: '🌱' },
    lightning: { id: 'lightning', name: 'Lightning Release', jp: 'Raiton', emoji: '⚡' },
    water:     { id: 'water',     name: 'Water Release',     jp: 'Suiton', emoji: '💧' },
};

// beats[X] = the nature X is strong against
const BEATS = {
    fire: 'wind',
    wind: 'earth',
    earth: 'lightning',
    lightning: 'water',
    water: 'fire',
};

const ADVANTAGE_MULT = 1.3;
const DISADVANTAGE_MULT = 0.75;

// Damage multiplier for an attacking nature vs a defending nature.
// Untyped jutsu (taijutsu, dojutsu, fuinjutsu, pure chakra-shape ninjutsu
// like Rasengan, tailed-beast forms, etc.) never get a nature bonus/penalty —
// only nature-vs-nature matchups trigger the wheel.
function natureMultiplier(attackNature, defendNature) {
    if (!attackNature || !defendNature) return 1;
    if (attackNature === defendNature) return 1;
    if (BEATS[attackNature] === defendNature) return ADVANTAGE_MULT;
    if (BEATS[defendNature] === attackNature) return DISADVANTAGE_MULT;
    return 1;
}

// Short label for battle logs, e.g. "🔥 Super effective!" / "💧 Resisted!"
function natureResultLabel(mult) {
    if (mult > 1) return '🔥 Super effective!';
    if (mult < 1) return '🛡️ Resisted!';
    return null;
}

function natureTag(natureId) {
    const n = NATURES[natureId];
    return n ? `${n.emoji} ${n.name}` : null;
}

module.exports = {
    NATURES,
    BEATS,
    ADVANTAGE_MULT,
    DISADVANTAGE_MULT,
    natureMultiplier,
    natureResultLabel,
    natureTag,
};
