# InterviewBot

_Development should be done with any modern distro of Linux._
_Support for Windows is not tested and should be done at your own risk._

InterviewBot is a simple Slack bot that provides REST endpoints to create,
update and delete appointments.  Appointments are posted as messages to a
Slack channel, where they are pinned and updated or removed as needed.
Reactions to the messages are tracked and can be queried, along with all
appointment data, via another REST endpoint.  Data is maintained in memory and
backed up to persistent storage for recovery.

The REST endpoints are designed to allow a candidate tracking system, such as
Jira, to push interview appointment data to the bot, such as via a Webhook
listener that filters issue updates down to a minimal set of information
needed for posting to Slack.  Periodic queries to this bot could also pass
back information such as users that have signed up for an interview via
reactions.

## Development Environment

All the required packages are tracked between node and yarn.

Make sure you have `node` and the node package manager (`npm`) installed:

__NOTE__: `node 16.17+` is required.

1. Install `node`
    - `sudo apt update`
    - `sudo apt install nodejs`
    - Windows (Orion workstation): Go to https://nodejs.org/en/download/ and
      download the Windows Binary (.zip) for your platform, which can be
      extracted to C:\Users\<username>\AppData\Local.  Add the resulting
      node-v... folder to your PATH.
2. Install `npm`:
    - `sudo apt install npm`
    - Windows: The installation of Node includes NPM.
3. Install `Bot Framework Emulator`:
    - Go to https://github.com/microsoft/BotFramework-Emulator/releases and
      download and install the latest release for your operating system.

Check the installation with `node -v`.

Next, install `yarn v1.22+`:
- `sudo npm install -g yarn`

Similarly, check the yarn version, `yarn -v`.

### Setting up the repo

Clone the repo to your local machine. `cd` to the directory where the
project was cloned and run the following commands:

- `sudo yarn install`
- `sudo npm install`

The above commands will install all the required dependencies for the
project.

The `app.js` will run as a refreshable background daemon that updates on changes.
To start it up, run the following (TODO: add a test script):

- `sudo yarn run dev`

You should see something like the following:

```
[nodemon] 2.0.20
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,mjs,json
[nodemon] starting `node app.js`
⚡️ Slack Bolt app is running on port 3000!
```

The bot is now up and running!

### Testing:

To test your bot you will need to redirect `localhost` to a forwarding url that
is visable to slack.  `ngrok` is a simple way to accomplish this.

- To install, run `snap install ngrok`.

- Once installed, visit ngrok.com, create an account, and go to Setup & Installation.
  From step 2, copy and paste the command to add your authorization token.
  It should look something like this:
  `ngrok config add-authtoken 2GfobMBf*&^785V876b887n87^*%%^%^bfg8b66UYJYYF^67`

The bot is hosted on port `3000` by default. To start the session, simply run the following:
- In a new terminal window run, `ngrok http 3000`

You should see the following
```
Session Status                online                                           
Session Expires               1 hour, 58 minutes                               
Terms of Service              https://ngrok.com/tos                            
Version                       3.1.0                                            
Region                        United States (us)                               
Latency                       168ms                                            
Web Interface                 http://127.0.0.1:4041                            
Forwarding                    https://fbb7-12-147-112-74.ngrok.io -> http://localhost:3000
                                                                               
Connections                   ttl     opn     rt1     rt5     p50     p90      
                              0       0       0.00    0.00    0.00    0.00  
```

The `Forwarding` address will need to be added to the slack workspace.

## Slack App Workspace

- Copy ngrok's forwarding address to your app settings in api.slack.com
  In your app's settings, go to Slash Commands. For every Slash Command
  update the Request URL with ngrok's forwarding address. The forwarding
  address will likely change with every new running instance of ngrok.
  Manually add `/slack/events` at the end of the forwarding address.

![image](https://user-images.githubusercontent.com/10299252/198033267-6c425cbe-5c2d-4d09-9865-a54c05f5accc.png)
![image](https://user-images.githubusercontent.com/10299252/198033466-d04708b7-1881-4231-ab37-72df2298ea1d.png)

- You must also update your app's Event Subscriptions

![image](https://user-images.githubusercontent.com/10299252/198040497-d8ba88aa-73ff-4e99-8fa7-7dbf102f68ed.png)
