import '../components/look-at.js';

const extendDeep = AFRAME.utils.extendDeep;
const meshMixin = AFRAME.primitives.getMeshMixin();

AFRAME.registerPrimitive('a-drone-pointer', extendDeep({}, meshMixin, {
    defaultComponents: {
        geometry: {
            primitive: 'triangle',
            vertexA: '   0  0.1 0',
            vertexB: '-0.1 -0.1 0',
            vertexC: ' 0.1 -0.1 0',
        },
        "look-at": "#camera",
        shader: "flat",
    }
}));
