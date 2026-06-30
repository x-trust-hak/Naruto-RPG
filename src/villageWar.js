// src/villageWar.js
// Village War System
//
// CANON ACCURACY:
// — Kage declares war on another village (!war declare [village])
// — War lasts exactly 7 days (a "war week")
// — During war, PvP between war villages gives BONUS Ryo + Village Power (VP)
// — VP is tracked per village — the village with more VP at war end wins
// — Winning village gets a server-wide Ryo multiplier for 3 days
// — Only one active war per village at a time
// — Akatsuki can be targeted but cannot declare war (they have bounties instead)
// — Neutral villages can't fight in a war they're not part of

const VILLAGES = ['Leaf', 'Sand', 'Mist', 'Cloud', 'Stone', 'Rain'];

// ─── WAR STATE ────────────────────────────────────────────────────────────────
// Map of village -> active war entry
// {
//   attacker, defender,     — village names
//   attackerVP, defenderVP, — village power accumulated
//   startTime, endTime,
//   status: 'active' | 'ended',
//   winner, loser,
//   bonusEndTime,           — when the post-war Ryo bonus expires
//   warId,                  — unique ID (Date.now())
// }
const activeWars = new Map();      // keyed by attacker village
const warHistory = [];             // past wars (last 20)

// Pending war requests — waiting for defender Kage to accept/decline
// keyed by defender village name
// { attackerVillage, defenderVillage, attackerKageJid, attackerKageName,
//   requestedAt, expiresAt, groupJid }
const pendingWarRequests = new Map();

const WAR_REQUEST_EXPIRY_MS = 24 * 60 * 60 * 1000;  // 24 hours to respond
const WAR_KAGE_COST = 25000;   // each Kage pays 25k (total 50k war treasury)

// Post-war bonus — keyed by village name
// { ryoMult, endTime }
const postWarBonuses = new Map();

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const WAR_DURATION_MS    = 7 * 24 * 60 * 60 * 1000;  // 7 days
const BONUS_DURATION_MS  = 3 * 24 * 60 * 60 * 1000;  // 3 days post-war bonus
const WIN_RYO_MULT       = 1.5;                        // 50% Ryo bonus for winning village
const WAR_PVP_RYO_BONUS  = 2000;                       // bonus Ryo per war PvP win
const WAR_PVP_VP_PER_WIN = 50;                         // VP earned per kill
const WAR_COST_RYO       = 50000;                      // declaring war costs Ryo (from village treasury = Kage pays)
const PEACE_COOLDOWN_MS  = 24 * 60 * 60 * 1000;       // 24h before same villages can war again

// ─── VILLAGE EMBLEMS ─────────────────────────────────────────────────────────
const VILLAGE_EMBLEMS = {
    Leaf:  { emoji: '🍃', color: '🟢', element: 'Fire',      fullName: 'Hidden Leaf Village (Konohagakure)' },
    Sand:  { emoji: '🏜️', color: '🟡', element: 'Wind',      fullName: 'Hidden Sand Village (Sunagakure)' },
    Mist:  { emoji: '🌊', color: '🔵', element: 'Water',     fullName: 'Hidden Mist Village (Kirigakure)' },
    Cloud: { emoji: '⚡', color: '🟣', element: 'Lightning',  fullName: 'Hidden Cloud Village (Kumogakure)' },
    Stone: { emoji: '🪨', color: '🟠', element: 'Earth',     fullName: 'Hidden Stone Village (Iwagakure)' },
    Rain:  { emoji: '🌧️', color: '⬜', element: 'Water',     fullName: 'Hidden Rain Village (Amegakure)' },
};

function getEmblem(village) {
    return VILLAGE_EMBLEMS[village] || { emoji: '🏯', color: '⬜', element: '?', fullName: village };
}

// ─── WAR LOOKUP ──────────────────────────────────────────────────────────────
// Get the active war that involves a given village (as attacker OR defender)
function getVillageWar(village) {
    for (const war of activeWars.values()) {
        if (war.status === 'active' && (war.attacker === village || war.defender === village)) {
            if (Date.now() < war.endTime) return war;
        }
    }
    return null;
}

function getWarBetween(v1, v2) {
    for (const war of activeWars.values()) {
        if (war.status === 'active') {
            if ((war.attacker === v1 && war.defender === v2) ||
                (war.attacker === v2 && war.defender === v1)) {
                return war;
            }
        }
    }
    return null;
}

function areAtWar(v1, v2) {
    return getWarBetween(v1, v2) !== null;
}

// ─── POST-WAR BONUS ───────────────────────────────────────────────────────────
function getWarBonus(village) {
    const b = postWarBonuses.get(village);
    if (!b) return null;
    if (Date.now() > b.endTime) {
        postWarBonuses.delete(village);
        return null;
    }
    return b;
}

function warRyoMultiplier(village) {
    const b = getWarBonus(village);
    return b ? b.ryoMult : 1;
}

// ─── SEND WAR REQUEST ────────────────────────────────────────────────────────
// Attacker's Kage sends a war request — defender Kage must accept within 24h
function sendWarRequest(attackerVillage, defenderVillage, kageJid, kageName, groupJid) {
    if (attackerVillage === defenderVillage) {
        return { success: false, msg: '❌ You cannot declare war on your own village.' };
    }
    if (!VILLAGES.includes(attackerVillage) || !VILLAGES.includes(defenderVillage)) {
        return { success: false, msg: `❌ Invalid village. Valid options: ${VILLAGES.join(', ')}` };
    }
    if (getVillageWar(attackerVillage)) {
        return { success: false, msg: `❌ *${attackerVillage}* is already at war! End the current war first.` };
    }
    if (getVillageWar(defenderVillage)) {
        return { success: false, msg: `❌ *${defenderVillage}* is already at war with another village!` };
    }
    if (pendingWarRequests.has(defenderVillage)) {
        return { success: false, msg: `❌ *${defenderVillage}* already has a pending war request. Wait for it to expire.` };
    }
    if (pendingWarRequests.has(attackerVillage)) {
        return { success: false, msg: `❌ You already have a pending war request sent. Wait for a response.` };
    }

    const req = {
        attackerVillage,
        defenderVillage,
        attackerKageJid: kageJid,
        attackerKageName: kageName,
        requestedAt: Date.now(),
        expiresAt: Date.now() + WAR_REQUEST_EXPIRY_MS,
        groupJid,
    };
    pendingWarRequests.set(defenderVillage, req);

    return { success: true, req };
}

// ─── ACCEPT WAR REQUEST ───────────────────────────────────────────────────────
// Defender Kage accepts — war begins immediately
function acceptWarRequest(defenderVillage, defenderKageName) {
    const req = pendingWarRequests.get(defenderVillage);
    if (!req) return { success: false, msg: `❌ No pending war request for *${defenderVillage}*.` };
    if (Date.now() > req.expiresAt) {
        pendingWarRequests.delete(defenderVillage);
        return { success: false, msg: `❌ The war request has expired (24h limit). ${req.attackerVillage} must resend.` };
    }

    pendingWarRequests.delete(defenderVillage);

    const now = Date.now();
    const war = {
        warId:      now,
        attacker:   req.attackerVillage,
        defender:   defenderVillage,
        attackerKage: req.attackerKageName,
        defenderKage: defenderKageName,
        attackerVP: 0,
        defenderVP: 0,
        startTime:  now,
        endTime:    now + WAR_DURATION_MS,
        status:     'active',
        winner:     null,
        loser:      null,
        bonusEndTime: null,
        kills:      { [req.attackerVillage]: 0, [defenderVillage]: 0 },
    };

    activeWars.set(req.attackerVillage, war);
    return { success: true, war, req };
}

// ─── DECLINE WAR REQUEST ──────────────────────────────────────────────────────
function declineWarRequest(defenderVillage) {
    const req = pendingWarRequests.get(defenderVillage);
    if (!req) return { success: false, msg: `❌ No pending war request for *${defenderVillage}*.` };
    pendingWarRequests.delete(defenderVillage);
    return { success: true, req };
}

// ─── GET PENDING REQUEST ──────────────────────────────────────────────────────
function getPendingRequest(village) {
    // Check if this village sent OR received a request
    const received = pendingWarRequests.get(village);
    if (received) return { type: 'received', req: received };
    for (const req of pendingWarRequests.values()) {
        if (req.attackerVillage === village) return { type: 'sent', req };
    }
    return null;
}

// ─── LEGACY — kept for compatibility ─────────────────────────────────────────
function declareWar(attackerVillage, defenderVillage, kageUsername) {
    return sendWarRequest(attackerVillage, defenderVillage, null, kageUsername, null);
}

// ─── PROCESS WAR KILL ─────────────────────────────────────────────────────────
// Call after a PvP win if the two players are from opposing war villages.
// Returns bonus amounts for the winner.
function processWarKill(war, winnerVillage, loserVillage) {
    if (!war || war.status !== 'active') return null;

    const isAttacker = winnerVillage === war.attacker;
    if (isAttacker) {
        war.attackerVP += WAR_PVP_VP_PER_WIN;
    } else {
        war.defenderVP += WAR_PVP_VP_PER_WIN;
    }
    war.kills[winnerVillage] = (war.kills[winnerVillage] || 0) + 1;

    return {
        ryoBonus: WAR_PVP_RYO_BONUS,
        vpGained: WAR_PVP_VP_PER_WIN,
        attackerVP: war.attackerVP,
        defenderVP: war.defenderVP,
    };
}

// ─── END WAR ─────────────────────────────────────────────────────────────────
function endWar(war) {
    if (!war) return null;

    war.status = 'ended';
    const tie = war.attackerVP === war.defenderVP;

    if (tie) {
        war.winner = null;
        war.loser  = null;
    } else {
        war.winner = war.attackerVP > war.defenderVP ? war.attacker : war.defender;
        war.loser  = war.winner === war.attacker ? war.defender : war.attacker;

        // Apply post-war Ryo bonus to winner
        postWarBonuses.set(war.winner, {
            ryoMult:  WIN_RYO_MULT,
            endTime:  Date.now() + BONUS_DURATION_MS,
            warId:    war.warId,
        });
    }

    activeWars.delete(war.attacker);
    warHistory.unshift({ ...war, endedAt: Date.now() });
    if (warHistory.length > 20) warHistory.pop();

    return { winner: war.winner, loser: war.loser, tie };
}

// ─── HP BAR FOR VP ────────────────────────────────────────────────────────────
function vpBar(vp, maxVp) {
    const ratio  = maxVp > 0 ? Math.min(1, vp / maxVp) : 0;
    const filled = Math.round(ratio * 15);
    return `[${'█'.repeat(filled)}${'░'.repeat(15 - filled)}] ${vp.toLocaleString()} VP`;
}

// ─── WAR STATUS TEXT ─────────────────────────────────────────────────────────
function warStatusText(war) {
    const atk  = getEmblem(war.attacker);
    const def  = getEmblem(war.defender);
    const msLeft = Math.max(0, war.endTime - Date.now());
    const daysLeft  = Math.floor(msLeft / 86400000);
    const hoursLeft = Math.floor((msLeft % 86400000) / 3600000);
    const totalVP   = Math.max(1, war.attackerVP + war.defenderVP);
    const leading   = war.attackerVP >= war.defenderVP ? war.attacker : war.defender;
    const leadingVP = Math.max(war.attackerVP, war.defenderVP);

    let txt = `⚔️ *VILLAGE WAR* ⚔️\n\n`;
    txt += `${atk.emoji} *${war.attacker}* vs ${def.emoji} *${war.defender}*\n`;
    txt += `⏰ ${daysLeft}d ${hoursLeft}h remaining\n`;
    txt += `📢 Declared by: ${war.kage} (${war.attacker} Kage)\n\n`;
    txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    txt += `${atk.emoji} *${war.attacker}*\n`;
    txt += `${vpBar(war.attackerVP, totalVP)}\n`;
    txt += `⚔️ Kills: ${war.kills[war.attacker] || 0}\n\n`;
    txt += `${def.emoji} *${war.defender}*\n`;
    txt += `${vpBar(war.defenderVP, totalVP)}\n`;
    txt += `⚔️ Kills: ${war.kills[war.defender] || 0}\n\n`;
    txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    txt += `🏆 *Leading:* ${getEmblem(leading).emoji} ${leading} (${leadingVP} VP)\n\n`;
    txt += `💥 Win bonus: +${WAR_PVP_RYO_BONUS.toLocaleString()} Ryo per enemy kill\n`;
    txt += `🏆 Winner gets ×${WIN_RYO_MULT} Ryo for 3 days after war ends\n\n`;
    txt += `_PvP duel an enemy village ninja to earn VP for your village!_\n`;
    txt += `_!duel [enemy ninja name]_`;
    return txt;
}

// ─── WAR RESULT TEXT ─────────────────────────────────────────────────────────
function warResultText(war, result) {
    const atk = getEmblem(war.attacker);
    const def = getEmblem(war.defender);
    let txt = `🏆 *WAR OVER!* 🏆\n\n`;
    txt += `${atk.emoji} *${war.attacker}* — ${war.attackerVP} VP (${war.kills[war.attacker]||0} kills)\n`;
    txt += `${def.emoji} *${war.defender}* — ${war.defenderVP} VP (${war.kills[war.defender]||0} kills)\n\n`;
    if (result.tie) {
        txt += `🤝 *IT'S A TIE!* — Both villages fought with honour.\n`;
        txt += `_No Ryo bonus awarded for a tie._`;
    } else {
        const win = getEmblem(war.winner);
        txt += `🥇 *${win.emoji} ${war.winner} WINS THE WAR!*\n\n`;
        txt += `🎉 *${war.winner} ninja get ×${WIN_RYO_MULT} Ryo from ALL missions & battles for 3 days!*\n`;
        txt += `_Enjoy your spoils of war!_`;
    }
    return txt;
}

// ─── WAR HISTORY TEXT ─────────────────────────────────────────────────────────
function warHistoryText() {
    if (!warHistory.length) return `📜 *WAR HISTORY*\n\n_No wars have been fought yet._`;
    let txt = `📜 *WAR HISTORY* 📜\n\n`;
    for (const w of warHistory.slice(0, 8)) {
        const atk = getEmblem(w.attacker);
        const def = getEmblem(w.defender);
        const date = new Date(w.endedAt).toLocaleDateString();
        txt += `${atk.emoji} *${w.attacker}* vs ${def.emoji} *${w.defender}*\n`;
        if (w.winner) {
            txt += `  🥇 Winner: *${w.winner}* (${w.attackerVP}–${w.defenderVP} VP) | ${date}\n\n`;
        } else {
            txt += `  🤝 Tie (${w.attackerVP}–${w.defenderVP} VP) | ${date}\n\n`;
        }
    }
    return txt;
}

module.exports = {
    VILLAGES,
    VILLAGE_EMBLEMS,
    activeWars,
    warHistory,
    pendingWarRequests,
    postWarBonuses,
    WAR_DURATION_MS,
    WAR_COST_RYO,
    WAR_KAGE_COST,
    WAR_REQUEST_EXPIRY_MS,
    WAR_PVP_RYO_BONUS,
    WAR_PVP_VP_PER_WIN,
    WIN_RYO_MULT,
    getEmblem,
    getVillageWar,
    getWarBetween,
    areAtWar,
    getWarBonus,
    warRyoMultiplier,
    sendWarRequest,
    acceptWarRequest,
    declineWarRequest,
    getPendingRequest,
    declareWar,
    processWarKill,
    endWar,
    warStatusText,
    warResultText,
    warHistoryText,
};
