/**
 * @module lib/util
 */

var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var when = require('when');
var clone = require('clone');
var grunt = require('grunt');
var crypto = require('crypto');
var repository = require('../lib/repository');


exports.gruntFailFatal = function(message, task) {
    grunt.fail.fatal(message + '("' + task + '")');
};

/**
 * Get a normalized files array for a given task.
 *
 * @param task
 * @return {Array}
 */
exports.gruntGetFiles = function(task) {
    if (task.indexOf(':') > 0) {
        task = task.replace(':', '.');
    }
    return grunt.task.normalizeMultiTaskFiles(grunt.config.get(task));
};

/**
 * Handle tasks which are listed without any targets explicitly specified. Loop through
 * all the targets and return an array with all the tasks.
 *
 * @param {String} tasks
 * @return {Array}
 */
exports.expandTasksWithNoTarget = function(tasks) {
    var expandedTasks = [];
    tasks.forEach(function(task) {
        if (_.contains(task, ':')) {
            return expandedTasks.push(task);
        }

        _.each(grunt.config(task), function(config, target) {
            if ( ! /^_|^options$/.test(target)) {
                expandedTasks.push(task + ':' + target);
            }
        });
    });
    return expandedTasks;
};

/**
 * Creates a hash given an array of files.
 *
 * @param {Array|string} files
 * @returns {string}
 */
exports.hashFiles = function(files) {
    if ( !_.isArray(files)) {
        files = [files];
    }

    var buffer = '';
    files.forEach(function(f) {
        buffer += crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
    });
    if (files.length > 1) {
        buffer = crypto.createHash('sha1').update(buffer).digest('hex');
    }
    return buffer.substr(0, 8);
};

/**
 * Adds a hash into the path - before the extension. If no extension
 * is given - the hash appended onto the path.
 *
 * @param {string} filePath
 * @param {string} hash
 * @returns {string}
 */
exports.addVersionToPath = function(filePath, hash) {
    return path.dirname(filePath) +
        path.sep +
        path.basename(filePath, path.extname(filePath)) +
        '.' +
        hash +
        path.extname(filePath);
};

/**
 *
 * @param {string} task - Task name
 * @param {Object} config - Task config
 * @param {Array} versionedFiles - Array of dest/src files for the task
 */
exports.runProxyTask = function(task, config, versionedFiles) {
    var clonedConfig = clone(config);
    clonedConfig.files = versionedFiles;
    delete clonedConfig.src;
    delete clonedConfig.dest;

    var proxyTaskName = task + '_magpie_proxy_task';
    grunt.config.set(proxyTaskName.replace(':', '.'), clonedConfig);
    grunt.task.run(proxyTaskName);
};

/**
 * @type {boolean}
 * @private
 */
var _hasVersionedFilesMapBeenUpdated = false;

exports.hasVersionedFilesMapBeenUpdated = function() {
    return _hasVersionedFilesMapBeenUpdated;
};

/**
 * Contains mapping from original asset paths to versioned asset paths.
 *
 * @type {Object}
 * @private
 */
var _versionedDestPathMaps = {};

/**
 * Add a versioned file mapping to the module-wide object to save at the end of task
 * processing.
 *
 * @param {Object} mapping
 * @param {Object} options
 * @param {String} options.versionedFilesMapPath - Path to the file
 * @param {String} options.versionedFilesMapTemplate - Path to the underscore template
 */
exports.addVersionedFilesMap = function(mapping, options) {
    if (_.isEmpty(options.versionedFilesMapPath) === '') {
        grunt.fatal.warn('No `options.versionedFilesMapPath` specified');
        return false;
    }

    _hasVersionedFilesMapBeenUpdated = true;
    var filePath = options.versionedFilesMapPath;
    if ( ! _.has(_versionedDestPathMaps, filePath)) {
        _versionedDestPathMaps[filePath] = {
            template: options.versionedFilesMapTemplate,
            mappings: []
        };
    }

    _versionedDestPathMaps[filePath].mappings.push(mapping);
};

/**
 * Save the mappings of the original destination file paths to the
 * new versioned file paths.
 */
exports.saveVersionedFilesMap = function() {
    _.each(_versionedDestPathMaps, function(opt, filePath) {
        var data = '';
        if (opt.template === null) {
            data = JSON.stringify(opt.mappings);
        } else {
            var templateFn = _.template(grunt.file.read(opt.template, {encoding: 'utf8'}));
            data = templateFn({mappings: opt.mappings});
        }
        grunt.file.write(filePath, data, {encoding: 'utf8'});
    });
    _hasVersionedFilesMapBeenUpdated = false;
};

/**
 * Group the tasks by their parent task and return an object with the
 * key's representing the parent task.
 *
 * @param tasks
 * @returns {*}
 */
exports.groupTasks = function(tasks) {
    return _.reduce(tasks, function(parents, task) {
        var parent = task.substr(0, task.indexOf(':'));
        if (parents[parent] === undefined) {
            parents[parent] = [];
            parents._order.push(parent);
        }
        parents[parent].push(task);
        return parents;
    }, { _order: [] });
};

/**
 * Get the matching destination path from the task configuration - given a src path.
 *
 * @param {String} srcPath
 * @param {Object} config
 * @return {String}
 */
exports.getDestFileFromConfig = function(srcPath, config) {
    var ghostCreated = false;
    if ( ! grunt.file.exists(srcPath)) {
        grunt.file.write(srcPath, 'ghost');
        ghostCreated = true;
    }

    var files = grunt.task.normalizeMultiTaskFiles(config);
    var matchedDest = _.find(files, function(f) {
        return _.contains(f.src, srcPath);
    });

    if (matchedDest !== undefined) {
        matchedDest = matchedDest.dest;
    }

    if (ghostCreated) {
        grunt.file.delete(srcPath);
    }
    return matchedDest;
};

/**
 * Find the first matching `dest` file path given a list of tasks.
 *
 * @param srcPath
 * @param tasks
 * @returns {*}
 */
exports.findDestFileFromTasks = function(srcPath, tasks) {
    var destPath = null;
    var task =_.find(tasks, function(t) {
        var config = grunt.config.get(t.replace(':', '.'));
        destPath = exports.getDestFileFromConfig(srcPath, config);
        if (destPath !== undefined) {
            return true;
        }
    });

    if (destPath === null || destPath === undefined) {
        return null;
    }

    return {
        task: task,
        src: [srcPath],
        dest: destPath
    };
};

/**
 * Populate the pipeline with the src/dest file mappings through the pipeline tasks.
 *
 * @param pipeline
 * @param tasksByParent
 * @param {Object} options
 */
exports.populatePipeline = function(pipeline, tasksByParent, options) {
    var nextParents = tasksByParent._order.splice(1);

    var step = pipeline[0];
    nextParents.forEach(function(parent) {
        // Check all of the tasks in the parent group for a matching dest file
        var nextTask = exports.findDestFileFromTasks(step.dest, tasksByParent[parent]);
        if (nextTask === undefined) {
            return;
        }
        pipeline.push(nextTask);
        step = _.last(pipeline);
    });

    // Hash the `src` files for the first task
    var lastTask = _.last(pipeline);
    var hash = exports.hashFiles(pipeline[0].src);
    lastTask.hash = hash;
    lastTask.destVersioned = exports.addVersionToPath(lastTask.dest, hash);

    // Add the file to the versioned files map
    exports.addVersionedFilesMap({
        hash: hash,
        originalPath: lastTask.dest,
        versionedPath: lastTask.destVersioned
    }, options);

    return pipeline;
};

/**
 * Collect `src` files from an array of pipelines which can be added to the Grunt tasks
 * `filter` function to actively exclude the ignored files.
 *
 * @param pipelines
 * @returns {Object}
 */
exports.collectPipelineIgnoredFilesByTask = function(pipelines) {
    // Transform the pipelines array into an array of objects with the
    // keys representing the task
    var grouped = _.map(pipelines, function(pipeline) {
        return _.object(_.pluck(pipeline, 'task'), _.pluck(pipeline, 'src'));
    });

    // Join all of the unique source files together by the task
    return _.reduce(grouped, function(filesByTask, results) {
        _.each(filesByTask, function(task, files) {
            if (results[task] === undefined) {
                results[task] = [];
            }
            results[task] = _.union(results[task], files);
        });
        return results;
    }, {});
};

/**
 * Extract file pipelines from the configurations. Pipelines are a set of tasks, executed
 * one after another, which transform multiple files into a single destination file.
 *
 * @param {Object} tasksByParent
 * @param {Object} options Options array for the task
 * @return {Array}
 */
exports.extractPipelines = function(tasksByParent, options) {
    var pipelines = [];

    var startTasks = tasksByParent[tasksByParent._order[0]];

    // Start populating the pipelines from the first *type* of task given
    startTasks.forEach(function(task) {
        var files = exports.gruntGetFiles(task);

        files.forEach(function(f) {
            var pipeline = exports.populatePipeline([{
                task: task,
                src: f.src,
                dest: f.dest
            }], tasksByParent, options);

            pipelines.push(pipeline);
        });
    });

    return pipelines;
};

/**
 * Check the repository for a file and download if present.
 *
 * @param file
 * @param context
 * @param options
 * @return {Promise}
 */
exports.downloadFile = function(file, context, options) {
    return when.promise(function(resolve, reject) {
        // Don't download from the repository if the file already exists
        if (options.skipExisting && grunt.file.exists(file)) {
            resolve(null);
            return;
        }

        repository.downloadFile(file, options).done(
            function() {
                grunt.log.writeln('Downloaded "' + path.basename(file) + '" from repository');
                resolve(null);
            },
            function(response) {
                grunt.log.writeln('File "' + path.basename(file) + '" not downloaded from the repository.');
                if (response.statusCode !== undefined) {
                    grunt.log.error('Status code from server: ' + response.statusCode);
                } else {
                    grunt.log.error(response);
                }

                reject({
                    context: context,
                    file: file
                });
            }
        );
    });
};

/**
 * Process a task file mapping. Check its validity, hash the file and then
 * try downloading it from a remote repository.
 *
 * @param task
 * @param file
 * @param options
 * @return {Promise}
 */
exports.processTaskFile = function(task, file, options) {
    if (file.src.length === 0) {
        return exports.gruntFailFatal('Source files missing', task);
    }

    if (typeof file.dest !== 'string') {
        return exports.gruntFailFatal('Multiple destination files are not supported', task);
    }

    var hash = exports.hashFiles(file.src);
    var destVersioned = exports.addVersionToPath(file.dest, hash);

    exports.addVersionedFilesMap({
        hash: hash,
        originalPath: file.dest,
        versionedPath: destVersioned
    }, options);

    // Check in the remote repository and download the file
    return exports.downloadFile(destVersioned, file.src, options);
};

/**
 * Get all of the rejected descriptors and pluck out the reason values
 * into an array.
 *
 * @param descriptors
 * @returns {*}
 */
exports.getRejectedReasonFromDescriptors = function(descriptors) {
    return _.pluck(_.filter(descriptors, function(d) {
        return (d.state === 'rejected');
    }), 'reason');
};

/**
 * Get all of the fulfilled descriptors and pluck out the values into an
 * array.
 *
 * @param descriptors
 * @returns {*}
 */
exports.getFulfilledValueFromDescriptors = function(descriptors) {
    return _.pluck(_.filter(descriptors, function(d) {
        return (d.state === 'fulfilled');
    }), 'value');
};

/**
 * Process the task files.
 *
 * @param task
 * @param options
 * @param doneCallback - Callback for when processing has finished
 */
exports.processTaskFiles = function(task, options, doneCallback) {
    var taskConfigName = task.replace(':', '.');
    var config = grunt.config(taskConfigName);
    if ( ! config) {
        return exports.gruntFailFatal('Task not found', task);
    }

    var files = grunt.task.normalizeMultiTaskFiles(config);
    var promises = _.map(files, function(f) {
        return exports.processTaskFile(task, f, options);
    });

    // Wait for all the files to be either downloaded/saved *or* returned for processing
    when.settle(promises).then(function(descriptors) {
        // Remove any `null` values from the array
        var filesNotInRepository = exports.getRejectedReasonFromDescriptors(descriptors);

        if (filesNotInRepository.length > 0) {
            // Convert the array into a src/dest mapping
            var srcDestMappings = _.map(filesNotInRepository, function(f) {
                return {
                    src: f.context,
                    dest: f.file
                };
            });
            exports.runProxyTask(task, config, srcDestMappings);
        }

        // Upload any files which are *not* in the repository
        filesNotInRepository.forEach(function(f) {
            repository.addFileToUploadQueue(f.file, options);
        });

        doneCallback();
    });
};

