'use strict';

// Application State
var State = function()
{
  this.last_spreadsheet_check_time = new Date(0);

  this.guild = null;
  this.report_channel = null;
  this.verify_role = null;
  this.alum_role = null;
  this.admin_role = null;
  this.mod_role = null;
};

module.exports = new State();
