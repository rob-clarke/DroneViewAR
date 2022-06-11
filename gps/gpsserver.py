#!/usr/bin/env python3

import pyubx2

from flask import Flask, jsonify

app = Flask(__name__)

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
    return jsonify({
        "success": False
        })
