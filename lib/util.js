/**
 * @module lib/util
 */

var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var grunt = require('grunt');
var crypto = require('crypto');

exports.gruntFailFatal = function(message, task) {
    grunt.fail.fatal(message + '("' + task + '")');
};

/**
 * Handle tasks which are listed without any targets explicitly specified. Loop through
 * all the targets and return an array with all the tasks.
 *
 * @param {String} task
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
    config.files = versionedFiles;
    delete config.src;
    delete config.dest;

    var proxyTaskName = task + '_magpie_proxy_task';
    grunt.config.set(proxyTaskName.replace(':', '.'), config);
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