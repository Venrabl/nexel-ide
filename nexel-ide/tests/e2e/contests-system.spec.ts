import { test, expect } from '@playwright/test';

test.describe('Contests System E2E Workflow (New User/No Credentials)', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock nexelAPI with no saved credentials (clean environment)
    await page.addInitScript(() => {
      const mockStore = new Map<string, any>();

      (window as any).nexelAPI = {
        minimizeWindow: () => {},
        maximizeWindow: () => {},
        closeWindow: () => {},
        openWorkspaceDir: async () => 'C:/mock-workspace',
        readWorkspaceFiles: async () => [],
        createFile: async (parentPath: string, fileName: string) => `${parentPath}/${fileName}`,
        createFolder: async (parentPath: string, folderName: string) => `${parentPath}/${folderName}`,
        renameNode: async (oldPath: string, newPath: string) => newPath,
        deleteNode: async () => true,
        readFileContent: async () => '',
        writeFileContent: async () => true,
        createTerminal: async () => true,
        writeTerminal: () => {},
        resizeTerminal: () => {},
        onTerminalData: () => {},
        runJudge: async () => [],
        fetchContests: async () => {
          return {
            active: [
              { id: 100, name: 'Mock Active Contest', type: 'CF', phase: 'CODING', durationSeconds: 7200, startTimeSeconds: Date.now() / 1000 }
            ],
            upcoming: [
              { id: 101, name: 'Mock Upcoming Contest', type: 'CF', phase: 'BEFORE', durationSeconds: 7200, startTimeSeconds: Date.now() / 1000 + 3600 }
            ],
            passed: [
              { id: 99, name: 'Mock Finished Contest', type: 'CF', phase: 'FINISHED', durationSeconds: 7200, startTimeSeconds: Date.now() / 1000 - 7200 }
            ]
          };
        },
        fetchContestProblems: async (contestId: number | string) => {
          return {
            A: { index: 'A', title: 'Mock Problem A', url: 'https://codeforces.com/contest/99/problem/A', timeLimit: '1.0s', memoryLimit: '256MB', statement: '<p>Problem statement text</p>' },
            B: { index: 'B', title: 'Mock Problem B', url: 'https://codeforces.com/contest/99/problem/B', timeLimit: '2.0s', memoryLimit: '512MB', statement: '<p>Problem statement text B</p>' }
          };
        },
        // Ensure no username, password, or cookies are stored/retrieved
        getStoreSync: (key: string) => {
          if (key === 'cf_username' || key === 'cf_password' || key === 'cookies') {
            return null; // Force empty credential state
          }
          return mockStore.get(key) || null;
        },
        setStoreSync: (key: string, value: any) => {
          mockStore.set(key, value);
        },
        deleteStoreSync: (key: string) => {
          mockStore.delete(key);
        }
      };
    });

    await page.goto('/');
  });

  test('New user without CF credentials can browse contests, open past contests, and open problems in Editor', async ({ page }) => {
    // 1. Click on Codeforces Contests in NavDock (third item)
    const contestsNavItem = page.locator('.nd-item-row').nth(2);
    await expect(contestsNavItem).toBeVisible();
    await contestsNavItem.click();

    // 2. Verify title "CODEFORCES CONTESTS" is visible
    const systemTitle = page.locator('.nx-contests-title');
    await expect(systemTitle).toBeVisible();
    await expect(systemTitle).toHaveText('CODEFORCES CONTESTS');

    // 3. Verify Mock Finished Contest card is visible in the recent past contests list
    const passedContestCard = page.locator('.passed-card').first();
    await expect(passedContestCard).toBeVisible();
    await expect(passedContestCard.locator('.nx-contest-name')).toHaveText('Mock Finished Contest');

    // 4. Click the finished contest to load its problems
    await passedContestCard.click();

    // 5. Verify the problem card list is fetched and populated
    const problemHeader = page.locator('.nx-section-title', { hasText: 'CONTEST PROBLEMS' });
    await expect(problemHeader).toBeVisible();

    const firstProblemCard = page.locator('.nx-problem-row-card').first();
    await expect(firstProblemCard).toBeVisible();
    await expect(firstProblemCard.locator('.nx-problem-row-index')).toHaveText('A');

    // 6. Click on problem A to open it in a tab
    await firstProblemCard.click();

    // 7. Verify the editor tab has opened with problem "CF 99A"
    const activeTab = page.locator('.nx-editor-tab.active');
    await expect(activeTab).toBeVisible();
    await expect(activeTab.locator('.nx-tab-title')).toHaveText('CF 99A');

    // Verify the Problem Viewer statement is visible in the editor area
    const problemTitle = page.locator('.nx-cf-problem-title');
    await expect(problemTitle).toBeVisible();
    await expect(problemTitle).toHaveText('A. Mock Problem A');
  });
});
