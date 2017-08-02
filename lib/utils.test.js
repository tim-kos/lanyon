'use strict';

// To allow tests to pass on older platforms: https://travis-ci.org/kvz/lanyon/jobs/200631620#L1079
// require('babel-register')({
//   // This will override `node_modules` ignoring - you can alternatively pass
//   // an array of strings to be explicitly matched or a regex / glob
//   ignore: false,
// })

var utils = require('./utils');
// const debug      = require('depurar')('sut')
var sut = utils;
var cacheDir = 'CACHEDIR';
var projectDir = 'PROJECTDIR';
var lanyonVersion = 'LANYONVERSION';

describe('utils', function () {
  describe('dockerCmd', function () {
    it('should add custom flags', function () {
      var res = sut.dockerCmd({ cacheDir: cacheDir, projectDir: projectDir, lanyonVersion: lanyonVersion }, 'CMD', 'FLAGS');
      expect(res).toMatchSnapshot();
    });
  });
});

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
          fileName: 'src/utils.test.js',
          localName: localName
        }
      });
    } catch (err) {}
  }

  tagSource(sut, 'sut');
  tagSource(cacheDir, 'cacheDir');
  tagSource(projectDir, 'projectDir');
  tagSource(lanyonVersion, 'lanyonVersion');
})();
//# sourceMappingURL=utils.test.js.map