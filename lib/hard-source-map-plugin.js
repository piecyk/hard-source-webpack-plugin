var makeDevToolOptions = require('./devtool-options');
var pluginCompat = require('./util/plugin-compat');

function HardSourceMapPlugin() {}

HardSourceMapPlugin.prototype.apply = function(compiler) {
  var devtoolOptions = makeDevToolOptions(compiler.options);

  pluginCompat.tap(compiler, '_hardSourceFreezeSourceMap', 'HardSourceMapPlugin', function(frozen, source, extra) {
    return {
      map: devtoolOptions && source.map(devtoolOptions),
      // Some plugins (e.g. UglifyJs) set useSourceMap on a module. If that
      // option is set we should always store some source map info and
      // separating it from the normal devtool options may be necessary.
      baseMap: extra.module.useSourceMap && source.map(),
    };
  });
};

module.exports = HardSourceMapPlugin;
