// Setup environment
require('dotenv').load();

const TelegramBot = require('node-telegram-bot-api');
const exec = require('child_process').exec;
const sqlite = require('sqlite3').verbose(); // eslint-disable-line
const Cron = require('cron').CronJob;
const platform = require('os').platform();

const db = new sqlite.Database(process.env.DATABASE_NAME);
const userTable = 'user';
const every15Mins5To6MondayToFriday = '*/15 17,18 * * 1-5';
const every30Mins7To8To9MondayToFriday = '*/30 7,8,9 * * 1-5';
// const everyMinute = '* * * * 0-6';

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

// Helper functions
const logCommand = (command, message) => console.log(`${new Date()} -> Recieved /${command} from ${message.from.username || `${message.from.first_name} ${message.from.last_name}`} (${message.chat.id})`);

const log = message => console.log(`${new Date()} -> ${message}`);

const runScraper = (chat) => {
  // Run inside phantomjs to render the page and grab the journey time. Check
  // out get-journey-time.js for more on how the journey time is collected
  if (!chat) {
    return false;
  }

  log(`Running scraper for ${chat.chatId}`);
  bot.sendChatAction(chat.chatId, 'typing');
  return exec(`./phantomjs_${platform === 'darwin' ? 'mac' : 'linux'} get-journey-time.js ${chat.journeyUrl}`, (err, stdout) => {
    log(`Scraping complete for ${chat.chatId}; sending message`);
    bot.sendMessage(chat.chatId, `It should take you around ${stdout.replace(/(\n|\r|\r\n)/, '')} to get ${chat.type === 'morning' ? 'to work' : 'home'}`);
  });
};

// Creates a cronjob for the timezone specified
const cronJobFactory = (timezone, type) => new Cron(type === 'morning' ? every30Mins7To8To9MondayToFriday : every15Mins5To6MondayToFriday, () => {
  if (!timezone || !type) {
    throw new Error('A timezone and type must be specified for the cron job factory');
  }

  log(`Scraping for ${timezone} -> ${type}`);

  db.each(`select * from ${userTable} where timezone=? and type=?`, timezone, type, (err, row) => runScraper(row));
}, null, true, timezone);

// Initialise database
db.all(`select * from ${userTable}`, (err, result) => {
  if (result === undefined) {
    db.run(`
      create table ${userTable} (
        timezone varchar(50) not null,
        chatId varchar(50) not null,
        journeyUrl varchar(750) not null,
        type varchar(20) not null,
        primary key (journeyUrl, chatId)
      )
    `);
  } else {
    log(`${userTable} table already exists, skipping table creation`);
  }
});

log('Bot initialised');

// /init is the command to initialise a traffic session. Takes a journeyUrl and
// a timezone and a type which is morning or night to be used for cron
bot.onText(/\/init (.+)/, (msg, match) => {
  const args = match[1].split(' ');
  const journeyUrl = args[0];
  const timezone = args[1];
  const type = args[2];
  const chatId = msg.chat.id;

  if (!journeyUrl || !timezone || (type !== 'night' && type !== 'morning')) {
    bot.sendMessage(chatId, 'Oops, the init needs to look like /init <JOURNEY URL> <TIMEZONE> <TYPE (night or morning)>');
  } else {
    logCommand('init', msg);

    db.all(`insert into ${userTable} (chatId, timezone, journeyUrl, type) VALUES (?, ?, ?, ?)`, [
      chatId,
      timezone,
      journeyUrl,
      type,
    ], (err) => {
      if (err) {
        bot.sendMessage(chatId, 'Uh oh, there was a database issue; contact the admin');
      } else {
        bot.sendMessage(chatId, `Ok that's all setup; you'll get notifications about your journey time every ${type === 'morning' ? '30 minutes from 7am through 9am' : '15 minutes from 17:00 through 18:00'} local time, Monday through Friday. To stop, use /stop`);
      }
    });
  }
});

// Run to stop notifications, using the timezone to lookup the correct chatId
// and remove from the database
bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  logCommand('stop', msg);

  db.all(`delete from ${userTable} where chatId=?`, chatId, (err) => {
    if (err) {
      bot.sendMessage(chatId, 'Uh oh, there was a database issue; contact the admin');
    } else {
      bot.sendMessage(chatId, 'Notifications have been stopped, run /init to start them again');
    }
  });
});

// The /traffic command allows the user to request the their time to home status
// on demand rather than wait for the cron job to come around.
bot.onText(/\/traffic/, (msg) => {
  const chatId = msg.chat.id;
  logCommand('traffic', msg);

  db.all(`select * from ${userTable} where chatId=?`, chatId, (err, rows) => rows.forEach(runScraper));
});

cronJobFactory('Europe/London', 'morning');
cronJobFactory('Europe/London', 'night');
