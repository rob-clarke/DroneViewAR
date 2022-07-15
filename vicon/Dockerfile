FROM python:alpine

WORKDIR /app

COPY requirements.txt ./

RUN pip install -r requirements.txt

COPY viconserver.py viconudp.py ./

EXPOSE 3000
ENV VICON_BIND_IP=0.0.0.0
ENV VICON_PORT=51001
ENV FLASK_APP=viconserver
ENV PYTHONUNBUFFERED=1
CMD python -m flask run --host=0.0.0.0 --port 3000
