'use strict';

const discord = require(`../Discord.js`);
const state = require(`../State.js`);

const Command = require(`../Models/Command.js`);
const Argument = require(`../Models/Argument.js`);
const UserRoleAction = require(`../Models/UserRoleAction.js`);
const logger = require(`../Logger.js`);

const description = `Triggers a graduation.`;
const arg = [new Argument(`year`, `The year of the graduating class.`, true, false)];
const roles = [`Admin`];
const callback = (message, args) =>
{
  const year = args[0];
  let action_list = [];
  state.guild.members.cache.forEach(member =>
  {
    if (member.roles.cache.some(role => role.name === year))
      action_list.push(new UserRoleAction(member, state.alum_role));
  });
  if (action_list.length !== 0)
  {
    action_list.forEach(action =>
    {
      logger.Verbose(`User: ${action.user.nickname} (${action.user.id}), add role: \
${action.role_add.name}.`);
      action.user.roles.add(action.role_add.id);
    });
  }
  else
  {
    discord.ReportError(`No users with a ${year} role found to graduate.`);
    return 1;
  }

  const year_colors = [`#046432`, `#000001`, `#ffffff`, `#f1c40f`, `#2ecc71`];
  for (let cur_year = year; cur_year < parseInt(year) + 5; ++cur_year)
  {
    const color = year_colors[cur_year - year];
    logger.Verbose(`Year: ${cur_year}, color: ${color}`);
    const role = state.guild.roles.cache.find(role => role.name === cur_year.toString());
    if (role)
      role.setColor(color);
    else
      discord.ReportError(`Role for ${cur_year} not found.`);
  }
  discord.ReportInfo(`Graduation of ${year} triggered by by ${message.author.username} \
(${message.author}).`);

  return 0;
};

module.exports = new Command(`graduate`, description, arg, roles, callback);
