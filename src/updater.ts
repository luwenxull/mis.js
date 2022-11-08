import { Signal } from "./signal"

export interface Updater<T> {
  collect(): T
  update(dep: T): void,
  deps: Array<{
    signal: Signal<T>,
    undep(): void
  }>,
  // out
}

let tempUpdater: Updater<any> | null = null

export function registerUpdater<T>(updater: Updater<T>) {
  tempUpdater = updater
  const value = updater.collect()
  tempUpdater = null
  return {
    updater,
    value
  }
}

export function getTempUpdater() {
  return tempUpdater
}

