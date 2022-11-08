import { Signal } from "./signal";
export interface Updater<T> {
    collect(): T;
    update(dep: T): void;
    deps: Array<{
        signal: Signal<T>;
        undep(): void;
    }>;
}
export declare function registerUpdater<T>(updater: Updater<T>): {
    updater: Updater<T>;
    value: T;
};
export declare function getTempUpdater(): Updater<any> | null;
