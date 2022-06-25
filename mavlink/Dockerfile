FROM python:alpine

WORKDIR /app

COPY requirements.txt ./

RUN DISABLE_MAVNATIVE=True pip install -r requirements.txt

COPY mavlinkserver.py ./

EXPOSE 4000
ENV SERIAL_PATH=/dev/ttyUSB0
ENV SERIAL_BAUD=57600
ENV FLASK_APP=mavlinkserver
CMD python -m flask run --host=0.0.0.0 --port 4000
