import { insertAfter, insertBefore, makeChainable, removeSelf, walk, walkOnSibling } from "./chain"
import { Signal, useSignal } from "./signal"
import { registerUpdater } from "./updater"

export type Child = string | number | null | undefined | Element

export type DOMProps = {
  // [p: string]: any
  on?: {
    [p: string]: (e: Event) => void
  }
}

type BaseElement = {
  next?: Element //
  prev?: Element //
  child?: Element
  parent?: Element // 父节点
  children: Element[] // 子节点
  status: 0 | 1 | 2
  $dom?: Node // 节点对应的dom
  $parent?: Node, // 节点对应的父dom
  hooks: {
    created?: (ele: Element) => void
    destroyed?: (ele: Element) => void
  }
}

type DOMElement = BaseElement & {
  type: string,
  props?: DOMProps,
}

type WidgetElement<P> = BaseElement & {
  type: Widget<P>
  props: P
}

export type Element<P = any> = DOMElement | WidgetElement<P>

export type Signaled<T> = {
  [P in keyof T]: (() => T[P]) | T[P]
}

export type Widget<P = {}> = (p: P) => Child | Child[]

const globalMountStack: WidgetElement<unknown>[] = []

const STATUS_CRAETED = 0
const STATUS_MOUNTED = 1
const STATUS_UNMOUNTED = 2

type LifeTime = 'created' | 'destroyed'

export function hook(lifeTime: LifeTime, fn: (ele: Element) => void) {
  const ele = globalMountStack[globalMountStack.length - 1]
  ele.hooks[lifeTime] = fn
}

function isDomElement(element: Element): element is DOMElement {
  return typeof element.type === 'string'
}

/**
 * 销毁节点
 * @param ele
 * @param prtDomRemoved
 */
function unmount(ele: Element, prtDomRemoved: boolean = false) {
  if (ele.$parent) {
    removeSelf(ele)
    if (ele.$dom) {
      if (!prtDomRemoved) {
        ele.$parent.removeChild(ele.$dom)
      }
      prtDomRemoved = true
    }
    ele.status = STATUS_UNMOUNTED
    if (ele.hooks.destroyed) {
      ele.hooks.destroyed(ele)
    }
    if (ele.type === Forward) {
      prtDomRemoved = false
    }
    walkOnSibling(ele.child, (child) => {
      unmount(child, prtDomRemoved)
    })
  }
}

/**
 * 装载DOM
 * @param element
 * @param $parent
 */
export function mount(element: Element, $parent: Node) {
  element.status = STATUS_MOUNTED // 标记mount状态
  element.$parent = $parent
  // chain(element, $parent as VNode)
  if (isDomElement(element)) {
    // const dom =
    element.$dom = document.createElement(element.type)
    element.children = element.children.map(transformChild)
    makeChainable(element)
    walkOnSibling(element.child, (child) => {
      mount(child, element.$dom as Node)
    })
    if (element.props) {
      for (const key of Object.keys(element.props)) {
        if (key === 'on') {
          const on = element.props[key] as { [p: string]: (e: Event) => void }
          for (const key of Object.keys(on)) {
            element.$dom.addEventListener(key, on[key])
          }
        }
      }
    }
    if (element.hooks.created) {
      element.hooks.created(element)
    }
  } else {
    // 全局加载列表
    globalMountStack.push(element)
    // 特殊处理的_DOM节点
    if (element.type === _DOM) {
      const { props: { dom } } = element as WidgetElement<_DOMProps>
      if (dom !== null) {
        // $parent.insertBefore(dom, insertPosition)
        element.$dom = dom
      }
    } else {
      element.children = ([] as Child[]).concat(element.type(element.props)).map(transformChild)
      makeChainable(element)
      if (element.type === Forward) {
        $parent = element.props.parent
      }
      walkOnSibling(element.child, (child) => {
        mount(child, $parent)
      })
    }
    globalMountStack.pop()
    if (element.hooks.created) {
      element.hooks.created(element)
    }
  }
}

type _DOMProps = {
  dom: Node | null
}

function _DOM(props: _DOMProps) {
  return createElement(() => null, {
    dom: props.dom
  })
}

/**
 * 文字渲染
 * @param props
 * @returns
 */
export function Text(props: Signaled<{
  text: string
}>) {
  // 非singal处理
  if (typeof props.text !== 'function') {
    return createElement(_DOM, {
      dom: document.createTextNode(props.text)
    })
  }
  const { updater, value } = registerUpdater({
    collect: props.text,
    update: (v) => tn.textContent = v,
    deps: [],
  })
  const tn = document.createTextNode(value)
  hook('destroyed', () => {
    for (const dep of updater.deps) {
      dep.undep()
    }
  })
  return createElement(_DOM, {
    dom: tn
  },)
}

/**
 * 检查是否有重复Key
 * @param list
 * @param key
 * @returns
 */
 function findDupKey(list: any[], key: string) {
  const keys = new Set()
  for (const item of list) {
    const _key = String(item[key])
    if (keys.has(_key)) {
      return _key
    }
    keys.add(_key)
  }
}

/**
 * 寻找带DOM的parent
 * 特殊考虑根节点和Forward节点
 * @param ele
 * @returns
 */
function findParentWithDom(ele: Element): Element | undefined {
  while (ele) {
    if (ele.parent) {
      if (ele.parent.$dom || ele.parent.type === Forward) {
        return ele.parent
      } else {
        ele = ele.parent
      }
    } else {
      return ele
    }
  }
}

/**
 * 寻找后续的第一个Dom（包括自身的Dom和parent dom）
 * @param ele
 * @returns
 */
function findSiblingDom(ele: Element) {
  let parentWithDom = findParentWithDom(ele), sibling: Node | null = null
  walk(ele, next => {
    if (next === parentWithDom) return true
    if (next.$dom && next.$parent === ele.$parent) {
      sibling = next.$dom
      return true
    }
  })
  return sibling
}

/**
 * 寻找自身Dom
 * @param ele
 * @returns
 */
function findSelfDom(ele: Element) {
  const doms:Node[] = []
  walk(ele, next => {
    if (next === ele.next || next === ele.parent) return true
    if (next.$dom && next.$parent === ele.$parent) {
      doms.push(next.$dom)
    }
  })
  return doms
}

/**
 * 条件渲染
 * @param props
 * @returns
 */
export function Condition<T>(props: {
  condition: (() => T) | T
  render: (condition: T) => Child | Child[]
}) {
  if (typeof props.condition !== 'function') {
    return props.render(props.condition)
  }
  const ele = globalMountStack[globalMountStack.length - 1]
  const { updater, value } = registerUpdater({
    collect: props.condition as () => T,
    update: (v) => {
      walkOnSibling(ele.child, child => {
        unmount(child)
      })
      const sibling = findSiblingDom(ele)
      ele.children = ([] as Child[]).concat(props.render(v)).map(transformChild)
      makeChainable(ele)
      walkOnSibling(ele.child, child => {
        renderDom(child, ele.$parent!, sibling)
      })
    },
    deps: [],
  })
  hook('destroyed', () => {
    for (const dep of updater.deps) {
      dep.undep()
    }
  })
  return props.render(value)
}

type ForwardProps = {
  parent: Node,
  render: () => Child | Child[]
}

/**
 * 允许装载到外部DOM
 * @param props
 * @returns
 */
export function Forward(props: ForwardProps) {
  return props.render()
}

export function makeList<T>(
  initialList: T[] | (() => T[]),
  render: (signal: Signal<T>, getIndex: () => number) => Child,
  key?: string,
  equal?: (a: T, b: T) => boolean
) {
  type Result = [Signal<T>, Signal<number>, Element]
  let list: T[] = []
  if (typeof initialList == 'function') {
    list = initialList()
  } else {
    list = initialList
  }
  let map: { [p: string]: Result } = {}
  let useKey = false
  const $start = document.createComment('@S'), $end = document.createComment('@E')
  let innerList: Element | null = null

  function set(nl: T[] | ((old: T[]) => T[])) {
    if (innerList) {
      list = typeof nl === 'function' ? nl(list) : nl
      updateUseKey()
      const { $parent } = innerList;
      let prev: Element | undefined = undefined
      for (const [i, v] of list.entries()) {
        // @ts-ignore
        const _key = useKey ? v[key] : i
        if (Object.prototype.hasOwnProperty.call(map, _key)) {
          const [itemSig, indexSig, ele] = map[_key]
          itemSig[1](v)
          indexSig[1](i)
          if (!prev) { // i === 0
            if (ele.prev) {
              removeSelf(ele)
              const f = ele.parent!.child!
              insertBefore(ele, f)
              const sibling = findSiblingDom(f)
              for (const dom of findSelfDom(ele)) {
                $parent!.insertBefore(dom, sibling)
              }
            }
          } else {
            if (prev.next !== ele) {
              const sibling = prev.next ? findSiblingDom(prev.next) : $end
              removeSelf(ele)
              insertAfter(ele, prev)
              for (const dom of findSelfDom(ele)) {
                $parent!.insertBefore(dom, sibling)
              }
            }
          }
          prev = ele
        } else {
          const [,,ele] = renderToResult(v, i, _key)
          ele.parent = innerList
          if (!prev) {
            if (ele.parent.child) {
              const sibling = findSiblingDom(ele.parent.child)
              insertBefore(ele, ele.parent.child)
              renderDom(ele, $parent!, sibling)
            } else {
              ele.parent.child = ele
              renderDom(ele, $parent!, $end)
            }
          } else {
            const sibling = prev.next ? findSiblingDom(prev.next) : $end
            insertAfter(ele, prev)
            renderDom(ele, $parent!, sibling)
          }
          prev = ele
        }
      }
      walkOnSibling(prev?.next, child => {
        unmount(child)
      })
    }
  }

  function renderToResult(item: T, index: number, key: string | number) {
    const itemSig = useSignal(item, equal),
      indexSig = useSignal(index),
      ele = transformChild(render(itemSig, indexSig[0]))
    const result: Result = [itemSig, indexSig, ele]
    // 根据key记录

    map[key] = result
    return result
  }

  function updateUseKey() {
    if (typeof key === 'string') {
      const dup = findDupKey(list, key)
      if (dup === undefined) {
        useKey = true
      } else {
        console.error(`Duplicate key: "${dup}"`)
      }
    }
  }

  return {
    set,
    List: function () {
      return [
        createElement(_DOM, {
          dom: $start
        }),
        createElement(function List() {
          hook('created', (ele) => {
            innerList = ele
          })
          updateUseKey()
          //@ts-ignore
          let results = list.map((item, i) => renderToResult(item, i, useKey ? item[key] : i))
          return results.map(r => r[2])
        }),
        createElement(_DOM, {
          dom: $end,
        })
      ]
    }
  }
}

/**
 * 将children转换成Element组成的数组
 * @param children
 */
function transformChild(child: Child): Element {
  if (typeof child === 'string' || typeof child === 'number') {
    return createElement(_DOM, {
      dom: document.createTextNode(String(child))
    })
  } else if (child === null || child === undefined) {
    return createElement(_DOM, {
      // dom: document.createComment('')
      dom: null,
    })
  } else {
    return child
  }
}

export function renderDom(ele: Element, root: Node, sibling: Node | null = null) {
  const df = document.createDocumentFragment()
  mount(ele, df)
  walk(ele, ele => {
    if (ele.$dom && ele.$parent) {
      ele.$parent.appendChild(ele.$dom)
    }
    if (ele.$parent === df) {
      ele.$parent = root
    }
  })
  root.insertBefore(df, sibling)
}

/**
 * 创建内部Element
 * @param config
 */
export function createElement(type: string, props?: DOMProps | null, ...children: Child[]): DOMElement
export function createElement<P extends undefined>(type: Widget<P>, props?: undefined, ...children: Child[]): WidgetElement<P>
export function createElement<P>(type: Widget<P>, props: P, ...children: Child[]): WidgetElement<P>
export function createElement<P>(type: string | Widget<P>, props?: DOMProps | P, ...children: Child[]): Element<P> {
  return {
    type,
    children: children as any,
    props,
    hooks: {},
    status: STATUS_CRAETED,
  } as Element<P>
}

