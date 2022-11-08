export type Chainable = {
  parent?: Chainable
  child?: Chainable
  next?: Chainable
  prev?: Chainable
}

export function makeChainable(node: Chainable & { children: Chainable[] }) {
  if (node.children.length) {
    for (const [k, v] of node.children.entries()) {
      v.parent = node
      if (k === 0) {
        node.child = v
      }
      if (k > 0) {
        node.children[k - 1].next = v
        v.prev = node.children[k - 1]
      }
    }
  }
}

/**
 * 链表遍历
 * @param node
 * @param fn
 */
export function walk<T extends Chainable>(node: T | undefined, fn: (node: T) => boolean | void) {
  let skipChildren = false
  while (node) {
    const stop = fn(node)
    if (stop) {
      break
    }
    if (node.child && !skipChildren) {
      node = node.child as T
    } else if (node.next) {
      node = node.next as T
      skipChildren = false
    } else if (node.parent) {
      node = node.parent as T
      skipChildren = true
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
  while(node) {
    fn(node)
    node = node.next as T
  }
}

/**
 * 从链表中移除自身
 * @param node
 */
export function removeSelf(node: Chainable) {
  if (node.parent) {
    if (node.parent.child === node) {
      node.parent.child = node.next
    }
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
