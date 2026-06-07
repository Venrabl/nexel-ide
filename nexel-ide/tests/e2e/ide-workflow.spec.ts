import { test, expect } from '@playwright/test';

test.describe('Happy Path: Create File, Edit, and Run Judge', () => {
  test.beforeEach(async ({ page }) => {
    // Inject a robust mock nexelAPI into the window before page loads
    await page.addInitScript(() => {
      const files: any[] = [
        {
          name: 'src',
          path: 'C:/mock-workspace/src',
          type: 'folder',
          children: []
        }
      ];

      (window as any).nexelAPI = {
        minimizeWindow: () => {},
        maximizeWindow: () => {},
        closeWindow: () => {},
        openWorkspaceDir: async () => 'C:/mock-workspace',
        readWorkspaceFiles: async (dirPath: string) => {
          return files;
        },
        createFile: async (parentPath: string, fileName: string) => {
          const newPath = `${parentPath}/${fileName}`;
          files.push({ name: fileName, path: newPath, type: 'file' });
          return newPath;
        },
        createFolder: async (parentPath: string, folderName: string) => {
          const newPath = `${parentPath}/${folderName}`;
          files.push({ name: folderName, path: newPath, type: 'folder', children: [] });
          return newPath;
        },
        renameNode: async (oldPath: string, newPath: string) => newPath,
        deleteNode: async () => true,
        readFileContent: async (filePath: string) => {
          return '';
        },
        writeFileContent: async (filePath: string, content: string) => {
          const file = files.find(f => f.path === filePath);
          if (file) {
            file.content = content;
          }
          return true;
        },
        createTerminal: async () => true,
        writeTerminal: () => {},
        resizeTerminal: () => {},
        onTerminalData: () => {},
        runJudge: async (filePath: string, testCases: any[], timeLimit?: number, memoryLimit?: number) => {
          return testCases.map(tc => ({
            id: tc.id,
            verdict: 'AC',
            metrics: { time: 42, memory: 1.2, exitCode: 0 },
            actual: tc.expected,
            expected: tc.expected,
            passed: true,
            diff: ''
          }));
        },
        fetchContests: async () => ({
          active: [],
          upcoming: [],
          passed: []
        }),
        fetchContestProblems: async () => ({}),
        getStoreSync: (key: string) => {
          if (key.includes('workspace')) return 'C:/mock-workspace';
          return null;
        },
        setStoreSync: () => {},
        deleteStoreSync: () => {},
      };
    });

    await page.goto('/');
  });

  test('Create file, edit code, and successfully run judge', async ({ page }) => {
    // 1. Open Workspace Folder
    const openFolderBtn = page.locator('.nx-open-prompt-btn');
    await expect(openFolderBtn).toBeVisible();
    await openFolderBtn.click();

    // Verify workspace is opened (Explorer header updates or Open Folder button disappears)
    await expect(openFolderBtn).not.toBeVisible();

    // 2. Click "New File" button in explorer header
    const newFileBtn = page.locator('button.nx-action-btn[title="New File"]');
    await expect(newFileBtn).toBeVisible();
    await newFileBtn.click();

    // 3. Name the file test.cpp
    const inlineInput = page.locator('input.nx-inline-textbox');
    await expect(inlineInput).toBeVisible();
    await inlineInput.fill('test.cpp');
    await inlineInput.press('Enter');

    // Verify test.cpp appears in the sidebar explorer tree
    const fileRow = page.locator('.nx-node-row', { hasText: 'test.cpp' });
    await expect(fileRow).toBeVisible();

    // 4. Click test.cpp to open in Monaco Editor
    await fileRow.click();

    // Wait for Monaco Editor to mount and be visible
    const monaco = page.locator('.monaco-editor');
    await expect(monaco).toBeVisible();

    // Focus Monaco editor and insert code
    const monacoContainer = page.locator('.monaco-editor').first();
    await monacoContainer.click();
    await page.keyboard.insertText('#include <iostream>\nint main() { std::cout << "Hello"; return 0; }');

    // 5. Switch to Judge tab using the NavDock
    // The Judge icon/row is the second element in the navigation dock
    const judgeNavItem = page.locator('.nd-item-row').nth(1);
    await judgeNavItem.click();

    // Verify Judge System view is visible
    const judgeSystemTitle = page.locator('.nx-judge-title');
    await expect(judgeSystemTitle).toBeVisible();

    // 6. Add a testcase
    const addTcBtn = page.locator('button.nx-tc-add-btn');
    await addTcBtn.click();

    // Verify a testcase is added (tc pill is visible)
    const tcPill = page.locator('.nx-tc-pill').first();
    await expect(tcPill).toBeVisible();

    // Enter Input test data
    const inputTabBtn = page.locator('button.nx-judge-tab-pill', { hasText: 'Input' });
    await inputTabBtn.click();
    const judgeTextArea = page.locator('textarea.nx-judge-textarea');
    await judgeTextArea.fill('hello-input');

    // Enter Expected output test data
    const expectedTabBtn = page.locator('button.nx-judge-tab-pill', { hasText: 'Expected' });
    await expectedTabBtn.click();
    await judgeTextArea.fill('hello-output');

    // 7. Click RUN
    const runBtn = page.locator('button.nx-judge-run-btn');
    await runBtn.click();

    // 8. Assert that the metrics panel shows AC
    const verdictChip = page.locator('.nx-judge-metrics-panel .verdict-chip');
    await expect(verdictChip).toHaveText('AC');

    // Assert that the .ac-celebrate-glow animation class is applied to the editor canvas
    const editorCanvas = page.locator('.nx-editor-canvas');
    await expect(editorCanvas).toHaveClass(/ac-celebrate-glow/);
  });
});
