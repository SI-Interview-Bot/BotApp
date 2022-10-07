# Interview Bot

_Development should be done with any modern distro of Linux._
_Support for Windows is not tested and should be done at your own risk._

Interview Bot is a simple slack bot that deals with (re?)scheduling appointments.
Jira webhooks are fed to a simple backend flask server. This bot then works in
liaison with slack users to manage the scheduling data.

## Workspace

TODO: Instructions for setting up a Slack workspace sandbox for development

## Development Environment

All the required packages are tracked between node and yarn.

Make sure you have `node` and the node package manager (`npm`) installed:

__NOTE__: `node 16.17+` is required.

1. Install `node`
    - `sudo apt update`
    - `sudo apt install nodejs`
2. Install `npm`:
    - `sudo apt install npm`

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
This will be covered in the [workspace](#workspace) section above.
