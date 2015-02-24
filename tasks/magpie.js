/*
 * grunt-magpie
 * https://github.com/dynamo-media/grunt-magpie
 *
 * Copyright (c) 2015 Dynamo-Media
 * Licensed under the MIT license.
 */

'use strict';

var _ = require('underscore');
var util = require('../lib/util');
var repository = require('../lib/repository');


module.exports = function(grunt) {
  /**
   * Ooooohhh shiny things.
   */
  grunt.registerMultiTask('magpie', 'Version and save assets in a remote repository.', function() {
    var options = this.options({
      serverUrl: 'http://127.0.0.1:8888',
      versionAfterBuild: false,
      versionedFilesMapPath: 'versioned_files.json',
      versionedFilesMapTemplate: null,
      tasks: false,
      skipExisting: false,
      pipeline: false
      // TODO: Add option for self-signed server certs
    });

    if (! _.isArray(options.tasks)) {
      grunt.fail.fatal('No `options.tasks` array specified');
      return false;
    }

    var tasks = util.expandTasksWithNoTarget(_.flatten(options.tasks));

    /**
     * Handle tasks which require their version to be added *after* they have been
     * built
     */
    if (options.versionAfterBuild) {
      if (options.pipeline) {
        grunt.fail.fatal('The `versionAfterBuild` setting is *not* compatible with the *pipeline* setting');
      }

      var destFiles = _.map(tasks, function(task) {
        var files = util.gruntGetFiles(task);
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

    /**
     * Handle pipeline tasks
     */
    if (options.pipeline) {
      if (tasks.length === 1) {
        grunt.fail.fatal('Cannot have a pipeline of one task');
      }

      var tasksByParent = util.groupTasks(tasks);

      if (tasksByParent._order.length === 1) {
        grunt.fail.fatal('Cannot have a pipeline with only one parent');
      }

      var pipelines = util.extractPipelines(tasksByParent);

      grunt.log.writeln('pipelines', pipelines);

      var ignoredFiles = util.collectPipelineIgnoredFilesByTask(pipelines);

      grunt.log.writeln('ignoredFiles', ignoredFiles);

      // TODO: Check existence/attempt to download the `dest` files
      var promises =

      // TODO: Run all pipelined proxy tasks - only for files that were *not* downloaded

      // TODO: Save the versioned files map and upload assets

      done();

      return true;
    }

    /**
     * Asynchronous for loop pattern for multiple tasks
     */
    var processTask = function(task) {
      util.processTaskFiles(task, options, function() {
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
      grunt.log.ok('Uploaded ' + promises.length + ' files to repository');
      done();
    }, function(error) {
      grunt.fail.warn('Upload failed: "' + error + '"');
      done();
    });
  });
};