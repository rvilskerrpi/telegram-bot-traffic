# telegram-bot-journey-home
A telegram bot that lets you know your journey home time when you're about to leave work

##Install
1. Use the [Bot Father](https://core.telegram.org/bots#6-botfather) to create your bot and obtain an API token
2. Place the aforementioned API token into a `.env` file following the structure of `.env-sample`
3. Copy `db-sample.json` to `db.json`
4. Start the bot with `node bot.js`
5. Initiate a chat with your bot in telegram, done by going to `https://telegram.me/<YOUR BOT NAME>`
6. Type `/init <GOOGLE MAPS DIRECTIONS URL> <TIMEZONE>` to initialise the bot. You'll then get messages with your journey time every 15 minutes from `16:45` till `17:45` *(Future plans to make this customisable)*.
