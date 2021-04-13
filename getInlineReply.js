const { Markup } = require('telegraf');

function getInlineReply(buttons) {
  if (!Array.isArray(buttons) || buttons.length === 0) return { parse_mode: 'HTML' };
  const inlineReply = Markup.inlineKeyboard(
    buttons.map((button) => Markup.button.callback(button, button)),
    { columns: 3 },
  );
  inlineReply.parse_mode = 'HTML';
  return inlineReply;
}

module.exports = getInlineReply;
