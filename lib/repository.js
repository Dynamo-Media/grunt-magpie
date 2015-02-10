/**
 * @module lib/repository
 */

var _ = require('underscore');
var fs = require('fs');
var url = require('url');
var path = require('path');
var when = require('when');
var grunt = require('grunt');
var request = require('request');


exports.getApiKey = function() {
    return process.env.MAGPIE_API_KEY;
};

exports.hasUploadAccess = function() {
    return ( ! _.isEmpty(exports.getApiKey()));
};

/**
 * Download a file from the remote repository if it exists.
 *
 * @param {string} file - Destination path of the file to download
 * @param {Object} options
 * @param {string} options.serverUrl
 * @return {Promise}
 */
exports.downloadFile = function(file, options) {
    return when.promise(function (resolve, reject) {
        grunt.file.mkdir(path.dirname(file));
        var fileUrl = url.resolve(options.serverUrl, '/artifacts/' + path.basename(file));
        request
            .get(fileUrl)
            .on('error', reject)
            .on('response', function(response) {
                if (response.statusCode !== 200) {
                    reject(response);
                } else {
                    resolve();
                }
            })
            .pipe(fs.createWriteStream(path.resolve(file)));
    });
};

/**
 * Upload a file to the remote repository.
 *
 * @param {string} file - Path of the file to upload
 * @param {Object} options
 * @param {string} options.serverUrl
 * @return {Promise}
 */
exports.uploadFile = function(file, options) {
    return when.promise(function(resolve, reject) {
        file = path.resolve(file);
        if ( ! grunt.file.exists(file)) {
            return reject('File "' + file + '" does not exist to upload');
        }

        var apiKey = exports.getApiKey();
        request
            .post({
                url: url.resolve(options.serverUrl, '/upload'),
                headers: {
                    'X-Api-Key': apiKey
                },
                formData: {
                    file: fs.createReadStream(file)
                }
            })
            .on('error', reject)
            .on('response', function(response) {
                if (response.statusCode === 200) {
                    resolve();
                } else {
                    reject(response.statusCode);
                }
            });
    });
};

/**
 * Queue of files to upload to the remote server.
 *
 * @type {Array}
 * @private
 */
var _uploadQueue = [];

exports.uploadQueuedFiles = function() {
    var promises = [];
    _uploadQueue.forEach(function(item) {
        promises.push(exports.uploadFile(item.path, item.options));
    });
    return when.all(promises);
};

/**
 * Add a file into the upload queue.
 *
 * @param {string} file - Path of the file to upload
 * @param {Object} options
 * @param {string} options.serverUrl
 * @return {boolean} True if the file was uploaded
 */
exports.addFileToUploadQueue = function(file, options) {
    file = path.resolve(file);

    // Check if the file already exists in the queue
    var found = _.find(_uploadQueue, function(i) { return (i.path === file) });
    if (found !== undefined) return false;

    _uploadQueue.push({
        path: file,
        options: {
            serverUrl: options.serverUrl
        }
    });
    return true;
};