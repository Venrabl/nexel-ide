const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const ts = require('typescript');

// Load typescript support
require.extensions['.ts'] = function (module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      inlineSourceMap: true,
    },
  });
  module._compile(result.outputText, filename);
};

const { StoreService } = require('../src/main/services/StoreService.ts');

app.whenReady().then(async () => {
  try {
    console.log("Initializing StoreService...");
    const storeService = new StoreService();
    await storeService.initialize();
    
    console.log("Writing dummy test data to nexel-editor-store...");
    storeService.setSync('nexel-editor-store', {
      state: {
        autoSave: true,
        cppTemplate: "template content from test",
        enableSnippets: true
      },
      version: 0
    });
    
    console.log("Reading dummy test data from nexel-editor-store...");
    const res = storeService.getSync('nexel-editor-store');
    console.log("Retrieved store data:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    app.quit();
  }
});
