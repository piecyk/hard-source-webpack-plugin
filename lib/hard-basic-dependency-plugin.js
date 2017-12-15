var AMDDefineDependency = require('webpack/lib/dependencies/AMDDefineDependency');
var ConstDependency = require('webpack/lib/dependencies/ConstDependency');
var ContextDependency = require('webpack/lib/dependencies/ContextDependency');

var cachePrefix = require('./util').cachePrefix;

var HardContextDependency = require('./dependencies').HardContextDependency;
var HardModuleDependency = require('./dependencies').HardModuleDependency;
var HardNullDependency = require('./dependencies').HardNullDependency;
var LoggerFactory = require('./logger-factory');
var pluginCompat = require('./util/plugin-compat');

function flattenPrototype(obj) {
  if (typeof obj === 'string') {
    return obj;
  }
  var copy = {};
  for (var key in obj) {
    copy[key] = obj[key];
  }
  return copy;
}

function HardBasicDependencyPlugin() {}

HardBasicDependencyPlugin.prototype.apply = function(compiler) {
  pluginCompat.tap(compiler, '_hardSourceFreezeDependency', 'HardBasicDependencyPlugin freeze', function(frozen, dependency, extra) {
    if (dependency instanceof ContextDependency) {
      return {
        type: 'ContextDependency',
        critical: dependency.critical,
        request: dependency.request,
        recursive: dependency.recursive,
        regExp: dependency.regExp ? dependency.regExp.source : false,
        async: dependency.async,
        optional: dependency.optional,
      };
    }
    else if (
      dependency instanceof ConstDependency ||
      dependency instanceof AMDDefineDependency
    ) {
      return {
        type: 'NullDependency',
      };
    }
    else if (!frozen && dependency.request) {
      return {
        type: 'ModuleDependency',
        request: dependency.request,
        optional: dependency.optional,
      };
    }

    return frozen;
  });

  pluginCompat.tap(compiler, '_hardSourceAfterFreezeDependency', 'HardBasicDependencyPlugin after freeze', function(frozen, dependency, extra) {
    if (frozen && dependency.loc) {
      frozen.loc = flattenPrototype(dependency.loc);
    }

    return frozen;
  });

  var walkDependencyBlock = function(block, callback) {
    block.dependencies.forEach(callback);
    block.variables.forEach(function(variable) {
      variable.dependencies.forEach(callback);
    })
    block.blocks.forEach(function(block) {
      walkDependencyBlock(block, callback);
    });
  };

  compiler.plugin('compilation', function(compilation) {
    compilation.plugin('seal', function() {
      compilation.modules.forEach(function(module) {
        walkDependencyBlock(module, function(dep) {
          if (dep.module) {
            dep.__hardSource_resolvedModuleIdentifier = dep.module.identifier();
          }
        });
      });
    });
  });

  pluginCompat.tap(compiler, '_hardSourceAfterFreezeDependency', 'HardBasicDependencyPlugin', function(frozen, dependency, extra) {
    if (!frozen) {return frozen;}

    var module = extra.module;
    var compilation = extra.compilation;
    var identifierPrefix = cachePrefix(compilation);

    if (identifierPrefix !== null) {
      // The identifier this dependency should resolve to.
      var _resolvedModuleIdentifier =
        dependency.module && dependency.__hardSource_resolvedModuleIdentifier;
      try {
        // An identifier to dereference a dependency under a module to some per
        // dependency value
        var _inContextDependencyIdentifier = module &&
          JSON.stringify([module.context, frozen.importDependency || frozen]);
      }
      catch (e) {
        var loggerSerial = LoggerFactory.getLogger(compilation).from('serial');
        var compilerName = compilation.compiler.name;
        var compilerContext = compilation.compiler.context;
        var depModuleIdentifier = dependency.module &&
          dependency.module.identifier();
        var moduleIdentifier = module.identifier();
        var shortener = new (require('webpack/lib/RequestShortener'))(
          compilerContext
        );
        var depModuleReadable = dependency.module &&
          dependency.module.readableIdentifier(shortener);
        var moduleReadable = module.readableIdentifier(shortener);

        loggerSerial.error(
          {
            id: 'serialization--error-freezing-dependency',
            identifierPrefix: identifierPrefix,
            compilerName: compilerName,
            dependencyModuleIdentifier: depModuleIdentifier,
            moduleIdentifier: moduleIdentifier,
            error: e,
            errorMessage: e.message,
            errorStack: e.stack,
          },
          'Unable to freeze ' + frozen.type + ' dependency to "' +
          depModuleReadable + '" in "' + moduleReadable +
          (compilerName ? '" in compilation "' + compilerName : '') + '". An ' +
          'error occured serializing it into a string: ' + e.message
        );
        throw e;
      }
      // An identifier from the dependency to the cached resolution information
      // for building a module.
      var _moduleResolveCacheId = module && frozen.request && JSON.stringify([identifierPrefix, module.context, frozen.request]);
      frozen._resolvedModuleIdentifier = _resolvedModuleIdentifier;
      frozen._inContextDependencyIdentifier = _inContextDependencyIdentifier;
      frozen._moduleResolveCacheId = _moduleResolveCacheId;
    }

    return frozen;
  });

  pluginCompat.tap(compiler, '_hardSourceThawDependency', 'HardBasicDependencyPlugin', function(dependency, frozen, extra) {
    if (frozen.type === 'ContextDependency') {
      dependency = new HardContextDependency(frozen.request, frozen.recursive, frozen.regExp ? new RegExp(frozen.regExp) : false);
      dependency.critical = frozen.critical;
      dependency.async = frozen.async;
      if (frozen.optional) {
        dependency.optional = true;
      }
      return dependency;
    }
    else if (frozen.type === 'NullDependency') {
      return new HardNullDependency();
    }
    else if (frozen.type === 'ModuleDependency') {
      dependency = new HardModuleDependency(frozen.request);
      if (frozen.optional) {
        dependency.optional = true;
      }
      return dependency;
    }

    return dependency;
  });

  pluginCompat.tap(compiler, '_hardSourceAfterThawDependency', 'HardBasicDependencyPlugin', function(dependency, frozen, extra) {
    if (dependency && frozen.loc) {
      dependency.loc = frozen.loc;
    }

    return dependency;
  });
};

module.exports = HardBasicDependencyPlugin;
