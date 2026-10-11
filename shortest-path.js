/* Reusable shortest-path algorithms for the KIIT Campus Navigator.
   Uses positive edge weights measured in walking steps. */
(function (root) {
  "use strict";

  function buildAdjacency(data) {
    const adjacency = new Map();
    for (const node of data.nodes || []) adjacency.set(node.id, []);

    for (const edge of data.edges || []) {
      if (!adjacency.has(edge.start) || !adjacency.has(edge.end)) continue;
      const weight = Number(edge.distance);
      if (!Number.isFinite(weight) || weight <= 0) continue;

      adjacency.get(edge.start).push({ to: edge.end, edge });
      if (edge.bidirectional) {
        adjacency.get(edge.end).push({
          to: edge.start,
          edge: { ...edge, start: edge.end, end: edge.start }
        });
      }
    }
    return adjacency;
  }

  // A small binary min-heap avoids sorting the entire queue on every iteration.
  class MinHeap {
    constructor() { this.items = []; }
    get size() { return this.items.length; }
    push(item) {
      const a = this.items;
      a.push(item);
      let i = a.length - 1;
      while (i > 0) {
        const parent = Math.floor((i - 1) / 2);
        if (a[parent][0] <= a[i][0]) break;
        [a[parent], a[i]] = [a[i], a[parent]];
        i = parent;
      }
    }
    pop() {
      const a = this.items;
      if (!a.length) return null;
      const first = a[0];
      const last = a.pop();
      if (a.length) {
        a[0] = last;
        let i = 0;
        while (true) {
          const left = 2 * i + 1;
          const right = left + 1;
          let smallest = i;
          if (left < a.length && a[left][0] < a[smallest][0]) smallest = left;
          if (right < a.length && a[right][0] < a[smallest][0]) smallest = right;
          if (smallest === i) break;
          [a[i], a[smallest]] = [a[smallest], a[i]];
          i = smallest;
        }
      }
      return first;
    }
  }

  function dijkstra(data, source, target, options = {}) {
    const adjacency = buildAdjacency(data);
    const nodeById = new Map((data.nodes || []).map(node => [node.id, node]));
    const blockedNodes = new Set(options.blockedNodes || []);
    const blockedEdges = new Set(options.blockedEdges || []);

    if (!adjacency.has(source) || !adjacency.has(target)) return null;
    if (blockedNodes.has(source) || blockedNodes.has(target)) return null;
    if (options.accessible && (nodeById.get(source)?.type === "stair" || nodeById.get(target)?.type === "stair")) return null;

    const distances = new Map();
    const previous = new Map();
    const visited = new Set();
    for (const id of adjacency.keys()) distances.set(id, Infinity);
    distances.set(source, 0);

    const heap = new MinHeap();
    heap.push([0, source]);

    while (heap.size) {
      const [distance, current] = heap.pop();
      if (visited.has(current)) continue;
      if (distance !== distances.get(current)) continue;
      visited.add(current);
      if (current === target) break;

      for (const item of adjacency.get(current) || []) {
        const next = item.to;
        const edge = item.edge;
        if (visited.has(next) || blockedNodes.has(next)) continue;
        if (blockedEdges.has(`${current}|${next}`)) continue;
        if (options.accessible && (edge.accessible === false || nodeById.get(next)?.type === "stair")) continue;

        const weight = Number(edge.distance);
        // Campus edge weights are positive walking-step counts.
        if (!Number.isFinite(weight) || weight <= 0) continue;

        const candidate = distance + weight;
        if (candidate < distances.get(next)) {
          distances.set(next, candidate);
          previous.set(next, { node: current, edge });
          heap.push([candidate, next]);
        }
      }
    }

    if (!Number.isFinite(distances.get(target))) return null;

    const nodes = [];
    const edges = [];
    let current = target;
    while (current !== source) {
      nodes.push(current);
      const predecessor = previous.get(current);
      if (!predecessor) return null;
      edges.push(predecessor.edge);
      current = predecessor.node;
    }
    nodes.push(source);
    nodes.reverse();
    edges.reverse();

    return { nodes, edges, distance: distances.get(target) };
  }

  // Yen's algorithm for loopless K-shortest paths.
  function kShortestPaths(data, source, target, k = 3, options = {}) {
    const limit = Math.max(1, Math.floor(Number(k) || 1));
    const first = dijkstra(data, source, target, options);
    if (!first) return [];

    const accepted = [first];
    const acceptedKeys = new Set([first.nodes.join(">")]);
    const candidateKeys = new Set();
    const candidates = [];

    for (let count = 1; count < limit; count++) {
      const previousPath = accepted[count - 1];

      for (let i = 0; i < previousPath.nodes.length - 1; i++) {
        const spurNode = previousPath.nodes[i];
        const rootNodes = previousPath.nodes.slice(0, i + 1);
        const rootEdges = previousPath.edges.slice(0, i);
        const rootDistance = rootEdges.reduce((sum, edge) => sum + Number(edge.distance), 0);
        const blockedEdges = new Set(options.blockedEdges || []);

        for (const path of accepted) {
          const sameRoot = path.nodes.length > i &&
            path.nodes.slice(0, i + 1).join(">") === rootNodes.join(">");
          if (!sameRoot) continue;

          const edge = path.edges[i];
          if (!edge) continue;
          const a = path.nodes[i];
          const b = path.nodes[i + 1];
          blockedEdges.add(`${a}|${b}`);
          // In this campus graph, bidirectional corridors are one undirected connection.
          if (edge.bidirectional) blockedEdges.add(`${b}|${a}`);
        }

        const blockedNodes = new Set([
          ...(options.blockedNodes || []),
          ...rootNodes.slice(0, -1)
        ]);
        const spur = dijkstra(data, spurNode, target, {
          ...options,
          blockedEdges: [...blockedEdges],
          blockedNodes: [...blockedNodes]
        });
        if (!spur) continue;

        const nodes = rootNodes.slice(0, -1).concat(spur.nodes);
        const edges = rootEdges.concat(spur.edges);
        const candidate = {
          nodes,
          edges,
          distance: rootDistance + spur.distance
        };
        const key = nodes.join(">");
        if (!acceptedKeys.has(key) && !candidateKeys.has(key)) {
          candidates.push(candidate);
          candidateKeys.add(key);
        }
      }

      if (!candidates.length) break;
      candidates.sort((a, b) => a.distance - b.distance);
      const next = candidates.shift();
      candidateKeys.delete(next.nodes.join(">"));
      accepted.push(next);
      acceptedKeys.add(next.nodes.join(">"));
    }

    return accepted;
  }

  const api = { buildAdjacency, dijkstra, kShortestPaths };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.ShortestPath = api;
})(typeof window !== "undefined" ? window : globalThis);
