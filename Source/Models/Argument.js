'use strict';

class Argument
{
  constructor(short_name, explanation, required, is_mention = false)
  {
    this.short_name = short_name;
    this.explanation = explanation;
    this.required = required;
    this.is_mention = is_mention;
  }
}

module.exports = Argument;
