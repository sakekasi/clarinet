// greedy graph coloring algo for color allocation in clarinet

// from wikipedia:
/*
A commonly used ordering for greedy coloring is to 

* choose a vertex v of minimum degree, order the remaining vertices, and then place v last in the ordering.
* If every subgraph of a graph G contains a vertex of degree at most d, then the greedy coloring for this ordering will use at most d + 1 colors.
*/

export default function colorGraph(g) {
    console.error(g);
  var vertecies = sortVerteciesByDegree(g);
  var alloc = allocateColorsFor(vertecies, g); 
  console.error(alloc);
  return alloc;
}

// order vertecies by degree
function sortVerteciesByDegree(g) {
  var vertecies = Object.keys(g);
  return vertecies.sort(function degreeComparator(a, b) {
    var aLength = g[a].length;
    var bLength = g[b].length;
    return aLength > bLength ? -1 : aLength === bLength ? 0 : 1;
  });
}

function allocateColorsFor(vertecies, g) {
  var currentColor = 0;
  var allocation = {};
  vertecies.forEach(function allocateVertex(v) {
    var adjacent = g[v].slice();
    var adjacentAllocated = adjacent
    	.filter(function isAllocated(v2) {
          return allocation.hasOwnProperty(v2);
        });
    var adjacentValues = adjacentAllocated
    	.map(function getAllocation(v) { return allocation[v]; });
    
    for (var i = 0; i < currentColor; i++) {
      if (!adjacentValues.includes(i)) {
        allocation[v] = i;
        break;
      }
    }
    if (! allocation.hasOwnProperty(v)) {
        console.error(v, currentColor);
      allocation[v] = currentColor++;
    }
  });
  return {allocation: allocation, max: currentColor};
}