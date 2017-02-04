const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const exec = require('child_process').exec;
const databaseFilePath = './db.json';
const cron = require('cron').CronJob;
const platform = require('os').platform();
const fs = require('fs');

const logCommand = (command, message) => console.log(`-> Recieved /${command} from ${message.from.username || `${message.from.first_name} ${message.from.last_name}`} (${message.chat.id})`);
const log = message => console.log(`-> ${message}`);

// everyMinute can be used for debug
const every15Mins5To6MondayToFriday = '*/15 17,18 * * 1-5';
const everyMinute = '* * * * 0-6';

// Load the token into the environment
dotenv.load();

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

log('Bot initialised');

// /init is the command to initialise a traffic session. Takes a journeyUrl and
// a timezone to be used for cron
bot.onText(/\/init (.+)/, (msg, match) => {
  const db = require(databaseFilePath);
  const arguments = match[1].split(' ');
  const journeyUrl = arguments[0];
  const timezone = arguments[1];
  const chatId = msg.chat.id;

  if (!journeyUrl || !timezone) {
    return bot.sendMessage(chatId, 'Oops, you need to send both a journey url as the first argument and the timezone as the second');
  }

  logCommand('init', msg);

  // Check if the timezone is supported
  if (Object.keys(db).indexOf(timezone) !== -1) {
    // Add the chatId and the journeyUrl given to the database indexed by the
    // timezone
    db[timezone].push({
      chatId,
      journeyUrl,
    });
    // Rewrite the database
    fs.writeFileSync(databaseFilePath, JSON.stringify(db));
    bot.sendMessage(chatId, `Ok that's all setup; you'll get notifications about your journey time every 15 minutes from 16:45 through 17:45 local time, Monday through Friday. To stop, use /stop`);
  } else {
    // Support can be added by duplicating the cron job below for the timezone
    // you want and adding another index in the db.json file for the timezone
    // you want just like the default Europe/London
    bot.sendMessage(chatId, `Oops, ${timezone} isn't supported, you need to ask the bot admin to add support`);
  }
});

// Run to stop notifications, using the timezone to lookup the correct chatId
// and remove from the database
bot.onText(/\/stop (.+)/, (msg, match) => {
  const db = require(databaseFilePath);
  const timezone = match[1];
  const timezoneToRemoveFrom = db[timezone];
  const databaseWithChatRemoved = timezoneToRemoveFrom.filter(chat => chat.chatId !== msg.chat.id);

  if (!timezone) {
    return bot.sendMessage(msg.chat.id, 'You need to specify the timezone to remove you from: /stop <TIMEZONE>');
  }

  db[timezone] = databaseWithChatRemoved;

  logCommand('stop', msg);

  fs.writeFileSync(databaseFilePath, JSON.stringify(db));

  bot.sendMessage(msg.chat.id, `Notifications have been stopped, run /init to start them again`);
});

// Cron job for Europe/London
new cron(every15Mins5To6MondayToFriday, () => {
  const db = require(databaseFilePath);
  // Each chatId in the Europe/London index is run with its corresponding
  // journeyUrl and send out to the user
  db['Europe/London'].forEach((chat) => {
    // Run inside phantomjs to render the page and grab the journey time. Check
    // out get-journey-time.js for more on how the journey time is collected
    log(`Running scraper for ${chat.chatId}`);
    exec(`./phantomjs_${platform === 'darwin' ? 'mac' : 'linux'} get-journey-time.js ${chat.journeyUrl}`, (err, stdout) => {
      log(`Scraping complete for ${chat.chatId}; sending message`);
      bot.sendMessage(chat.chatId, `It should take you around ${stdout.replace(/(\n|\r|\r\n)/, '')} to get home`);
    });
  });
  delete db;
}, null, true, 'Europe/London');
