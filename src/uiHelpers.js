// src/uiHelpers.js
// WhatsApp Business interactive messages (templateMessage, listMessage) are NOT
// supported on personal accounts with Baileys 6.7.22 — they throw "Invalid media
// type" errors at runtime. All helpers here return plain { text: ... } messages
// that work on every account type.

function buttonMessage(text, buttons = []) {
    // Append button labels as tappable hints so users see the options
    const hints = buttons.map(b => `  › ${b.label}  →  ${b.id}`).join('\n');
    return { text: hints ? `${text}\n\n${hints}` : text };
}

function listMessage({ title, body, sections = [] }) {
    let text = `*${title}*\n${body || ''}\n`;
    sections.forEach(s => {
        text += `\n*${s.title}*\n`;
        (s.rows || []).forEach(r => {
            text += `  ${r.title}${r.description ? ` — _${r.description}_` : ''}\n`;
        });
    });
    return { text: text.trim() };
}

function imageMessage(imageBuffer, caption, mimetype = 'image/jpeg') {
    return { image: imageBuffer, caption, mimetype };
}

function charShopCard(char, alreadyOwned, imageBuffer) {
    const price = alreadyOwned ? '✅ Owned' : `💰 ${char.price.toLocaleString()} Ryo`;
    const nature = char.nature ? ` | ${char.nature}` : '';
    const text = `*${char.emoji} ${char.name}*\n${char.rarity}${nature}\n${price}\n\n_${char.description}_\n\n${alreadyOwned ? `Type: !switch ${char.name}` : `Type: !buy ${char.name}`}`;
    return imageBuffer
        ? { image: imageBuffer, caption: text, mimetype: 'image/jpeg' }
        : { text };
}

function battleButtons(jutsus, round) {
    return jutsus.slice(0, 3).map((j, i) => ({
        label: `${j.name} (⟳${j.pp ?? '∞'})`,
        id: `!use ${i + 1}`,
    }));
}

module.exports = { buttonMessage, listMessage, imageMessage, charShopCard, battleButtons };
