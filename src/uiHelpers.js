// src/uiHelpers.js
// Centralised helpers for WhatsApp interactive messages.
//
// Baileys 6.7.22 supports these patterns that work on regular (non-business) accounts:
//   - templateMessage with hydratedButtons (quick-reply buttons) — bot.js already reads these
//   - listMessage (single-section menus) — great for command menus
//   - Plain image + caption (always works as fallback)
//
// Max 3 quick-reply buttons per templateMessage (WhatsApp UI limit).

/**
 * Build a templateMessage with up to 3 quick-reply buttons.
 * Each button: { label: string, id: string (the command text sent when tapped) }
 * The id becomes the raw message text, so set it to e.g. "!battle d"
 */
function buttonMessage(text, buttons, imageBuffer = null) {
    const hydratedButtons = buttons.slice(0, 3).map(b => ({
        quickReplyButton: { displayText: b.label, id: b.id }
    }));

    const hydratedTemplate = {
        hydratedContentText: text,
        hydratedButtons,
    };

    if (imageBuffer) {
        hydratedTemplate.hydratedTitleStruct = {
            imageMessage: {
                jpegThumbnail: imageBuffer,
                mimetype: 'image/jpeg',
                url: '',
            }
        };
    }

    return { templateMessage: { hydratedTemplate } };
}

/**
 * Build a listMessage (scrollable menu with sections and rows).
 * sections: [{ title: string, rows: [{ id, title, description? }] }]
 * The id is the command sent when the row is selected.
 */
function listMessage({ title, body, buttonText, sections }) {
    return {
        listMessage: {
            title,
            description: body,
            buttonText,
            listType: 1,
            sections,
        }
    };
}

/**
 * Plain image message with caption (most reliable, works everywhere).
 * imageBuffer: Buffer (jpeg/png)
 */
function imageMessage(imageBuffer, caption, mimetype = 'image/jpeg') {
    return { image: imageBuffer, caption, mimetype };
}

/**
 * Send a character shop "card" — image + name/price/quick-buy button.
 * Used for the character shop carousel.
 */
function charShopCard(char, alreadyOwned, imageBuffer) {
    const price = alreadyOwned ? '✅ Owned' : `💰 ${char.price.toLocaleString()} Ryo`;
    const nature = char.nature ? ` | ${char.nature}` : '';
    const text = `*${char.emoji} ${char.name}*\n${char.rarity}${nature}\n${price}\n\n_${char.description}_`;

    const buttons = alreadyOwned
        ? [{ label: `✅ Switch to ${char.name}`, id: `!switch ${char.name}` }]
        : [{ label: `💰 Buy ${char.name}`, id: `!buy ${char.name}` }];

    return buttonMessage(text, buttons, imageBuffer);
}

/**
 * Battle action buttons — sent at the start of a battle round so players
 * can tap instead of typing !use N.
 * jutsus: [{ name, cost, pp }] — first 3 only (button limit)
 */
function battleButtons(jutsus, round) {
    const buttons = jutsus.slice(0, 3).map((j, i) => ({
        label: `${j.name} (⟳${j.pp ?? '∞'})`,
        id: `!use ${i + 1}`,
    }));
    if (buttons.length < 3) buttons.push({ label: '🥊 Basic Strike', id: '!use 0' });
    return buttons.slice(0, 3);
}

module.exports = { buttonMessage, listMessage, imageMessage, charShopCard, battleButtons };
