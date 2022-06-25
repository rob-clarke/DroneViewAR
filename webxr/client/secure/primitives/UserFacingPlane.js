import '../components/look-at.js';

const extendDeep = AFRAME.utils.extendDeep;
const meshMixin = AFRAME.primitives.getMeshMixin();

AFRAME.registerPrimitive('a-user-facing-plane',extendDeep({}, meshMixin, {
    defaultComponents: {
        geometry: { primitive: 'plane' },
        "look-at": "#camera",
        shader: "flat",
    },
}));
