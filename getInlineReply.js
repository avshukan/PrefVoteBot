const { Markup } = require('telegraf');
const { BUTTONS } = require('./button_types');

const COLUMNS = 3;

function getInlineReply(buttons) {
  if (!Array.isArray(buttons) || buttons.length === 0) return { parse_mode: 'HTML' };
  const inlineReply = Markup.inlineKeyboard(
    buttons.map((button) => Markup.button.callback(button, button)),
    {
      // wrap: (btn, index, currentRow) => (buttons[index] === BUTTONS.HINT) || !(index % COLUMNS),
      wrap: (btn, index) => (buttons[index] === BUTTONS.HINT) || !(index % COLUMNS),
    },
  );
  inlineReply.parse_mode = 'HTML';
  return inlineReply;
}

module.exports = getInlineReply;
