import { getTempUpdater, registerUpdater, Updater } from "./updater"

export type Signal<T> = [() => T, (value: ((old: T) => T) | T) => void]

function simpleCompare(a: any, b: any) {
  return a === b
}

export function useSignal<T>(initial: T, equal = simpleCompare): Signal<T> {
  let value = initial
  const updaters: Set<Updater<T>> = new Set()
  const signal: Signal<T> = [() => {
    const updater = getTempUpdater()
    if (updater) {
      updaters.add(updater)
      updater.deps.push({
        signal,
        undep: () => {
          updaters.delete(updater)
        }
      })
    }
    return value
  },
  (setter) => {
    if (typeof setter === 'function') {
      setter = (setter as Function)(value)
    }
    if (equal(value, setter)) {
      return
    }
    value = setter as T
    if (updaters.size > 0) {
      for (const updater of Array.from(updaters)) {
        for (const dep of updater.deps) {
          dep.undep()
        }
        updater.deps = []
        updater.update(registerUpdater(updater).value)
      }
    }
  }]
  return signal
}



