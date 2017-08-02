'use strict';

var _templateObject = _taggedTemplateLiteral(['\n    docker run\n      ', '\n      --rm\n      --workdir ', '\n      --user $(id -u)\n      --volume ', ':', '\n      --volume ', ':', '\n    kevinvz/lanyon:', '\n    ', '\n  '], ['\n    docker run\n      ', '\n      --rm\n      --workdir ', '\n      --user $(id -u)\n      --volume ', ':', '\n      --volume ', ':', '\n    kevinvz/lanyon:', '\n    ', '\n  ']),
    _templateObject2 = _taggedTemplateLiteral(['\n    FROM ruby:2.3.3-alpine\n    RUN mkdir -p /jekyll\n    WORKDIR /jekyll\n    COPY Gemfile /jekyll/\n    COPY Gemfile.lock /jekyll/\n    RUN true \\\n      && apk --update add make gcc g++ \\\n      && (bundler install --force --path /jekyll/vendor/bundler || bundler update) \\\n      && apk del make gcc g++ \\\n      && rm -rf /var/cache/apk/* \\\n      && true\n  '], ['\n    FROM ruby:2.3.3-alpine\n    RUN mkdir -p /jekyll\n    WORKDIR /jekyll\n    COPY Gemfile /jekyll/\n    COPY Gemfile.lock /jekyll/\n    RUN true \\\\\n      && apk --update add make gcc g++ \\\\\n      && (bundler install --force --path /jekyll/vendor/bundler || bundler update) \\\\\n      && apk del make gcc g++ \\\\\n      && rm -rf /var/cache/apk/* \\\\\n      && true\n  ']);

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

require('babel-polyfill');
var semver = require('semver');
var fs = require('fs');
// const _        = require('lodash')
var path = require('path');
var _ = require('lodash');
var yaml = require('js-yaml');
var shell = require('shelljs');
var spawnSync = require('spawn-sync');
var oneLine = require('common-tags/lib/oneLine');
var stripIndent = require('common-tags/lib/stripIndent');
var scrolex = require('scrolex').persistOpts({
  announce: true,
  addCommandAsComponent: true
});

if (require.main === module) {
  scrolex.failure('Please only used this module via require');
  process.exit(1);
}

var utils = module.exports;

module.exports.preferLocalPackage = function (args, filename, appDir, name, entry, version) {
  var localModulePackage = void 0;
  var absoluteEntry = void 0;
  try {
    localModulePackage = require(appDir + '/node_modules/' + name + '/package.json');
    absoluteEntry = fs.realpathSync(appDir + '/node_modules/' + name + '/' + entry);
  } catch (e) {
    localModulePackage = {};
    absoluteEntry = false;
  }

  if (localModulePackage.version && absoluteEntry) {
    if (filename === absoluteEntry) {
      return { type: 'symlinked', version: localModulePackage.version };
    } else {
      // We're entering globally and replacing this with a local instance
      var exe = args.shift();
      for (var i in args) {
        // Replace the current entry, e.g. /usr/local/frey/lib/cli.js with the local package
        if (args[i] === filename) {
          args[i] = absoluteEntry;
        }
      }
      spawnSync(exe, args, { stdio: 'inherit' });
      process.exit(0);
      // return { type: 'local', version: localModulePackage.version }
    }
  } else {
    return { type: 'local', version: version };
  }
};

module.exports.dockerCmd = function (_ref, cmd, flags) {
  var cacheDir = _ref.cacheDir,
      projectDir = _ref.projectDir,
      lanyonVersion = _ref.lanyonVersion;

  if (!flags) {
    flags = '';
  }
  return oneLine(_templateObject, flags, cacheDir, cacheDir, cacheDir, projectDir, projectDir, lanyonVersion, cmd);
};

module.exports.runhooks = function () {
  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee(order, cmdName, runtime) {
    var arr, collectStdout, i, hook, lastPart, needEnv, squashedHooks;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            arr = [];


            arr = ['' + order + cmdName, '' + order + cmdName + ':production', '' + order + cmdName + ':development'];

            collectStdout = {};
            _context.t0 = regeneratorRuntime.keys(arr);

          case 4:
            if ((_context.t1 = _context.t0()).done) {
              _context.next = 20;
              break;
            }

            i = _context.t1.value;
            hook = arr[i];

            if (!runtime[hook]) {
              _context.next = 18;
              break;
            }

            lastPart = hook.split(':').pop();
            needEnv = 'both';


            if (lastPart === 'production') {
              needEnv = lastPart;
            }
            if (lastPart === 'development') {
              needEnv = lastPart;
            }

            if (!(needEnv === 'both' || runtime.lanyonEnv === needEnv)) {
              _context.next = 18;
              break;
            }

            squashedHooks = runtime[hook];

            if (_.isArray(runtime[hook])) {
              squashedHooks = runtime[hook].join(' && ');
            }
            _context.next = 17;
            return scrolex.exe(squashedHooks, {
              cwd: runtime.projectDir,
              mode: process.env.SCROLEX_MODE || 'singlescroll'
            });

          case 17:
            collectStdout[hook] = _context.sent;

          case 18:
            _context.next = 4;
            break;

          case 20:
            return _context.abrupt('return', collectStdout);

          case 21:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function (_x, _x2, _x3) {
    return _ref2.apply(this, arguments);
  };
}();

module.exports.upwardDirContaining = function (find, cwd, not) {
  if (!cwd) {
    cwd = process.env.PWD || process.cwd();
  }
  var parts = cwd.split('/');
  while (parts.length) {
    var newParts = parts;
    var ppath = newParts.join('/') + '/' + find;
    if (fs.existsSync(ppath)) {
      if (not === undefined || not !== path.basename(path.dirname(ppath))) {
        return path.dirname(ppath);
      }
    }
    parts.pop();
  }
  return false;
};

module.exports.initProject = function (_ref3) {
  var assetsBuildDir = _ref3.assetsBuildDir,
      gitRoot = _ref3.gitRoot,
      cacheDir = _ref3.cacheDir,
      binDir = _ref3.binDir;

  if (!fs.existsSync(assetsBuildDir)) {
    shell.mkdir('-p', assetsBuildDir);
    shell.exec('cd "' + path.dirname(gitRoot) + '" && git ignore "' + path.relative(gitRoot, assetsBuildDir) + '"');
  }
  if (!fs.existsSync(cacheDir)) {
    shell.mkdir('-p', cacheDir);
    shell.exec('cd "' + path.dirname(gitRoot) + '" && git ignore "' + path.relative(gitRoot, cacheDir) + '"');
  }
  if (!fs.existsSync(binDir)) {
    shell.mkdir('-p', binDir);
    shell.exec('cd "' + path.dirname(gitRoot) + '" && git ignore "' + path.relative(gitRoot, binDir) + '"');
  }
};

module.exports.fsCopySync = function (src, dst) {
  var _ref4 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
      _ref4$mode = _ref4.mode,
      mode = _ref4$mode === undefined ? '644' : _ref4$mode,
      _ref4$encoding = _ref4.encoding,
      encoding = _ref4$encoding === undefined ? 'utf-8' : _ref4$encoding;

  fs.writeFileSync('' + dst, fs.readFileSync('' + src, 'utf-8'), { mode: mode, encoding: encoding });
};

module.exports.writeConfig = function (cfg) {
  if (!fs.existsSync(cfg.runtime.cacheDir + '/jekyll.lanyon_assets.yml')) {
    fs.writeFileSync(cfg.runtime.cacheDir + '/jekyll.lanyon_assets.yml', '# this file should be overwritten by the Webpack AssetsPlugin', 'utf-8');
  }
  utils.fsCopySync(cfg.runtime.lanyonDir + '/Gemfile.lock', cfg.runtime.cacheDir + '/Gemfile.lock');
  try {
    fs.writeFileSync(cfg.runtime.cacheDir + '/jekyll.config.yml', yaml.safeDump(cfg.jekyll), 'utf-8');
  } catch (e) {
    console.error({ jekyll: cfg.jekyll });
    throw new Error('Unable to write above config to ' + cfg.runtime.cacheDir + '/jekyll.config.yml. ' + e.message);
  }
  fs.writeFileSync(cfg.runtime.cacheDir + '/nodemon.config.json', JSON.stringify(cfg.nodemon, null, '  '), 'utf-8');
  fs.writeFileSync(cfg.runtime.cacheDir + '/full-config-dump.json', JSON.stringify(cfg, null, '  '), 'utf-8');
  fs.writeFileSync(cfg.runtime.cacheDir + '/browsersync.config.js', 'module.exports = require("' + cfg.runtime.lanyonDir + '/lib/config.js").browsersync', 'utf-8');
  fs.writeFileSync(cfg.runtime.cacheDir + '/webpack.config.js', 'module.exports = require("' + cfg.runtime.lanyonDir + '/lib/config.js").webpack', 'utf-8');
  fs.writeFileSync(cfg.runtime.recordsPath, JSON.stringify({}, null, '  '), 'utf-8');

  var dBuf = stripIndent(_templateObject2);
  fs.writeFileSync(cfg.runtime.cacheDir + '/Dockerfile', dBuf, 'utf-8');

  var gBuf = 'source \'http://rubygems.org\'\n';
  for (var name in cfg.runtime.gems) {
    gBuf += 'gem \'' + name + '\', \'' + cfg.runtime.gems[name] + '\'\n';
  }
  fs.writeFileSync(path.join(cfg.runtime.cacheDir, 'Gemfile'), gBuf, 'utf-8');
};

module.exports.satisfied = function (_ref5, app, cmd, checkOn) {
  var prerequisites = _ref5.prerequisites,
      rubyProvidersSkip = _ref5.rubyProvidersSkip;

  var tag = '';
  if (checkOn === undefined) {
    checkOn = app;
  } else {
    tag = checkOn + '/';
  }

  if (rubyProvidersSkip.indexOf(checkOn) !== -1) {
    scrolex.failure('' + tag + app + ' \'' + prerequisites[app].range + ' disabled via LANYON_SKIP');
    return false;
  }

  if (!cmd) {
    cmd = app + ' -v';
  }

  var p = shell.exec(cmd, { 'silent': true });
  var appVersionFull = p.stdout.trim() || p.stderr.trim();
  var parts = appVersionFull.replace(/0+(\d)/g, '$1').split(/[,p\s-]+/);
  var appVersion = parts[1];

  if (app === 'node') {
    appVersion = parts[0];
  } else if (app === 'bundler') {
    appVersion = parts[2];
  } else if (app === 'docker') {
    appVersion = parts[2];
  }

  try {
    if (semver.satisfies(appVersion, prerequisites[app].range)) {
      scrolex.stick('' + tag + app + ' \'' + prerequisites[app].range + ' available');
      return true;
    }
  } catch (e) {
    scrolex.failure('' + tag + app + ' \'' + prerequisites[app].range + ' unavailable. output: ' + appVersionFull + '. ' + e);
    return false;
  }

  scrolex.failure('' + tag + app + ' \'' + prerequisites[app].range + ' unavailable. output: ' + appVersionFull);
  return false;
};

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
          fileName: 'src/utils.js',
          localName: localName
        }
      });
    } catch (err) {}
  }

  tagSource(scrolex, 'scrolex');
  tagSource(utils, 'utils');
})();
//# sourceMappingURL=utils.js.map