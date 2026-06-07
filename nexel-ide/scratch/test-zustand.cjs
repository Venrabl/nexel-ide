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

// Mock the window.nexelAPI environment for our store files to run in Node
const { StoreService } = require('../src/main/services/StoreService.ts');
const storeService = new StoreService();

app.whenReady().then(async () => {
  try {
    await storeService.initialize();

    // Mock window global
    global.window = {
      nexelAPI: {
        getStoreSync: (key) => storeService.getSync(key),
        setStoreSync: (key, val) => storeService.setSync(key, val),
        deleteStoreSync: (key) => storeService.deleteSync(key)
      }
    };

    // Load useEditorStore
    const { useEditorStore } = require('../src/stores/useEditorStore.ts');

    console.log("Initial state of cppTemplate in useEditorStore:", JSON.stringify(useEditorStore.getState().cppTemplate));

    console.log("Setting template in useEditorStore to a new value...");
    useEditorStore.getState().setCppTemplate("#include <iostream>\nint main() {}");

    console.log("Current state of cppTemplate in useEditorStore:", JSON.stringify(useEditorStore.getState().cppTemplate));

    // Retrieve directly from the electron-store file
    const diskData = storeService.getSync('nexel-editor-store');
    console.log("On-disk electron-store representation:", JSON.stringify(diskData, null, 2));

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    app.quit();
  }
});
