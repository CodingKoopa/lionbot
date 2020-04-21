'use strict';

const fs = require(`fs`).promises;
const {promisify} = require(`util`);
const readline = require(`readline`);

const {google} = require(`googleapis`);

const state = require(`./State.js`);
const logger = require(`./Logger.js`);

const User = require(`./Models/User.js`);
const UserReject = require(`./Models/UserReject.js`);

class Google
{
  constructor()
  {
    // The access scopes allowed during the OAuth authantication process. After changing this, the
    // token file must be recreated.
    this.scopes = [
      `https://www.googleapis.com/auth/spreadsheets`,
      `https://www.googleapis.com/auth/drive.metadata.readonly`
    ];
    // This file stores the OAuth credentials. It's obtained from the Google API Console.
    this.credential_path = `Data/GoogleOAuthCredentials.json`;
    // This file stores the user's access and refresh tokens. It's created automatically when the
    // authorization flow completes for the first time.
    this.token_path = `Data/GoogleOAuthToken.json`;
    this.sheet_name = `Users`;

    this.accepted_user_emails = null;
  }

  async AskQuestion(question)
  {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question[promisify.custom] = (question) =>
    {
      return new Promise((resolve) =>
      {
        rl.question(question, resolve);
      });
    };
    const answer = await promisify(rl.question)(question);
    rl.close();
    return answer;
  }

  async Initialize()
  {
    logger.Debug(`Reading OAuth credentials from "${this.credential_path}".`);
    let credential_data = null;
    while (credential_data === null)
    {
      try
      {
        credential_data = await fs.readFile(this.credential_path);
      }
      catch (e)
      {
        logger.Error(`Unable to read credential file: ${e}.`);
        const choice = await this.AskQuestion(`Try again? (y/n)`);

        if (choice === `n`)
          throw new Error(`Unable to read credential file.`);
      }
    }
    return this.Authenticate(JSON.parse(credential_data));
  }

  async Authenticate(credentials)
  {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Read the OAuth token from the local path.
    logger.Debug(`Reading OAuth token from "${this.token_path}".`);
    try
    {
      const token_data = await fs.readFile(this.token_path);
      // If the file could be read, use the token.
      auth.setCredentials(JSON.parse(token_data));
      return auth;
    }
    catch (e)
    {
      // If the file couldn't be read, generate a new authentication URL to recieve a token.
      logger.Error(`Unable to read token file: ${e}.`);
      const auth_url = auth.generateAuthUrl({
        access_type: `offline`,
        scope: this.scopes,
      });
      logger.Info(`Authorize this app by visiting this url: ${auth_url}`);

      const code = await this.AskQuestion(`Enter the code from the page: `);

      let token;
      try
      {
        token = await auth.getToken(code);
      }
      catch (e)
      {
        throw new Error(`Unable to get access token: ${e}.`);
      }
      auth.setCredentials(token);

      try
      {
        // Store the token to disk for later program executions.
        fs.writeFile(this.token_path, JSON.stringify(token));
      }
      catch (e)
      {
        // This error isn't fatal, so don't throw an exception.
        logger.Error(`Unable to write access token to disk: ${e}`);
      }
      return auth;
    }
  }

  async SpreadsheetIsModified(auth)
  {
    if (state.last_spreadsheet_check_time === null)
      return true;

    logger.Verbose(`Getting spreadsheet modified time.`);
    const drive = google.drive({version: `v3`, auth: auth});
    const request = {
      fileId: process.env.LB_SPREADSHEET_FILE_ID,
      fields: `modifiedTime`
    };
    let res;
    try
    {
      res = await drive.files.get(request);
    }
    catch (e)
    {
      logger.Error(`The Google Drive API returned an error: ${e}`);
      return true;
    }

    logger.Silly(`Spreadsheet last modified time: ${res.data.modifiedTime}. Last checked time: \
${state.last_spreadsheet_check_time.toISOString()}.`);
    if (new Date(res.data.modifiedTime).getTime() >= state.last_spreadsheet_check_time.getTime())
    {
      logger.Debug(`Spreadsheet needs to be processed.`);
      return true;
    }
    else
    {
      logger.Debug(`Spreadsheet doesn't need to be processed.`);
      return false;
    }
  }

  async GetUserQueue(auth)
  {
    logger.Verbose(`Getting user queue from spreadsheet.`);

    const sheets = google.sheets({version: `v4`, auth: auth});
    const request = {
      spreadsheetId: process.env.LB_SPREADSHEET_FILE_ID,
      range: `'${this.sheet_name}'!B2:E`
    };
    let res;
    try
    {
      res = await sheets.spreadsheets.values.get(request);
    }
    catch (e)
    {
      throw new Error(`The Google Sheets API returned an error: ${e}`);
    }

    const rows = res.data.values;
    if (rows && rows.length)
    {
      // Map then filter so that we can use the index out of the overall data set.
      const user_accept_queue = rows
        .map((row, idx) => new User(idx, row[0], row[1], row[2], row[3], row[4]))
        .filter(user => user.status !== `ACCEPTED` && user.status !== `REJECTED`);
      this.accepted_user_emails = rows
        .filter(row => row[3] === `ACCEPTED`)
        .map(row => row[0]);

      return user_accept_queue;
    }
    else
    {
      throw new Error(`No rows found`);
    }
  }

  ProcessUserQueue(accept_queue, reject_queue)
  {
    if (accept_queue)
    {
      logger.Verbose(`Processing user queue pass 2, Google.`);

      accept_queue = accept_queue.filter(user =>
      {
        if (this.accepted_user_emails.includes(user.email))
        {
          reject_queue.push(new UserReject(user, `Email already used for different user.`));
          return false;
        }
        else
        {
          return true;
        }
      });
    }
    return {accept_queue, reject_queue};
  }

  async AcceptUsers(auth, accept_queue)
  {
    logger.Verbose(`Updating spreadsheet for accepted users.`);
    let data = accept_queue.map(user =>
    {
      // The +2 accounts for the first row of the spreadsheet being the header, and the index
      // 0-index (unlike the spreadsheet!).
      const row = user.id + 2;
      return {
        majorDimension: `ROWS`,
        range: `${this.sheet_name}!E${row}:G${row}`,
        values: [[`ACCEPTED`, user.guild_member.id, `N/A`]]
      };
    });

    const sheets = google.sheets({version: `v4`, auth: auth});
    const request = {
      spreadsheetId: process.env.LB_SPREADSHEET_FILE_ID,
      resource: {
        valueInputOption: `USER_ENTERED`,
        data
      }
    };
    let res;
    try
    {
      res = await sheets.spreadsheets.values.batchUpdate(request);
    }
    catch (e)
    {
      throw new Error(`The Google Sheets API returned an error: ${e}`);
    }

    logger.Info(`${res.data.totalUpdatedRows} user(s) accepted on spreadsheet.`);
  }

  async RejectUsers(auth, reject_queue)
  {
    logger.Verbose(`Updating spreadsheet for rejected users.`);
    let data = reject_queue.map(user_reject =>
    {
      // The +2 accounts for the first row of the spreadsheet being the header, and the index
      // 0-index (unlike the spreadsheet!).
      const row = user_reject.user.id + 2;
      return {
        majorDimension: `ROWS`,
        range: `${this.sheet_name}!E${row}:G${row}`,
        values: [[`REJECTED`, `N/A`, user_reject.reason]]
      };
    });

    const sheets = google.sheets({version: `v4`, auth: auth});
    const request = {
      spreadsheetId: process.env.LB_SPREADSHEET_FILE_ID,
      resource: {
        valueInputOption: `USER_ENTERED`,
        data
      }
    };
    let res;
    try
    {
      res = await sheets.spreadsheets.values.batchUpdate(request);
    }
    catch (e)
    {
      throw new Error(`The Google Sheets API returned an error: ${e}`);
    }
    logger.Info(`${res.data.totalUpdatedRows} user(s) rejected on spreadsheet.`);
  }
}

module.exports = Google;
