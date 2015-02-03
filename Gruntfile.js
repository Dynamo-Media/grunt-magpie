/*
 * grunt-magpie
 * https://github.com/dynamo-media/grunt-magpie
 *
 * Copyright (c) 2015 Dynamo-Media
 * Licensed under the MIT license.
 */

'use strict';


module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp']
    },

    concat: {
      task_files_src_dest_format: {
        src: ['test/fixtures/hello', 'test/fixtures/testing'],
        dest: 'tmp/task_files_src_dest_format.txt'
      }
    },

    magpie: {
      default: {
        options: {
          tasks: ['concat:task_files_src_dest_format']
        }
      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js']
    },

    watch: {
      files: ['tasks/*.js', 'test/*.js', 'lib/*.js'],
      tasks: ['test']
    }
  });

  grunt.registerTask('mocks', function() {
    require('./test/mocks').setup();
  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('test', ['clean', 'mocks', 'magpie', 'nodeunit']);
  grunt.registerTask('default', ['jshint', 'test']);
};
