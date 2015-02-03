/**
 * @module mocks
 */
var when = require('when');
var path = require('path');
var mkdirp = require('mkdirp');


var mocks = {};

function _add(modulePath, functionName, fn) {
    var moduleObj = require(require.resolve(modulePath));
    if (mocks[moduleObj.lib] !== true) {
        mocks[moduleObj.lib] = true;
    }
    moduleObj[functionName] = fn;
}

var _repositoryConfig = {};

function _repositoryDownloadFile(filePath) {
    var fileName = path.basename(filePath);
    if (_repositoryConfig[fileName] === undefined) {
        return when.promise(function(resolve, reject) {
            reject();
        });
    }

    return when.promise(function(resolve) {
        resolve(_repositoryConfig[fileName]);
    });
}

exports.setup = function() {
    _add('../lib/repository', 'downloadFile', _repositoryDownloadFile);
};