export type Chainable = {
  parent?: Chainable
  child?: Chainable
  next?: Chainable
  prev?: Chainable
  id: number
}

export function makeChainable(nodes: Chainable[], parent: Chainable) {
    for (const [k, v] of nodes.entries()) {
      v.parent = parent
      if (k === 0) {
        parent.child = v
      }
      if (k > 0) {
        nodes[k - 1].next = v
        v.prev = nodes[k - 1]
      }
    }

}

/**
 * 链表遍历
 * @param node
 * @param fn
 */
export function walk<T extends Chainable>(node: T | undefined, fn: (node: T) => boolean | void) {
  let walked = new Set<number>()
  while (node) {
    const _walked = walked.has(node.id)
    if (!_walked) {
      walked.add(node.id)
      const stop = fn(node)
      if (stop) {
        break
      }
    }
    if (node.child && !_walked) {
      node = node.child as T
    } else if (node.next) {
      node = node.next as T
    } else if (node.parent) {
      node = node.parent as T
    } else {
      break
    }
  }
}

/**
 * 链表遍历，仅限同级节点
 * @param node
 * @param fn
 */
export function walkOnSibling<T extends Chainable>(node: T | undefined, fn: (node: T) => boolean | void) {
  while (node) {
    fn(node)
    node = node.next as T
  }
}

/**
 * 从链表中移除自身
 * @param node
 */
export function removeSelf(node: Chainable) {
  if (node.parent && node.parent.child === node) {
    node.parent.child = node.next
  }
  if (node.prev) {
    node.prev.next = node.next
  }
  if (node.next) {
    node.next.prev = node.prev
  }
}

/**
 * 前置插入
 * @param node 待插入节点
 * @param target
 */
export function insertBefore(node: Chainable, target: Chainable) {
  if (target.parent) {
    if (target.parent.child === target) {
      target.parent.child = node
    }
  }
  if (target.prev) {
    target.prev.next = node
  }
  node.prev = target.prev
  node.next = target
  target.prev = node
}


/**
 * 后置插入
 * @param node
 * @param target
 */
export function insertAfter(node: Chainable, target: Chainable) {
  if (target.next) {
    target.next.prev = node
  }
  node.prev = target
  node.next = target.next
  target.next = node
}
