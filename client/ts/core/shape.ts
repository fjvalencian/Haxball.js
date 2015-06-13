/// <reference path="graph.ts" />
/// <reference path="object.ts" />

module Core.Scene {
    import IType = Input.Type;

    /** Wrapper na kształt by nie duplikować kodu */
    export class ShapeWrapper extends KernelObject {
        constructor( public caller: Graph.Template.Shape
                   , public params: any
                   , rect) {
            super(rect);
        }
        public draw(ctx: Types.Context) { 
            this.caller(ctx, this.rect, this.params); 
        }
    };

    /** Tekst */
    export class Text extends ShapeWrapper {
        constructor( text: string
                   , pos: Types.Vec2
                   , font?: Graph.Font) {
            super(Graph.Template.Text, { text: text, font: font }, pos)
        }

        /** Gettery */
        public get text() { return this.params.text; }
        public set text(t) { this.params.text = t; }
        public get font() { return this.font; }

        /** Pobieranie szerokości tekstu */
        public getWidth(): number { 
            return this.text.length * 14.5; 
        }
    };

    /** Obraz */
    export class Sprite extends KernelObject {
        constructor( public img: Types.Image|string
                   , rect: Types.Rect) {
            super(rect);
            this.cutSize();
        }

        /** Wyznaczanie rozmiaru obrazu */
        private cutSize() {
            if (typeof this.img !== 'string') {
                this.rect.w = this.rect.w || (<Types.Image> this.img).width;
                this.rect.h = this.rect.h || (<Types.Image> this.img).height;
            }
        }

        /** Renderowanie */
        public draw(ctx: Types.Context) {
            if(typeof this.img === 'string') {
                if(!this.kernel)
                    throw new Error('Kernel cannot be null!');
                this.img = this.kernel.res(<string> this.img) || this.img;
                this.cutSize();
            } else
                Graph.Template.Image(ctx, this.rect, { img: <Types.Image> this.img });
        }
    };

    /** Canvas */
    export class RenderTarget extends KernelObject {
        constructor(rect: Types.Rect, canvas?: Types.Canvas) {
            super(rect);
            if(!canvas) {
                canvas = <Types.Canvas> document.createElement('canvas');
                canvas.width = rect.w;
                canvas.height = rect.h;
            }
            this.config = new CanvasConfig(canvas);
        }

        /** Prerenderowanie */
        private config: CanvasConfig;
        public prender(callback: { (ctx: Types.Context): void }): RenderTarget {
            callback(this.config.ctx);
            return this;
        }

        /** Renderowanie */
        public draw(ctx: Types.Context) {
            ctx.drawImage(this.config.canvas, this.rect.x, this.rect.y);
        }
    };
};