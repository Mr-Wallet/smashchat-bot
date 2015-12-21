"use strict"

const Botkit = require('botkit');
const _ = require('lodash');

const SMASH_CHANNEL_ID = 'G02K3JP83';
const ADMIN = 'U04CT4Y06' //jordan_wallet

const differentDays = function differentDays(date1, date2) {
  date1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  date2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  const ms = Math.abs(date1-date2);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor(ms/msPerDay);
}

const controller = Botkit.slackbot({
  json_file_store: './saveData',
});

const bot = controller.spawn({
  token: require('./token.js')
});

bot.privateMessage = function privateMessage(user, message) {
  bot.api.im.open({ user: user }, function(error, response) {
    bot.api.chat.postMessage({ as_user: true, channel: response.channel.id, text: message }, function(error, response) {
      //noop
    });
  });
};

bot.startRTM(function(error, bot, payload) {
  if (error) {
    throw new Error('Could not connect to Slack');
  }
});


// helpers
const getScoreMessage = function() {
  return 'Jose\'s score is _not_ at an all-time high. (2220 vs. 2250)';
}

let dededeTimer = 0;
const getDededeMessage = function() {
  return 'http://img.ifcdn.com/images/eed2c392ae247b9824dffecd6c56000bd45accd259a9ee1bc9e2497548bc8bb4_1.gif';
}

// logic
controller.hears(['^score$'],['direct_message', 'direct_mention'], function(bot,message) {
  bot.reply(message, getScoreMessage());
});

  })
});
controller.hears(['dedede', 'daniel'],['direct_mention', 'mention', 'ambient'], function(bot,message) {
  if (dededeTimer) {
    dededeTimer = Math.max(dededeTimer - 2, 0);
    return;
  }
  bot.reply(message, getDededeMessage());
  dededeTimer = 50;
});

controller.hears(['help'],['direct_message', 'direct_mention'], function(bot, message) {
  bot.privateMessage(message.user, 'Here are my commands:\n'
    + '  `help` This list of commands.\n'
    + '  `score` Find out if Jose\'s score is at an all-time high.' //'\n'
  );
});

controller.hears(['.*'],['direct_message', 'direct_mention'], function(bot, message) {
  bot.reply(message, 'I don\'t understand. Try messaging me for `help`.');
});

controller.on('message_received', function(bot, message) {
  if (dededeTimer) {
    dededeTimer--;
  }
});
