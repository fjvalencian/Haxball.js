/// <reference path="../types.ts" />
/// <reference path="./game.ts" />

module Game {
	export class Player extends Core.Scene.KernelObject {
        constructor( public info: Data.PlayerInfo
                   , private optFlags: number = 0
                   , public v: Types.Vec2 = new Types.Vec2)  {
            super(info.rect);
            this.info.flags |= optFlags;
        }

        /**
         * Wysyłanie na serwer nowych flag
         * @param  {number} newFlags Nowe flagi
         */
        public sendFlag(newFlag: number, remove: boolean = false): Player {
            let out = remove 
                        ? (this.info.flags & ~newFlag) 
                        : (this.info.flags | newFlag);
            socket.emit('set flags', out & ~this.optFlags);
            return this;
        }
        public fetchFlag(newFlag: number): Player {
            this.info.flags = newFlag | this.optFlags;
            return this;
        }

        /**
         * Uderzanie piłeczki
         * @param  {boolean}  release Puszczenie piłeczki
         */
        public shoot(release: boolean = false): Player {
            return this.sendFlag(Data.PlayerFlags.SHOOTING, release);
        }

        /** Prerenderowanie gracza */
        public draw(ctx: Types.Context) {
            let player = this.info.isPlayer()
              , ball = this.info.isBall()
              , color = '#008B8B';
            if(ball)
                color = 'white';
            else if(this.info.team == Data.Team.RIGHT)
                color = '#DC143C';

            ctx.save();
            ctx.translate(this.rect.x, this.rect.y);

            /** Gracz */
            Template.Circle(ctx
                , new Types.Vec2
                , {
                      color: color
                    , r: this.rect.w / 2
                    , centered: true
                    , stroke: { 
                          width: 3
                        , color: Core.hasFlag(this.info.flags, Data.PlayerFlags.SHOOTING) ? 'white' : 'black'
                    }
                });

            /** Obramówka wokół gracza */
            if(player) {
                let r = this.rect.w * 0.7 + this.v.length() * 1.3;
                Template.Circle(ctx
                    , new Types.Vec2(
                          this.rect.w / 2 - r
                        , this.rect.h / 2 - r)
                    , {
                          r: r
                        , centered: true
                        , stroke: { 
                              width: 3
                            , color: 'rgba(255, 255, 255, 0.11)'
                        }
                    });
            }

            /** nr gracza */
            if(!ball)
                Template.Text(ctx
                    , new Types.Vec2(
                          this.rect.w / 2 - 4
                        , this.rect.h / 2 + 6)
                    , { text: <any> this.info.number });

            /** nick */
            if(!player)
                Template.Text(ctx
                    , new Types.Vec2(
                          this.rect.w / 2 - (this.info.nick ? this.info.nick.length * 3.3 : 0)
                        , this.rect.h + 15)
                    , { text: this.info.nick
                      , font: { size: 12, color: 'white', name: 'ArcadeClassic' } });


            ctx.restore();
        }

        /** Sprite gracza */
        public update() {
            this.rect.add(<Types.Rect> this.v);
        }
    }
}