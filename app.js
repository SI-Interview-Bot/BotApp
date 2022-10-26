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

app.message(/get/, async ({ command, say }) => {
    try {
      say("Getting latest interview...");
      // Get latest interview from database
      // Format message to look similar to:
      // VR Intern PS CT-5566 Gwendolyn on Wednesday, 10/26 at 11:30am EDT (10:30am CDT for candidate) (Zoom)
      // say(`${positionType} ${jobType} ${interviewType} ${jiraTicket} ${firstName} on ${monTueWedThrFri}, ${month}/${day} at ${localMelbourneTime} EDT (${location})`)
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
