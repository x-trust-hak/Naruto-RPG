// models/Clan.js
const mongoose = require('mongoose');

const ClanSchema = new mongoose.Schema({
    // Unique name — enforced case-insensitively in code via nameLower
    name:        { type: String, required: true },
    nameLower:   { type: String, required: true, unique: true },

    leaderId:    { type: String, required: true },   // phoneId of the clan leader
    leaderName:  { type: String, default: 'Unknown' },

    // 'canon' = matches an anime clan (fixed buff), 'custom' = player-made (random buff)
    type:        { type: String, default: 'custom' },
    rarity:      { type: String, default: 'Common' },
    emoji:       { type: String, default: '🩸' },
    description: { type: String, default: 'A rising shinobi clan.' },

    // Buff object applied to every member, e.g. { attack: 10, hp: 15, chakraRegen: 20 }
    buffs:       { type: mongoose.Schema.Types.Mixed, default: {} },

    members:     { type: [String], default: [] },     // phoneIds of all members (incl. leader)
    treasury:    { type: Number, default: 0 },         // shared clan ryo
    level:       { type: Number, default: 1 },
    clanXp:      { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Clan', ClanSchema);
