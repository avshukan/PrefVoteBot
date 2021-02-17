'use strict';

function hearsDoneHandler(store, storage) {
  return async function(context) {
    const userId = context.message.from.id;
    const userState = store.getUserState(userId);
    const { header, text, options } = userState;
    const questionId = await storage.saveQuestionWithOptions({ userId, header, text, options });
    const reply = `Опрос <b>${header}</b> сформирован!\n`
            + 'Принять участие можно по ссылке\n'
            + `https://telegram.me/prefVoteBot?start=${questionId}`;
    const type = 'HEARS DONE';
    const payload = { userId, questionId, header, text, options, reply };
    const action = { type, payload };
    store.dispatch(action);
    context.reply(reply, { parse_mode: 'HTML' });
  };
}

module.exports = { hearsDoneHandler };
