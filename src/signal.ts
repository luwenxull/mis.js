import { getCurrentTracer, registerUpdater, Tracer, wrapCollect } from "./updater"

export type Signal<T> = [() => T, (value: ((old: T) => T) | T) => void]

const outdatedTracers = new Set<Tracer<unknown>>()

let queued = false

function markNeedUpdate(tracers: Set<Tracer<unknown>>) {
  for (const tracer of tracers) {
    outdatedTracers.add(tracer)
  }
  if (queued) {
    return
  }
  queued = true
  queueMicrotask(() => {
    for (const tracer of outdatedTracers) {
      tracer.undepAll()
      const nv = wrapCollect(tracer)
      if (tracer.current !== nv) {
        tracer.current = nv
        tracer.updater.update(tracer.current)
      }
    }
    queued = false
    outdatedTracers.clear()
  })
}

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
    value = typeof setter === "function" ? (setter as (old: T) => T)(value) : setter
    if (tracers.size > 0) {
      markNeedUpdate(tracers)
    }
  }]
  return signal
}



