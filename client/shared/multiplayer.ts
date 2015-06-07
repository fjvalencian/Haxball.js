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
            socket.on(key, val.bind(context));
        });
    };


    /**
     * Sprawdzanie flag
     * @param  {number}  number flagi
     * @param  {number}  flag   flaga
     * @return {boolean}        true jeśli flaga jest we flagach
     */
    export function hasFlag(number: number, flag: number): boolean {
        return (number & flag) === flag;
    };

    export module Server.Data {
        export enum Team {
              LEFT
            , SPECTATORS
            , RIGHT  
        };

        /** Ustawianie nowych flag */
        export interface NewFlags {
            nick: string;
            flags: number;
        };

        /** Dane serwera */
        export type RoomUpdate = ArrayBuffer;

        /** Informacja o graczu */
        export enum PlayerFlags {
              ROOM_OP  = 1 << 1
            , BALL     = 1 << 2
            , PLAYER   = 1 << 3
            , SHOOTING = 1 << 4
        };
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
            public isBall = this.hasFlag.bind(this, PlayerFlags.BALL);
            public isPlayer = this.hasFlag.bind(this, PlayerFlags.PLAYER);
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