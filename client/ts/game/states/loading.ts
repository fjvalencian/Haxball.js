/// <reference path="../game.ts" />

module Game.State {
    const GAME_PACK = {
          'logo': 'img/logo.png'
        , 'gate': 'img/gate.png'
    };
	export class Loading extends Core.State {
        protected load() {
            this.kernel.preload(_(GAME_PACK).map((val, key): any => {
                return {
                      path: val
                    , name: key
                }
            }));
        }

        protected listeners() {
            this
                .listener(Input.Type.LOADING, (event: Input.Event): void => {
                    this.progress.setProc(event.data);
                });
        }

        private progress: GUI.ProgressBar = null;
        public start() {
            let logoPos: Types.Rect =
                new Types.Rect(
                      this.kernel.size.w / 2 - 50
                    , this.kernel.size.h / 2 - 50
                    , 100
                    , 100);
            this.create.sprite('logo', logoPos);
            this.add(
                this.progress = new GUI.ProgressBar(
                      new Types.Rect(logoPos.x - 25, logoPos.y + logoPos.h + 44, 150, 4)
                    , 0.0));

            let banner = this.create.text('hex.js', new Types.Vec2(0, 0));
            banner.rect.xy = [
                  logoPos.x + 50 - banner.getWidth() / 2
                , logoPos.y + logoPos.h + 25
            ];
            this.add(banner);
        }
    }
}