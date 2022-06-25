function pathToPoints(path) {
    const points = [];
    if(path.length % 3 !== 0) {
        throw Error("Invalid number of coordinates");
    }
    for(let i = 0; i < path.length; i += 3) {
        points.push(new THREE.Vector3(
            path[i+0],
            path[i+1],
            path[i+2]
        ));
    }
    return points;
}

AFRAME.registerComponent('path', {
    schema: {
        path: { type: 'array', default: []},
        color: { type: 'color', default: "#ffffff" },
        opacity: {type: 'number', default: 1},
        visible: {default: true}
    },
    
    init: function() {
        const points = pathToPoints(this.data.path);
        this.geometry = new THREE.BufferGeometry().setFromPoints( points );

        this.rendererSystem = this.el.sceneEl.systems.renderer;
        let material = this.material = new THREE.LineBasicMaterial({
            color: this.data.color,
            opacity: this.data.opacity,
            transparent: this.data.opacity < 1,
            visible: this.data.visible
        });

        this.rendererSystem.applyColorCorrection(material.color);
        this.line = new THREE.Line(this.geometry, this.material);
        this.el.setObject3D(this.attrName, this.line);    
    },

    update: function(oldData) {
        let geoNeedsUpdate = false;
        
        for( let i = 0; i < this.data.path.length; i++ ) {
            if( this.data.path[i] !== oldData.path?.[i] ) {
                geoNeedsUpdate = true;
                break;
            }
        }
    
        if (geoNeedsUpdate) {
            const points = pathToPoints(this.data.path);
            this.geometry = new THREE.BufferGeometry().setFromPoints( points );
            this.el.removeObject3D('line', this.line);
            this.line = new THREE.Line(this.geometry, this.material);
            this.el.setObject3D(this.attrName, this.line);
        }
    
        this.material.color.setStyle(this.data.color);
        this.rendererSystem.applyColorCorrection(this.material.color);
        this.material.opacity = this.data.opacity;
        this.material.transparent = this.data.opacity < 1;
        this.material.visible = this.data.visible;
      },
    
    remove: function () {
        this.el.removeObject3D('path', this.line);
    }
});


