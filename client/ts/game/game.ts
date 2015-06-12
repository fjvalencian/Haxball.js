/// <reference path="../../assets/defs/socket.io-client/socket.io-client.d.ts" />
/// <reference path="../core/engine.ts" />
/// <reference path="../multiplayer.ts" />

module Game {
	export type Socket = SocketIOClient.Socket;
	export import Scene = Core.Scene;
    export import GUI = Core.Scene.GUI;
    export import Template = Core.Graph.Template;
    export import Input = Core.Input;
    export import Key = Core.Input.Key;
    export import Data = Core.Server.Data;

    /** Socket do serwera */
    export var socket = io.connect('ws://localhost:3000');
    socket
        .on('connect', () => {
            console.log('Połączono!');
        })
        .on('server error', err => {
            throw new Error(err);
        });
}