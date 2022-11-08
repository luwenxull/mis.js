import { getCurrentTracer, wrapCollect } from "./updater";
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
            if (typeof setter === 'function') {
                setter = setter(value);
            }
            value = setter;
            if (tracers.size > 0) {
                for (const tracer of Array.from(tracers)) {
                    tracer.undepAll();
                    const nv = wrapCollect(tracer);
                    if (tracer.current !== nv) {
                        tracer.current = nv;
                        tracer.updater.update(tracer.current);
                    }
                }
            }
        }];
    return signal;
}
