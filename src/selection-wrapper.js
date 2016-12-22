export default function SelectionWrapper(selection, parent) {
    this._parent = parent;
    this._selection = selection;
    this.swatchIndex = 1;
    return new Proxy(this, handlers);
}

SelectionWrapper.prototype.forEach = function(fn) {
    this._selection.each(function(datum) {
        return fn(this.datum._call);
    });
    return this;
}

SelectionWrapper.prototype.query = function(predicate) {
    return new SelectionWrapper(this._selection
        .filter(function(datum) { return predicate(this.datum._call); }),
        this._parent);
};

SelectionWrapper.prototype.info = function(property) {
    this._selection.each(function(datum) {
        datum.infos.push(property(datum._call))
    });
    //this.render(true);
    return this;
};

SelectionWrapper.prototype.clearInfos = function(property) {
    this._selection.each(function(datum) {
        datum.infos = [];
    });
    //this.render(true);
    return this;
};

SelectionWrapper.prototype.collapse = function() {
    this._selection.each(function(datum) {
        datum.collapsed = true;
        console.warn(datum, datum.collapsed);
    });
    //this._parent.render(true);
    return this;
};

SelectionWrapper.prototype.refresh = function() {
    this._parent.render(true);
}

SelectionWrapper.prototype.nextSwatch = function(index = null) {
    if (index !== null) {
        this.swatchIndex = index;
    }
    return this._selection
        .select('rect')
            .style('fill', swatches((this.swatchIndex++) % 6));
}

var handlers  = {
    get(target, property, receiver) {
        if (property in target) {
            return target[property];
        } else if (property in target._selection) { // delegate to selection
            return target._selection[property];
        } else if (property in target._parent) {
            return target._parent[property];
        }
    },
    
    has(target, property) {
        return propery in target || (property in target._selection) || (property in target._parent);
    },
    
    set(target, property, value, receiver) {
        if (property in target) {
            target[property] = value;
        } else if (property in target._selection) { // delegate to selection
            target._selection[property] = value;
        } else if (property in target._parent) {
            target._parent[property] = value;
        } else {
            target[property] = value;
        }
        return true;
    }
};