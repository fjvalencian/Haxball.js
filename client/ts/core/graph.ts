/// <reference path="../types.ts" />
/// <reference path="container.ts" />

module Core.Graph {
    /** Czcionka */
    export interface Font { 
        size: number; 
        color: string; 
        name: string; 
    }

    /** Obiekt renderowalny */
    export interface Drawable {
        draw(ctx: Types.Context, state: State): void;
    }

    /** Obiekty aktualizowane */
    export interface Updatable {
        update(): void;
    }
}