import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:8787';

async function getApp(appId: string) {
  try {
    const res = await fetch(`${SERVER_URL}/api/apps`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.apps ?? []).find((a: any) => a.id === appId) ?? null;
  } catch {
    return null;
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

export async function generateMetadata({ params }: { params: Promise<{ appId: string }> }): Promise<Metadata> {
  const { appId } = await params;
  const app = await getApp(appId);
  return {
    title: app ? `${app.name} — DropRoute` : 'DropRoute Dashboard',
    description: 'Live referral attribution dashboard',
  };
}

export default async function AppDashboardPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const app = await getApp(appId);

  if (!app) {
    notFound();
  }

  const scores = await getScores(appId);

  return (
    <main>
      <DashboardClient
        appId={appId}
        initialScores={scores}
        initialEvents={[]}
      />
    </main>
  );
}
