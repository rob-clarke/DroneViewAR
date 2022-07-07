// Add look-at component
AFRAME.registerComponent('look-at', {
    schema: { type: 'selector' },
    init: function() {},
    tick: function() {
        const zRot = this.el.object3D.rotation.z;
        this.el.object3D.lookAt(this.data.object3D.position);
        this.el.object3D.rotation.z = zRot;
    },
});
