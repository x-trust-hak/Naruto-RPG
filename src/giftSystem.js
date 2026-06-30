// src/giftSystem.js
// Gift System — send Ryo or items to other players.
//
// Drives social interaction and the in-group economy. Includes basic
// anti-abuse safeguards: daily gift caps, minimum account age, and a
// small transaction log so admins can audit suspicious patterns.

// ─── LIMITS ───────────────────────────────────────────────────────────────────
const DAILY_GIFT_RYO_CAP   = 50000;   // max total Ryo a player can GIVE per day
const MIN_GIFT_RYO         = 10;      // smallest allowed Ryo gift
const MIN_LEVEL_TO_GIFT    = 3;       // new accounts can't gift immediately (anti farming-alt abuse)
const GIFT_LOG_MAX         = 50;      // in-memory recent gift log (last 50 across server)

// In-memory rolling gift log — { from, to, type, amount/item, timestamp }
const giftLog = [];

function logGift(entry) {
    giftLog.unshift({ ...entry, timestamp: Date.now() });
    if (giftLog.length > GIFT_LOG_MAX) giftLog.pop();
}

// ─── DAILY CAP TRACKING ──────────────────────────────────────────────────────
// Stored on user.giftDailyData: { date: 'YYYY-MM-DD', ryoGiven: N }
function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getRemainingGiftCap(user) {
    const today = todayStr();
    if (!user.giftDailyData || user.giftDailyData.date !== today) {
        return DAILY_GIFT_RYO_CAP;
    }
    return Math.max(0, DAILY_GIFT_RYO_CAP - (user.giftDailyData.ryoGiven || 0));
}

function recordGiftSpend(user, amount) {
    const today = todayStr();
    if (!user.giftDailyData || user.giftDailyData.date !== today) {
        user.giftDailyData = { date: today, ryoGiven: amount };
    } else {
        user.giftDailyData.ryoGiven = (user.giftDailyData.ryoGiven || 0) + amount;
    }
}

// ─── VALIDATE RYO GIFT ────────────────────────────────────────────────────────
// Returns { valid, msg } — checks everything EXCEPT whether target exists
// (caller looks up target separately since that needs a DB query).
function validateRyoGift(sender, recipient, amount) {
    if (sender.phoneId === recipient.phoneId) {
        return { valid: false, msg: '❌ You cannot gift Ryo to yourself.' };
    }
    if (sender.level < MIN_LEVEL_TO_GIFT) {
        return { valid: false, msg: `❌ You need to be at least Level ${MIN_LEVEL_TO_GIFT} to send gifts. (Prevents new-account abuse.)` };
    }
    if (!Number.isInteger(amount) || amount < MIN_GIFT_RYO) {
        return { valid: false, msg: `❌ Minimum gift is ${MIN_GIFT_RYO.toLocaleString()} Ryo.` };
    }
    if ((sender.ryo || 0) < amount) {
        return { valid: false, msg: `💰 *Not enough Ryo!*\n\nYou have: ${(sender.ryo || 0).toLocaleString()} Ryo\nTrying to send: ${amount.toLocaleString()} Ryo` };
    }
    const remaining = getRemainingGiftCap(sender);
    if (amount > remaining) {
        return {
            valid: false,
            msg: `❌ *Daily gift limit reached!*\n\nDaily cap: ${DAILY_GIFT_RYO_CAP.toLocaleString()} Ryo\nRemaining today: ${remaining.toLocaleString()} Ryo\n\n_Resets at midnight._`,
        };
    }
    return { valid: true };
}

// ─── VALIDATE ITEM GIFT ───────────────────────────────────────────────────────
function validateItemGift(sender, recipient, itemId, qty) {
    if (sender.phoneId === recipient.phoneId) {
        return { valid: false, msg: '❌ You cannot gift items to yourself.' };
    }
    if (sender.level < MIN_LEVEL_TO_GIFT) {
        return { valid: false, msg: `❌ You need to be at least Level ${MIN_LEVEL_TO_GIFT} to send gifts.` };
    }
    if (!Number.isInteger(qty) || qty < 1) {
        return { valid: false, msg: '❌ Quantity must be at least 1.' };
    }
    const inv = sender.inventory.find(i => i.itemId === itemId);
    if (!inv || inv.qty < qty) {
        return {
            valid: false,
            msg: `❌ *You don't have enough of that item!*\n\nYou have: ${inv ? inv.qty : 0}\nTrying to send: ${qty}`,
        };
    }
    return { valid: true };
}

// ─── EXECUTE RYO GIFT ─────────────────────────────────────────────────────────
// Mutates both user docs in memory — caller is responsible for .save()
function executeRyoGift(sender, recipient, amount) {
    sender.ryo = (sender.ryo || 0) - amount;
    recipient.ryo = (recipient.ryo || 0) + amount;
    recordGiftSpend(sender, amount);
    logGift({ from: sender.username, to: recipient.username, type: 'ryo', amount });
}

// ─── EXECUTE ITEM GIFT ────────────────────────────────────────────────────────
function executeItemGift(sender, recipient, itemId, qty, itemName) {
    const senderInv = sender.inventory.find(i => i.itemId === itemId);
    senderInv.qty -= qty;
    sender.inventory = sender.inventory.filter(i => i.qty > 0);

    const recipientInv = recipient.inventory.find(i => i.itemId === itemId);
    if (recipientInv) recipientInv.qty += qty;
    else recipient.inventory.push({ itemId, qty });

    logGift({ from: sender.username, to: recipient.username, type: 'item', item: itemName, qty });
}

// ─── GIFT CONFIRMATION TEXT ───────────────────────────────────────────────────
function ryoGiftConfirmText(sender, recipient, amount) {
    const remaining = getRemainingGiftCap(sender) - amount;
    return `🎁 *GIFT SENT!* 🎁\n\n` +
           `${sender.username} → ${recipient.username}\n` +
           `💰 *${amount.toLocaleString()} Ryo*\n\n` +
           `📊 Your daily gift limit remaining: ${remaining.toLocaleString()}/${DAILY_GIFT_RYO_CAP.toLocaleString()} Ryo\n\n` +
           `_${recipient.username} now has ${recipient.ryo.toLocaleString()} Ryo_`;
}

function itemGiftConfirmText(sender, recipient, itemName, qty) {
    return `🎁 *GIFT SENT!* 🎁\n\n` +
           `${sender.username} → ${recipient.username}\n` +
           `📦 *${qty}x ${itemName}*\n\n` +
           `_Check your bag with !bag to see what's left_`;
}

// ─── RECEIVED NOTIFICATION TEXT ───────────────────────────────────────────────
function ryoReceivedText(sender, amount, newBalance) {
    return `🎁 *YOU RECEIVED A GIFT!* 🎁\n\n` +
           `From: *${sender.username}*\n` +
           `💰 *+${amount.toLocaleString()} Ryo*\n\n` +
           `💰 New balance: ${newBalance.toLocaleString()} Ryo\n\n` +
           `_Pay it forward — !gift [name] [amount]_`;
}

function itemReceivedText(sender, itemName, qty) {
    return `🎁 *YOU RECEIVED A GIFT!* 🎁\n\n` +
           `From: *${sender.username}*\n` +
           `📦 *${qty}x ${itemName}*\n\n` +
           `_Check it out: !bag_`;
}

// ─── GIFT HISTORY TEXT (admin / personal) ────────────────────────────────────
function giftHistoryText(filterUsername = null) {
    let entries = giftLog;
    if (filterUsername) {
        entries = giftLog.filter(g => g.from === filterUsername || g.to === filterUsername);
    }
    if (!entries.length) {
        return `📜 *GIFT HISTORY*\n\n_No gifts recorded yet._`;
    }
    let txt = `📜 *RECENT GIFTS*${filterUsername ? ` — ${filterUsername}` : ''}\n\n`;
    for (const g of entries.slice(0, 15)) {
        const ago = Math.round((Date.now() - g.timestamp) / 60000);
        const timeLabel = ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
        if (g.type === 'ryo') {
            txt += `💰 ${g.from} → ${g.to}: ${g.amount.toLocaleString()} Ryo (${timeLabel})\n`;
        } else {
            txt += `📦 ${g.from} → ${g.to}: ${g.qty}x ${g.item} (${timeLabel})\n`;
        }
    }
    return txt;
}

module.exports = {
    DAILY_GIFT_RYO_CAP,
    MIN_GIFT_RYO,
    MIN_LEVEL_TO_GIFT,
    giftLog,
    getRemainingGiftCap,
    validateRyoGift,
    validateItemGift,
    executeRyoGift,
    executeItemGift,
    ryoGiftConfirmText,
    itemGiftConfirmText,
    ryoReceivedText,
    itemReceivedText,
    giftHistoryText,
};
