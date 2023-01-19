'use strict';

require(`checkenv`).check();

const events = require(`./Events.js`);
const logger = require(`./Logger.js`);
const state = require(`./State.js`);

const Google = require(`./Google.js`);
const Discord = require(`./Discord.js`);

logger.Info(`LionBot ${require(`../package.json`).version} initializing.`);

// Initialize Node.js runtime things, to handle rejections and exceptions.
logger.Info(`Initializing Node.js.`);
process.on(`unhandledRejection`, e =>
{
  logger.Error(`Unhandled rejection: "${e.message}."`);
});
process.on(`uncaughtException`, e =>
{
  logger.Error(`Uncaught exception: "${e.message}."`);
  process.exit(-1);
});
process.on(`SIGINT`, () =>
{
  setTimeout(Uninitialize, 1000);
});
process.on(`SIGTERM`, () =>
{
  setTimeout(Uninitialize, 1000);
});

const google = new Google();
const discord = new Discord();

function Uninitialize(fail = false)
{
  logger.Info(`LionBot uninitializing. Have a wonderful day!`);

  // Google has nothing to uninitialize.

  discord.Uninitialize();

  process.exit(fail ? -1 : 0);
}

function LogFailedQueue(failed_queue, queue_type, error)
{
  const ids = failed_queue.map(accept => accept.id);
  const err_str = `${queue_type} failed: ${error} Affected users internal IDs: ${ids.join}.`;

  logger.Error(err_str);
  Discord.ReportError(err_str);
}

async function ProcessSpreadsheet()
{
  logger.Info(`Processing spreadsheet.`);
  const user_queue = await google.GetUserQueue();
  if (user_queue.length > 0)
  {
    let {accept_queue, reject_queue} = discord.ProcessUserQueue(user_queue);
    ({accept_queue, reject_queue} = google.ProcessUserQueue(accept_queue, reject_queue));

    if (accept_queue.length > 0)
    {
      try
      {
        await Promise.all([
          google.AcceptUsers(accept_queue),
          discord.AcceptUsers(accept_queue)
        ]);
      }
      catch (e)
      {
        LogFailedQueue(accept_queue, `User acception`, e.stack || e);
      }
    }
    if (reject_queue.length > 0)
    {
      try
      {
        await Promise.all([
          discord.RejectUsers(reject_queue),
          google.RejectUsers(reject_queue)
        ]);
      }
      catch (e)
      {
        LogFailedQueue(reject_queue, `User rejection`, e.stack || e);
      }
    }
  }
  else
  {
    logger.Info(`User queue empty, no action necessary :)`);
  }
  state.last_spreadsheet_check_time = new Date();
}

async function Start()
{
  try
  {
    // Initialize the Google Sheets API client.
    logger.Info(`Initializing Google Sheets API client.`);
    const google_initialization = google.Initialize();

    // Initialize the Discord API client.
    logger.Info(`Initializing Discord API client.`);
    const discord_initialization = discord.Initialize();

    await Promise.all([google_initialization, discord_initialization]);
  }
  catch (e)
  {
    logger.Error(`Initialization failed: ${e.stack || e}`);
    Uninitialize(true);
    return;
  }
  logger.Info(`Initialization completed.`);

  try
  {
    logger.Verbose(`Processing spreadsheet initially.`);
    await ProcessSpreadsheet();
  }
  catch (e)
  {
    logger.Error(`Spreadsheet processing failed: ${e.stack || e}`);
    Uninitialize(true);
    return;
  }

  logger.Info(`Scheduling spreadsheet processing.`);
  async function ForceProcessSpreadsheet()
  {
    if (await google.SpreadsheetIsModified(google_auth))
    {
      logger.Verbose(`Processing spreadsheet because of timer or command.`);
      ProcessSpreadsheet();
    }
  }
  setInterval(ForceProcessSpreadsheet, 10 * 60 * 1000);
  events.ee.on(`forceProcess`, () => ForceProcessSpreadsheet());
}

Start();
