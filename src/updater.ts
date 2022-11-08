import { Signal } from "./signal"

export type Updater<T>  = {
  collect(): T
  update(dep: T): void,
}

export type Tracer<T> = {
  updater: Updater<T>,
  undeps:
    (()=> void)[]
  current: T,
  undepAll(): void,
}

let currentTracer: Tracer<any> | undefined = undefined

export function registerUpdater<T>(updater: Updater<T>) {
  const tracer: Tracer<T> = {
    updater,
    undeps: [],
    current: null as any,
    undepAll() {
      for (const undep of tracer.undeps) {
        undep()
      }
      tracer.undeps = []
    }
  }
  tracer.current = wrapCollect(tracer)
  return tracer
}

export function getCurrentTracer() {
  return currentTracer
}


export function wrapCollect<T>(tracer:Tracer<T>) {
  currentTracer = tracer
  const result = tracer.updater.collect()
  currentTracer = undefined
  return result
}
