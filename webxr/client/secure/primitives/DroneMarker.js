import '../components/look-at.js';

const extendDeep = AFRAME.utils.extendDeep;
const meshMixin = AFRAME.primitives.getMeshMixin();

AFRAME.registerPrimitive('a-drone-marker', extendDeep({}, meshMixin, {
    defaultComponents: {
        geometry: {
            primitive: 'ring',
            radiusInner: 0.75,
            radiusOuter: 1,
        },
        "look-at": "#camera",
        shader: "flat",
    }
}));
