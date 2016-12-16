import CodeMirror from "codemirror";
import "codemirror/mode/javascript/javascript";

import instrument from "./instrument";

import {default as flameGraph, query as queryCalls, forEachCall, swatches} from "./flame-graph";
window.queryCalls = queryCalls;
window.forEachCall = forEachCall;
window.swatches = swatches;

import * as queryLib from "./query-lib";
Object.assign(window, queryLib);

import CodeRunner from "./code-runner.worker.js!worker";
import {WorkerEvent} from "./worker-utils";
import {$, clear} from "./utils";
import {serializableReviver, ExecutionTrace, ExecutionState, FnCall} from "./instrument-lib";

import recast from "recast";
window.recast = recast;

var editor = CodeMirror.fromTextArea($('#editor'), {
    lineNumbers: true,
    mode:  'javascript',
    theme: 'grayscale',
    extraKeys: {
        'Ctrl-Enter': runCode
    }
});

var query = CodeMirror.fromTextArea($('#query'), {
    lineNumbers: true,
    mode: 'javascript',
    theme: 'grayscale'
})

window.editor = editor;

// let timeout = null;
// const lagTime = 500;
// editor.on('change', () => {
//     if (timeout !== null) {
//         clearTimeout(timeout);
//     }
//     timeout = setTimeout(runCode, lagTime);
// });

function error(item) {
    let li = document.createElement('li');
    li.textContent = item.toString != null ? item.toString() : JSON.stringify(item);
    $('#errors').insertBefore(li, $('#errors').firstChild);
} 

let codeRunner = null;
function runCode(editor) {
    let code = editor.getValue();
    try {
        let instrumented = instrument(code);
        console.info(instrumented.code);
        if (codeRunner !== null) {
            codeRunner.terminate();
        }
        codeRunner = new CodeRunner();
        codeRunner.postMessage(new WorkerEvent('INITIALIZE', {code: instrumented.code, map: null}));
        codeRunner.addEventListener('message', onMessage);
    } catch (e) {
        error(e); 
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
            if (e.data.error != null) {
                error(e.data.error);
                // let error = e.data.error;
                // $('#errors').textContent = error.toString != null ? error.toString() : JSON.toString(error)
            }
            if (trace.rootCall !== null) {
                clear($('#visualization'));
                flameGraph($('#visualization'), trace.calls, trace.rootCall);
                let queryCode = query.getValue();
                try {
                    eval(queryCode);
                } catch (e) {
                    error(e);
                }
            }
            codeRunner = null;
            break;
    }
}

window.editor = editor;