'''
Slack Bot used to post information about interviews to our channel.
'''

# Standard imports
import os

import string
import json

# Non-standard imports
import slack_sdk
from flask import Flask, request, Response
#from flask_script import Manager

# Need this import to do actions after loading app, running into errors...
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
RECEIVE_JIRA_JSON = "receive-JIRA-JSON"

app = Flask(__name__)

slack_event_adapter = SlackEventAdapter(os.environ['SIGNING_SECRET'], '/slack/events', app)
client = slack_sdk.WebClient(token=os.environ['SLACK_TOKEN'])

BOT_ID = client.api_call('auth.test')['user_id']

interview_messages = {}
JSON_FILE = 'db.json'
###########################################################################################
#                                   CLASSES                                               #
###########################################################################################
class InterviewInformation:
    message = {
        'type': 'section',
        'text' : {
            'type': 'mrkdwn',
            'text': (
                'subject to change? could use markdown to edit messages to ensure there are enough interviewers for certain meetings. '
            )
        }
    }

    DIVIDER = {'type': 'divider'}

    def __init__(self, interview_data: dict):
        self._timestamp = None
        self._interviewData = interview_data
        self.completed = False
        self._interviewer = []

    #if we store the bots information as markdown we can edit it later, could be useful to say who is going to do that meeting and who is not, and whether enough people have said they are going to parttake in it
    def create_and_send(self) -> bool:
        success_status = True
        error_string = ''
        if self._interviewData['interviewType'] == '' or None:
            error_string += 'Missing interviewType information. '
            success_status = False
        if self._interviewData['dateTime'] == '' or None:
            error_string += 'Missing dateTime information. '
            success_status = False
        if self._interviewData['JIRATicketNumber'] == '' or None:
            error_string += 'Missing JIRATicketNumber information. '
            success_status = False
        if self._interviewData['name'] == '' or None:
            error_string += 'Missing name information. '
            success_status = False
        
        if success_status:
            message_to_send = f'{self._interviewData["JIRATicketNumber"]} : {self._interviewData["interviewType"]} {self._interviewData["name"]} at {self._interviewData["dateTime"]}'
            data = client.chat_postMessage(channel='#interviewbot-test', text=message_to_send)
            self._timestamp = data['ts']
        else:
            print(f"something went wrong, here are the errors: {error_string}")

        return success_status

    def add_interviewer(self, interviewer: string) -> bool:
        if interviewer not in self._interviewers:
            self._interviewers.append(interviewer)
            return True
        
        return False

    def remove_interviewer(self, interviewer: string) -> bool:
        if interviewer in self._interviewers:
            self._interviewers.remove(interviewer)
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

@app.route(f'/{RECEIVE_JIRA_JSON}', methods=['POST'])
def receive_data() -> bool:
    incoming_data = request.get_data()
    json_object = json.loads(incoming_data)

    print("[+] {ret_json_object}\n")
    interview = InterviewInformation(json_object)
    if interview.create_and_send():
        interview_messages[interview.get_timestamp()] = interview
        store_json_from_dictionary()
    else:
        print(f'unable to send proper interview message')
    return True

def load_dictionary_from_json() -> bool:
    if (os.path.exists(f'./{JSON_FILE}')):
        print(f'Found {JSON_FILE} in local directory. loading to dictionary now...')
        interview_messages = json.load(f'./{JSON_FILE}')
        # Need to make sure slack bot hasn't altered from directory, need to go through
        # Messages to verifngroy. 
        return True
        
    print(f'Unable to find {JSON_FILE}. Starting with empty database...')
    return False

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
def message(payLoad):
    event = payLoad.get('event', {})
    channel_id = event.get('channel')
    user_id = event.get('user')
    text = event.get('text')

    print('message recieved!')



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
    print("REMOVED REACTTION!")
    # This statement checks for either white check mark or x, and returns if it is neither
    if reaction != 'white_check_mark' or 'x':
        return


    return 

@slack_event_adapter.on('reaction_added')
def reaction(payLoad) -> None:

    print("Saw that reaction was added\n")
    print(payLoad)

    
    return

#main function that runs everything. 
if __name__ == "__main__":
    #load_dictionary_from_json()
    print("About to run the app")
    app.run(debug=DEBUG_STATUS, port=8088)
