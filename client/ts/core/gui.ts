/// <reference path="scene.ts" />
/// <reference path="graph.ts" />

module Core.Scene.GUI {
    import Template = Graph.Template;
    
    /** Konfiguracja wyglądu kontrolek */
    const config = {
          RADIUS: 5
        , PROGRESS: { bar: 'white', border: 'white', padding: new Types.Rect(-3, -3, 6, 6) }
        , BUTTON:   { fill: 'black' }
    };

    /** Pasek ładowania */
    export class ProgressBar extends ShapeWrapper {
        constructor( shape: Types.Rect
                   , public proc: number = 0.0
                   , private w: number = shape.w) {
            super( Template.Rect
                 , { radius: config.RADIUS, color: config.PROGRESS.bar }
                 , shape);
        }
        public setProc(proc: number) {
            this.proc = proc;
            return this;
        }

        /** Rendering */
        public draw(ctx: Types.Context) {
            /** Pasek */
            this.rect.w = this.w * this.proc;
            super.draw(ctx);

            /** Obramówka ze stałym rozmiarem */
            this.rect.w = this.w;
            this.rect.add(config.PROGRESS.padding);
            Template.Rect(ctx
                , this.rect
                , { radius: config.RADIUS, stroke: { width: 2, color: config.PROGRESS.border } });
            this.rect.sub(config.PROGRESS.padding);
        }
    };

    /** Guzik */
    export class Button extends ShapeWrapper {
        constructor( shape: Types.Rect
                   , private text: string) {
            super( Template.Rect
                 , { color: config.BUTTON.fill }
                 , shape);
        }

        /** Rendering */
        public draw(ctx: Types.Context) {
            super.draw(ctx);
        }
    }
};