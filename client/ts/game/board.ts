/// <reference path="./player.ts" />

module Game {
	export class Board extends Core.Scene.ContainerObject<Player> {
        constructor( rect: Types.Rect
                   , private state: Core.State
                   , private playerNick: string) {
            super(rect);
            Core.bind(socket, this, {
                  'room update'  : this.onUpdate
                , 'room entered' : this.onEnter
                , 'room rebuild' : this.onRebuild
                , 'new flags'    : this.newFlags
            });
        }

        /** Inicjacja planszy */
        public init() {
            let keys = {
                  87: Types.Direction.UP
                , 83: Types.Direction.DOWN
                , 65: Types.Direction.LEFT
                , 68: Types.Direction.RIGHT
            };
            this
                .listener(Input.Type.KEY_DOWN, (event: Input.Event) => {
                    for(let key in event.data) {
                        /** Jeśli jest klawiszem ruchu */
                        if(typeof keys[key] !== 'undefined')
                            socket.emit('move', keys[key]);

                        /** Jeśli jest klawiszem strzału */
                        if(key == Input.Key.SPACE && this.player)
                            this.player.shoot();
                    }
                })
                .listener(Input.Type.KEY_UP, (event: Input.Event) => {
                    /** Jeśli jest klawiszem strzału */
                    if(event.data == Input.Key.SPACE)
                        this.player.shoot(true);
                });
        }

        /** Rendering */
        private background: Scene.RenderTarget;
        private board: Types.Rect = new Types.Rect;
        private gates: Types.Rect[] = [];

        public drawBoard(ctx: Types.Context) {
            if(!this.board.w)
                return;

            ctx.save();

            /** Pionowe pasy boiska */
            const w = this.board.w / 14;
            for(let i = 0; i < 14; i++) {
                ctx.fillStyle = i % 2 ? '#000000': '#111111';
                ctx.fillRect(i * w, 0, w + 1, this.board.h);
            }

            /** Obramowanie boiska */
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#333333';

            ctx.beginPath();
            ctx.rect(0, 0, this.board.w, this.board.h);
            ctx.stroke();

            /** Linie boiska */
            ctx.beginPath();
            ctx.moveTo(this.board.w / 2, 2);
            ctx.lineTo(this.board.w / 2, this.board.h - 2);
            ctx.stroke();

            ctx.restore();
            super.draw(ctx);
        }
        public draw(ctx: Types.Context) {
            if (!this.player || !this.background)
                return;

            ctx.save();
            ctx.beginPath();

            ctx.translate(this.rect.x, this.rect.y);
            ctx.rect(0, 0, this.rect.w, this.rect.h);
            ctx.clip();

            /** Jeśli plansza jest większa niż rozmiar widoku to centruje w kamerze */
            let cam = new Types.Vec2(
                  -this.player.rect.x * (this.board.w / this.rect.w) + this.rect.w / 2
                , -this.player.rect.y * (this.board.h / this.rect.h) + this.rect.h / 2);
            ctx.translate(cam.x, cam.y);

            this.background.draw(ctx);
            ctx.translate(-this.rect.x, -this.rect.y);
            super.draw(ctx);

            ctx.restore();
        }

        /**
         * Podczas aktualizacji pobierane są pozycji graczy
         * elementy, które są na planszy to:
         * - [] - gracze
         * - obiekty nie aktualizowane
         * GRACZE MUSZĄ BYĆ PRZED OBIEKTAMI, kiedyś się
         * to naprawi. Kompresja nagłówków :)
         * @param {Data.RoomUpdate} data Plansza
         */
        private onUpdate(data: Data.RoomUpdate) {
            let arr = new Float32Array(data);
            for(let i = 0; i < arr.length; i += 5) {
                let p = this.objects[ arr[i] ];
                p.rect.xy = [ arr[ i + 1 ]
                            , arr[ i + 2 ]
                            ];
                p.v.xy = [ arr[ i + 3 ]
                         , arr[ i + 4 ]
                         ];
            }
        }

        /**
         * Po pomyślnym wejściu do pokoju
         * @param {Data.RoomJoin} roomInfo Informacje o pokoju
         */
        private onEnter(roomInfo: Data.RoomEntered) {
            /** Kopiowanie wymiarów planszy */
            this.board.copy(roomInfo.board);

            /** Kopiowanie pozycji bramek i ich rozmiarów */
            this.gates = _(roomInfo.gates).each(rect => {
                return Types.Rect.clone(rect);
            });

            /** prerendering */
            this.background = new Scene.RenderTarget(
                    new Types.Rect( 0, 0
                                  , this.board.w + this.board.x
                                  , this.board.h + this.board.y)
            ).prender(this.drawBoard.bind(this))
        }

        /**
         * Podczas podłączania się nowego gracza
         * @param {Data.PlayerInfo} info Nowy gracz
         */
        private player: Player = null;
        private onRebuild(info: Data.RoomJoin) {
            /** Różnica nicków między planszami */
            let localNicks = _(this.objects).map(obj => { return obj.info && obj.info.nick; })
              , newNicks   = _(info.players).pluck('nick');

            /** Tworzenie graczy od nowa */
            this.clear();
            _(info.players).each((player: Data.PlayerInfo) => {
                let p = this.createPlayer(player);
                if(p.info.isPlayer())
                    this.player = p;
            });

            /** Tworzenie bramek od nowa będzie prostsze */
            _(this.gates).each(gate => {
                this.add(<any> new Scene.Sprite('gate', gate));
            });

            /** Wysyłanie wiadomości o przebudowie */
            if(localNicks.length)
                this.kernel.broadcast({ 
                      type: Input.Type.PLAYER_LIST_UPDATE
                    , data: {
                          removed: _(localNicks).difference(newNicks)
                        , added: _(newNicks).difference(localNicks)
                    }
                }, true);
        }
        public getPlayer(): Player {
            return this.player;
        }

        /**
         * Tworzenie gracza
         * @param  {Data.PlayerInfo} info Informacje z serwera
         */
        private createPlayer(info: Data.PlayerInfo): Player {
            return this.add(
                new Player( new Data.PlayerInfo().copy(info)
                          , info.nick === this.playerNick ? Data.PlayerFlags.PLAYER : 0));
        }

        /**
         * Ustawianie nowych flag na graczach
         * @param {Data.NewFlags} data Flagi
         */
        private newFlags(data: Data.NewFlags) {
            _(this.objects)
                .find(obj => {
                    return obj.info.nick === data.nick;
                })
                .fetchFlag(data.flags);
        }
    }
}