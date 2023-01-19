'use strict';

const EmbedBuilder = require(`discord.js`).EmbedBuilder;

const discord = require(`../Discord.js`);

class Command
{
  constructor(name, description, args, roles, callback)
  {
    this.name = name;
    this.description = description;
    this.args = args;
    this.num_required_arguments = 0;
    this.args.forEach(argument =>
    {
      if (argument.required)
        this.num_required_arguments++;
    });
    let mention_index = 0;
    this.args.forEach((argument, index, args) =>
    {
      if (argument.is_mention)
      {
        args[index].mention_index = mention_index;
        mention_index++;
      }
    });
    this.roles = roles;
    this.callback = callback;
  }

  // Used by the help command.
  IsExecutable(message)
  {
    // If there are roles to fulfill, and the user's roles contain the command's.
    if (this.roles && message.member.roles.cache.some(role => this.roles.indexOf(role.name)))
      return true;
    // If there are no roles to fulfill.
    else if (!this.roles)
      return true;
    else
      return false;
  }

  async Execute(message, passed_arguments, delete_message = true)
  {
    await message.guild.roles.fetch();
    await message.guild.members.fetch();

    const see_help_message = `See \`${process.env.LB_PREFIX}${this.name} --help\` for usage.`;
    if (!this.IsExecutable(message))
    {
      discord.ReportInfo(`${message.author.username} (${message.author}) attempted to \
use staff command ${this.name} with argument(s) ${passed_arguments}.`);
      message.channel.send(`:rotating_light: ${message.author} Error: Permission denied. This \
command can only be used by ${this.roles.join}.`);
      return 1;
    }
    else if (passed_arguments[0] && passed_arguments[0].toLowerCase() === `--help`)
    {
      const description = `**Description**: ${this.description}\n`;
      var usage = `**Usage**: \`${process.env.LB_PREFIX}${this.name} [--help] `;
      // arguments is reserved.
      let argument_list = ``;
      this.args.map(argument =>
      {
        usage += `${argument.short_name} `;
        argument_list += `\`${argument.short_name}\``;
        if (argument.required && argument.is_mention)
          argument_list += ` (Mention)`;
        else if (!argument.required && argument.is_mention)
          argument_list += ` (Optional Mention)`;
        else if (!argument.required && !argument.is_mention)
          argument_list += ` (Optional)`;
        argument_list += `: ${argument.explanation}\n`;
      });
      // Close the mini code block.
      usage += `\``;
      const help_embed = new EmbedBuilder(
        {
          title: `\`${this.name}\` Command Help`,
          description: `${description}${usage}\n${argument_list}`
        });
      message.reply(`Here's the command help for \`${this.name}\`:`,
        {
          embeds: [help_embed]
        });
      return 0;
    }
    else if (passed_arguments.length < this.num_required_arguments)
    {
      message.channel.send(`:rotating_light: ${message.author} Error: Too little arguments. At \
least ${this.num_required_arguments} needed, given ${passed_arguments.length}. \
${see_help_message}`);
      return 1;
    }
    else if (passed_arguments.length > this.args.length)
    {
      message.channel.send(`:rotating_light: ${message.author} Error: Too many arguments. No more \
than ${this.args.length} accepted, given ${passed_arguments.length}. ${see_help_message}`);
      return 1;
    }
    else
    {
      try
      {
        if (this.callback(message, passed_arguments) === 0 && delete_message && message.deletable)
          message.delete();
        return 0;
      }
      catch (e)
      {
        message.channel.send(`:rotating_light: ${message.author} Error: ${e.stack || e}`);
        return 1;
      }
    }
  }
}

module.exports = Command;
