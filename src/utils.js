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

// @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
// To make obj fully immutable, freeze each object in obj.
// To do so, we use this function.
export function deepFreeze(obj) {

  // Retrieve the property names defined on obj
  var propNames = Object.getOwnPropertyNames(obj);

  // Freeze properties before freezing self
  propNames.forEach(function(name) {
    var prop = obj[name];

    // Freeze prop if it is an object
    if (typeof prop == 'object' && prop !== null)
      deepFreeze(prop);
  });

  // Freeze self (no-op if already frozen)
  return Object.freeze(obj);
}

var memoMeasureX = {};
export function measureX(text, fontStack, fontSize) {
    if ([text, fontStack, fontSize].toString() in memoMeasureX) {
        return memoMeasureX[[text, fontStack, fontSize]];
    }

    let measure = $('#measure');
    measure.textContent = text;
    measure.style.fontFamily = fontStack;
    measure.style.fontSize = fontSize;
    
    let ans = measure.getBoundingClientRect().width;
    memoMeasureX[[text, fontStack, fontSize]] = ans;
    return ans;
}

var memoMeasureY = {};
export function measureY(text, fontStack, fontSize) {
    if ([text, fontStack, fontSize].toString() in memoMeasureY) {
        return memoMeasureY[[text, fontStack, fontSize]];
    }

    let measure = $('#measure');
    measure.textContent = text;
    measure.style.fontFamily = fontStack;
    measure.style.fontSize = fontSize;
    
    let ans = measure.getBoundingClientRect().height;
    memoMeasureY[[text, fontStack, fontSize]] = ans;
    return ans;
}