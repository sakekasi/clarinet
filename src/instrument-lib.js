import {AbstractError, assert} from "./utils";
import {print} from "./worker-utils";

const OPERATION_BUDGET = 200;

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
    constructor(fnName, parent, args, location) {
        super();
        this.location = location;
        this.isError = false;
        this.tags = {};
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
            location: this.location,
            isError: this.isError,
            tags: this.tags,
            parent: this.parent === null ? null : this.parent.uid,
            children: this.children.map(child => child.uid)
        }
    }

    deserialize(data) {
        // this.fnName = data.fnName;
        // this.args = data.args;
        this.uid = data.uid;
        this.location = data.location;
        this.isError = data.isError;
        this.parent = (data.parent === null) ? null : this._lookupUid(data.parent);
        this.tags = data.tags;
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


    let call = new FnCall(fnName, state.currentCall, args, location);
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

export function LEAVE(returnValue, loc, isError = false) {
    state.currentCall.returnValue = returnValue;
    state.currentCall.isError = isError;
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
    uninstrumented['Array.forEach'] = Array.prototype.forEach;
    uninstrumented['console.log'] = console.log;

    Object.keys(uninstrumented)
        .forEach(key => {
            let [className, methodName] = key.split('.');
            if (className === 'Array') {
                Array.prototype[methodName] = wrapBuiltin(key, uninstrumented[key]);
            } else if (className === 'console' && methodName === 'log') {
                let wrapped = function() {
                    ENTER('console.log', uninstrumented['console.log'], arguments, null);
                    LOG(Array.prototype.slice.call(arguments));
                    return LEAVE(uninstrumented['console.log'].apply(console, arguments));
                }
                console[methodName] = wrapped;
            }
        });

}

function wrapBuiltin(name, uninstrumented) {
    return function() {
        ENTER(name, uninstrumented, arguments, null);
        return LEAVE(uninstrumented.apply(this, arguments));
    }
}

export function RESETMONKEYPATCH() {
    uninstrumented['Array.forEach']
        .call(Object.keys(uninstrumented), key => {
            let [className, methodName] = key.split('.');
            if (className === 'Array') {
                Array.prototype[methodName] = uninstrumented[key];
            } else if (className === 'console' && methodName === 'log') {
                console[methodName] = uninstrumented[key];
            }
        });
}

export function TAG(key, optValue = null, optCondition = function() {return true}) {
    if (optCondition()) {
        state.currentCall.tags[key] = optValue;
    }
}

export function LOG(...args) {
    print(...args);
}