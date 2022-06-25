#!/usr/bin/env python3

import os, threading, copy

from pymap3d.ned import geodetic2ned

import pymavlink.mavutil

from flask import Flask, jsonify, request

app = Flask(__name__)

class MAVLinkComm():
    def __init__(self):
        self.master = pymavlink.mavutil.mavlink_connection(os.environ['SERIAL_PATH'],baud=int(os.environ['SERIAL_BAUD']))
    
    def get_flightplan(self,target_system,target_component):
        flightplan = []

        self.master.mav.mission_request_list_send(
            target_system,target_component
        )

        msg = self.master.recv_match("MISSION_COUNT")
        num_items = msg.count

        for i in range(num_items):
            while True:
                self.master.mav.mission_request_int_send(
                    target_system,target_component,
                    i
                )

                msg = self.master.recv_match("MISSION_ITEM_INT",timeout=2)
                if msg != None:
                    break
            
            # TODO: handle MAV_CMD_NAV_LOITER_UNLIM, MAV_CMD_NAV_LOITER_TURNS, MAV_CMD_NAV_LOITER_TIME etc.
            if msg.command == 16:
                flightplan.append({
                    "index": i,
                    "latitude": msg.x,
                    "longitude": msg.y,
                    "altitude": msg.z,   # TODO: handle altitude modes
                })
        
        return flightplan

mlcomm = MAVLinkComm()

@app.route("/get_flightplan")
def get_flightplan():
    system_id = int(request.args.get('sysid'))
    component_id = int(request.args.get('compid'))

    return jsonify(
        mlcomm.get_flightplan(system_id,component_id)
    )
