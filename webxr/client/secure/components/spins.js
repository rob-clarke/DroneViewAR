AFRAME.registerComponent('spins', {
    schema: { type: 'number' },
    init: function() {},
    tick: function() {
        this.el.object3D.rotation.z += this.data;
    },
});
