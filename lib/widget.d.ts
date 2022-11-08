import { Signal } from "./signal";
export declare type Child = string | number | null | undefined | Element;
export declare type DOMProps = {
    on?: {
        [p: string]: (e: Event) => void;
    };
};
declare type BaseElement = {
    next?: Element;
    prev?: Element;
    child?: Element;
    parent?: Element;
    children: Element[];
    status: 0 | 1 | 2;
    $dom?: Node;
    $parent?: Node;
    hooks: {
        created?: (ele: Element) => void;
        destroyed?: (ele: Element) => void;
    };
};
declare type DOMElement = BaseElement & {
    type: string;
    props?: DOMProps;
};
declare type WidgetElement<P> = BaseElement & {
    type: Widget<P>;
    props: P;
};
export declare type Element<P = any> = DOMElement | WidgetElement<P>;
export declare type Signaled<T> = {
    [P in keyof T]: (() => T[P]) | T[P];
};
export declare type Widget<P = {}> = (p: P) => Child | Child[];
declare type LifeTime = 'created' | 'destroyed';
export declare function hook(lifeTime: LifeTime, fn: (ele: Element) => void): void;
export declare function mount(element: Element, $parent: Node): void;
export declare function Text(props: Signaled<{
    text: string;
}>): WidgetElement<{
    dom: Text;
}>;
export declare function Condition<T>(props: {
    condition: (() => T) | T;
    render: (condition: T) => Child | Child[];
}): Child | Child[];
declare type ForwardProps = {
    parent: Node;
    render: () => Child | Child[];
};
export declare function Forward(props: ForwardProps): Child | Child[];
export declare function makeList<T>(getter: T[] | (() => T[]), render: (signal: Signal<T>, getIndex: () => number) => Child, key?: string, equal?: (a: T, b: T) => boolean): {
    set: (list: T[]) => void;
    List: () => (WidgetElement<{
        dom: Comment;
    }> | WidgetElement<undefined>)[];
};
export declare function renderDom(ele: Element, root: Node, sibling?: Node | null): void;
export declare function createElement(type: string, props?: DOMProps | null, ...children: Child[]): DOMElement;
export declare function createElement<P extends undefined>(type: Widget<P>, props?: undefined, ...children: Child[]): WidgetElement<P>;
export declare function createElement<P>(type: Widget<P>, props: P, ...children: Child[]): WidgetElement<P>;
export {};
