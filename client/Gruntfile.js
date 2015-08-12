var _ = require('underscore');
module.exports = function(grunt) {
    grunt.initConfig({
        watch: {
            all: {
                options: { 
                      livereload: true
                    , debounceDelay: 250,
                }
                , files: [ 
                      'ts/**/*.ts'
                    , 'assets/views/**/*.jade'
                    , 'assets/less/**/*.less' 
                ]
                , tasks: [ 'jade', 'typescript', 'wiredep' ]
            }
        }
        , wiredep: {
            target: { 
                  src: [ 'assets/views/index.jade' ]
                , dependencies: true
                , devDependencies: false
                , overrides: {
                    'socket.io-client': {
                        main: 'socket.io.js'
                    }
                }
            }
        }
        , jade: {
            compile: {
                options: {
                    data: { debug: false }
                }
                , files: [ {
                      cwd: 'assets/views'
                    , src: '**/*.jade'
                    , dest: 'build/views'
                    , expand: true
                    , ext: '.html'
                } ]
            }
        }
        , typescript: {
            base: {
                  src: [ 'ts/**/*.ts' ]
                , dest: 'build/js/game.js'
                , options: {
                    target: 'es5'
                }
            }
        }
    });
    var tasks = [
          'grunt-contrib-watch'
        , 'grunt-contrib-jade'
        , 'grunt-typescript'
        , 'grunt-wiredep'
    ];
    _.each(tasks, function(obj) {
        grunt.loadNpmTasks(obj);
    });
    grunt.registerTask('default', [ 'watch' ]);
};
