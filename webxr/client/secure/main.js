import './primitives/DroneMarker.js';
import './primitives/UserFacingPlane.js';
import './primitives/Spinner.js';

import './components/path.js';

import { io } from "npm:socket.io-client";

import CoordinateTracker from "./scripts/CoordinateTracker.js";

let tracker = new CoordinateTracker();

function makeEl(tagName,attributes={},children=[]) {
    const el = document.createElement(tagName);
    for(let attribute of Object.keys(attributes)) {
        el.setAttribute(attribute,attributes[attribute]);
    }
    for(let child of children) {
        el.appendChild(child);
    }
    return el;
}

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

function makeDroneMarker(position={x:0,y:10,z:-20}) {
    return makeEl('a-drone-marker',{
        position: `${position.x} ${position.y} ${position.z}`,
        color: "#55ff55",
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

const droneMarker = makeDroneMarker();
scene.appendChild(droneMarker);

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

const path = makePath(pathPoints);
scene.appendChild(path);

let theta = 0;
setInterval(function() {
    theta += 0.0025;
    const rad = 20;
    const x = rad * Math.sin(theta);
    const z = rad * Math.cos(theta);
    droneMarker.object3D.position.x = x;
    droneMarker.object3D.position.y = 10;
    droneMarker.object3D.position.z = z;
},25);

// setInterval(() => {
//     console.log(tracker);
// },1000);

// Display compass marker when aligned with GPS.
class CompassDisplay {
    // Circle at waist height with ticks
    //  Attached to user position
}


class Drone {
    constructor(scene,colour) {
        this.scene = scene;
        this.colour = colour;
    }

    displayMission() {
        this.missionPath = makePath(this.mission.points);
        this.scene.appendChild(this.missionPath);
    }

    displayMarker() {
        this.marker = makeDroneMarker();
        this.scene.appendChild(this.marker);
    }

    updatePosition(position) {
        this.marker.object3D.position.x = position.x;
        this.marker.object3D.position.y = position.y;
        this.marker.object3D.position.z = position.z;
    }
}