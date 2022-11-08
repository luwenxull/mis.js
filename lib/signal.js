import { getTempUpdater, registerUpdater } from "./updater";
function simpleCompare(a, b) {
    return a === b;
}
export function useSignal(initial, equal = simpleCompare) {
    let value = initial;
    const updaters = new Set();
    const signal = [() => {
            const updater = getTempUpdater();
            if (updater) {
                updaters.add(updater);
                updater.deps.push({
                    signal,
                    undep: () => {
                        updaters.delete(updater);
                    }
                });
            }
            return value;
        },
        (setter) => {
            if (typeof setter === 'function') {
                setter = setter(value);
            }
            if (equal(value, setter)) {
                return;
            }
            value = setter;
            if (updaters.size > 0) {
                for (const updater of Array.from(updaters)) {
                    for (const dep of updater.deps) {
                        dep.undep();
                    }
                    updater.deps = [];
                    updater.update(registerUpdater(updater).value);
                }
            }
        }];
    return signal;
}
