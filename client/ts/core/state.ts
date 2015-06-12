/// <reference path="scene.ts" />

module Core {
    /** Stan aplikacji np. menu, plansza gry */
    export class State
            extends Scene.ContainerObject<Scene.KernelObject> {
        /** Fabryka elementów */
        public create = {
              sprite: (img: string, rect: Types.Rect): Scene.Sprite => {
                return this.add(new Scene.Sprite(this.kernel.res(img) || img, rect));
            }
            , text: (text: string
                , pos: Types.Vec2
                , font?: Graph.Font
                ): Scene.Text => {
                return this.add(new Scene.Text(text, pos, font));
            }
        };

        /** Metody dziedziczące, brak abstract/virtual :( */
        protected load() { }
        protected listeners() { }

        public start() { }
        public stop() { }

        /** Inicjacja stanu */
        public init() {
            this.load();
            this.listeners();
        }

        /**
         * Rendering
         * @param {Types.Context} ctx  Kontekst canvasu
         */
        public update() { }
        public draw(ctx: Types.Context) {
            super.draw(ctx);
            this.update();
        }
    };
}