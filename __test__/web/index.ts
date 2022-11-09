import { createElement, useSignal, renderDom, Text, Condition, Forward, makeList } from '../../src'
import { hook } from '../../src/widget'

function A() {
  const { List, update } = makeList(
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
          update([
            { id: 5, name: 'e' }, { id: 1, name: 'aaa' }, { id: 6, name: 'f' }, { id: 2, name: 'b' }, { id: 4, name: 'd' }
          ])
        }
      }
    }, '点我'),
    createElement(List),
    createElement(B),
    // createElement(Forward, {
    //   parent: document.getElementById('forward') as Node,
    //   render: () => '我是装载到外部DOM的节点'
    // }),
    // createElement(C),
  ]
}

function B() {
  const [getter, setter] = useSignal(false)
  return createElement('div', {},
    createElement('button', {
      on: {
        click() {
          setter(!getter())
        }
      }
    }, '测试Condition'),
    createElement(Condition, {
      condition: getter,
      render: v => v ? 'yes' : null
    }),
    createElement(Forward, {
      parent: document.getElementById('forward') as Node,
      render() {
        return 1
      }
    }),
    'abc'
  )
}


function C() {
  const [getAge, setAge] = useSignal(18)
  const [getName, setName] = useSignal('张三')
  return createElement('section', {},
    createElement('button', {
      on: {
        click() {
          setAge(age => age + 1)
          setName('李四')
        }
      }
    }, '点我'),
    createElement(Text, {
      text: () => { console.log('??'); return `姓名：${getName()}，年龄：${getAge()}` }
    })
  )
}

function E() {
  return null
}

function APP() {
  return createElement(A)
}

const app = createElement(APP)
renderDom(app, document.body)
console.log(app)
