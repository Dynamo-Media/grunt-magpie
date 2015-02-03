'use strict';

var grunt = require('grunt');


exports.magpie = {
  setUp: function(done) {
    done();
  },

  task_files_src_dest_format: function(test) {
    test.expect(3);

    test.ok(! grunt.file.exists('tmp/task_files_src_dest_format.txt'), 'should not create a non-versioned file.');
    test.ok(grunt.file.exists('tmp/task_files_src_dest_format.dee5a47a.txt'), 'should create a versioned file.');
    test.equal(grunt.file.read('tmp/task_files_src_dest_format.dee5a47a.txt'), grunt.file.read('test/expected/concat_hello_testing'), 'should have expected content.');

    test.done();
  }
};
