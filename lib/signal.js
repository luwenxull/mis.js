import { getCurrentTracer, wrapCollect } from "./updater";
const outdatedTracers = new Set();
let queued = false;
function markNeedUpdate(tracers) {
    for (const tracer of tracers) {
        outdatedTracers.add(tracer);
    }
    if (queued) {
        return;
    }
    queued = true;
    queueMicrotask(() => {
        for (const tracer of outdatedTracers) {
            tracer.undepAll();
            const nv = wrapCollect(tracer);
            if (tracer.current !== nv) {
                tracer.current = nv;
                tracer.updater.update(tracer.current);
            }
        }
        queued = false;
        outdatedTracers.clear();
    });
}
export function useSignal(initial) {
    let value = initial;
    const tracers = new Set();
    const signal = [() => {
            const tracer = getCurrentTracer();
            if (tracer) {
                tracers.add(tracer);
                tracer.undeps.push(() => tracers.delete(tracer));
            }
            return value;
        },
        (setter) => {
            value = typeof setter === "function" ? setter(value) : setter;
            if (tracers.size > 0) {
                markNeedUpdate(tracers);
            }
        }];
    return signal;
}
