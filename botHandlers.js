const { ACTIONS } = require('./action_types');
const { STATES } = require('./state_types');
const { COMMANDS } = require('./command_types');
const { BUTTONS } = require('./button_types');
const { method } = require('./method');
const getExtraReply = require('./getExtraReply');
const getInlineReply = require('./getInlineReply');

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

  function commandNewHandler(context) {
    const userId = context.message.from.id;
    const questionId = 0;
    store.dispatch({
      type: ACTIONS.CREATE_VOTE,
      payload: { userId },
    });
    const { reply, buttons } = store.getQuestionState(userId, questionId);
    console.log('ACTIONS.CREATE_VOTE');
    console.log('{ reply, buttons }');
    console.log({ reply, buttons });
    context
      // .reply(reply, getExtraReply(buttons))
      .reply(reply, getInlineReply(questionId, buttons));
    // .then((message) => {
    //   store.dispatch({
    //     type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
    //     payload: { userId, messageId: message.message_id },
    //   });
    // })
    // .catch((error) => {
    //   console.error(error);
    // });
  }

  function hearsCancelHandler(context) {
    const userId = context.message.from.id;
    let questionId = 0;
    if (context.update && context.update.callback_query && context.update.callback_query.data) {
      ({ questionId } = JSON.parse(context.update.callback_query.data));
    }
    store.dispatch({
      type: ACTIONS.HEARS_CANCEL,
      payload: { userId },
    });
    const { reply, buttons } = store.getQuestionState(userId, questionId);
    context.reply(reply, getInlineReply(buttons));
    // context.reply(reply, getExtraReply(buttons));
  }

  async function hearsCompleteHandler(context) {
    const {
      from: {
        id: userId,
        first_name: userFirstName,
        last_name: userLastName,
        username: userName,
      },
      message_id: userMessageId,
    } = context.message;
    const {
      questionId, options, optionsSelected, type,
    } = store.getUserState(userId);
    if (type === STATES.ANSWER) {
      store.dispatch({
        type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
        payload: { userId, messageId: userMessageId },
      });
      await storage.saveRanks({
        userId,
        optionsSelected,
        options,
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
      store.dispatch({
        type: ACTIONS.HEARS_COMPLETE,
        payload: { userId, options, optionsSelected },
      });
      const { reply, buttons } = store.getQuestionState(userId, questionId);
      clearMessages(context);
      context
        .reply(reply, getInlineReply(buttons))
        // .reply(reply, getExtraReply(buttons))
        .then((message) => {
          store.dispatch({
            type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
            payload: { userId, messageId: message.message_id },
          });
        })
        .catch((error) => {
          console.error(error);
        });
    } else {
      store.dispatch({
        type: ACTIONS.MOCK,
        payload: { userId, questionId },
      });
      const { reply, buttons } = store.getQuestionState(userId, questionId);
      context.reply(reply, getInlineReply(buttons));
      // context.reply(reply, getExtraReply(buttons));
    }
  }

  async function hearsDoneHandler(context) {
    const {
      id: userId,
      first_name: userFirstName,
      last_name: userLastName,
      username: userName,
    } = context.message.from;
    try {
      // const { header, text, options } = store.getUserState(userId);
      const { header, text, options } = store.getQuestionState(userId);
      const questionId = await storage.saveQuestionWithOptions({
        userId, header, text, options, userFirstName, userLastName, userName,
      });
      store.dispatch({
        type: ACTIONS.HEARS_DONE,
        payload: {
          userId, questionId, header, text, options,
        },
      });
      const { reply, buttons } = store.getQuestionState(userId, questionId);
      const userState = store.getUserState(userId);
      userState[0] = {};
      context.reply(reply, getExtraReply(buttons));
    } catch (error) {
      console.error(error);
      store.dispatch({
        type: ACTIONS.ERROR,
        payload: { userId },
      });
      const { reply, buttons } = store.getQuestionState(userId);
      context.reply(reply, getInlineReply(buttons));
      // context.reply(reply, getExtraReply(buttons));
    }
  }

  async function hearsResultsHandler(context, userId, questionId) {
    try {
      // const { questionId } = store.getUserState(userId);
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
    } catch (error) {
      console.error(error);
      store.dispatch({
        type: ACTIONS.ERROR,
        payload: { userId },
      });
      const { reply, buttons } = store.getQuestionState(userId, questionId);
      context.reply(reply, getInlineReply(buttons));
      // context.reply(reply, getExtraReply(buttons));
    }
  }

  function commandAboutHandler(context) {
    const userId = context.message.from.id;
    store.dispatch({
      type: ACTIONS.SHOW_ABOUT,
      payload: { userId },
    });
    const { reply, buttons } = store.getUserState(userId);
    context.reply(reply, getInlineReply(buttons));
    // context.reply(reply, getExtraReply(buttons));
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
      context.reply(reply, getInlineReply(buttons));
      // context.reply(reply, getExtraReply(buttons));
    } catch (error) {
      console.error(error);
      store.dispatch({
        type: ACTIONS.ERROR,
        payload: { userId },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getInlineReply(buttons));
      // context.reply(reply, getExtraReply(buttons));
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
      context.reply(reply, getInlineReply(buttons));
      // context.reply(reply, getExtraReply(buttons));
    } catch (error) {
      console.error(error);
      store.dispatch({
        type: ACTIONS.ERROR,
        payload: { userId },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getInlineReply(buttons));
      // context.reply(reply, getExtraReply(buttons));
    }
  }

  async function commandFindHandler(context) {
    const { from: { id: userId }, text } = context.message;
    try {
      const textArray = text.match(/[A-Za-zА-Яа-яЁё0-9]+/gi);
      const command = textArray.shift();
      if (command !== 'find' || textArray.length === 0) throw new Error('Уточните строку поиска!');
      const questions = await storage.getQuestionsWithText(textArray);
      store.dispatch({
        type: ACTIONS.GET_QUESTIONS_LIST,
        payload: { userId, questions, command: COMMANDS.FIND },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getInlineReply(buttons));
      // context.reply(reply, getExtraReply(buttons));
    } catch (error) {
      console.error(error);
      store.dispatch({
        type: ACTIONS.ERROR,
        payload: { userId, error },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getInlineReply(buttons));
      // context.reply(reply, getExtraReply(buttons));
    }
  }

  function commandHelpHandler(context) {
    const userId = context.message.from.id;
    store.dispatch({
      type: ACTIONS.MOCK,
      payload: { userId },
    });
    const { reply, buttons } = store.getUserState(userId);
    context.reply(reply, getInlineReply(buttons));
    // context.reply(reply, getExtraReply(buttons));
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
      context.reply(reply, getInlineReply(buttons));
      // context.reply(reply, getExtraReply(buttons));
    } catch (error) {
      console.error(error);
      store.dispatch({
        type: ACTIONS.ERROR,
        payload: { userId },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getInlineReply(buttons));
      // context.reply(reply, getExtraReply(buttons));
    }
  }

  function commandSettingsHandler(context) {
    const userId = context.message.from.id;
    store.dispatch({
      type: ACTIONS.MOCK,
      payload: { userId },
    });
    const { reply, buttons } = store.getUserState(userId);
    context.reply(reply, getInlineReply(buttons));
    // context.reply(reply, getExtraReply(buttons));
  }

  async function launchQuestion(context, userId, questionId) {
    const status = await storage.getQuestionStatus(questionId, userId);
    if (status === 'ANSWERED' || status === 'SKIPPED') {
      store.dispatch({
        type: ACTIONS.HEARS_RESULTS,
        payload: { userId, questionId },
      });
      await hearsResultsHandler(context, userId, questionId);
      const { reply, buttons } = store.getQuestionState(userId, questionId);
      context.reply(reply, getInlineReply(questionId, buttons));
      return;
    }
    // NOT ANSWERED
    const questionWithOptions = await storage.getQuestionWithOptions(questionId);
    const {
      header, text, options, e,
    } = questionWithOptions;
    console.log('questionWithOptions', questionWithOptions);
    console.log(e);
    if (e) {
      console.error(e);
      store.dispatch({
        type: ACTIONS.ERROR,
        payload: { userId, questionId, error: e },
      });
      const { reply, buttons } = store.getQuestionState(userId, questionId);
      context.reply(reply, getInlineReply(buttons));
      // context.reply(reply, getExtraReply(buttons));
    } else {
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
      const { reply, buttons } = store.getQuestionState(userId, questionId);
      console.log('{ reply, buttons }', { reply, buttons });
      context.reply(reply, getInlineReply(questionId, buttons));
    }
  }

  async function onTextHandler(context) {
    const {
      id: userId,
      first_name: userFirstName,
      last_name: userLastName,
      username: userName,
    } = context.message.from;
    const userMessageId = context.message.message_id;
    const info = context.message.text;
    const questionId = 0;
    const { type } = store.getQuestionState(userId, questionId);
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
        const { reply, buttons } = store.getQuestionState(userId, questionId);
        clearMessages(context);
        context
          .reply(reply, getInlineReply(buttons))
          // .reply(reply, getExtraReply(buttons))
          .then((message) => {
            console.log({ payload: { userId, messageId: message.message_id } });
            store.dispatch({
              type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
              payload: { userId, messageId: message.message_id },
            });
          })
          .catch((error) => {
            console.error(error);
          });
        break;
      }

      case STATES.CREATE_TEXT: {
        store.dispatch({
          type: ACTIONS.CREATE_TEXT,
          payload: {
            userId, questionId: 0, text: info.substr(0, 255), userMessageId,
          },
        });
        const { reply, buttons } = store.getQuestionState(userId, questionId);
        clearMessages(context);
        context
          .reply(reply, getInlineReply(buttons))
          // .reply(reply, getExtraReply(buttons))
          .then((message) => {
            store.dispatch({
              type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
              payload: { userId, messageId: message.message_id },
            });
          })
          .catch((error) => {
            console.error(error);
          });
        break;
      }

      case STATES.CREATE_OPTION: {
        const option = info.substr(0, 100);
        store.dispatch({
          type: ACTIONS.CREATE_OPTION,
          payload: { userId, option, userMessageId },
        });
        const { reply, buttons } = store.getQuestionState(userId, questionId);
        clearMessages(context);
        context
          .reply(reply, getInlineReply(buttons))
          // .reply(reply, getExtraReply(buttons))
          .then((message) => {
            store.dispatch({
              type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
              payload: { userId, questionId: 0, messageId: message.message_id },
            });
          })
          .catch((error) => {
            console.error(error);
          });
        break;
      }

      // Нужен ли этот раздел при переходе на callback buttons?
      // case STATES.ANSWER: {
      //   const { options, optionsSelected } = store.getUserState(userId);
      //   const optionIndex = options.findIndex((option) => option.Name === info);
      //   // WRONG_ANSWER
      //   if (optionIndex === -1) {
      //     store.dispatch({
      //       type: ACTIONS.GET_WRONG_OPTION,
      //       payload: { userId, answer: info },
      //     });
      //     const { reply, buttons } = store.getUserState(userId);
      //     clearMessages(context);
      //     context
      //       .reply(reply, getExtraReply(buttons))
      //       .then((message) => {
      //         store.dispatch({
      //           type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
      //           payload: { userId, messageId: message.message_id },
      //         });
      //       })
      //       .catch((error) => {
      //         console.error(error);
      //       });
      //     return;
      //   }
      //   // RIGHT_ANSWER
      //   store.dispatch({
      //     type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
      //     payload: { userId, messageId: userMessageId },
      //   });
      //   const selectedOption = options.splice(optionIndex, 1);
      //   optionsSelected.push(...selectedOption);
      //   if (options.length === 1) {
      //     const lastOption = options.pop();
      //     optionsSelected.push(lastOption);
      //     await storage.saveRanks({
      //       userId,
      //       optionsSelected,
      //       options,
      //       userFirstName,
      //       userLastName,
      //       userName,
      //     });
      //     await storage.saveStatus({
      //       userId,
      //       questionId,
      //       status: 'ANSWERED',
      //       userFirstName,
      //       userLastName,
      //       userName,
      //     });
      //   }
      //   store.dispatch({
      //     type: ACTIONS.GET_OPTION,
      //     payload: { userId, options, optionsSelected },
      //   });
      //   const { reply, buttons } = store.getUserState(userId);
      //   clearMessages(context);
      //   context
      //     .reply(reply, getExtraReply(buttons))
      //     .then((message) => {
      //       store.dispatch({
      //         type: ACTIONS.APPEND_MESSAGE_TO_QUEUE,
      //         payload: { userId, messageId: message.message_id },
      //       });
      //     })
      //     .catch((error) => {
      //       console.error(error);
      //     });
      //   break;
      // }

      default: {
        store.dispatch({
          type: ACTIONS.MOCK,
          payload: { userId },
        });
        const { reply, buttons } = store.getUserState(userId);
        context.reply(reply, getInlineReply(buttons));
        // context.reply(reply, getExtraReply(buttons));
      }
    }
  }

  async function actionHandler(context) {
    console.log('function actionHandler(context) {');
    console.log(context);
    const {
      id: userId,
      first_name: userFirstName,
      last_name: userLastName,
      username: userName,
    } = context.update.callback_query.from;
    const data = JSON.parse(context.update.callback_query.data);
    console.log('data', data);
    const { questionId, answerId, link = '' } = data;
    const { options, optionsSelected } = store.getQuestionState(userId, questionId);
    const optionIndex = (options || []).findIndex((option) => option.id === answerId);
    console.log(
      userId,
      userFirstName,
      userLastName,
      userName,
      questionId,
      options,
      optionsSelected,
      optionIndex,
    );
    console.log('switch (link)');
    console.log('button', link);
    switch (link) {
      case BUTTONS.NEW.link:
      case BUTTONS.DONE.link:
      case BUTTONS.RESULTS_MINE.link: {
        context.answerCbQuery();
        const rows = await storage.getAnswersByUser(questionId, userId);
        if (!rows || rows.length === 0) {
          const reply = 'Нет информации о ваших ответах';
          context.reply(reply, []);
          break;
        }
        const header = rows[0].Header;
        const text = rows[0].Text;
        const ranks = rows.reduce((acc, item) => {
          if (!acc[item.Rank]) {
            acc[item.Rank] = 0;
          }
          acc[item.Rank] += 1;
          return acc;
        }, {});
        const answers = rows.map((item) => {
          const rank = (ranks[item.Rank] === 1)
            ? item.Rank
            : `${item.Rank}-${item.Rank + ranks[item.Rank] - 1}`;
          return { rank, name: item.Name };
        });
        const reply = answers.reduce((acc, option) => `${acc}\n${option.rank}. ${option.name}`,
          `Опрос <b>${header}</b>\n`
          + `${text}\n\n`
          + 'Ваши ответы:');
        context.reply(reply, getInlineReply(questionId, []));
        break;
      }
      case BUTTONS.SKIP.link: {
        store.dispatch({
          type: ACTIONS.SKIP,
          payload: { userId, questionId },
        });
        const { reply, buttons } = store.getQuestionState(userId, questionId);
        context.editMessageText(reply, getInlineReply(questionId, buttons));
        break;
      }
      case BUTTONS.SKIP_ABORT.link: {
        await launchQuestion(context, userId, questionId);
        break;
      }
      case BUTTONS.SKIP_APPROVE.link: {
        await storage.saveStatus({
          userId,
          questionId,
          status: 'SKIPPED',
          userFirstName,
          userLastName,
          userName,
        });
        store.dispatch({
          type: ACTIONS.HEARS_RESULTS,
          payload: { userId, questionId },
        });
        await hearsResultsHandler(context, userId, questionId);
        const { reply, buttons } = store.getQuestionState(userId, questionId);
        context.editMessageText(reply, getInlineReply(questionId, buttons));
        break;
      }
      case BUTTONS.RESULTS.link: {
        try {
          const { header, text } = await storage.getQuestion(questionId);
          const { votersCount } = await storage.getVotersCount(questionId);
          const optrows = await storage.getOptions(questionId);
          const rows = await storage.getRanks(questionId);
          const optionsList = optrows.map((item) => item.id);
          const optionsRating = method(optionsList, rows);
          const optionsResult = optionsRating
            .sort((item1, item2) => item1.place - item2.place)
            .map((item) => {
              const position = (item.count === 1)
                ? (item.place + 1)
                : `${item.place + 1}-${item.place + item.count}`;
              const { name } = optrows.filter((row) => row.id === item.id)[0];
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
          context.editMessageText(reply, getInlineReply(questionId, buttons));
        } catch (error) {
          console.error(error);
          store.dispatch({
            type: ACTIONS.ERROR,
            payload: { userId },
          });
          const { reply, buttons } = store.getQuestionState(userId, questionId);
          context.reply(reply, getInlineReply(buttons));
          // context.reply(reply, getExtraReply(buttons));
        }
        break;
      }
      case BUTTONS.COMPLETE.link: {
        await storage.saveRanks({
          userId,
          optionsSelected,
          options,
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
        store.dispatch({
          type: ACTIONS.HEARS_COMPLETE,
          payload: { userId, options, optionsSelected },
        });
        const { reply, buttons } = store.getQuestionState(userId, questionId);
        context.editMessageText(reply, getInlineReply(questionId, buttons));
        break;
      }
      case BUTTONS.HINT.link: {
        const reply = `Выбирайте варианты ответов, начиная с наиболее подходящего, пока не расставите все
Кнопка "${BUTTONS.COMPLETE.name}" распределит оставшиеся варианты на последние места
Кнопка "${BUTTONS.CANCEL.name}" прервёт опрос (вы можете вернуться к нему позднее)`;
        context.reply(reply);
        // context.answerCbQuery(reply);
        break;
      }
      case BUTTONS.CANCEL.link: {
        store.dispatch({
          type: ACTIONS.HEARS_CANCEL,
          payload: { userId, questionId },
        });
        const { reply, buttons } = store.getQuestionState(userId, questionId);
        context.editMessageText(reply, getInlineReply(questionId, buttons));
        break;
      }
      default: {
        const selectedOption = options.splice(optionIndex, 1);
        optionsSelected.push(...selectedOption);
        if (options.length === 1) {
          const lastOption = options.pop();
          optionsSelected.push(lastOption);
          await storage.saveRanks({
            userId,
            optionsSelected,
            options,
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
          payload: {
            userId, questionId, options, optionsSelected,
          },
        });
        const { reply, buttons } = store.getQuestionState(userId, questionId);
        console.log(reply, buttons);
        context.editMessageText(reply, getInlineReply(questionId, buttons));
      }
    }
  }

  async function commandRandomHandler(context) {
    const userId = context.message.from.id;
    const questionId = await storage.getQuestionsRandom();
    await launchQuestion(context, userId, questionId);
  }

  async function startHandler(context) {
    const userId = context.message.from.id;
    if (context.startPayload === '') {
      const reply = 'Привет!\n'
        + 'Можешь набрать /about и немного узнать о преференциальных голосованиях.\n'
        + 'Можешь набрать /new и создать свой опрос.\n'
        + 'Или набрать / и ознакомиться со списком всех доступных команд.\n';
      context.replyWithMarkdown(reply);
      return;
    }
    try {
      const questionId = parseInt(context.startPayload, 10);
      await launchQuestion(context, userId, questionId);
    } catch (error) {
      console.error(error);
      store.dispatch({
        type: ACTIONS.ERROR,
        payload: { userId },
      });
      const { reply, buttons } = store.getUserState(userId);
      context.reply(reply, getInlineReply(buttons));
      // context.reply(reply, getExtraReply(buttons));
    }
  }

  return {
    startHandler,
    actionHandler,
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
    hearsCompleteHandler,
    hearsDoneHandler,
    hearsResultsHandler,
    onTextHandler,
  };
}

module.exports = botHandlers;
