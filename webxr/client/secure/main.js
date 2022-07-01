import './primitives/DroneMarker.js';
import './primitives/UserFacingPlane.js';
import './primitives/Spinner.js';

import './components/path.js';

import { io } from "npm:socket.io-client";

import CoordinateTracker from "./modules/CoordinateTracker.js";

let transformTracker = new CoordinateTracker();

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

const scene = makeScene();
const camera = makeCamera();

const mavFrame = makeEl('a-entity',{
    position: "0 0 0",
    rotation: "90 0 0",
});

scene.appendChild(mavFrame);

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
    transformTracker.updateInternalCoords(x,y,z,Date.now());
    
    let t = 0;
    ({x,y,z,t} = message);
    transformTracker.updateExternalCoords(x,y,z,t);
    progressText.setAttribute("value",`Aligning Coordinates\nMove around in the world\nPositions: ${transformTracker.obtained}`);
    if(transformTracker.obtained > 5) {
        transformTracker.updateTransformMatrix();
    }
});

const pathPoints = (() => {
    const facets = 15;
    const rad = 20;
    const theta_inc = 2*Math.PI/facets;
    return [...Array(facets+1).keys()].map((v) => {
        const theta = theta_inc * v;
        const x = rad * Math.sin(theta);
        const y = rad * Math.cos(theta);
        const z = -10;
        return {x,y,z};
    });
})();

import { Mission } from './modules/Mission.js';

const mission = new Mission(mavFrame, pathPoints);

// Display compass marker when aligned with GPS.
class CompassDisplay {
    // Circle at waist height with ticks
    //  Attached to user position
}

import { Drone } from './modules/Drone.js';

const drones = [...Array(4).keys()].map(() => new Drone(mavFrame));
const dronePhases = [0, 0.5*Math.PI, Math.PI, 1.5*Math.PI];

const colours = [
    ["#55ff55","#55ff55"], // Solid Green
    ["#fc9a44","#fc9a44"], // Solid Amber
    ["#fc9a44","#000000"], // Flashing Amber
    ["#ff3333","#000000"], //  Flashing Red
];

let theta = 0;

function getXY(phase,theta) {
    const rad = 20;
    const x = rad * Math.sin(theta+phase);
    const y = rad * Math.cos(theta+phase);
    return [x,y];
}

setInterval(function() {
    theta += 0.0025;
    for( const i in drones ) {
        const drone = drones[i];
        const phase = dronePhases[i];
        const [x,y] = getXY(phase,theta);
        drone.updatePosition({x, y, z: -10 });
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
