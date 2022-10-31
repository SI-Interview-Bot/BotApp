'''
Slack Bot used to post information about interviews to our channel.
'''

# Standard imports
import os

from http import client

# Non-standard imports
import slack

from flask import Flask, request, Response
from slackeventsapi import SlackEventAdapter

#Establish some global variables. Maybe establish a predefined object with all this stuff?
DEBUG_STATUS = True

WORKING_CHANNEL = '#interviewbot-test'

app = Flask(__name__)
slack_event_adapter = SlackEventAdapter(os.environ['SIGNING_SECRET'],'/slack/events', app)

client = slack.WebClient(token=os.environ['SLACK_TOKEN'])
BOT_ID = client.api_call("auth.test")['user_id']
#client.chat_postMessage(channel='#interviewbot-test', text="Hello World!")

# class with welcome message and storage information.
# to be edited to store messages and reactions, but used for testing for now
class WelcomeMessage:
    START_TEXT = {
        'type': 'section',
        'text' : {
            'type': 'mrkdwn',
            'text': (
                'This is a test of reactions'
            )
        }
    }

    DVIDER = {'type': 'divider'}

    def __init__(self, channel, user):
        self.channel = channel
        self.user = user
        self.icon_emoji = ':robot_face:'
        self.timestamp = ''
        self.completed = False

    def get_message(self):
        return {
            'ts': self.timestamp,
            'channel': self.channel,
            'username': 'testtest',
            'icon_emoji': self.icon_emoji,
            'blocks': []
        }

    def _get_reaction_task(self):
        checkmark = ':white_check_mark:'
        if not self.completed:
            checkmark = ':white_large_square:'

        text = f'{checkmark} *React to this message!*'

        return [{'type': 'sectoin', 'text': {'type': 'mrkdwn', 'text': text}}]

# The mini database will be ordered as such:
# MessageID : {checkmark_responses: [list_of_user_names], x_responses: [list_of_user_names]}
mini_database = {}

# Functions belwo are designed for different /commands.
@app.route('/message-count', methods=['POST'])
def message_count():
    return Response(), 200

@app.route('/test-message-builder', methods=['POST'])
def TMB():
    return

@app.route('/test', methods=['POST'])
def test():
    data = request.form
    user_id = data.get('user_id')
    channel_id = data.get('channel_id')
    print(data)
    
    return Response(), 200

# Functions below are designed for different slack events, and handle those events.
@slack_event_adapter.on('message')
def message(payLoad) -> None:
    event = payLoad.get('event', {})
    channel_id = event.get('channel')
    user_id = event.get('user')
    text = event.get('text')

    print("this is the payload", payLoad)

@slack_event_adapter.on('reaction_added')
def reaction(payLoad) -> None:
    event = payLoad.get('event', {})
    channel_id = event.get('item', {}).get('channel')
    user_id = event.get('user')

    print(payLoad)

#main function that runs everything. 
if __name__ == "__main__":

    app.run(debug=DEBUG_STATUS, port=8088)
