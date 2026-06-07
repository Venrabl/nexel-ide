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

const { JudgeService } = require('../src/main/services/JudgeService.ts');

app.whenReady().then(async () => {
  try {
    console.log("Initializing JudgeService...");
    const judgeService = new JudgeService();
    
    const pyPath = path.resolve(__dirname, 'dummy.py');
    const testCases = [
      { id: 1, input: "hello sandbox", expected: "Echo: hello sandbox" },
      { id: 2, input: "fail test", expected: "Echo: expect fail match" }
    ];
    
    console.log("Running Python execution via LocalSandboxExecutor...");
    const results = await judgeService.run(pyPath, testCases, 2000, 256);
    console.log("Results:\n", JSON.stringify(results, null, 2));
    
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    app.quit();
  }
});
