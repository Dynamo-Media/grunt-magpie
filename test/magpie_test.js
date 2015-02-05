'use strict';

var mocks = require('./mocks');
var grunt = require('grunt');


exports.magpie = {
  setUp: function(done) {
    done();
  },

  task_default_not_found_upload: function(test) {
    test.expect(4);

    test.ok(! grunt.file.exists('tmp/task_default_not_found_upload.txt'), 'should not create a non-versioned file.');
    test.ok(grunt.file.exists('tmp/task_default_not_found_upload.dee5a47a.txt'), 'should create a versioned file.');
    test.equal(grunt.file.read('tmp/task_default_not_found_upload.dee5a47a.txt'), grunt.file.read('test/expected/concat_hello_testing'), 'should have expected content.');
    test.ok(mocks.repositoryHasFileUpload('task_default_not_found_upload.dee5a47a.txt'), 'should upload file to repository');

    test.done();
  },

  task_default_found_download: function(test) {
    test.expect(3);

    test.ok(! grunt.file.exists('tmp/task_default_found_download.txt'), 'should not create a non-versioned file.');
    test.ok(grunt.file.exists('tmp/task_default_found_download.12d05c6f.txt'), 'should create a versioned file.');
    test.equal(grunt.file.read('tmp/task_default_found_download.12d05c6f.txt'), grunt.file.read('test/expected/concat_hello_download_me'), 'should have expected content.');

    test.done();
  },

  default_versioned_files: function(test) {
    test.expect(2);

    test.ok(grunt.file.exists('versioned_files.json'), 'should create `versioned_files.json`.');
    test.equal(grunt.file.read('versioned_files.json'), grunt.file.read('test/expected/default_versioned_files.json'), 'should contain JSON of versioned files.');

    test.done();
  }
};
