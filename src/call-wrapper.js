import {delegate} from "./utils";

var nextId = 0;

export default class CallWrapper {
    constructor(call, visualization) {
        this._call = call;
        this._visualization = visualization;

        this.id = nextId++;
        this.infos = [];
        this._cached = Object.create(null);

        this._proxy = new Proxy(this,
            delegate(this, ['_call', '_visualization'])
        );
        return this._proxy;
    }

    _clearCache(prop = null) {
        if (prop !== null) {
            delete this.cached[prop];
        } else {
            this._cached = Object.assign(Object.create(null), EVENT_WRAPPER_CACHED_DEFAULTS);
        }
    }

    get level() {
        if ('level' in this._cached) {
            return this._cached.level;
        }

        if (this._call.parent === null) {
            return this._cached.level =  1;
        } else {
            return this._cached.level = this.parent.level + 1;
        }
    }

    get parent() {
        if ('parent' in this._cached) {
            return this._cached.parent;
        } else {
            return null; // TODO: may want to lazily wrap parent as well
        }
    }

    get children() {
        if ('children' in this._cached) {
        return this._cached.children;
        }

        this._cached.children = this._call.children
            .map(child => {
                let ans = new CallWrapper(child, this._visualization);
                ans._cached.parent = this._proxy;
                return ans;
            });
        return this._cached.children;
    }
}