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

  /**
   * Check the repository for a file and download if present.
   *
   * @param file
   * @param sourceFiles
   * @return {Promise}
   */
  function downloadFile(file, sourceFiles, options) {
    return when.promise(function(resolve) {
      repository.downloadFile(file, options).done(
          function() {
            grunt.log.writeln('Downloaded "' + path.basename(file) + '" from repository');
            resolve(null);
          },
          function(err) {
            // TODO: Log a more verbose reply to a server error
            grunt.log.writeln('File "' + path.basename(file) + '" not found in repository');
            resolve({
              src: sourceFiles,
              dest: file
            });
          }
      );
    });
  }

  /**
   * Process a task file mapping. Check its validity, hash the file and then
   * try downloading it from a remote repository.
   *
   * @param task
   * @param file
   * @param options
   * @return {Promise}
   */
  function processTaskFile(task, file, options) {
    if (file.src.length === 0) {
      return util.gruntFailFatal('Source files missing', task);
    }

    if (typeof file.dest !== 'string') {
      return util.gruntFailFatal('Multiple destination files are not supported', task);
    }

    var hash = util.hashFiles(file.src);
    var destVersionedPath = util.addVersionToPath(file.dest, hash);

    util.addVersionedFilesMap({
      hash: hash,
      originalPath: file.dest,
      versionedPath: destVersionedPath
    }, options);

    // Check in the remote repository and download the file
    return downloadFile(destVersionedPath, file.src, options);
  }

  /**
   * Process the task files.
   *
   * @param task
   * @param options
   * @param doneCallback - Callback for when processing has finished
   */
  function processTaskFiles(task, options, doneCallback) {
    var taskConfigName = task.replace(':', '.');
    var config = grunt.config(taskConfigName);
    if ( ! config) {
      return util.gruntFailFatal('Task not found', task);
    }

    var promises = [];

    var files = grunt.task.normalizeMultiTaskFiles(config);
    files.forEach(function (f) {
      promises.push(processTaskFile(task, f, options));
    });

    // Wait for all the files to be either downloaded/saved *or* returned for processing
    when.all(promises).done(function(filesNotInRepository) {
      // Remove any `null` values from the array
      filesNotInRepository = _.reject(filesNotInRepository, _.isNull);
      if (filesNotInRepository.length > 0) {
        util.runProxyTask(task, config, filesNotInRepository);
      }

      // Upload any files which are *not* in the repository
      filesNotInRepository.forEach(function(f) {
        repository.addFileToUploadQueue(f.dest, options);
      });

      doneCallback();
    });
  }

  /**
   * Ooooohhh shiny things.
   */
  grunt.registerMultiTask('magpie', 'Version and save assets in a remote repository.', function() {
    var options = this.options({
      serverUrl: 'http://127.0.0.1:8888',
      versionAfterBuild: false,
      versionedFilesMapPath: 'versioned_files.json',
      versionedFilesMapTemplate: null,
      tasks: false
      // TODO: Add option for `grunt-spritesmith` compatibility (options.destCss)
      // TODO: Add option for skipping download from repository if file already exists on disk (allow force override)
      // TODO: Add option for self-signed server certs
    });

    var tasks = util.expandTasksWithNoTarget(options.tasks);

    if (options.versionAfterBuild) {
      var destFiles = _.map(tasks, function(task) {
        var files = grunt.task.normalizeMultiTaskFiles(grunt.config(task.replace(':', '.')));
        return _.map(files, function (f) { return f.dest; });
      });
      destFiles = _.flatten(destFiles);

      grunt.task.run(tasks);

      grunt.config.set('_magpie_post_version_assets', {
        options: {
          files: destFiles,
          versionedFilesMapPath: options.versionedFilesMapPath,
          versionedFilesMapTemplate: options.versionedFilesMapTemplate
        }
      });
      grunt.task.run('_magpie_post_version_assets');

      return true;
    }

    var done = this.async();

    // Asynchronous for loop pattern
    var processTask = function(task) {
      processTaskFiles(task, options, function() {
        var nextTask = tasks.shift();

        if (nextTask !== undefined) {
          processTask(nextTask);
        } else {
          if (util.hasVersionedFilesMapBeenUpdated() === true) {
            grunt.task.run('_magpie_save_versioned_assets_path');
          }

          if (repository.hasUploadAccess()) {
            grunt.task.run('_magpie_upload_assets');
          }

          // Finish up the grunt async promise
          done();
        }
      });
    };
    processTask(tasks.shift());
  });

  /**
   * Private task for versioning files *after* their associated grunt task has run.
   */
  grunt.registerTask('_magpie_post_version_assets', 'Version assets', function() {
    var options = this.options({
      files: []
      /**
       * Copied over from `magpie` parent task
       *
       * versionedFilesMapPath: 'versioned_files.json'
       * versionedFilesMapTemplate: null
       */
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
      util.addVersionedFilesMap({
        hash: hash,
        originalPath: file,
        versionedPath: versionedFile
      }, options);
    });

    if (util.hasVersionedFilesMapBeenUpdated() === true) {
      grunt.task.run('_magpie_save_versioned_assets_path');
    }
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
