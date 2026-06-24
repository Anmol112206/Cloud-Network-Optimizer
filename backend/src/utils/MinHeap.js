/**
 * MinHeap Priority Queue Implementation
 * Used for efficient pathfinding algorithms (Dijkstra, A*)
 */
class MinHeap {
  constructor(comparator = (a, b) => a - b) {
    this.heap = [];
    this.comparator = comparator;
    this.elementMap = new Map(); // Track element positions for updates
  }

  parent(i) {
    return Math.floor((i - 1) / 2);
  }

  left(i) {
    return 2 * i + 1;
  }

  right(i) {
    return 2 * i + 2;
  }

  swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    this.elementMap.set(this.heap[i].id, i);
    this.elementMap.set(this.heap[j].id, j);
  }

  siftUp(i) {
    while (i > 0 && this.comparator(this.heap[i], this.heap[this.parent(i)]) < 0) {
      this.swap(i, this.parent(i));
      i = this.parent(i);
    }
  }

  siftDown(i) {
    while (true) {
      let smallest = i;
      const l = this.left(i);
      const r = this.right(i);

      if (l < this.heap.length && this.comparator(this.heap[l], this.heap[smallest]) < 0) {
        smallest = l;
      }
      if (r < this.heap.length && this.comparator(this.heap[r], this.heap[smallest]) < 0) {
        smallest = r;
      }

      if (smallest === i) break;

      this.swap(i, smallest);
      i = smallest;
    }
  }

  push(element) {
    this.heap.push(element);
    this.elementMap.set(element.id, this.heap.length - 1);
    this.siftUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;

    const min = this.heap[0];
    this.elementMap.delete(min.id);

    if (this.heap.length === 1) {
      this.heap.pop();
    } else {
      this.heap[0] = this.heap.pop();
      this.elementMap.set(this.heap[0].id, 0);
      this.siftDown(0);
    }

    return min;
  }

  update(element) {
    const idx = this.elementMap.get(element.id);
    if (idx !== undefined) {
      this.heap[idx] = element;
      this.siftUp(idx);
      this.siftDown(idx);
    }
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  size() {
    return this.heap.length;
  }
}

module.exports = MinHeap;
