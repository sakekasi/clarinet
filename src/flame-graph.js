import {$, deepFreeze} from "./utils";
import * as d3 from "d3";
window.d3 = d3;

import CallWrapper from "./call-wrapper";
import SelectionWrapper from "./selection-wrapper";

// binary chop
function wrap(width, padding) {
    let memo = {};
    return function() {
        let self = d3.select(this),
            textLength = self.node().getComputedTextLength(),
            text = self.text(),
            origText = text;
        
        if (memo.hasOwnProperty(origText)) {
            self.text(memo[origText]);
        } else {
            while (textLength > (width - (2 * padding)) && text.length > 0) {
                text = text.slice(0, -1);
                self.text(text + '…');
                textLength = self.node().getComputedTextLength();
            }
            memo[origText] = self.text();
        }
    };
} 

export default class FlameGraph {
    constructor(editor, svg, calls, rootCall) {
        this.currentFunction = null;
        this.svg = svg;
        this.editor = editor;

        this.rootCall = new CallWrapper(rootCall, this);
        let queue = [this.rootCall];
        this.calls = [this.rootCall];
        while (queue.length !== 0) {
            let current = queue.shift();
            current.children.forEach(child => {
                queue.push(child);
                this.calls.push(child);
            });
        }

        // assign each call a level (root is 0)
        this.levels = [];
        this.calls
            .forEach(call => {
                if (!this.levels.hasOwnProperty(call.level)) {
                    this.levels[call.level] = [];
                }
                this.levels[call.level].push(call);
            });
        
        // vertical ordering is by uid (time of call)
        Object.keys(this.levels)
            .forEach(key => this.levels[key].sort((a, b) => a.uid < b.uid ? -1 : a.uid === b.uid ? 0 : 1));

        this.styles = {
            default: {
                maxWidth: null,
                paddingLeft: 5,
                paddingRight: 5,
                paddingTop: 5,
                paddingBottom: 5,
                marginBottom: 3,
                marginRight: 0
            },
            label: {
                fontFamily: 'Cooper Hewitt, Helvetica, Arial, sans-serif',
                fontSize: '14px',
                paddingBottom: 1
            },
            info: {
                fontFamily: 'Bookerly, Input Serif, serif',
                fontSize: '8px',
                paddingBottom: 0
            },
            stack: {
                fontWeight: 600
            },
            collapsed: {
                width: 3,
                minHeight: 3,
                marginBottom: 2,
                marginLeft: 1,
                marginRight: 0
            }
        };
        deepFreeze(this.styles);
    }

    _clearCache() {
        this.calls
            .forEach(call => call._clearCache(null, 'collapsed'));
    }

    get levelWidth() {
        return this.calls
            .reduce((agg, b) => {
                return b.collapsed ? agg : Math.max(agg, b.width)
            }, 0) +
            this.styles.default.paddingRight;
    }

    _update() {
        let transition;
        transition = d3.transition().duration(0);

        this._clearCache();
        this.rootCall.y;

        // level x
        this.d3levels
            .transition(transition)
                .attr('transform', (_, i) => `translate(${i * (this.levelWidth + this.styles.default.marginRight)}, 0)`);

        // callGroup y
        this.callGroups
            .transition(transition)
                .attr('transform', datum => `translate(0, ${datum.y})`)

        this.fullSizeCallGroups
            .style('opacity', 1)
            .transition(transition)
                .style('opacity', datum => datum.collapsed ? 0 : 1)
                .on('end', function(datum) {
                    if (datum.collapsed) {
                        d3.select(this)
                            .style('visibility', 'hidden');
                    } else {
                        d3.select(this)
                            .style('visibility', 'visible');
                    }
                });
        
        // rect height, width
        this.callRects
            .transition(transition)
                .attr('width', this.levelWidth)
                .attr('height', datum => datum.height); // TODO: collapsed as a part of height

        // infos
        console.warn(this.callInfos);
        let text = this.callInfos
            .selectAll('text')
            .data(function(datum){
                return datum.infos
            });
            
        text = text.enter().append('text')
                .merge(text)
                    .text(info => info)
                    .style('font-family', this.styles.info.fontFamily)
                    .style('font-size', this.styles.info.fontSize);
        
        text.exit().remove();

        this.collapsedCallGroups
            .style('opacity', 0)
            .transition(transition)
                .style('opacity', datum => datum.collapsed ? 1 : 0)
                .on('end', function(datum) {
                    if (datum.collapsed) {
                        d3.select(this)
                            .style('visibility', 'visible');
                    } else {
                        d3.select(this)
                            .style('visibility', 'hidden');
                    }
                });

        this.callLines
            .transition(transition)
                .attr('x1', datum => datum.x)
                .attr('x2', datum => datum.x)
                .attr('y2', datum => datum.height)
                .attr('transform', datum => `translate(${datum.level * -1 * (this.levelWidth + this.styles.default.marginRight)}, 0)`);

        d3.select(this.svg)
            .attr('width', this.levels.length * (this.levelWidth + this.styles.default.marginRight))
            .attr('height', this.rootCall.height);
    }

    render(update = false) {
        if (update) {
            this._update();
            return;
        }

        this.rootCall.y;

        let that = this;
        let d3svg = d3.select(this.svg);

        let levels = this.d3levels = d3svg
            .selectAll('g.level')
            .data(this.levels);
        
        levels = this.d3levels = levels.enter().append('g')
                .classed('level', true)
            .merge(levels)
                .attr('transform', (_, i) => `translate(${i * (this.levelWidth + this.styles.default.marginRight)}, 0)`);
        
        let callGroups = this.callGroups = levels
            .selectAll('g.call')
            .data(datum => datum);

        callGroups = this.callGroups = callGroups.enter().append('g')
                .classed('call', true)
                .on('mouseover', function(datum) {
                    that.currentFunction = datum;
                    that.markEditor(that.currentFunction);
                    d3.select(that.currentFunction.DOM)
                        .classed('currentFunction', true);

                    let current = that.currentFunction;
                    while (current !== null) {
                        d3.select(current.DOM)
                            .style('font-weight', that.styles.stack.fontWeight)
                            .classed('callStack', true);
                        current = current.parent;
                    }

                    let printable = {
                        name: that.currentFunction.fnName, 
                        args: that.currentFunction.args, 
                        returnValue: that.currentFunction.returnValue,
                        uid: that.currentFunction.uid
                    };
                })
                .on('mouseout', function(datum) {
                    that.clearEditorMarks();
                    d3.select(that.currentFunction.DOM)
                        .classed('currentFunction', false);

                    let current = that.currentFunction;
                    that.currentFunction = null;
                    while (current !== null) {
                        d3.select(current.DOM)
                            .style('font-weight', 'normal')
                            .classed('callStack', false);
                        current = current.parent;
                    }
                })
            .merge(callGroups)
                .attr('transform', datum => `translate(0, ${datum.y})`)
                .each(function(datum) {
                    this.datum = datum;
                    datum.DOM = this;
                });
        
        callGroups.append('svg:title')
            .text(datum => datum.fnName);

        let fullSizeCallGroups = this.fullSizeCallGroups = callGroups
            .append('g')
                .classed('fullSize', true)
                .style('visibility', 'visible');

        this.callRects = fullSizeCallGroups.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', this.levelWidth) 
            .attr('pointer-events', 'visible')
            .attr('height', datum => datum.height)
            .attr('stroke', d3.hcl(0, 0, 80))
            .attr('stroke-width', '1px')
            .attr('fill', 'none');
        
        fullSizeCallGroups.append('text')
            .classed('label', true)
            .attr('x', this.styles.default.paddingLeft)
            .attr('y', datum => datum._labelHeight - 2 + this.styles.default.paddingTop)
            .attr('width', this.levelWidth)
            .attr('height', datum => datum.height)
            .text(datum => datum.fnName)
            .attr('font-family', this.styles.label.fontFamily)
            .attr('font-size', this.styles.label.fontSize)
            .each(wrap(this.levelWidth, 2));   

        this.callInfos = fullSizeCallGroups.append('g')
            .classed('info', true)
            .attr('transform', datum => `translate(${this.styles.default.paddingLeft}, ${
                    this.styles.default.paddingTop + datum._labelHeight + this.styles.label.paddingBottom + parseInt(this.styles.info.fontSize)
            })`);

        let collapsedCallGroups = this.collapsedCallGroups = callGroups
            .append('g')
                .classed('collapsed', true)
                .style('visibility', 'hidden');

        this.callLines = this.collapsedCallGroups.append('line')
            .attr('x1', datum => datum.x)
            .attr('y1', datum => 0)
            .attr('x2', datum =>  datum.x)
            .attr('y2', datum => datum.height)
            .attr('transform', datum => `translate(${datum.level * -1 * this.levelWidth}, 0)`)
            .style('stroke-width', this.styles.collapsed.width)
            .style('stroke', d3.hcl(0, 0, 80)); // TODO: add stroke to style

        d3svg
            .attr('width', this.levels.length * (this.levelWidth + this.styles.default.marginRight))
            .attr('height', this.rootCall.height);
    }

    markEditor(fn) {
        if (fn.location === null) {
            return;
        }

        this.editor.markText(
            {line: fn.location.start.line-1, ch: fn.location.start.column},
            {line: fn.location.end.line-1, ch: fn.location.end.column},
            {className: 'highlight'}
        );
    }

    clearEditorMarks() {
        this.editor.getAllMarks()
            .forEach(mark => mark.clear());
    }

    get data() {
        return new SelectionWrapper(this.callGroups, this);
    }
}


export var swatches = d3.scaleLinear()
    .domain([1, 7])
    .range([d3.hcl(0, 30, 90), d3.hcl(360, 30, 90)])
    .interpolate(d3.interpolateHclLong);