/**
 * @module lib/repository
 */
var fs = require('fs');
var url = require('url');
var path = require('path');
var when = require('when');
var mkdirp = require('mkdirp');
var request = require('request');


var _getApiKey = function() {
    return process.env.MAGPIE_API_KEY;
};

/**
 * Download a file from the remote repository if it exists.
 *
 * @param {string} file - Destination path of the file to download
 * @param {Object} options
 * @param {string} options.serverUrl
 * @return {Promise}
 */
var downloadFile = exports.downloadFile = function(file, options) {
    return when.promise(function (resolve, reject) {
        mkdirp(path.dirname(file), function(err) {
            if (err) {
                reject(err);
                return;
            }

            var fileUrl = url.resolve(options.serverUrl, path.basename(file));
            request
                .get(fileUrl)
                .on('error', reject)
                .on('end', resolve)
                .pipe(fs.createWriteStream(path.resolve(file)));
        });
    });
};

/**
 * Upload a file to the remote repository.
 *
 * @param {string} file - Path of the file to upload
 * @param {Object} options
 * @param {string} options.serverUrl
 * @return {boolean} True if the file was uploaded
 */
var uploadFile = exports.uploadFile = function(file, options) {
    var apiKey = _getApiKey;
    if ( ! (apiKey instanceof String) || apiKey.length === 0) {
        return false;
    }

    // TODO: Rest of function
};