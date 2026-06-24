// src/battleRender.js — Naruto RPG card renderer v3
// Compact premium card inspired by top WhatsApp RPG bots.
// Fonts: DejaVu Sans / Liberation Sans (pre-installed on Ubuntu/Railway)
// No emoji in SVG — uses text labels for full Linux compatibility.

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR   = path.join(__dirname, '../images');
const FONT  = 'DejaVu Sans, Liberation Sans, Ubuntu, sans-serif';
const FONTB = 'DejaVu Sans Bold, Liberation Sans Bold, Ubuntu Bold, sans-serif';

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function esc(s) {
    return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\"/g,'&quot;')
        .replace(/[^\x00-\x7F]/g, '');
}
function hpColor(p) { return p > 0.5 ? '#27ae60' : p > 0.25 ? '#f39c12' : '#e74c3c'; }
function chakraColor() { return '#2980b9'; }

// ─── Portrait helpers ────────────────────────────────────────────────────────
async function portraitBuf(imageName, w, h) {
    if (!imageName) return null;
    const fp = path.join(DIR, `${imageName}.jpg`);
    if (!fs.existsSync(fp)) return null;
    return sharp(fp).resize(w, h, { fit: 'cover', position: 'top' }).png().toBuffer();
}
async function fallbackBuf(label, w, h) {
    const ini = esc(label).trim().slice(0, 2).toUpperCase() || '??';
    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${w}" height="${h}" fill="#100a00"/>
        <text x="${w/2}" y="${h/2+24}" font-family="${FONTB}" font-size="64"
              font-weight="bold" fill="#cc5500" opacity="0.7" text-anchor="middle">${ini}</text>
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
}

// ─── PROFILE CARD ────────────────────────────────────────────────────────────
// Layout: [portrait 190px] | [stats panel]   Total: 680 x 310
async function renderProfileCard({
    username, level, rank, hp, maxHp, chakra, maxChakra,
    ryo, gems, wins, losses, rankPoints, attack, defense, speed, crit,
    imageName, emoji, nature, clanName, xp, xpNeeded, totalXp
}) {
    const W = 680, H = 310, PW = 190, PH = H - 20;
    const SW = W - PW - 20; // stats panel width
    const SX = PW + 16;     // stats panel X start

    const portrait = await portraitBuf(imageName, PW, PH)
        || await fallbackBuf(username, PW, PH);

    const hpPct  = clamp(hp / maxHp, 0, 1);
    const chPct  = clamp(chakra / maxChakra, 0, 1);
    const xpPct  = (xp != null && xpNeeded) ? clamp(xp / xpNeeded, 0, 1) : 0;
    const BARW   = SW - 16;

    const hpFill = Math.round(BARW * hpPct);
    const chFill = Math.round(BARW * chPct);
    const xpFill = Math.round(BARW * xpPct);

    const rankLabel = esc(rank || 'Genin');
    const lvLabel   = `Lv.${level}`;
    const natLabel  = nature ? esc(nature) : '';
    const clanLabel = clanName ? esc(clanName) : '';

    // Accent colour — orange for Naruto theme
    const ACCENT  = '#e67e22';
    const ACCENT2 = '#d35400';
    const BORDER  = '#cc4400';

    const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="cardbg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#14100a"/>
                <stop offset="100%" stop-color="#0a0806"/>
            </linearGradient>
            <linearGradient id="hp" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="${hpColor(hpPct)}"/>
                <stop offset="100%" stop-color="${hpColor(hpPct)}aa"/>
            </linearGradient>
            <linearGradient id="ch" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#3498db"/>
                <stop offset="100%" stop-color="#5dade2"/>
            </linearGradient>
            <linearGradient id="xpg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#9b59b6"/>
                <stop offset="100%" stop-color="#8e44ad"/>
            </linearGradient>
            <clipPath id="portrait-clip">
                <rect x="10" y="10" width="${PW}" height="${PH}" rx="10"/>
            </clipPath>
        </defs>

        <!-- Card background -->
        <rect width="${W}" height="${H}" fill="url(#cardbg)" rx="14"/>

        <!-- Outer border -->
        <rect width="${W}" height="${H}" fill="none" stroke="${BORDER}"
              stroke-width="2.5" rx="14"/>

        <!-- Portrait panel background -->
        <rect x="8" y="8" width="${PW + 4}" height="${H - 16}"
              fill="#0d0805" rx="10"/>

        <!-- Portrait area clip -->
        <rect x="10" y="10" width="${PW}" height="${PH}"
              fill="#0d0805" rx="10" clip-path="url(#portrait-clip)"/>

        <!-- Accent stripe at top -->
        <rect x="0" y="0" width="${W}" height="4" fill="${ACCENT}" rx="2"/>

        <!-- Divider between portrait and stats -->
        <rect x="${PW + 12}" y="16" width="1.5" height="${H - 32}" fill="#ffffff18"/>

        <!-- ── USERNAME ── -->
        <text x="${SX}" y="36" font-family="${FONTB}" font-size="20"
              font-weight="bold" fill="#ffffff">${esc(username)}</text>

        <!-- ── RANK + LEVEL tag ── -->
        <rect x="${SX}" y="42" width="${Math.min(rankLabel.length * 8 + 80, 220)}" height="20"
              fill="${ACCENT2}22" rx="10" stroke="${ACCENT2}" stroke-width="1"/>
        <text x="${SX + 10}" y="56" font-family="${FONT}" font-size="12"
              fill="${ACCENT}">${rankLabel}  •  ${lvLabel}${natLabel ? '  •  ' + natLabel : ''}</text>

        ${clanLabel ? `
        <text x="${SX}" y="76" font-family="${FONT}" font-size="12" fill="#aaaaaa">Clan: ${clanLabel}</text>` : ''}

        <!-- ── XP BAR ── -->
        <text x="${SX}" y="92" font-family="${FONT}" font-size="11" fill="#9b59b6">XP</text>
        <text x="${SX + BARW}" y="92" font-family="${FONT}" font-size="10"
              fill="#888888" text-anchor="end">${xp != null ? xp.toLocaleString() + ' / ' + (xpNeeded||'?').toLocaleString() : ''}</text>
        <rect x="${SX}" y="95" width="${BARW}" height="8" rx="4" fill="#1e1e1e"/>
        <rect x="${SX}" y="95" width="${xpFill}" height="8" rx="4" fill="url(#xpg)"/>

        <!-- ── HP BAR ── -->
        <text x="${SX}" y="118" font-family="${FONTB}" font-size="11"
              font-weight="bold" fill="#e74c3c">HP</text>
        <text x="${SX + BARW}" y="118" font-family="${FONT}" font-size="10"
              fill="#aaaaaa" text-anchor="end">${hp} / ${maxHp}</text>
        <rect x="${SX}" y="121" width="${BARW}" height="11" rx="5" fill="#1e1e1e"/>
        <rect x="${SX}" y="121" width="${hpFill}" height="11" rx="5" fill="url(#hp)"/>

        <!-- ── CHAKRA BAR ── -->
        <text x="${SX}" y="146" font-family="${FONTB}" font-size="11"
              font-weight="bold" fill="#3498db">CHAKRA</text>
        <text x="${SX + BARW}" y="146" font-family="${FONT}" font-size="10"
              fill="#aaaaaa" text-anchor="end">${chakra} / ${maxChakra}</text>
        <rect x="${SX}" y="149" width="${BARW}" height="8" rx="4" fill="#1e1e1e"/>
        <rect x="${SX}" y="149" width="${chFill}" height="8" rx="4" fill="url(#ch)"/>

        <!-- ── STAT DIVIDER ── -->
        <rect x="${SX}" y="168" width="${BARW}" height="1" fill="#ffffff14"/>

        <!-- ── STATS: ATK / DEF / SPD / CRIT ── -->
        <!-- ATK -->
        <rect x="${SX}" y="174" width="98" height="52" rx="7" fill="#e74c3c18"/>
        <text x="${SX + 8}" y="192" font-family="${FONT}" font-size="11" fill="#e74c3c">ATK</text>
        <text x="${SX + 8}" y="216" font-family="${FONTB}" font-size="22"
              font-weight="bold" fill="#ffffff">${attack}</text>

        <!-- DEF -->
        <rect x="${SX + 108}" y="174" width="98" height="52" rx="7" fill="#3498db18"/>
        <text x="${SX + 116}" y="192" font-family="${FONT}" font-size="11" fill="#3498db">DEF</text>
        <text x="${SX + 116}" y="216" font-family="${FONTB}" font-size="22"
              font-weight="bold" fill="#ffffff">${defense}</text>

        <!-- SPD -->
        <rect x="${SX + 216}" y="174" width="98" height="52" rx="7" fill="#2ecc7118"/>
        <text x="${SX + 224}" y="192" font-family="${FONT}" font-size="11" fill="#2ecc71">SPD</text>
        <text x="${SX + 224}" y="216" font-family="${FONTB}" font-size="22"
              font-weight="bold" fill="#ffffff">${speed}</text>

        <!-- CRIT -->
        <rect x="${SX + 324}" y="174" width="98" height="52" rx="7" fill="#f39c1218"/>
        <text x="${SX + 332}" y="192" font-family="${FONT}" font-size="11" fill="#f39c12">CRIT</text>
        <text x="${SX + 332}" y="216" font-family="${FONTB}" font-size="22"
              font-weight="bold" fill="#ffffff">${crit}%</text>

        <!-- ── BOTTOM ROW: Ryo / Gems / W / L / Arena ── -->
        <rect x="${SX}" y="234" width="${BARW}" height="1" fill="#ffffff14"/>

        <text x="${SX}" y="254" font-family="${FONT}" font-size="12" fill="#f5c518">
            RYO: ${(ryo||0).toLocaleString()}
        </text>
        <text x="${SX + 160}" y="254" font-family="${FONT}" font-size="12" fill="#5dade2">
            GEMS: ${gems}
        </text>
        <text x="${SX + 290}" y="254" font-family="${FONT}" font-size="12" fill="#aaaaaa">
            ARENA: ${rankPoints} pts
        </text>

        <text x="${SX}" y="276" font-family="${FONT}" font-size="12" fill="#2ecc71">
            W: ${wins}
        </text>
        <text x="${SX + 80}" y="276" font-family="${FONT}" font-size="12" fill="#e74c3c">
            L: ${losses}
        </text>
        <text x="${SX + 160}" y="276" font-family="${FONT}" font-size="12" fill="#888888">
            W/L: ${losses > 0 ? (wins/losses).toFixed(1) : wins}
        </text>
        ${totalXp != null ? `
        <text x="${SX + 290}" y="276" font-family="${FONT}" font-size="12" fill="#9b59b6">
            TOTAL XP: ${totalXp >= 1000000 ? (totalXp/1000000).toFixed(1)+'M' : totalXp >= 1000 ? (totalXp/1000).toFixed(1)+'K' : totalXp}
        </text>` : ''}

        <!-- Accent bottom bar -->
        <rect x="0" y="${H - 4}" width="${W}" height="4" fill="${ACCENT}" rx="2"/>

        <!-- Watermark -->
        <text x="${W - 14}" y="${H - 10}" font-family="${FONT}" font-size="10"
              fill="#ffffff22" text-anchor="end">Naruto RPG</text>
    </svg>`;

    return sharp({
        create: { width: W, height: H, channels: 4, background: { r:14,g:10,b:6,alpha:1 } }
    }).composite([
        { input: portrait, left: 10, top: 10, blend: 'over' },
        { input: Buffer.from(svg), left: 0, top: 0 },
    ]).jpeg({ quality: 92 }).toBuffer();
}

// ─── BATTLE CARD ─────────────────────────────────────────────────────────────
async function renderBattleCard({ p1, p2, round, title }) {
    const W = 700, H = 380, HW = W / 2;
    const FONT_  = FONT;
    const FONTB_ = FONTB;

    const [left, right] = await Promise.all([
        portraitBuf(p1.imageName, HW - 2, H).then(b => b || fallbackBuf(p1.name, HW - 2, H)),
        portraitBuf(p2.imageName, HW - 2, H).then(b => b || fallbackBuf(p2.name, HW - 2, H)),
    ]);

    const BARW = HW - 36;
    function panel(p, side) {
        const hpPct  = clamp(p.hp / p.maxHp, 0, 1);
        const chPct  = p.maxChakra ? clamp(p.chakra / p.maxChakra, 0, 1) : 0;
        const hpFill = Math.round(BARW * hpPct);
        const chFill = p.maxChakra ? Math.round(BARW * chPct) : 0;
        const bx = side === 'left' ? 18 : HW + 18;
        const by = H - 118;
        return `
            <rect x="${side==='left'?0:HW}" y="${by - 8}" width="${HW}" height="135"
                  fill="#000" opacity="0.68"/>
            <text x="${bx}" y="${by + 14}" font-family="${FONTB_}" font-size="17"
                  font-weight="bold" fill="#fff">${esc(p.name)}</text>
            ${p.stunned ? `<rect x="${bx}" y="${by+18}" width="74" height="17" rx="8" fill="#e74c3c"/>
            <text x="${bx+37}" y="${by+30}" font-family="${FONT_}" font-size="11"
                  fill="#fff" text-anchor="middle">STUNNED</text>` : ''}
            <text x="${bx}" y="${by + 44}" font-family="${FONT_}" font-size="11"
                  fill="#aaa">HP  ${Math.max(0,p.hp)} / ${p.maxHp}</text>
            <rect x="${bx}" y="${by+47}" width="${BARW}" height="13" rx="6" fill="#1a1a1a"/>
            <rect x="${bx}" y="${by+47}" width="${hpFill}" height="13" rx="6"
                  fill="${hpColor(hpPct)}"/>
            ${p.maxChakra ? `
            <text x="${bx}" y="${by+74}" font-family="${FONT_}" font-size="10"
                  fill="#5dade2">CHAKRA  ${p.chakra} / ${p.maxChakra}</text>
            <rect x="${bx}" y="${by+77}" width="${BARW}" height="9" rx="4" fill="#1a1a1a"/>
            <rect x="${bx}" y="${by+77}" width="${chFill}" height="9" rx="4" fill="#2980b9"/>` : ''}
        `;
    }

    const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${W}" height="${H}" fill="#0a0a0f" rx="14"/>
        <rect width="${W}" height="${H}" fill="none" stroke="#cc4400"
              stroke-width="2.5" rx="14"/>
        ${title ? `<rect x="0" y="0" width="${W}" height="40" fill="#000000cc"/>
        <text x="${W/2}" y="26" font-family="${FONTB_}" font-size="16"
              font-weight="bold" fill="#fff" text-anchor="middle">${esc(title)}</text>` : ''}
        <rect x="${HW - 1.5}" y="0" width="3" height="${H}" fill="#00000088"/>
        ${panel(p1, 'left')}
        ${panel(p2, 'right')}
        <!-- Round badge -->
        <circle cx="${HW}" cy="${H - 152}" r="26" fill="#cc3300" stroke="#fff" stroke-width="2.5"/>
        <text x="${HW}" y="${H - 160}" font-family="${FONT_}" font-size="10"
              fill="#ffddcc" text-anchor="middle">RD</text>
        <text x="${HW}" y="${H - 142}" font-family="${FONTB_}" font-size="20"
              font-weight="bold" fill="#fff" text-anchor="middle">${round}</text>
        <rect x="0" y="${H-4}" width="${W}" height="4" fill="#e67e22" rx="2"/>
    </svg>`;

    return sharp({
        create: { width: W, height: H, channels: 4, background: {r:10,g:10,b:15,alpha:1} }
    }).composite([
        { input: left,  left: 0,    top: 0 },
        { input: right, left: HW+2, top: 0 },
        { input: Buffer.from(svg), left: 0, top: 0 },
    ]).jpeg({ quality: 88 }).toBuffer();
}

module.exports = { renderBattleCard, renderProfileCard };
