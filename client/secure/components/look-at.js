"use strict";

// Add look-at component
AFRAME.registerComponent('look-at', {
    schema: { type: 'selector' },
    init: function() {},
    tick: function() {
        this.el.object3D.lookAt(this.data.object3D.position);
    },
});
