// https://habr.com/ru/post/483660/
// https://techrocks.ru/2017/10/07/how-to-build-a-simple-telegram-bot-on-node-js/
// https://metanit.com/web/nodejs/8.5.php
// Keyboards https://github.com/telegraf/telegraf/blob/master/docs/examples/keyboard-bot.js

require('dotenv').config();
const { Telegraf } = require('telegraf');

const { TELEGRAM_TOKEN } = process.env;
const createDBStorage = require('./storage');

const storage = createDBStorage();
const initialState = {};
const botReducer = require('./botReducer');
const createStore = require('./createStore');

const store = createStore(botReducer, initialState);
const botHandlers = require('./botHandlers');

const handlers = botHandlers(store, storage);
const { BUTTONS } = require('./button_types');
const { COMMANDS } = require('./command_types');

if (TELEGRAM_TOKEN === undefined) {
  throw new Error('TELEGRAM_TOKEN must be provided!');
}
const bot = new Telegraf(TELEGRAM_TOKEN);
bot.use(Telegraf.log());
bot.start(handlers.startHandler);
bot.action(/.+/, handlers.actionHandler);
bot.command(COMMANDS.ABOUT, handlers.commandAboutHandler);
bot.command(COMMANDS.CREATEDBYME, handlers.commandCreatedByMeHandler);
bot.command(COMMANDS.FIND, handlers.commandFindHandler);
bot.command(COMMANDS.HELP, handlers.commandHelpHandler);
bot.command(COMMANDS.NEW, handlers.commandNewHandler);
bot.command(COMMANDS.POPULAR, handlers.commandPopularHandler);
bot.command(COMMANDS.RANDOM, handlers.commandRandomHandler);
bot.command(COMMANDS.SETTINGS, handlers.commandSettingsHandler);
bot.command(COMMANDS.VOTEDBYME, handlers.commandVotedByMeHandler);
bot.hears(BUTTONS.CANCEL, handlers.hearsCancelHandler);
bot.hears(BUTTONS.COMPLETE, handlers.hearsCompleteHandler);
bot.hears(BUTTONS.DONE, handlers.hearsDoneHandler);
bot.hears(BUTTONS.RESULTS, handlers.hearsResultsHandler);
bot.on('text', handlers.onTextHandler);

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
