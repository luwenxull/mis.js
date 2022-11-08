export function makeChainable(node) {
    if (node.children.length) {
        for (const [k, v] of node.children.entries()) {
            v.parent = node;
            if (k === 0) {
                node.child = v;
            }
            if (k > 0) {
                node.children[k - 1].next = v;
                v.prev = node.children[k - 1];
            }
        }
    }
}
export function walk(node, fn) {
    let skipChildren = false;
    while (node) {
        const stop = fn(node);
        if (stop) {
            break;
        }
        if (node.child && !skipChildren) {
            node = node.child;
        }
        else if (node.next) {
            node = node.next;
            skipChildren = false;
        }
        else if (node.parent) {
            node = node.parent;
            skipChildren = true;
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
    if (node.parent) {
        if (node.parent.child === node) {
            node.parent.child = node.next;
        }
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
