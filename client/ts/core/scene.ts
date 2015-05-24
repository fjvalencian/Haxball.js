/// <reference path="graph.ts" />

module Core.Scene {
    import IType = Input.Type;

    /** Obiekty kernela */
    class EventFilter implements Input.Listener {
        protected forwarder = {};

        /** Przekazywanie eventów */
        public listener(type: Input.Type, forwarder: (event: Input.Event) => void) {
            this.forwarder[type] = forwarder;
            return this;
        }

        /** Nasłuch eventu */
        public onEvent(source: any, event: Input.Event) {
            let callback = this.forwarder[event.type];
            if(callback)
                callback(event);
        }
    };

    export class KernelObject extends EventFilter implements Core.Graph.Drawable {
        public kernel: Kernel = null;

        constructor(public rect: Types.Rect) {
            super();
        }
        public draw(ctx: Types.Context) {}

        /**
         * Przekazywanie eventów jeśli wykonywane nad kontrolką
         * @param {any}         source Źródło
         * @param {Input.Event} event  Event
         */
        public onEvent(source: any, event: Input.Event) {
            /** Eventy myszy tylko jeśli jest nad komponentem */
            if(this.rect.w 
                    && [ IType.MOUSE_CLICK, IType.MOUSE_MOVE ].indexOf(event.type) + 1
                    && !this.rect.intersect(<Types.Rect> event.data))
                return;
            super.onEvent(source, event);
        }
    };

    /** Kontener na obiekty */
    export class ContainerObject<T> extends EventFilter implements Core.Graph.Drawable {
        protected objects: T[] = [];

        /**
         * Dodawanie obiektu
         * @param {T} obj Obiekt sceny
         */
        public add(obj: T): T {
            obj && this.objects.push(obj);
            return obj;
        }

        /**
         * Broadcastowanie wiadomości po wszystkich
         * komponentach stanu
         * @param {any}         source Nadawca
         * @param {Input.Event} event  Event
         */
        public onEvent(source: any, event: Input.Event) {
            super.onEvent(source, event);
            _.each(<any> this.objects, (object: KernelObject) => {
                /** Filtrowanie eventów */
                object.onEvent(source, event);
            });
        }
        public broadcast = _.bind(this.onEvent, this);

        /**
         * Renderowanie elementów
         * @param {Types.Context} ctx Kontekst canvasa
         */
        public draw(ctx: Types.Context) {
            /** for dla zwiększenia wydajności */
            for(let i=0; i<this.objects.length; ++i)
                (<any> this.objects[i]).draw(ctx, this);
        }
    };

    /** Wrapper na kształt by nie duplikować kodu */
    export class ShapeWrapper extends KernelObject {
        constructor( public caller: Graph.Template.Shape
                   , public params: any
                   , rect) {
            super(rect);
        }
        public draw(ctx: Types.Context) { this.caller(ctx, this.rect, this.params); }
    };

    /** Tekst */
    export class Text extends ShapeWrapper {
        constructor( text: string
                   , pos: Types.Vec2
                   , font: Graph.Font = { size: 22, color: 'white', name: 'ArcadeClassic' }) {
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
};