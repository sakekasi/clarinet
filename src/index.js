import CodeMirror from "codemirror";
import "codemirror/mode/javascript/javascript";

import instrument from "./instrument";
import flameGraph from "./flame-graph";

import CodeRunner from "./code-runner.worker.js!worker";
import {WorkerEvent} from "./worker-utils";
import {$, clear} from "./utils";
import {serializableReviver, ExecutionTrace, ExecutionState, FnCall} from "./instrument-lib";

var editor = CodeMirror.fromTextArea($('#editor'), {
    lineNumbers: true,
    mode:  'javascript'
});

let timeout = null;
const lagTime = 500;
editor.on('change', () => {
    if (timeout !== null) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(onChange, lagTime);
});


let codeRunner = null;
function onChange() {
    let code = editor.getValue();
    try {
        let instrumented = instrument(code);
        // $('#output').textContent = instrumented.code;
        if (codeRunner !== null) {
            codeRunner.terminate();
        }
        codeRunner = new CodeRunner();
        codeRunner.postMessage(new WorkerEvent('INITIALIZE', {code: instrumented.code, map: null}));
        codeRunner.addEventListener('message', onMessage);
    } catch (e) {
        console.error(e);
    }
}

var uidToCall = {};
var trace = null;
const state = new ExecutionState();
window.state = state;
const lookupUid = (uid) => uid === null ? null : uidToCall[uid];
const reviver = serializableReviver({
    ExecutionTrace: function() { 
        let ans = new ExecutionTrace(); 
        ans._lookupUid = lookupUid;
        return ans;
    },
    FnCall: function(value) { 
        let ans = new FnCall(value.fnName, null, value.args); 
        ans._lookupUid = lookupUid;
        uidToCall[value.uid] = ans; 
        return ans; 
    }
});

function onMessage(e) {
    switch (e.data.name) {
        case 'ERROR':
            console.error(...e.data.data);
            break;
        case 'INFO':
            console.info(...e.data.data);
            break;
        case 'WARNING':
            console.warn(...e.data.data);
            break;
        case 'LOG':
            console.log(...e.data.data);
            break;
        case 'DONE':
            trace = JSON.parse(e.data.trace, reviver);            
            console.log(trace);
            if (e.data.error) {
                console.error(e.data.error);
            }
            clear($('#visualization'));
            flameGraph($('#visualization'), trace.calls, trace.rootCall);
            codeRunner = null;
            break;
    }
}

window.editor = editor;