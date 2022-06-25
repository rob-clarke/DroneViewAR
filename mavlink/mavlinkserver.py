#!/usr/bin/env python3

import os, threading, time
from dataclasses import dataclass
from typing import List

from pymap3d.ned import geodetic2ned

from pymavlink import mavutil

from flask import Flask, jsonify, request

app = Flask(__name__)

@dataclass
class Drone():
    battery: float
    mode: str
    position: List[float]

class DroneMonitor(threading.Thread):
    def run(self):
        self.drones = {}
        self.matching = False
        self.last_heartbeat_time = time.time() - 10.0
        self.master = mavutil.mavlink_connection(os.environ['SERIAL_PATH'],baud=int(os.environ['SERIAL_BAUD']))

        while True:
            self.check_heartbeat()
            msg = self.recv()
            if msg is None:
                continue
            if not hasattr(msg,'name'):
                continue
            if msg.name == "HEARTBEAT":
                self.handle_heartbeat(msg)
            if msg.name == "SYS_STATUS":
                self.handle_status(msg)
            if msg.name == "LOCAL_POSITION_NED":
                self.handle_position(msg)

    @staticmethod
    def _get_drone_key(sys_id,comp_id):
        return "{}/{}".format(sys_id,comp_id)

    def _get_drone(self,msg):
        key = self._get_drone_key(msg.system_id,msg.component_id)
        if key not in self.drones:
            self.drones[key] = Drone()
        return self.drones[key]

    def handle_heartbeat(self,msg):
        drone = self._get_drone(msg)
        drone.mode = str(msg.base_mode)
    
    def handle_status(self,msg):
        drone = self._get_drone(msg)
        drone.battery = msg.voltage_battery

    def handle_position(self,msg):
        drone = self._get_drone(msg)
        drone.position = [msg.x,msg.y,msg.z]

    def check_heartbeat(self):
        if time.time() - self.last_heartbeat_time >= 1.0:
            self.master.mav.heartbeat_send(mavutil.mavlink.MAV_TYPE_ONBOARD_CONTROLLER, mavutil.mavlink.MAV_AUTOPILOT_INVALID,0,0,0)
            self.last_heartbeat_time = time.time()
            
    def recv(self,match=None):
        if match == None and self.matching == False:
            return self.master.recv_msg()
        else:
            self.matching = True
            result = self.master.recv_match(match)
            self.matching = False
            return result
    
    def get_flightplan(self,target_system,target_component,lat_0,long_0,alt_0):
        flightplan = []

        self.master.mav.mission_request_list_send(
            target_system,target_component
        )

        msg = self.master.recv("MISSION_COUNT")
        num_items = msg.count

        for i in range(num_items):
            while True:
                self.master.mav.mission_request_int_send(
                    target_system,target_component,
                    i
                )

                msg = self.master.recv("MISSION_ITEM_INT",timeout=2)
                if msg != None:
                    break
            
            # TODO: handle MAV_CMD_NAV_LOITER_UNLIM, MAV_CMD_NAV_LOITER_TURNS, MAV_CMD_NAV_LOITER_TIME etc.
            # TODO: handle altitude modes
            if msg.command == mavutil.mavlink.MAV_CMD_NAV_WAYPOINT:
                [x,y,z] = geodetic2ned(
                   msg.x, msg.y, msg.z,
                    lat_0, long_0, alt_0
                    )
                flightplan.append({
                    "index": i,
                    "x": x,
                    "y": y,
                    "z": z,
                })
        
        return flightplan

dronemon = DroneMonitor()
dronemon.start()

@app.route("/get_flightplan")
def get_flightplan():
    system_id = int(request.args.get('sysid'))
    component_id = int(request.args.get('compid'))
    
    lat_0 = int(request.args.get('lat_0'))
    long_0 = int(request.args.get('long_0'))
    alt_0 = int(request.args.get('alt_0'))

    return jsonify(
        dronemon.get_flightplan(system_id,component_id,lat_0,long_0,alt_0)
    )


@app.route("/get_drone")
def get_battery():
    system_id = int(request.args.get('sysid'))
    component_id = int(request.args.get('compid'))
    
    key = dronemon._get_drone_key(system_id,component_id)
    if key in dronemon.drones:
        drone = dronemon.drones[key]
        return jsonify({
            "battery": drone.battery,
            "mode": drone.mode,
            "position": drone.position,
        })
    else:
        return jsonify(
            {}
        )
