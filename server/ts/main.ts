/// <reference path="../defs/node/node.d.ts" />
/// <reference path="../defs/socket.io/socket.io.d.ts" />
/// <reference path="../defs/underscore/underscore.d.ts" />

var _: UnderscoreStatic = require('underscore')
  , io = require('socket.io').listen(3000);
type Socket = SocketIO.Socket;

/** Czyszczenie konsoli */
console.clear = _.bind(process.stdout.write, process.stdout, '\033c');
console.clear();

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

/**
 * Bindowanie metod
 * @param {Socket} socket       Socket
 * @param {any}    context      Kontekst
 * @param {any }   callbacks    Callbacki
 */
var bind = function(
          socket: Socket
        , context: any
        , callbacks: { [index: string]: any }) {
    _.each(callbacks, (val: any, key: string) => {
        socket.on(key, _.bind(val, context));
    });
};

/** TODO: Pokój */
// class Group {
//     static groups: Group[] = [];
//     constructor() {
//         Group.groups.push(this);
//     }
// };

/** Gracz */
class Player {
    static players: Player[] = [];
    constructor(private socket: Socket) {
        bind(this.socket, this, {
              'disconnect' : this.disconnect
            , 'set nick'   : this.setNick
            , 'change Room': this.changeRoom
        });
        Player.players.push(this);
    }

    /** Zmiana nicku */
    public nick: string = null;
    public setNick(nick: string) {
        if(_.findWhere(Player.players, { nick: nick })) {
            serverError(this.socket, Errors.NICK_ALREADY_EXISTS);
        } else
            this.nick = nick;
    }
    /** Walidacja nicku */
    private static validateNick(nick: string): Boolean {
        return nick && nick.length < 30;
    }

    /** Zmiana pokoju */
    public changeRoom() {
        if(!Player.validateNick(this.nick))
            serverError(this.socket, Errors.INVALID_NICK);
    }

    /** Rozłączanie */
    private disconnect() {
        Player.players = _.without(Player.players, _.findWhere(Player.players, this));
    }
};

/**
 * Tworzenie nowego gracza
 * @param {Socket} socket Socket
 */
io.on('connection', (socket: Socket) => {
    new Player(socket);
});