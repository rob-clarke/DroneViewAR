import { makeEl } from './Utils.js';
import '../components/extrapolated-position.js';

export class Drone {
    constructor(parent,position={x:0,y:0,z:0},colour="#ffffff") {
        this.markerEl = makeEl('a-drone-marker',{
            position: `${position.x} ${position.y} ${position.z}`,
            colour,
            'extrapolated-position': `position: ${position.x} ${position.y} ${position.z}; velocity: 0 0 0`,
        });
        parent.appendChild(this.markerEl);
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
    }

    setVisible(visible) {
        this.markerEl.object3D.visible = visible;
    }

}
