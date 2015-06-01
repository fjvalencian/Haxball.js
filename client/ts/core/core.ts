/// <reference path="../../assets/defs/underscore/underscore.d.ts" />
/// <reference path="../../assets/defs/jquery/jquery.d.ts" />
/// <reference path="../../assets/defs/socket.io-client/socket.io-client.d.ts" />

/// <reference path="../types.ts" />
/// <reference path="../multiplayer.ts" />
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
    import Data = Core.Server.Data;

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

    /** Socket do serwera */
    var socket = io.connect('ws://localhost:3000');
    socket
        .on('connect', () => {
            console.log('Połączono!');
        })
        .on('server error', err => {
            throw new Error(err);
        });

    /** Gracz */
    class Player extends Core.Scene.KernelObject {
        constructor( rect: Types.Rect
                   , private state: Core.State
                   , private id: number
                   , private type: Data.PlayerType
                   , public nick: string = ''
                   , public v: Types.Vec2 = new Types.Vec2)  {
            super(rect);
        }
        public getType(): Data.PlayerType { return this.type; }
        public getID(): number            { return this.id; }

        /** Sprite gracza */
        public update() {
            this.rect.add(<Types.Rect> this.v);
        }
        public draw(ctx: Types.Context) { 
            /** Gracz */
            Template.Circle(ctx
                , this.rect
                , {
                      color: 'green'
                    , r: this.rect.w / 2
                    , centered: true
                    , stroke: { width: 3, color: 'black' }
                });

            /** Obramówka wokół gracza */
            if(this.type === Data.PlayerType.CURRENT_PLAYER) {
                let r = this.rect.w * 0.7 + this.v.length() * 1.3;
                Template.Circle(ctx
                    , new Types.Vec2(
                          this.rect.x + this.rect.w / 2 - r
                        , this.rect.y + this.rect.h / 2 - r)
                    , {
                          r: r
                        , centered: true
                        , stroke: { 
                              width: 3
                            , color: 'rgba(255, 255, 255, 0.11)'
                        }
                    });
            }

            /** nr gracza */
            Template.Text(ctx
                , new Types.Vec2(
                      this.rect.x + this.rect.w / 2 - 6
                    , this.rect.y + this.rect.h / 2 + 8)
                , { text: <any> this.id });

            /** nick */
            Template.Text(ctx
                , new Types.Vec2(
                      this.rect.x + this.rect.w / 2 - (this.nick ? this.nick.length * 3.3 : 0)
                    , this.rect.y + this.rect.h + 20)
                , { text: this.nick
                  , font: { size: 12, color: 'white', name: 'ArcadeClassic' } });
        }
    };

    type Socket = SocketIOClient.Socket;
    class Board extends Core.Scene.ContainerObject<Player> {
        constructor(private state: Core.State) {
            super();
            Core.bind(socket, this, {
                  'room update'  : this.onUpdate
                , 'room entered' : this.onEnter
                , 'room join'    : this.onJoin
                , 'room exit'    : this.onExit
            });
        }

        /** Inicjacja planszy */
        public init() {
            let keys = {
                  87: Types.Direction.UP
                , 83: Types.Direction.DOWN
                , 65: Types.Direction.LEFT
                , 68: Types.Direction.RIGHT
            };
            this
                .listener(Input.Type.KEY_DOWN, (event: Input.Event) => {
                    for(let key in event.data)
                        if(typeof keys[key] !== 'undefined')
                            socket.emit('move', keys[key]);
                });
        }

        /** Rendering */
        public draw(ctx: Types.Context) {
            if (this.board.w) {
                /** Pionowe pasy boiska */
                const w = this.board.w / 15;
                for(let i = 0; i + w <= this.board.w; i += w)
                    Template.Rect( ctx
                             , new Types.Rect(this.board.x + i, this.board.y, w, this.board.h)
                             , { color: (i / w) % 2 ? '#568926': '#4a7621'  });

                /** Obramowanie boiska */
                const size = new Types.Vec2(70, 150);
                Template.Rect( ctx
                             , this.board
                             , { stroke: { width: 4, color: '#80a65c' } });
                Template.Circle( ctx
                               , this.board.center()
                               , { r: 70
                                 , stroke: { width: 4, color: '#80a65c' } })
                Template.Line( ctx
                             , new Types.Rect( this.board.x + this.board.w / 2 - 1
                                             , this.board.y + 2
                                             , 0
                                             , this.board.h - 4)
                             , { width: 4, color: '#80a65c' });

                /** Bramki */
                Template.Rect( ctx
                             , new Types.Rect(this.board.x + this.board.w, this.board.y + this.board.h / 2 - size.y / 2, size.x, size.y)
                             , { stroke: { width: 4, color: 'black' } });
                Template.Rect( ctx
                             , new Types.Rect(this.board.x - size.x, this.board.y + this.board.h / 2 - size.y / 2, size.x, size.y)
                             , { stroke: { width: 4, color: 'black' } });
            }
            super.draw(ctx);
        }

        /**
         * Podczas aktualizacji
         * @param {Data.RoomUpdate} data Plansza
         */
        private onUpdate(data: Data.RoomUpdate) {
            let arr = new Float32Array(data);
            for(let i = 0; i < arr.length; i += 5) {
                let p = this.objects[arr[i]];
                p.rect.xy = [ arr[ i + 1 ]
                            , arr[ i + 2 ] 
                            ];
                p.v.xy = [ arr[ i + 3 ]
                         , arr[ i + 4 ]
                         ];
            }
        }

        /**
         * Po pomyślnym wejściu do pokoju
         * @param {Data.RoomJoin} roomInfo Informacje o pokoju
         */
        private board: Types.Rect = new Types.Rect;
        private player: Player = null;

        private onEnter(roomInfo: Data.RoomJoin) {
            this.board.copy(roomInfo.board);
            _(roomInfo.players).each((player: Data.PlayerInfo, index: number) => {
                let isPlayer = index === roomInfo.playerId
                  , data = this.createPlayer( player
                                 , isPlayer 
                                     ? Data.PlayerType.CURRENT_PLAYER 
                                     : Data.PlayerType.PLAYER);
                if(isPlayer)
                    this.player = data;
            });
        }
        /** Gracz jest pierwszym elementem tablicy */
        public get getPlayer(): Player {
            if(!this.player)
                throw new Error('Player not found!');
            return this.player;
        }
        public getSize(): Types.Rect {
            return this.board;
        }

        /**
         * Podczas podłączania się nowego gracza
         * @param {Data.PlayerInfo} data Nowy gracz
         */
        private onJoin(data: Data.PlayerInfo) {
            this.createPlayer(data);
        }

        /**
         * Podczas wyjścia gracza
         * @param {number} data Identyfikator gracza
         */
        private onExit(data: number) {
            this.remove(this.objects[data]);
        }

        /**
         * Tworzenie gracza
         * @param  {Data.PlayerInfo} info Informacje z serwera
         */
        private createPlayer( info: Data.PlayerInfo
                            , type: Data.PlayerType = Data.PlayerType.PLAYER): Player {
            return this.add(
                new Player( Types.Rect.clone(info.rect)
                          , this.state
                          , this.objects.length
                          , type
                          , info.nick));
        }
    }
    export class GameState extends Core.State {
        private score: Scene.Text = new Scene.Text('1:1', new Types.Vec2(355, 26));
        private board: Board = new Board(this);

        public start() {
            this.add([
                  <any> this.board
                , this.score
            ]);
            socket
                .emit('set nick', 'user' + Math.ceil(Math.random() * 10))
                .emit('set room', 'test');
        }
        protected load() {
            // this.kernel.preload([ 
            //     { name: 'player', path: 'img/player.png' }
            // ]);
        }
        public draw(ctx: Types.Context) {
            super.draw(ctx);
            
            /** Dolne menu */
            let size = this.board.getSize();
            ctx.save();
            ctx.translate(size.x, size.y + size.h)
            _(this.board.getObjects()).each((obj: Player, index: number) => {
                Template.Text(ctx
                    , new Types.Vec2(index * 90, 15)
                    , { text: obj.nick
                      , font: { size: 12, color: 'white', name: 'ArcadeClassic' } });
            });
            ctx.restore();
        }
    };
};
/** Ładowanie silnika */
(() => {
    new Core.Kernel('game_canvas')
        .regState('loading', new Game.LoadingState)
        .regState('main', new Game.GameState)
        .run();
})();