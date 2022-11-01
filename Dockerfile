FROM python:latest

COPY .env /
COPY bot.py /
COPY ./requirements.txt /requirements.txt

RUN pip install -r /requirements.txt

EXPOSE 4444

CMD [ "flask", "--app", "bot.py", "run", "-p", "4444", "--host=slack_bot"]
