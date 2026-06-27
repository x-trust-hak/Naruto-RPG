// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    phoneId:          { type: String, required: true, unique: true },
    username:         { type: String, default: 'Ninja', index: true },
    village:          { type: String, default: 'None' },
    clan:             { type: String, default: 'None' },          // clan NAME the user belongs to ('None' if clanless)
    clanRole:         { type: String, default: 'None' },          // 'Leader' | 'Member' | 'None'
    bloodlineRarity:  { type: String, default: 'None' },
    rank:             { type: String, default: 'Academy Student' },

    // Character system
    character:        { type: String, default: 'naruto' },
    ownedCharacters:  { type: [String], default: [] },
    unlockedJutsus:   { type: [String], default: [] },
    equippedJutsus:   { type: [String], default: [] },

    // XP & Level — XP never resets, keeps accumulating
    level:            { type: Number, default: 1 },
    xp:               { type: Number, default: 0 },       // current level XP progress
    totalXp:          { type: Number, default: 0 },       // lifetime XP (never resets)

    // Currency
    ryo:              { type: Number, default: 1000 },
    gems:             { type: Number, default: 5 },

    // Stats (based on character base + level bonuses)
    hp:     { current: { type: Number, default: 500 }, max: { type: Number, default: 500 } },
    chakra: { current: { type: Number, default: 500 }, max: { type: Number, default: 500 } },

    // Kage/title system
    isKage:           { type: Boolean, default: false },
    kageVotes:        { type: Number, default: 0 },

    // Battle record
    wins:             { type: Number, default: 0 },
    losses:           { type: Number, default: 0 },
    winStreak:        { type: Number, default: 0 },
    rankPoints:       { type: Number, default: 0 },   // PvP arena rating

    // Inventory — array of { itemId, qty }
    inventory:        { type: [{ itemId: String, qty: { type: Number, default: 1 } }], default: [] },

    // Daily streak
    dailyStreak:      { type: Number, default: 0 },

    // Cooldowns
    lastBattle:       { type: Date, default: null },

    // Admin
    isBanned:         { type: Boolean, default: false },
    isAdmin:          { type: Boolean, default: false },

    // Onboarding
    registrationStep: { type: String, default: 'NONE' },
    lastDaily:        { type: Date, default: null },
    lastMission:      { type: Date, default: null },

    // Gacha / Summoning Scroll
    gachaPity:        { type: Number, default: 0 },        // pulls since last Legendary+
    ownedGachaChars:  { type: [String], default: [] },     // gacha-exclusive char IDs owned
    totalPulls:       { type: Number, default: 0 },        // lifetime pull count

    // Daily Story Missions
    dailyMissionData: {
        date:  { type: String, default: '' },              // 'YYYY-MM-DD'
        count: { type: Number, default: 0 },               // missions run today
    },

    // Boss Raid
    raidDamage:       { type: Number, default: 0 },
    raidKills:        { type: Number, default: 0 },

    // Weapons
    ownedWeapons:     { type: [String], default: [] },     // weapon IDs owned
    equippedWeapon:   { type: String, default: '' },       // currently equipped weapon ID

    // Akatsuki
    isAkatsuki:       { type: Boolean, default: false },
    akatsukiRing:     { type: String, default: '' },       // ring id e.g. 'sei'
    akatsukiJoinDate: { type: Date, default: null },
    darkMissions:     { type: Number, default: 0 },        // total dark missions completed
    bountiesCollected:{ type: Number, default: 0 },        // bounties claimed

    // Chunin Exam Tournament
    examWins:         { type: Number, default: 0 },        // tournament match wins
    examTitles:       { type: [String], default: [] },     // earned titles e.g. 'Chunin Exam Champion'
    chuninPromo:      { type: Boolean, default: false },   // promoted via exam
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
