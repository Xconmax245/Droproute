'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function PricingPage() {
  return (
    <main className="page-shell">
      <nav className="nav-bar">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span className="wordmark">
            dr<span className="wordmark-dot" />proute
          </span>
        </Link>
        <div className="nav-links">
          <Link href="/docs" className="nav-link">Docs</Link>
          <Link href="/pricing" className="nav-link" style={{ color: 'var(--ink)' }}>Pricing</Link>
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

      <section style={{ paddingTop: '120px', paddingBottom: '120px', textAlign: 'center' }} data-aos="fade-up">
        <h1 className="display-headline" style={{ marginBottom: '16px' }}>
          Simple, transparent <span className="accent-word">pricing</span>
        </h1>
        <p className="body-text" style={{ maxWidth: '600px', margin: '0 auto 64px' }}>
          Choose the plan that fits your growth. Switch to annual billing and save 20%.
        </p>

        <section className="pricing-grid" style={{ textAlign: 'left' }}>
          <motion.div className="pricing-card" whileHover={{ y: -5 }}>
            <div className="pricing-name">Free</div>
            <div className="pricing-price">Free</div>
            <div className="pricing-features">
              <div className="pricing-feature"><span className="pricing-feature-icon">✓</span> Up to 500 tracked events/mo</div>
              <div className="pricing-feature"><span className="pricing-feature-icon">✓</span> Unlimited referral links</div>
              <div className="pricing-feature"><span className="pricing-feature-icon">✓</span> Core dashboard + leaderboard</div>
            </div>
          </motion.div>
          
          <motion.div className="pricing-card primary" whileHover={{ y: -5 }}>
            <div className="pricing-name">Growth</div>
            <div className="pricing-price">$19<span>/mo</span></div>
            <div className="pricing-features">
              <div className="pricing-feature"><span className="pricing-feature-icon">✓</span> Up to 10,000 events/mo</div>
              <div className="pricing-feature"><span className="pricing-feature-icon">✓</span> Custom-domain referral links</div>
              <div className="pricing-feature"><span className="pricing-feature-icon">✓</span> Unlimited AI recommendations</div>
            </div>
          </motion.div>

          <motion.div className="pricing-card" whileHover={{ y: -5 }}>
            <div className="pricing-name">Team</div>
            <div className="pricing-price">$49<span>/mo</span></div>
            <div className="pricing-features">
              <div className="pricing-feature"><span className="pricing-feature-icon">✓</span> Multiple apps, one account</div>
              <div className="pricing-feature"><span className="pricing-feature-icon">✓</span> Priority support</div>
              <div className="pricing-feature"><span className="pricing-feature-icon">✓</span> Higher event ceiling</div>
            </div>
          </motion.div>
        </section>
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
