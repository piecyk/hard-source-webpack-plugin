var HarmonyImportDependency = require('webpack/lib/dependencies/HarmonyImportDependency');
var HarmonyExportExpressionDependency = require('webpack/lib/dependencies/HarmonyExportExpressionDependency');
var HarmonyExportHeaderDependency = require('webpack/lib/dependencies/HarmonyExportHeaderDependency');
var HarmonyExportImportedSpecifierDependency = require('webpack/lib/dependencies/HarmonyExportImportedSpecifierDependency');
var HarmonyExportSpecifierDependency = require('webpack/lib/dependencies/HarmonyExportSpecifierDependency');
var HarmonyImportSpecifierDependency = require('webpack/lib/dependencies/HarmonyImportSpecifierDependency');
var HarmonyCompatibilityDependency = require('webpack/lib/dependencies/HarmonyCompatibilityDependency');

var HardHarmonyExportExpressionDependency = require('./dependencies').HardHarmonyExportExpressionDependency;
var HardHarmonyExportHeaderDependency = require('./dependencies').HardHarmonyExportHeaderDependency;
var HardHarmonyExportSpecifierDependency = require('./dependencies').HardHarmonyExportSpecifierDependency;
var HardHarmonyImportDependency = require('./dependencies').HardHarmonyImportDependency;
var HardHarmonyImportSpecifierDependency = require('./dependencies').HardHarmonyImportSpecifierDependency;
var HardHarmonyExportImportedSpecifierDependency = require('./dependencies').HardHarmonyExportImportedSpecifierDependency;
var HardHarmonyCompatibilityDependency = require('./dependencies').HardHarmonyCompatibilityDependency;

var pluginCompat = require('./util/plugin-compat');

function HardHarmonyDependencyPlugin() {}

HardHarmonyDependencyPlugin.prototype.apply = function(compiler) {
  var freeze, thaw;

  pluginCompat.tap(compiler, '_hardSourceMethods', 'HardHarmonyDependencyPlugin', function(methods) {
    // store = methods.store;
    // fetch = methods.fetch;
    freeze = methods.freeze;
    thaw = methods.thaw;
    // mapFreeze = methods.mapFreeze;
    // mapThaw = methods.mapThaw;
  });

  pluginCompat.tap(compiler, '_hardSourceFreezeDependency', 'HardHarmonyDependencyPlugin', function(frozen, dependency, extra) {
    if (dependency instanceof HarmonyImportDependency) {
      return {
        type: 'HarmonyImportDependency',
        request: dependency.request,
        importedVar: dependency.importedVar,
        range: dependency.range,
      };
    }
    else if (dependency instanceof HarmonyExportImportedSpecifierDependency) {
      var activeExports = dependency.activeExports;        
      if (!!Set && activeExports instanceof Set) {
        activeExports = Array.from(dependency.activeExports);
      }

      var otherStarExports = dependency.otherStarExports;
      if (Array.isArray(otherStarExports)) {
        otherStarExports = otherStarExports.map(dep => freeze('Dependency', null, dep, extra));
      }

      return {
        type: 'HarmonyExportImportedSpecifierDependency',
        importDependency: freeze('Dependency', null, dependency.importDependency, extra),
        id: dependency.id,
        name: dependency.name,
        importedVar: dependency.importedVar,
        activeExports: activeExports,
        otherStarExports: otherStarExports
      };
    }
    else if (dependency instanceof HarmonyImportSpecifierDependency) {
      return {
        type: 'HarmonyImportSpecifierDependency',
        importDependency: freeze('Dependency', null, dependency.importDependency, extra),
        importedVar: dependency.importedVar,
        id: dependency.id,
        name: dependency.name,
        range: dependency.range,
        strictExportPresence: dependency.strictExportPresence,
      };
    }
    else if (dependency instanceof HarmonyCompatibilityDependency) {
      return {
        type: 'HarmonyCompatibilityDependency',
      };
    }
    else if (dependency instanceof HarmonyExportExpressionDependency) {
      return {
        type: 'HarmonyExportExpressionDependency',
        range: dependency.range,
        rangeStatement: dependency.rangeStatement,
      };
    }
    else if (dependency instanceof HarmonyExportSpecifierDependency) {
      return {
        type: 'HarmonyExportSpecifierDependency',
        id: dependency.id,
        name: dependency.name,
        position: dependency.position,
        immutable: dependency.immutable,
      };
    }
    else if (dependency instanceof HarmonyExportHeaderDependency) {
      return {
        type: 'HarmonyExportHeaderDependency',
        range: dependency.range,
        rangeStatement: dependency.rangeStatement,
      };
    }

    return frozen;
  });

  pluginCompat.tap(compiler, '_hardSourceThawDependency', 'HardHarmonyDependencyPlugin', function(dependency, frozen, extra) {
    var parent = extra.parent;
    var state = extra.state;

    if (frozen.type === 'HarmonyExportExpressionDependency') {
      return new HardHarmonyExportExpressionDependency(
        parent,
        frozen.range,
        frozen.rangeStatement
      );
    }
    else if (frozen.type === 'HarmonyExportSpecifierDependency') {
      return new HardHarmonyExportSpecifierDependency(
        parent,
        frozen.id,
        frozen.name,
        frozen.position,
        frozen.immutable
      );
    }
    else if (frozen.type === 'HarmonyExportHeaderDependency') {
      return new HardHarmonyExportHeaderDependency(
        frozen.range,
        frozen.rangeStatement
      );
    }
    else if (frozen.type === 'HarmonyImportDependency') {
      var ref = frozen.request + frozen.importedVar;
      if (state.imports[ref]) {
        return state.imports[ref];
      }
      return state.imports[ref] =
        new HardHarmonyImportDependency(
          frozen.request,
          frozen.importedVar,
          frozen.range
        );
    }
    else if (frozen.type === 'HarmonyImportSpecifierDependency') {
      return new HardHarmonyImportSpecifierDependency(
        thaw('Dependency', null, frozen.importDependency, extra),
        frozen.importedVar,
        frozen.id,
        frozen.name,
        frozen.range,
        frozen.strictExportPresence
      );
    }
    else if (frozen.type === 'HarmonyExportImportedSpecifierDependency') {
      var activeExports = frozen.activeExports;
      if (!!Set && Array.isArray(activeExports)) {
        activeExports = new Set(activeExports);
      }

      var otherStarExports = frozen.otherStarExports;
      if (Array.isArray(otherStarExports)) {
        otherStarExports = otherStarExports.map(dep => thaw('Dependency', null, dep, extra));
      }

      return new HardHarmonyExportImportedSpecifierDependency(
        parent,
        thaw('Dependency', null, frozen.importDependency, extra),
        frozen.importedVar,
        frozen.id,
        frozen.name,
        activeExports,
        otherStarExports
      );
    }
    else if (frozen.type === 'HarmonyCompatibilityDependency') {
      return new HardHarmonyCompatibilityDependency(parent);
    }

    return dependency;
  });
};

module.exports = HardHarmonyDependencyPlugin;
