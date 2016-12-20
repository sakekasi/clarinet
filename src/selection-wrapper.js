export default function SelectionWrapper(selection) {
    this._selection = selection;
    return new Proxy(this, handlers);
}

SelectionWrapper.prototype.forEach = function(fn) {
    this._selection.each(function(datum) {
        return fn(this.datum._call);
    });
    return this;
}

SelectionWrapper.prototype.query = function(predicate) {
    return new SelectionWrapper(d3.selectAll('g.call')
        .filter(function(datum) { return predicate(this.datum._call); })
    );
};

SelectionWrapper.prototype.info = function(property) {
    this._selection.each(function(datum) {
        datum.infos.push(property(datum._call))
    });
    // UPDATE DOM
    return this;
};

SelectionWrapper.prototype.collapse = function() {
    this._selection.each(function(datum) {
        datum.collapsed = true;
    });
    // UPDATE DOM
    return this;
};

var handlers  = {
    get(target, property, receiver) {
        if (target.hasOwnProperty(property) || property in CallWrapper.prototype) {
            return target[property];
        } else if (target._selection.hasOwnProperty(property) || property in target._selection.prototype) { // delegate to selection
            return target._selection[property];
        }
    },
    
    has(target, property) {
        return target.hasOwnProperty(property) || (property in target._selection);
    },
    
    set(target, property, value, receiver) {
        if (target.hasOwnProperty(property) || property in CallWrapper.prototype) {
            return target[property] = value;
        } else if (target._selection.hasOwnProperty(property) || property in target._selection.prototype) { // delegate to selection
            return target._selection[property] = value;
        }
    }
};