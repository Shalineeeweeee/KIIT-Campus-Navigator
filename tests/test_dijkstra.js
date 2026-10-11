const assert = require('node:assert/strict');
const { dijkstra, kShortestPaths } = require('../shortest-path.js');

function edge(start, end, distance, bidirectional = true, accessible = true) {
  return { start, end, distance, bidirectional, accessible, routeType: 'corridor' };
}
const graph = {
  nodes: ['A', 'B', 'C', 'D', 'E', 'X'].map(id => ({ id })),
  edges: [
    edge('A', 'B', 4),
    edge('B', 'D', 4),
    edge('A', 'C', 2),
    edge('C', 'D', 3),
    edge('A', 'D', 10),
    edge('D', 'E', 1),
    edge('B', 'C', 1, true, false)
  ]
};

// 1. Dijkstra chooses the lowest total weight: A -> C -> D = 5.
assert.deepEqual(dijkstra(graph, 'A', 'D').nodes, ['A', 'C', 'D']);
assert.equal(dijkstra(graph, 'A', 'D').distance, 5);

// 2. A route from a node to itself is zero steps.
assert.deepEqual(dijkstra(graph, 'A', 'A'), { nodes: ['A'], edges: [], distance: 0 });

// 3. Unknown or disconnected endpoints return null.
assert.equal(dijkstra(graph, 'missing', 'A'), null);
assert.equal(dijkstra(graph, 'A', 'X'), null);

// 4. Accessible mode must not use inaccessible edges.
const accessibleRoute = dijkstra(graph, 'A', 'D', { accessible: true });
assert.equal(accessibleRoute.distance, 5);
assert.deepEqual(accessibleRoute.nodes, ['A', 'C', 'D']);

// 5. A blocked edge is avoided.
const blockedRoute = dijkstra(graph, 'A', 'D', { blockedEdges: ['C|D', 'D|C'] });
assert.equal(blockedRoute.distance, 7);
assert.deepEqual(blockedRoute.nodes, ['A', 'C', 'B', 'D']);

// 6. K-shortest paths are distinct and sorted by total distance.
const routes = kShortestPaths(graph, 'A', 'D', 3);
assert.equal(routes.length, 3);
assert.deepEqual(routes.map(route => route.distance), [5, 7, 8]);
assert.equal(new Set(routes.map(route => route.nodes.join('>'))).size, routes.length);
for (let i = 1; i < routes.length; i++) {
  assert.ok(routes[i - 1].distance <= routes[i].distance);
}

// 7. Accessible mode cannot use staircase nodes.
const stairGraph = {
  nodes: [{ id: 'S' }, { id: 'STAIR', type: 'stair' }, { id: 'T' }],
  edges: [edge('S', 'STAIR', 2), edge('STAIR', 'T', 2)]
};
assert.equal(dijkstra(stairGraph, 'S', 'T', { accessible: true }), null);

// 8. Zero and negative weights are ignored (walking-step edges must be positive).
const invalidWeightGraph = {
  nodes: [{ id: 'S' }, { id: 'T' }],
  edges: [edge('S', 'T', -3)]
};
assert.equal(dijkstra(invalidWeightGraph, 'S', 'T'), null);

console.log('All 8 shortest-path tests passed.');
