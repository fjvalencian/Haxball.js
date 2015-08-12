"use strict";
module Types {
    /** Alliasy na typy podstawowe */
    export type Image = HTMLImageElement;
    export type Canvas = HTMLCanvasElement;
    export type Context = CanvasRenderingContext2D;

    /** Interfejs kopiowania */
    export class Copyable {
        public copy(obj: any): any {
            _(_(this).keys()).forEach((key: string) => {
                var val = obj[key]
                  , dest = this[key]
                  , type = typeof val;

                if(type === 'object') {
                    if(dest.copy)
                        dest.copy(val);
                } else if(type !== 'undefined')
                    this[key] = val;
            });
            return this;
        }
    }

    /** Kierunki poruszania się */
    export enum Direction {
          UP
        , DOWN
        , LEFT
        , RIGHT
    }

    /** Wektor xy */
    export class Vec2 extends Copyable {
        constructor( public x: number = 0
                   , public y: number = 0) {
            super();
        }
        public get xy() { return [ this.x, this.y ]; }
        public set xy(vals: number[]) {
            this.x = vals[0];
            this.y = vals[1];
        }
        
        /** Mnożenie przez liczbbe */
        public mulBy(num: number): Vec2 { this.x *= num; this.y *= num; return this; }

        /** Kopiowanie */
        static clone(vec: Vec2)      { return new Vec2().copy(vec); }
        public clone(): Vec2         { return Vec2.clone(this);     }
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
    }

    /** Prostokąt */
    export class Rect extends Vec2 {
        constructor( x: number = 0
                   , y: number = 0
                   , public w: number = 0
                   , public h: number = 0) {
            super(x, y);
        }

        /** Kopiowanie */
        public copy(v: Rect|Vec2): Rect { 
            this.x = v.x; this.y = v.y; 
            if((<any>v).w) {
                this.w = (<any>v).w; 
                this.h = (<any>v).h;
            }
            return this; 
        }
        static clone(rect: Rect) { return new Rect().copy(rect); }
        public clone(): Rect     { return Rect.clone(this); }

        /** Operacje na prostokącie */
        public divide(v: Rect|Vec2): Rect { 
            this.x /= v.x; this.y /= v.y; 
            if((<any>v).w) {
                this.w /= (<Rect>v).w; 
                this.h /= (<Rect>v).h; 
            }
            return this; 
        }
        public add(v: Rect|Vec2): Rect { 
            this.x += v.x; this.y += v.y; 
            if((<any>v).w) {
                this.w += (<Rect>v).w; 
                this.h += (<Rect>v).h; 
            }
            return this; 
        }
        public sub(v: Rect|Vec2): Rect { 
            this.x -= v.x; this.y -= v.y; 
            if((<any>v).w) {
                this.w -= (<Rect>v).w; 
                this.h -= (<Rect>v).h; 
            }
            return this; 
        }
        public mul(v: Rect|Vec2): Rect { 
            this.x *= v.x; this.y *= v.y; 
            if((<any>v).w) {
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

        /**
         * Zwraca true jeśli prostokąt znajduje się w rect
         * @param  {Rect}   rect   Prostokąt w którym ma być this
         */
        public contains(rect: Rect): boolean {
            return (
                   rect.x >= this.x
                && rect.x + rect.w <= this.x + this.w
                && rect.y >= this.y
                && rect.y + rect.h <= this.y + this.h
            );
        }

        /**
         * Zwraca true jeśli prostokąt jest większy w rect
         * @param  {Rect}   rect    Prostokąt
         */
        public isBigger(rect: Rect) {
            return (
                   this.w > rect.w
                && this.h > rect.h
            );
        }

        /**
         * Zwracanie prostokąta z paddingiem
         * @param  {number} padding Padding
         * @return {Rect} Prostokąt
         */
        public withPadding(padding: number): Rect {
            return new Rect( this.x + padding
                           , this.y + padding
                           , this.w - padding * 2.0
                           , this.h - padding * 2.0);
        }

        /** Punkt środkowy */
        public center(): Vec2 {
            return new Vec2(this.x + this.w / 2, this.y + this.h / 2);
        }
    }

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
    }
}