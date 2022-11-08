import { getCurrentTracer, registerUpdater, Tracer, wrapCollect } from "./updater"

export type Signal<T> = [() => T, (value: ((old: T) => T) | T) => void]


export function useSignal<T>(initial: T): Signal<T> {
  let value = initial
  const tracers: Set<Tracer<T>> = new Set()
  const signal: Signal<T> = [() => {
    const tracer = getCurrentTracer()
    if (tracer) {
      tracers.add(tracer)
      tracer.undeps.push(() => tracers.delete(tracer))
    }
    return value
  },
  (setter) => {
    if (typeof setter === 'function') {
      setter = (setter as Function)(value)
    }
    value = setter as T
    if (tracers.size > 0) {
      for (const tracer of Array.from(tracers)) {
        tracer.undepAll()
        const nv = wrapCollect(tracer)
        if (tracer.current !== nv) {
          tracer.current = nv
          tracer.updater.update(tracer.current)
        }
      }
    }
  }]
  return signal
}



