/// <reference path="graph.ts" />

module Core.Graph.Template {
    /** Kształt renderowany przez funkcję */
    export interface Shape {
        (ctx: Types.Context, shape: any, params?: any): void;
    }

    /** Prostokąt */
    export var Rect = 
            ( ctx: Types.Context
            , rect: Types.Rect
            , params: { color?: string; radius?: number; stroke?: { width: number; color: string; }; }
            ) => {
        ctx.beginPath();

        /** Rendering zaokrąglonego prostokąta i normalnego */
        if(typeof params.radius !== 'undefined') {
            ctx.moveTo(rect.x + params.radius, rect.y);

            ctx.lineTo(rect.x + rect.w - params.radius, rect.y);
            ctx.quadraticCurveTo(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + params.radius);
            
            ctx.lineTo(rect.x + rect.w, rect.y + rect.h - params.radius);
            ctx.quadraticCurveTo(rect.x + rect.w, rect.y + rect.h, rect.x + rect.w - params.radius, rect.y + rect.h);
            
            ctx.lineTo(rect.x + params.radius, rect.y + rect.h);
            ctx.quadraticCurveTo(rect.x, rect.y + rect.h, rect.x, rect.y + rect.h - params.radius);
            
            ctx.lineTo(rect.x, rect.y + params.radius);
            ctx.quadraticCurveTo(rect.x, rect.y, rect.x + params.radius, rect.y);
        } else
            ctx.rect(rect.x, rect.y, rect.w, rect.h);

        if(params.color) {
            ctx.fillStyle = params.color;
            ctx.fill();
        }
        if (params.stroke) {
            ctx.lineWidth = params.stroke.width;
            ctx.strokeStyle = params.stroke.color;
            ctx.stroke();
        }
        ctx.closePath();
    };

    /** Tekst */
    export function parseFont(font: Font): string {
        return font.size + 'px "' + font.name + '"';
    }
    export var Text = 
            ( ctx: Types.Context
            , pos: Types.Vec2
            , params: { 
                text: string; 
                font?: Font 
            }) => {
        params.font = params.font || { size: 15, color: 'white', name: 'ArcadeClassic' };
        
        ctx.fillStyle = params.font.color;
        ctx.font = parseFont(params.font); 
        ctx.fillText(params.text, pos.x, pos.y);
    };

    /** Obraz */
    export var Image = 
            ( ctx: Types.Context
            , rect: Types.Rect
            , params: { img: Types.Image }
            ) => {
        if(params.img)
            ctx.drawImage(params.img, rect.x, rect.y, rect.w, rect.h);
    };

    /** Linia */
    export var Line =
            ( ctx: Types.Context
            , rect: Types.Rect
            , params: { width: number; color: string; }
            ) => {
        ctx.beginPath();
        ctx.lineWidth = params.width;
        ctx.strokeStyle = params.color;

        ctx.moveTo(rect.x, rect.y);
        ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
        ctx.stroke();
    };

    /** Okrąg */
    export var Circle =
            ( ctx: Types.Context
            , pos: Types.Vec2
            , params: { color?: string; centered?: boolean; r: number; stroke?: { width: number; color: string; } }
            ) => {
        params.centered = !_.isUndefined(params.centered) && params.centered;

        ctx.beginPath();
        ctx.arc( pos.x + (!params.centered ? 0 : params.r)
               , pos.y + (!params.centered ? 0 : params.r)
               , params.r, 0, 2.0 * Math.PI, false);
        if(params.color) {
            ctx.fillStyle = params.color;
            ctx.fill();
        }

        ctx.lineWidth = params.stroke.width;
        ctx.strokeStyle = params.stroke.color;
        ctx.stroke();
    };
}