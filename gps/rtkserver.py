#!/usr/bin/env python3

import os, threading, copy
import time
import requests

from serial import Serial
from pyubx2 import UBXReader, UBXMessage
from pyrtcm import RTCMMessage

class GPSThread(threading.Thread):
    def __init__(self,stream):
        super().__init__()
        self.stream = stream
        self.callbacks = []
        self.survey_complete = False

    def run(self):
        ubr = UBXReader(self.stream, protfilter=2|4)

        for (raw,parsed) in ubr:
            if isinstance(parsed, UBXMessage):
                if parsed.identity == 'CFG-VALGET':
                    print(parsed)
                if parsed.identity == 'NAV-SVIN':
                    if parsed.active == 1:
                        self.survey_complete = False
                        print(f"Surveying... ({parsed.meanAcc/10000:5.3f}m)")
                    elif parsed.valid == 1 and not self.survey_complete:
                        self.survey_complete = True
                        print("Survey complete")
                if parsed.identity == 'ACK-ACK':
                    print(parsed)
            if isinstance(parsed, RTCMMessage):
                for callback in self.callbacks:
                    try:
                        callback(raw)
                    except Exception as e:
                        print(e)
                        pass

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

def set_autosurvey(stream,enabled,duration,accuracy):
    layers = 1
    transaction = 0
    mode = 1 if enabled else 0
    cfgData = [
        ("CFG_TMODE_MODE", mode),
        ("CFG_TMODE_SVIN_MIN_DUR", duration), # Write some other value here
        ("CFG_TMODE_SVIN_ACC_LIMIT", accuracy), # Write some other value here

    ]

    msg = UBXMessage.config_set(layers, transaction, cfgData)
    stream.write(msg.serialize())

def start_autosurvey(stream):
    """
    Start autosurvey process
    Most reliable way seems to be to configure survey with different time and
     accuracy
    """
    print("Starting autosurvey...")
    set_autosurvey(stream,True,0,0)

    time.sleep(2)
    set_autosurvey(stream,True,10,20_000)

def configure_rtkbase(stream):
    # setup_rtcm_output(stream)
    start_autosurvey(stream)

def send_to_endpoint(path,data):
    headers={'Content-Type': 'application/octet-stream'}
    requests.post(path,data=data,headers=headers)

def get_config_val(stream):
    layer = 0
    position = 0
    keys = [
        "CFG_TMODE_MODE",
        "CFG_TMODE_SVIN_MIN_DUR",
        "CFG_TMODE_SVIN_ACC_LIMIT",
    ]
    
    
    msg = UBXMessage.config_poll(layer,position,keys)
    stream.write(msg.serialize())

if __name__ == "__main__":
    stream = Serial(os.environ['SERIAL_PATH'],int(os.environ['SERIAL_BAUD']))
    gpsThread = GPSThread(stream)
    gpsThread.start()

    configure_rtkbase(stream)

    gpsThread.subscribe(
        lambda data: send_to_endpoint(os.environ['RTCM_ENDPOINT'], data)
    )
