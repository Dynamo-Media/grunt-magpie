/**
 * @module mocks
 */

var _ = require('underscore');
var when = require('when');
var path = require('path');
var grunt = require('grunt');


var mocks = {};

function _add(modulePath, functionName, fn) {
    var moduleObj = require(require.resolve(modulePath));
    if (mocks[moduleObj.lib] !== true) {
        mocks[moduleObj.lib] = true;
    }
    moduleObj[functionName] = fn;
}

var _repositoryFiles = {
    'default_found_download.12d05c6f.txt': 'hello\ndownloadmefromzeserver',
    'pipeline_a_c_uglify.3bafa719.js': 'DOWNLOADEDWOOP'
};

function _repositoryDownloadFile(filePath) {
    var fileName = path.basename(filePath);
    if (_repositoryFiles[fileName] === undefined) {
        return when.promise(function(resolve, reject) {
            reject({
                statusCode: 404
            });
        });
    }

    return when.promise(function(resolve) {
        grunt.file.write(filePath, _repositoryFiles[fileName]);
        resolve('ok');
    });
}

var _repositoryFileUploads = [];

function _repositoryUploadFile(file) {
    return when.promise(function(resolve, reject) {
        if (grunt.file.exists(file)) {
            _repositoryFileUploads.push(path.basename(file));
            return resolve({
                file: file
            });
        }

        reject({
            file: file,
            err: 'File not found'
        });
    });
}

exports.repositoryHasFileUpload = function(file) {
    return (_.contains(_repositoryFileUploads, path.basename(file)));
};

var setup = exports.setup = function() {
    _add('../lib/repository', 'hasUploadAccess', function() { return true; });
    _add('../lib/repository', 'downloadFile', _repositoryDownloadFile);
    _add('../lib/repository', 'uploadFile', _repositoryUploadFile);
};