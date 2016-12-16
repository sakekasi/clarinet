import {deepEquals} from "./utils";

export function oneOffFromBaseCase(fnName) {
    return  query(call =>
        call.fnName === fnName &&
        call.children.every(child => 
            child.fnName !== fnName || 
            baseCase(fnName)(child) 
        )
    );
}

export function baseCase(fnName) {
    return function(call) {
        return call.fnName === fnName &&
        call.children.every(child => child.fnName !== fnName)
    };
}

export function rootCase(fnName) {
    return function(call) {
        return call.fnName === fnName &&
        call.parent.fnName !== fnName;
    }
}

export function callsWithSameArgument(fnName) {
    let sameArg = {};
    let argSets = [];
    forEachCall(
        call => {
            let c = argSets.find(c => deepEquals(c.args, call.args));
            if (c !== undefined ) {
                sameArg[c.uid] = true;
                sameArg[call.uid] = true;
            } else {
                sameArg[call.uid] = false;
                argSets.push(call);
            }
        }, 
        call => call.fnName === fnName);
    return function(call) {
        return sameArg[call.uid];
    };
}

export function nCallsFromParent(fnName, n) {
    let sameParent = {};
    forEachCall(
        call => {
            if (call.parent !== null && !sameParent.hasOwnProperty(call.parent.uid)) {
                sameParent[call.parent.uid] = 1;
            } else if (call.parent !== null) {
                sameParent[call.parent.uid]++;
            }
        },
        call => call.fnName === fnName
    );
    return function(call) {
        return call.parent !== null && call.fnName === fnName && sameParent[call.parent.uid] === n;
    };
}