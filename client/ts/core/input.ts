module Core.Input {
    /** Kody klawiszy */
    export enum Key {
          ENTER = 13
        , SPACE = 32
        , W = 87
        , S = 83
        , A = 65
        , D = 68
    };

    /** Typ eventu pochodzący z kernela */
    export enum Type { 
        /** input */
          MOUSE_CLICK
        , MOUSE_MOVE
        , KEY_DOWN
        , KEY_UP
        /** ładowanie */
        , LOADING
        /** multiplayer */
        , PLAYER_LIST_UPDATE
    };

    /** Event z kernela */
    export interface Event { 
        type: Type; 
        data?: any; 
    };

    /** Interfejs nasłuchiwujący eventu */
    export interface Listener { 
        onEvent: (source: any, event: Event) => void; 
    };
};