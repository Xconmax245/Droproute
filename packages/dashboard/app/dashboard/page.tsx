import { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:8787';

async function getApps() {
  try {
    const res = await fetch(`${SERVER_URL}/api/apps`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.apps ?? [];
  } catch {
    return [];
  }
}

async function getScores(appId: string) {
  try {
    const res = await fetch(`${SERVER_URL}/api/scores?appId=${appId}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.scores ?? [];
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: 'DropRoute Dashboard',
  description: 'Live referral attribution dashboard',
};

export default async function DashboardPage() {
  const apps = await getApps();

  if (apps.length === 0) {
    return (
      <main className="page-shell">
        <nav className="nav-bar">
          <a href="/" className="wordmark" style={{ textDecoration: 'none' }}>
            dr<span className="wordmark-dot" />proute
          </a>
        </nav>

        <div style={{ paddingTop: '120px', paddingBottom: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="empty-state-card" style={{ maxWidth: '480px' }}>
            <div className="fanned-chips">
              <span className="chip">iOS</span>
              <span className="chip">Android</span>
              <span className="chip">Web</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '18px', color: 'var(--ink)' }}>
              No apps registered yet
            </h2>
            <p className="body-text">
              Run the command below, then open a generated referral link on a device.
            </p>
            <div className="command-chip">
              <span>node packages/cli/dist/index.js inject</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const app = apps[0];
  const scores = await getScores(app.id);

  return (
    <main>
      <DashboardClient
        appId={app.id}
        initialScores={scores}
        initialEvents={[]}
      />
    </main>
  );
}
