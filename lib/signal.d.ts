export declare type Signal<T> = [() => T, (value: ((old: T) => T) | T) => void];
declare function simpleCompare(a: any, b: any): boolean;
export declare function useSignal<T>(initial: T, equal?: typeof simpleCompare): Signal<T>;
export {};
