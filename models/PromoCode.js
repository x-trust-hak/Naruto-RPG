// models/PromoCode.js
const mongoose = require('mongoose');

const PromoCodeSchema = new mongoose.Schema({
    code:        { type: String, required: true, unique: true }, // stored UPPERCASE
    rewardType:  { type: String, enum: ['ryo', 'gems', 'xp'], required: true },
    amount:      { type: Number, required: true },
    maxUses:     { type: Number, default: 1 },
    usedBy:      { type: [String], default: [] }, // phoneIds that already redeemed
    expiresAt:   { type: Date, default: null },    // null = never expires
    createdBy:   { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('PromoCode', PromoCodeSchema);
