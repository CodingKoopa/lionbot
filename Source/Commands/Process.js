'use strict';

const discord = require(`../Discord.js`);
const events = require(`../Events.js`);

const Command = require(`../Models/Command.js`);

const description = `Forces a user signup process.`;
const roles = [`Admin`, `Moderator`];
const callback = (message) =>
{
  events.ee.emit(`forceProcess`);
  message.channel.send(`:arrows_counterclockwise: ${message.author}, forcing a new sign up \
process.`);
  discord.ReportInfo(`User signup process forced by ${message.author.username} \
(${message.author}).`);

  return 0;
};

module.exports = new Command(`process`, description, [], roles, callback);
