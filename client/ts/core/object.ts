/// <reference path="graph.ts" />
/// <reference path="kernel.ts" />

module Core.Scene {
    /**
     * Szablon obiektu silnika, klasa abstrakcyjna
     * pozwalająca przypisać kernel
     */
    export class ObjectTemplate implements Core.Graph.Drawable, Core.Graph.Updatable {
        public kernel: Kernel;
        public withKernel(kernel: Kernel): any { 
            this.kernel = kernel;
            return this;
        }

        public init() {}
        public draw(ctx: Types.Context) {}
        public update() {}
    };
}