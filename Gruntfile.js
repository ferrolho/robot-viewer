module.exports = function (grunt) {
  grunt.initConfig({
    'browserify': {
      dist: {
        options: {
          transform: [
            ['babelify', {
              'presets': ['es2015']
            }]
          ]
        },
        files: {
          './dist/app.js': ['./src/app.js']
        }
      }
    },
    'concurrent': {
      options: {
        logConcurrentOutput: true
      },
      dev: {
        tasks: ['http-server', 'watch']
      }
    },
    'http-server': {
      'dev': {
        root: 'dist',
        port: 8123,
        host: '0.0.0.0',
        openBrowser: true
      }
    },
    'standard': {
      options: {
        fix: true
      },
      app: {
        src: [
          '{,lib/,tasks/}*.js'
        ]
      }
    },
    'watch': {
      scripts: {
        files: ['src/**/*.js'],
        tasks: ['browserify']
      }
    }
  })

  // Load plugins
  grunt.loadNpmTasks('grunt-browserify')
  grunt.loadNpmTasks('grunt-concurrent')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-http-server')
  grunt.loadNpmTasks('grunt-standard')

  // Tasks
  grunt.registerTask('default', ['concurrent:dev'])
  grunt.registerTask('build', ['browserify']);
}
