module Core.Resource {
    export interface Data {
        name: string;
        path: string;
        res?: any;
    };
    interface Loader<T> { 
        (res: Data, callback: Callback<T>): void; 
    };
    var loaders: { [ index: string ]: Loader<any> } = {};
    
    /** Callback wywoływany po załadowaniu zasobu */
    export interface Callback<T> { (data: T, res: Data): void; };
    /** Paczka zasobów */
    export interface GamePack { [index: string]: Data };

    /** Loader plików graficznych */
    loaders['png|jpg'] = 
            (res: Data, callback: Callback<Types.Image>):void => {
        var img = new Image;
        img.src = res.path;
        img.onload = _.bind(callback, null, img, res);
        img.onerror = () => {
            throw new Error('Nie mogłem załadować obrazu!');
        };
    };

    /**
     * Ładowanie zasobu, wykrywanie loadera po rozszerzeniu
     * @param  {Resource[]} resources  Nazwa stanu
     * @param  {Func}       callback   Callback po wczytaniu całej paczki
     */
    export function load<T>(
              resources: Data[]
            , callback: (pack: GamePack) => void
            , percentage: (percent: number) => void =null) {
        /** Callback jeśli wczytane wszystkie dane */
        var pack: GamePack = {};
        var loaded:Callback<any> = (data: any, res: Data) => {
            if (_.has(pack, res.name))
                throw new Error('Resource already exists!');
            pack[res.name] = _.extend({ res: data }, res);

            /** Pasek wczytywania */
            var proc = _.size(pack) / resources.length;
            if(percentage)
                percentage(proc);
            if(proc == 1.0)
                callback(pack);
        };

        /** Pobieranie loadera dla typu pliku */
        var getLoader = (path: string):Loader<any> => {
            return _.find(loaders, (lader: Loader<any>, regex: string): any => {
                return new RegExp('.(' + regex + ')$').test(path);
            });
        };

        /** Wczytywanie plików */
        _.each(resources, (res: Data) => {
            if(!/assets\/$/.test(res.path))
                res.path = '../assets/'.concat(res.path);
            (getLoader(res.path))(res, loaded);
        });
    };
};