import { insertAfter, insertBefore, makeChainable, removeSelf, walk, walkOnSibling } from "./chain"
import { Signal, useSignal } from "./signal"
import { registerUpdater } from "./updater"

export type Child = string | number | null | undefined | Element

type Obj = {
  [key: string]: any
}

export type DOMProps = {
  // [p: string]: any
  on?: {
    [p: string]: (e: Event) => void
  },
  attr?: {
    [p: string]: any
  },
  style?: Obj | (() => Obj),
}

type BaseElement = {
  id: number
  next?: Element //
  prev?: Element //
  child?: Element
  parent?: Element // 父节点
  children: Child[] // 子节点
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

const globalMountStack: Element[] = []

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
function unmount(ele: Element) {
  const removed: Set<Node> = new Set()
  walk(ele, next => {
    if (next === ele.next || next === ele.parent) return true
    if (next.status !== STATUS_UNMOUNTED) {
      next.status = STATUS_UNMOUNTED
      if (next.hooks.destroyed) {
        next.hooks.destroyed(next)
      }
      if (next.$dom && next.$parent) {
        if (!removed.has(next.$parent)) {
          next.$parent.removeChild(next.$dom)
        }
        removed.add(next.$dom)
        next.$dom = undefined
        next.$parent = undefined
      }
    }
  })
}

/**
 * 装载DOM
 * @param element
 * @param $parent
 */
export function mount(element: Element, $parent: Node) {
  globalMountStack.push(element)
  element.status = STATUS_MOUNTED // 标记mount状态
  element.$parent = $parent
  if (isDomElement(element)) {
    const $dom = document.createElement(element.type)
    element.$dom = $dom
    makeChainable(element.children.map(transformChild), element)
    walkOnSibling(element.child, (child) => {
      mount(child, $dom)
    })
    if (element.props) {
      if (element.props.style) {
        const { style } = element.props
        if (typeof style === 'function') {
          const { current, undepAll } = registerUpdater({
            collect: style as () => Obj,
            update: (value) => {
              Object.assign($dom.style, value)
            }
          })
          Object.assign($dom.style, current)
          hook('destroyed', undepAll)
        } else {
          Object.assign($dom.style, style)
        }
      }
      if (element.props.on) {
        const on = element.props.on
        for (const key of Object.keys(on)) {
          $dom.addEventListener(key, on[key])
        }
      }
    }
  } else {
    // 全局加载列表
    // 特殊处理的_DOM节点
    if (element.type === _DOM) {
      const { props: { dom } } = element as WidgetElement<_DOMProps>
      if (dom !== null) {
        // $parent.insertBefore(dom, insertPosition)
        element.$dom = dom
      }
    } else {
      makeChainable(([] as Child[]).concat(element.type(element.props)).map(transformChild), element)
      if (element.type === Forward) {
        $parent = element.props.parent
      }
      walkOnSibling(element.child, (child) => {
        mount(child, $parent)
      })
    }
    if (element.hooks.created) {
      element.hooks.created(element)
    }
  }
  globalMountStack.pop()

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
  const { current, undepAll } = registerUpdater({
    collect: props.text,
    update: (v) => tn.textContent = v,
  })
  const tn = document.createTextNode(current)
  hook('destroyed', undepAll)
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
function findDomParent(ele: Element, $parent: Node): Element {
  while (ele) {
    if (ele.$dom === $parent) return ele
    if (ele.type === Forward) return ele
    // ele = ele.parent
    if (ele.parent) {
      ele = ele.parent
    } else {
      // return ele
      break
    }
  }
  return ele
}


/**
 * 寻找包含自身的第一个dom节点
 * @param ele
 * @param stopAt 终止查找
 * @param $parent
 * @returns
 */
function findFirstDom(
  ele: Element | undefined,
  stopAt: Element,
  $parent: Node,
): Node | null {
  let sibling: Node | null = null
  walk(ele, next => {
    if (next === stopAt) return true
    if (next.$dom && next.$parent === $parent) {
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
  const doms: Node[] = []
  walk(ele, next => {
    // 防止越界
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
  const { current, undepAll } = registerUpdater({
    collect: props.condition as () => T,
    update: (v) => {
      const { $parent } = ele
      if (!$parent) return
      walkOnSibling(ele.child, child => {
        unmount(child)
      })
      const sibling = findFirstDom(ele.next, findDomParent(ele, $parent), $parent)
      makeChainable(([] as Child[]).concat(props.render(v)).map(transformChild), ele)
      walkOnSibling(ele.child, child => {
        renderDom(child, $parent, sibling)
      })
    },
  })
  hook('destroyed', undepAll)
  return props.render(current)
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
  collect: T[] | (() => T[]),
  render: (signal: Signal<T>, getIndex: () => number) => Child,
  key?: string,
  equal?: (a: T, b: T) => boolean
) {
  type Result = [Signal<T>, Signal<number>, Element]
  let map: { [p: string]: Result } = {}
  const $start = document.createComment('@S'), $end = document.createComment('@E')
  let innerList: Element | null = null

  function update(list: T[]) {
    if (innerList && innerList.$parent) {
      const useKey = shouldUseKey(list)
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
              const sibling = findFirstDom(f, findDomParent(ele, $parent), $parent)
              for (const dom of findSelfDom(ele)) {
                $parent!.insertBefore(dom, sibling)
              }
            }
          } else {
            if (prev.next !== ele) {
              const sibling = prev.next
                ? findFirstDom(prev.next, findDomParent(ele, $parent), $parent)
                : $end
              removeSelf(ele)
              insertAfter(ele, prev)
              for (const dom of findSelfDom(ele)) {
                $parent.insertBefore(dom, sibling)
              }
            }
          }
          prev = ele
        } else {
          const [, , ele] = renderToResult(v, i, _key)
          ele.parent = innerList
          if (!prev) {
            if (ele.parent.child) {
              const sibling = findFirstDom(ele.parent.child, findDomParent(ele, $parent), $parent)
              insertBefore(ele, ele.parent.child)
              renderDom(ele, $parent, sibling)
            } else {
              ele.parent.child = ele
              renderDom(ele, $parent, $end)
            }
          } else {
            const sibling = prev.next ? findFirstDom(prev.next, findDomParent(ele, $parent), $parent) : $end
            insertAfter(ele, prev)
            renderDom(ele, $parent!, sibling)
          }
          prev = ele
        }
      }
      walkOnSibling(prev?.next, child => {
        unmount(child)
      })
      const children: Element[] = []
      walkOnSibling(innerList.child, child => {
        children.push(child)
      })
      innerList.children = children
    }
  }

  function renderToResult(item: T, index: number, key: string | number) {
    const itemSig = useSignal(item),
      indexSig = useSignal(index),
      ele = transformChild(render(itemSig, indexSig[0]))
    const result: Result = [itemSig, indexSig, ele]
    // 根据key记录

    map[key] = result
    return result
  }

  function shouldUseKey(list: T[]) {
    if (typeof key === 'string') {
      const dup = findDupKey(list, key)
      if (dup === undefined) {
        return true
      } else {
        console.error(`Duplicate key: "${dup}"`)
      }
    }
    return false
  }

  return {
    update,
    List: function ListWrapper() {
      return [
        createElement(_DOM, {
          dom: $start
        }),
        createElement(function List() {
          let list: T[] = [], undepAll: () => void
          if (typeof collect == 'function') {
            const { undepAll: _undepAll, current } = registerUpdater({
              collect,
              update,
            })
            undepAll = _undepAll
            list = current
          } else {
            list = collect
          }
          hook('created', (ele) => {
            innerList = ele
          })
          hook('destroyed', () => {
            if (typeof undepAll === 'function') {
              undepAll()
            }
          })
          const useKey = shouldUseKey(list),
            //@ts-ignore
            results = list.map((item, i) => renderToResult(item, i, useKey ? item[key] : i))
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
  walk(ele, next => {
    if (next === ele.next || next === ele.parent) return true
    if (next.$dom && next.$parent) {
      next.$parent.appendChild(next.$dom)
    }
    if (next.$parent === df) {
      next.$parent = root
    }
  })
  root.insertBefore(df, sibling)
}

let ID = 0

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
    children,
    props,
    hooks: {},
    status: STATUS_CRAETED,
    id: ID++
  } as Element<P>
}

