FROM python:alpine

WORKDIR /app

COPY requirements.txt ./

RUN pip install -r requirements.txt

COPY gpsserver.py rtkserver.py ./

EXPOSE 3000
ENV SERIAL_PATH=/dev/ttyAMA0
ENV SERIAL_BAUD=115200
ENV FLASK_APP=gpsserver
ENV PYTHONUNBUFFERED=1
CMD python -m flask run --host=0.0.0.0 --port 3000
