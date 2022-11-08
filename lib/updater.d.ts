export declare type Updater<T> = {
    collect(): T;
    update(dep: T): void;
};
export declare type Tracer<T> = {
    updater: Updater<T>;
    undeps: (() => void)[];
    current: T;
    undepAll(): void;
};
export declare function registerUpdater<T>(updater: Updater<T>): Tracer<T>;
export declare function getCurrentTracer(): Tracer<any> | undefined;
export declare function wrapCollect<T>(tracer: Tracer<T>): T;
