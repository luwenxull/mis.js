import { insertAfter, insertBefore, makeChainable, removeSelf, walk, walkOnSibling } from "./chain";
import { useSignal } from "./signal";
import { registerUpdater } from "./updater";
const globalMountStack = [];
const STATUS_CRAETED = 0;
const STATUS_MOUNTED = 1;
const STATUS_UNMOUNTED = 2;
export function hook(lifeTime, fn) {
    const ele = globalMountStack[globalMountStack.length - 1];
    ele.hooks[lifeTime] = fn;
}
function isDomElement(element) {
    return typeof element.type === 'string';
}
function unmount(ele) {
    const removed = new Set();
    walk(ele, next => {
        if (next === ele.next || next === ele.parent)
            return true;
        if (next.status !== STATUS_UNMOUNTED) {
            next.status = STATUS_UNMOUNTED;
            if (next.hooks.destroyed) {
                next.hooks.destroyed(next);
            }
            if (next.$dom && next.$parent) {
                if (!removed.has(next.$parent)) {
                    next.$parent.removeChild(next.$dom);
                }
                removed.add(next.$dom);
                next.$dom = undefined;
                next.$parent = undefined;
            }
        }
    });
}
export function mount(element, $parent) {
    globalMountStack.push(element);
    element.status = STATUS_MOUNTED;
    element.$parent = $parent;
    if (isDomElement(element)) {
        const $dom = document.createElement(element.type);
        element.$dom = $dom;
        makeChainable(element.children.map(transformChild), element);
        walkOnSibling(element.child, (child) => {
            mount(child, $dom);
        });
        if (element.props) {
            if (element.props.style) {
                const { style } = element.props;
                if (typeof style === 'function') {
                    const { current, undepAll } = registerUpdater({
                        collect: style,
                        update: (value) => {
                            Object.assign($dom.style, value);
                        }
                    });
                    Object.assign($dom.style, current);
                    hook('destroyed', undepAll);
                }
                else {
                    Object.assign($dom.style, style);
                }
            }
            if (element.props.on) {
                const on = element.props.on;
                for (const key of Object.keys(on)) {
                    $dom.addEventListener(key, on[key]);
                }
            }
        }
    }
    else {
        if (element.type === _DOM) {
            const { props: { dom } } = element;
            if (dom !== null) {
                element.$dom = dom;
            }
        }
        else {
            makeChainable([].concat(element.type(element.props)).map(transformChild), element);
            if (element.type === Forward) {
                $parent = element.props.parent;
            }
            walkOnSibling(element.child, (child) => {
                mount(child, $parent);
            });
        }
        if (element.hooks.created) {
            element.hooks.created(element);
        }
    }
    globalMountStack.pop();
}
function _DOM(props) {
    return createElement(() => null, {
        dom: props.dom
    });
}
export function Text(props) {
    if (typeof props.text !== 'function') {
        return createElement(_DOM, {
            dom: document.createTextNode(props.text)
        });
    }
    const { current, undepAll } = registerUpdater({
        collect: props.text,
        update: (v) => tn.textContent = v,
    });
    const tn = document.createTextNode(current);
    hook('destroyed', undepAll);
    return createElement(_DOM, {
        dom: tn
    });
}
function findDupKey(list, key) {
    const keys = new Set();
    for (const item of list) {
        const _key = String(item[key]);
        if (keys.has(_key)) {
            return _key;
        }
        keys.add(_key);
    }
}
function findDomParent(ele, $parent) {
    while (ele) {
        if (ele.$dom === $parent)
            return ele;
        if (ele.type === Forward)
            return ele;
        if (ele.parent) {
            ele = ele.parent;
        }
        else {
            break;
        }
    }
    return ele;
}
function findFirstDom(ele, stopAt, $parent) {
    let sibling = null;
    walk(ele, next => {
        if (next === stopAt)
            return true;
        if (next.$dom && next.$parent === $parent) {
            sibling = next.$dom;
            return true;
        }
    });
    return sibling;
}
function findSelfDom(ele) {
    const doms = [];
    walk(ele, next => {
        if (next === ele.next || next === ele.parent)
            return true;
        if (next.$dom && next.$parent === ele.$parent) {
            doms.push(next.$dom);
        }
    });
    return doms;
}
export function Condition(props) {
    if (typeof props.condition !== 'function') {
        return props.render(props.condition);
    }
    const ele = globalMountStack[globalMountStack.length - 1];
    const { current, undepAll } = registerUpdater({
        collect: props.condition,
        update: (v) => {
            const { $parent } = ele;
            if (!$parent)
                return;
            walkOnSibling(ele.child, child => {
                unmount(child);
            });
            const sibling = findFirstDom(ele.next, findDomParent(ele, $parent), $parent);
            makeChainable([].concat(props.render(v)).map(transformChild), ele);
            walkOnSibling(ele.child, child => {
                renderDom(child, $parent, sibling);
            });
        },
    });
    hook('destroyed', undepAll);
    return props.render(current);
}
export function Forward(props) {
    return props.render();
}
export function makeList(collect, render, key, equal) {
    let map = {};
    const $start = document.createComment('@S'), $end = document.createComment('@E');
    let innerList = null;
    function update(list) {
        if (innerList && innerList.$parent) {
            const useKey = shouldUseKey(list);
            const { $parent } = innerList;
            let prev = undefined;
            for (const [i, v] of list.entries()) {
                const _key = useKey ? v[key] : i;
                if (Object.prototype.hasOwnProperty.call(map, _key)) {
                    const [itemSig, indexSig, ele] = map[_key];
                    itemSig[1](v);
                    indexSig[1](i);
                    if (!prev) {
                        if (ele.prev) {
                            removeSelf(ele);
                            const f = ele.parent.child;
                            insertBefore(ele, f);
                            const sibling = findFirstDom(f, findDomParent(ele, $parent), $parent);
                            for (const dom of findSelfDom(ele)) {
                                $parent.insertBefore(dom, sibling);
                            }
                        }
                    }
                    else {
                        if (prev.next !== ele) {
                            const sibling = prev.next
                                ? findFirstDom(prev.next, findDomParent(ele, $parent), $parent)
                                : $end;
                            removeSelf(ele);
                            insertAfter(ele, prev);
                            for (const dom of findSelfDom(ele)) {
                                $parent.insertBefore(dom, sibling);
                            }
                        }
                    }
                    prev = ele;
                }
                else {
                    const [, , ele] = renderToResult(v, i, _key);
                    ele.parent = innerList;
                    if (!prev) {
                        if (ele.parent.child) {
                            const sibling = findFirstDom(ele.parent.child, findDomParent(ele, $parent), $parent);
                            insertBefore(ele, ele.parent.child);
                            renderDom(ele, $parent, sibling);
                        }
                        else {
                            ele.parent.child = ele;
                            renderDom(ele, $parent, $end);
                        }
                    }
                    else {
                        const sibling = prev.next ? findFirstDom(prev.next, findDomParent(ele, $parent), $parent) : $end;
                        insertAfter(ele, prev);
                        renderDom(ele, $parent, sibling);
                    }
                    prev = ele;
                }
            }
            walkOnSibling(prev === null || prev === void 0 ? void 0 : prev.next, child => {
                unmount(child);
            });
            const children = [];
            walkOnSibling(innerList.child, child => {
                children.push(child);
            });
            innerList.children = children;
        }
    }
    function renderToResult(item, index, key) {
        const itemSig = useSignal(item), indexSig = useSignal(index), ele = transformChild(render(itemSig, indexSig[0]));
        const result = [itemSig, indexSig, ele];
        map[key] = result;
        return result;
    }
    function shouldUseKey(list) {
        if (typeof key === 'string') {
            const dup = findDupKey(list, key);
            if (dup === undefined) {
                return true;
            }
            else {
                console.error(`Duplicate key: "${dup}"`);
            }
        }
        return false;
    }
    return {
        update,
        List: function ListWrapper() {
            return [
                createElement(_DOM, {
                    dom: $start
                }),
                createElement(function List() {
                    let list = [], undepAll;
                    if (typeof collect == 'function') {
                        const { undepAll: _undepAll, current } = registerUpdater({
                            collect,
                            update,
                        });
                        undepAll = _undepAll;
                        list = current;
                    }
                    else {
                        list = collect;
                    }
                    hook('created', (ele) => {
                        innerList = ele;
                    });
                    hook('destroyed', () => {
                        if (typeof undepAll === 'function') {
                            undepAll();
                        }
                    });
                    const useKey = shouldUseKey(list), results = list.map((item, i) => renderToResult(item, i, useKey ? item[key] : i));
                    return results.map(r => r[2]);
                }),
                createElement(_DOM, {
                    dom: $end,
                })
            ];
        }
    };
}
function transformChild(child) {
    if (typeof child === 'string' || typeof child === 'number') {
        return createElement(_DOM, {
            dom: document.createTextNode(String(child))
        });
    }
    else if (child === null || child === undefined) {
        return createElement(_DOM, {
            dom: null,
        });
    }
    else {
        return child;
    }
}
export function renderDom(ele, root, sibling = null) {
    const df = document.createDocumentFragment();
    mount(ele, df);
    walk(ele, next => {
        if (next === ele.next || next === ele.parent)
            return true;
        if (next.$dom && next.$parent) {
            next.$parent.appendChild(next.$dom);
        }
        if (next.$parent === df) {
            next.$parent = root;
        }
    });
    root.insertBefore(df, sibling);
}
let ID = 0;
export function createElement(type, props, ...children) {
    return {
        type,
        children,
        props,
        hooks: {},
        status: STATUS_CRAETED,
        id: ID++
    };
}
