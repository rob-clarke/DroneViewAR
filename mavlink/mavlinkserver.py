#!/usr/bin/env python3

import os, threading, time
from dataclasses import dataclass, field
from typing import List
import math

from pymap3d.ned import geodetic2ned

from pymavlink import mavutil
import mavconn

from flask import Flask, jsonify, request

app = Flask(__name__)


@dataclass
class Drone():
    battery: float = -1.0
    mode: str = "Unknown"
    position: List[float] = field(default_factory=lambda: [math.nan] * 3)
    colour: str = "Unknown"


class DroneMonitor(threading.Thread):
    def run(self):
        self.drones = {}
        self.matching = False
        self.last_heartbeat_time = time.time() - 10.0
        self.master = mavconn.get_mavlink_connection(os.environ['MAVLINK_URL'])

        while True:
            self.check_heartbeat()
            msg = self.recv()
            if msg is None:
                continue
            if not hasattr(msg,'name'):
                continue
            print(msg,flush=True)
            if msg.name == "HEARTBEAT":
                self.handle_heartbeat(msg)
            if msg.name == "SYS_STATUS":
                self.handle_status(msg)
            if msg.name == "GLOBAL_POSITION_INT":
                self.handle_position(msg)
            if msg.name == "PARAM_VALUE":
                self.handle_param(msg)

    @staticmethod
    def _get_drone_key(sys_id,comp_id):
        return "{}/{}".format(sys_id,comp_id)

    def _get_drone(self,msg):
        key = self._get_drone_key(msg.get_srcSystem(),msg.get_srcComponent())
        if key not in self.drones:
            self.drones[key] = Drone()
            self.master.mav.command_long_send(1,0,511,0, 1,1000000,0,0,0,0,0)
            self.master.mav.command_long_send(1,0,511,0,33, 500000,0,0,0,0,0)
        return self.drones[key]

    def handle_heartbeat(self,msg):
        drone = self._get_drone(msg)
        drone.mode = str(msg.base_mode)
    
    def handle_status(self,msg):
        drone = self._get_drone(msg)
        drone.battery = msg.voltage_battery

    def handle_position(self,msg):
        drone = self._get_drone(msg)
        drone.position = [msg.lat,msg.lon,msg.alt]

    def handle_param(self,msg):
        drone = self._get_drone(msg)
        if msg.param_id != "SCR_USER1":
            return
        colours = {
            1: "green",
            2: "amber",
            3: "red",
            4: "amber_flash",
            5: "red_flash",
        }
        drone.colour = colours[int(msg.param_value)]

    def check_heartbeat(self):
        if time.time() - self.last_heartbeat_time >= 1.0:
            self.master.mav.heartbeat_send(mavutil.mavlink.MAV_TYPE_ONBOARD_CONTROLLER, mavutil.mavlink.MAV_AUTOPILOT_INVALID,0,0,0)
            self.last_heartbeat_time = time.time()

    def recv(self,match=None):
        if match == None and self.matching == False:
            return self.master.recv_msg()
        else:
            self.matching = True
            result = self.master.recv_match(type=match)
            self.matching = False
            return result
    
    def get_flightplan(self,
        target_system: int, target_component: int,
        lat_0: float, long_0: float, alt_0: float
    ):
        flightplan = []

        while True:
            self.master.mav.mission_request_list_send(
                target_system,target_component
            )
            msg = self.recv("MISSION_COUNT")
            if msg != None:
                break
        num_items = msg.count

        for i in range(num_items):
            while True:
                self.master.mav.mission_request_int_send(
                    target_system,target_component,
                    i
                )

                msg = self.recv("MISSION_ITEM_INT")
                if msg != None:
                    break
            
            # TODO: handle MAV_CMD_NAV_LOITER_UNLIM, MAV_CMD_NAV_LOITER_TURNS, MAV_CMD_NAV_LOITER_TIME etc.
            # TODO: handle altitude modes
            if msg.command == mavutil.mavlink.MAV_CMD_NAV_WAYPOINT:
                [x,y,z] = geodetic2ned(
                    float(msg.x*1e-7), float(msg.y*1e-7), float(msg.z),
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
    
    lat_0 = float(request.args.get('lat_0'))
    long_0 = float(request.args.get('long_0'))
    alt_0 = float(request.args.get('alt_0'))

    return jsonify(
        dronemon.get_flightplan(system_id,component_id,lat_0,long_0,alt_0)
    )


@app.route("/drones")
def get_drones():
    return jsonify([ k for k in dronemon.drones.keys() ])

@app.route("/drone")
def get_drone():
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

@app.route("/drone_rel")
def get_drone_rel():
    system_id = int(request.args.get('sysid'))
    component_id = int(request.args.get('compid'))
    
    key = dronemon._get_drone_key(system_id,component_id)
    if key in dronemon.drones:
        drone = dronemon.drones[key]
        lat_0 = float(request.args.get('lat_0'))
        long_0 = float(request.args.get('long_0'))
        alt_0 = float(request.args.get('alt_0'))
        position = geodetic2ned(
                    float(drone.position[0]*1e-7), float(drone.position[1]*1e-7), float(drone.position[2]*1e-3),
                    lat_0, long_0, alt_0
                    )
        return jsonify({
            "battery": drone.battery,
            "mode": drone.mode,
            "position": position,
        })
    else:
        return jsonify(
            {}
        )
