const fs = require('fs');
const Module = require('module');
const path = require('path');

let registered = false;

function ensureGlobalNodePath() {
  const globalNodeModules = path.resolve(process.execPath, '..', '..', 'lib', 'node_modules');
  if (!Module.globalPaths.includes(globalNodeModules)) {
    const currentNodePath = process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : [];
    currentNodePath.push(globalNodeModules);
    process.env.NODE_PATH = currentNodePath.join(path.delimiter);
    Module._initPaths();
  }
}

function registerTsTranspiler() {
  if (registered) return;

  ensureGlobalNodePath();
  let ts;
  try {
    ts = require('typescript');
  } catch (err) {
    throw new Error('TypeScript runtime support is unavailable; install ts-node and typescript');
  }
  const compilerOptions = {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    esModuleInterop: true,
    resolveJsonModule: true,
  };

  require.extensions['.ts'] = function registerTsExtension(module, filename) {
    const source = fs.readFileSync(filename, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions,
      fileName: filename,
    });
    module._compile(outputText, filename);
  };

  registered = true;
}

registerTsTranspiler();

module.exports = {
  registerTsTranspiler,
};
