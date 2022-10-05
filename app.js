const { App } = require("@slack/bolt");
const { WebClient } = require('@slack/web-api');
require("dotenv").config();

const web = new WebClient(process.env.BOT_TOKEN);

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

app.command("/test", async ({ command, ack, say }) => {
    try {
      await ack();
      say("Robot bot bot test...");
    } catch (error) {
        console.log("err")
      console.error(error);
    }
});

app.message(/hey/, async ({ command, say }) => {
    try {
      say("You said hey, hey is for horses...");
    } catch (error) {
        console.log("err")
      console.error(error);
    }
});

(async () => {
  const port = 3000
  // Start your app
  await app.start(process.env.PORT || port);
  console.log(`⚡️ Slack Bolt app is running on port ${port}!`);
})();
