/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/socket.io/socket.io.d.ts" />
/// <reference path="../defs/underscore/underscore.d.ts" />

/// <reference path="./types.ts" />
/// <reference path="./multiplayer.ts" />

var _: UnderscoreStatic = require('underscore')
  , io = require('socket.io').listen(3000);
type Socket = SocketIO.Socket;

module Core.Server {
    import Vec2 = Types.Vec2;
    import Rect = Types.Rect;

    /** Kody błędów */
    enum Errors {
          NICK_ALREADY_EXISTS
        , INVALID_NICK 
    };
    
    /**
     * Błąd na serwerze
     * @param {Socket} socket Socket
     * @param {Errors} err    Kod błędu
     */
    var serverError = function(socket: Socket, err: Errors) {
        socket.emit('server error', { code: err });
    };
    
    /** Konfiguracja serwera */
    export const Config = {
          delay: 1000 / 60
        , player: {
              size: new Rect(70, 70, 32, 32)
            , mass: 1.0
            , speed: 0.06
        }
    };

    /** Pokój */
    export class Room {
        /** Gracze w pokoju */
        static rooms: { [index: string]: Room } = {};
        private players: Player[] = [];

        constructor(private name: string) {
            Room.rooms[name] = this;
            setInterval( _.bind(this.update, this)
                       , Config.delay);
        }
        public getName(): string { return this.name; }

        /** Układ graczy po dołączeniu */
        private board: Rect = new Rect(50, 50, 600, 370);
        private playerLocations: Vec2[] = [
              new Vec2(50, 50)
            , new Vec2(50, 100)
            , new Vec2(50, 150)
            , new Vec2(100, 100)
        ];

        /** 
         * Testowanie kolizji
         * http://ericleong.me/research/circle-circle/
         */
        private updatePhysics() {
            let center: Vec2 = new Vec2(16, 16);
            for (let i = 0; i < this.players.length; ++i) {
                let p1 = this.players[i];

                /** Kolizje z górną częścią boiska */
                if(this.board.y >= p1.rect.y 
                        || this.board.y + this.board.h <= p1.rect.y + p1.rect.h)
                    p1.rect.y += p1.v.y *= -1;

                /** Kolizje z bokami boiska */
                if(this.board.x >= p1.rect.x
                        || this.board.x + this.board.w <= p1.rect.x + p1.rect.w)
                    p1.rect.x += p1.v.x *= -1;

                /** Kolizje z innymi zawodnikami */
                for (let j = 0; j < this.players.length; ++j) {
                    let p2 = this.players[j]
                      , c1 = p1.rect.center()
                      , c2 = p2.rect.center()
                      , dist = Vec2.distance(c1, c2);
                    if (i != j && dist < (p1.rect.w + p2.rect.w) / 2) {
                        let nx = (c2.x - c1.x) / dist
                          , ny = (c2.y - c1.y) / dist
                          , p = 2.0 * (p1.v.x * nx + p1.v.y * ny - p2.v.x * nx - p2.v.y * ny) / (p1.mass + p2.mass);
                        p1.v.x -= p * p1.mass * nx;
                        p1.v.y -= p * p1.mass * ny;
                        p2.v.x += p * p2.mass * nx;
                        p2.v.y += p * p2.mass * ny;

                        p1.rect.add(p1.v);
                        p2.rect.add(p2.v);
                    }
                }
                /** Aktualizowanie prędkości */
                p1.rect.add(
                    p1.v.mul(new Vec2(0.98, 0.98)));
            }
        }

        /**
         * Broadcast wiadomości po klientach
         * @param {string} type Type wiadomości
         * @param {any}    data Dane
         */
        public broadcast(type: string, data: any): Room {
            if(type.length && data)
                io.to(this.name).emit(type, data);
            return this;
        }

        /**
         * Aktualizacja pozycji graczy
         * 4B ID gracza
         * 16B [ x, y, v.x, v.y ]
         */
        private static PACK_SIZE: number = 5;
        private update() {
            /** Aktualizacja fizyki */
            this.updatePhysics();

            /** Uaktualnianie stanu po klientach */
            if(this.players.length) {
                let pack = new Float32Array(Room.PACK_SIZE * this.players.length);
                _(this.players).each((player, index) => {
                    pack.set( <any> [ index, player.rect.x, player.rect.y, player.v.x, player.v.y ]
                            , index * Room.PACK_SIZE);
                });
                this.broadcast('room update', pack.buffer);
            }
        }

        /**
         * Logowanie się do pokoju, zwracanie aktualnej listy graczt
         * @type {string}
         */
        private password: string = null;
        public join(player: Player, password?: string): Room {
            if(!this.password || this.password === password) {
                player
                    .setRoomID(this.players.length)
                    .rect.copy(
                        this.playerLocations[player.roomId]
                            .clone()
                            .add(this.board));
                player
                    .send('room entered', <Data.RoomJoin> {
                          playerId: player.roomId
                        , board: this.board
                        , players: <any> _(this.players).map(obj => {
                            return obj.getPlayerInfo();
                        })
                    });

                /** Ogłaszanie zalogowania */
                player.getSocket().join(this.name);
                this.players.push(player);
                this.broadcast('room join', player.getPlayerInfo());
            }
            return this;
        }
        public unjoin(player: Player) {
            this.broadcast('room exit', player.roomId);
            this.players = _(this.players).without(player);
        }

        /** Jeśli wymaga hasła zwróci true */
        public isLocked(): boolean {
            return <any> (this.password && this.password.length);
        } 
    };

    /** Gracz */
    export class Player {
        /** Gracze w całym serwerze */
        static players: Player[] = [];

        /** Identyfikator gracza w roomie */
        public roomId: number = 0;
        constructor( private socket: Socket
                   , public rect: Rect = Config.player.size.clone()
                   , public mass: number = Config.player.mass
                   , public v: Vec2 = new Vec2) {
            bind(this.socket, this, {
                  'disconnect' : this.disconnect
                , 'set nick'   : this.setNick
                , 'set room'   : this.setRoom
                , 'move'       : this.move
            });
            Player.players.push(this);
        }

        /** Socket */
        public getSocket(): Socket  { return this.socket; }
        public send(type: string, data: any): Player {
            this.socket.emit(type, data);
            return this;
        }

        /** Pobieranie informacji o graczu */
        public getPlayerInfo(): Data.PlayerInfo {
            return {
                  roomId: this.roomId
                , nick: this.nick
                , op: false
                , rect: this.rect
            };
        }

        /** Poruszanie się */
        static vectors: Vec2[] = [
              new Vec2(0.0, -Config.player.speed)
            , new Vec2(0.0, Config.player.speed)
            , new Vec2(-Config.player.speed, 0.0)
            , new Vec2(Config.player.speed, 0.0)
        ];
        public move(dir: Types.Direction|Types.Vec2) {
            // this.v.x = v.x * this.v.x < 0 ? 0 : this.v.x;
            // this.v.y = v.y * this.v.y < 0 ? 0 : this.v.y;
            if(this.v.length() < 4.0)
                this.v.add(dir instanceof Types.Vec2 
                            ? dir 
                            : Player.vectors[<Types.Direction> dir]);
        }

        /** Zmiana nicku */
        public nick: string = null;
        public setNick(nick: string) {
            if(_.findWhere(Player.players, { nick: nick })
                    && !Player.validateNick(this.nick)) {
                serverError(this.socket, Errors.NICK_ALREADY_EXISTS);
            } else
                this.nick = nick;
        }
        private static validateNick(nick: string): Boolean {
            return nick && nick.length < 30;
        }

        /** Ustawianie pokoju */
        private room: Room = null;
        public setRoom(room: Room|string): Player {
            this.room = _.isString(room) 
                            ? Room.rooms[<string> room]
                            : <Room> room;
            this.room.join(this);
            return this;
        }
        public setRoomID(roomId: number): Player {
            this.roomId = roomId;
            return this;
        }

        /** Rozłączanie */
        private disconnect() {
            if(this.room)
                this.room.unjoin(this);
            Player.players = _(Player.players).without(this);
        }
    };
};

import Server = Core.Server;
(() => {
    let room: Server.Room = new Server.Room('test');

    /** Podczas połączenia */
    io.on('connection', (socket: Socket) => {
        new Core.Server.Player(socket);
    });
})();