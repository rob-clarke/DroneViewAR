// Add camera-coord component
AFRAME.registerComponent('camera-coord', {
    init: function() {},
    tick: function() {
        const camera = this.el.sceneEl.camera;
        let worldPosition = new THREE.Vector3();
        const projection = this.el.object3D.getWorldPosition(worldPosition);
        worldPosition.project(camera);
        this.el.emit('camera-coord', projection);
    },
});
