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
        private gateHeight: number = 0;

        public drawBoard(ctx: Types.Context) {
            if(!this.board.w)
                return;
                
            /** Pionowe pasy boiska */
            const w = this.board.w / 14;
            for(let i = 0; i < 14; i++)
                Template.Rect( ctx
                         , new Types.Rect(this.board.x + i * w, this.board.y, w + 1, this.board.h)
                         , { color: i % 2 ? '#568926': '#4a7621'  });

            /** Obramowanie boiska */
            const size = new Types.Vec2(6, this.gateHeight);
            Template.Rect( ctx
                         , this.board
                         , { stroke: { width: 4, color: '#80a65c' } });
            Template.Circle( ctx
                           , this.board.center()
                           , { r: 70
                             , stroke: { width: 4, color: '#80a65c' } })
            Template.Line( ctx
                         , new Types.Rect( this.board.x + this.board.w / 2 - 1
                                         , this.board.y + 2
                                         , 0
                                         , this.board.h - 4)
                         , { width: 4, color: '#80a65c' });

            /** Bramki */
            Template.Rect( ctx
                         , new Types.Rect(this.board.x + this.board.w, this.board.y + this.board.h / 2 - size.y / 2, size.x, size.y)
                         , { stroke: { width: 4, color: 'black' } });
            Template.Rect( ctx
                         , new Types.Rect(this.board.x - size.x, this.board.y + this.board.h / 2 - size.y / 2, size.x, size.y)
                         , { stroke: { width: 4, color: 'black' } });
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
            
            let cam = new Types.Vec2( 
                  -this.player.rect.x * 0.8 - this.rect.x + this.rect.w / 2
                , -this.player.rect.y * 0.8 - this.rect.y + this.rect.h / 2 - this.player.rect.h);
            ctx.translate(cam.x, cam.y);

            this.background.draw(ctx);
            super.draw(ctx);

            ctx.restore();
        }
        public getSize(): Types.Rect {
            return this.board;
        }

        /**
         * Podczas aktualizacji
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
            this.board.copy(roomInfo.board);
            this.gateHeight = roomInfo.gateHeight;
            this.background = new Scene.RenderTarget(
                                        new Types.Rect( this.rect.x
                                                      , this.rect.y
                                                      , this.board.w + this.board.x
                                                      , this.board.h + this.board.y))
                                .prender(this.drawBoard.bind(this))
        }

        /**
         * Podczas podłączania się nowego gracza
         * @param {Data.PlayerInfo} info Nowy gracz
         */
        private player: Player = null;
        private onRebuild(info: Data.RoomJoin) {
            let added = info.players.length !== this.objects.length;

            /** Różnica nicków między planszami */
            let localNicks = _(this.objects).map(obj => { return obj.info.nick; })
              , newNicks   = _(info.players).pluck('nick');

            /** Tworzenie graczy od nowa */
            this.objects = [];
            _(info.players).each((player: Data.PlayerInfo) => {
                let p = this.createPlayer(player);
                if(p.info.isPlayer())
                    this.player = p;
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
         * @param {Data.NewFlags} flags Flagi
         */
        private newFlags(data: Data.NewFlags) {
            _(this.objects)
                .find(obj => {
                    return obj.info.nick === data.nick;
                })
                .fetchFlag(data.flags);
        }
    };
}