const { ACTIONS } = require('./action_types');
const { STATES } = require('./state_types');
const { method } = require('./method');
const getExtraReply = require('./getExtraReply');

function botHandlers(initStore, initStorage) {
  const store = initStore;
  const storage = initStorage;

  function startHandler() {
    return async function (context) {
      const userId = context.message.from.id;
      // const userState = store.getUserState(userId);
      if (context.startPayload === '') {
        console.log('context.startPayload === \'\' => return;');
        console.log('Здесь должно быть какое-то приветственное сообщение');
        const reply = 'Здесь должно быть какое-то приветственное сообщение';
        context.replyWithMarkdown(reply);
        return;
      }
      const questionId = parseInt(context.startPayload, 10);
      const status = await storage.getQuestionStatus(questionId, userId);
      if (status === 'ANSWERED') {
        store.dispatch({
          type: ACTIONS.HEARS_RESULTS,
          payload: { userId, questionId },
        });
        hearsResultsHandler()(context);
        return;
      }
      // NOT ANSWERED
      const questionWithOptions = await storage.getQuestionWithOptions(questionId);
      const { header, text, options } = questionWithOptions;
      store.dispatch({
        type: ACTIONS.CAST_VOTE,
        payload: {
          userId,
          questionId,
          header,
          text,
          options,
        },
      });
      const { reply, buttons } = store.getUserState(userId);
      const replyMessage = context.reply(reply, getExtraReply(buttons));
      replyMessage
        .then(({ message_id }) => {
          store.dispatch({
            type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
            payload: { userId, message_id },
          });
        })
        .catch((error) => {
          console.log(error);
        });
    };
  }

  function commandNewHandler() {
    return async function (context) {
      const userId = context.message.from.id;
      store.dispatch({
        type: ACTIONS.CREATE_VOTE,
        payload: { userId },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getExtraReply(buttons));
    };
  }

  function hearsCancelHandler() {
    return async function (context) {
      const userId = context.message.from.id;
      store.dispatch({
        type: ACTIONS.HEARS_CANCEL,
        payload: { userId },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getExtraReply(buttons));
    };
  }

  function hearsDoneHandler() {
    return async function (context) {
      const userId = context.message.from.id;
      const { header, text, options } = store.getUserState(userId);
      const questionId = await storage.saveQuestionWithOptions({
        userId, header, text, options,
      });
      store.dispatch({
        type: ACTIONS.HEARS_DONE,
        payload: {
          userId, questionId, header, text, options,
        },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getExtraReply(buttons));
    };
  }

  function hearsResultsHandler() {
    return async function (context) {
      const userId = context.message.from.id;
      const { questionId } = store.getUserState(userId);
      const { header, text } = await storage.getQuestion(questionId);
      const optrows = await storage.getOptions(questionId);
      const rows = await storage.getRanks(questionId);
      const optionsList = optrows.map((item) => item.Id);
      const optionsRating = method(optionsList, rows);
      const optionsResult = optionsRating
        .sort((item1, item2) => item1.place - item2.place)
        .map((item) => {
          const position = (item.count === 1)
            ? (item.place + 1)
            : `${item.place + 1}-${item.place + item.count}`;
          const name = optrows.filter((row) => row.Id === item.id)[0].Name;
          return `${position}. ${name}`;
        });
      let result = `Опрос <b>${header}</b>\n${text}\n\nРезультат:\n`;
      optionsResult.forEach((option) => { result += `${option}\n`; });
      store.dispatch({
        type: ACTIONS.HEARS_RESULTS,
        payload: { userId, questionId, result },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getExtraReply(buttons));
    };
  }

  function onTextHandler() {
    return async function (context) {
      const userId = context.message.from.id;
      const info = context.message.text;
      const { questionId, type } = store.getUserState(userId);
      switch (type) {
        case STATES.CREATE_HEADER: {
          store.dispatch({
            type: ACTIONS.CREATE_HEADER,
            payload: {
              userId,
              questionId,
              header: info.substr(0, 63),
            },
          });
          const { reply, buttons } = store.getUserState(userId);
          context.reply(reply, getExtraReply(buttons));
          break;
        }

        case STATES.CREATE_TEXT: {
          store.dispatch({
            type: ACTIONS.CREATE_TEXT,
            payload: {
              userId,
              text: info.substr(0, 255),
            },
          });
          const { reply, buttons } = store.getUserState(userId);
          context.reply(reply, getExtraReply(buttons));
          break;
        }

        case STATES.CREATE_OPTION: {
          const option = info.substr(0, 100);
          store.dispatch({
            type: ACTIONS.CREATE_OPTION,
            payload: { userId, option },
          });
          const { reply, buttons } = store.getUserState(userId);
          context.reply(reply, getExtraReply(buttons));
          break;
        }

        case STATES.ANSWER: {
          const { options, optionsSelected, clearMessagesQueue } = store.getUserState(userId);
          const optionIndex = options.findIndex((option) => option.Name === info);
          // WRONG_ANSWER
          if (optionIndex === -1) {
            store.dispatch({
              type: ACTIONS.GET_WRONG_OPTION,
              payload: { userId, answer: info },
            });
            const { reply, buttons } = store.getUserState(userId);
            context.reply(reply, getExtraReply(buttons));
            return;
          }
          // RIGHT_ANSWER
          const selectedOption = options.splice(optionIndex, 1);
          optionsSelected.push(...selectedOption);
          if (options.length === 1) {
            const lastOption = options.pop();
            optionsSelected.push(lastOption);
            await storage.saveRanks({
              userId,
              options: optionsSelected,
            });
            await storage.saveStatus({
              userId,
              questionId,
              status: 'ANSWERED',
            });
          }
          store.dispatch({
            type: ACTIONS.GET_OPTION,
            payload: { userId, options, optionsSelected },
          });
          const { reply, buttons } = store.getUserState(userId);
          context.reply(reply, getExtraReply(buttons));
        }
      }
    };
  }

  function commandCreatedByMeHandler(context) {
    const userId = context.message.from.id;
    store.dispatch({
      type: ACTIONS.MOCK,
      payload: { userId },
    });
    const { reply, buttons } = store.getUserState(userId);
    context.reply(reply, getExtraReply(buttons));
  }

  function commandVotedByMeHandler(context) {
    const userId = context.message.from.id;
    store.dispatch({
      type: ACTIONS.MOCK,
      payload: { userId },
    });
    const { reply, buttons } = store.getUserState(userId);
    context.reply(reply, getExtraReply(buttons));
  }

  function commandFindHandler(context) {
    const userId = context.message.from.id;
    store.dispatch({
      type: ACTIONS.MOCK,
      payload: { userId },
    });
    const { reply, buttons } = store.getUserState(userId);
    context.reply(reply, getExtraReply(buttons));
  }

  function commandHelpHandler(context) {
    const userId = context.message.from.id;
    store.dispatch({
      type: ACTIONS.MOCK,
      payload: { userId },
    });
    const { reply, buttons } = store.getUserState(userId);
    context.reply(reply, getExtraReply(buttons));
  }

  function commandSettingsHandler(context) {
    const userId = context.message.from.id;
    store.dispatch({
      type: ACTIONS.MOCK,
      payload: { userId },
    });
    const { reply, buttons } = store.getUserState(userId);
    context.reply(reply, getExtraReply(buttons));
  }

  function commandRandomHandler(context) {
    const userId = context.message.from.id;
    store.dispatch({
      type: ACTIONS.MOCK,
      payload: { userId },
    });
    const { reply, buttons } = store.getUserState(userId);
    context.reply(reply, getExtraReply(buttons));
  }

  function commandPopularHandler(context) {
    const userId = context.message.from.id;
    store.dispatch({
      type: ACTIONS.MOCK,
      payload: { userId },
    });
    const { reply, buttons } = store.getUserState(userId);
    context.reply(reply, getExtraReply(buttons));
  }

  return {
    startHandler,
    commandCreatedByMeHandler,
    commandFindHandler,
    commandHelpHandler,
    commandNewHandler,
    commandPopularHandler,
    commandRandomHandler,
    commandSettingsHandler,
    commandVotedByMeHandler,
    hearsCancelHandler,
    hearsDoneHandler,
    hearsResultsHandler,
    onTextHandler,
  };
}

module.exports = botHandlers;
