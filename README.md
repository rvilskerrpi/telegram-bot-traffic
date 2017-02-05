# telegram-bot-traffic
A telegram bot that lets you know your journey home time when you're about to leave work or home

##Install
1. Use the [Bot Father](https://core.telegram.org/bots#6-botfather) to create your bot and obtain an API token
2. Place the aforementioned API token into a `.env` file following the structure of `.env-sample`
3. Copy `db-sample.json` to `db.json`
4. Start the bot with `node bot.js`
5. Initiate a chat with your bot in telegram, done by going to `https://telegram.me/<YOUR BOT NAME>`

###Actions
####`/init <GOOGLE MAPS DIRECTIONS URL> <TIMEZONE> <TYPE (night or morning)>`
Initialise the bot. You'll then get messages with your journey time every 15 minutes from `17:00` till `18:00` for `type=night`, or every 30 minutes from `07:00` till `09:00` for `type=morning`. Both run Monday to Friday *(Future plans to make this customisable)*.

####`/stop`
Stops any notifications for the current chat

####`/traffic`
Runs any traffic notifications initialised in the current chat
