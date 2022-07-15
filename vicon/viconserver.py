#!/usr/bin/env python3

import os, threading, copy
import socket

from flask import Flask, request, jsonify

import viconudp

app = Flask(__name__)

UDP_IP = "127.0.0.1"
UDP_PORT = 5005

class ViconThread(threading.Thread):
    def __init__(self):
        super().__init__()
        self.new_position = threading.Event()
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.bind(
            (os.environ["VICON_BIND_IP"], int(os.environ["VICON_PORT"]))
        )
        self.latest_position = {
            "x": 0,
            "y": 0,
            "z": 0,
            }


    def run(self):
        while True:
            data, addr = self.socket.recvfrom(1024) # buffer size is 1024 bytes
            parsed = viconudp.UDPStreamPacket.parse(data)
            for item in parsed.Items:
                if item.Data.ItemName == "HoloLens":
                    self.latest_position = {
                        "x": item.Data.TransX / 1000,
                        "y": -item.Data.TransY / 1000,
                        "z": -item.Data.TransZ / 1000,
                        }
                    self.new_position.set()

viconThread = ViconThread()
viconThread.start()

@app.route("/set_origin")
def set_origin():
    # Set the cartesian origin to the current position
    return jsonify({
        "success": True,
        "lat": 0,
        "lon": 0,
        "alt": 0,
    })

@app.route("/position")
def get_position():
    # Return the latest cartesian position received after the request
    viconThread.new_position.clear()
    viconThread.new_position.wait()
    latest_position = copy.copy(viconThread.latest_position)
    return jsonify({
        "success": True,
        "x": latest_position["x"],
        "y": latest_position["y"],
        "z": latest_position["z"],
    })

@app.route("/gps")
def get_gps():
    # Return the latest GPS details (Cartesian origin, current LLH, fix)
    latest_position = copy.copy(viconThread.latest_position)
    return jsonify({
        "success": True,
        "origin": {
            "lat": 0,
            "lon": 0,
            "alt": 0,
        },
        "current": latest_position,
    })
