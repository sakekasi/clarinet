import * as lib from "./instrument-lib";
Object.assign(self, lib);

import {info, err, WorkerEvent} from "./worker-utils";

self.addEventListener('message', function(e) {
    info('EVENT', e.data.name);
    switch (e.data.name) {
        case 'INITIALIZE':
            start(e.data.code, e.data.map);
            break;
    }
});

function start(code, map) {
    'use strict';
    try {
        MONKEYPATCH();
        eval(code);
        RESETMONKEYPATCH();
        self.postMessage(new WorkerEvent('DONE', {
            trace: JSON.stringify(self.trace, serializableReplacer)
        }));
        self.close();
    } catch (e) {
        while (state.currentCall !== null) {
            state.currentCall.throws = e;
            state.currentCall = state.currentCall.parent;
        }

        RESETMONKEYPATCH();
        self.postMessage(new WorkerEvent('DONE', {
            trace: JSON.stringify(self.trace, serializableReplacer),
            error: e.toString != null ? e.toString() : JSON.stringify(e)
        }));
    }
}