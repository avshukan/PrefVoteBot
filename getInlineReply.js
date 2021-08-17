const utf8 = require('utf8');
const { Markup } = require('telegraf');
const { BUTTONS } = require('./button_types');

const COLUMNS = 3;

function getInlineReply(questionId, buttons) {
  if (!Array.isArray(buttons) || buttons.length === 0) return { parse_mode: 'HTML' };

  buttons.forEach((button) => {
    console.log(JSON.stringify({ questionId, button }));
    console.log(JSON.stringify({ questionId, button }).length);
    console.log(utf8.encode(JSON.stringify({ questionId, button })));
    console.log(utf8.encode(JSON.stringify({ questionId, button })).length);
  });
  // const inlineButtons = buttons.map((button) => {
  //   if (button.Id && button.Name) {
  //     return { text: button.Name, data: JSON.stringify({ questionId, answerId: button.Id }) };
  //   }
  //   return { text: button.text, data: JSON.stringify({ questionId, link: button.link }) };
  // });
  // console.log('inlineButtons', inlineButtons);

  const inlineReply = Markup.inlineKeyboard(
    buttons.map((button) => {
      const data = { questionId };
      if (button.id) {
        data.answerId = button.id;
      }
      if (button.link) {
        data.link = button.link;
      }
      return Markup.button.callback(button.name, JSON.stringify(data));
    }),
    {
      // wrap: (btn, index, currentRow) => (buttons[index] === BUTTONS.HINT) || !(index % COLUMNS),
      wrap: (btn, index) => (buttons[index] === BUTTONS.HINT) || !(index % COLUMNS),
    },
  );
  inlineReply.parse_mode = 'HTML';
  console.log('inlineReply', inlineReply);
  console.log('inlineReply.reply_markup.inline_keyboard', inlineReply.reply_markup.inline_keyboard);
  return inlineReply;
}

module.exports = getInlineReply;
