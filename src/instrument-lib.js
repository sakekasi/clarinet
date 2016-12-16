import {AbstractError, assert} from "./utils";

const OPERATION_BUDGET = 1000;

export class OperationBudgetExceeded extends Error {
    constructor(location) {
        super(`operation budget exceeded at ${JSON.stringify(location)}`);
        this.location = location;
        this.message = `operation budget exceeded at ${JSON.stringify(location)}`;
    }
}

class Serializable {
    serialize() {
        throw new AbstractError('Serializable.serialize');
    }

    deserialize() {
        throw new AbstractError('Serializable.deserialize');
    }
}

export class ExecutionTrace extends Serializable {
    constructor() {
        super();
        this.functions = {};
        this.calls = {};
        this.rootCall = null;
    }

    serialize() {
        let serializedFunctions = {};
        Object.keys(this.functions)
            .forEach(key => {
                serializedFunctions[key] = this.functions[key] === null ? this.functions[key] : this.functions[key].toString();
            });

        let serializedCalls = Object.keys(this.calls)
            .map(key => this.calls[key])
            .reduce((agg, b) => agg.concat(b), [])
            .sort((a, b) => a.uid < b.uid ? -1 : a.uid === b.uid ? 0 : 1);
        
        return {
            _type: 'ExecutionTrace', 
            functions: serializedFunctions, 
            calls: serializedCalls, 
            rootCall: this.rootCall !== null ? this.rootCall.uid : null
        };
    }

    deserialize(data) {
        let deserializedFunctions = {};
        // Object.keys(data.functions)
        //     .forEach(key => {
        //         deserializedFunctions[key] = eval(data.functions[key]);
        //     });

        let deserializedCalls = {};
        data.calls
            .forEach(call => {
                if (!deserializedCalls.hasOwnProperty(call.fnName)) {
                    deserializedCalls[call.fnName] = [];
                }
                deserializedCalls[call.fnName].push(call);
            });
            
        this.functions = deserializedFunctions;
        this.calls = deserializedCalls;
        this.rootCall = data.rootCall === null ? null : this._lookupUid(data.rootCall);
    } 
}

export class ExecutionState {
    constructor() {
        this.operationBudget = OPERATION_BUDGET;
        this.currentCall = null;
        this.nextUid = 0;
    }
}

export class FnCall extends Serializable {
    constructor(fnName, parent, args) {
        super();
        this.fnName = fnName;
        this.args = Array.prototype.slice.call(args);
        
        this.uid = state.nextUid++;

        this.parent = parent;
        this.children = [];
        if (this.parent !== null) {
            this.parent.children.push(this);
        }
    }

    get fn() {
        return functions[this.fnName];
    }

    get level() {
        if (this.parent === null) {
            return 0;
        }

        if (!this.hasOwnProperty('_level')) {
            this._level = this.parent.level + 1;
        }
        return this._level;
    }

    height(base, padding, readFromCache = false) {
        if (readFromCache === true) {
            return this._height;
        }

        if (this.children.length === 0) {
            this._height = base;
        } else {
            let total = this.children
                .map(child => child.height(base, padding, readFromCache))
                .reduce((agg, b, i, arr) => i < (arr.length - 1) ? padding + agg + b : agg + b, 0);
            this._height = total;
        }
        return this._height;
    }

    calculateY(base, padding) {
        if (this.parent === null) {
            this.y = 0;
        }

        let childY = this.y;
        this.children.forEach(child => {
            child.y = childY;
            child.calculateY(base, padding);
            childY += child.height(base, padding, true) + padding;
        });
    }

    cache() {
        if (!trace.calls.hasOwnProperty(this.fnName)) {
            trace.calls[this.fnName] = [];
        }
        trace.calls[this.fnName].push(this);
    }

    serialize() {
        return {
            _type: 'FnCall',
            fnName: this.fnName,
            args: this.args,
            uid: this.uid,
            parent: this.parent === null ? null : this.parent.uid,
            children: this.children.map(child => child.uid)
        }
    }

    deserialize(data) {
        // this.fnName = data.fnName;
        // this.args = data.args;
        this.uid = data.uid;
        this.parent = (data.parent === null) ? null : this._lookupUid(data.parent);
        // this.children = data.children.map(child => this._lookupUid(child));
        if (this.parent !== null) {
            this.parent.children.push(this);
        }
    }
}


export function serializableReplacer(key, value) {
    if (value instanceof Serializable) {
        return value.serialize();
    } else {
        return value;
    }
}

export function serializableReviver(classes = {
    'ExecutionTrace': function() { return new ExecutionTrace(); }, 
    'FnCall': function() { return new FnCall(); }
}) {
    return function(key, value) {
        let ans = value;
        Object.keys(classes)
            .forEach(className => {
                if (value != null && value.hasOwnProperty('_type') && value._type === className) {
                    let constr = classes[className];
                    ans = constr(value);
                    assert(ans instanceof Serializable, `${className} is not a subclass of Serializable`);
                    ans.deserialize(value);
                }
            });
        
        return ans;
    }
}

self.trace = new ExecutionTrace();
self.state = new ExecutionState();

export function ENTER(fnName, fn, args, location) {
    if (--state.operationBudget === 0) {
        throw new OperationBudgetExceeded(location);
    }

    if (!trace.functions.hasOwnProperty(fnName)) {
        trace.functions[fnName] = fn;
    }


    let call = new FnCall(fnName, state.currentCall, args);
    if (Object.keys(trace.calls).length === 0) {
        trace.rootCall = call;
    }
    call.cache();
    state.currentCall = call;
}

export function LOOP(location) {
    if (--state.operationBudget === 0) {
        throw new OperationBudgetExceeded(location);
    }
}

export function LEAVE(returnValue) {
    state.currentCall.returnValue = returnValue;
    state.currentCall = state.currentCall.parent;
    return returnValue;
}

export function CLEAR() {
    trace = new ExecutionTrace();
    state = new ExecutionState();
}

var uninstrumented = {}

export function MONKEYPATCH() {
    uninstrumented['Array.map'] = Array.prototype.map;
    uninstrumented['Array.filter'] = Array.prototype.filter;
    uninstrumented['Array.reduce'] = Array.prototype.reduce;

    Object.keys(uninstrumented)
        .forEach(key => {
            let methodName = key.split('.')[1];
            Array.prototype[methodName] = wrapBuiltin(key, uninstrumented[key]);
        });
}

function wrapBuiltin(name, uninstrumented) {
    return function() {
        ENTER(name, uninstrumented, arguments, null);
        return LEAVE(uninstrumented.apply(this, arguments));
    }
}

export function RESETMONKEYPATCH() {
    Object.keys(uninstrumented)
        .forEach(key => {
            let methodName = key.split('.')[1];
            Array.prototype[methodName] = uninstrumented[key];
        });
}