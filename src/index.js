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
    theme: 'grayscale',
    extraKeys: {
        'Ctrl-Enter': runCode
    }
})

window.editor = editor;

let savedEditorContent = localStorage.getItem('clarinet.editor');
let savedQueryContent = localStorage.getItem('clarinet.query');

if (savedEditorContent !== null && savedEditorContent.trim() !== '') {
    editor.setValue(savedEditorContent);
}
if (savedQueryContent !== null && savedQueryContent.trim() !== '') {
    query.setValue(savedQueryContent);
}

let timeoute = null;
editor.on('change', () => {
    if (timeoute !== null) {
        clearTimeout(timeoute);
    }
    timeoute = setTimeout(save, lagTime);
});

let timeoutq = null;
const lagTime = 100;
query.on('change', () => {
    if (timeoutq !== null) {
        clearTimeout(timeoutq);
    }
    timeoutq = setTimeout(save, lagTime);
});

function save() {
    localStorage.setItem('clarinet.editor', editor.getValue());
    localStorage.setItem('clarinet.query', query.getValue());
}

function error(item, tag = '') {
    if (tag !== '') {
        tag = tag + ': '
    }

    let li = document.createElement('li');
    li.textContent = tag + (item.toString != null ? item.toString() : JSON.stringify(item));
    li.classList.add('error');
    $('#log').insertBefore(li, $('#log').firstChild);
} 

function log(...args) {
    let li = document.createElement('li');
    li.textContent =  args.join(' ');
    $('#log').insertBefore(li, $('#log').firstChild);
}

let codeRunner = null;
function runCode() {
    let code = editor.getValue();
    try {
        let instrumented = instrument(code);
        console.info(instrumented.code);
        if (codeRunner !== null) {
            codeRunner.terminate();
        }
        log(' ');
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
            log(...e.data.data);
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
                    error(e, 'QUERY');
                }
            }
            codeRunner = null;
            break;
    }
}

window.editor = editor;