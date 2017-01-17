import {delegate} from "./utils";

export default class SelectionWrapper {
    constructor(selection, visualization) {
        this._selection = selection;
        this._visualization = visualization;
        this.swatchIndex = 1;

        this._proxy = new Proxy(this,
            delegate(this, ['_selection', '_visualization'])
        );
        return this._proxy;
    }

    refresh() {
        this._visualization.update();
    }

    query(predicate) {
        return new SelectionWrapper(
            this._selection
                .filter(function(wrapped) { return predicate(wrapped._call); }),
            this._visualization
        );
    }

    forEach(fn) {
        this._selection
            .each(function(wrapped) { return fn(wrapped._call); });
        return this;
    }

    info(property) {
        this._selection
            .each(function(wrapped) { wrapped.infos.push(property(wrapped._call)); });
        return this;
    }

    clearInfos() {
        this._selection
            .each(function(wrapped) { wrapped.infos = []; });
        return this;
    }

    collapse(collapsed = true) {
        this._selection
            .each(function(wrapped) { wrapped.collapsed = collapsed; });
        return this;
    }

    collapseAll(collapsed = true) {
        this._selection
            .each(function(wrapped) {
            breadthFirstTraversal(wrapped, function(node) { node.collapsed = collapsed; })
            });
        return this;
    }

    nextSwatch(index = null) {
        if (index !== null) {
            this.swatchIndex = index;
        }
        return this._selection
            .style('background-color', swatches((this.swatchIndex++) % 6));
    }
}
