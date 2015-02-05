/*
 * grunt-magpie
 * https://github.com/dynamo-media/grunt-magpie
 *
 * Copyright (c) 2015 Dynamo-Media
 * Licensed under the MIT license.
 */

'use strict';

var _ = require('underscore');
var fs = require('fs');
var when = require('when');
var path = require('path');
var util = require('../lib/util');
var repository = require('../lib/repository');


module.exports = function(grunt) {
  grunt.registerMultiTask('magpie', 'Version and save assets in a remote repository.', function() {
    var done = this.async();

    var options = this.options({
      serverUrl: 'http://127.0.0.1:8888',
      versionAfterBuild: false,
      versionedFilesMapPath: 'versioned_files.json',
      versionedFilesMapTemplate: null,
      tasks: false
      // TODO: Add option for `grunt-spritesmith` compatibility (options.destCss)
      // TODO: Add option for skipping download from repository if file already exists on disk (allow force override)
    });

    var promises = [];

    util.expandTasksWithNoTarget(options.tasks).forEach(function(task) {
      var taskConfigName = task.replace(':', '.');
      var config = grunt.config(taskConfigName);
      if ( ! config) {
        util.gruntFailFatal('Task not found', task);
        return false;
      }

      // TODO: Handle `options.versionAfterBuild`

      var versionedFiles = [];

      grunt.task.normalizeMultiTaskFiles(config).forEach(function (f) {
        if (f.src.length === 0) {
          return util.gruntFailFatal('Source files missing', task);
        }

        if (typeof f.dest !== 'string') {
          return util.gruntFailFatal('Multiple destination files are not supported', task);
        }

        var hash = util.hashFiles(f.src);
        var destVersionedPath = util.addVersionToPath(f.dest, hash);

        versionedFiles.push({
          src: f.src,
          dest: destVersionedPath
        });

        util.addVersionedFilesMap({
          hash: hash,
          originalPath: f.dest,
          versionedPath: destVersionedPath
        }, options);

        // Check in the remote repository and download the file
        var promise = when.promise(function(resolve) {
          repository.downloadFile(destVersionedPath, options).done(
              function() {
                grunt.log.writeln('Downloaded "' + path.basename(destVersionedPath) + '" from repository');
                resolve();
              },
              function(err) {
                // TODO: Log a more verbose reply to a server error
                grunt.log.writeln('File "' + path.basename(destVersionedPath) + '" not found in repository');
                util.runProxyTask(task, config, versionedFiles);
                repository.addFileToUploadQueue(destVersionedPath, options);
                resolve();
              }
          );
        });
        promises.push(promise);
      });
    });

    when.all(promises).done(function() {
      if (util.hasVersionedFilesMapBeenUpdated() === true) {
        grunt.task.run('_magpie_save_versioned_assets_path');
      }

      if (repository.hasUploadAccess()) {
        grunt.task.run('_magpie_upload_assets');
      }

      // Finish up the grunt async promise
      done();
    });
  });

  /**
   * Private task for versioning files *after* their associated grunt task has run.
   */
  grunt.registerTask('_magpie_post_version_asset', 'Version assets', function() {
    var options = this.options({
      files: []
    });

    if ( ! _.isArray(options.files) || options.files.length === 0) {
      grunt.fail.fatal('No files supplied');
      return false;
    }

    options.files.forEach(function(file) {
      var hash = util.hashFiles(file);
      var versionedFile = util.addVersionToPath(file, hash);
      grunt.file.copy(file, versionedFile, {encoding: null});
      grunt.file.delete(file);
    });
  });

  /**
   * Private task for saving the versioned assets.
   */
  grunt.registerTask('_magpie_save_versioned_assets_path', 'Save versioned assets map', function() {
    util.saveVersionedFilesMap();
  });

  /**
   * Private task for uploading assets to the repository.
   */
  grunt.registerTask('_magpie_upload_assets', 'Upload versioned assets to the remote server', function() {
    var done = this.async();
    repository.uploadQueuedFiles().done(function(promises) {
      grunt.log.ok('Uploaded ' + promises.length + ' files to repository!');
      done();
    }, function(error) {
      grunt.fail.warn('Upload failed: "' + error + '"');
      done();
    });
  });
};
