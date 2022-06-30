import {makeEl} from './Utils.js';

export class Mission {
    constructor(scene, points, color="#ffffff") {
        const pointStrs = points.map(p => [p.x,p.y,p.z].join(', '));
        const pathStr = `path: ${pointStrs.join(', ')}; color: ${color};`;
        this.el = makeEl('a-entity',{path: pathStr, shader: "flat"});
        scene.appendChild(this.el);
    }

    updateColor(color) {
        this.el.path.color = color;
    }

    setVisible(visible) {
        this.el.object3D.visible = visible;
    }

}
