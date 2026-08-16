import { redirect } from 'next/navigation';

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

export default async function HomePage() {
  const apps = await getApps();

  // If only one app, redirect directly to its dashboard
  if (apps.length === 1) {
    redirect(`/${apps[0].id}`);
  }

  return (
    <main className="page-shell">
      <nav className="nav-bar">
        <span className="wordmark">
          dr<span className="wordmark-dot" />proute
        </span>
      </nav>

      <div style={{ paddingTop: '120px', paddingBottom: '120px' }}>
        <p className="section-label" style={{ marginBottom: '16px' }}>
          Select an app
        </p>
        <h1 className="display-headline" style={{ marginBottom: '48px' }}>
          Your <span className="accent-word">apps</span>
        </h1>

        {apps.length === 0 ? (
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
              <span>npx droproute inject</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', maxWidth: '800px' }}>
            {apps.map((app: any) => (
              <a
                key={app.id}
                href={`/${app.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.15s ease', }}>
                  <p className="section-label" style={{ marginBottom: '8px' }}>{app.scheme}://</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '18px', color: 'var(--ink)' }}>
                    {app.name}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
