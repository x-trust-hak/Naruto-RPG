// src/chuninExam.js
// Chunin Exam Tournament System
//
// CANON ACCURACY:
// — Players register with !exam register (must be Genin rank)
// — When 4 or 8 players are in, the bracket auto-generates
// — Admin or auto-timer can start it with !exam start
// — Matches are 1v1 turn-based fights within the exam
// — Winner advances through bracket; loser is eliminated
// — Grand winner gets promoted to Chunin + major rewards
// — One exam per group, one active tournament at a time

// ─── TOURNAMENT STATE ────────────────────────────────────────────────────────
// One tournament per group JID
// {
//   groupJid,
//   status: 'registration' | 'active' | 'finished',
//   minPlayers: 4 | 8,
//   registrants: [ { jid, username, village, rank, level, wins } ],
//   bracket: [ { roundName, matches: [ { p1, p2, winner, status } ] } ],
//   currentRound: 0,
//   currentMatchIdx: 0,
//   activeMatch: null,   // current live fight data
//   startTime,
//   proctorJid,          // who ran !exam start
// }

const activeTournaments = new Map();

// ─── CANON EXAM ROUNDS ───────────────────────────────────────────────────────
const ROUND_NAMES = [
    'Written Test',        // R1 in canon — we skip (handle via trivia separately)
    'Forest of Death',     // R2
    'Preliminary Battles', // R3 (individual 1v1)
    'Final Tournament',    // R4 (the main event)
    'Grand Finals',        // last round
];

function getRoundName(idx, totalRounds) {
    if (totalRounds <= 2) return idx === 0 ? 'Semi-Finals' : 'Grand Finals';
    if (totalRounds === 3) return ['Quarter-Finals', 'Semi-Finals', 'Grand Finals'][idx] || `Round ${idx + 1}`;
    return ROUND_NAMES[idx] || `Round ${idx + 1}`;
}

// ─── BRACKET BUILDER ─────────────────────────────────────────────────────────
// Shuffles registrants and builds a single-elimination bracket.
function buildBracket(registrants) {
    // Pad to next power of 2 if needed (byes)
    const n = registrants.length;
    const size = n <= 4 ? 4 : 8;

    // Shuffle
    const pool = [...registrants].sort(() => Math.random() - 0.5);
    while (pool.length < size) pool.push(null); // null = BYE

    const totalRounds = Math.log2(size);
    const rounds = [];

    // Round 1 matches
    const r1Matches = [];
    for (let i = 0; i < size; i += 2) {
        r1Matches.push({
            p1: pool[i],
            p2: pool[i + 1],
            winner: pool[i + 1] === null ? pool[i] : null, // BYE auto-wins
            status: pool[i + 1] === null ? 'bye' : 'pending',
        });
    }
    rounds.push({ roundName: getRoundName(0, totalRounds), matches: r1Matches });

    // Placeholder rounds
    for (let r = 1; r < totalRounds; r++) {
        const prevMatches = rounds[r - 1].matches;
        const matches = [];
        for (let i = 0; i < prevMatches.length; i += 2) {
            matches.push({ p1: null, p2: null, winner: null, status: 'waiting' });
        }
        rounds.push({ roundName: getRoundName(r, totalRounds), matches });
    }

    return rounds;
}

// ─── ADVANCE BRACKET ─────────────────────────────────────────────────────────
// After a match finishes, slot the winner into the next round.
function advanceBracket(tournament, roundIdx, matchIdx, winnerData) {
    const round = tournament.bracket[roundIdx];
    round.matches[matchIdx].winner = winnerData;
    round.matches[matchIdx].status = 'done';

    const nextRound = tournament.bracket[roundIdx + 1];
    if (!nextRound) return; // tournament is over

    const nextMatchIdx = Math.floor(matchIdx / 2);
    const slot = matchIdx % 2 === 0 ? 'p1' : 'p2';
    nextRound.matches[nextMatchIdx][slot] = winnerData;

    // If both slots filled, mark that match as pending
    const nm = nextRound.matches[nextMatchIdx];
    if (nm.p1 && nm.p2) nm.status = 'pending';
    else if (nm.p1 && !nm.p2) nm.status = 'waiting'; // other side not done yet
}

// ─── FIND NEXT PENDING MATCH ──────────────────────────────────────────────────
function findNextMatch(tournament) {
    for (let r = 0; r < tournament.bracket.length; r++) {
        for (let m = 0; m < tournament.bracket[r].matches.length; m++) {
            const match = tournament.bracket[r].matches[m];
            if (match.status === 'pending') {
                return { roundIdx: r, matchIdx: m, match };
            }
        }
    }
    return null; // tournament done
}

// ─── IS TOURNAMENT COMPLETE ───────────────────────────────────────────────────
function getChampion(tournament) {
    const lastRound = tournament.bracket[tournament.bracket.length - 1];
    const finalMatch = lastRound.matches[0];
    if (finalMatch.status === 'done') return finalMatch.winner;
    return null;
}

// ─── BRACKET DISPLAY ─────────────────────────────────────────────────────────
function bracketText(tournament) {
    let txt = `🏆 *CHUNIN EXAM — BRACKET* 🏆\n\n`;

    for (const round of tournament.bracket) {
        txt += `━━━ *${round.roundName}* ━━━\n`;
        for (const m of round.matches) {
            if (m.status === 'bye') {
                txt += `  🎫 ${m.p1.username} — *BYE (auto-advance)*\n`;
            } else if (m.status === 'waiting') {
                txt += `  ⏳ TBD vs TBD\n`;
            } else if (m.status === 'pending') {
                txt += `  ⚔️ *${m.p1.username}* vs *${m.p2.username}*`;
                if (tournament.activeMatch?.p1?.jid === m.p1?.jid) txt += ` ← LIVE`;
                txt += `\n`;
            } else {
                const loser = m.winner?.jid === m.p1?.jid ? m.p2 : m.p1;
                txt += `  ✅ *${m.winner?.username}* def. ${loser?.username || '?'}\n`;
            }
        }
        txt += `\n`;
    }

    const champ = getChampion(tournament);
    if (champ) txt += `🥇 *CHAMPION: ${champ.username}!*\n`;

    return txt;
}

// ─── REGISTRATION DISPLAY ────────────────────────────────────────────────────
function registrationText(tournament) {
    const reg = tournament.registrants;
    const min = tournament.minPlayers;
    const needed = Math.max(0, 4 - reg.length); // starts at 4
    let txt = `📜 *CHUNIN EXAM — REGISTRATION* 📜\n\n`;
    txt += `_The Kage has announced the Chunin Selection Exams!_\n\n`;
    txt += `👥 *Registered (${reg.length}/${min}):*\n`;
    for (const r of reg) {
        txt += `  ${r.village ? `🏡` : `🥷`} *${r.username}* — Lv.${r.level} ${r.village}\n`;
    }
    if (reg.length < 4) {
        txt += `\n⏳ Need ${needed} more ninja to begin...\n`;
    } else {
        txt += `\n✅ *Enough players! Admin can type !exam start*\n`;
        txt += `_(More players can still join up to ${min})_\n`;
    }
    txt += `\n_!exam register — enter the exam (Genin+ required)_\n`;
    txt += `_!exam bracket — see current bracket_`;
    return txt;
}

// ─── EXAM FIGHT SIMULATION ───────────────────────────────────────────────────
// Exam fights are resolved via the normal !use battle system.
// This just stores the match context in activeMatch.
function startExamFight(tournament, roundIdx, matchIdx) {
    const match = tournament.bracket[roundIdx].matches[matchIdx];
    tournament.activeMatch = {
        roundIdx,
        matchIdx,
        p1: match.p1,
        p2: match.p2,
        status: 'live',
    };
    match.status = 'live';
}

// ─── REWARD TABLE ─────────────────────────────────────────────────────────────
const EXAM_REWARDS = {
    champion: {
        ryo: 50000,
        gems: 20,
        xp: 5000,
        rankPromotion: 'Chunin',
        title: '🏆 Chunin Exam Champion',
        hpBonus: 200,
        chakraBonus: 80,
    },
    finalist: {
        ryo: 20000,
        gems: 8,
        xp: 2000,
        title: '🥈 Chunin Exam Finalist',
    },
    semis: {
        ryo: 10000,
        gems: 4,
        xp: 1000,
        title: '🥉 Chunin Exam Semi-Finalist',
    },
    participant: {
        ryo: 3000,
        gems: 1,
        xp: 300,
    },
};

module.exports = {
    activeTournaments,
    buildBracket,
    advanceBracket,
    findNextMatch,
    getChampion,
    bracketText,
    registrationText,
    startExamFight,
    EXAM_REWARDS,
    ROUND_NAMES,
};
