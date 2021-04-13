const { Markup } = require('telegraf');

function getInlineReply(buttons) {
  if (!Array.isArray(buttons) || buttons.length === 0) return { parse_mode: 'HTML' };
  // return ctx.reply(
  //   'Keyboard wrap',
  //   Markup.keyboard(['one', 'two', 'three', 'four', 'five', 'six', 'seven'], {
  //     columns: parseInt(ctx.match[1])
  //   })
  // )
  const inlineReply = Markup.inlineKeyboard(
    buttons.map((button) => Markup.button.callback(button, button)),
    { columns: 3 },
  );
  inlineReply.parse_mode = 'HTML';
  return inlineReply;
}

module.exports = getInlineReply;
