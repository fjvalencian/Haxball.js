/// <reference path="./game.ts" />
module Game {
	export class Player extends Core.Scene.KernelObject {
        constructor( private type: Data.PlayerType
                   , public info: Data.PlayerInfo
                   , public v: Types.Vec2 = new Types.Vec2 /** Prędkość */)  {
            super(info.rect);
        }
        public getType(): Data.PlayerType { return this.type; }
        public isPlayer(): boolean {
			return this.type === Data.PlayerType.CURRENT_PLAYER;
        }

        /** Uderzenie piłeczki */
        private shooting: boolean = false;
        public shoot(release: boolean = false): Player {
            socket.emit(!release ? 'enable shooting' : 'disable shooting');
            this.shooting = !release;
			return this;
        }

        /** Sprite gracza */
        public update() {
            this.rect.add(<Types.Rect> this.v);
        }
        public draw(ctx: Types.Context) {
            let player = this.isPlayer()
              , ball = this.info.isBall()
           	  , color = 'green';
            if(ball)
                color = 'white';
            else if(this.info.team == Data.Team.RIGHT)
                color = 'red';

            /** Gracz */
            Template.Circle(ctx
                , this.rect
                , {
                      color: color
                    , r: this.rect.w / 2
                    , centered: true
                    , stroke: { 
                    	  width: 3
                    	, color: this.shooting ? 'white' : 'black'
                    }
                });
            this.shooting = false;

            /** Obramówka wokół gracza */
            if(player) {
                let r = this.rect.w * 0.7 + this.v.length() * 1.3;
                Template.Circle(ctx
                    , new Types.Vec2(
                          this.rect.x + this.rect.w / 2 - r
                        , this.rect.y + this.rect.h / 2 - r)
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
                          this.rect.x + this.rect.w / 2 - 6
                        , this.rect.y + this.rect.h / 2 + 8)
                    , { text: <any> this.info.number });

            /** nick */
            if(this.type !== Data.PlayerType.CURRENT_PLAYER)
                Template.Text(ctx
                    , new Types.Vec2(
                          this.rect.x + this.rect.w / 2 - (this.info.nick ? this.info.nick.length * 3.3 : 0)
                        , this.rect.y + this.rect.h + 20)
                    , { text: this.info.nick
                      , font: { size: 12, color: 'white', name: 'ArcadeClassic' } });
        }
    };
}