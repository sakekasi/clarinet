queryCalls(call => call.isError).select('text').style('fill', 'red');
queryCalls(call => 'key' in call.tags).each(function(datum) {
  d3.select(this).append('text').text(datum.tags.key+ ' ' + datum.tags.dist);
});

nextSwatch(queryCalls(call => 'less' in call.tags));

queryCalls(call => call.children.some(c => 'current' in c.tags))
	.each(function(datum) {
  		let {current, currentDist} = datum.children.find(c => 'current' in c.tags).tags;
  		d3.select(this).append('text').text(current + ' ' + currentDist);
	});

//------------------------------------------------

// Dijkstra's algorithm

function shortestPath(graph, node) {
  var dist = {};
  Object.keys(graph)
  	.forEach(function setupVertex(key) {
    	dist[key] = Infinity; 
  	});
  
  dist[node] = 0;
  
  var vertecies = Object.keys(graph);
  while (vertecies.length !== 0) {
    var current = vertexWithMinDist(vertecies, dist);
    var currentDist = dist[current];
    Object.keys(graph[current].edges)
      .forEach(function forEachEdge(key) {
      	TAG('current', current);
      	TAG('currentDist', dist[current]);
      	TAG('key', key);
      	var candidateDist = currentDist + graph[current].edges[key];
      	if (candidateDist < dist[key]) {
          TAG('less');
          dist[key] = candidateDist;
        }
      	TAG('dist', dist[key]);
      });
  }
  return dist;
}

function vertexWithMinDist(vertecies, dist) {
  var indexWithMinDist = -1;
  vertecies
  	.forEach(function vertexDist(vertex, i) {
    	if (indexWithMinDist === -1) {
          indexWithMinDist = i;
          return;
        } 
    	if (dist[vertex] < dist[vertecies[indexWithMinDist]]) {
          indexWithMinDist = i;
        }
  	});
             
  var ans = vertecies[indexWithMinDist];
  vertecies.splice(indexWithMinDist, 1);
  return ans;
}

function makeNode(data, edges) {
  return {
    data: data,
    edges: edges
  };
}

function weight(graph, src, dest) {
  return graph[src].edges[dest] || Infinity;
}

var g = {};

function init() {
  g.a = makeNode('a', {
    b: 1, c: 10, d: 6
  });
  g.b = makeNode('b', {
    e: 30, a: 1
  });
  g.c = makeNode('c', {
    e: 2, a: 10
  });
  g.d = makeNode('d', {
    f: 9, a: 6
  });
  g.e = makeNode('e', {
    f: 4, b: 30, c: 2
  });
  g.f = makeNode('f', {
    d: 9, e: 4
  });
}

function TOPLEVEL() {
  init();
  console.log(JSON.stringify(g));
  console.log(JSON.stringify(shortestPath(g, 'a')));
}

TOPLEVEL();