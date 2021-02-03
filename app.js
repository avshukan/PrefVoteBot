'use strict';
require('dotenv').config();
const { TELEGRAM_TOKEN } = process.env;
const { Telegraf } = require('telegraf');
const bot = new Telegraf(TELEGRAM_TOKEN);

bot.start(ctx => {
    ctx.reply('Welcome, bro');
});

bot.on('text', ctx => {
    ctx.reply('just text');
});

bot.launch();
