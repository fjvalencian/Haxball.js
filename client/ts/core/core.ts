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
    /** Stan aplikacji np. menu, plansza gry */
    export class State 
            extends Scene.ContainerObject<Scene.KernelObject> {
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
        protected load() {}
        protected listeners() {}

        public start() {}
        public stop() {}

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
        public get canvas(): Types.Canvas { return this.config.canvas; }
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
        public broadcast(event: Input.Event, currentState: Boolean = false): Kernel {
            if(!currentState)
                _.each(this.state, (state: State) => {
                    state.onEvent(this, event);
                });
            else
                this.currentState.onEvent(this, event);
            return this;
        }

        /** Rejestrowanie nasłuchiwania eventów */
        private pressedKeys: { [index: number]: Boolean } = {};
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
                    this.broadcast({ type: Input.Type.KEY_DOWN, data: this.pressedKeys }, true);

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
                setTimeout(_.bind(this.setState, this, 'main'), 2);
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
    import Key = Core.Input.Key;

    export class LoadingState extends Core.State {
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

    class Player extends Core.Scene.KernelObject {
        private sprite: Scene.Sprite = null;
        public mass: number = 1.0;

        constructor( rect: Types.Rect
                   , private state: Core.State
                   , public v: Types.Vec2 = new Types.Vec2)  {
            super(rect);
        }

        /** Inicjacja */
        public init() {
            this.sprite = new Scene.Sprite('logo', this.rect).withKernel(this.kernel)
        }
        public draw(ctx: Types.Context) { 
            this.sprite.draw(ctx); 
        }

        /** Interfejs KernelObject */
        public update() {
            this.rect.add(<Types.Rect> this.v);
            this.v.mul(new Types.Vec2(0.98, 0.98));
        }

        /**
         * Poruszanie się
         * @param  {Types.Vec2} v Wektor ruchu
         * @return {Player}       this
         */
        public move(v: Types.Vec2): Player {
            // this.v.x = v.x * this.v.x < 0 ? 0 : this.v.x;
            // this.v.y = v.y * this.v.y < 0 ? 0 : this.v.y;
            if(this.v.length() < 4.0)
                this.v.add(v);
            return this;
        }
    };
    export class GameState extends Core.State {
        protected load() {
            this.kernel.preload([ 
                { name: 'ball', path: 'img/ball.png' }
            ]);
            this.add([
                  new Player(new Types.Rect(50, 50, 32, 32), this)
                , new Player(new Types.Rect(100, 50, 32, 32), this)
                , new Player(new Types.Rect(150, 50, 32, 32), this)
                , new Player(new Types.Rect(200, 50, 32, 32), this)
                , new Player(new Types.Rect(250, 50, 32, 32), this)
                , new Player(new Types.Rect(100, 100, 32, 32), this)
                , new Player(new Types.Rect(150, 100, 32, 32), this)
                , new Player(new Types.Rect(200, 100, 32, 32), this)
                , new Player(new Types.Rect(250, 100, 32, 32), this)
            ]);
        }

        /** 
         * Testowanie kolizji
         * http://ericleong.me/research/circle-circle/
         */
        public update() {
            let center: Types.Vec2 = new Types.Vec2(16, 16);
            for (let i = 0; i < this.objects.length; ++i)
                for(let j = 0; j < this.objects.length; ++j) {
                    let p1 = <Player> this.objects[i]
                      , p2 = <Player> this.objects[j];

                    let c1 = p1.rect.center()
                      , c2 = p2.rect.center()
                      , dist = Types.Vec2.distance(c1, c2);
                    if(i != j && dist < (p1.rect.w + p2.rect.w) / 2) {
                        var nx = (c2.x - c1.x) / dist; 
                        var ny = (c2.y - c1.y) / dist; 
                        var p = 2.0 * (p1.v.x*nx + p1.v.y*ny - p2.v.x*nx - p2.v.y*ny) / (p1.mass + p2.mass);
                        p1.v.x -= p * p1.mass * nx; 
                        p1.v.y -= p * p1.mass * ny;
                        p2.v.x += p * p2.mass * nx; 
                        p2.v.y += p * p2.mass * ny;

                        p1.rect.add(p1.v);
                        p2.rect.add(p2.v);
                    }
                }
        }

        /** Gracz jest pierwszym elementem tablicy */
        public get player(): Player {
            if(!this.objects.length)
                throw new Error('Player not found!');
            return <Player> this.objects[0];
        }

        protected listeners() {
            const speed = 0.06;
            let vectors = {
                  87: new Types.Vec2(0.0, -speed)
                , 83: new Types.Vec2(0.0, speed)
                , 65: new Types.Vec2(-speed, 0.0)
                , 68: new Types.Vec2(speed, 0.0)
            };
            this
                .listener(Input.Type.KEY_DOWN, (event: Input.Event) => {
                    for(let key in event.data)
                        this.player.move(vectors[key]);
                });
        }
    };
};
/** Ładowanie silnika */
(() => {
    let socket = io.connect('ws://localhost:3000');
    socket.emit('set nick', 'dupa');
    socket.on('server error', (err) => {
        throw new Error(err);
    });
    new Core.Kernel('game_canvas')
        .regState('loading', new Game.LoadingState)
        .regState('main', new Game.GameState)
        .run();
})();