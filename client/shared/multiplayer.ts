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

    export module Server.Data {
        export enum Team {
            LEFT, SPECTATORS, RIGHT  
        };
        export enum PlayerType {
            CURRENT_PLAYER, BALL, PLAYER 
        };

        /** Dane serwera */
        export type RoomUpdate = ArrayBuffer;

        /** Informacja o graczu */
        export interface PlayerInfo {
            number: number;
            nick: string;
            op: boolean;
            ball: boolean;
            rect: Types.Rect;
            team: Team;
        };

        /** Wiadomość wysyłana do gracza podłączającego się do pokoju */
        export interface RoomEntered {
            board: Types.Rect;
            gateHeight: number;
            msg: string;
        };

        /** Wiadomość rozsyłana  */
        export interface RoomJoin {
            players: PlayerInfo[];
        };
    };
}