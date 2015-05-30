/// <reference path="./types.ts" />
module Core.Server.Data {
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
        players: PlayerInfo[];
    };
};