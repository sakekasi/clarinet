import {$, deepFreeze, breadthFirstTraversal, depthFirstTraversal, DOM} from "./utils";
import * as d3 from "d3";
window.d3 = d3;

import CallWrapper from "./call-wrapper";
import SelectionWrapper from "./selection-wrapper";

// binary chop
// function wrap(width, padding) {
//     let memo = {};
//     return function() {
//         let self = d3.select(this),
//             textLength = self.node().getComputedTextLength(),
//             text = self.text(),
//             origText = text;
        
//         if (memo.hasOwnProperty(origText)) {
//             self.text(memo[origText]);
//         } else {
//             while (textLength > (width - (2 * padding)) && text.length > 0) {
//                 text = text.slice(0, -1);
//                 self.text(text + '…');
//                 textLength = self.node().getComputedTextLength();
//             }
//             memo[origText] = self.text();
//         }
//     };
// } 

export default class FlameGraph {
    constructor(container, editor, calls) {
        this.currentFunction = null;
        this.container = container;
        this.editor = editor;

        this.rootCall = new CallWrapper(calls, this);
        this.flatCalls = [];
        depthFirstTraversal(this.rootCall, (call) => {
            this.flatCalls.push(call)
        });

        this.callToElement = new WeakMap();
        this.elementToCall = new WeakMap();
        this._cached = Object.create(null);

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
                paddingBottom: 2
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

    _clearCache() { this._cached = Object.create(null); }
    _clearCallsCache() {
        depthFirstTraversal(this.events, (call) => {
            call._clearCache();
        });
    }

    render() {
        let that = this;

        breadthFirstTraversal(this.rootCall, (call) => {
            let element = FlameGraph._makeElement(call);

            this.callToElement.set(call, element);
            this.elementToCall.set(element, call);

            if (call.parent === null) {
                this.container.appendChild(element);
            } else {
                let parentElement = this.callToElement.get(call.parent);
                parentElement
                .querySelector('div.children')
                .appendChild(element);
            }
        });

        this.selection
            .on('mouseover', function(call) {
                that.currentFunction = call;
                markEditor(that.editor, that.currentFunction);
                d3.select(that.callToElement.get(that.currentFunction))
                    .classed('currentFunction', true);

                let current = that.currentFunction;
                while (current !== null) {
                    d3.select(that.callToElement.get(current))
                        .classed('callStack', true);
                    current = current.parent;
                }
            })
            .on('mouseout', function(call) {
                clearEditorMarks(that.editor);
                d3.select(that.callToElement.get(that.currentFunction))
                    .classed('currentFunction', false);

                let current = that.currentFunction;
                that.currentFunction = null;
                while (current !== null) {
                    d3.select(that.callToElement.get(current))
                        .classed('callStack', false);
                    current = current.parent;
                }
            });
  }

  update() {
    let selection = this.selection;

    selection
        .classed('collapsed', wrapper => wrapper.collapsed);
    
    let infos = selection
        .select('ul.infos')
        .selectAll('li.info')
        .data(wrapper => wrapper.infos);
    
    infos
        .enter()
            .append('li')
            .classed('info', true)
        .merge(infos)
            .text(info => info)
        .exit()
            .remove();
  }

  static _makeElement(call) {
    /**
     * <div class="call">
     *   <div class="contents">
     *     <span class="label">ProgramExecution</span>
     *     <ul class="infos">
     *       <li class="info">runtime: 5s</li>
     *     </ul>
     *   </div>
     *   <div class="children">
     *     <div class="event">...</div>
     *     ...
     *   </div>
     * </div>
     */

    let ans = DOM('div.call',
      FlameGraph._makeContent(call),
      DOM('div.children')
    );
    ans.__call__ = call;
    return ans;
  }

  static _makeContent(call) {
    /**
     *   <div class="contents">
     *     <div class="label">ProgramExecution</span>
     *     <ul class="infos">
     *       <li class="info">runtime: 5s</li>
     *     </ul>
     *   </div>
     */

    var label = DOM('div.label', call.fnName);
    label.setAttribute('title', call.fnName);
    var ans = DOM('div.contents',
      label,
      DOM('ul.infos', ...call.infos.map(info => DOM('li.info', info)))
    );
    ans.setAttribute('title', call.fnName);
    return ans;
  }

    get data() {
        return new SelectionWrapper(this.selection, this);
    }

    get selection() {
        if ('selection' in this._cached) {
            return this._cached.selection;
        } else {
            let that = this;
            return this._cached.selection = d3.select(this.container)
                .selectAll('div.contents')
                .data(this.flatCalls, function(call) {
                    return call ? call.id : that.elementToCall.get(this.parentElement).id;
                });
        }
    }
}

function markEditor(editor, fn) {
    if (fn.location == null) {
        return;
    }

    editor.markText(
        {line: fn.location.start.line-1, ch: fn.location.start.column},
        {line: fn.location.end.line-1, ch: fn.location.end.column},
        {className: 'highlight'}
    );
}

function clearEditorMarks(editor) {
    editor.getAllMarks()
        .forEach(mark => mark.clear());
}

export var swatches = d3.scaleLinear()
    .domain([1, 7])
    .range([d3.hcl(0, 30, 90), d3.hcl(360, 30, 90)])
    .interpolate(d3.interpolateHclLong);