let currentTracer = undefined;
export function registerUpdater(updater) {
    const tracer = {
        updater,
        undeps: [],
        current: null,
        undepAll() {
            for (const undep of tracer.undeps) {
                undep();
            }
            tracer.undeps = [];
        }
    };
    tracer.current = wrapCollect(tracer);
    return tracer;
}
export function getCurrentTracer() {
    return currentTracer;
}
export function wrapCollect(tracer) {
    currentTracer = tracer;
    const result = tracer.updater.collect();
    currentTracer = undefined;
    return result;
}
