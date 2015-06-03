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
              size: new Rect(0, 0, 29, 29)
            , mass: 1.0
            , speed: 0.06
        }
    };

    /** Pokój */
    export class Room {
        /** Gracze w pokoju */
        static rooms: { [index: string]: Room } = {};

        constructor(private name: string) {
            Room.rooms[name] = this;

            this.players.push(new Player(null, true));
            setInterval( _.bind(this.update, this)
                       , Config.delay);
        }
        public getName(): string { return this.name; }

        /** Układ graczy po dołączeniu */
        private board: Rect = new Rect(2, 2, 746, 370);
        private gateHeight: number = 150;
        private playerLocations: Vec2[] = [
              new Vec2(50, 50)
            , new Vec2(50, 100)
            , new Vec2(50, 150)
            , new Vec2(50, 200)
            , new Vec2(50, 250)
            , new Vec2(100, 100)
            , new Vec2(100, 150)
            , new Vec2(100, 200)
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

                /** Kolizje z bokami boiska, kulka przelatuje przez bok */
                let c = this.board.y + this.board.h / 2;
                if(!(p1.info.ball && p1.rect.y >= c - this.gateHeight / 2 && p1.rect.y + p1.rect.h <= c + this.gateHeight / 2)
                        && (this.board.x >= p1.rect.x || this.board.x + this.board.w <= p1.rect.x + p1.rect.w))
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
                        p1.rect.add(p1.v);

                        p2.v.x += p * p2.mass * nx;
                        p2.v.y += p * p2.mass * ny;
                        p2.rect.add(p2.v);
                    }
                }
                /** Aktualizowanie prędkości */
                p1.rect.add(
                    p1.v.mul(new Vec2(0.98, 0.98)));
            }
        }


        /**
         * Aktualizacja pozycji graczy
         * 4B ID gracza
         * 16B [ x, y, v.x, v.y ]
         */
        private static PACK_SIZE: number = 5;
        private players: Player[] = [];
        private ball: Player = null;

        private update() {
            /** Aktualizowanie fizyki */
            this.updatePhysics();

            /** Rozsyłanie jeśli jest ktoś w pokoju */
            if(this.players.length) {
                let pack = new Float32Array(Room.PACK_SIZE * this.players.length);
                _(this.players).each((player, index) => {
                    pack.set( <any> [ index, player.info.rect.x, player.info.rect.y, player.v.x, player.v.y ]
                            , index * Room.PACK_SIZE);
                });
                this.broadcast('room update', new Float32Array(pack).buffer);
            }
        }

        /**
         * Broadcast wiadomości po klientach
         * @param {string} type Type wiadomości
         * @param {any}    data Dane
         */
        public broadcast(type: string, data: any, player?: Player): Room {
            if(type.length && data)
                (player? player.getSocket().broadcast: io)
                    .to(this.name)
                    .emit(type, data);
            return this;
        }

        /**
         * Po odejściu gracza numerki na koszulkach 
         * się zmieniają i przydzielane są nowe
         * @return {Room} [description]
         */
        public addToMatch(player: Player): Room {
            /** Wysyłanie do gracza listy wszystkich graczy */
            player
                .setTeam(this.players.length % 2 ? Data.Team.RIGHT : Data.Team.LEFT)
                .send('room entered', <Data.RoomEntered> {
                      board: this.board
                    , gateHeight: this.gateHeight
                    , msg: 'Witamy w naszych skromnych prograch!'
                })
                .getSocket().join(this.name);

            this.players.push(player);
            return this.rebuildPlayerList();
        }

        private rebuildPlayerList(): Room {
           /** Przydzielanie numerków */
           let list = _(this.players)
                .chain()
                .each((p: Player, index: number) => {
                    p.info.number = index;
                    /** Piłka na środku */
                    if(p.info.ball) {
                        p.info.rect
                            .sub(p.info.rect.center())
                            .add(this.board.center());
                        p.info.rect.h = p.info.rect.w = 20;
                        p.mass = 1000;

                    /** Gracze z przeciwnej drużyny */
                    } else {
                        p.info.rect.copy(
                            this.playerLocations[index]
                                .clone()
                                .add(this.board));
                        if(p.info.team === Data.Team.RIGHT)
                            p.info.rect.x = this.board.x + this.board.w - p.info.rect.x;
                    }
                })
                .pluck('info')
                .value();
            /** Uaktualnianie listy graczy */
            this.broadcast('room rebuild', <Data.RoomJoin> {
                players: list
            });
            return this;
        }

        /**
         * Logowanie się do pokoju, zwracanie aktualnej listy graczt
         * @type {string}
         */
        private password: string = null;
        public join(player: Player, password?: string): Room {
            if(!this.password || this.password === password) {
                /** REFACTORING */
                this.addToMatch(player);
            }
            return this;
        }
        public unjoin(player: Player) {
            /** Uaktualnianie listy graczy */
            this.players = _(this.players).without(player);
            this.rebuildPlayerList();
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
        constructor( private socket: Socket
                   , ball: boolean = false
                   , team: Data.Team = Data.Team.SPECTATORS
                   , public rect: Rect = Config.player.size.clone()
                   , public mass: number = Config.player.mass
                   , public v: Vec2 = new Vec2) {
            if(this.socket)
                bind(this.socket, this, {
                      'disconnect' : this.disconnect
                    , 'set nick'   : this.setNick
                    , 'set room'   : this.setRoom
                    , 'move'       : this.move
                });
            _(this.info).extend({
                  ball: ball
                , team: team
            });

            /** Rejestrowania gracza */
            Player.players.push(this);
        }

        /** Socket */
        public getSocket(): Socket  { return this.socket; }
        public send(type: string, data: any): Player {
            if(this.socket)
                this.socket.emit(type, data);
            return this;
        }

        /** Łatwiejsze wysyłanie informacji */
        public info: Data.PlayerInfo = {
              number: 0
            , nick: ''
            , op: false
            , ball: false
            , rect: this.rect
            , team: Data.Team.SPECTATORS
        };
        public setNumber(number: number): Player {
            this.info.number = number;
            return this;
        }

        /** Czy jest w grze */
        public isPlaying(): boolean {
            return this.info.team !== Data.Team.SPECTATORS;
        }
        public setTeam(team: Data.Team): Player {
            this.info.team = team;
            return this;
        }

        /** Restrykcje nicku */
        private static validateNick(nick: string): boolean {
            return nick && nick.length < 30;
        }
        public setNick(nick: string) {
            if(_.findWhere(Player.players, { nick: nick })
                    && !Player.validateNick(nick)) {
                serverError(this.socket, Errors.NICK_ALREADY_EXISTS);

            } else {
                this.info.nick = nick;
                this.socket.emit('auth success', nick);
            }
        }

        /** Poruszanie się */
        static vectors: Vec2[] = [
              new Vec2(0.0, -Config.player.speed)
            , new Vec2(0.0, Config.player.speed)
            , new Vec2(-Config.player.speed, 0.0)
            , new Vec2(Config.player.speed, 0.0)
        ];
        public move(dir: Types.Direction|Types.Vec2) {
            if(this.v.length() < 4.0 && this.isPlaying())
                this.v.add(dir instanceof Types.Vec2 
                            ? dir 
                            : Player.vectors[<Types.Direction> dir]);
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