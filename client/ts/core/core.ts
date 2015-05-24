/// <reference path="../../assets/defs/underscore/underscore.d.ts" />
/// <reference path="../../assets/defs/jquery/jquery.d.ts" />
/// <reference path="../../assets/defs/socket.io-client/socket.io-client.d.ts" />

/// <reference path="../types.ts" />
/// <reference path="input.ts" />
/// <reference path="resource.ts" />
/// <reference path="graph.ts" />
/// <reference path="scene.ts" />
/// <reference path="gui.ts" />

module Core {
    export class State extends Scene.ContainerObject<Scene.KernelObject> {
        protected kernel: Kernel;

        /**
         * Dodawanie obiektu do sceny
         * @param  {Scene.Object} obj Obiekt
         * @return {Scene.Object}     Scena
         */
        public add<T extends Scene.KernelObject>(obj: T): T { 
            obj.kernel = this.kernel;
            return <T> super.add(obj);
        }

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

        /** Metody dziedziczące */
        protected load() {}
        public start() {}
        public stop() {}

        /**
         * Inicjacja stanu
         * @param {Kernel} kernel
         */
        public init(kernel: Kernel) { 
            this.kernel = kernel;
            this.load();
        }

        /**
         * Rendering
         * @param {Types.Context} ctx  Kontekst canvasu
         */
        protected update() { }
        public draw(ctx: Types.Context) {
            super.draw(ctx);
            this.update();
        }
    };

    /**
     * Konfiguracja canvasu, podstawowe
     * info o canvasie
     */
    class CanvasConfig {
        size: Types.Rect = new Types.Rect(0, 0);
        constructor( public canvas: Types.Canvas
                   , public ctx: Types.Context = <CanvasRenderingContext2D>canvas.getContext('2d')) {
            this.size.w = canvas.width;
            this.size.h = canvas.height;
        }
    };

    /** Stany silnika */
    enum KernelMode {
        PRELOADING, RUNNING
    };

    /**
     * Rdzeń aplikacji, zarządzanie aktywnymi stanami
     * i zasobami załadowanymi przez loadery
     */
    export class Kernel {
        private config: CanvasConfig;
        public get canvas() { return this.config.canvas; }
        public get ctx() { return this.config.ctx; }

        constructor(canvasId: string) {
            this.config = new CanvasConfig(
                <Types.Canvas>document.getElementById(canvasId));
            this.regListeners();
        }

        /**
         * Wstępne ładowanie zasobów
         * @param {Resource.Resource} resources Szkielet zasobu
         */
        private resources: Resource.Data[] = [];
        public preload(resources: Resource.Data[]): Kernel {
            if(this.mode !== KernelMode.PRELOADING)
                throw new Error('Nie mogę wczytać zasobu!');
            this.resources = resources;
            return this;
        }

        /**
         * Pobieranie zasobu
         * @param {string} res Zasób
         */
        public pack: Resource.GamePack = {};
        public res(res: string) {
            return _.isUndefined(this.pack[res]) 
                        ? null
                        : this.pack[res].res;
        }

        /**
         * Broadcastowanie wiadomości po stanach
         * @param {Input.Event} event Event
         * @return              this
         */
        public broadcast(event: Input.Event): Kernel {
            _.each(this.state, (state: State) => {
                state.onEvent(this, event);
            });
            return this;
        }

        /** Rejestrowanie nasłuchiwania eventów */
        private regListeners() {
            $(window)
                .keydown((e: Event) => {
                    this.broadcast({ type: Input.Type.KEY_DOWN, data: e });
                });
        }

        /** Stany aplikacji */
        private state: { [ index: string ]: State } = {};
        private activeState: string = null;

        /**
         * Rejestracja stanu aplikacja
         * @param  {string} name  Nazwa stanu
         * @param  {State}  state Obiekt stanu
         * @return {Kernel}
         */
        public regState(name: string, state: State): Kernel {
            if(name in this.state)
                throw new Error('State already exists!');

            this.state[name] = state;
            state.init(this);
            if(!this.activeState && this.mode === KernelMode.RUNNING)
                this.setState(name);
            return this;
        }

        /**
         * Ustawianie aktywnego stanu aplikacji
         * @param  {string} name Nazwa stanu
         * @return {Kernel}
         */
        public setState = (()=> {
            /** leniwa inicjacja modułów */
            let cache = [];
            return (name: string) => {
                if(!(name in this.state))
                    throw new Error('State not exists!');

                this.activeState = name;
                if(!_.has(cache, name)) {
                    cache.push(name);
                    this.state[name].start();
                }
                return this;
            }
        })();

        /** Główna pętla renderingu */
        public cursor: string = 'default';
        private mode: KernelMode = KernelMode.PRELOADING;
        private loop() {
            let frames = 0
              , t = Date.now()
              , ctx = this.ctx;

            /** Pierwszy stan to stan loading */
            if(!this.activeState)
                this.setState('loading');

            /** Renderowanie przy pomocy requestAnimationFrame */
            let loop = () => {
                let state = this.state[this.activeState]
                  , dt = (Date.now() - t) / 100;

                /** Zmiana kursora */
                if(this.cursor !== 'default') {
                    $('body').css('cursor', 'progress');
                    this.cursor = 'default';
                }

                /** W celu optymalizacji wywoływanie bezpośrednio */
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, this.config.canvas.width, this.config.canvas.height);
                state.draw(ctx);

                /** Wymuszanie nowej klatki */
                t = Date.now();
                window.requestAnimationFrame(loop);
            };
            window.requestAnimationFrame(loop);
        }

        /** Start silnika i ładowanie zasobów */
        public run() {
            /** Listener na procent ładowania */
            let progress = (percent: number) => {
                this.broadcast({ type: Input.Type.LOADING, data: percent });
            };

            /** Callback wywołuwany po załadowaniu */
            let postLoad = (pack: Resource.GamePack) => {
                this.mode = KernelMode.RUNNING;
                this.pack = pack;
                setTimeout(_.bind(this.setState, this, 'main'), 2000);
            };

            /** Wczytywanie zasobu */
            this.loop();
            Resource.load(this.resources, postLoad, progress);
        }
    };
};
/** Logika gry */
/** Staney gry */
module Game {
    import Scene = Core.Scene;
    import GUI = Core.Scene.GUI;
    import Template = Core.Graph.Template;
    import Input = Core.Input;

    export class LoadingState extends Core.State {
        protected load() {
            this.kernel.preload([ 
                { name: 'logo', path: 'img/logo.png' }
            ]);
            this.listener(Input.Type.LOADING, (event: Input.Event): void => {
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

    export class GameState extends Core.State {
        protected load() {
            this.listener(Input.Type.LOADING, (event: Input.Event): void => {
            });
        }

        public start() {
        }
    };
};
/** Ładowanie silnika */
(() => {
    var socket = io.connect('ws://localhost:3000');
    new Core.Kernel('game_canvas')
        .regState('loading', new Game.LoadingState)
        .regState('main', new Game.GameState)
        .run();
})();