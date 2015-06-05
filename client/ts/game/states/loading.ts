/// <reference path="../game.ts" />
module Game.State {
	export class Loading extends Core.State {
        protected load() {
            this.kernel.preload([ 
                { name: 'logo', path: 'img/logo.png' }
            ]);
        }

        protected listeners() {
            this
                .listener(Input.Type.LOADING, (event: Input.Event): void => {
                    this.progress.setProc(event.data);
                });
        }

        private progress: GUI.ProgressBar = null;
        public start() {
            let logo: Types.Rect = 
                new Types.Rect(
                      this.kernel.canvas.width / 2 - 50
                    , this.kernel.canvas.height / 2 - 50
                    , 100
                    , 100);
            this.create.sprite('logo', logo);
            this.add(
                this.progress = new GUI.ProgressBar(
                      new Types.Rect(logo.x - 25, logo.y + logo.h + 44, 150, 4)
                    , 0.0));

            let banner = this.create.text('hex.js', new Types.Vec2(0, 0));
            banner.rect.xy = [ 
                  logo.x + 50 - banner.getWidth() / 2
                , logo.y + logo.h + 25
            ];
            this.add(banner);
        }
    };
}