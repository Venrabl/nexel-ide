import React, { useState } from 'react';
import './JudgeSystem.css';

interface TestCase {
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

interface JudgeSystemProps {
  activeFilePath?: string | null;
}

export const JudgeSystem: React.FC<JudgeSystemProps> = ({ activeFilePath }) => {
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: 1, name: 'TC 1', input: '', expected: '', actual: '', verdict: 'IDLE' },
  ]);
  const [activeTCId, setActiveTCId] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'input' | 'expected' | 'actual' | 'diff'>('input');
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const activeTC = testCases.find(tc => tc.id === activeTCId) || testCases[0];

  const handleAddTestCase = () => {
    const nextId = testCases.length > 0 ? Math.max(...testCases.map(tc => tc.id)) + 1 : 1;
    const newTC: TestCase = {
      id: nextId,
      name: `TC ${nextId}`,
      input: '',
      expected: '',
      actual: '',
      verdict: 'IDLE'
    };
    setTestCases([...testCases, newTC]);
    setActiveTCId(nextId);
  };

  const handleDeleteTestCase = (e: React.MouseEvent, idToDelete: number) => {
    e.stopPropagation();
    if (testCases.length <= 1) {
      alert("At least one testcase must remain.");
      return;
    }
    const updated = testCases.filter(tc => tc.id !== idToDelete);
    setTestCases(updated);
    if (activeTCId === idToDelete) {
      setActiveTCId(updated[0].id);
    }
  };

  const handleTextChange = (value: string) => {
    setTestCases(prev => prev.map(tc => 
      tc.id === activeTCId 
        ? { ...tc, [activeTab]: value }
        : tc
    ));
  };

  const handleRun = async () => {
    if (!activeFilePath) {
      alert("Please open a valid C++, Python, or Java source file in the editor first.");
      return;
    }

    setIsRunning(true);
    
    // Set all testcases to RUNNING state for visual cue animations
    setTestCases(prev => prev.map(tc => ({ ...tc, verdict: 'RUNNING', actual: '' })));

    try {
      // Map to safe backend array payload
      const payload = testCases.map(tc => ({
        id: tc.id,
        input: tc.input,
        expected: tc.expected
      }));

      // Call high-precision local sandbox judge engine
      const results = await window.nexelAPI.runJudge(activeFilePath, payload, 2000, 256);

      setTestCases(prev => prev.map(tc => {
        const res = results.find(r => r.id === tc.id);
        if (res) {
          return {
            ...tc,
            verdict: res.verdict,
            actual: res.actual,
            time: res.metrics.time,
            memory: res.metrics.memory,
            exitCode: res.metrics.exitCode,
            errorMsg: res.diff
          };
        }
        return tc;
      }));

      // Auto-switch to actual output tab to display results
      setActiveTab('actual');

    } catch (err: any) {
      console.error(err);
      setTestCases(prev => prev.map(tc => ({
        ...tc,
        verdict: 'RE',
        actual: err.message || 'Execution error'
      })));
    } finally {
      setIsRunning(false);
    }
  };

  const getVerdictLabel = (verdict?: string) => {
    if (!verdict || verdict === 'IDLE') return 'IDLE';
    if (verdict === 'RUNNING') return 'RUNNING';
    if (verdict === 'AC') return 'ACCEPTED (AC)';
    if (verdict === 'WA') return 'WRONG ANSWER (WA)';
    if (verdict === 'TLE') return 'TIME LIMIT EXCEEDED (TLE)';
    if (verdict === 'MLE') return 'MEMORY LIMIT EXCEEDED (MLE)';
    if (verdict === 'RE') return 'RUNTIME ERROR (RE)';
    return verdict;
  };

  return (
    <div className="nx-judge-wrapper">
      <div className="nx-judge-header">
        <span className="nx-judge-title">NEXEL JUDGE</span>
      </div>

      {/* Dynamic Testcase Pills Slider */}
      <div className="nx-judge-tcs-shelf">
        <div className="nx-judge-tcs-scroll">
          {testCases.map((tc) => {
            const isActive = tc.id === activeTCId;
            let statusClass = 'idle';
            if (tc.verdict === 'RUNNING') statusClass = 'running';
            else if (tc.verdict === 'AC') statusClass = 'passed';
            else if (tc.verdict && tc.verdict !== 'IDLE') statusClass = 'failed';

            return (
              <div 
                key={tc.id} 
                className={`nx-tc-pill ${isActive ? 'active' : ''} ${statusClass}`}
                onClick={() => setActiveTCId(tc.id)}
              >
                <span className="nx-tc-pill-name">{tc.name}</span>
                {tc.verdict && tc.verdict !== 'IDLE' && tc.verdict !== 'RUNNING' && (
                  <span className={`nx-tc-verdict-dot ${statusClass}`}>
                    {tc.verdict}
                  </span>
                )}
                <button 
                  className="nx-tc-pill-del" 
                  title="Delete Testcase"
                  onClick={(e) => handleDeleteTestCase(e, tc.id)}
                >
                  ×
                </button>
              </div>
            );
          })}
          <button 
            className="nx-tc-add-btn" 
            title="Add Testcase"
            onClick={handleAddTestCase}
            disabled={isRunning}
          >
            +
          </button>
        </div>
      </div>

      {/* Tabs Section: Input, Expected Output, Actual Output, Diff */}
      <div className="nx-judge-tabs">
        {([
          { key: 'input', label: 'Input' },
          { key: 'expected', label: 'Expected' },
          { key: 'actual', label: 'Actual' },
          { key: 'diff', label: 'Diff' }
        ] as const).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              className={`nx-judge-tab-pill ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Viewport content based on selected tab */}
      <div className="nx-judge-textbox-container">
        {activeTab === 'diff' ? (
          <div className="nx-judge-diff-viewer">
            <div className="nx-diff-hdr-row">
              <span className="nx-diff-column-hdr green">EXPECTED</span>
              <span className="nx-diff-column-hdr red">ACTUAL</span>
            </div>
            <div className="nx-diff-lines-container">
              {(() => {
                const expectedLines = (activeTC.expected || '').trim().split(/\r?\n/);
                const actualLines = (activeTC.actual || activeTC.errorMsg || '').trim().split(/\r?\n/);
                const maxLines = Math.max(expectedLines.length, actualLines.length);
                
                if (maxLines === 0 || (!activeTC.expected && !activeTC.actual && !activeTC.errorMsg)) {
                  return <div className="nx-diff-empty">No execution data to compare yet.</div>;
                }

                return Array.from({ length: maxLines }).map((_, i) => {
                  const expLine = expectedLines[i] !== undefined ? expectedLines[i] : '';
                  const actLine = actualLines[i] !== undefined ? actualLines[i] : '';
                  const isMatch = expLine.trimEnd() === actLine.trimEnd();
                  
                  return (
                    <div key={i} className={`nx-diff-line-row ${isMatch ? 'match' : 'mismatch'}`}>
                      <div className="nx-diff-cell expected-cell">
                        <span className="nx-line-num">{i + 1}</span>
                        <span className="nx-line-text">{expLine || ' '}</span>
                      </div>
                      <div className="nx-diff-cell actual-cell">
                        <span className="nx-line-num">{i + 1}</span>
                        <span className="nx-line-text">{actLine || ' '}</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <textarea
            className={`nx-judge-textarea ${
              activeTab === 'actual' && activeTC.verdict === 'AC' ? 'passed-area' : ''
            } ${
              activeTab === 'actual' && activeTC.verdict && activeTC.verdict !== 'AC' && activeTC.verdict !== 'IDLE' ? 'failed-area' : ''
            }`}
            value={activeTC ? (activeTC[activeTab as 'input' | 'expected' | 'actual'] || '') : ''}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={`Enter active testcase ${activeTab} data...`}
            disabled={activeTab === 'actual' || isRunning}
          />
        )}
      </div>

      {/* Run Section: Masterpiece Run Button & Execution Metrics side-by-side */}
      <div className="nx-judge-run-footer">
        <button 
          className={`nx-judge-run-btn ${isRunning ? 'running' : ''}`}
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? (
            <span className="nx-run-spinner" />
          ) : (
            <>
              <svg className="nx-run-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              RUN
            </>
          )}
        </button>

        <div className={`nx-judge-metrics-panel ${
          activeTC.verdict === 'AC' ? 'passed' : ''
        } ${
          activeTC.verdict && activeTC.verdict !== 'AC' && activeTC.verdict !== 'IDLE' && activeTC.verdict !== 'RUNNING' ? 'failed' : ''
        }`}>
          {activeTC.verdict === 'RUNNING' ? (
            <span className="nx-metric-chip running">RUNNING...</span>
          ) : (
            <>
              <div className="nx-metric-chip" title="CPU Execution Time">
                {activeTC.time !== undefined ? `${activeTC.time}ms` : '--'}
              </div>
              <div className="nx-metric-divider">│</div>
              <div className="nx-metric-chip" title="Peak Resident Memory">
                {activeTC.memory !== undefined ? `${activeTC.memory}MB` : '--'}
              </div>
              <div className="nx-metric-divider">│</div>
              <div className={`nx-metric-chip verdict-chip ${
                activeTC.verdict === 'AC' ? 'passed' : ''
              } ${
                activeTC.verdict && activeTC.verdict !== 'AC' && activeTC.verdict !== 'IDLE' ? 'failed' : ''
              }`} title={getVerdictLabel(activeTC.verdict)}>
                {activeTC.verdict || 'IDLE'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default JudgeSystem;
