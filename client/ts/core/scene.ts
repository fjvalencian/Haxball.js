/// <reference path="graph.ts" />

module Core.Scene {
    import IType = Input.Type;

    /** Obiekty kernela */
    export interface Forward { (event: Input.Event): void; };
    export interface ForwardMap { [index: number]: Forward };
    
    export class ObjectTemplate implements Core.Graph.Drawable, Core.Graph.Updatable {
        public kernel: Kernel;
        public withKernel(kernel: Kernel): any { 
            this.kernel = kernel;
            return this;
        }

        public init() {}
        public draw(ctx: Types.Context) {}
        public update() {}
    };

    class EventFilter extends ObjectTemplate implements Input.Listener {
        protected forwarder: ForwardMap = {};

        /**
         * Mapowanie nasłuchu
         * @param {Input.Type} type      Typ eventu
         * @param {Forward}    forwarder Callback eventu
         */
        public listener(type: Input.Type, forwarder: Forward) {
            this.forwarder[type] = forwarder;
            return this;
        }

        /**
         * Mapowanie wielu nasłuchiwaczy
         * @param {ForwardMap} forwarder Lista callbacków
         */
        public map(forwarder: ForwardMap) {
            if(!_.isEmpty(forwarder))
                this.forwarder = forwarder;
            return this;
        }

        /** Nasłuch eventu */
        public onEvent(source: any, event: Input.Event) {
            let callback = this.forwarder[event.type];
            if(callback)
                callback(event);
        }
    };

    /** Obiekt silnika */
    export class KernelObject extends EventFilter {
        constructor(public rect: Types.Rect) {
            super();
        }
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
    export class ContainerObject<T extends ObjectTemplate> extends EventFilter {
        protected objects: T[] = [];

        /**
         * Dodawanie obiektu
         * @param {T} obj Obiekt sceny
         */
        public add(obj: T|T[], id?: number): any {
            let config = (obj: any): any => {
                (<any> obj).kernel = this.kernel;
                (<ObjectTemplate>obj).init();
                return obj;
            };
            if(!obj)
                throw new Error('Empty object');
            if(_(obj).isArray()) {
                _(obj).each(config);
                this.objects = this.objects.concat(<T[]> obj);
            }
            else
                if(id)
                    this.objects[id] = <T> config(obj);
                else
                    this.objects.push(<T> config(obj));
            return obj;
        }

        /**
         * Kasowanie elementu
         * @param  {T} obj Element
         */
        public remove(obj: T): ContainerObject<T> {
            this.objects = _(this.objects).without(obj);
            return this;
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
            for(let i=0; i<this.objects.length; ++i) {
                (<ObjectTemplate> this.objects[i]).draw(ctx);
                (<ObjectTemplate> this.objects[i]).update();
            }
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
};