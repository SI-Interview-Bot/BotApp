'''
Slack Bot used to post information about interviews to our channel.
'''

# Standard imports
import os
import json

from http import client
from sys  import stdout

# Non-standard imports
import slack

from dotenv         import load_dotenv
from flask          import Flask, request
from pathlib        import Path
from slackeventsapi import SlackEventAdapter

# REST API/End-points
RECEIVE_JIRA_JSON = "receive-JIRA-JSON"

app = Flask(__name__)

# Load environmental variables
env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path)

# Create a WebClient
slack_event_adapter = SlackEventAdapter(os.environ['SIGNING_SECRET'],'/slack/events', app)
client = slack.WebClient(token=os.environ['SLACK_TOKEN'])

BOT_ID = client.api_call("auth.test")['user_id']

@app.route(f'/{RECEIVE_JIRA_JSON}', methods=['POST'])
def receive_data() -> str:
    '''
    receive_data         - Takes a JSON Object from server.py and parses information to
                           build a message for our Slack channel.
    IN: HTTP POST        - Handled by Flask.
    OUT: ret_json_object - The JSON Object originally given.
    '''
    incoming_data = request.get_data()
    ret_json_object = json.loads(incoming_data)

    stdout.write(f"[+] {ret_json_object}\n")

    # TODO: Parse the JSON and format a message to send to Slack

    return f"{ret_json_object}\n"
