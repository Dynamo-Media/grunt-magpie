/*
 * grunt-magpie
 * https://github.com/dynamo-media/grunt-magpie
 *
 * Copyright (c) 2015 Dynamo-Media
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  grunt.registerMultiTask('magpie', 'Version and save assets in a remote repository.', function() {
    var options = this.options({
      server_url: '127.0.0.1:8888'
    });

    /**
     * 1. Get combined hash of source files. (`src_hash`)
     * 2. Add hash before `dest` file name. (`dest_hashed_file`)
     * 3. Check if the file exists - if it does STOP HERE.
     * 4. Check if the file exists in remote repository - if it does download, write to `dest` and STOP HERE.
     * 5. Run task.
     * 6. Move `dest` file to `dest_hashed_file`.
     * 7. Push `dest_hashed_file` to remote repository.
     */

  });

};
