import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { electronStorage } from './electronStorage';

export interface TestCase {
  id: number;
  name: string;
  input: string;
  expected: string;
  actual: string;
  verdict?: 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'RUNNING' | 'IDLE';
  time?: number;
  memory?: number;
  exitCode?: number | null;
  errorMsg?: string;
}

interface JudgeState {
  testCases: TestCase[];
  activeTCId: number;
  activeTab: 'input' | 'expected' | 'actual' | 'diff';
  isRunning: boolean;
  
  addTestCase: () => void;
  deleteTestCase: (id: number) => void;
  updateTestCase: (id: number, fields: Partial<TestCase>) => void;
  setTestCases: (testCases: TestCase[]) => void;
  setActiveTCId: (id: number) => void;
  setActiveTab: (tab: 'input' | 'expected' | 'actual' | 'diff') => void;
  setRunning: (running: boolean) => void;
  importSamples: (samples: Array<{ input: string; output: string }>) => void;
}

const defaultTestCases: TestCase[] = [
  { id: 1, name: 'TC 1', input: '', expected: '', actual: '', verdict: 'IDLE' }
];

export const useJudgeStore = create<JudgeState>()(
  persist(
    (set, get) => ({
      testCases: defaultTestCases,
      activeTCId: 1,
      activeTab: 'input',
      isRunning: false,

      addTestCase: () => {
        const { testCases } = get();
        const nextId = testCases.length > 0 ? Math.max(...testCases.map((tc) => tc.id)) + 1 : 1;
        const newTC: TestCase = {
          id: nextId,
          name: `TC ${nextId}`,
          input: '',
          expected: '',
          actual: '',
          verdict: 'IDLE',
        };
        set({
          testCases: [...testCases, newTC],
          activeTCId: nextId,
        });
      },

      deleteTestCase: (idToDelete) => {
        const { testCases, activeTCId } = get();
        if (testCases.length <= 1) {
          alert("At least one testcase must remain.");
          return;
        }
        const updated = testCases.filter((tc) => tc.id !== idToDelete);
        let nextActiveId = activeTCId;
        if (activeTCId === idToDelete) {
          nextActiveId = updated[0].id;
        }
        set({
          testCases: updated,
          activeTCId: nextActiveId,
        });
      },

      updateTestCase: (id, fields) => {
        const { testCases } = get();
        set({
          testCases: testCases.map((tc) =>
            tc.id === id ? { ...tc, ...fields } : tc
          ),
        });
      },

      setTestCases: (testCases) => set({ testCases }),

      setActiveTCId: (activeTCId) => set({ activeTCId }),

      setActiveTab: (activeTab) => set({ activeTab }),

      setRunning: (isRunning) => set({ isRunning }),

      importSamples: (samples) => {
        const mapped: TestCase[] = samples.map((tc, idx) => ({
          id: idx + 1,
          name: `TC ${idx + 1}`,
          input: tc.input,
          expected: tc.output,
          actual: '',
          verdict: 'IDLE',
        }));
        set({
          testCases: mapped,
          activeTCId: 1,
          activeTab: 'input',
        });
      },
    }),
    {
      name: 'nexel-judge-store',
      storage: createJSONStorage(() => electronStorage),
      partialize: (state) => ({
        testCases: state.testCases,
        activeTCId: state.activeTCId,
        activeTab: state.activeTab,
      }),
    }
  )
);
