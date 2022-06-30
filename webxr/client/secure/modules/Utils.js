export function makeEl(tagName,attributes={},children=[]) {
    const el = document.createElement(tagName);
    for(let attribute of Object.keys(attributes)) {
        el.setAttribute(attribute,attributes[attribute]);
    }
    for(let child of children) {
        el.appendChild(child);
    }
    return el;
}
