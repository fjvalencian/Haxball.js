"use strict";
module Types {
    /** Alliasy na typy podstawowe */
    export type Image = HTMLImageElement;
    export type Canvas = HTMLCanvasElement;
    export type Context = CanvasRenderingContext2D;

    /** Wektor xy */
    export class Vec2 {
        constructor( public x: number = 0
                   , public y: number = 0) {
        }
        public get xy() { return [ this.x, this.y ]; }
        public set xy(vals:number[]) {
            this.x = vals[0];
            this.y = vals[1];
        }
        
        /** Kopiowanie */
        public copy(v: Vec2): Vec2   { this.x = v.x; this.y = v.y; return this; }

        /** Operacje na wektorze */
        public divide(v: Vec2): Vec2 { this.x /= v.x; this.y /= v.y; return this; }
        public add(v: Vec2): Vec2    { this.x += v.x; this.y += v.y; return this; }
        public sub(v: Vec2): Vec2    { this.x -= v.x; this.y -= v.y; return this; }
        public mul(v: Vec2): Vec2    { this.x *= v.x; this.y *= v.y; return this; }
        public invert(): Vec2        { this.x *= -1; this.y *= -1;   return this; }

        /**
         * Dystans między wektorami
         * @param  {Vec2}   v Wektor
         * @return {number}   Dystans
         */
        public distance(v: Vec2): number {
            return Vec2.distance(this ,v);
        }
        static distance(v1: Vec2, v2: Vec2): number {
            return Math.sqrt( 
                         (v1.x - v2.x) * (v1.x - v2.x)
                       + (v1.y - v2.y) * (v1.y - v2.y));
        }

        /**
         * Długość wektora
         * @return {number} Długość
         */
        public length(): number {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        }

        /**
         * Normalizacja wektora
         * @param  {Vec2=null} d Wektor normalizowany
         * @return {Vec2}        Wektor znormalizowany
         */
        public normalize(d: Vec2 = null): Vec2 {
            if(!d)
                d = this;
            let len = d.length();
            d.x /= len; 
            d.y /= len;
            return d;
        }
    };

    /** Prostokąt */
    export class Rect extends Vec2 {
        constructor( x: number
                   , y: number
                   , public w: number =0
                   , public h: number =0) {
            super(x, y);
        }

        /** Kopiowanie */
        public copy(v: Rect): Rect { 
            this.x = v.x; this.y = v.y; 
            this.w = v.w; this.h = v.h;
            return this; 
        }

        /** Operacje na prostokącie */
        public divide(v: Rect|Vec2): Rect { 
            this.x /= v.x; this.y /= v.y; 
            if(v instanceof Rect) {
                this.w /= (<Rect>v).w; 
                this.h /= (<Rect>v).h; 
            }
            return this; 
        }
        public add(v: Rect|Vec2): Rect { 
            this.x += v.x; this.y += v.y; 
            if(v instanceof Rect) {
                this.w += (<Rect>v).w; 
                this.h += (<Rect>v).h; 
            }
            return this; 
        }
        public sub(v: Rect|Vec2): Rect { 
            this.x -= v.x; this.y -= v.y; 
            if(v instanceof Rect) {
                this.w -= (<Rect>v).w; 
                this.h -= (<Rect>v).h; 
            }
            return this; 
        }
        public mul(v: Rect|Vec2): Rect { 
            this.x *= v.x; this.y *= v.y; 
            if(v instanceof Rect) {
                this.w *= (<Rect>v).w; 
                this.h *= (<Rect>v).h;  
            }
            return this; 
        }

        /**
         * Kolizja między prostokątami
         * @param  {Rect}    rect Prostokąt testowany
         * @return {boolean}      Zachodzenie kolizji
         */
        public intersect(rect: Rect): boolean {
            return (
                /** Szerokość */
                   this.x + this.w > rect.x
                && this.x < rect.x + (rect.w || 0)
                /** Wysokość */
                && this.y + this.h > rect.y
                && this.y < rect.y + (rect.h || 0)
            );
        }

        /** Punkt środkowy */
        public center(): Vec2 {
            return new Vec2(this.x + this.w / 2, this.y + this.h / 2);
        }
    };

    /** Kolor */
    export class Color {
        constructor( public r: number
                   , public g: number
                   , public b: number
                   , public a: number = 1.0) {
        }

        /**
         * Wartosc hex składowej koloru
         * @param {number} val Numer składowej koloru
         */
        private static hex(val: number): string {
            let v = Number(val).toString(16);
            return v.length === 1 ? '0' + v : v;
        }

        /**
         * Wartość hex koloru
         * @return {string} Hex
         */
        public hex(): string {
            return '#'
                + Color.hex(this.r)
                + Color.hex(this.g)
                + Color.hex(this.b);
        }
    };
};