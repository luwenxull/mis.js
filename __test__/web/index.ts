import { createElement, useSignal, renderDom, Text, Condition, Forward, makeList } from '../../src'
import { hook } from '../../src/widget'

function A() {
  const { List, set } = makeList(
    [
      { id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 3, name: 'c' }, { id: 4, name: 'd' }
    ],
    ([get]) => createElement(Text, {
      text: () => get().name
    }),
    'id'
  )
  return [
    createElement('button', {
      on: {
        click() {
          set(old => {
            return [
              { id: 5, name: 'e' }, { id: 1, name: 'aaa' }, { id: 6, name: 'f' }, { id: 2, name: 'b' }, { id: 4, name: 'd' }
            ]
          })
        }
      }
    }, '点我'),
    createElement(List),
    createElement(B),
    createElement(Forward, {
      parent: document.getElementById('forward') as Node,
      render: () => '我是装载到外部DOM的节点'
    }),
    createElement(C),
  ]
}

function B() {
  const [getter, setter] = useSignal(false)
  hook('created', () => {
    setTimeout(() => setter(true), 1000)
  })
  return createElement(Condition, {
    condition: getter,
    render: v => v ? 'yes' : null
  })
}

function C() {
  return 'c'
}

function APP() {
  return createElement(A)
}

const app = createElement(APP)
renderDom(app, document.body)
console.log(app)
