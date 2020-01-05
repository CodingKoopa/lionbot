'use strict';

const fs = require(`fs`).promises;
const path = require(`path`);

const discord = require(`discord.js`);

const logger = require(`./Logger.js`);
const state = require(`./State.js`);

const UserReject = require(`./Models/UserReject.js`);

class Discord
{
  constructor()
  {
    this.client = new discord.Client();
  }

  async Initialize()
  { 
    logger.Verbose(`Logging into Discord.`);
    await this.client.login(process.env.LB_TOKEN);

    this.client.user.setActivity(`sign up forms 👌`, { type: `WATCHING` });

    state.report_channel = this.client.channels.get(process.env.LB_REPORT_CHANNEL);
    if (!state.report_channel)
      throw new Error(`Report channel "${process.env.LB_REPORT_CHANNEL}" not found.`);
        
    state.guild = state.report_channel.guild;
    if (!state.guild)
      throw new Error(`Guild "${process.env.LB_GUILD}" not found."`);

    state.verify_role = state.guild.roles.get(process.env.LB_VERIFY_ROLE);
    if (!state.verify_role)
      throw new Error(`Verification role "${process.env.LB_VERIFY_ROLE}" not found.`);

    // Load all command modules.
    logger.Debug(`Loading command modules.`);
    let command_list = [];
    const directory_read = fs.readdir(`Source/Commands/`);

    logger.Debug(`Caching users.`);
    // Cache the users.
    const member_fetch = state.guild.fetchMembers();

    const [files] = await Promise.all([directory_read, member_fetch]);
    files.forEach(file =>
    {
      // Load the module if it's a script.
      if (path.extname(file) === `.js`)
      {
        if (file.includes(`.disabled`))
        {
          logger.Debug(`Did not load disabled command module: ${file}`);
        }
        else
        {
          command_list.push(require(`./Commands/${file}`));
          logger.Debug(`Loaded command module ${file}.`);
        }
      }
    });

    // When a new message is recieved.
    this.client.on(`message`, message => 
    {
      // Ignore bot messages.
      if (message.author.bot)
        return;

      // Handle DM messages.
      if (!message.guild)
      {
        const embed = new discord.RichEmbed()
          .setTitle(`Mod Mail`)
          .setDescription(`DM from ${message.author} (${message.author.id}): ${message.content}`)
          .setColor(`#747f8d`)
          .setAuthor(message.author.username, message.author.avatarURL);
        state.report_channel.send({embed});
      }

      // Handle commands.
      if (message.content.startsWith(process.env.LB_PREFIX))
      {
        // If the message starts with more than one of the command prefix, don't do anything.
        // For example: "...well ok then."
        if (message.content[0] === message.content[1])
          return;

        const split_message = message.content.match(/([\w|.|@|#|<|>|:|/|(|)|-]+)|("[^"]+")/g);

        const entered_command = split_message[0].slice(process.env.LB_PREFIX.length).toLowerCase();
        let args = split_message.slice(1, split_message.length);
        // Strip any quotes, they're not needed any more.
        args.forEach((arg, arg_index, arg_array) =>
        {
          if (arg[0] === `"`)
            arg_array[arg_index] = arg.substring(1, arg.length - 1);
        });

        // Get the index of the command in the list.
        const index = command_list.map(command =>
          command.name.toLowerCase()).indexOf(entered_command);

        // The help command is handled differently. Consider it to be, like, a shell builtin, like
        // alias.
        if (entered_command === `help`)
        {
          message.reply(`private messaging bot help to you.`);
          let command_name_list = ``;
          command_list.forEach(command =>
          {
            // Only add commands that the user can run to the list.
            if (command.IsExecutable(message))
              command_name_list += `\`${command.name}\`: ${command.description}\n`;
          });
          const help_embed = new discord.RichEmbed({
            title: `LionBot Help`,
            description: command_name_list
          });
          message.author.send(`Here's the help for this bot:`, {embed: help_embed}).then(() =>
            message.delete());
        }
        // If the command could be found.
        else if (index >= 0)
        {
          // Only delete the message if it's the last one in the array.
          command_list[index].Execute(message, args);
        }
      }
    });
  }

  Uninitialize()
  {
    this.client.destroy();
  }

  static ReportError(error)
  {
    const embed = new discord.RichEmbed()
      .setTitle(`Internal Error`)
      .setDescription(`${error}`)
      .setColor(`#F04747`);
    state.report_channel.send({embed});
  }

  static ReportInfo(info)
  {
    const embed = new discord.RichEmbed()
      .setTitle(`Info`)
      .setDescription(`${info}`)
      .setColor(`#7289DA`);
    state.report_channel.send({embed});
  }

  ProcessUserQueue(user_queue)
  {
    // An empty user queue is a valid scenario that must be accounted for, for when there are no new
    // users to accept or reject.
    if (user_queue)
    {
      logger.Verbose(`Processing user queue pass 1, Discord.`);

      let accept_queue = [];
      let reject_queue = [];
      user_queue.forEach(user => 
      {
        const regex_str = `^[A-Za-z0-9._%+-]+@${process.env.LB_DOMAIN}$`;
        const regex = RegExp(regex_str, `g`);
        if (!regex.test(user.email))
        {
          reject_queue.push(new UserReject(user, `Email not a part of organization domain.`));
          return;
        }

        user.guild_member = state.guild.members.find(member =>
          member.user.tag === user.discord_tag);
        if (!user.guild_member)
        {
          reject_queue.push(new UserReject(user, `Discord account not found in server.`));
          return;
        }

        if (user.guild_member.roles.has(state.verify_role.id))
        {
          reject_queue.push(new UserReject(user, `Server member already has role.`));
          return;
        }

        accept_queue.push(user);
      });
      return {accept_queue, reject_queue};
    }
  }

  async AcceptUsers(accept_queue)
  {
    logger.Verbose(`Updating server for accepted users.`);
    const promise_arr = accept_queue.map(user => 
    {
      const embed = new discord.RichEmbed()
        .setTitle(`User ${user.discord_tag} (${user.email}) Accepted`)
        .setColor(`#43B581`);
      if (user.guild_member)
        embed.setAuthor(user.guild_member.nickname, user.guild_member.user.avatarURL);
      state.report_channel.send({embed});
    
      return user.guild_member.addRole(state.verify_role)
        .then(user.guild_member.send(`Your sign up entry for ${state.guild.name} has been accepted!\
 :tada:

Please see <#${process.env.LB_WELCOME_CHANNEL}> to familiarize yourself with the server :)`));
    });
    return Promise.all(promise_arr);
  }

  RejectUsers(reject_queue)
  {
    logger.Verbose(`Updating server for rejected users.`);
    reject_queue.forEach(user_reject => 
    {
      const embed = new discord.RichEmbed()
        .setTitle(`User ${user_reject.user.discord_tag} (${user_reject.user.email}) Rejected`)
        .setDescription(`Reason: ${user_reject.reason}`)
        .setColor(`#F04747`);
      if (user_reject.user.guild_member)
      {
        embed.setAuthor(user_reject.user.guild_member.nickname,
          user_reject.user.guild_member.user.avatarURL);
        user_reject.user.guild_member.send(`Your sign up entry for ${state.guild.name} has been \
rejected for the following reason: ${user_reject.reason} Please direct any questions or concerns \
to the staff.`);
      }
      state.report_channel.send({embed});
    });
    logger.Info(`${reject_queue.length} user(s) rejected on Discord.`);
  }
}

module.exports = Discord;