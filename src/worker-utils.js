export class WorkerEvent {
    constructor(name, data) {
        this.name = name;
        Object.assign(this, data);
    }
}

export class Message extends WorkerEvent {
    constructor(data) {
        super('LOG', {data});
    }
}

export class ErrorMessage extends Message {
    constructor(data) {
        super(data);
        this.name = 'ERROR';
    }
}

export class InfoMessage extends Message {
    constructor(data) {
        super(data);
        this.name = 'INFO';
    }
}

export class WarningMessage extends Message {
    constructor(data) {
        super(data);
        this.name = 'WARNING';
    }
}

export function print(...args) {
    let msg = Object.assign({}, new Message(args))
    self.postMessage(msg);
} 

export function err(...args) {
    self.postMessage(new ErrorMessage(args));
}

export function info(...args) {
    self.postMessage(new InfoMessage(args));
}

export function warn(...args) {
    self.postMessage(new WarningMessage(args));
}