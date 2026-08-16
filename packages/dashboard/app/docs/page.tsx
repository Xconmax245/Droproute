'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function DocsPage() {
  return (
    <main className="page-shell">
      <nav className="nav-bar">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span className="wordmark">
            dr<span className="wordmark-dot" />proute
          </span>
        </Link>
        <div className="nav-links">
          <Link href="/docs" className="nav-link" style={{ color: 'var(--ink)' }}>Docs</Link>
          <Link href="/pricing" className="nav-link">Pricing</Link>
        </div>
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <motion.span 
            className="status-pill" 
            style={{ cursor: 'pointer' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            View Dashboard →
          </motion.span>
        </Link>
      </nav>

      <section style={{ paddingTop: '80px', paddingBottom: '120px' }} data-aos="fade-up">
        <h1 className="display-headline" style={{ marginBottom: '32px' }}>
          Documentation
        </h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '64px' }}>
          <aside style={{ borderRight: '1px solid var(--border)', paddingRight: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, marginBottom: '16px' }}>Getting Started</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li><a href="#installation" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Installation</a></li>
              <li><a href="#dashboard" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>Dashboard</a></li>
              <li><a href="#events" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>Events</a></li>
            </ul>
          </aside>
          
          <article className="body-text">
            <h2 id="installation" style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '24px', color: 'var(--ink)', marginBottom: '16px' }}>Installation</h2>
            <p style={{ marginBottom: '16px' }}>
              DropRoute works by automatically injecting referral tracking code directly into your Expo Router application using an AST transformation.
            </p>
            <p style={{ marginBottom: '24px' }}>
              To get started, navigate to your Expo project directory and run:
            </p>
            
            <div className="command-chip" style={{ marginBottom: '48px', display: 'flex' }}>
              <span>npx droproute inject</span>
            </div>

            <h2 id="dashboard" style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '24px', color: 'var(--ink)', marginBottom: '16px' }}>Viewing the Dashboard</h2>
            <p style={{ marginBottom: '16px' }}>
              Once the injection is complete, simply start your Expo app and run a referral link on your device. The dashboard will automatically reflect the events sent from your app.
            </p>
            <p>
              Navigate to `/dashboard` to view the live conversion rates of all your acquisition sources.
            </p>
          </article>
        </div>
      </section>

      <footer className="footer-row">
        <div className="footer-left">
          <span className="wordmark" style={{ fontSize: '16px' }}>
            dr<span className="wordmark-dot" style={{ width: '6px', height: '6px' }} />proute
          </span>
          <span className="footer-license">MIT License</span>
        </div>
      </footer>
    </main>
  );
}
