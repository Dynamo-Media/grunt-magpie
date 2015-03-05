/*
 * grunt-magpie
 * https://github.com/dynamo-media/grunt-magpie
 *
 * Copyright (c) 2015 Dynamo-Media
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path');


module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        'lib/*.js',
        'test/mocks.js',
        '<%= nodeunit.tests %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    clean: {
      tests: ['tmp', '*versioned_files.json']
    },

    concat: {
      default_not_found_upload: {
        src: ['test/fixtures/hello', 'test/fixtures/testing'],
        // Absolute path given to test the path normalization
        dest: path.join(process.cwd(), 'tmp/default_not_found_upload.txt')
      },
      default_found_download: {
        src: ['test/fixtures/hello', 'test/fixtures/download_me'],
        dest: 'tmp/default_found_download.txt'
      },
      pipeline: {
        src: ['test/fixtures/pipeline_a.js', 'test/fixtures/pipeline_b.js'],
        dest: 'tmp/pipeline_a_b.js'
      },
      pipeline_2: {
        src: ['test/fixtures/pipeline_b.js', 'test/fixtures/pipeline_c.js'],
        dest: 'tmp/pipeline_b_c.js'
      },
      pipeline_download: {
        src: ['test/fixtures/pipeline_a.js', 'test/fixtures/pipeline_c.js'],
        dest: 'tmp/pipeline_a_c.js'
      },
      do_not_version: {
        src: ['test/fixtures/testing', 'test/fixtures/hello'],
        dest: 'tmp/do_not_version.txt'
      }
    },

    uglify: {
      pipeline: {
        files: [{
          src: ['tmp/pipeline_a_b.js'],
          dest: 'tmp/pipeline_a_b_uglify.js'
        }, {
          src: ['tmp/pipeline_b_c.js'],
          dest: 'tmp/pipeline_b_c_uglify.js'
        }]
      },
      pipeline_download: {
        src: ['tmp/pipeline_a_c.js'],
        dest: 'tmp/pipeline_a_c_uglify.js'
      }
    },

    less: {
      version_after_build: {
        options: {
          compress: true
        },
        files: {
          'tmp/version_after_build.css': 'test/fixtures/version_after_build.less'
        }
      }
    },

    magpie: {
      default: {
        options: {
          tasks: ['concat:default_not_found_upload', 'concat:default_found_download']
        }
      },
      version_after_build: {
        options: {
          versionedFilesMapPath: 'tmp/after_build_versioned_files.json',
          versionAfterBuild: true,
          tasks: ['less:version_after_build']
        }
      },
      pipeline: {
        options: {
          versionedFilesMapPath: 'tmp/pipeline_versioned_files.json',
          pipeline: true,
          tasks: ['concat:pipeline', 'concat:pipeline_2', 'uglify:pipeline']
        }
      },
      pipeline_download: {
        options: {
          versionedFilesMapPath: 'tmp/pipeline_downloaded_versioned_files.json',
          pipeline: true,
          tasks: ['concat:pipeline_download', 'uglify:pipeline_download']
        }
      },
      do_not_version: {
        options: {
          doNotVersion: true,
          tasks: ['concat:do_not_version']
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
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('test', ['jshint', 'clean', 'mocks', 'magpie', 'nodeunit']);
  grunt.registerTask('default', ['test']);
};
