var _ = require('underscore');
module.exports = function(grunt) {
    grunt.initConfig({
        watch: {
            all: {
                options: { }
                , files: [ 'ts/**/*.ts' ]
                , tasks: [ 'typescript' ]
            }
        }
        , typescript: {
            base: {
                  src: [ 'ts/**/*.ts' ]
                , dest: 'build/main.js'
                , options: { 
                      module: 'commonjs' 
                    , target: 'es5'
                }
            }
        }
    });
    var tasks = [
          'grunt-contrib-watch'
        , 'grunt-typescript'
    ];
    _.each(tasks, function(obj) {
        grunt.loadNpmTasks(obj);
    })
    grunt.registerTask('default', [ 'watch' ]);
};
