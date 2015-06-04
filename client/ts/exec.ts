/// <reference path="game/game.ts" />
/// <reference path="game/states/soccer.ts" />
/// <reference path="game/states/loading.ts" />
(() => {
    new Core.Kernel('game_canvas')
        .regState('loading', new Game.State.Loading)
        .regState('main', new Game.State.Soccer)
        .run();
})();