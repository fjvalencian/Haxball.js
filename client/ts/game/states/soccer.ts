/// <reference path="../game.ts" />
/// <reference path="../board.ts" />
/// <reference path="../chatbox.ts" />
/// <reference path="../player_list.ts" />

module Game.State {
    /** Ekran gry */
	export class Soccer extends Core.State {
        /** Startowanie planszy */
        public start() {
            socket
                .emit('set nick', 'user' + Math.ceil(Math.random() * 10))
                .on('auth success', (nick: string) => {
                    socket.emit('set room', 'test');
                    this.add([
                          <any> new Board(new Types.Rect(10, 0, 860, 370), this, nick)
                        , new Scene.Text('Hax.JS 0.1', new Types.Vec2(20, 390))
                        , new PlayersInfo(new Types.Rect(420, 390, 100, 100))
                        , new Chatbox(new Types.Rect(20, 440, 100, 100))
                    ]);
                });
        }
    }
}