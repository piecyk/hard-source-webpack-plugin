var AsyncDependenciesBlock = require('webpack/lib/AsyncDependenciesBlock');
var DependenciesBlockVariable = require('webpack/lib/DependenciesBlockVariable');

var pluginCompat = require('./util/plugin-compat');

function HardDependencyBlockPlugin() {}

HardDependencyBlockPlugin.prototype.apply = function(compiler) {
  var mapFreeze, mapThaw;

  pluginCompat.tap(compiler, '_hardSourceMethods', 'HardDependencyBlockPlugin', function(methods) {
    // store = methods.store;
    // fetch = methods.fetch;
    // freeze = methods.freeze;
    // thaw = methods.thaw;
    mapFreeze = methods.mapFreeze;
    mapThaw = methods.mapThaw;
  });

  pluginCompat.tap(compiler, '_hardSourceFreezeDependencyVariable', 'HardDependencyBlockPlugin', function(frozen, variable, extra) {
    return {
      dependencies: mapFreeze('Dependency', null, variable.dependencies, extra),
    };
  });

  pluginCompat.tap(compiler, '_hardSourceFreezeDependencyBlock', 'HardDependencyBlockPlugin', function(frozen, block, extra) {
    return {
      name: block.chunkName,
      type: block instanceof AsyncDependenciesBlock ?
        'AsyncDependenciesBlock' :
        'DependenciesBlock',
      dependencies: mapFreeze('Dependency', null, block.dependencies, extra),
      variables: mapFreeze('DependencyVariable', null, block.variables, extra),
      blocks: mapFreeze('DependencyBlock', null, block.blocks, extra),
    };
  });

  pluginCompat.tap(compiler, '_hardSourceThawDependencyVariable', 'HardDependencyBlockPlugin', function(variable, frozen, extra) {
    return new DependenciesBlockVariable(
      frozen.name,
      frozen.expression,
      mapThaw('Dependency', null, frozen.dependencies, extra)
    );
  });

  pluginCompat.tap(compiler, '_hardSourceThawDependencyBlock', 'HardDependencyBlockPlugin', function(block, frozen, extra) {
    if (frozen.type === 'AsyncDependenciesBlock') {
      block = new AsyncDependenciesBlock(frozen.name, extra.module);
    }
    if (block) {
      var blockExtra = {
        state: extra.state,
        module: extra.module,
        parent: block,
      };
      block.dependencies = mapThaw('Dependency', null, frozen.dependencies, blockExtra);
      block.variables = mapThaw('DependencyVariable', null, frozen.variables, blockExtra);
      mapThaw('DependencyBlock', null, frozen.blocks, blockExtra);
    }
    if (frozen.type === 'AsyncDependenciesBlock') {
      extra.parent.addBlock(block);
    }

    return block;
  });
};

module.exports = HardDependencyBlockPlugin;
