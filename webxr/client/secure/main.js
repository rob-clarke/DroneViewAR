import './primitives/DroneMarker.js';
import './primitives/UserFacingPlane.js';
import './primitives/Spinner.js';

import './components/path.js';

import { io } from "npm:socket.io-client";

import CoordinateTracker from "./modules/CoordinateTracker.js";

let tracker = new CoordinateTracker();

import { makeEl } from './modules/Utils.js';

function makeCamera() {
    return makeEl('a-entity',{
        camera:"",
        "look-controls":"",
        "wasd-controls":"",
        id: "camera",
    });
}

function makeScene() {
    const sky = makeEl('a-sky',{color: "#000000"});
    const camera = makeCamera();
    const scene = makeEl('a-scene',{
        webxr: "optionalFeatures: hit-test",
        light: "defaultLightsEnabled: false",
    },[sky,camera]);
    return scene;
}

function makeText(content,position,scale="1 1",align="center") {
    const el = document.createElement('a-text');
    el.setAttribute('position',position);
    el.setAttribute('scale',scale);
    el.setAttribute('align',align);
    el.setAttribute('value',content);
    return el;
}

function makeDroneMarker(position={x:0,y:10,z:-20}, color="#55ff55") {
    return makeEl('a-drone-marker',{
        position: `${position.x} ${position.y} ${position.z}`,
        color
    });
}

function makePath(points,color = "#ffffff") {
    const pointStrs = points.map(p => [p.x,p.y,p.z].join(', '));
    const pathStr = `path: ${pointStrs.join(', ')}; color: ${color};`;
    return makeEl('a-entity',{path: pathStr, shader: "flat"});
}


const scene = makeScene();
const camera = makeCamera();

const progressText = makeText("Aligning Coordinates\nMove around in the world\nPositions: 0","0 0 -3","0.5 0.5");
camera.appendChild(progressText);

const spinner = makeEl('a-spinner',{
    position: "0 0 -3",
    geometry:"radiusInner: 0.65; radiusOuter: 0.7;",
});
camera.appendChild(spinner);

scene.appendChild(camera);

scene.addEventListener('enter-vr',() => { camera.setAttribute('camera','active',true); });

document.body.appendChild(scene);

let socket = io();
socket.on("external-position",(message) => {
    
    let {x,y,z} = camera.getAttribute("position");
    tracker.updateInternalCoords(x,y,z,Date.now());
    
    let t = 0;
    ({x,y,z,t} = message);
    tracker.updateExternalCoords(x,y,z,t);
    progressText.setAttribute("value",`Aligning Coordinates\nMove around in the world\nPositions: ${tracker.obtained}`);
    if(tracker.obtained > 5) {
        tracker.updateTransformMatrix();
    }
});

const pathPoints = (() => {
    const facets = 15;
    const rad = 20;
    const theta_inc = 2*Math.PI/facets;
    return [...Array(facets+1).keys()].map((v) => {
        const theta = theta_inc * v;
        const x = rad * Math.sin(theta);
        const y = 10;
        const z = rad * Math.cos(theta);
        return {x,y,z};
    });
})();

import { Mission } from './modules/Mission.js';

const mission = new Mission(scene, pathPoints);

// Display compass marker when aligned with GPS.
class CompassDisplay {
    // Circle at waist height with ticks
    //  Attached to user position
}

import { Drone } from './modules/Drone.js';

const drones = [...Array(4).keys()].map(() => new Drone(scene));
const dronePhases = [0, 0.5*Math.PI, Math.PI, 1.5*Math.PI];

const colours = [
    ["#55ff55","#55ff55"], // Solid Green
    ["#fc9a44","#fc9a44"], // Solid Amber
    ["#fc9a44","#000000"], // Flashing Amber
    ["#ff3333","#000000"], //  Flashing Red
];

let theta = 0;

function getXZ(phase,theta) {
    const rad = 20;
    const x = rad * Math.sin(theta+phase);
    const z = rad * Math.cos(theta+phase);
    return [x,z];
}

setInterval(function() {
    theta += 0.0025;
    for( const i in drones ) {
        const drone = drones[i];
        const phase = dronePhases[i];
        const [x,z] = getXZ(phase,theta);
        drone.updatePosition({x, y: 10, z });
    }
},25);

let phase = true;
setInterval(function() {
    phase = !phase;
    for( const i in drones ) {
        const drone = drones[i];
        const colour = colours[i][phase ? 0 : 1];
        if( colour !== null ) {
            drone.setVisible(true);
            drone.updateColor(colour);
        }
        else {
            drone.setVisible(false);
        }
    }
},500);
