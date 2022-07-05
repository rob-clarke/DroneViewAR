#!/usr/bin/env python3

import os, threading, copy

from pymap3d.ned import geodetic2ned

from serial import Serial
from pyubx2 import UBXReader, UBXMessage

from flask import Flask, request, jsonify

app = Flask(__name__)

class GPSThread(threading.Thread):
    def __init__(self):
        super().__init__()
        self.new_position = threading.Event()

    def run(self):
        self.stream = Serial(os.environ['SERIAL_PATH'],int(os.environ['SERIAL_BAUD']))
        ubr = UBXReader(self.stream, protfilter=2)

        for (_,parsed) in ubr:
            if not isinstance(parsed, UBXMessage):
                continue
            if parsed.identity == 'NAV-PVT':
                rtk = "None"
                if parsed.carrSoln == 1:
                    rtk = "FLOAT"
                if parsed.carrSoln == 2:
                    rtk = "FIXED"
                
                self.latest_position = {
                    "lon": parsed.lon,
                    "lat": parsed.lat,
                    "alt": parsed.height / 1000,
                    "fix": parsed.fixType,
                    "carrSoln": parsed.carrSoln,
                    "RTK": rtk,
                }
                self.new_position.set()
    
    def inject_rtcm(self, rtcm_bytes):
        self.stream.write(rtcm_bytes)

gpsThread = GPSThread()
gpsThread.start()

origin = {
    "lat": None,
    "lon": None,
    "alt": None
    }

@app.route("/set_origin")
def set_origin():
    # Set the cartesian origin to the current position
    latest_position = copy.copy(gpsThread.latest_position)
    if latest_position["fix"] < 2:
        return jsonify({
            "success": False,
            "message": "Current fix insufficient"
        })
    origin["lat"] = latest_position["lat"]
    origin["lon"] = latest_position["lon"]
    origin["alt"] = latest_position["alt"]
    return jsonify({
        "success": True,
        "lat": origin["lat"],
        "lon": origin["lon"],
        "alt": origin["alt"],
    })

@app.route("/position")
def get_position():
    # Return the latest cartesian position received after the request
    if origin["lat"] is None:
        return jsonify({
            "success": False,
            "message": "No origin set",
        })
    gpsThread.new_position.clear()
    gpsThread.new_position.wait()
    latest_position = copy.copy(gpsThread.latest_position)
    [x,y,z] = geodetic2ned(
        latest_position["lat"],latest_position["lon"],latest_position["alt"],
        origin["lat"], origin["lon"], origin["alt"]
        )
    return jsonify({
        "success": True,
        "x": x,
        "y": y,
        "z": z,
    })

@app.route("/gps")
def get_gps():
    # Return the latest GPS details (Cartesian origin, current LLH, fix)
    latest_position = copy.copy(gpsThread.latest_position)
    return jsonify({
        "success": True,
        "origin": {
            "lat": origin["lat"],
            "lon": origin["lon"],
            "alt": origin["alt"],
        },
        "current": latest_position,
    })

@app.route("/rtcm",methods=["POST"])
def post_rtcm():
    # Send RTCM data to the GPS unit
    data = request.get_data()
    gpsThread.inject_rtcm(data)
    return jsonify({"success": True})
