"use strict"
const Botkit = require('botkit');
const controller = Botkit.slackbot();
const bot = controller.spawn({
  token: require('./token.js')
});

bot.startRTM(function(error, bot, payload) {
  if (error) {
    throw new Error('Could not connect to Slack');
  }
});


// helpers
const getScoreMessage = function() {
  return 'Jose\'s score is _not_ at an all-time high. (2241 vs. 2250)';
}


// logic
controller.hears(['^score$'],['direct_message','direct_mention'], function(bot,message) {
  bot.reply(message, getScoreMessage());
});

controller.hears(['.*'],['direct_message','direct_mention'], function(bot, message) {
  bot.startConversation(message, function(error, convo) {
    convo.ask('I don\'t understand. Did you mean `score`?', [
      {
        pattern: new RegExp('^score$|' + bot.utterances.yes.source),
        callback: function(response,convo) {
          convo.say(getScoreMessage());
          convo.next();
        }
      },
      {
        default: true,
        callback: function(response, convo) {
          convo.say('Yes you did.');
          convo.say('Jose\'s score is _not_ at an all-time high. (2241 vs. 2250)');
          convo.next();
        }
      }
    ]);
  })
});
