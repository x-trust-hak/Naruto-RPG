// src/battleRender.js
// Battle card renderer — portraits fill the whole card, HP/Chakra bars
// are overlaid at the BOTTOM of each portrait panel (like a real fighting game).
// The centre strip shows the round badge and title.
const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, '../images');
const CARD_W  = 1024;
const CARD_H  = 520;
const HALF_W  = CARD_W / 2;
const BAR_H   = 110;   // overlay strip at bottom of each portrait
const BAR_PAD = 14;
const BAR_W   = HALF_W - BAR_PAD * 2;

// These are multi-character posters — never crop into a portrait slot
const GENERIC_FALLBACKS = new Set(['welcome', 'akatsuki']);

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function esc(s) {
    return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

function hpColor(pct) {
    if (pct > 0.5) return '#3ecf5e';
    if (pct > 0.25) return '#e8c93a';
    return '#e0463d';
}

// ─── Overlay SVG (draws ON TOP of composited portraits) ───────────────────────
function overlaySvg({ p1, p2, round, title }) {
    const rightX = HALF_W + BAR_PAD;

    function panel(x, name, hpPct, hp, maxHp, chPct, ch, maxCh, stunned, anchor) {
        const bx = x;
        const by = CARD_H - BAR_H;
        const hpFill = Math.round(BAR_W * clamp(hpPct, 0, 1));
        const chFill = maxCh != null ? Math.round(BAR_W * clamp(chPct, 0, 1)) : 0;
        const hpY  = by + 46;
        const chY  = by + 74;
        const textX = anchor === 'start' ? bx : bx + BAR_W;
        return `
        <!-- ${name} panel -->
        <rect x="${HALF_W * (anchor==='start'?0:1)}" y="${by}" width="${HALF_W}" height="${BAR_H}"
              fill="#000000" opacity="0.62"/>
        <!-- name -->
        <text x="${textX}" y="${by + 28}"
              font-family="Arial Black,Arial,sans-serif" font-size="22" font-weight="900"
              fill="#ffffff" text-anchor="${anchor}"
              stroke="#000" stroke-width="3" paint-order="stroke">${esc(name)}</text>
        ${stunned ? `
        <rect x="${textX - (anchor==='start'?0:80)}" y="${by + 32}" width="80" height="20" rx="10" fill="#e0463d"/>
        <text x="${textX - (anchor==='start'?-40:40)}" y="${by + 46}"
              font-family="Arial,sans-serif" font-size="13" font-weight="bold"
              fill="#fff" text-anchor="middle">😵 STUNNED</text>` : ''}
        <!-- HP bar track -->
        <rect x="${bx}" y="${hpY}" width="${BAR_W}" height="16" rx="8" fill="#1a1a1a" stroke="#000" stroke-width="1.5"/>
        <rect x="${bx}" y="${hpY}" width="${hpFill}" height="16" rx="8" fill="${hpColor(hpPct)}"/>
        <text x="${textX}" y="${hpY + 12}"
              font-family="Arial,sans-serif" font-size="12" font-weight="bold"
              fill="#fff" text-anchor="${anchor}" stroke="#000" stroke-width="2" paint-order="stroke">
              ❤️ ${hp}/${maxHp}</text>
        ${maxCh != null ? `
        <!-- Chakra bar track -->
        <rect x="${bx}" y="${chY}" width="${BAR_W}" height="10" rx="5" fill="#1a1a1a" stroke="#000" stroke-width="1.5"/>
        <rect x="${bx}" y="${chY}" width="${chFill}" height="10" rx="5" fill="#3a8ee8"/>
        <text x="${textX}" y="${chY + 9}"
              font-family="Arial,sans-serif" font-size="11" font-weight="bold"
              fill="#cce4ff" text-anchor="${anchor}" stroke="#000" stroke-width="2" paint-order="stroke">
              ⚡ ${ch}/${maxCh}</text>` : ''}`;
    }

    const titleBar = title ? `
        <rect x="0" y="0" width="${CARD_W}" height="38" fill="#000000cc"/>
        <text x="${CARD_W/2}" y="26" font-family="Arial Black,Arial,sans-serif" font-size="18"
              font-weight="900" fill="#ffffff" text-anchor="middle">${esc(title)}</text>` : '';

    return `<svg width="${CARD_W}" height="${CARD_H}" xmlns="http://www.w3.org/2000/svg">
        ${titleBar}
        <!-- centre divider -->
        <rect x="${HALF_W - 2}" y="0" width="4" height="${CARD_H}" fill="#00000099"/>
        <!-- round badge -->
        <circle cx="${HALF_W}" cy="${CARD_H - BAR_H - 28}" r="32"
                fill="#cc3322" stroke="#fff" stroke-width="3"/>
        <text x="${HALF_W}" y="${CARD_H - BAR_H - 38}"
              font-family="Arial Black,Arial,sans-serif" font-size="11" font-weight="900"
              fill="#fff" text-anchor="middle">RD</text>
        <text x="${HALF_W}" y="${CARD_H - BAR_H - 14}"
              font-family="Arial Black,Arial,sans-serif" font-size="24" font-weight="900"
              fill="#fff" text-anchor="middle">${round}</text>
        ${panel(BAR_PAD, p1.name,
                p1.hp/p1.maxHp, Math.max(0,p1.hp), p1.maxHp,
                p1.chakra!=null?p1.chakra/p1.maxChakra:null, p1.chakra, p1.maxChakra,
                p1.stunned, 'start')}
        ${panel(rightX, p2.name,
                p2.hp/p2.maxHp, Math.max(0,p2.hp), p2.maxHp,
                p2.chakra!=null?p2.chakra/p2.maxChakra:null, p2.chakra, p2.maxChakra,
                p2.stunned, 'start')}
    </svg>`;
}

// ─── Portrait helpers ─────────────────────────────────────────────────────────
async function portraitBuf(imageName, w, h, flip) {
    if (!imageName || GENERIC_FALLBACKS.has(imageName)) return null;
    const fp = path.join(IMAGES_DIR, `${imageName}.jpg`);
    if (!fs.existsSync(fp)) return null;
    let img = sharp(fp).resize(w, h, { fit: 'cover', position: 'top' });
    if (flip) img = img.flop();
    return img.png().toBuffer();
}

async function fallbackBuf(emoji, w, h) {
    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1c1820"/>
            <stop offset="100%" stop-color="#080810"/>
        </linearGradient></defs>
        <rect width="${w}" height="${h}" fill="url(#g)"/>
        <text x="${w/2}" y="${h/2+55}" font-size="160" text-anchor="middle">${emoji}</text>
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
}

// ─── Profile card ────────────────────────────────────────────────────────────
async function renderProfileCard({ username, level, rank, hp, maxHp, chakra, maxChakra,
    ryo, gems, wins, losses, rankPoints, attack, defense, speed, crit,
    imageName, emoji, nature, clanName }) {

    const W = 900, H = 420, PORTRAIT_W = 280;
    const portraitRaw = await portraitBuf(imageName, PORTRAIT_W, H, false)
        || await fallbackBuf(emoji || '🥷', PORTRAIT_W, H);

    const hpPct  = clamp(hp / maxHp, 0, 1);
    const chPct  = clamp(chakra / maxChakra, 0, 1);
    const hpFill = Math.round(580 * hpPct);
    const chFill = Math.round(580 * chPct);

    const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#cc3322"/>
                <stop offset="100%" stop-color="#992211"/>
            </linearGradient>
        </defs>
        <!-- stats background only on right side -->
        <rect x="${PORTRAIT_W}" y="0" width="${W - PORTRAIT_W}" height="${H}" fill="#0d0d14"/>
        <!-- left accent bar -->
        <rect x="0" y="0" width="6" height="${H}" fill="url(#accent)"/>

        <!-- name + rank -->
        <text x="${PORTRAIT_W + 24}" y="48"
              font-family="Arial Black,Arial,sans-serif" font-size="30" font-weight="900"
              fill="#ffffff" stroke="#000" stroke-width="3" paint-order="stroke">${esc(username)}</text>
        <text x="${PORTRAIT_W + 24}" y="76"
              font-family="Arial,sans-serif" font-size="16" fill="#cccccc">
              ${esc(rank)} · Lv.${level}${nature ? ` · ${esc(nature)}` : ''}${clanName ? ` · ${esc(clanName)}` : ''}</text>

        <!-- HP bar -->
        <text x="${PORTRAIT_W + 24}" y="108" font-family="Arial,sans-serif" font-size="13" fill="#aaaaaa">HP</text>
        <rect x="${PORTRAIT_W + 24}" y="114" width="580" height="18" rx="9" fill="#1a1a1a"/>
        <rect x="${PORTRAIT_W + 24}" y="114" width="${hpFill}" height="18" rx="9" fill="${hpColor(hpPct)}"/>
        <text x="${W - 20}" y="128" font-family="Arial,sans-serif" font-size="12" fill="#fff" text-anchor="end">${hp}/${maxHp}</text>

        <!-- Chakra bar -->
        <text x="${PORTRAIT_W + 24}" y="148" font-family="Arial,sans-serif" font-size="13" fill="#aaaaaa">Chakra</text>
        <rect x="${PORTRAIT_W + 24}" y="154" width="580" height="12" rx="6" fill="#1a1a1a"/>
        <rect x="${PORTRAIT_W + 24}" y="154" width="${chFill}" height="12" rx="6" fill="#3a8ee8"/>
        <text x="${W - 20}" y="164" font-family="Arial,sans-serif" font-size="12" fill="#cce4ff" text-anchor="end">${chakra}/${maxChakra}</text>

        <!-- divider -->
        <rect x="${PORTRAIT_W + 24}" y="178" width="580" height="1" fill="#333"/>

        <!-- stats grid -->
        <text x="${PORTRAIT_W + 24}" y="206" font-family="Arial,sans-serif" font-size="14" fill="#ff7755">⚔️ ATK</text>
        <text x="${PORTRAIT_W + 24}" y="226" font-family="Arial Black,sans-serif" font-size="26" font-weight="900" fill="#fff">${attack}</text>

        <text x="${PORTRAIT_W + 170}" y="206" font-family="Arial,sans-serif" font-size="14" fill="#55aaff">🛡️ DEF</text>
        <text x="${PORTRAIT_W + 170}" y="226" font-family="Arial Black,sans-serif" font-size="26" font-weight="900" fill="#fff">${defense}</text>

        <text x="${PORTRAIT_W + 316}" y="206" font-family="Arial,sans-serif" font-size="14" fill="#ccff55">💨 SPD</text>
        <text x="${PORTRAIT_W + 316}" y="226" font-family="Arial Black,sans-serif" font-size="26" font-weight="900" fill="#fff">${speed}</text>

        <text x="${PORTRAIT_W + 462}" y="206" font-family="Arial,sans-serif" font-size="14" fill="#ffcc33">💥 CRIT</text>
        <text x="${PORTRAIT_W + 462}" y="226" font-family="Arial Black,sans-serif" font-size="26" font-weight="900" fill="#fff">${crit}%</text>

        <!-- divider -->
        <rect x="${PORTRAIT_W + 24}" y="244" width="580" height="1" fill="#333"/>

        <!-- economy + record -->
        <text x="${PORTRAIT_W + 24}" y="272" font-family="Arial,sans-serif" font-size="14" fill="#f5c518">💰 ${ryo.toLocaleString()} Ryo</text>
        <text x="${PORTRAIT_W + 220}" y="272" font-family="Arial,sans-serif" font-size="14" fill="#88ccff">💎 ${gems} Gems</text>
        <text x="${PORTRAIT_W + 380}" y="272" font-family="Arial,sans-serif" font-size="14" fill="#aaaaaa">🏅 ${rankPoints} Arena Pts</text>

        <text x="${PORTRAIT_W + 24}" y="300" font-family="Arial,sans-serif" font-size="14" fill="#3ecf5e">🏆 Wins: ${wins}</text>
        <text x="${PORTRAIT_W + 200}" y="300" font-family="Arial,sans-serif" font-size="14" fill="#e0463d">💀 Losses: ${losses}</text>
        <text x="${PORTRAIT_W + 400}" y="300" font-family="Arial,sans-serif" font-size="14" fill="#aaaaaa">
              W/L: ${losses > 0 ? (wins/losses).toFixed(1) : wins}</text>

        <!-- bottom watermark -->
        <text x="${W - 20}" y="${H - 12}" font-family="Arial,sans-serif" font-size="12"
              fill="#ffffff44" text-anchor="end">Naruto RPG</text>
    </svg>`;

    return sharp({ create: { width: W, height: H, channels: 4, background: { r:0,g:0,b:0,alpha:1 } } })
        .composite([
            { input: portraitRaw, left: 12, top: 12 },
            { input: Buffer.from(svg), left: 0, top: 0 },
        ])
        .jpeg({ quality: 88 })
        .toBuffer();
}

// ─── Battle card ─────────────────────────────────────────────────────────────
async function renderBattleCard({ p1, p2, round, title }) {
    const [left, right] = await Promise.all([
        portraitBuf(p1.imageName, HALF_W, CARD_H, false)
            .then(b => b || fallbackBuf(p1.emoji || '🥷', HALF_W, CARD_H)),
        portraitBuf(p2.imageName, HALF_W, CARD_H, true)
            .then(b => b || fallbackBuf(p2.emoji || '👹', HALF_W, CARD_H)),
    ]);

    return sharp({
        create: { width: CARD_W, height: CARD_H, channels: 4, background: { r:10,g:10,b:14,alpha:1 } }
    }).composite([
        { input: left,  left: 0,      top: 0 },
        { input: right, left: HALF_W, top: 0 },
        { input: Buffer.from(overlaySvg({ p1, p2, round, title })), left: 0, top: 0 },
    ]).jpeg({ quality: 85 }).toBuffer();
}

module.exports = { renderBattleCard, renderProfileCard };
