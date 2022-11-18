'''
Slack Bot used to post information about interviews to our channel.
'''

# Standard imports
import os

from http import client
import string
import json

# Non-standard imports
import slack_sdk
from flask import Flask, request, Response
#from flask_script import Manager

# Need this import to do actions after loading app, running into errors...
# From flask_script import Manager
from dotenv import load_dotenv  
from pathlib import Path
from slackeventsapi import SlackEventAdapter

###########################################################################################
#                                   GLOBALS                                               #
###########################################################################################
env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path)

DEBUG_STATUS = True

WORKING_CHANNEL = '#interviewbot-test'

app = Flask(__name__)
#manager = Manager(app)
JSON_FILE = 'db.json'

slack_event_adapter = SlackEventAdapter(os.environ['SIGNING_SECRET'],'/slack/events', app)
client = slack_sdk.WebClient(token=os.environ['SLACK_TOKEN'])

BOT_ID = client.api_call('auth.test')['user_id']

interview_messages = {}

###########################################################################################
#                                   CLASSES                                               #
###########################################################################################
class InterviewInformation:
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

    def __init__(self, interview_data: dict):
        self._timestamp = None
        self._interviewData = interview_data
        self.completed = False
        self._attendants = []

    #if we store the bots information as markdown we can edit it later, could be useful to say who is going to do that meeting and who is not, and whether enough people have said they are going to parttake in it
    def create_and_send(self) -> bool:
        success_status = True
        if self._interviewData['interviewType'] == '' or None:
            success_status = False
        if self._interviewData['dateTime'] == '' or None:
            success_status = False
        if self._interviewData['JIRATicketNumber'] == '' or None:
            success_status = False
        if self._interviewData['name'] == '' or None:
            success_status = False
        
        if success_status:
            message_to_send = f'{self._interviewData["JIRATicketNumber"]} : {self._interviewData["interviewType"]} {self._interviewData["name"]} at {self._interviewData["dateTime"]}'
            data = client.chat_postMessage(channel='#interviewbot-test', text=message_to_send)
            self._timestamp = data['ts']
        else:
            print("something went wrong, was unable to verify the input json for all the proper information.")

        return success_status

    def add_attendant(self, attendant: string) -> bool:
        if attendant not in self._attendants:
            self._attendants.append(attendant)
            return True
        
        return False

    def remove_attendat(self, attendant: string) -> bool:
        if attendant in self._attendants:
            self._attendants.remove(attendant)
            return True

        return False

    def get_timestamp(self) -> string:
        return self._timestamp

    def get_interviewdata(self) -> dict:
        return self._interviewData


###########################################################################################
#                                   FUNCTIONS                                             #
###########################################################################################
# Function needs to load the JSON file from 
@app.route('/{ISSUE_UPDATE}', methods=['POST'])
def load_interview_json() -> bool:
    incoming_dictionary = request.get_data()
    interview_data = json.loads(incoming_dictionary)

    return True

def load_dictionary_from_json() -> bool:
    dictionary_loaded = True
    if (os.path.exists(f'./{JSON_FILE}')):
        print(f'Found {JSON_FILE} in local directory. loading to dictionary now...')
        interview_messages = json.load(f'./{JSON_FILE}')
        # Need to make sure slack bot hasn't altered from directory, need to go through
        # Messages to verifngroy. 
    else:
        print(f'Unable to find {JSON_FILE}. Starting with empty database...')
    return dictionary_loaded

def store_json_from_dictionary() -> bool:
    with open(JSON_FILE, 'w'):
        json_object = json.dump(interview_messages, )
    json_object = json.dumps(interview_messages, JSON_FILE, indent = 4)
    return True


# Functions below are designed for different /commands.
@app.route('/test', methods=['POST'])
def test():
    data = request.form # This gets data of instance of message
    user_id = data.get('user_id') # This gets ther user_id
    channel_id = data.get('channel_id') # This gets the channel id
    ts = data.get('ts') # This gets the timestamp
    #print(data)

    someItem = client.chat_postMessage(channel='#interviewbot-test', text='test')

    print(f'\n\n someItem is equal to: {someItem} \n\n')


    print(f'channel_ID: {channel_id}. user_id: {user_id}')
    
    return Response(), 200

@app.route('/test_preloaded_json', methods=['POST'])
def test_read_preloaded_json():
    preloadedJSONFile = 'something.json'

    if os.path.exists(f'./{preloadedJSONFile}'):
        with open(preloadedJSONFile, 'r') as file:
            loaded_dict = json.load(file)
            interview = InterviewInformation(loaded_dict)
            if interview.create_and_send():
                interview_messages[interview.get_timestamp()] = interview
                store_json_from_dictionary()
            else:
                print(f'unable to send proper interview message')
    else:
        print(f'unable to load {preloadedJSONFile}.\n')


# Functions below are designed for different slack events, and handle those events.
@slack_event_adapter.on('message')
def message(payLoad) -> None:
    event = payLoad.get('event', {})
    channel_id = event.get('channel')
    user_id = event.get('user')
    text = event.get('text')



    if user_id == BOT_ID:
        print("Need to store items here so that I can store the bots information")
    else:
        print("Did not get the right user id")

    print(payLoad)


@slack_event_adapter.on('reaction_removed')
def removed_reaction(payLoad) -> None:
    event = payLoad.get('event', {})
    channel_id = event.get('item', {}).get('channel')
    user_id = event.get('user')
    reaction = payLoad.get('event').get('reaction')

    # This statement checks for either white check mark or x, and returns if it is neither
    if reaction != 'white_check_mark' or 'x':
        return

    # Need to implement a system that checks dictionary for discrepancies, fixes those discrepancies
    # and then moves on. 
    
    #print(payLoad)

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

    
    # After that is implemented, do a search of which message got a reaction and update the dictionary

    if item_user != BOT_ID:
        print(f"NOT THE BOT. BOT IS {BOT_ID}. item_user is: {item_user} \n")
    else:
        print("IS THE BOT")
    

    return

#main function that runs everything. 
if __name__ == "__main__":
    load_dictionary_from_json()
    app.run(debug=DEBUG_STATUS, port=8088)
