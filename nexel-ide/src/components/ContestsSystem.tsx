import React, { useState, useEffect } from 'react';
import './ContestsSystem.css';

interface Contest {
  id: number;
  name: string;
  type: string;
  phase: 'BEFORE' | 'CODING' | 'FINISHED' | 'PENDING_SYSTEM_TEST' | 'SYSTEM_TEST';
  durationSeconds: number;
  startTimeSeconds: number;
  relativeTimeSeconds?: number;
}

interface CategorizedContests {
  active: Contest[];
  upcoming: Contest[];
  passed: Contest[];
}

export const ContestsSystem: React.FC = () => {
  const [contests, setContests] = useState<CategorizedContests | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // States for viewing a specific contest's problems
  const [selectedContest, setSelectedContest] = useState<{ id: number; name: string } | null>(null);
  const [problems, setProblems] = useState<any[] | null>(null);
  const [problemsLoading, setProblemsLoading] = useState<boolean>(false);

  // Custom fetch inputs
  const [customInput, setCustomInput] = useState<string>('');
  const [customLoading, setCustomLoading] = useState<boolean>(false);

  // Custom modal dialog states
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [problemCount, setProblemCount] = useState<string>('4');

  const handleCustomFetch = async () => {
    const raw = customInput.trim();
    if (!raw) return;

    // Matches contest ID followed optionally by problem index (e.g. 1981, 1981A, 1981/A, 1981 A)
    const match = raw.match(/^(\d+)(?:\s*[\/\s-]*\s*([A-Za-z0-9]+))?$/);
    if (!match) {
      alert("Invalid format! Please enter a valid Contest ID (e.g., 1981) or Problem (e.g., 1981A).");
      return;
    }

    const contestId = parseInt(match[1], 10);
    const problemIndex = match[2] ? match[2].toUpperCase() : null;

    setCustomLoading(true);
    setError(null);

    try {
      const data = await window.nexelAPI.fetchContestProblems(contestId);
      const arr = Object.values(data).sort((a: any, b: any) => a.index.localeCompare(b.index));
      
      setSelectedContest({ id: contestId, name: `Contest ${contestId}` });
      setProblems(arr);

      if (problemIndex) {
        const found = arr.find((p: any) => p.index.toUpperCase() === problemIndex) as any;
        if (found) {
          if (found.error) {
            alert(`Error fetching problem: ${found.error}`);
          } else {
            window.dispatchEvent(new CustomEvent('nx-open-cf-problem', { 
              detail: { contestId, problem: found } 
            }));
          }
        } else {
          alert(`Problem ${problemIndex} not found in contest ${contestId}. Available problems: ${arr.map((p: any) => p.index).join(', ')}`);
        }
      }
      setCustomInput('');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to fetch custom resource: ${err.message || 'Unknown error'}`);
    } finally {
      setCustomLoading(false);
    }
  };

  const handleOpenToFolder = () => {
    if (!selectedContest) return;
    const activeDir = localStorage.getItem('workspace-active-dir') || localStorage.getItem('workspace-root');
    if (!activeDir) {
      alert("No active workspace! Please open a workspace folder in the Explorer sidebar first.");
      return;
    }
    if (problems && problems.length > 0) {
      setProblemCount(problems.length.toString());
    } else {
      setProblemCount('4');
    }
    setShowPrompt(true);
  };

  const confirmOpenToFolder = async () => {
    setShowPrompt(false);
    if (!selectedContest) return;
    const activeDir = localStorage.getItem('workspace-active-dir') || localStorage.getItem('workspace-root');
    if (!activeDir) return;

    const count = parseInt(problemCount, 10);
    if (isNaN(count) || count <= 0 || count > 26) {
      alert("Please enter a valid number of problems (1 - 26).");
      return;
    }

    try {
      // Create folder for the contest, e.g. "2322"
      const contestFolderName = selectedContest.id.toString();
      const contestFolderPath = await window.nexelAPI.createFolder(activeDir, contestFolderName);

      // Read default C++ template
      const cppTemplate = localStorage.getItem('cpp-template') || '';

      // Generate A.cpp, B.cpp, C.cpp, D.cpp...
      for (let i = 0; i < count; i++) {
        const problemChar = String.fromCharCode(65 + i); // 'A' is 65
        const fileName = `${problemChar}.cpp`;
        const filePath = await window.nexelAPI.createFile(contestFolderPath, fileName);
        if (cppTemplate) {
          await window.nexelAPI.writeFileContent(filePath, cppTemplate);
        }
      }

      // Dispatch event to refresh file explorer tree
      window.dispatchEvent(new CustomEvent('nx-refresh-explorer'));

      alert(`Successfully created contest folder "${contestFolderName}" in the active folder with ${count} problems!`);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to create contest folder: ${err.message || 'Unknown error'}`);
    }
  };

  const fetchContestsList = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.nexelAPI.fetchContests();
      setContests(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch contests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContestsList();
  }, []);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (minutes === 0) return `${hours} hrs`;
    return `${hours}h ${minutes}m`;
  };

  const formatStartTime = (seconds: number) => {
    return new Date(seconds * 1000).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleContestClick = async (e: React.MouseEvent, contest: Contest) => {
    if (contest.phase === 'BEFORE') {
      // Allow default link opening for upcoming contests
      return;
    }

    e.preventDefault();
    setSelectedContest({ id: contest.id, name: contest.name });
    setProblemsLoading(true);
    setProblems(null);
    setError(null);
    try {
      const data = await window.nexelAPI.fetchContestProblems(contest.id);
      const arr = Object.values(data).sort((a: any, b: any) => a.index.localeCompare(b.index));
      setProblems(arr);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load contest problems.');
    } finally {
      setProblemsLoading(false);
    }
  };

  // Render detail view if a contest is selected
  if (selectedContest) {
    return (
      <div className="nx-contests-wrapper">
        <div className="nx-contests-header">
          <button 
            className="nx-contests-back-btn" 
            onClick={() => { setSelectedContest(null); setProblems(null); setError(null); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="nx-back-icon">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            BACK
          </button>
          <button className="nx-contests-folder-btn" onClick={handleOpenToFolder} title="Create folders for this contest in workspace">
            Open To Folder
          </button>
        </div>

        <div className="nx-contests-scroll-area">
          <div className="nx-contest-header-banner">
            <h3 className="nx-banner-name">{selectedContest.name}</h3>
          </div>

          {problemsLoading && (
            <div className="nx-contests-status-msg">
              <span className="nx-contests-loader" />
              <p>Fetching problems...</p>
            </div>
          )}

          {error && (
            <div className="nx-contests-status-msg error">
              <svg className="nx-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{error}</p>
              <button 
                className="nx-retry-btn" 
                onClick={() => {
                  setProblemsLoading(true);
                  setError(null);
                  window.nexelAPI.fetchContestProblems(selectedContest.id)
                    .then((data: any) => {
                      const arr = Object.values(data).sort((a: any, b: any) => a.index.localeCompare(b.index));
                      setProblems(arr);
                    })
                    .catch((err: any) => setError(err.message || 'Failed.'))
                    .finally(() => setProblemsLoading(false));
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!problemsLoading && problems && (
            <div className="nx-problems-list">
              <span className="nx-section-title">CONTEST PROBLEMS</span>
              <div className="nx-contests-cards-list">
                {problems.map((prob: any) => (
                  <div 
                    key={prob.index} 
                    className={`nx-problem-row-card ${prob.error ? 'error' : ''}`}
                    onClick={() => {
                      if (!prob.error) {
                        window.dispatchEvent(new CustomEvent('nx-open-cf-problem', { 
                          detail: { contestId: selectedContest.id, problem: prob } 
                        }));
                      }
                    }}
                  >
                    <div className="nx-problem-row-info">
                      <span className="nx-problem-row-index">{prob.index}</span>
                      <span className="nx-problem-row-title">{prob.title || prob.error || 'Problem Statement'}</span>
                    </div>
                    {!prob.error && (
                      <svg className="nx-problem-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showPrompt && (
          <div className="nx-prompt-modal-overlay">
            <div className="nx-prompt-modal">
              <h4 className="nx-prompt-title">Generate Folder</h4>
              <p className="nx-prompt-desc">
                Create folder <strong>{selectedContest.id}</strong> in workspace with template files?
              </p>
              <div className="nx-prompt-field">
                <label className="nx-prompt-label" htmlFor="nx-prob-count-input">Number of problems (1-26):</label>
                <input
                  id="nx-prob-count-input"
                  type="number"
                  min="1"
                  max="26"
                  value={problemCount}
                  onChange={(e) => setProblemCount(e.target.value)}
                  className="nx-prompt-input"
                />
              </div>
              <div className="nx-prompt-actions">
                <button className="nx-prompt-cancel-btn" onClick={() => setShowPrompt(false)}>
                  Cancel
                </button>
                <button className="nx-prompt-confirm-btn" onClick={confirmOpenToFolder}>
                  Generate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="nx-contests-wrapper">
      <div className="nx-contests-header">
        <span className="nx-contests-title">CODEFORCES CONTESTS</span>
        <button 
          className={`nx-contests-sync-btn ${loading ? 'syncing' : ''}`}
          onClick={fetchContestsList}
          disabled={loading}
          title="Sync Codeforces Contests"
        >
          <svg className="nx-sync-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.56-1.19" />
          </svg>
        </button>
      </div>

      <div className="nx-contests-custom-fetch">
        <input 
          type="text" 
          placeholder={customLoading ? "Importing..." : "Contest ID or Problem (e.g. 1981A)"}
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCustomFetch(); }}
          disabled={customLoading}
          className="nx-contests-custom-input"
        />
        <button 
          onClick={handleCustomFetch}
          disabled={!customInput.trim() || customLoading}
          className="nx-contests-custom-btn"
        >
          {customLoading ? <span className="nx-custom-spinner" /> : "Import"}
        </button>
      </div>

      <div className="nx-contests-scroll-area">
        {loading && !contests && (
          <div className="nx-contests-status-msg">
            <span className="nx-contests-loader" />
            <p>Fetching contests...</p>
          </div>
        )}

        {error && (
          <div className="nx-contests-status-msg error">
            <svg className="nx-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{error}</p>
            <button className="nx-retry-btn" onClick={fetchContestsList}>Retry</button>
          </div>
        )}

        {contests && (
          <div className="nx-contests-sections-stack">
            {/* Active section */}
            <div className="nx-contests-section">
              <div className="nx-contests-section-hdr">
                <span className="nx-section-badge active" />
                <span className="nx-section-title">ACTIVE NOW</span>
              </div>
              <div className="nx-contests-cards-list">
                {contests.active.length > 0 ? (
                  contests.active.map((contest) => (
                    <a 
                      key={contest.id}
                      className="nx-contest-card active-card"
                      href={`https://codeforces.com/contest/${contest.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleContestClick(e, contest)}
                    >
                      <div className="nx-contest-card-meta">
                        <span className="nx-contest-id">#{contest.id}</span>
                        <span className="nx-contest-duration">{formatDuration(contest.durationSeconds)}</span>
                      </div>
                      <h4 className="nx-contest-name">{contest.name}</h4>
                      <div className="nx-contest-status-line">
                        <span className="nx-pulse-dot" />
                        CODING NOW
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="nx-contest-empty-card">No contests active at the moment.</div>
                )}
              </div>
            </div>

            {/* Upcoming section */}
            <div className="nx-contests-section">
              <div className="nx-contests-section-hdr">
                <span className="nx-section-badge upcoming" />
                <span className="nx-section-title">UPCOMING CONTESTS</span>
              </div>
              <div className="nx-contests-cards-list">
                {contests.upcoming.length > 0 ? (
                  contests.upcoming.map((contest) => (
                    <a 
                      key={contest.id}
                      className="nx-contest-card upcoming-card"
                      href={`https://codeforces.com/contest/${contest.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleContestClick(e, contest)}
                    >
                      <div className="nx-contest-card-meta">
                        <span className="nx-contest-id">#{contest.id}</span>
                        <span className="nx-contest-duration">{formatDuration(contest.durationSeconds)}</span>
                      </div>
                      <h4 className="nx-contest-name">{contest.name}</h4>
                      <div className="nx-contest-time-info">
                        <svg className="nx-time-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{formatStartTime(contest.startTimeSeconds)}</span>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="nx-contest-empty-card">No upcoming contests scheduled.</div>
                )}
              </div>
            </div>

            {/* Passed section */}
            <div className="nx-contests-section">
              <div className="nx-contests-section-hdr">
                <span className="nx-section-badge passed" />
                <span className="nx-section-title">RECENT PAST CONTESTS</span>
              </div>
              <div className="nx-contests-cards-list">
                {contests.passed.length > 0 ? (
                  contests.passed.map((contest) => (
                    <a 
                      key={contest.id}
                      className="nx-contest-card passed-card"
                      href={`https://codeforces.com/contest/${contest.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleContestClick(e, contest)}
                    >
                      <div className="nx-contest-card-meta">
                        <span className="nx-contest-id">#{contest.id}</span>
                        <span className="nx-contest-duration">{formatDuration(contest.durationSeconds)}</span>
                      </div>
                      <h4 className="nx-contest-name">{contest.name}</h4>
                      <div className="nx-contest-status-line completed">
                        FINISHED
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="nx-contest-empty-card">No past contest data.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestsSystem;
