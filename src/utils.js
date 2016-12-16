export class AbstractError {
    constructor(methodName) {
        this.methodName = methodName;
        this.message = `${methodName} is not implemented.`;
    }
}

export class AssertionError extends Error {}

export function assert(test, message) {
    if (!test) {
        throw new AssertionError(message);
    }
}

export function $(query) { return document.querySelector(query); }

export function clear(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

export function deepEquals(a, b) {
    if (typeof a !== typeof b) {
        return false;
    } else if (typeof a === 'object') {
        return Object.keys(a).every(key => deepEquals(a[key], b[key])) &&
            Object.keys(b).every(key => deepEquals(a[key], b[key]));
    } else {
        return a === b;
    }
}