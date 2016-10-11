/* global console require */
"use strict"

const Botkit = require('botkit');
const Promise = require('bluebird');
const Wompem = require('./wompem');
const _ = require('lodash');

const SMASH_CHANNEL_ID = 'G02K3JP83';
// const ADMIN = 'U04CT4Y06' //jordan_wallet

let dededeTimer = 50;
let smashChannelMembers = {};

const differentDays = function differentDays(date1, date2) {
  date1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  date2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  const ms = Math.abs(date1-date2);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor(ms/msPerDay);
}



const getNewUserData = function getNewUserData(id) {
  return {
    id: id,
    lastCheckin: new Date(),
    wompEm: Wompem.DEFAULT_WOMPEM
  };
};

const controller = Botkit.slackbot({
  json_file_store: './saveData'
});

const bot = controller.spawn({
  retry: 100,
  token: require('./token.js')
});

/* ### PROMISIFY API CALLS - turns e.g. groups.info into groups.infoAsync which returns a promise ### */
bot.api.chat = Promise.promisifyAll(bot.api.chat);
bot.api.groups = Promise.promisifyAll(bot.api.groups);
bot.api.im = Promise.promisifyAll(bot.api.im);
bot.api.users = Promise.promisifyAll(bot.api.users);

bot.findUserByName = function findUserByName(userName) {
  userName = userName.toLowerCase();
  return bot.api.groups.infoAsync({ channel: SMASH_CHANNEL_ID })
    .then(function(response) {
      const members = response.group.members;
      const promises = [];
      members.forEach(function(member) {
        if(smashChannelMembers[member]) {
          return;
        }

        promises.push(bot.api.users.infoAsync({user: member})
          .then(function(response) {
            smashChannelMembers[member] = response.user;
          })
        );
      });
      return Promise.all(promises);
    })
    .then(function() {
      return _.find(smashChannelMembers, {name: userName});
    });
}

bot.privateMessage = function privateMessage(user, message) {
  return bot.api.im.openAsync({ user: user })
    .then(function(response) {
      return bot.api.chat.postMessageAsync({ as_user: true, channel: response.channel.id, text: message })
    });
};

bot.publicMessage = function publicMessage(message) {
  return bot.api.chat.postMessageAsync({ as_user: true, channel: SMASH_CHANNEL_ID, text: message });
}

bot.startRTM(function(error /*, bot, payload */) {
  if (error) {
    throw new Error('Could not connect to Slack');
  }
});


// helpers
const getScoreMessage = function() {
  return 'Jose\'s score is NOT at an all-time high. (2303 vs. 2332)';
}

const getDededeMessage = function() {
  return 'http://img.ifcdn.com/images/eed2c392ae247b9824dffecd6c56000bd45accd259a9ee1bc9e2497548bc8bb4_1.gif';
}

controller.hears(['^score$'],['direct_message', 'direct_mention'], function(bot,message) {
  bot.reply(message, getScoreMessage());
});

controller.hears(['^wompem$'],['direct_message', 'direct_mention'], function(bot,message) {
  controller.storage.users.get(message.user,function(err,userData) {
    if (!userData || !userData.wompEm) {
      bot.privateMessage(message.user,'You have no WompEm.');
    } else {
      bot.privateMessage(message.user,'You have ' + userData.wompEm + ' WompEm.');
    }
  })
});

controller.hears([
  '^wompem give ((?:[a-zA-Z0-9_\-]+)|(?:<@[a-zA-Z0-9]+>)) (\-?[0-9]+)$',
  '^give ((?:[a-zA-Z0-9_\-]+)|(?:<@[a-zA-Z0-9]+>)) (\-?[0-9]+) wompem$'
],['direct_message', 'direct_mention'], function(bot,message) {
  const matches = message.text.match(/give ((?:[a-zA-Z0-9_\-]+)|(?:<@[a-zA-Z0-9]+>)) (\-?[0-9]+)/i);
  const targetName = matches[1];
  let targetID;
  if (targetName.slice(0, 2) == '<@') {
    targetID = targetName.slice(2, targetName.length - 1);
  }
  const amount = parseInt(matches[2]);

  if (amount < 1) {
    bot.privateMessage(message.user, 'Invalid amount. Format: `wompem give user_name amount`');
    return;
  }

  const findUser = function findUser() {
    if (targetID) {
      return bot.api.users.infoAsync({user: targetID})
        .then(function(response) { return response.user });
    }
    return bot.findUserByName(targetName);
  }

  findUser()
    .then(function(targetInfo) {
      if (!targetInfo) {
        bot.privateMessage(message.user, 'No such user found in the smash channel. Format: `wompem give user_name amount`');
        return;
      }
      controller.storage.users.get(targetInfo.id, function(error,targetData) {
        if (!targetData) {
          targetData = getNewUserData(targetInfo.id);
        }
        return bot.api.users.infoAsync({user: message.user})
          .then(function(response) {
            const userInfo = response.user;
            if (targetInfo.name === userInfo.name) {
              bot.privateMessage(message.user, 'You can\'t give WompEm to yourself!');
              controller.storage.users.save(targetData);
              return;
            }

            controller.storage.users.get(message.user, function(error, userData) {
              if (!userData || !userData.wompEm || userData.wompEm < amount) {
                bot.privateMessage(message.user, 'You have insufficient WompEm.');
              } else {
                userData.wompEm -= amount;
                targetData.wompEm += amount;
                controller.storage.users.save(userData);
                controller.storage.users.save(targetData);
                bot.publicMessage(userInfo.name + ' gave ' + amount + ' WompEm to ' + targetInfo.name + '.');
              }
            });
          });
      });
    });
});


controller.hears(['dedede', 'daniel'],['direct_mention', 'mention', 'ambient'], function(bot,message) {
  if (dededeTimer) {
    dededeTimer--;
    return;
  }
  bot.reply(message, getDededeMessage());
  dededeTimer = 50;
});

controller.hears(['help'],['direct_message', 'direct_mention'], function(bot, message) {
  bot.privateMessage(message.user, 'Here are my commands:\n'
    + ' `--dash-dash` Not a real command but have fun verbally explaining how to use it.\n'
    + '  `help` This list of commands.\n'
    + '  `score` Find out if Jose\'s score is at an all-time high.\n'
    + '  `wompem` Get your current WompEm balance.\n'
    + '  `wompem give [user] [amount]` Give WompEm to another smash channel member. (Whole numbers only)'
  );
});

controller.hears(['.*'],['direct_message', 'direct_mention'], function(bot, message) {
  bot.reply(message, 'I don\'t understand. Try messaging me for `help`.');
});

controller.on('ambient', function() {
  if (dededeTimer) {
    dededeTimer--;
  }
});

const idleFn = function idleFn(bot, message) {
  if (message.type !== 'message') {
    return;
  }

  controller.storage.users.get(message.user, function(error,userData) {
    if (!userData) {
      userData = getNewUserData(message.user);
      controller.storage.users.save(userData);
      return;
    }

    const now = new Date();
    if (differentDays(new Date(userData.lastCheckin), now) && now.getDay() !== 0 && now.getDay() !== 6) {
      userData.wompEm += Wompem.getDailyWompEm();
    }
    userData.lastCheckin = now;
    controller.storage.users.save(userData);
  });
};

controller.on('ambient', idleFn);
controller.on('mention', idleFn);
controller.on('direct_mention', idleFn);
controller.on('direct_message', idleFn);
