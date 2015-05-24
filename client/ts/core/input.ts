module Core.Input {
    export enum Type { 
        /** input */
          MOUSE_CLICK
        , MOUSE_MOVE
        , KEY_DOWN
        /** ładowanie */
        , LOADING
    };
    export interface Event { 
        type: Type; 
        data?: any; 
    };
    export interface Listener { 
        onEvent: (source: any, event: Event) => void; 
    };
};