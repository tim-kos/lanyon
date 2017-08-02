#!/usr/bin/env node
'use strict';

require('babel-polyfill');
var utils = require('./utils');
var whichPackage = utils.preferLocalPackage(process.argv, __filename, process.cwd(), 'lanyon', 'lib/cli.js', require('../package.json').version);
var scrolex = require('scrolex').persistOpts({
  announce: true,
  addCommandAsComponent: true,
  components: 'lanyon>cli'
});

if (require.main !== module) {
  scrolex.failure('Please only used this module on the commandline: node src/cli.js');
  process.exit(1);
}

require('./boot')(whichPackage);

(function () {
  function tagSource(fn, localName) {
    if (typeof fn !== "function") {
      return;
    }

    if (fn.hasOwnProperty("__source")) {
      return;
    }

    try {
      Object.defineProperty(fn, "__source", {
        enumerable: false,
        configurable: true,
        value: {
          fileName: 'src/cli.js',
          localName: localName
        }
      });
    } catch (err) {}
  }

  tagSource(whichPackage, 'whichPackage');
  tagSource(scrolex, 'scrolex');
})();
//# sourceMappingURL=cli.js.map