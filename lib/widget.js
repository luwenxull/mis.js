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
function unmount(ele, prtDomRemoved = false) {
    if (ele.$parent) {
        removeSelf(ele);
        if (ele.$dom) {
            if (!prtDomRemoved) {
                ele.$parent.removeChild(ele.$dom);
            }
            prtDomRemoved = true;
        }
        ele.status = STATUS_UNMOUNTED;
        if (ele.hooks.destroyed) {
            ele.hooks.destroyed(ele);
        }
        if (ele.type === Forward) {
            prtDomRemoved = false;
        }
        walkOnSibling(ele.child, (child) => {
            unmount(child, prtDomRemoved);
        });
    }
}
export function mount(element, $parent) {
    element.status = STATUS_MOUNTED;
    element.$parent = $parent;
    if (isDomElement(element)) {
        element.$dom = document.createElement(element.type);
        element.children = element.children.map(transformChild);
        makeChainable(element);
        walkOnSibling(element.child, (child) => {
            mount(child, element.$dom);
        });
        if (element.props) {
            for (const key of Object.keys(element.props)) {
                if (key === 'on') {
                    const on = element.props[key];
                    for (const key of Object.keys(on)) {
                        element.$dom.addEventListener(key, on[key]);
                    }
                }
            }
        }
        if (element.hooks.created) {
            element.hooks.created(element);
        }
    }
    else {
        globalMountStack.push(element);
        if (element.type === _DOM) {
            const { props: { dom } } = element;
            if (dom !== null) {
                element.$dom = dom;
            }
        }
        else {
            element.children = [].concat(element.type(element.props)).map(transformChild);
            makeChainable(element);
            if (element.type === Forward) {
                $parent = element.props.parent;
            }
            walkOnSibling(element.child, (child) => {
                mount(child, $parent);
            });
        }
        globalMountStack.pop();
        if (element.hooks.created) {
            element.hooks.created(element);
        }
    }
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
function findDomParent(ele) {
    while (ele) {
        if (ele.parent) {
            if (ele.parent.$dom || ele.parent.type === Forward) {
                return ele.parent;
            }
            else {
                ele = ele.parent;
            }
        }
        else {
            return ele;
        }
    }
}
function findSiblingDom(ele) {
    let domParent = findDomParent(ele), sibling = null;
    walk(ele, next => {
        if (next === domParent)
            return true;
        if (next.$dom && next.$parent === ele.$parent) {
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
            walkOnSibling(ele.child, child => {
                unmount(child);
            });
            const sibling = findSiblingDom(ele);
            ele.children = [].concat(props.render(v)).map(transformChild);
            makeChainable(ele);
            walkOnSibling(ele.child, child => {
                renderDom(child, ele.$parent, sibling);
            });
        },
    });
    hook('destroyed', undepAll);
    return props.render(current);
}
export function Forward(props) {
    return props.render();
}
export function makeList(getter, render, key, equal) {
    let map = {};
    const $start = document.createComment('@S'), $end = document.createComment('@E');
    let innerList = null;
    function set(list) {
        if (innerList) {
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
                            const sibling = findSiblingDom(f);
                            for (const dom of findSelfDom(ele)) {
                                $parent.insertBefore(dom, sibling);
                            }
                        }
                    }
                    else {
                        if (prev.next !== ele) {
                            const sibling = prev.next ? findSiblingDom(prev.next) : $end;
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
                            const sibling = findSiblingDom(ele.parent.child);
                            insertBefore(ele, ele.parent.child);
                            renderDom(ele, $parent, sibling);
                        }
                        else {
                            ele.parent.child = ele;
                            renderDom(ele, $parent, $end);
                        }
                    }
                    else {
                        const sibling = prev.next ? findSiblingDom(prev.next) : $end;
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
        const itemSig = useSignal(item, equal), indexSig = useSignal(index), ele = transformChild(render(itemSig, indexSig[0]));
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
        set,
        List: function ListWrap() {
            return [
                createElement(_DOM, {
                    dom: $start
                }),
                createElement(function List() {
                    let list = [], updater;
                    if (typeof getter == 'function') {
                        const { updater: _updater, value } = registerUpdater({
                            collect: getter,
                            update: (v) => {
                                set(v);
                            },
                            deps: [],
                        });
                        updater = _updater;
                        list = value;
                    }
                    else {
                        list = getter;
                    }
                    hook('created', (ele) => {
                        innerList = ele;
                    });
                    hook('destroyed', () => {
                        for (const dep of updater.deps) {
                            dep.undep();
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
export function createElement(type, props, ...children) {
    return {
        type,
        children: children,
        props,
        hooks: {},
        status: STATUS_CRAETED,
    };
}
