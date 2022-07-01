#!/usr/bin/env python3

import os, threading, copy
import urllib
import time

from serial import Serial
from pyubx2 import UBXReader, UBXMessage
from pyrtcm import RTCMMessage

class GPSThread(threading.Thread):
    def __init__(self,stream):
        super().__init__()
        self.stream = stream
        self.callbacks = []

    def run(self):
        ubr = UBXReader(self.stream, protfilter=2|4)

        for (raw,parsed) in ubr:
            if isinstance(parsed, RTCMMessage):
                for callback in self.callbacks:
                    try:
                        callback(raw)
                    except:
                        print("Removing dead callback")
                        self.callbacks.remove(callback)

    def subscribe(self,callback):
        print("New subscription")
        self.callbacks.append(callback)

def setup_rtcm_output(stream):
    layers = 1
    transaction = 0
    cfgData = [
        ("CFG_MSGOUT_RTCM_3X_TYPE1005_USB", 1),
        ("CFG_MSGOUT_RTCM_3X_TYPE1074_USB", 1),
        ("CFG_MSGOUT_RTCM_3X_TYPE1077_USB", 1),
        ("CFG_MSGOUT_RTCM_3X_TYPE1084_USB", 1),
        ("CFG_MSGOUT_RTCM_3X_TYPE1087_USB", 1),
        ("CFG_MSGOUT_RTCM_3X_TYPE1087_USB", 1),
        ("CFG_MSGOUT_RTCM_3X_TYPE1094_USB", 1),
        ("CFG_MSGOUT_RTCM_3X_TYPE1124_USB", 1),
        ("CFG_MSGOUT_RTCM_3X_TYPE1127_USB", 1),
        ("CFG_MSGOUT_RTCM_3X_TYPE1230_USB", 1),
        ("CFG_MSGOUT_RTCM_3X_TYPE4072_0_USB", 1),
        ("CFG_MSGOUT_RTCM_3X_TYPE4072_0_USB", 1),
    ]

    msg = UBXMessage.config_set(layers, transaction, cfgData)

    stream.write(msg.serialize())

def start_autosurvey(stream):
    layers = 1
    transaction = 0
    cfgData = [
        ("CFG_TMODE_MODE", 0), # Set mode survey in
    ]

    # Disable TMODE to force the start of a new survey
    msg = UBXMessage.config_set(layers, transaction, cfgData)
    stream.write(msg.serialize())

    time.sleep(1)

    cfgData = [
        ("CFG_TMODE_MODE", 1), # Set mode survey in
        ("CFG_TMODE_SVIN_MIN_DUR", 20), # Set min survey time 20s 
        ("CFG_TMODE_SVIN_ACC_LIMIT", 20_000), # Set survey accuracy 2m (20_000 dmm)
    ]

    msg = UBXMessage.config_set(layers, transaction, cfgData)
    stream.write(msg.serialize())

def configure_rtkbase(stream):
    setup_rtcm_output(stream)
    start_autosurvey(stream)

def send_to_endpoint(path,data):
    req = urllib.request.Request(
        path,
        data=data,
        headers={'Content-Type': 'application/octet-stream'}
    )
    urllib.urlopen(req)

if __name__ == "__main__":
    stream = Serial(os.environ['SERIAL_PATH'],int(os.environ['SERIAL_BAUD']))
    gpsThread = GPSThread(stream)
    gpsThread.start()

    configure_rtkbase(stream)

    gpsThread.subscribe(
        lambda data: send_to_endpoint(os.environ['RTCM_ENDPOINT'], data)
    )
