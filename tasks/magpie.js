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
var when = require('when');
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

    var asyncDone = this.async();
    var done = function() {
      // Create a versioned files map file
      if (util.hasVersionedFilesMapBeenUpdated() === true) {
        grunt.task.run('_magpie_save_versioned_assets_path');
      }

      // Upload any assets which were not downloaded
      if (repository.hasUploadAccess()) {
        grunt.task.run('_magpie_upload_assets');
      }

      asyncDone();
    };

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

      var pipelines = util.extractPipelines(tasksByParent, options);

      // Check existence/attempt to download the `dest` files
      var promises = _.map(pipelines, function(pipeline) {
        var lastTask = _.last(pipeline);
        return util.downloadFile(lastTask.destVersioned, pipeline, options);
      });

      // Wait for all of the download tasks to finish up
      when.settle(promises).done(function(descriptors) {
        var filesNotInRepository = util.getRejectedReasonFromDescriptors(descriptors);
        filesNotInRepository = _.flatten(_.pluck(filesNotInRepository, 'context'));

        // Iterate over each pipeline and reduce files for each task
        var configs = _.reduce(filesNotInRepository, function(configs, c) {
          if (configs[c.task] === undefined) {
            configs[c.task] = { files: [] };
          }

          // Create task files and override dest for versioned files
          var f = { src: c.src, dest: c.destVersioned || c.dest };

          // Check if the task is the last one in a pipeline
          if (c.destVersioned !== undefined) {
            repository.addFileToUploadQueue(c.destVersioned, options);
          }

          configs[c.task].files.push(f);
          return configs;
        }, {});

        // Run all pipelined proxy tasks - only for files that were *not* downloaded
        tasks.forEach(function(task) {
          if (configs[task] === undefined) {
            return;
          }
          util.runProxyTask(task, grunt.config(task.replace(':', '.')), configs[task].files);
        });

        done();
      });

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
      if (grunt.file.exists(versionedFile)) {
        grunt.file.delete(versionedFile);
      }
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
    repository.uploadQueuedFiles().done(function(descriptors) {
      var uploadedFiles = util.getFulfilledValueFromDescriptors(descriptors);
      var failedFiles = util.getRejectedReasonFromDescriptors(descriptors);

      if (uploadedFiles.length > 0) {
        grunt.log.ok('Uploaded ' + uploadedFiles.length + ' files to repository');
      }

      if (failedFiles.length > 0) {
        grunt.log.error('Failed uploading ' + failedFiles.length + ' files to repository');
        failedFiles.forEach(function(f) {
          grunt.log.error('File: "' + f.file + '". Error: ' + f.err);
        });
        grunt.fail.warn('Exiting...');
      }

      done();
    });
  });
};