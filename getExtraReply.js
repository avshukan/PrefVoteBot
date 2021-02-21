const { Markup } = require('telegraf');

function getExtraReply(buttons) {
  if (!Array.isArray(buttons) || buttons.length === 0) { return { parse_mode: 'HTML' }; }
  const extraReply = Markup
    .keyboard(buttons.map((button) => [button]))
    .oneTime()
    .resize();
  extraReply.parse_mode = 'HTML';
  return extraReply;
}

module.exports = getExtraReply;
