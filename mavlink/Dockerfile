FROM python:3.10-alpine

WORKDIR /app

COPY requirements.txt ./

RUN DISABLE_MAVNATIVE=True pip install -r requirements.txt

COPY mavlinkserver.py mavconn.py ./

EXPOSE 4000
ENV MAVLINK_URL=serial:///dev/ttyACM0:57600/?ids=200,50
ENV FLASK_APP=mavlinkserver
CMD python -m flask run --host=0.0.0.0 --port 4000
