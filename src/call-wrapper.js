export default function CallWrapper(call, parent) {
    this._call = call;
    this._parent = parent;
    this.infos = [];
    return new Proxy(this, handlers);
}

CallWrapper.prototype._clearCache = function(prop = null) {
    if (prop === null) {
        delete this._width;
        delete this._baseHeight;
        delete this._labelHeight;
        delete this._height;
        delete this._y;
        delete this._x;
        delete this._collapsed;
        return;
    } 
    
    if (prop.charAt(0) === '_') {
        prop = prop.slice(1);
    }

    delete this['_' + prop];
}

Object.defineProperty(CallWrapper.prototype, 'width', {
    get() {
        if (this._width != null) {
            return this._width;
        }

        let labelWidth = measureX(this.fnName, this.styles.label.fontFamily, this.styles.label.fontSize); // TODO: measureX
        let maxInfoWidth = this.infos   
            .map(info => measureX(info, this.styles.info.fontFamily, this.styles.info.fontSize))
            .reduce(Math.max, 0);
        let width = Math.max(labelWidth, maxInfoWidth);
        if (this.styles.default.maxWidth != null) {
            width = Math.min(width, this.styles.default.maxWidth);
        }

        this._width = this.styles.default.paddingLeft +
            width +
            this.styles.default.paddingRight;

        return this._width;
    }
});

Object.defineProperty(CallWrapper.prototype, 'baseHeight', {
    get() {
        if (this._baseHeight != null) {
            return this._baseHeight;
        }

        let labelHeight = measureY(this.fnName, this.styles.label.fontFamily, this.styles.label.fontSize); // TODO: measureY
        let infoHeight = this.infos
            .map(info => measureY(info, this.styles.info.fontFamily, this.styles.info.fontSize))
            .reduce((agg, b) => agg + b, 0);
            
        this._labelHeight = labelHeight;
        
        this._baseHeight = this.styles.default.paddingTop +
            labelHeight + this.styles.label.paddingBottom +
            infoHeight + this.styles.info.paddingBottom +
            this.styles.default.paddingBottom;

        return this._baseHeight;
    }
})

// redo
Object.defineProperty(CallWrapper.prototype, 'height', {
    get() {
        if (this._height != null) {
            return this._height;
        }

        if (this.children.length === 0) {
            this._height = this.baseHeight;
        } else {
            let total = this.children
                .map(child => child.height(readFromCache))
                .reduce((agg, b, i, arr) => i < (arr.length - 1) ? this.styles.default.marginBottom + agg + b : agg + b, 0);
            this._height = total;
        }
        return this._height;
    }
});

Object.defineProperty(CallWrapper.prototype, 'y', {
    get() {
        if (this.parent === null) {
            this._y = 0;
        }

        let childY = this._y;
        this.children.forEach(child => {
            child._y = childY;
            child.y;
            childY += child.height + this.styles.default.marginBottom;
        });
    }
});

Object.defineProperty(CallWrapper.prototype, 'x', {
    get() {
        if (this._x != null) {
            return this._x;
        }

        this._x = this.parent.x + this.styles.default.marginRight;
        return this._x;
    }
});

Object.defineProperty(CallWrapper.prototype, 'collapsed', {
    get() {
        if (this._collapsed === true) {
            return this._collapsed;
        } else if (this.parent === null) {
            return false;
        } else {
            return this.parent.collapsed;
        }
    },

    set(value) {
        this._collapsed = value;
    }
})

var handlers  = {
    get(target, property, receiver) {
        if (target.hasOwnProperty(property) || property in CallWrapper.prototype) {
            return target[property];
        } else if (target._call.hasOwnProperty(property) || property in target._call.prototype) {
            return target._call[property];
        } else if (target._parent.hasOwnProperty(property) || property in target._parent.prototype) {
            return target._parent[property];
        }
    },
    
    has(target, property) {
        return target.hasOwnProperty(property) || (property in target._call) || (property in target._parent);
    },
    
    set(target, property, value, receiver) {
        if (target.hasOwnProperty(property)) {
            return target[property] = value;
        } else if (target._call.hasOwnProperty(property) || property in target._call.prototype) {
            return target._call[property] = value;
        } else if (target._parent.hasOwnProperty(property) || property in target._parent.prototype) {
            return target._parent[property] = value;
        }
    }
};