export declare type Signal<T> = [() => T, (value: ((old: T) => T) | T) => void];
export declare function useSignal<T>(initial: T): Signal<T>;
