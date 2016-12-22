import {measureX, measureY} from "./utils";

export default function CallWrapper(call, parent) {
    this._call = call;
    this._parent = parent;
    this.infos = [];
    this._proxy = new Proxy(this, handlers);
    return this._proxy;
}

CallWrapper.prototype._clearCache = function(prop = null, notProp = null) {
    const cachedProps = ['width', 'baseHeight', 'labelHeight', 'height', 'x', 'y', 'collapsed'];
    if (prop === null && notProp === null) {
        cachedProps
            .forEach(prop => delete this['_' + prop]);
        return;
    } else if (prop === null && notProp !== null) {
        if (notProp.charAt(0) === '_') {
            notProp = notProp.slice(1);
        }
        cachedProps
            .forEach(prop => {
                if (prop === notProp) {
                    return;
                } else {
                    delete this['_' + prop];
                }
            });
            return;
    }
    
    if (prop.charAt(0) === '_') {
        prop = prop.slice(1);
    }

    delete this['_' + prop];
}

Object.defineProperty(CallWrapper.prototype, 'parent', {
    get() {
        if (this._callParent != null) {
            return this._callParent;
        }

        this._callParent = this._call.parent !== null ? new CallWrapper(this._call.parent, this._parent) : null;
        return this._callParent;
    }
});

Object.defineProperty(CallWrapper.prototype, 'children', {
    get() {
        if (this._children != null) {
            return this._children;
        }

        this._children = this._call.children.map(call => {
            let ans = new CallWrapper(call, this._parent);
            ans._callParent = this._proxy;
            return ans;
        });
        return this._children;
    }
});

Object.defineProperty(CallWrapper.prototype, 'width', {
    get() {
        if (this._width != null) {
            return this._width;
        }

        let labelWidth = measureX(this._call.fnName, this._parent.styles.label.fontFamily, this._parent.styles.label.fontSize); // TODO: measureX
        let maxInfoWidth = this.infos   
            .map(info => measureX(info, this._parent.styles.info.fontFamily, this._parent.styles.info.fontSize))
            .reduce((agg, b) => Math.max(agg, b), 0);

        let width = Math.max(labelWidth, maxInfoWidth);
        if (this._parent.styles.default.maxWidth != null) {
            width = Math.min(width, this._parent.styles.default.maxWidth);
        }

        if (this.collapsed) {
            this._width = this._parent.styles.collapsed.width;
        } else {
            this._width = this._parent.styles.default.paddingLeft +
                width +
                this._parent.styles.default.paddingRight;
        }

        return this._width;
    }
});

Object.defineProperty(CallWrapper.prototype, 'baseHeight', {
    get() {
        if (this._baseHeight != null) {
            return this._baseHeight;
        }

        let labelHeight = measureY(this._call.fnName, this._parent.styles.label.fontFamily, this._parent.styles.label.fontSize); // TODO: measureY
        let infoHeight = this.infos
            .map(info => measureY(info, this._parent.styles.info.fontFamily, this._parent.styles.info.fontSize))
            .reduce((agg, b) => agg + b, 0);
            
        this._labelHeight = labelHeight;
        
        if (this.collapsed) {
            this._baseHeight = this._parent.styles.collapsed.minHeight + 
                this._parent.styles.collapsed.marginBottom;
        } else {
            this._baseHeight = this._parent.styles.default.paddingTop +
                labelHeight + this._parent.styles.label.paddingBottom +
                infoHeight + this._parent.styles.info.paddingBottom +
                this._parent.styles.default.paddingBottom;
        }

        return this._baseHeight;
    }
})

// redo
Object.defineProperty(CallWrapper.prototype, 'height', {
    get() {
        if (this._height != null) {
            return this._height;
        }

        this.baseHeight;

        if (this.children.length === 0) {
            this._height = this.baseHeight;
        } else {
            let total = this.children
                .map(child => child.height)
                .reduce((agg, b, i, arr) => 
                    i < (arr.length - 1) ? 
                    this._parent.styles[(this.children[i].collapsed ? 'collapsed' :  'default')].marginBottom + agg + b : 
                    agg + b
                , 0);
            this._height = Math.max(total, this.baseHeight);
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
            childY += child.height + (child.collapsed ? this._parent.styles.collapsed.marginBottom : this._parent.styles.default.marginBottom);
        });

        return this._y;
    }
});

Object.defineProperty(CallWrapper.prototype, 'x', {
    get() {
        if (this._x != null) {
            return this._x;
        }

        if (this.collapsed) {
            this._x = 
                this._parent.styles.collapsed.marginLeft + 
                (this.parent === null ? 0 : this.parent.x) + 
                (this.parent === null ? 0 : (this.parent.collapsed ? this.parent.width : this._parent.levelWidth)) + 
                this._parent.styles[(this.parent !== null && this.parent.collapsed) ? 'collapsed' : 'default'].marginRight + 
                this.width / 2;
        } else {
            this._x = ((this._parent.levelWidth + this._parent.styles.default.marginRight) * this._call.level);
        }

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
        if (property in target) {
            return target[property];
        } else if (property in target._call) {
            return target._call[property];
        } else if (property in target._parent) {
            return target._parent[property];
        }
    },
    
    has(target, property) {
        return property in target || (property in target._call) || (property in target._parent);
    },
    
    set(target, property, value, receiver) {
        if (target.hasOwnProperty(property)) {
            target[property] = value;
        } else if (property in target._call) {
            target._call[property] = value;
        } else if (property in target._parent) {
            target._parent[property] = value;
        } else {
            target[property] = value;
        }
        return true;
    }
};