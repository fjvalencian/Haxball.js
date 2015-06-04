/// <reference path="../game.ts" />
module Game.State {
	export class Soccer extends Core.State {
        private score: Scene.Text = new Scene.Text('1:1', new Types.Vec2(355, 26));

        public start() {
            socket
                .emit('set nick', 'user' + Math.ceil(Math.random() * 10))
                .on('auth success', (nick: string) => {
                    socket.emit('set room', 'test');
                    this.add([
                          <any> new Board(this, nick)
                        , this.score
                    ]);
                });
        }
    };
}