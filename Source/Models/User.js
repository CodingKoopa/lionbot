'use strict';

class User
{
  constructor(id, email, discord_tag, year, status)
  {
    this.id = id;
    this.email = email;
    this.discord_tag = discord_tag;
    this.year = year;
    this.status = status;

    this.guild_member = null;
  }
}

module.exports = User;
