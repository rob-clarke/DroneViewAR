import { makeEl } from './Utils.js';
import '../components/extrapolated-position.js';
import '../components/camera-coord.js';

export class Drone {
    constructor(parent,position={x:0,y:0,z:0},colour="#ffffff") {
        this.shouldBeVisible = true;
        this.markerEl = makeEl('a-drone-marker',{
            position: `${position.x} ${position.y} ${position.z}`,
            colour,
            'extrapolated-position': `position: ${position.x} ${position.y} ${position.z}; velocity: 0 0 0`,
            'camera-coord': null,
        });
        parent.appendChild(this.markerEl);
        this.pointerEl = makeEl('a-drone-pointer',{
            position: '0 0.2 -3',
        });;
        this.markerEl.addEventListener('camera-coord',(e) => {
            function notinview(i) { return i < -1 || i > 1 };
            if( notinview(e.detail.x) || notinview(e.detail.y) || notinview(e.detail.z) ) {
                this.pointerEl.object3D.visible = this.shouldBeVisible;
            }
            else {
                this.pointerEl.object3D.visible = false;
            }
            let bearing = Math.atan2(e.detail.y, e.detail.x);
            if( e.detail.z > 1 ) {
                bearing = bearing + Math.PI;
            }
            this.pointerEl.object3D.position.x = 0.7*Math.cos(bearing);
            this.pointerEl.object3D.position.y = 0.7*Math.sin(bearing);
            this.pointerEl.object3D.rotation.z = bearing - 0.5*Math.PI;
        });
        document.getElementById("camera").appendChild(this.pointerEl);
    }

    displayMission() {
        this.missionPath = makePath(this.mission.points);
        this.markerEl.sceneEl.appendChild(this.missionPath);
    }

    updatePosition(position, velocity={x:0,y:0,z:0}) {
        this.markerEl.setAttribute('extrapolated-position',
            { position, velocity }
        );
        // this.markerEl.object3D.position.x = position.x;
        // this.markerEl.object3D.position.y = position.y;
        // this.markerEl.object3D.position.z = position.z;
    }

    updateColor(color) {
        this.markerEl.setAttribute('color', color);
        this.pointerEl.setAttribute('color', color);
    }

    setVisible(visible) {
        this.shouldBeVisible = visible;
        this.markerEl.object3D.visible = visible;
        this.pointerEl.object3D.visible = visible;
    }

}
