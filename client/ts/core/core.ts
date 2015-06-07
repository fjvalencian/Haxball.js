/// <reference path="../../assets/defs/underscore/underscore.d.ts" />
/// <reference path="../../assets/defs/jquery/jquery.d.ts" />

/// <reference path="../types.ts" />
/// <reference path="input.ts" />
/// <reference path="resource.ts" />
/// <reference path="graph.ts" />
/// <reference path="scene.ts" />
/// <reference path="gui.ts" />

module Core {
    /**
     * Konfiguracja canvasu, podstawowe
     * info o canvasie
     */
    export class CanvasConfig {
        public size: Types.Rect = new Types.Rect;
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
        private config: CanvasConfig = null;
        public get size(): Types.Rect   { return this.config.size; }
        public get ctx(): Types.Context { return this.config.ctx; }

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
            this.resources = this.resources.concat(resources);
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
         * @param {Input.Event} event         Event
         * @param {Boolean}     currentState  Rozsyłanie na bierzący stan
         */
        public broadcast(event: Input.Event, currentState: boolean = false): Kernel {
            if(!currentState)
                _.each(this.state, (state: State) => {
                    state.onEvent(this, event);
                });
            else
                this.currentState.onEvent(this, event);
            return this;
        }

        /** Rejestrowanie nasłuchiwania eventów */
        private pressedKeys: { [index: number]: boolean } = {};
        private regListeners() {
            $(window)
                .keydown(e => { 
                    this.pressedKeys[e.keyCode] = true; 
                })
                .keyup(e => { 
                    delete this.pressedKeys[e.keyCode];
                    this.broadcast({ 
                          type: Input.Type.KEY_UP
                        , data: e.keyCode 
                    }, true);
                });
        }

        /** Stany aplikacji */
        private state: { [ index: string ]: State } = {};
        private activeState: string = null;
        public get currentState(): State { 
            return this.state[this.activeState]; 
        }

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
            state.kernel = this;
            state.init();
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
                let state = this.currentState
                  , dt = (Date.now() - t) / 100;

                /** Zmiana kursora */
                if(this.cursor !== 'default') {
                    $('body').css('cursor', 'progress');
                    this.cursor = 'default';
                }

                /** Wysyłanie eventów przycisków */
                if(!_(this.pressedKeys).isEmpty())
                    this.broadcast({ 
                          type: Input.Type.KEY_DOWN
                        , data: this.pressedKeys 
                    }, true);

                /** W celu optymalizacji wywoływanie bezpośrednio */
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, this.config.canvas.width, this.config.canvas.height);
                
                /** Rendering i aktualizacja stanu */
                state.update();
                state.draw(ctx);

                /** Wymuszanie nowej klatki */
                t = Date.now();
                window.requestAnimationFrame(loop);
            };
            loop();
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
                setTimeout(this.setState.bind(this, 'main'), 2);
            };

            /** Wczytywanie zasobu */
            this.loop();
            Resource.load(this.resources, postLoad, progress);
        }
    };
};