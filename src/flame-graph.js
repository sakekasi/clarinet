import {$} from "./utils";
import * as d3 from "d3";

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

export default function flameGraph(svg, calls, rootCall) {
    let currentFunction = null;
    let levels = [];
    let allCalls = Object.keys(calls)
        .map(key => calls[key])
        .reduce((agg, b) => agg.concat(b), []);

    // assign each call a level (root is 0)
    allCalls.forEach(call => {
        if (!levels.hasOwnProperty(call.level)) {
            levels[call.level] = [];
        }
        levels[call.level].push(call);
    });

    // vertical ordering is by uid (time of call)
    Object.keys(levels)
        .forEach(key => levels[key].sort((a, b) => a.uid < b.uid ? -1 : a.uid === b.uid ? 0 : 1));

    const callWidth = 150,
        callHeight = 20,
        paddingY = 5,
        paddingX = 5;

    rootCall.height(callHeight, paddingY);
    
    rootCall.calculateY(callHeight, paddingY);

    d3svg = d3.select(svg);

    let d3levels = d3svg
        .selectAll('g.level')
        .data(levels)
        .enter().append('g')
            .attr('class', 'level')
            .attr('transform', datum => `translate(${datum[0].level * (callWidth + paddingX)}, 0)`)
            .each(function(datum) {
                let g = d3.select(this)
                    .selectAll('g.call')
                    .data(datum)
                    .enter().append('g')
                        .attr('class', 'call')
                        .attr('transform', datum => `translate(0,${datum.y})`)
                        .each(function(datum) { 
                            this.datum = datum;
                            datum.DOM = this; 
                        })
                        .on('mouseover', function(datum) {
                            currentFunction = datum;
                            d3.select(currentFunction.DOM)
                                .classed('currentFunction', true);

                            let current = currentFunction;
                            while (current !== null) {
                                d3.select(current.DOM)
                                    .style('font-weight', 600)
                                    .classed('callStack', true);
                                current = current.parent;
                            }

                            let printable = {
                                name: currentFunction.fnName, 
                                args: currentFunction.args, 
                                returnValue: currentFunction.returnValue,
                                uid: currentFunction.uid
                            };
                            $('#currentCall').textContent = JSON.stringify(printable, null, 2);
                        })
                        .on('mouseout', function(datum) {
                            d3.select(currentFunction.DOM)
                                .classed('currentFunction', false);

                            currentFunction = null;
                            let current = datum;
                            while (current !== null) {
                                d3.select(current.DOM)
                                    .style('font-weight', 'normal')
                                    .classed('callStack', false);
                                current = current.parent;
                            }
                        })

                g.append('svg:title')
                    .text(datum => datum.fnName);
                
                g.append('rect')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', callWidth)
                    .attr('pointer-events', 'visible')
                    .attr('height', datum => datum.height(callHeight, paddingY, true))
                    .attr('stroke', d3.hcl(0, 0, 80))
                    .attr('stroke-width', '1px')
                    .attr('fill', 'none');
                
                g.append('text')
                    .attr('x', 5)
                    .attr('y', 15)
                    .attr('width', callWidth)
                    .attr('height', datum => datum.height(callHeight, paddingY, true))
                    .text(datum => datum.fnName)
                    .attr('font-family', 'Cooper Hewitt, input mono compressed')
                    .each(wrap(callWidth, 2));   

                g.exit().remove();
            })
        .exit().remove();

    d3svg
        .attr('width', levels.length * (callWidth + paddingX))
        .attr('height', rootCall.height(callHeight, paddingY, true));
}

export function query(predicate) {
    return d3.selectAll('g.call')
        .filter(function(datum) { return predicate(this.datum); });
}

export function forEachCall(fn, predicate = (_) => true) {
    return d3.selectAll('g.call')
        .filter(function(datum) { return predicate(this.datum); })
        .each(function(datum) { return fn(this.datum); })
}

export var swatches = d3.scaleLinear()
    .domain([1, 7])
    .range([d3.hcl(0, 30, 80), d3.hcl(360, 30, 80)])
    .interpolate(d3.interpolateHclLong);