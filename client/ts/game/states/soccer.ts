/// <reference path="../../core/state.ts" />
/// <reference path="../game.ts" />
/// <reference path="../board.ts" />

module Game.State {
    /** Pole chatu */
    class Chatbox extends Scene.ContainerObject<Scene.Text> {
        constructor(rect: Types.Rect) {
            super(rect);
        }

        public log(from: string, log: string, color: string = 'white') {
            super.add(
                new Scene.Text(
                          from + '> ' + log
                        , new Types.Vec2(0, this.objects.length * 12)
                        , { size: 10, color: color, name: 'ArcadeClassic' }));
        }
        public init() {
            this
                .add(new Scene.Text('Chat:', new Types.Vec2))
                .listener(Input.Type.PLAYER_LIST_UPDATE, (event: Input.Event): void => {
                    let lang = {
                          'removed': 'Rozlaczono:'
                        , 'added': 'Polaczono:'
                    };
                    _(event.data).each((val: string[], key: string) => {
                        if(val.length)
                            this.log('server', lang[key] + ' ' + val.join(','));
                    });
                });
        }
    };

    /** Ekran gry */
	export class Soccer extends Core.State {
        private score: Scene.Text = new Scene.Text('1:1', new Types.Vec2(20, 30));
        private chatbox: Chatbox = new Chatbox(new Types.Rect(20, 340, 100, 200));

        /** Startowanie planszy */
        public start() {
            socket
                .emit('set nick', 'user' + Math.ceil(Math.random() * 10))
                .on('auth success', (nick: string) => {
                    socket.emit('set room', 'test');
                    this.add([
                          <any> new Board(new Types.Rect(0, 40, this.kernel.size.w, 270), this, nick)
                        , this.score
                        , this.chatbox
                        , new Scene.Text(
                              '[spacja] by odbic'
                            , new Types.Vec2(215, 30)
                            , { size: 13, color: 'white', name: 'ArcadeClassic' })
                    ]);
                });
        }
    };
}