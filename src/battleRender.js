// src/battleRender.js
// Renders a single composited "battle card" PNG for the current round of a
// fight: both fighters' portraits side by side with HP (and chakra, for the
// player) bars, names, and a round badge. Sent as the image alongside the
// existing text combat log — the image is the at-a-glance status, the text
// log keeps the move-by-move detail.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, '../images');
const CARD_W = 1024;
const CARD_H = 576;
const TOP_H = 132;               // status bar strip height
const PORTRAIT_H = CARD_H - TOP_H;
const HALF_W = CARD_W / 2;

// These are group-poster/banner images, not single-character portraits —
// never crop these into a portrait slot, use the stylized fallback instead.
const GENERIC_FALLBACKS = new Set(['welcome', 'akatsuki']);

function clamp01(n) { return Math.max(0, Math.min(1, n)); }

function escapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Color for an HP bar fill based on remaining % — green -> yellow -> red.
function hpColor(pct) {
    if (pct > 0.5) return '#3ecf5e';
    if (pct > 0.2) return '#e8c93a';
    return '#e0463d';
}

function statusBarSvg({ side, name, hpPct, hp, maxHp, chakraPct, chakra, maxChakra, stunned }) {
    const isLeft = side === 'left';
    const barW = 420;
    const x0 = isLeft ? 24 : CARD_W - 24 - barW;
    const anchor = isLeft ? 'start' : 'end';
    const textX = isLeft ? x0 : x0 + barW;
    const hpFillW = Math.round(barW * clamp01(hpPct));
    const hpFillX = isLeft ? x0 : x0 + barW - hpFillW;
    const showChakra = chakra !== undefined && maxChakra !== undefined;
    const chFillW = showChakra ? Math.round(barW * clamp01(chakraPct)) : 0;
    const chFillX = isLeft ? x0 : x0 + barW - chFillW;

    return `
        <text x="${textX}" y="34" font-family="Arial Black, Arial, sans-serif" font-size="26" font-weight="900"
              fill="#ffffff" text-anchor="${anchor}" stroke="#000000" stroke-width="3" paint-order="stroke">${escapeXml(name)}</text>
        ${stunned ? `<text x="${textX}" y="58" font-family="Arial, sans-serif" font-size="18" fill="#ffd84a" text-anchor="${anchor}">😵 STUNNED</text>` : ''}
        <rect x="${x0}" y="64" width="${barW}" height="18" rx="9" fill="#1a1a1a" stroke="#000" stroke-width="2"/>
        <rect x="${hpFillX}" y="64" width="${hpFillW}" height="18" rx="9" fill="${hpColor(hpPct)}"/>
        <text x="${textX}" y="78" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="${anchor}">${hp}/${maxHp}</text>
        ${showChakra ? `
        <rect x="${x0}" y="92" width="${barW}" height="12" rx="6" fill="#1a1a1a" stroke="#000" stroke-width="2"/>
        <rect x="${chFillX}" y="92" width="${chFillW}" height="12" rx="6" fill="#3a8ee8"/>
        ` : ''}
    `;
}

function baseSvg({ p1, p2, round, title }) {
    return `
    <svg width="${CARD_W}" height="${CARD_H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="topbar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#15151c" stop-opacity="0.97"/>
                <stop offset="100%" stop-color="#15151c" stop-opacity="0.75"/>
            </linearGradient>
        </defs>
        <rect x="0" y="0" width="${CARD_W}" height="${TOP_H}" fill="url(#topbar)"/>
        ${statusBarSvg({ side: 'left', ...p1 })}
        ${statusBarSvg({ side: 'right', ...p2 })}

        <!-- round / title badge -->
        <circle cx="${CARD_W / 2}" cy="${TOP_H / 2}" r="34" fill="#d9432a" stroke="#fff" stroke-width="3"/>
        <text x="${CARD_W / 2}" y="${TOP_H / 2 - 4}" font-family="Arial Black, Arial, sans-serif" font-size="13" font-weight="900" fill="#fff" text-anchor="middle">RD</text>
        <text x="${CARD_W / 2}" y="${TOP_H / 2 + 18}" font-family="Arial Black, Arial, sans-serif" font-size="22" font-weight="900" fill="#fff" text-anchor="middle">${round}</text>

        <!-- center divider -->
        <rect x="${CARD_W / 2 - 2}" y="${TOP_H}" width="4" height="${PORTRAIT_H}" fill="#000" opacity="0.5"/>
        ${title ? `
        <rect x="0" y="${CARD_H - 32}" width="${CARD_W}" height="32" fill="#000000aa"/>
        <text x="${CARD_W / 2}" y="${CARD_H - 11}" font-family="Arial, sans-serif" font-size="15" fill="#ffffffdd" text-anchor="middle">${escapeXml(title)}</text>` : ''}
    </svg>`;
}

// Stylized fallback panel for enemies with no dedicated portrait art —
// solid gradient + giant emoji, never the cluttered poster images.
async function fallbackPortraitBuffer(emoji, w, h, flip) {
    const grad = flip ? ['#2a1620', '#120a10'] : ['#16202a', '#0a1012'];
    const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="${grad[0]}"/>
                <stop offset="100%" stop-color="${grad[1]}"/>
            </linearGradient>
        </defs>
        <rect width="${w}" height="${h}" fill="url(#g)"/>
        <text x="${w / 2}" y="${h / 2 + 60}" font-size="180" text-anchor="middle">${emoji}</text>
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
}

async function portraitBuffer(imageName, w, h, flip) {
    if (!imageName || GENERIC_FALLBACKS.has(imageName)) return null; // caller supplies emoji fallback
    const filePath = path.join(IMAGES_DIR, `${imageName}.jpg`);
    if (!fs.existsSync(filePath)) return null;
    let img = sharp(filePath).resize(w, h, { fit: 'cover', position: sharp.strategy.attention });
    if (flip) img = img.flop();
    return img.png().toBuffer();
}

/**
 * Renders one battle-round status card.
 * p1 / p2: { name, hp, maxHp, chakra?, maxChakra?, stunned?, imageName?, emoji? }
 * imageName: key into images/<name>.jpg (e.g. 'naruto2'); if missing/generic,
 * falls back to a stylized emoji panel using `emoji`.
 * Returns a PNG Buffer.
 */
async function renderBattleCard({ p1, p2, round, title }) {
    const leftW = HALF_W, rightW = CARD_W - HALF_W;

    const [leftPortrait, rightPortrait] = await Promise.all([
        portraitBuffer(p1.imageName, leftW, PORTRAIT_H, false)
            .then(b => b || fallbackPortraitBuffer(p1.emoji || '🥷', leftW, PORTRAIT_H, false)),
        portraitBuffer(p2.imageName, rightW, PORTRAIT_H, true)
            .then(b => b || fallbackPortraitBuffer(p2.emoji || '👹', rightW, PORTRAIT_H, true)),
    ]);

    const overlaySvg = baseSvg({
        p1: { name: p1.name, hpPct: p1.hp / p1.maxHp, hp: Math.max(0, p1.hp), maxHp: p1.maxHp, chakraPct: p1.chakra !== undefined ? p1.chakra / p1.maxChakra : undefined, chakra: p1.chakra, maxChakra: p1.maxChakra, stunned: p1.stunned },
        p2: { name: p2.name, hpPct: p2.hp / p2.maxHp, hp: Math.max(0, p2.hp), maxHp: p2.maxHp, chakraPct: p2.chakra !== undefined ? p2.chakra / p2.maxChakra : undefined, chakra: p2.chakra, maxChakra: p2.maxChakra, stunned: p2.stunned },
        round, title,
    });

    return sharp({ create: { width: CARD_W, height: CARD_H, channels: 4, background: { r: 10, g: 10, b: 14, alpha: 1 } } })
        .composite([
            { input: leftPortrait, left: 0, top: TOP_H },
            { input: rightPortrait, left: HALF_W, top: TOP_H },
            { input: Buffer.from(overlaySvg), left: 0, top: 0 },
        ])
        .png()
        .toBuffer();
}

module.exports = { renderBattleCard };
