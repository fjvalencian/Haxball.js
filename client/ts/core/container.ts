/// <reference path="event_filter.ts" />

module Core {
    export module Scene {
        /** 
         * Fizyczny obiekt w silniku 
         * mający szerokość i wysokość
         */
        export class KernelObject extends EventFilter {
            constructor(public rect: Types.Rect = new Types.Rect) {
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
                        && [ Input.Type.MOUSE_CLICK, Input.Type.MOUSE_MOVE ].indexOf(event.type) + 1
                        && !this.rect.intersect(<Types.Rect> event.data))
                    return;
                super.onEvent(source, event);
            }
        }

        /** Layout do rozmieszczania obiektów */
        export interface Layout {
            (object: any, objects: any[], container: ContainerObject<any>)
        }

        /** Kontener na obiekty */
        export class ContainerObject<T extends ObjectTemplate> extends KernelObject {
            constructor( rect = new Types.Rect
                       , public layout: Layout = null) {
                super(rect);
            }

            protected objects: T[] = [];
            public getObjects(): T[] {
                return this.objects;
            }
            
            /**
             * Dodawanie obiektu
             * @param {T}      obj  Obiekt sceny
             * @param {number} id   Identyfikator obiektu
             */
            public add(obj: T|T[], id?: number): any {
                /** Konfiguracja pojedynczego elementu */
                let config = (obj: any): any => {
                    (<any> obj).kernel = this.kernel;
                    (<ObjectTemplate>obj).init();
                    if (this.layout)
                        this.layout(obj, this.objects, this);
                    return obj;
                };

                /** Dodawanie obiektu */
                if (!obj)
                    throw new Error('Empty object');
                if (_(obj).isArray()) {
                    _(obj).each(config);
                    this.objects = this.objects.concat(<T[]> obj);
                }
                else
                    if (id)
                        this.objects[id] = <T> config(obj);
                    else
                        this.objects.push(<T> config(obj));
                return obj;
            }

            /** Kasowanie wszystkich elementów */
            public clear(): ContainerObject<T> {
                this.objects = [];
                return this;
            }

            /**
             * Kasowanie elementu
             * @param  {T} obj Element
             */
            public remove(obj: T): ContainerObject<T> {
                this.objects = <any> _(this.objects).without(obj);
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
            public broadcast = this.onEvent.bind(this);

            /**
             * Renderowanie elementów
             * @param {Types.Context} ctx Kontekst canvasa
             */
            public draw(ctx: Types.Context) {
                ctx.save();
                ctx.translate(this.rect.x, this.rect.y);

                /** for dla zwiększenia wydajności */
                for(let object of this.objects) {
                    object.draw(ctx);
                    object.update();
                }

                ctx.restore();
            }
        }
    }

    /** Stan gry */
    export class State extends Scene.ContainerObject<Scene.KernelObject> {
        /** Fabryka elementów */
        public create = {
              sprite: (img: string, rect: Types.Rect): Scene.Sprite => {
                return this.add(new Scene.Sprite(this.kernel.res(img) || img, rect));
            }
            , text: ( text: string
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
    }
}