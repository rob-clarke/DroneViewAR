import '../components/look-at.js';
import '../components/spins.js';

const extendDeep = AFRAME.utils.extendDeep;
const meshMixin = AFRAME.primitives.getMeshMixin();

AFRAME.registerPrimitive('a-spinner', extendDeep({}, meshMixin, {
    defaultComponents: {
        geometry: {
            primitive: 'ring',
            radiusInner: 0.9,
            radiusOuter: 1,
            thetaLength: 270,
        },
        spins: "-0.05",
        shader: "flat",
    },
}));
