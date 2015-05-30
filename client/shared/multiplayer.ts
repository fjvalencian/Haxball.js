/// <reference path="./types.ts" />
module Core {
    /**
     * Bindowanie metod
     * @param {Socket} socket       Socket
     * @param {any}    context      Kontekst
     * @param {any }   callbacks    Callbacki
     */
    export function bind(
              socket: any
            , context: any
            , callbacks: { [index: string]: any }) {
        _.each(callbacks, (val: any, key: string) => {
            socket.on(key, _.bind(val, context));
        });
    };

    /** Dane serwera */
    export module Server.Data {
        export type RoomUpdate = ArrayBuffer;

        /** Informacja o graczu */
        export interface PlayerInfo {
            roomId: number;
            nick: string;
            op: boolean;
            rect: Types.Rect;
        };

        /** Wiadomość podczas dołączania się do pokoju */
        export interface RoomJoin {
            playerId: number;
            board: Types.Rect;
            players: PlayerInfo[];
        };
    };
}