'''
Saves interview data, in JSON format from the Flask server on Orion.
'''

# Standard imports
import json

from sys import stdout

# Non-standard imports
from flask import Flask, request

RECEIVE_JIRA_JSON = "receive-JIRA-JSON"
ISSUE_UPDATE = "issue-update"

app = Flask(__name__)

def receive_data() -> dict:
    incoming_data = request.get_data()
    return json.loads(incoming_data)

@app.route(f'/{RECEIVE_JIRA_JSON}', methods=['POST'])
def receive_JIRA_JSON():
    '''
    receive_JIRA_JSON - Saves a JSON Object from an HTTP POST request into a local database.
    IN:  HTTP POST    - Handled by Flask
    OUT:              - None
    '''
    stdout.write(f"[+] Received /{RECEIVE_JIRA_JSON} POST.\n")
    # Get JSON Object from HTTP POST request
    incoming_json_object = receive_data()
    stdout.write(f"{incoming_json_object}\n")

    # Connect database

    # Save JSON Object into database

    # Close database

    return f"200 OK\nJIRA JSON Saved into database.\n"
