export function makeChainable(nodes, parent) {
    for (const [k, v] of nodes.entries()) {
        v.parent = parent;
        if (k === 0) {
            parent.child = v;
        }
        if (k > 0) {
            nodes[k - 1].next = v;
            v.prev = nodes[k - 1];
        }
    }
}
export function walk(node, fn) {
    let walked = new Set();
    while (node) {
        const _walked = walked.has(node.id);
        if (!_walked) {
            walked.add(node.id);
            const stop = fn(node);
            if (stop) {
                break;
            }
        }
        if (node.child && !_walked) {
            node = node.child;
        }
        else if (node.next) {
            node = node.next;
        }
        else if (node.parent) {
            node = node.parent;
        }
        else {
            break;
        }
    }
}
export function walkOnSibling(node, fn) {
    while (node) {
        fn(node);
        node = node.next;
    }
}
export function removeSelf(node) {
    if (node.parent && node.parent.child === node) {
        node.parent.child = node.next;
    }
    if (node.prev) {
        node.prev.next = node.next;
    }
    if (node.next) {
        node.next.prev = node.prev;
    }
}
export function insertBefore(node, target) {
    if (target.parent) {
        if (target.parent.child === target) {
            target.parent.child = node;
        }
    }
    if (target.prev) {
        target.prev.next = node;
    }
    node.prev = target.prev;
    node.next = target;
    target.prev = node;
}
export function insertAfter(node, target) {
    if (target.next) {
        target.next.prev = node;
    }
    node.prev = target;
    node.next = target.next;
    target.next = node;
}
