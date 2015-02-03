/*
 * grunt-magpie
 * https://github.com/dynamo-media/grunt-magpie
 *
 * Copyright (c) 2015 Dynamo-Media
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('fs');
var when = require('when');
var path = require('path');
var util = require('../lib/util');
var repository = require('../lib/repository');


var versionedDestPathMap = [];

module.exports = function(grunt) {
  var gruntFailFatal = function(message, task) {
    grunt.fail.fatal(message + '("' + task + '")');
  };

  grunt.registerTask('magpie_save_versioned_assets_path', 'Save versioned assets map', function() {
    var options = this.options({

    });
    util.saveVersionedFilesMap(versionedDestPathMap, options);
  });

  grunt.registerTask('magpie_post_version_asset', 'Version assets', function() {
    var options = this.options({
      dest: null
    });

    if (options.dest === null) {
      grunt.fail.fatal('No destination supplied');
      return false;
    }

    
  });

  grunt.registerMultiTask('magpie', 'Version and save assets in a remote repository.', function() {
    var done = this.async();

    var options = this.options({
      serverUrl: 'http://127.0.0.1:8888',
      hashAfterBuild: false,
      versionedFilesMapPath: null,
      versionedFilesMapTemplate: null,
      tasks: false
    });


    var promises = [];

    options.tasks.forEach(function(task) {
      var taskConfigName = task.replace(':', '.');
      var config = grunt.config(taskConfigName);
      if ( ! config) {
        gruntFailFatal('Task not found', task);
        return false;
      }

      var versionedFiles = [];

      var files = grunt.task.normalizeMultiTaskFiles(config);
      files.forEach(function (f) {
        if (f.src.length === 0) {
          gruntFailFatal('Source files missing', task);
          return false;
        }

        if (typeof f.dest !== 'string') {
          gruntFailFatal('Multiple destination files are not supported', task);
          return false;
        }

        var hash = util.hashFiles(f.src);

        var destVersionedPath = util.versionToPath(f.dest, hash);

        versionedFiles.push({
          src: f.src,
          dest: destVersionedPath
        });

        versionedDestPathMap.push({
          hash: hash,
          originalPath: f.dest,
          versionedPath: destVersionedPath
        });

        // Check in the remote repository and download the file
        var promise = when.promise(function(resolve) {
          repository.downloadFile(destVersionedPath, options).done(
              function(resp) {
                grunt.log.writeln('Downloaded "' + path.basename(destVersionedPath) + '" from repository');
                resolve();
              },
              function(err) {
                grunt.log.writeln('File "' + path.basename(destVersionedPath) + '" not found in repository');
                util.runProxyTask(task, config, versionedFiles);
                resolve();
              }
          );
        });
        promises.push(promise);
      });
    });

    when.all(promises).done(function() {
      grunt.log.ok('Everything finished! Saving versioned files map');

      grunt.task.run('magpie_save_versioned_assets_path');

      // Finish up the grunt async promise
      done();
    });
  });
};
