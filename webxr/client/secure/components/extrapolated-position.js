// Add position component that is extrapolated with a velocity
AFRAME.registerComponent('extrapolated-position', {
    schema: {
        position: { type: 'vec3' },
        velocity: { type: 'vec3' },
        
    },
    init: function() {
        this.updateTime = 0;
    },
    update: function(oldData) {
        this.updateTime = this.el.sceneEl.time;
        const {x,y,z} = this.data.position;
        this.el.object3D.position.set(x,y,z);
    },
    tick: function(time) {
        const deltaT = (time - this.updateTime)/1000;
        const {x,y,z} = this.data.position;
        
        const vx = this.data.velocity.x;
        const vy = this.data.velocity.y;
        const vz = this.data.velocity.z;
        
        this.el.object3D.position.set(
            x + deltaT * vx,
            y + deltaT * vy,
            z + deltaT * vz,
        )
    },
});
