FROM python:alpine

WORKDIR /app

COPY requirements.txt ./

RUN pip install -r requirements.txt

COPY gpsserver.py ./

EXPOSE 3000
ENV FLASK_APP=gpsserver
CMD python -m flask run --host=0.0.0.0 --port 3000
