'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('node packages/cli/dist/index.js inject');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="page-shell">
      {/* Nav bar */}
      <nav className="nav-bar">
        <span className="wordmark">
          dr<span className="wordmark-dot" />proute
        </span>
        <div className="nav-links">
          <a href="https://github.com/Xconmax245/Droproute" className="nav-link" target="_blank" rel="noopener noreferrer">GitHub</a>
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

      {/* Hero Section */}
      <section className="landing-hero" data-aos="fade-up" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '64px', gridTemplateColumns: '1fr' }}>
        <h1 className="display-headline" style={{ maxWidth: '900px', margin: '0 auto 24px' }}>
          The zero-config growth stack for <span className="accent-word">React Native.</span>
        </h1>
        <p className="hero-subhead" data-aos="fade-up" data-aos-delay="100" style={{ maxWidth: '680px', margin: '0 auto 40px', fontSize: '20px' }}>
          Stop wrestling with deep links, attribution SDKs, and manual referral logic. DropRoute injects source-aware onboarding and real-time tracking directly into your codebase with one command.
        </p>
        <div className="hero-cta-row" data-aos="fade-up" data-aos-delay="200" style={{ justifyContent: 'center' }}>
          <button className="btn-primary" onClick={handleCopy} style={{ fontSize: '18px', padding: '16px 32px' }}>
            <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>&gt;_</span>
            {copied ? '✓ Copied!' : 'node packages/cli/dist/index.js inject'}
          </button>
          <Link href="/dashboard" className="btn-secondary" style={{ fontSize: '18px', padding: '16px 32px' }}>
            Live Dashboard
          </Link>
        </div>
      </section>

      {/* Integration Logos */}
      <section className="logos-strip" data-aos="fade-up" style={{ textAlign: 'center', marginBottom: '120px', opacity: 0.6 }}>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px' }}>
          Built natively for the modern mobile stack
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-display)' }}>EXPO</span>
          <span style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'var(--font-body)' }}>React Native</span>
          <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-1px' }}>Supabase</span>
          <span style={{ fontSize: '24px', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Next.js</span>
        </div>
      </section>

      {/* Problem vs Solution */}
      <section className="vs-section" style={{ marginBottom: '120px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <motion.div className="card" data-aos="fade-right" style={{ background: 'rgba(255,255,255,0.4)' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--ink-muted)', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>The Old Way</h3>
            <p style={{ color: 'var(--ink-muted)', lineHeight: 1.6 }}>
              Spend weeks setting up Branch or AppsFlyer. Wrestle with Expo Linking configurations. Write custom React Context logic to parse referral codes on app launch. Guess which creators are actually driving installs instead of just clicks.
            </p>
          </motion.div>
          <motion.div className="card" data-aos="fade-left" style={{ border: '2px solid var(--accent)', background: 'white', boxShadow: '0 24px 48px rgba(34,197,94,0.1)' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--accent)', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>The DropRoute Way</h3>
            <p style={{ color: 'var(--ink)', lineHeight: 1.6, fontWeight: 500 }}>
              Run one CLI command. We securely parse your AST, inject the necessary hooks into your root layout, and immediately provision a live tracking dashboard. Total time: 14 seconds. Zero boilerplate.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Technical Authority / Terminal */}
      <section className="technical-section" data-aos="fade-up" style={{ marginBottom: '120px', textAlign: 'center' }}>
        <h2 className="display-headline" style={{ fontSize: '36px', marginBottom: '16px' }}>AST-driven injection.<br />Zero boilerplate.</h2>
        <p className="body-text" style={{ maxWidth: '600px', margin: '0 auto 48px' }}>
          You own the code. We don't hide behind a black-box SDK. The CLI writes standard React Native code directly into your layout so you can edit it.
        </p>
        <div className="terminal-card" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
          <div className="terminal-chrome">
            <div className="terminal-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="terminal-command">droproute inject --dry-run</div>
          </div>
          <div className="terminal-code">
            <div className="terminal-code-header">app/_layout.tsx</div>
            <div className="terminal-code-add">+ import {'{'} useDropRouteVariant {'}'} from '../lib/droproute/attribution';</div>
            <div className="terminal-code-add">+ import {'{'} useEffect {'}'} from 'react';</div>
            <div className="terminal-code-context">&nbsp;</div>
            <div className="terminal-code-context">&nbsp;&nbsp;export default function RootLayout() {'{'}</div>
            <div className="terminal-code-add">+ &nbsp;&nbsp;useEffect(() =&gt; {'{'} captureReferral(); reportEvent('app_open'); {'}'}, []);</div>
            <div className="terminal-code-context">&nbsp;&nbsp;&nbsp;&nbsp;return &lt;Stack /&gt;;</div>
            <div className="terminal-code-context">&nbsp;&nbsp;{'}'}</div>

            <div className="terminal-code-header">app/index.tsx</div>
            <div className="terminal-code-add">+ const {'{'} headline, cta {'}'} = useDropRouteVariant();</div>
            <div className="terminal-code-remove">- &lt;Text&gt;Welcome to the app&lt;/Text&gt;</div>
            <div className="terminal-code-add">+ &lt;Text&gt;{'{'}headline{'}'}&lt;/Text&gt;</div>
          </div>
        </div>
      </section>

      {/* Value Props / Bento Box */}
      <section className="how-it-works-grid" style={{ marginBottom: '120px' }}>
        <motion.div className="step-col" data-aos="fade-up" whileHover={{ y: -5 }} style={{ background: 'white', padding: '40px 32px', borderRadius: '32px', border: '1px solid var(--border)' }}>
          <div className="step-badge" style={{ marginBottom: '24px', background: 'rgba(34,197,94,0.1)', color: 'var(--accent)' }}>✦</div>
          <div className="step-title" style={{ fontSize: '24px' }}>Source-Aware Onboarding</div>
          <div className="step-desc" style={{ marginTop: '12px', fontSize: '16px' }}>Your app reads the referral source on first launch and dynamically changes the UI (e.g., "Welcome ProductHunt users!") to maximize conversion.</div>
        </motion.div>
        <motion.div className="step-col" data-aos="fade-up" data-aos-delay="100" whileHover={{ y: -5 }} style={{ background: 'white', padding: '40px 32px', borderRadius: '32px', border: '1px solid var(--border)' }}>
          <div className="step-badge" style={{ marginBottom: '24px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>⚡</div>
          <div className="step-title" style={{ fontSize: '24px' }}>Real-time Attribution</div>
          <div className="step-desc" style={{ marginTop: '12px', fontSize: '16px' }}>Stop flying blind. Your dashboard ranks which channels, creators, or ads actually result in app activations—not just clicks.</div>
        </motion.div>
        <motion.div className="step-col" data-aos="fade-up" data-aos-delay="200" whileHover={{ y: -5 }} style={{ background: 'white', padding: '40px 32px', borderRadius: '32px', border: '1px solid var(--border)' }}>
          <div className="step-badge" style={{ marginBottom: '24px', background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>🛡️</div>
          <div className="step-title" style={{ fontSize: '24px' }}>Privacy First & Native</div>
          <div className="step-desc" style={{ marginTop: '12px', fontSize: '16px' }}>No bloated SDKs. We generate clean, auditable React Native code right in your repository. You maintain total ownership.</div>
        </motion.div>
      </section>


      {/* FAQ Accordion */}
      <section className="faq-section" data-aos="fade-up" style={{ marginBottom: '80px' }}>
        <h2 className="faq-title">Frequently Asked Questions</h2>
        <details className="faq-item" open>
          <summary>Does this actually edit my code?</summary>
          <div className="faq-content">
            Yes. DropRoute uses AST transformations (via ts-morph) to parse your Expo Router files, locate your root layout and main screens, and inject the necessary hooks. It never uses regex or string replacement — only semantic, inspectable AST edits.
          </div>
        </details>
        <details className="faq-item">
          <summary>Can I see what it will do before committing?</summary>
          <div className="faq-content">
            Run <code>node packages/cli/dist/index.js inject --dry-run</code> to see a full diff of every change before a single file is written. You are always in control.
          </div>
        </details>
        <details className="faq-item">
          <summary>Can I undo the injection?</summary>
          <div className="faq-content">
            Yes. The CLI requires a clean git working tree before injecting, so you can always <code>git diff</code> to review, or <code>git checkout .</code> to revert instantly.
          </div>
        </details>
        <details className="faq-item">
          <summary>What frameworks does this support?</summary>
          <div className="faq-content">
            DropRoute currently supports Expo Router projects using TypeScript. It detects the router version and validates the project structure before doing anything.
          </div>
        </details>
      </section>

      {/* Footer */}
      <footer className="footer-row" style={{ marginBottom: '48px' }}>
        <div className="footer-left">
          <span className="wordmark" style={{ fontSize: '16px' }}>
            dr<span className="wordmark-dot" style={{ width: '6px', height: '6px' }} />proute
          </span>
          <span className="footer-license">MIT License</span>
        </div>
        <a href="https://github.com/Xconmax245/Droproute" className="nav-link" target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px' }}>
          View on GitHub →
        </a>
      </footer>
    </main>
  );
}
