/// <reference path="../game.ts" />

module Game.State {
    /** Pole chatu */
    export class Chatbox extends Scene.ContainerObject<Scene.Text> {
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
}