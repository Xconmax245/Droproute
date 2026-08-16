'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface EventRow {
  id: string;
  event_name: string;
  source: string | null;
  code: string | null;
  created_at: string;
}

interface Score {
  source: string;
  installs: number;
  activations: number;
  activation_rate: number | null;
}

interface Props {
  appId: string;
  initialScores: Score[];
  initialEvents: EventRow[];
}

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:8787';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function eventDotClass(eventName: string): string {
  if (eventName === 'link_click') return 'event-dot link-click';
  if (eventName === 'app_open') return 'event-dot app-open';
  if (eventName === 'completed_onboarding') return 'event-dot completed-onboarding';
  return 'event-dot';
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M9 5V3.5A1.5 1.5 0 0 0 7.5 2H2.5A1.5 1.5 0 0 0 1 3.5v5A1.5 1.5 0 0 0 2.5 10H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}

export default function DashboardClient({ appId, initialScores, initialEvents }: Props) {
  const [events, setEvents] = useState<EventRow[]>(initialEvents);
  const [scores, setScores] = useState<Score[]>(initialScores);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const eventSource = useRef<EventSource | null>(null);

  const refreshScores = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/scores?appId=${appId}`);
      if (!res.ok) return;
      const data = await res.json();
      setScores(data.scores ?? []);
    } catch {}
  }, [appId]);

  // Load initial events for Judge Mode (mocking fetching seeded events from the DB)
  // Since our /api/scores brings seeded scores, we could optionally fetch seeded events.
  // For now, we will just let the scores update. Live events don't get seeded retroactively via SSE.
  // We'll rely on the real event feed, plus if Judge Mode is on, we'll just show the scores.

  useEffect(() => {
    setConnectionStatus('connecting');
    const es = new EventSource(`${SERVER_URL}/api/stream?appId=${appId}`);
    eventSource.current = es;

    es.onopen = () => setConnectionStatus('open');
    es.onerror = () => setConnectionStatus('closed');

    es.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      if (payload.type === 'connected') return;

      const newEvent: EventRow = {
        id: crypto.randomUUID(),
        event_name: payload.event_name,
        source: payload.source,
        code: payload.code,
        created_at: payload.created_at ?? new Date().toISOString(),
      };

      setEvents((prev) => [newEvent, ...prev].slice(0, 50));
      setEventCount((c) => c + 1);
      refreshScores();
    };

    return () => {
      es.close();
    };
  }, [appId, refreshScores]);

  const handleGenerateRecommendation = async () => {
    setAiLoading(true);
    setAiText(null);
    try {
      const res = await fetch(`${SERVER_URL}/api/recommendation?appId=${appId}`, {
        method: 'POST',
      });
      const data = await res.json();
      setAiText(data.text ?? 'No recommendation available.');
    } catch {
      setAiText('Failed to generate recommendation. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('npx droproute inject');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasData = events.length > 0 || scores.length > 0;

  return (
    <>
      {/* Nav */}
      <div className="page-shell">
        <nav className="nav-bar">
          <a href="/" className="wordmark">
            dr<span className="wordmark-dot" />proute
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className={`status-pill ${connectionStatus !== 'open' ? 'offline' : ''}`}>
              <span className={`live-dot ${connectionStatus !== 'open' ? 'offline' : ''}`} />
              {connectionStatus === 'open' 
                ? (eventCount > 0 ? `${eventCount} events` : 'Live')
                : (connectionStatus === 'connecting' ? 'Connecting...' : 'Offline')
              }
            </div>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="page-shell" style={{ paddingTop: '40px', paddingBottom: '80px' }}>

        {/* Empty state — only shown when no data and no judge mode seeded data */}
        {!hasData && !isJudgeMode && (
          <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'center' }}>
            <div className="empty-state-card" style={{ maxWidth: '520px' }}>
              <div className="fanned-chips" style={{ marginBottom: '8px' }}>
                <span className="chip">iOS</span>
                <span className="chip">Android</span>
                <span className="chip">Web</span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '18px', color: 'var(--ink)' }}>
                Waiting for your first event
              </h2>
              <p className="body-text" style={{ maxWidth: '380px' }}>
                Run the command below after{' '}
                <code style={{ fontFamily: 'monospace', background: 'var(--surface)', padding: '1px 5px', borderRadius: '4px' }}>
                  droproute inject
                </code>
                , then open a generated referral link on a device.
              </p>
              <button
                className="command-chip"
                onClick={handleCopy}
                id="copy-command-chip"
                title="Copy to clipboard"
              >
                <span>npx droproute inject</span>
                <span className="copy-btn">
                  {copied ? '✓' : <CopyIcon />}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Dashboard grid — shown when data exists or judge mode is on */}
        {(hasData || isJudgeMode) && (
          <div className="dashboard-grid">
            {/* Left column — leaderboard + AI */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Leaderboard */}
              <div>
                <div className="section-header">
                  <span className="section-title">Source Leaderboard</span>
                  <span className="section-label">by activation rate</span>
                </div>
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th style={{ textAlign: 'right' }}>Installs</th>
                        <th style={{ textAlign: 'right' }}>Activations</th>
                        <th style={{ textAlign: 'right' }}>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scores.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-muted)', fontWeight: 400, padding: '32px' }}>
                            No data yet
                          </td>
                        </tr>
                      )}
                      {scores.map((score, i) => (
                        <tr key={score.source} className={`rank-${i + 1}`}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {i === 0 && <span title="Rank 1">🥇</span>}
                              {i === 1 && <span title="Rank 2">🥈</span>}
                              {i === 2 && <span title="Rank 3">🥉</span>}
                              <span className="source-badge">{score.source}</span>
                            </div>
                          </td>
                          <td className="data-number" style={{ textAlign: 'right' }}>{score.installs}</td>
                          <td className="data-number" style={{ textAlign: 'right' }}>{score.activations}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="rate-bar-wrapper">
                              <div className="rate-bar">
                                <div
                                  className="rate-bar-fill"
                                  style={{ width: score.activation_rate !== null ? `${score.activation_rate * 100}%` : '0%' }}
                                />
                              </div>
                              <span className="data-number" style={{ width: '40px', textAlign: 'right' }}>
                                {score.activation_rate !== null
                                  ? `${(score.activation_rate * 100).toFixed(0)}%`
                                  : '—'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AI Recommendation */}
              <div className="ai-box">
                <p className="ai-label">AI RECOMMENDATION</p>
                {aiText ? (
                  <>
                    <p className="ai-text" style={{ marginBottom: '12px', color: 'var(--ink)' }}>{aiText}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--ink-muted)' }}>
                      Generated from live data · claude-opus-4-5
                    </p>
                  </>
                ) : (
                  <p className="body-text" style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--ink-muted)' }}>
                    {aiLoading ? 'Generating...' : 'Click to generate an insight from the current activation data.'}
                  </p>
                )}
                <button
                  id="generate-recommendation-btn"
                  className="btn-primary"
                  style={{ marginTop: '12px' }}
                  onClick={handleGenerateRecommendation}
                  disabled={aiLoading}
                >
                  <SparklesIcon />
                  {aiLoading ? 'Generating...' : 'Generate Recommendation'}
                </button>
              </div>
            </div>

            {/* Right column — live event feed */}
            <div>
              <div className="section-header">
                <span className="section-title">Live Events</span>
                <div className={`status-pill ${connectionStatus !== 'open' ? 'offline' : ''}`} style={{ fontSize: '11px', padding: '4px 10px' }}>
                  <span className={`live-dot ${connectionStatus !== 'open' ? 'offline' : ''}`} />
                  {connectionStatus === 'open' ? 'Live' : 'Offline'}
                </div>
              </div>
              <div className="data-table-wrapper">
                <div className="event-feed">
                  {events.length === 0 && (
                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '14px' }}>
                      No events yet — open a referral link on a device
                    </div>
                  )}
                  <AnimatePresence initial={false}>
                    {events.map((event) => (
                      <motion.div
                        key={event.id}
                        className="event-row"
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        layout
                      >
                        <span className={eventDotClass(event.event_name)} />
                        <span className="event-name">{event.event_name}</span>
                        {event.source && (
                          <span className="event-source">{event.source}</span>
                        )}
                        <span className="event-time">{formatTime(event.created_at)}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </>
  );
}
