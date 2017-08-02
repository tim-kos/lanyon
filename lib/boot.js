'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

require('babel-polyfill');
module.exports = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(whichPackage) {
    var _this = this;

    var _, config, utils, fs, asyncMapValues, scrolex, pad, runtime, scripts, cmdName, cmd, _ret;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _ = require('lodash');
            config = require('./config');
            utils = require('./utils');
            fs = require('fs');
            asyncMapValues = require('async/mapValues');
            scrolex = require('scrolex');
            pad = require('pad');
            runtime = config.runtime;

            // 'start'                    : 'parallelshell "lanyon build:content:watch" "lanyon build:assets:watch" "lanyon serve"',

            scripts = {
              // assets:watch is typically handled via browsersync middleware, so this is more for debugging purposes:
              'build:assets:watch': 'webpack --watch --config [cacheDir]/webpack.config.js',
              'build:assets': 'webpack --config [cacheDir]/webpack.config.js',
              'build:content:incremental': 'jekyll build --incremental --source [projectDir] --destination [contentBuildDir] --verbose --config [projectDir]/_config.yml,[cacheDir]/jekyll.config.yml,[cacheDir]/jekyll.lanyon_assets.yml',
              'build:content:watch': 'nodemon --config [cacheDir]/nodemon.config.json --exec "lanyon build:content:incremental"',
              'build:content': 'jekyll build --source [projectDir] --destination [contentBuildDir] --verbose --config [projectDir]/_config.yml,[cacheDir]/jekyll.config.yml,[cacheDir]/jekyll.lanyon_assets.yml',
              // 'build:images'             : 'imagemin [projectDir]/assets/images --out-dir=[projectDir]/assets/build/images',
              // @todo: useless until we have: https://github.com/imagemin/imagemin-cli/pull/11 and https://github.com/imagemin/imagemin/issues/226
              'build:emoji': 'bundler exec gemoji extract assets/images/emoji',
              'build': 'lanyon build:assets && lanyon build:content', // <-- parrallel won't work for production builds, jekyll needs to copy assets into _site
              'container:connect': utils.dockerCmd(runtime, 'sh', '--interactive --tty'),
              'deploy': require('./deploy'),
              'encrypt': require('./encrypt'),
              'help': 'jekyll build --help',
              'install': require('./install'),
              'list:ghpgems': 'bundler exec github-pages versions --gem',
              'serve': 'browser-sync start --config [cacheDir]/browsersync.config.js',
              'start': 'parallelshell "lanyon build:content:watch" "lanyon serve"'
            };


            if (runtime.trace) {
              scripts['build:content:incremental'] += ' --trace';
              scripts['build:content'] += ' --trace';
            }

            if (runtime.profile) {
              scripts['build:content:incremental'] += ' --profile';
              scripts['build:content'] += ' --profile';
            }

            cmdName = process.argv[2];
            cmd = scripts[cmdName];


            scrolex.persistOpts({
              announce: true,
              addCommandAsComponent: true,
              components: 'lanyon>' + cmdName,
              env: _extends({}, process.env, {
                DEBUG: process.env.DEBUG,
                LANYON_DISABLE_GEMS: process.env.LANYON_DISABLE_GEMS,
                NODE_ENV: runtime.lanyonEnv,
                JEKYLL_ENV: runtime.lanyonEnv,
                LANYON_PROJECT: runtime.projectDir // <-- to preserve the cwd over multiple nested executes, if it wasn't initially setly set
              })
            });

            if (require.main === module) {
              scrolex.failure('Please only used this module via require');
              process.exit(1);
            }

            scrolex.stick('Booting ' + whichPackage.type + ' Lanyon->' + cmdName + '. Version: ' + whichPackage.version + ' on PID: ' + process.pid + ' from: ' + __filename);
            scrolex.stick('Detected cacheDir as "' + runtime.cacheDir + '"');
            scrolex.stick('Detected gitRoot as "' + runtime.gitRoot + '"');
            scrolex.stick('Detected npmRoot as "' + runtime.npmRoot + '"');

            if ('LANYON_DISABLE_GEMS' in process.env && process.env.LANYON_DISABLE_GEMS) {
              scrolex.stick('Disabled gems ' + process.env.LANYON_DISABLE_GEMS + ' as per LANYON_DISABLE_GEMS');
            }
            if ('LANYON_EXCLUDE' in process.env && process.env.LANYON_EXCLUDE) {
              scrolex.stick('Disabled building of ' + process.env.LANYON_EXCLUDE + ' as per LANYON_EXCLUDE');
            }
            if ('LANYON_INCLUDE' in process.env && process.env.LANYON_INCLUDE) {
              scrolex.stick('Explicitly enabling building of ' + process.env.LANYON_INCLUDE + ' as per LANYON_INCLUDE');
            }

            // Create asset dirs and git ignores
            if (cmdName.match(/^build|install|start/)) {
              utils.initProject(runtime);
            }

            // Run Pre-Hooks
            _context2.next = 25;
            return utils.runhooks('pre', cmdName, runtime);

          case 25:

            // Write all config files to cacheDir
            scrolex.stick('Writing configs');
            utils.writeConfig(config);

            // Run cmd arg

            if (!_.isFunction(cmd)) {
              _context2.next = 32;
              break;
            }

            scrolex.stick('Running ' + cmdName + ' function');
            cmd(runtime, function (err) {
              if (err) {
                scrolex.failure(cmdName + ' function exited with error ' + err);
                process.exit(1);
              }
              scrolex.stick(cmdName + ' done');
            });
            _context2.next = 40;
            break;

          case 32:
            if (!_.isString(cmd)) {
              _context2.next = 38;
              break;
            }

            _ret = function () {
              // Replace dirs
              cmd = cmd.replace(/\[lanyonDir]/g, runtime.lanyonDir);
              cmd = cmd.replace(/\[contentBuildDir]/g, runtime.contentBuildDir);
              cmd = cmd.replace(/\[projectDir]/g, runtime.projectDir);
              cmd = cmd.replace(/\[cacheDir]/g, runtime.cacheDir);

              // Replace all npms with their first-found full-path executables
              var npmBins = {
                'browser-sync': 'node_modules/browser-sync/bin/browser-sync.js',
                'lanyon': 'node_modules/lanyon/lib/cli.js',
                'nodemon': 'node_modules/nodemon/bin/nodemon.js',
                'npm-run-all': 'node_modules/npm-run-all/bin/npm-run-all/index.js',
                'parallelshell': 'node_modules/parallelshell/index.js',
                'webpack': 'node_modules/webpack/bin/webpack.js'
                // 'imagemin'     : 'node_modules/imagemin-cli/cli.js',
              };

              var _loop = function _loop(name) {
                var tests = [runtime.npmRoot + '/' + npmBins[name], runtime.projectDir + '/' + npmBins[name], runtime.lanyonDir + '/' + npmBins[name], runtime.gitRoot + '/' + npmBins[name]];

                var found = false;
                tests.forEach(function (test) {
                  if (fs.existsSync(test)) {
                    npmBins[name] = test;
                    found = true;
                    return false; // Stop looking on first hit
                  }
                });

                if (!found) {
                  throw new Error('Cannot find dependency "' + name + '" in "' + tests.join('", "') + '"');
                }
                var pat = new RegExp('(\\s|^)' + name + '(\\s|$)');
                cmd = cmd.replace(pat, '$1node ' + npmBins[name] + '$2');
              };

              for (var name in npmBins) {
                _loop(name);
              }

              var scrolexOpts = {
                stdio: 'pipe',
                cwd: runtime.cacheDir,
                fatal: true
              };
              if (cmdName !== 'start') {
                scrolexOpts.mode = 'passthru';
              }
              if (cmdName === 'container:connect') {
                scrolexOpts.stdio = 'inherit';
              }

              // Replace shims
              cmd = cmd.replace(/(\s|^)jekyll(\s|$)/, '$1' + runtime.binDir + '/jekyll$2');
              cmd = cmd.replace(/(\s|^)bundler(\s|$)/, '$1' + runtime.binDir + '/bundler$2');

              if (cmdName.match(/(^start|^deploy|^build$)/)) {
                // Show versions
                var versionMapping = {
                  webpack: 'node ' + npmBins.webpack + ' -v',
                  nodemon: 'node ' + npmBins.nodemon + ' -v',
                  jekyll: runtime.binDir + '/jekyll -v',
                  bundler: runtime.binDir + '/bundler -v'
                };
                try {
                  asyncMapValues(versionMapping, function (cmd, key, callback) {
                    scrolex.exe(cmd, { mode: 'silent', cwd: runtime.cacheDir }, callback);
                  }, function (err, stdouts) {
                    if (err) {
                      return scrolex.failure(err);
                    }
                    for (var app in stdouts) {
                      var version = stdouts[app].split(/\s+/).pop();
                      scrolex.stick('On ' + pad(app, 7) + ': v' + version);
                    }
                  });
                } catch (e) {
                  return {
                    v: scrolex.failure(e)
                  };
                }
              }

              scrolex.exe(cmd, scrolexOpts, function () {
                var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee(err, out) {
                  return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                      switch (_context.prev = _context.next) {
                        case 0:
                          _context.next = 2;
                          return utils.runhooks('post', cmdName, runtime);

                        case 2:
                        case 'end':
                          return _context.stop();
                      }
                    }
                  }, _callee, _this);
                }));

                return function (_x2, _x3) {
                  return _ref2.apply(this, arguments);
                };
              }());
            }();

            if (!((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object")) {
              _context2.next = 36;
              break;
            }

            return _context2.abrupt('return', _ret.v);

          case 36:
            _context2.next = 40;
            break;

          case 38:
            scrolex.failure('"' + cmdName + '" is not a valid Lanyon command. Pick from: ' + Object.keys(scripts).join(', ') + '.');
            process.exit(1);

          case 40:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  function boot(_x) {
    return _ref.apply(this, arguments);
  }

  return boot;
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
          fileName: 'src/boot.js',
          localName: localName
        }
      });
    } catch (err) {}
  }
})();
//# sourceMappingURL=boot.js.map