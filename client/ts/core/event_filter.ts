/// <reference path="input.ts" />
/// <reference path="object.ts" />

module Core.Scene {
    /** Callback dla eventów */
    export interface Forward { 
        (event: Input.Event): void; 
    }
    export interface ForwardMap { 
        [index: number]: Forward 
    }

    /** Przekazywanie eventów z okna na callbacki  */
    export class EventFilter extends ObjectTemplate implements Input.Listener {
        protected forwarder: ForwardMap = {};

        /**
         * Mapowanie nasłuchu
         * @param {Input.Type} type      Typ eventu
         * @param {Forward}    forwarder Callback eventu
         */
        public listener(type: Input.Type, forwarder: Forward) {
            this.forwarder[type] = forwarder;
            return this;
        }

        /**
         * Mapowanie wielu nasłuchiwaczy
         * @param {ForwardMap} forwarder Lista callbacków
         */
        public map(forwarder: ForwardMap) {
            if(!_.isEmpty(forwarder))
                this.forwarder = forwarder;
            return this;
        }

        /** Nasłuch eventu */
        public onEvent(source: any, event: Input.Event) {
            let callback = this.forwarder[event.type];
            if(callback)
                callback(event);
        }
    }
}