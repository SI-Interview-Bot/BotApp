'''
Slack Bot used to post information about interviews to our channel.
'''

# Standard imports
import os

from http import client
#from aiohttp import Payload, payload_type

# Non-standard imports

import slack_sdk
from flask import Flask, request, Response
from dotenv import load_dotenv  
from pathlib import Path
from slackeventsapi import SlackEventAdapter

#Establish some global variables. Maybe establish a predefined object with all this stuff?
env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path)

DEBUG_STATUS = True

WORKING_CHANNEL = '#interviewbot-test'

app = Flask(__name__)

slack_event_adapter = SlackEventAdapter(os.environ['SIGNING_SECRET'],'/slack/events', app)
client = slack_sdk.WebClient(token=os.environ['SLACK_TOKEN'])

BOT_ID = client.api_call("auth.test")['user_id']
#client.chat_postMessage(channel='#interviewbot-test', text="Hello World!")

# The mini database will be ordered as such:
# MessageID : {checkmark_responses: [list_of_user_names], x_responses: [list_of_user_names]}
interview_messages = {}

# class with welcome message and storage information.
# to be edited to store messages and reactions, but used for testing for now
class InterviewMessage:
    START_TEXT = {
        'type': 'section',
        'text' : {
            'type': 'mrkdwn',
            'text': (
                'This is a test of reactions'
            )
        }
    }

    DIVIDER = {'type': 'divider'}

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
            'blocks': [
                self.START_TEXT,
                self.DIVIDER,
                 self._get_reaction_task
            ]
        }

    def _get_reaction_task(self):

        text = f'*React to this message!*'

        return [{'type': 'section', 'text': {'type': 'mrkdwn', 'text': text}}]



# Functions belwo are designed for different /commands.
@app.route('/message-count', methods=['POST'])
def message_count():
    return Response(), 200

@app.route('/test-message-builder', methods=['POST'])
def TMB():
    return Response(), 200

@app.route('/test', methods=['POST'])
def test():
    data = request.form
    user_id = data.get('user_id')
    channel_id = data.get('channel_id')
    #print(data)

    interview = InterviewMessage(channel_id, user_id)
    print(f'channel_ID: {channel_id}. user_id: {user_id}')
    
    return Response(), 200

# Functions below are designed for different slack events, and handle those events.
@slack_event_adapter.on('message')
def message(payLoad) -> None:
    event = payLoad.get('event', {})
    channel_id = event.get('channel')
    user_id = event.get('user')
    text = event.get('text')

    print(payLoad)


@slack_event_adapter.on('reaction_removed')
def removed_reaction(payLoad) -> None:
    event = payLoad.get('event', {})
    channel_id = event.get('item', {}).get('channel')
    user_id = event.get('user')
    reaction = payLoad.get('event').get('reaction')

    if reaction != 'white_check_mark' or 'x':
        return
    
    print('removed useless string, ignore')
    print(payLoad)

    return 


@slack_event_adapter.on('reaction_added')
def reaction(payLoad) -> None:
    event = payLoad.get('event', {})
    channel_id = event.get('item', {}).get('channel')
    user_id = event.get('user')
    reaction = payLoad.get('event').get('reaction')
    item_user = payLoad.get('user_id')

    #if reaction == 'white_check_mark':
        #client.chat_postMessage(channel='#interviewbot-test', text=f"<@{user_id}> reacted witha check!")
    #elif reaction == 'x':
        #client.chat_postMessage(channel='#interviewbot-test', text=f"{user_id} reacted with an x")
    #else:
        #client.chat_postMessage(channel='#interviewbot-test', text=f"{user_id} reacted with  useless emoji")
    
    if item_user != BOT_ID:
        print(f"NOT THE BOT. BOT IS {BOT_ID}. item_user is: {item_user} \n")
    else:
        print("IS THE BOT")
    print(payLoad)

    return

#main function that runs everything. 
if __name__ == "__main__":

    app.run(debug=DEBUG_STATUS, port=8088)
