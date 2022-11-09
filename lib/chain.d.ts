export declare type Chainable = {
    parent?: Chainable;
    child?: Chainable;
    next?: Chainable;
    prev?: Chainable;
    id: number;
};
export declare function makeChainable(nodes: Chainable[], parent: Chainable): void;
export declare function walk<T extends Chainable>(node: T | undefined, fn: (node: T) => boolean | void): void;
export declare function walkOnSibling<T extends Chainable>(node: T | undefined, fn: (node: T) => boolean | void): void;
export declare function removeSelf(node: Chainable): void;
export declare function insertBefore(node: Chainable, target: Chainable): void;
export declare function insertAfter(node: Chainable, target: Chainable): void;
