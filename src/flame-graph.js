import {$} from "./utils";
import * as d3 from "d3";
window.d3 = d3;

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

        this.calls = Object.keys(calls)
            .map(key => calls[key])
            .map(call => new CallWrapper(call, this))
            .reduce((agg, b) => agg.concat(b), []);
        this.rootCall = rootCall;

        // assign each call a level (root is 0)
        this.levels = [];
        this.calls
            .forEach(call => {
                if (!this.levels.hasOwnProperty(call.level)) {
                    levels[call.level] = [];
                }
                levels[call.level].push(call);
            });
        
        // vertical ordering is by uid (time of call)
        Object.keys(levels)
            .forEach(key => levels[key].sort((a, b) => a.uid < b.uid ? -1 : a.uid === b.uid ? 0 : 1));

        this.styles = {
            default: {
                maxWidth: null,
                paddingLeft: 5,
                paddingRight: 5,
                paddingTop: 5,
                paddingBottom: 5,
                marginBottom: 5,
                marginRight: 5
            },
            label: {
                fontFamily: 'Cooper Hewitt, Helvetica, Arial, sans-serif',
                fontSize: '16px',
                paddingBottom: 2
            },
            info: {
                fontFamily: 'Bookerly, Input Serif, serif',
                fontSize: '8px',
                paddingBottom: 2
            },
            stack: {
                fontWeight: 600
            }
        };
        deepFreeze(this.styles);
    }

    _clearCache() {
        this.calls
            .forEach(call => call._clearCache());
    }

    get levelWidth() {
        return this.calls
            .reduce(agg, b => Math.max(agg, b.width), 0);
    }

    _update() {
        let transition;
        transition = d3.transition();

        this._clearCache();
        this.rootCall.y;

        // level x
        this.levels
            .transition(transition)
                .attr('transform', datum => `translate(${datum[0].x}, 0)`);

        // callGroup y
        this.callGroups
            .transition(transition)
                .attr('transform', datum => `translate(0, ${datum.y})`)
        
        // rect height, width
        this.callRects
            .transition(transition)
                .attr('width', this.levelWidth)
                .attr('height', datum => datum.height); // TODO: collapsed as a part of height

        // infos
        this.callGroups
            .select('g.info')
            .data(datum => datum.infos)
                .enter().append('text')
                    .text(info => info)
                    .style('font-family', this.styles.info.fontFamily)
                    .style('font-size', this.styles.info.fontSize)
                .exit().remove();
    }

    render(update = false) {
        if (update) {
            this._update();
        }

        this.rootCall.y;

        let that = this;
        let d3svg = d3.select(this.svg);

        let levels = this.levels = d3svg
            .selectAll('g.level')
            .data(this.levels)
            .enter().append('g')
                .classed('level', true)
                .attr('transform', datum => `translate(${datum[0].x}, 0)`);
        
        let callGroups = this.callGroups = levels
            .selectAll('g.call')
            .data(datum => datum)
            .enter().append('g')
                .classed('call', true)
                .attr('transform', datum => `translate(0, ${datum.y})`)
                .each(function(datum) {
                    this.datum = datum;
                    datum.DOM = this;
                })
                .on('mouseover', function(datum) {
                    that.currentFunction = datum;
                    that.markEditor(currentFunction);
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
                });
        
        callGroups.append('svg:title')
            .text(datum => datum.fnName);

        this.callRect = callGroups.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', this.levelWidth) 
            .attr('pointer-events', 'visible')
            .attr('height', datum => datum.height)
            .attr('stroke', d3.hcl(0, 0, 80))
            .attr('stroke-width', '1px')
            .attr('fill', 'none');
        
        callGroups.append('text')
            .attr('x', 5)
            .attr('y', 15)
            .attr('width', this.levelWidth)
            .attr('height', datum => datum.height(callHeight, paddingY, true))
            .text(datum => datum.fnName)
            .attr('font-family', 'Cooper Hewitt, input mono compressed')
            .each(wrap(this.levelWidth, 2));   

        callGroups.append('g')
            .classed('info', true)
            .attr('transform', datum => `translate(${this.styles.default.paddingLeft}, ${
                this.styles.default.paddingTop + datum._labelHeight + this.styles.label.paddingBottom
            })`);
        
        d3svg
            .attr('width', this.levels.length * (this.calls[0].width + this.styles.default.marginRight))
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
        return new SelectionWrapper(this.callGroups);
    }
}


export var swatches = d3.scaleLinear()
    .domain([1, 7])
    .range([d3.hcl(0, 30, 90), d3.hcl(360, 30, 90)])
    .interpolate(d3.interpolateHclLong);