// src/events.js
// Rotating world events that apply global reward multipliers. The active event is
// derived from the current day so it changes automatically with no cron needed.

const EVENTS = {
    weekend_xp: {
        id: 'weekend_xp', emoji: '🌟', name: 'Double XP Weekend',
        desc: 'All XP gains are doubled! Train and battle hard.',
        xpMult: 2, ryoMult: 1,
    },
    bandit_surge: {
        id: 'bandit_surge', emoji: '💰', name: 'Bandit Surge',
        desc: 'Rogue ninja flood the land — Ryo rewards +50%.',
        xpMult: 1, ryoMult: 1.5,
    },
    chunin_exams: {
        id: 'chunin_exams', emoji: '🎌', name: 'Chunin Exams',
        desc: 'Prove yourself! XP rewards +50%.',
        xpMult: 1.5, ryoMult: 1,
    },
};

// Returns the currently active event or null.
function getActiveEvent() {
    const day = new Date().getDay(); // 0 = Sun ... 6 = Sat
    if (day === 0 || day === 6) return EVENTS.weekend_xp;
    if (day === 3) return EVENTS.bandit_surge;
    if (day === 5) return EVENTS.chunin_exams;
    return null;
}

function xpMultiplier() { const e = getActiveEvent(); return e ? e.xpMult : 1; }
function ryoMultiplier() { const e = getActiveEvent(); return e ? e.ryoMult : 1; }

module.exports = { EVENTS, getActiveEvent, xpMultiplier, ryoMultiplier };
