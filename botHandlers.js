const { ACTIONS } = require('./action_types');
const { STATES } = require('./state_types');
const { COMMANDS } = require('./command_types');
const { method } = require('./method');
const getExtraReply = require('./getExtraReply');

function botHandlers(initStore, initStorage) {
  const store = initStore;
  const storage = initStorage;

  function clearMessages(context) {
    const userId = context.message.from.id;
    const { clearMessagesQueue = [] } = store.getUserState(userId);
    store.dispatch({
      type: ACTIONS.REMOVE_MESSAGE_FROM_QUEUE,
      payload: { userId },
    });
    clearMessagesQueue.forEach((message) => context.deleteMessage(message));
  }

  function commandNewHandler() {
    return async function (context) {
      const userId = context.message.from.id;
      store.dispatch({
        type: ACTIONS.CREATE_VOTE,
        payload: { userId },
      });
      const { reply, buttons } = store.getUserState(userId);
      context
        .reply(reply, getExtraReply(buttons))
        .then((message) => {
          store.dispatch({
            type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
            payload: { userId, messageId: message.message_id },
          });
        })
        .catch((error) => {
          console.log(error);
        });
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
      const {
        id: userId,
        first_name: userFirstName,
        last_name: userLastName,
        username: userName,
      } = context.message.from;
      const { header, text, options } = store.getUserState(userId);
      try {
        const questionId = await storage.saveQuestionWithOptions({
          userId, header, text, options, userFirstName, userLastName, userName,
        });
        store.dispatch({
          type: ACTIONS.HEARS_DONE,
          payload: {
            userId, questionId, header, text, options,
          },
        });
        const { reply, buttons } = store.getUserState(userId);
        context.reply(reply, getExtraReply(buttons));
      } catch {
        store.dispatch({
          type: ACTIONS.ERROR,
          payload: { userId },
        });
        const { reply, buttons } = store.getUserState(userId);
        context.reply(reply, getExtraReply(buttons));
      }
    };
  }

  function hearsResultsHandler() {
    return async function (context) {
      const userId = context.message.from.id;
      try {
        const { questionId } = store.getUserState(userId);
        const { header, text } = await storage.getQuestion(questionId);
        const { votersCount } = await storage.getVotersCount(questionId);
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
        const result = optionsResult.reduce((acc, option) => `${acc}\n${option}`, `Опрос <b>${header}</b>\n`
        + `${text}\n\n`
        + `Приняли участие (человек): ${votersCount}\n`
        + 'Результат:');
        store.dispatch({
          type: ACTIONS.HEARS_RESULTS,
          payload: { userId, questionId, result },
        });
        const { reply, buttons } = store.getUserState(userId);
        context.reply(reply, getExtraReply(buttons));
        console.log(userId, context);
      } catch {
        store.dispatch({
          type: ACTIONS.ERROR,
          payload: { userId },
        });
        const { reply, buttons } = store.getUserState(userId);
        context.reply(reply, getExtraReply(buttons));
      }
    };
  }

  function onTextHandler() {
    return async function (context) {
      const {
        id: userId,
        first_name: userFirstName,
        last_name: userLastName,
        username: userName,
      } = context.message.from;
      const userMessageId = context.message.message_id;
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
              userMessageId,
            },
          });
          const { reply, buttons } = store.getUserState(userId);
          clearMessages(context);
          context
            .reply(reply, getExtraReply(buttons))
            .then((message) => {
              store.dispatch({
                type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
                payload: { userId, messageId: message.message_id },
              });
            })
            .catch((error) => {
              console.log(error);
            });
          break;
        }

        case STATES.CREATE_TEXT: {
          store.dispatch({
            type: ACTIONS.CREATE_TEXT,
            payload: { userId, text: info.substr(0, 255), userMessageId },
          });
          const { reply, buttons } = store.getUserState(userId);
          clearMessages(context);
          context
            .reply(reply, getExtraReply(buttons))
            .then((message) => {
              store.dispatch({
                type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
                payload: { userId, messageId: message.message_id },
              });
            })
            .catch((error) => {
              console.log(error);
            });
          break;
        }

        case STATES.CREATE_OPTION: {
          const option = info.substr(0, 100);
          store.dispatch({
            type: ACTIONS.CREATE_OPTION,
            payload: { userId, option, userMessageId },
          });
          const { reply, buttons } = store.getUserState(userId);
          clearMessages(context);
          context
            .reply(reply, getExtraReply(buttons))
            .then((message) => {
              store.dispatch({
                type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
                payload: { userId, messageId: message.message_id },
              });
            })
            .catch((error) => {
              console.log(error);
            });
          break;
        }

        case STATES.ANSWER: {
          const { options, optionsSelected } = store.getUserState(userId);
          const optionIndex = options.findIndex((option) => option.Name === info);
          // WRONG_ANSWER
          if (optionIndex === -1) {
            store.dispatch({
              type: ACTIONS.GET_WRONG_OPTION,
              payload: { userId, answer: info },
            });
            const { reply, buttons } = store.getUserState(userId);
            clearMessages(context);
            context
              .reply(reply, getExtraReply(buttons))
              .then((message) => {
                store.dispatch({
                  type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
                  payload: { userId, messageId: message.message_id },
                });
              })
              .catch((error) => {
                console.log(error);
              });
            return;
          }
          // RIGHT_ANSWER
          store.dispatch({
            type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
            payload: { userId, messageId: userMessageId },
          });
          const selectedOption = options.splice(optionIndex, 1);
          optionsSelected.push(...selectedOption);
          if (options.length === 1) {
            const lastOption = options.pop();
            optionsSelected.push(lastOption);
            await storage.saveRanks({
              userId,
              options: optionsSelected,
              userFirstName,
              userLastName,
              userName,
            });
            await storage.saveStatus({
              userId,
              questionId,
              status: 'ANSWERED',
              userFirstName,
              userLastName,
              userName,
            });
          }
          store.dispatch({
            type: ACTIONS.GET_OPTION,
            payload: { userId, options, optionsSelected },
          });
          const { reply, buttons } = store.getUserState(userId);
          clearMessages(context);
          context
            .reply(reply, getExtraReply(buttons))
            .then((message) => {
              store.dispatch({
                type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
                payload: { userId, messageId: message.message_id },
              });
            })
            .catch((error) => {
              console.log(error);
            });
          break;
        }

        default: {
          store.dispatch({
            type: ACTIONS.MOCK,
            payload: { userId },
          });
          const { reply, buttons } = store.getUserState(userId);
          context.reply(reply, getExtraReply(buttons));
        }
      }
    };
  }

  function commandAboutHandler(context) {
    const userId = context.message.from.id;
    store.dispatch({
      type: ACTIONS.SHOW_ABOUT,
      payload: { userId },
    });
    const { reply, buttons } = store.getUserState(userId);
    context.reply(reply, getExtraReply(buttons));
  }

  async function commandCreatedByMeHandler(context) {
    const userId = context.message.from.id;
    try {
      const questions = await storage.getQuestionsCreatedByUser(userId);
      store.dispatch({
        type: ACTIONS.GET_QUESTIONS_LIST,
        payload: { userId, questions, command: COMMANDS.CREATEDBYME },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getExtraReply(buttons));
    } catch {
      store.dispatch({
        type: ACTIONS.ERROR,
        payload: { userId },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getExtraReply(buttons));
    }
  }

  async function commandVotedByMeHandler(context) {
    const userId = context.message.from.id;
    try {
      const questions = await storage.getQuestionsVotedByUser(userId);
      store.dispatch({
        type: ACTIONS.GET_QUESTIONS_LIST,
        payload: { userId, questions, command: COMMANDS.VOTEDBYME },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getExtraReply(buttons));
    } catch {
      store.dispatch({
        type: ACTIONS.ERROR,
        payload: { userId },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getExtraReply(buttons));
    }
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

  async function commandPopularHandler(context) {
    const userId = context.message.from.id;
    try {
      const questions = await storage.getQuestionsPopular();
      store.dispatch({
        type: ACTIONS.GET_QUESTIONS_LIST,
        payload: { userId, questions, command: COMMANDS.POPULAR },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getExtraReply(buttons));
    } catch {
      store.dispatch({
        type: ACTIONS.ERROR,
        payload: { userId },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getExtraReply(buttons));
    }
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

  function startHandler() {
    return async function (context) {
      const userId = context.message.from.id;
      try {
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
        context
          .reply(reply, getExtraReply(buttons))
          .then((message) => {
            store.dispatch({
              type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
              payload: { userId, messageId: message.message_id },
            });
          })
          .catch((error) => {
            console.log(error);
          });
      } catch {
        store.dispatch({
          type: ACTIONS.ERROR,
          payload: { userId },
        });
        const { reply, buttons } = store.getUserState(userId);
        context.reply(reply, getExtraReply(buttons));
      }
    };
  }

  return {
    startHandler,
    commandAboutHandler,
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
