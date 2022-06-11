#!/usr/bin/env python3

import os, threading, copy

from serial import Serial
from pyubx2 import UBXReader

from flask import Flask, jsonify

app = Flask(__name__)

class GPSThread(threading.Thread):
    def run(self):
        stream = Serial(os.environ['SERIAL_PATH'],int(os.environ['SERIAL_BAUD']))
        ubr = UBXReader(stream,protfilter=2)

        for (_,parsed) in ubr:
            if parsed.identity == 'NAV-PVT':
                self.latest_position = {
                    "lon": parsed.lon,
                    "lat": parsed.lat,
                    "fix": parsed.fixType
                }

gpsThread = GPSThread()
gpsThread.start()

@app.route("/set_origin")
def set_origin():
    # Set the cartesian origin to the current position
    return jsonify({
        "success": False
        })

@app.route("/position")
def get_position():
    # Return the latest cartesian position
    return jsonify({
        "success": False
        })

@app.route("/gps")
def get_gps():
    # Return the latest GPS details (Cartesian origin, current LLH, fix)
    latest_position = copy.copy(gpsThread.latest_position)
    return jsonify(latest_position)
    # {
    #     "success": True
    #     })
