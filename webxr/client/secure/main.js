import './primitives/DroneMarker.js';
import './primitives/DronePointer.js';
import './primitives/UserFacingPlane.js';
import './primitives/Spinner.js';

import './components/path.js';

import { io } from "npm:socket.io-client";

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
    const scene = makeEl('a-scene',{
        webxr: "optionalFeatures: hit-test",
        light: "defaultLightsEnabled: false",
    },[sky]);
    return scene;
}

function makeText(content,position,scale="1 1",align="center") {
    const el = document.createElement('a-text');
    el.setAttribute('position',position);
    el.setAttribute('scale',scale);
    el.setAttribute('align',align);
    el.setAttribute('value',content);
    el.setAttribute('font',"./assets/Roboto-msdf.json");
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

let in_augmented_reality = false;
scene.addEventListener('enter-vr',() => {
    setTimeout(() => {
        camera.setAttribute('camera','active',true);
        in_augmented_reality = true;
    }, 100);
});

document.body.appendChild(scene);

import Aligner from './modules/Aligner.js';
const aligner = new Aligner();
let spinnerRemoved = false;
let frameSet = false;
let socket = io();
socket.on("external-position",(message) => {
    if( !in_augmented_reality ) { 
        return;
    }    
    
    // We assume gravity is aligned so use x,z for internal coords to allow for 2D fitting problem
    let {x,y,z} = camera.getAttribute("position");
    
    socket.emit('positioning',{
        internal: {x,y,z},
        external: {x: message.x, y: message.y, z: message.z},
        alignment: aligner.phase,
    });

    if( aligner.phase <= aligner.AlignmentPhases.ALIGNING ) {
        // Inject more coordinates
        aligner.insertPositions([x,z],[message.x,message.y]);
        const alignerText = aligner.update();
        progressText.setAttribute("value", alignerText);
        return;
    }
        
    if( frameSet ) {
        return;
    }
    
    if( !spinnerRemoved ) {
        camera.removeChild(progressText);
        camera.removeChild(spinner);
        spinnerRemoved = true;
    }
    let [ox,oz] = aligner.translation.toArray();
    mavFrame.object3D.position.set(ox,0,oz);
    mavFrame.setAttribute('rotation',`90 0 ${aligner.yaw/Math.PI*180}`);
    frameSet = true;
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
import Aligner from './modules/Aligner.js';

let liveDrones = {};
socket.on('drone-position',(msg) => {
    if( ! liveDrones.hasOwnProperty(msg.id) ) {
        liveDrones[msg.id] = new Drone(mavFrame);
    }
    liveDrones[msg.id].updatePosition({
        x: msg.data.position[0],
        y: msg.data.position[1],
        z: msg.data.position[2],
    },
    {
        x: msg.data.velocity[0],
        y: msg.data.velocity[1],
        z: msg.data.velocity[2],
    });
});

const drones = [...Array(4).keys()].map(() => new Drone(mavFrame));
const dronePhases = [0, 0.5*Math.PI, Math.PI, 1.5*Math.PI];

let theta = 0;

const northMarker = new Drone(mavFrame);
setTimeout(() => northMarker.updatePosition({x:10, y:0, z:0}), 100);
northMarker.updateColor("#3333ff");

const originMarker = new Drone(mavFrame);
setTimeout(() => {
    originMarker.updatePosition({x:0, y:0, z:0});
    originMarker.updateColor("#ff33ff");
    originMarker.markerEl.setAttribute("geometry",{
        radiusOuter: 0.5,
        radiusInner: 0,
    });
}, 100);

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

const colours = [
    "#55ff55", // Solid Green
    "#fc9a44", // Solid Amber
    [[0,"#fc9a44"],[7,null],[8,"#fc9a44"],[9,null]], // Flashing Amber
    [[0,"#ff3333"],[5,"#3333ff"],[8,"#ff3333"],[9,"#3333ff"]], // Flashing Red/Blue
    [[0,"#ff3333"],[7,null],[8,"#ff3333"],[9,null]], // Flashing Red/Blue
];
let ticks = 10;
let tick = 0;
setInterval(function() {
    tick = (tick + 1) % ticks;
    for( const i in drones ) {
        const drone = drones[i];
        const colourPattern = colours[i];
        if(Array.isArray(colourPattern)) {
            let colour = null;
            for( let entry of colourPattern ) {
                if( entry[0] <= tick ) {
                    colour = entry[1];
                }
            }
            if( colour !== null ) {
                drone.setVisible(true);
                drone.updateColor(colour);
            }
            else {
                drone.setVisible(false);
            }
        }
        else {
            drone.updateColor(colourPattern);
        }
    }
},100);
