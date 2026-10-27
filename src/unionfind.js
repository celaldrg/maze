/**
 * Disjoint-set forest (union-find) used by the Kruskal generator.
 * @module unionfind
 */

/**
 * @typedef {object} UnionFind
 * @property {(item: number) => number} find Representative of the item's set.
 * @property {(a: number, b: number) => boolean} union Merge two sets; false when already joined.
 * @property {number} count Number of disjoint sets left (read-only).
 */

/**
 * Create a union-find over the items 0..size-1, with path compression and union by rank.
 * @param {number} size
 * @returns {UnionFind}
 */
export function createUnionFind(size) {
  const parent = Int32Array.from({ length: size }, (_, i) => i);
  const rank = new Uint8Array(size);
  let sets = size;

  function find(item) {
    let root = item;
    while (parent[root] !== root) root = parent[root];
    let node = item;
    while (parent[node] !== root) {
      const next = parent[node];
      parent[node] = root;
      node = next;
    }
    return root;
  }

  function union(a, b) {
    let rootA = find(a);
    let rootB = find(b);
    if (rootA === rootB) return false;
    if (rank[rootA] < rank[rootB]) [rootA, rootB] = [rootB, rootA];
    parent[rootB] = rootA;
    if (rank[rootA] === rank[rootB]) rank[rootA] += 1;
    sets -= 1;
    return true;
  }

  return {
    find,
    union,
    get count() {
      return sets;
    },
  };
}
