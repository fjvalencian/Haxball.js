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
              LEFT
            , SPECTATORS
            , RIGHT  
        };
        export enum PlayerType {
              CURRENT_PLAYER
            , PLAYER 
        };
        export enum PlayerFlags {
              ROOM_OP = 1 << 1
            , BALL    = 1 << 2
        };

        /** Dane serwera */
        export type RoomUpdate = ArrayBuffer;

        /** Informacja o graczu */
        export class PlayerInfo extends Types.Copyable {
            public number: number = 0;
            public flags: number = 0;
            public team: number = Team.LEFT;

            public nick: string = '';
            public rect: Types.Rect = new Types.Rect;

            /** Sprawdzanie flag */
            public hasFlag(flag: number): boolean {
                return (this.flags & flag) === flag;
            }
            public isBall = _.bind(this.hasFlag, this, PlayerFlags.BALL);
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