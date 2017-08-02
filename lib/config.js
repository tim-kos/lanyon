'use strict';

var _ = require('lodash');
var path = require('path');
var utils = require('./utils');
var shell = require('shelljs');
var fs = require('fs');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var webpack = require('webpack');
var webpackDevMiddleware = require('webpack-dev-middleware');
var webpackHotMiddleware = require('webpack-hot-middleware');
// const BowerWebpackPlugin      = require('bower-webpack-plugin')
var OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
var Visualizer = require('webpack-visualizer-plugin');
var yaml = require('js-yaml');
var AssetsPlugin = require('assets-webpack-plugin');
var WebpackMd5Hash = require('webpack-md5-hash');
var scrolex = require('scrolex').persistOpts({
  announce: true,
  addCommandAsComponent: true,
  components: 'lanyon>config'
});

if (require.main === module) {
  scrolex.failure('Please only used this module via require, or: src/cli.js ' + process.argv[1]);
  process.exit(1);
}

var runtime = {};

runtime.lanyonDir = path.join(__dirname, '..');
runtime.lanyonEnv = process.env.LANYON_ENV || 'development';
runtime.lanyonPackageFile = path.join(runtime.lanyonDir, 'package.json');
var lanyonPackage = require(runtime.lanyonPackageFile);
runtime.lanyonVersion = lanyonPackage.version;

runtime.profile = process.env.LANYON_PROFILE === '1' || !('LANYON_PROFILE' in process.env);
runtime.trace = process.env.LANYON_TRACE === '1';
runtime.publicPath = '/assets/build/';

runtime.rubyProvidersOnly = process.env.LANYON_ONLY || '';
runtime.rubyProvidersSkip = (process.env.LANYON_SKIP || '').split(/\s+/);

runtime.lanyonUpdateGemLockfile = process.env.LANYON_UPDATE_GEM_LOCKFILE === '1';
runtime.lanyonReset = process.env.LANYON_RESET === '1';
runtime.onTravis = process.env.TRAVIS === 'true';
runtime.ghPagesEnv = {
  GHPAGES_URL: process.env.GHPAGES_URL,
  GHPAGES_BOTNAME: process.env.GHPAGES_BOTNAME,
  GHPAGES_BOTEMAIL: process.env.GHPAGES_BOTEMAIL
};
runtime.isDev = runtime.lanyonEnv === 'development';
runtime.attachHMR = runtime.isDev && process.argv[1].indexOf('browser-sync') !== -1 && process.argv[2] === 'start';

runtime.projectDir = process.env.LANYON_PROJECT || process.env.PWD || process.cwd(); // <-- symlinked npm will mess up process.cwd() and point to ~/code/lanyon

runtime.npmRoot = utils.upwardDirContaining('package.json', runtime.projectDir, 'lanyon');
if (!runtime.npmRoot) {
  scrolex.failure('Unable to determine non-lanyon npmRoot, falling back to ' + runtime.projectDir);
  runtime.npmRoot = runtime.projectDir;
}
runtime.gitRoot = utils.upwardDirContaining('.git', runtime.npmRoot);

runtime.projectPackageFile = path.join(runtime.npmRoot, 'package.json');
try {
  var projectPackage = require(runtime.projectPackageFile);
} catch (e) {
  projectPackage = {};
}

runtime.gems = _.defaults(_.get(projectPackage, 'lanyon.gems') || {}, _.get(lanyonPackage, 'lanyon.gems'));
runtime = _.defaults(projectPackage.lanyon || {}, lanyonPackage.lanyon, runtime);

try {
  runtime.projectDir = fs.realpathSync(runtime.projectDir);
} catch (e) {
  runtime.projectDir = fs.realpathSync(runtime.gitRoot + '/' + runtime.projectDir);
}

runtime.cacheDir = path.join(runtime.projectDir, '.lanyon');
runtime.binDir = path.join(runtime.cacheDir, 'bin');
runtime.recordsPath = path.join(runtime.cacheDir, 'records.json');
runtime.assetsSourceDir = path.join(runtime.projectDir, 'assets');
runtime.assetsBuildDir = path.join(runtime.assetsSourceDir, 'build');
runtime.contentBuildDir = path.join(runtime.projectDir, '_site');
runtime.contentScandir = path.join(runtime.projectDir, runtime.contentScandir || '.');
runtime.contentIgnore = runtime.contentIgnore || [];

// Load project's jekyll _config.yml
runtime.jekyllConfig = {};
var jekyllConfigPath = path.join(runtime.projectDir, '_config.yml');
try {
  var buf = fs.readFileSync(jekyllConfigPath);
  runtime.jekyllConfig = yaml.safeLoad(buf);
} catch (e) {
  scrolex.failure('Unable to load ' + jekyllConfigPath);
}

runtime.themeDir = false;
if (runtime.jekyllConfig.theme) {
  var cmd = path.join(runtime.binDir, 'bundler') + ' show ' + runtime.jekyllConfig.theme;
  var z = shell.exec(cmd).stdout;
  if (!z) {
    scrolex.failure('Unable find defined them "' + runtime.jekyllConfig.theme + '" via cmd: "' + cmd + '"');
  } else {
    runtime.themeDir = z;
  }
}

// Determine rubyProvider sources to traverse
var allApps = ['system', 'docker', 'rbenv', 'rvm', 'ruby-shim'];
if (runtime.rubyProvidersOnly === 'auto-all') {
  runtime.rubyProvidersOnly = '';
}

if (runtime.rubyProvidersOnly) {
  runtime.rubyProvidersSkip = [];
  allApps.forEach(function (app) {
    if (app !== runtime.rubyProvidersOnly) {
      runtime.rubyProvidersSkip.push(app);
    }
  });
}

function getFilename(extension, isChunk, isContent) {
  var filename = '[name].' + extension;

  if (!runtime.isDev) {
    filename = '[name].[chunkhash].' + extension;
    if (isContent) {
      filename = '[name].[contenthash].' + extension;
    }
  }

  if (isChunk) {
    filename = '[name].[chunkhash].[id].chunk.' + extension;
  }

  return filename;
}

var cfg = {
  webpack: {
    entry: function dynamicEntries() {
      var entries = {};
      runtime.entries.forEach(function (entry) {
        entries[entry] = [path.join(runtime.assetsSourceDir, entry + '.js')];

        if (entry === 'app' && runtime.isDev) {
          entries[entry].unshift('webpack-hot-middleware/client');
        }
      });

      if (runtime.common) {
        // e.g.: [ "jquery" ]
        // https://webpack.github.io/docs/code-splitting.html#split-app-and-vendor-code
        entries.common = runtime.common;
      }

      return entries;
    }(),
    node: {
      fs: 'empty',
      module: 'empty'
    },
    target: 'web',
    output: {
      publicPath: runtime.publicPath,
      path: runtime.assetsBuildDir,
      filename: getFilename('js'),
      chunkFilename: getFilename('js', true)
      // cssFilename  : getFilename('css'),
    },
    devtool: function dynamicDevtool() {
      // https://webpack.js.org/configuration/devtool/#devtool
      if (runtime.isDev) {
        return 'inline-eval-cheap-source-map';
      }

      return 'source-map';
    }(),
    bail: false, // <-- We use our own ReportErrors plugin as with bail errors details are lost. e.g.: `Error at NormalModule.onModuleBuildFailed`
    module: {
      rules: function dynamicRules() {
        var rules = [{
          test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
            loader: 'url-loader',
            options: {
              limit: 10000,
              mimetype: 'application/font-woff'
            }
          }]
        }, {
          test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
            loader: 'url-loader',
            options: {
              limit: 10000,
              mimetype: 'application/font-woff'
            }
          }]
        }, {
          test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
            loader: 'url-loader',
            options: {
              limit: 10000,
              mimetype: 'application/octet-stream'
            }
          }]
        }, {
          test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
            loader: 'file-loader'
          }]
        }, {
          test: /\.cur(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
            loader: 'file-loader'
          }]
        }, {
          test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
          use: [{
            loader: 'url-loader',
            options: {
              limit: 10000,
              mimetype: 'image/svg+xml'
            }
          }]
        }, {
          test: /\.coffee$/,
          use: [{
            loader: 'coffee-loader'
          }]
        }, {
          test: /\.(png|gif|jpe?g)$/,
          use: [{
            loader: 'url-loader',
            options: {
              limit: 8096,
              mimetype: 'application/octet-stream'
            }
          }]
        }, {
          // https://github.com/webpack/webpack/issues/512
          test: /[\\/](bower_components)[\\/]modernizr[\\/]modernizr\.js$/,
          use: [
          // loader: 'imports?this=>window!exports?window.Modernizr',
          {
            loader: 'imports-loader',
            options: {
              this: '>window'
            }
          }, {
            loader: 'exports-loader',
            options: {
              'window.Modernizr': true
            }
          }]
        }, {
          test: /[\\/](bower_components)[\\/]svgeezy[\\/]svgeezy\.js$/,
          use: [
          // loader: 'imports?this=>window!exports?svgeezy',
          {
            loader: 'imports-loader',
            options: {
              this: '>window'
            }
          }, {
            loader: 'exports-loader',
            options: {
              'svgeezy': true
            }
          }]
        }, {
          // https://www.techchorus.net/blog/using-sass-version-of-bootstrap-with-webpack/
          test: /[\\/](bower_components)[\\/]bootstrap-sass[\\/]assets[\\/]javascripts[\\/]/,
          use: [
          // loader: 'imports?jQuery=jquery,$=jquery,this=>window',
          {
            loader: 'imports-loader',
            options: {
              jQuery: 'jquery',
              $: 'jquery',
              this: '>window'
            }
          }]
        }, {
          test: /[\\/]jquery\..*\.js$/,
          use: [
          // loader: 'imports?jQuery=jquery,$=jquery,this=>window',
          {
            loader: 'imports-loader',
            options: {
              jQuery: 'jquery',
              $: 'jquery',
              this: '>window'
            }
          }]
        }];

        if (runtime.isDev) {
          rules.push({
            test: /\.css$/,
            use: [{
              loader: 'style-loader'
            }, {
              loader: 'css-loader',
              options: {
                // sourceMap: true,
              }
            }, {
              loader: 'resolve-url-loader'
            }]
          });
          rules.push({
            test: /\.scss$/,
            use: [{
              loader: 'style-loader'
            }, {
              loader: 'css-loader',
              options: {
                // sourceMap: true,
              }
            }, {
              loader: 'resolve-url-loader'
            }, {
              loader: 'sass-loader',
              options: {
                // sourceMap: true,
              }
            }]
          });
          rules.push({
            test: /\.less$/,
            use: [{
              loader: 'style-loader'
            }, {
              loader: 'css-loader',
              options: {
                // sourceMap: true,
              }
            }, {
              loader: 'resolve-url-loader'
            }, {
              loader: 'less-loader',
              options: {
                // sourceMap: true,
              }
            }]
          });
        } else {
          rules.push({
            test: /\.css$/,
            use: ExtractTextPlugin.extract({
              fallback: 'style-loader',
              use: [{
                loader: 'css-loader',
                options: {
                  sourceMap: true
                }
              }, {
                loader: 'resolve-url-loader',
                options: {
                  sourceMap: true
                }
              }]
            })
          });
          rules.push({
            test: /\.scss$/,
            use: ExtractTextPlugin.extract({
              fallback: 'style-loader',
              use: [{
                loader: 'css-loader',
                options: {
                  sourceMap: true
                }
              }, {
                loader: 'resolve-url-loader',
                options: {
                  sourceMap: true
                }
              }, {
                loader: 'sass-loader',
                options: {
                  sourceMap: true
                }
              }]
            })
          });
          rules.push({
            test: /\.less$/,
            use: ExtractTextPlugin.extract({
              fallback: 'style-loader',
              use: [{
                loader: 'css-loader',
                options: {
                  sourceMap: true
                }
              }, {
                loader: 'resolve-url-loader',
                options: {
                  sourceMap: true
                }
              }, {
                loader: 'less-loader',
                options: {
                  sourceMap: true
                }
              }]
            })
          });
        }

        rules.push({
          test: /\.(js|jsx)$/,
          include: ['' + runtime.assetsSourceDir],
          exclude: [runtime.assetsSourceDir + '/bower_components', /[\\/](node_modules|bower_components|js-untouched)[\\/]/],
          use: [
          // {
          //   loader : 'react-hot-loader',
          //   options: {
          //
          //   },
          // },
          {
            loader: 'babel-loader',
            options: {
              babelrc: true,
              presets: [require.resolve('babel-preset-es2015'), require.resolve('babel-preset-react'), require.resolve('babel-preset-stage-0')],
              plugins: [require.resolve('babel-plugin-transform-class-properties')],
              // sourceRoot    : `${runtime.projectDir}`,
              cacheDirectory: runtime.cacheDir + '/babelCache'
            }
          }]
        });
        return rules;
      }()
    },
    plugins: function dynamicPlugins() {
      var plugins = [
      // new BowerWebpackPlugin(),
      new webpack.ProvidePlugin({
        _: 'lodash',
        $: 'jquery',
        jQuery: 'jquery'
      }),
      // Until loaders are updated one can use the LoaderOptionsPlugin to switch loaders into debug mode:
      new webpack.LoaderOptionsPlugin({
        debug: runtime.isDev,
        context: runtime.projectDir
      }), new AssetsPlugin({
        filename: 'jekyll.lanyon_assets.yml',
        path: runtime.cacheDir,
        processOutput: function processOutput(assets) {
          scrolex.stick('Writing asset manifest to: "' + runtime.cacheDir + '/jekyll.lanyon_assets.yml"');
          try {
            return yaml.safeDump({ lanyon_assets: assets });
          } catch (e) {
            console.error({ assets: assets });
            throw new Error('Unable to encode above config to YAML. ' + e.message);
          }
        }
      }), new WebpackMd5Hash()];

      if (runtime.isDev) {
        plugins.push(new webpack.HotModuleReplacementPlugin());
      } else {
        plugins.push(new ExtractTextPlugin({
          filename: getFilename('css'),
          allChunks: true
        }));
        // Avoid warning:
        // Warning: It looks like you're using a minified copy of the development build of React.
        // When deploying React apps to production, make sure to use the production build which
        // skips development warnings and is faster. See https://fb.me/react-minification for more details.
        // https://facebook.github.io/react/docs/optimizing-performance.html#use-the-production-build
        plugins.push(new webpack.DefinePlugin({
          'process.env': {
            NODE_ENV: JSON.stringify('production')
          }
        }));
        plugins.push(new webpack.optimize.UglifyJsPlugin({
          compress: {
            warnings: true
          },
          sourceMap: true,
          exclude: /[\\/](node_modules|bower_components|js-untouched)[\\/]/
        }));

        // plugins.push(new webpack.NoErrorsPlugin())
        plugins.push(new OptimizeCssAssetsPlugin());
        plugins.push(new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 15 }));
        plugins.push(new webpack.optimize.MinChunkSizePlugin({ minChunkSize: 10000 }));
        plugins.push(function ReportErrors() {
          this.plugin('done', function (_ref) {
            var compilation = _ref.compilation;

            for (var asset in compilation.assets) {
              scrolex.stick('Wrote ' + runtime.assetsBuildDir + '/' + asset);
            }
            if (compilation.errors && compilation.errors.length) {
              scrolex.failure(compilation.errors);
              if (!runtime.isDev) {
                process.exit(1);
              }
            }
          });
        });
      }

      if (runtime.common) {
        plugins.push(new webpack.optimize.CommonsChunkPlugin({
          name: 'common',
          filename: getFilename('js')
        }));
      }

      if (!runtime.isDev && runtime.statistics) {
        // @todo: Once Vizualizer supports multiple entries, add support for that here
        // https://github.com/chrisbateman/webpack-visualizer/issues/5
        // Currently it just shows stats for all entries in one graph
        plugins.push(new Visualizer({
          filename: runtime.statistics
        }));
      }

      return plugins;
    }(),
    resolveLoader: {
      modules: [path.join(runtime.lanyonDir, 'node_modules'), path.join(runtime.npmRoot, 'node_modules'), path.join(runtime.projectDir, 'node_modules')]
    },
    recordsPath: runtime.recordsPath,
    resolve: {
      modules: [runtime.assetsSourceDir, path.join(runtime.assetsSourceDir, 'bower_components'), path.join(runtime.projectDir, 'node_modules'), path.join(runtime.npmRoot, 'node_modules'), path.join(runtime.lanyonDir, 'node_modules')],

      // Enable Bower
      // These JSON files are read in directories
      descriptionFiles: ['package.json', 'bower.json'],

      // These fields in the description files are looked up when trying to resolve the package directory
      mainFields: ['browser', 'main'],

      // These files are tried when trying to resolve a directory
      mainFiles: ['index'],

      // These fields in the description files offer aliasing in this package
      // The content of these fields is an object where requests to a key are mapped to the corresponding value
      aliasFields: ['browser'],

      // These extensions are tried when resolving a file
      extensions: ['.js', '.json'],

      // If false it will also try to use no extension from above
      enforceExtension: false,

      // If false it's also try to use no module extension from above
      enforceModuleExtension: false
      // These aliasing is used when trying to resolve a module
      // alias: {
      //   jquery: path.resolve(__dirname, 'vendor/jquery-2.0.0.js'),
      // },
    }
  }
};

if (runtime.attachHMR) {
  var bundler = webpack(cfg.webpack);
}

cfg.browsersync = {
  server: {
    port: runtime.ports.content,
    baseDir: function dynamicWebRoots() {
      var webRoots = [runtime.contentBuildDir];
      if (runtime.extraWebroots) {
        webRoots = webRoots.concat(runtime.extraWebroots);
      }

      // Turn into absolute paths (e.g. `crmdummy` -> `/Users/kvz/code/content/_site/crmdummy` )
      for (var i in webRoots) {
        if (webRoots[i].substr(0, 1) !== '/' && webRoots[i].substr(0, 1) !== '~') {
          webRoots[i] = runtime.contentBuildDir + '/' + webRoots[i];
        }
      }

      return webRoots;
    }(),
    middleware: function dynamicMiddlewares() {
      var middlewares = [];

      if (runtime.attachHMR) {
        middlewares.push(webpackDevMiddleware(bundler, {
          publicPath: runtime.publicPath,
          hot: true,
          inline: true,
          stats: { colors: true }
        }));
        middlewares.push(webpackHotMiddleware(bundler));
      }

      if (!middlewares.length) {
        return false;
      }

      return middlewares;
    }()
    // serveStatic: runtime.themeDir
  },
  watchOptions: {
    ignoreInitial: true,
    ignored: [
    // no need to watch '*.js' here, webpack will take care of it for us,
    // including full page reloads if HMR won't work
    '*.js', '.git', 'assets/build', '.lanyon']
  },
  reloadDelay: 200,
  files: runtime.contentBuildDir
};

cfg.jekyll = {};

var jekyllDevConfigPath = runtime.projectDir + '/_config.develop.yml';
if (runtime.isDev && fs.existsSync(jekyllDevConfigPath)) {
  try {
    var _buf = fs.readFileSync(jekyllDevConfigPath);
    cfg.jekyll = yaml.safeLoad(_buf);
  } catch (e) {
    scrolex.failure('Unable to load ' + jekyllDevConfigPath);
  }
}

cfg.jekyll.gems = function dynamicGems() {
  var list = [];

  if (process.env.LANYON_DISABLE_GEMS) {
    var disabled = process.env.LANYON_DISABLE_GEMS.split(/\s*,\s*/);
    for (var i in runtime.jekyllConfig.gems) {
      var isEnabled = disabled.indexOf(runtime.jekyllConfig.gems[i]) === -1;
      if (isEnabled) {
        list.push(runtime.jekyllConfig.gems[i]);
      }
    }
  } else {
    list = runtime.jekyllConfig.gems;
  }

  if (!list || list.length < 1) {
    return null;
  }

  return list;
}();

cfg.jekyll.exclude = function dynamicExcludes() {
  var list = ['node_modules', 'env.sh', 'env.*.sh', '.env.sh', '.env.*.sh', '.lanyon'];

  if (_.get(runtime, 'jekyllConfig.exclude.length') > 0) {
    list = list.concat(runtime.jekyllConfig.exclude);
  }

  if ('LANYON_EXCLUDE' in process.env && process.env.LANYON_EXCLUDE !== '') {
    list = list.concat(process.env.LANYON_EXCLUDE.split(/\s*,\s*/));
  }

  if (!list || list.length < 1) {
    return null;
  }

  return list;
}();

cfg.jekyll.include = function dynamicIncludes() {
  var list = [];

  if (_.get(runtime, 'jekyllConfig.include.length') > 0) {
    list = list.concat(runtime.jekyllConfig.include);
  }

  if ('LANYON_INCLUDE' in process.env && process.env.LANYON_INCLUDE !== '') {
    list = list.concat(process.env.LANYON_INCLUDE.split(/\s*,\s*/));
  }

  if (!list || list.length < 1) {
    return null;
  }

  return list;
}();

cfg.nodemon = {
  onChangeOnly: true,
  verbose: true,
  watch: runtime.contentScandir,
  ignore: ['_site/**', '.env.*.sh', '.env.sh', '.lanyon/**', 'assets/**', 'env.*.sh', 'env.sh', 'node_modules/**', 'vendor/**'].concat(runtime.contentIgnore),
  ext: ['htm', 'html', 'jpg', 'json', 'md', 'png', 'sh', 'yml'].join(',')
};

cfg.runtime = runtime;

module.exports = cfg;

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
          fileName: 'src/config.js',
          localName: localName
        }
      });
    } catch (err) {}
  }

  tagSource(scrolex, 'scrolex');
  tagSource(runtime, 'runtime');
  tagSource(jekyllConfigPath, 'jekyllConfigPath');
  tagSource(allApps, 'allApps');
  tagSource(getFilename, 'getFilename');
  tagSource(cfg, 'cfg');
  tagSource(bundler, 'bundler');
  tagSource(jekyllDevConfigPath, 'jekyllDevConfigPath');
})();
//# sourceMappingURL=config.js.map