/**
 * @module lib/util
 */

var fs = require('fs');
var path = require('path');
var grunt = require('grunt');
var crypto = require('crypto');

/**
 * Creates a hash given an array of files.
 *
 * @param {Array} files
 * @returns {string}
 */
var hashFiles = exports.hashFiles = function(files) {
    var buffer = '';
    files.forEach(function(f) {
        var data = fs.readFileSync(f);
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
 * @param {string} filename
 * @param {string} hash
 * @returns {string}
 */
var versionToPath = exports.versionToPath = function(filePath, hash) {
    return path.dirname(filePath) +
        path.sep +
        path.basename(filePath, path.extname(filePath)) +
        '.'+
        hash +
        path.extname(filePath);
};

/**
 *
 * @param {string} task - Task name
 * @param {Object} config - Task config
 * @param {Array} versionedFiles - Array of dest/src files for the task
 */
var runProxyTask = exports.runProxyTask = function(task, config, versionedFiles) {
    config.files = versionedFiles;
    delete config.src;
    delete config.dest;

    var proxyTaskName = task + '_magpie_proxy_task';
    grunt.config.set(proxyTaskName.replace(':', '.'), config);
    grunt.task.run(proxyTaskName);
};

/**
 * Save the mappings of the original destination file paths to the
 * new versioned file paths.
 *
 * @param versionedFilesMap
 * @param options
 */
var saveVersionedFilesMap = exports.saveVersionedFilesMap = function(versionedFilesMap, options) {};