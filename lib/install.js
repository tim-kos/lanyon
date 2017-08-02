'use strict';

var _templateObject = _taggedTemplateLiteral(['\n        cd "', '" && (\n          ', ' ', ' install ', '\n            --no-rdoc\n            --no-ri\n          bundler -v \'', '\'\n          ', '\n        )\n      '], ['\n        cd "', '" && (\n          ', ' ', ' install ', '\n            --no-rdoc\n            --no-ri\n          bundler -v \'', '\'\n          ', '\n        )\n      ']),
    _templateObject2 = _taggedTemplateLiteral(['\n        cd "', '" && (\n          brew install libxml2;\n          ', ' config build.nokogiri\n            --use-system-libraries\n            --with-xml2-include=$(brew --prefix libxml2 | sed \'s@_[0-9]*$@@\')/include/libxml2\n          ', '\n        )\n      '], ['\n        cd "', '" && (\n          brew install libxml2;\n          ', ' config build.nokogiri\n            --use-system-libraries\n            --with-xml2-include=$(brew --prefix libxml2 | sed \'s@_[0-9]*$@@\')/include/libxml2\n          ', '\n        )\n      ']),
    _templateObject3 = _taggedTemplateLiteral(['\n        cd "', '" && (\n          ', ' config build.nokogiri\n            --use-system-libraries\n          ', '\n        )\n      '], ['\n        cd "', '" && (\n          ', ' config build.nokogiri\n            --use-system-libraries\n          ', '\n        )\n      ']),
    _templateObject4 = _taggedTemplateLiteral(['\n      cd "', '" && (\n        ', ' install\n          --binstubs=\'', '\'\n          --path=\'vendor/bundler\'\n          ', '\n        ||\n        ', ' update\n        ', '\n      )\n    '], ['\n      cd "', '" && (\n        ', ' install\n          --binstubs=\'', '\'\n          --path=\'vendor/bundler\'\n          ', '\n        ||\n        ', ' update\n        ', '\n      )\n    ']);

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

require('babel-polyfill');
var path = require('path');
var utils = require('./utils');
var os = require('os');
var shell = require('shelljs');
var fs = require('fs');
// var debug      = require('depurar')('lanyon')
var _ = require('lodash');
var oneLine = require('common-tags/lib/oneLine');
// const stripIndent = require('common-tags/lib/stripIndent')
var scrolex = require('scrolex').persistOpts({
  announce: true,
  addCommandAsComponent: true,
  components: 'lanyon>install'
});

if (require.main === module) {
  scrolex.failure('Please only used this module via require, or: src/cli.js ' + process.argv[1]);
  process.exit(1);
}

module.exports = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(runtime, cb) {
    var deps, name, envPrefix, passEnv, rubyProvider, buff, cache, localGemArgs, vals, key, val, _name, dep, shim, shimPath;

    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            // Set prerequisite defaults
            deps = _.cloneDeep(runtime.prerequisites);

            for (name in deps) {
              if (!deps[name].exeSuffix) {
                deps[name].exeSuffix = '';
              }
              if (!deps[name].exe) {
                deps[name].exe = name;
              }
              if (!deps[name].versionCheck) {
                deps[name].versionCheck = deps[name].exe + ' -v';
              }
            }

            envPrefix = '';
            passEnv = {};
            rubyProvider = '';

            if (!runtime.lanyonReset) {
              _context.next = 9;
              break;
            }

            scrolex.stick('Removing existing shims');
            _context.next = 9;
            return scrolex.exe('rm -f ' + runtime.binDir + '/*');

          case 9:

            if (!utils.satisfied(runtime, 'node')) {
              scrolex.failure('No satisfying node found');
              process.exit(1);
            }

            // Detmine optimal rubyProvider and adjust shim configuration

            if (!utils.satisfied(runtime, 'ruby', runtime.binDir + '/ruby -v', 'ruby-shim')) {
              _context.next = 23;
              break;
            }

            buff = fs.readFileSync(runtime.binDir + '/ruby', 'utf-8').trim();

            if (buff.indexOf('docker') !== -1) {
              rubyProvider = 'docker';
            } else if (buff.indexOf('rvm') !== -1) {
              rubyProvider = 'rvm';
            } else if (buff.indexOf('rbenv') !== -1) {
              rubyProvider = 'rbenv';
            } else {
              rubyProvider = 'system';
            }
            scrolex.stick('Found a working shim - determined to be a "' + rubyProvider + '" rubyProvider');
            deps.ruby.exe = fs.readFileSync(runtime.binDir + '/ruby', 'utf-8').trim().replace(' $*', '');
            deps.ruby.writeShim = false;
            deps.ruby.versionCheck = deps.ruby.exe + ' -v' + deps.ruby.exeSuffix;
            deps.gem.exe = fs.readFileSync(runtime.binDir + '/gem', 'utf-8').trim().replace(' $*', '');
            deps.gem.writeShim = false;
            deps.bundler.exe = runtime.binDir + '/bundler'; // <-- not a lanyon shim, it's a real gem bin
            deps.bundler.writeShim = false;
            _context.next = 63;
            break;

          case 23:
            if (!utils.satisfied(runtime, 'ruby', undefined, 'system')) {
              _context.next = 29;
              break;
            }

            rubyProvider = 'system';
            deps.gem.exe = shell.which('gem').stdout;
            deps.bundler.exe = shell.which('bundler').stdout;
            _context.next = 63;
            break;

          case 29:
            if (!utils.satisfied(runtime, 'docker')) {
              _context.next = 43;
              break;
            }

            rubyProvider = 'docker';

            if (!(process.env.DOCKER_BUILD === '1')) {
              _context.next = 37;
              break;
            }

            cache = process.env.DOCKER_RESET === '1' ? ' --no-cache' : '';
            _context.next = 35;
            return scrolex.exe('cd "' + runtime.cacheDir + '" && docker build' + cache + ' -t kevinvz/lanyon:' + runtime.lanyonVersion + ' .');

          case 35:
            _context.next = 37;
            return scrolex.exe('cd "' + runtime.cacheDir + '" && docker push kevinvz/lanyon:' + runtime.lanyonVersion);

          case 37:
            deps.sh.exe = utils.dockerCmd(runtime, 'sh', '--interactive --tty');
            deps.ruby.exe = utils.dockerCmd(runtime, 'ruby');
            deps.ruby.versionCheck = utils.dockerCmd(runtime, 'ruby -v' + deps.ruby.exeSuffix);
            deps.jekyll.exe = utils.dockerCmd(runtime, 'bundler exec jekyll');
            _context.next = 63;
            break;

          case 43:
            if (!(utils.satisfied(runtime, 'rbenv') && shell.exec('rbenv install --help', { 'silent': true }).code === 0)) {
              _context.next = 52;
              break;
            }

            // rbenv does not offer installing of rubies by default, it will also require the install plugin --^
            rubyProvider = 'rbenv';
            _context.next = 47;
            return scrolex.exe('bash -c "rbenv install --skip-existing \'' + deps.ruby.preferred + '\'"');

          case 47:
            deps.ruby.exe = 'bash -c "eval $(rbenv init -) && rbenv shell \'' + deps.ruby.preferred + '\' &&';
            deps.ruby.exeSuffix = '"';
            deps.ruby.versionCheck = deps.ruby.exe + 'ruby -v' + deps.ruby.exeSuffix;
            _context.next = 63;
            break;

          case 52:
            if (!utils.satisfied(runtime, 'rvm')) {
              _context.next = 61;
              break;
            }

            rubyProvider = 'rvm';
            _context.next = 56;
            return scrolex.exe('bash -c "rvm install \'' + deps.ruby.preferred + '\'"');

          case 56:
            deps.ruby.exe = 'bash -c "rvm \'' + deps.ruby.preferred + '\' exec';
            deps.ruby.exeSuffix = '"';
            deps.ruby.versionCheck = deps.ruby.exe + ' ruby -v' + deps.ruby.exeSuffix;
            _context.next = 63;
            break;

          case 61:
            scrolex.failure('Ruby version not satisfied, and exhausted ruby version installer helpers (rvm, rbenv, brew)');
            process.exit(1);

          case 63:

            // Verify Ruby
            scrolex.stick('Checking for ruby via: ' + deps.ruby.versionCheck);
            if (!utils.satisfied(runtime, 'ruby', deps.ruby.versionCheck, 'verify')) {
              scrolex.failure('Ruby should have been installed but still not satisfied');
              process.exit(1);
            }

            if (!(rubyProvider !== 'docker')) {
              _context.next = 83;
              break;
            }

            // Install Bundler
            deps.bundler.exe = deps.ruby.exe + ' ' + deps.bundler.exe;

            if (utils.satisfied(runtime, 'bundler', deps.bundler.exe + ' -v' + deps.ruby.exeSuffix)) {
              _context.next = 73;
              break;
            }

            localGemArgs = '';

            if (rubyProvider === 'system') {
              localGemArgs = '--binDir=\'' + runtime.binDir + '\' --install-dir=\'' + runtime.cacheDir + '/vendor/gem_home\'';
            }

            _context.next = 72;
            return scrolex.exe(oneLine(_templateObject, runtime.cacheDir, deps.ruby.exe, deps.gem.exe, localGemArgs, deps.bundler.preferred, deps.ruby.exeSuffix));

          case 72:

            if (rubyProvider === 'system') {
              deps.bundler.exe = runtime.binDir + '/bundler';
              passEnv.GEM_HOME = runtime.cacheDir + '/vendor/gem_home';
              passEnv.GEM_PATH = runtime.cacheDir + '/vendor/gem_home';

              if (Object.keys(passEnv).length > 0) {
                vals = [];

                for (key in passEnv) {
                  val = passEnv[key];

                  vals.push(key + '=' + val);
                }
                envPrefix = 'env ' + vals.join(' ') + ' ';
              }

              deps.bundler.exe = envPrefix + deps.bundler.exe;
            }

          case 73:
            if (!(os.platform() === 'darwin' && shell.exec('brew -v', { 'silent': true }).code === 0)) {
              _context.next = 78;
              break;
            }

            _context.next = 76;
            return scrolex.exe(oneLine(_templateObject2, runtime.cacheDir, deps.bundler.exe, deps.ruby.exeSuffix));

          case 76:
            _context.next = 80;
            break;

          case 78:
            _context.next = 80;
            return scrolex.exe(oneLine(_templateObject3, runtime.cacheDir, deps.bundler.exe, deps.ruby.exeSuffix));

          case 80:

            deps.jekyll.exe = deps.bundler.exe + ' exec jekyll';

            // Install Gems from Gemfile bundle
            _context.next = 83;
            return scrolex.exe(oneLine(_templateObject4, runtime.cacheDir, deps.bundler.exe, runtime.binDir, deps.ruby.exeSuffix, deps.bundler.exe, deps.ruby.exeSuffix));

          case 83:

            // Write shims
            for (_name in deps) {
              dep = deps[_name];

              if (dep.writeShim) {
                shim = envPrefix + dep.exe.trim() + ' $*' + deps.ruby.exeSuffix + '\n';

                if (_name === 'dash') {
                  shim = envPrefix + dep.exe.trim() + ' $*' + deps.dash.exeSuffix + '\n';
                }
                shimPath = path.join(runtime.binDir, _name);

                fs.writeFileSync(shimPath, shim, { 'encoding': 'utf-8', 'mode': '755' });
                scrolex.stick('Installed: ' + _name + ' shim to: ' + shimPath + ' ..');
              }
            }

            if (runtime.lanyonUpdateGemLockfile === true) {
              utils.fsCopySync(runtime.cacheDir + '/Gemfile.lock', runtime.lanyonDir + '/Gemfile.lock');
            }

            cb(null);

          case 86:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

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
          fileName: 'src/install.js',
          localName: localName
        }
      });
    } catch (err) {}
  }

  tagSource(scrolex, 'scrolex');
})();
//# sourceMappingURL=install.js.map