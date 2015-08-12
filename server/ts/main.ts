/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/socket.io/socket.io.d.ts" />
/// <reference path="../defs/underscore/underscore.d.ts" />
/// <reference path="./types.ts" />
/// <reference path="./multiplayer.ts" />

var _: UnderscoreStatic = require('underscore')
  , io = require('socket.io').listen(3000);

type Socket = SocketIO.Socket;
module Core.Server {
    export import Rect = Types.Rect;
    export import Vec2 = Types.Vec2;

    /** Kody błędów */
    export enum Errors {
          NICK_ALREADY_EXISTS
        , INVALID_NICK
    };

    /**
     * Błąd na serwerze
     * @param {Socket} socket Socket
     * @param {Errors} err    Kod błędu
     */
    export function serverError(socket: Socket, err: Errors) {
        socket.emit('server error', { code: err });
    };

    /** Gracz */
    export class Player {
        /** Gracze w całym serwerze */
        static players: Player[] = [];

        /** Identyfikator gracza w roomie */
        constructor(
                  private socket: Socket
                /** Do PlayerInfo*/
                , flags: number = 0
                , team: Data.Team = Data.Team.SPECTATORS

                /** Zależne od piłki */
                , public rect: Rect = new Rect
                , public mass: number = 0
                , public v: Vec2 = new Vec2) {
            _(this.info).extend({
                  team: team
                , rect: rect
                , flags: flags
            });
            if (this.socket)
                bind(this.socket, this, {
                      'disconnect': this.disconnect
                    , 'set nick': this.setNick
                    , 'set room': this.setRoom
                    , 'move': this.move
                    /** Strzelanie */
                    , 'set flags': this.setFlags
                });

            /** Rejestrowania gracza */
            Player.players.push(this);
        }

        /**
         * Ustawianie nowych flag i broadcast
         * @param  {number} flags Nowe flagi
         */
        public setFlags(flags: number): Player {
            this.info.flags = flags;
            this.room.broadcast('new flags', <Data.NewFlags> {
                  nick:  this.info.nick
                , flags: this.info.flags
            });
            return this;
        }

        /** Strzelanie piłeczką */
        private shoot(release: boolean = false): Player {
            return this;
        }

        /** Socket */
        public getSocket(): Socket { return this.socket; }
        public send(type: string, data: any): Player {
            if (this.socket)
                this.socket.emit(type, data);
            return this;
        }

        /** Łatwiejsza serializacja danych */
        public info: Data.PlayerInfo = new Data.PlayerInfo;
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
            if (_.findWhere(Player.players, { nick: nick })
                    || !Player.validateNick(nick)) {
                serverError(this.socket, Errors.NICK_ALREADY_EXISTS);

            } else {
                this.info.nick = nick;
                this.socket.emit('auth success', nick);
            }
        }

        /** Poruszanie się */
        static vectors: Vec2[] = [
              new Vec2(0.0, -1.0)
            , new Vec2(0.0, 1.0)
            , new Vec2(-1.0, 0.0)
            , new Vec2(1.0, 0.0)
        ];
        public move = (() => {
            let cache = {};
            return (dir: Types.Direction|Types.Vec2) => {
                if (!this.config
                        || this.v.length() > this.config.maxSpeed.player && this.isPlaying())
                    return;
                let move = null;
                if (dir instanceof Types.Vec2)
                    move = dir;
                else
                    move = cache[<any> dir]
                            ||  (
                                cache[<any> dir] = Player
                                    .vectors[<Types.Direction> dir]
                                    .clone()
                                    .mulBy(this.config.maxSpeed.move)
                                );
                this.v.add(move);
            }
        })();

        /** Ustawianie pokoju */
        private room: Room = null;
        private config: Data.RoomConfig = null;
        public setRoom(room: Room|string, joinSocket: boolean = true): Player {
            /** Wchodzenie do pokoju */
            this.room = _.isString(room)
                ? Room.rooms[<string> room]
                : <Room> room;

            /** Kopiowanie konfiguracji */
            this.config = this.room.config;
            this.setTemplate(
                this.config.templates[
                    Core.hasFlag(this.info.flags, Data.PlayerFlags.BALL) 
                        ? 'ball' 
                        : 'player'
                ]);

            /** Po konfiguracji wchodzenie do pokoju */
            if(joinSocket)
                this.room.join(this);
            return this;
        }

        /** Ustawianie stanu gracza */
        private type: Data.PlayerTemplate = null;
        private setTemplate(type: Data.PlayerTemplate): Player {
            this.type = type;
            this.rect.copy(type.rect);
            this.mass = type.mass;
            return this;
        }

        /** Rozłączanie */
        private disconnect() {
            Player.players = _(Player.players).without(this);
            if (this.room)
                this.room.unjoin(this);
        }
    }

    /** Pokój */
    export class Room {
        /** Gracze w pokoju */
        static rooms: { [index: string]: Room } = {};

        constructor(private name: string) {
            Room.rooms[name] = this;
            this.players.push(
                new Player(null, Data.PlayerFlags.BALL).setRoom(this, false)
            );

            setInterval(
                  this.update.bind(this)
                , 1000 / this.config.delay);
        }
        public getName(): string { return this.name; }

        /** Układ graczy po dołączeniu */
        public config: Data.RoomConfig = {
              delay: 60
            , maxSpeed: {
                  move: 0.06
                , player: 3.0
                , ball: 3.0
            }
            , board: new Rect(0, 0, 500, 170)
            , gates: [
                  new Rect(-50, 85 - 30, 50, 60)
                , new Rect(500, 85 - 30, 50, 60)
            ]
            , shootPower: 1.05
            , templates: {
                  player: {
                      rect: new Rect(0, 0, 28, 28)
                    , mass: 1.0
                }
                , ball: {
                      rect: new Rect(0, 0, 20, 20)
                    , mass: 10.0
                }
            }
        };
        public get board(): Rect {
            return this.config.board; 
        }

        /** 
         * Testowanie kolizji
         * http://ericleong.me/research/circle-circle/
         */
        private updatePhysics() {
            for (let i = 0; i < this.players.length; ++i) {
                let p1 = this.players[i],
                    insideGate = false; // bramka może być poza planszą i wtedy nie obowiązują kolizje z bokami

                if(p1.info.isBall()) {
                    /** Kolizje z bramkami */
                    for(let j = 0;j < this.config.gates.length; ++j)
                        if(p1.rect.intersect(this.config.gates[j])) {
                            insideGate = true;
                            break;
                        }
                } else {
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

                            /** Kolizja z graczem */
                            p1.v.x -= p * p1.mass * nx;
                            p1.v.y -= p * p1.mass * ny;
                            p1.rect.add(p1.v);

                            if (p1.info.hasFlag(Data.PlayerFlags.SHOOTING)
                                && p2.info.isBall()
                                && p2.v.length() < this.config.maxSpeed.ball) {
                                p = 1.0;
                                nx *= this.config.shootPower;
                                ny *= this.config.shootPower;
                            }

                            p2.v.x += p * p2.mass * nx;
                            p2.v.y += p * p2.mass * ny;
                            p2.rect.add(p2.v);
                        }
                    }
                }

                /** Tylko gdy nie jest w bramce */
                if(!insideGate) {
                    /** Kolizje z górną częścią boiska */
                    if (this.board.y >= p1.rect.y
                            || this.board.y + this.board.h <= p1.rect.y + p1.rect.h)
                        p1.rect.y += p1.v.y *= -1;

                    /** Kolizje z bokami boiska */
                    if (this.board.x >= p1.rect.x
                            || this.board.x + this.board.w <= p1.rect.x + p1.rect.w)
                        p1.rect.x += p1.v.x *= -1;
                } else
                    p1.v.mulBy(.8);

                /** Aktualizowanie prędkości */
                p1.rect.add(
                    p1.v.mul(new Vec2(.98, .98)));
            }
        }

        /** Lista graczy */
        private players: Player[] = [];

        /**
         * Aktualizacja pozycji graczy
         * 4B ID gracza
         * 16B [ x, y, v.x, v.y ]
         */
        private static PACK_SIZE: number = 5;
        private update() {
            /** Aktualizowanie fizyki */
            this.updatePhysics();

            /** Rozsyłanie jeśli jest ktoś w pokoju */
            if (this.players.length) {
                let pack = new Float32Array(Room.PACK_SIZE * this.players.length);
                _(this.players).each((player, index) => {
                    pack.set(<any> 
                          [ index
                          , player.info.rect.x
                          , player.info.rect.y
                          , player.v.x
                          , player.v.y
                          ]
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
            if (type.length && data)
                (player ? player.getSocket().broadcast : io)
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
                .send( 'room entered'
                    ,  <Data.RoomEntered> _.extend(this.config, {
                        msg: 'Witamy w naszych skromnych prograch!'
                    }))
                .getSocket().join(this.name);

            this.players.push(player);
            return this.rebuildPlayerList();
        }

        /**
         * Podczas przydzielenia nowego gracza
         * automatycznie rozmieszcza graczy na planszy
         */
        private rebuildPlayerList(): Room {
            /** Przydzielanie numerków */
            let groups = {}
              , list = _(this.players)
                    .chain()
                    .each((p: Player) => {
                        if(!groups[p.info.team])
                            groups[p.info.team] = 0;
                        let index = ++groups[p.info.team];

                        /** Aktualizacja numeru */
                        p.info.number = index;
                        p.v.xy = [ 0, 0 ];

                        /** Piłka na środku */
                        if(p.info.isBall()) {
                            p.info.rect
                                .sub(p.info.rect.center())
                                .add(this.board.center());
                        } else {
                            /** Pozycja gracza to procent */
                            let pos = new Vec2(
                                  .25 * (index / 4) * this.board.w
                                , .25 * (index % 4) * this.board.h
                            );
                            p.info.rect.copy(pos.clone().add(this.board));
                            if (p.info.team === Data.Team.RIGHT)
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
         * Logowanie się do pokoju
         * @param  {Player} player   Gracz
         * @param  {string} password Hasło
         */
        private password: string = null;
        public join(player: Player, password?: string): Room {
            if (!this.password || this.password === password) {
                /** REFACTORING */
                this.addToMatch(player);
            }
            return this;
        }

        /**
         * Wychodzenie z pokoju i uaktualnianie listy graczy
         * @param {Player} player Gracz
         */
        public unjoin(player: Player) {
            this.players = _(this.players).without(player);
            this.rebuildPlayerList();
        }

        /** Jeśli wymaga hasła zwróci true */
        public isLocked(): boolean {
            return <any> (this.password && this.password.length);
        }
    }
}
import Server = Core.Server;
(() => {
    let room: Server.Room = new Server.Room('test');

    /** Podczas połączenia */
    io.on('connection', (socket: Socket) => {
        new Core.Server.Player(socket);
    });
})();