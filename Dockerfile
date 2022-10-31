FROM python:latest

COPY .env /
COPY bot.py /
COPY ./requirements.txt /requirements.txt

RUN pip install -r /requirements.txt

EXPOSE 8088

CMD [ "flask", "--app", "bot.py", "run", "-p", "8088", "--host=0.0.0.0"]
