'use strict';

var mocks = require('./mocks');
var grunt = require('grunt');


exports.magpie = {
  setUp: function(done) {
    done();
  },

  default_not_found_upload: function(test) {
    test.expect(4);

    test.ok( ! grunt.file.exists('tmp/default_not_found_upload.txt'), 'should not create a non-versioned file.');
    test.ok(grunt.file.exists('tmp/default_not_found_upload.dee5a47a.txt'), 'should create a versioned file.');
    test.equal(grunt.file.read('tmp/default_not_found_upload.dee5a47a.txt'), grunt.file.read('test/expected/concat_hello_testing'), 'should have expected content.');
    test.ok(mocks.repositoryHasFileUpload('default_not_found_upload.dee5a47a.txt'), 'should upload file to repository');

    test.done();
  },

  default_found_download: function(test) {
    test.expect(3);

    test.ok( ! grunt.file.exists('tmp/default_found_download.txt'), 'should not create a non-versioned file.');
    test.ok(grunt.file.exists('tmp/default_found_download.12d05c6f.txt'), 'should create a versioned file.');
    test.equal(grunt.file.read('tmp/default_found_download.12d05c6f.txt'), grunt.file.read('test/expected/concat_hello_download_me'), 'should have expected content.');

    test.done();
  },

  default_versioned_files: function(test) {
    test.expect(2);

    test.ok(grunt.file.exists('versioned_files.json'), 'should create `versioned_files.json`.');
    test.equal(grunt.file.read('versioned_files.json'), grunt.file.read('test/expected/default_versioned_files.json'), 'should contain JSON of versioned files.');

    test.done();
  },

  version_after_build: function(test) {
    test.expect(3);

    test.ok( ! grunt.file.exists('tmp/version_after_build.css'), 'should not create a non-versioned file.');
    test.ok( ! grunt.file.exists('tmp/version_after_build.5f560439.css'), 'should not create a version hash before running the task');
    test.ok(grunt.file.exists('tmp/version_after_build.5772d1c5.css'), 'should create a versioned file after the task has run');

    test.done();
  },

  after_build_versioned_files: function(test) {
    test.expect(2);

    test.ok(grunt.file.exists('tmp/after_build_versioned_files.json'), 'should create `after_build_versioned_files.json`.');
    test.equal(grunt.file.read('tmp/after_build_versioned_files.json'), grunt.file.read('test/expected/after_build_versioned_files.json'), 'should contain JSON of versioned files.');

    test.done();
  },

  pipeline: function(test) {
    test.expect(8);

    test.ok( ! grunt.file.exists('tmp/pipeline_a_b_uglify.js'), 'should not create a `pipeline_a_b_uglify.js` non-versioned file.');
    test.ok(grunt.file.exists('tmp/pipeline_a_b_uglify.b043221e.js'), 'should create a `pipeline_a_b_uglify.js` versioned file.');
    test.ok(mocks.repositoryHasFileUpload('pipeline_a_b_uglify.b043221e.js'), 'should upload versioned `pipeline_a_b_uglify.js` file to repository');

    test.ok( ! grunt.file.exists('tmp/pipeline_b_c_uglify.js'), 'should not create a `pipeline_b_c_uglify.js` non-versioned file.');
    test.ok(grunt.file.exists('tmp/pipeline_b_c_uglify.27b4401e.js'), 'should create a `pipeline_b_c_uglify.js` versioned file.');
    test.ok(mocks.repositoryHasFileUpload('pipeline_b_c_uglify.27b4401e.js'), 'should upload versioned `pipeline_a_c_uglify.js` file to repository');

    test.ok(grunt.file.exists('tmp/pipeline_versioned_files.json'), 'should create `pipeline_versioned_files.json`.');
    test.equal(grunt.file.read('tmp/pipeline_versioned_files.json'), grunt.file.read('test/expected/pipeline_versioned_files.json'), 'should contain JSON of versioned files.');

    test.done();
  },

  pipeline_found_download: function(test) {
    test.expect(6);

    test.ok( ! grunt.file.exists('tmp/pipeline_a_c_uglify.js'), 'should not create a non-versioned file.');
    test.ok( ! grunt.file.exists('tmp/pipeline_a_c.js'), 'should not create any intermediate files.');
    test.ok(grunt.file.exists('tmp/pipeline_a_c_uglify.3bafa719.js'), 'should create a versioned file.');
    test.equal(grunt.file.read('tmp/pipeline_a_c_uglify.3bafa719.js'), grunt.file.read('test/expected/pipeline_a_c_uglify_downloaded.js'), 'should have expected content.');
    test.ok(grunt.file.exists('tmp/pipeline_downloaded_versioned_files.json'), 'should create `pipeline_downloaded_versioned_files.json`.');
    test.equal(grunt.file.read('tmp/pipeline_downloaded_versioned_files.json'), grunt.file.read('test/expected/pipeline_downloaded_versioned_files.json'), 'should contain JSON of versioned files.');

    test.done();
  },

  do_not_version: function(test) {
    test.expect(1);

    test.ok(grunt.file.exists('tmp/do_not_version.txt'), 'should create a non-versioned destination file.');

    test.done();
  }
};
