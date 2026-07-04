import React from "react";
import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Pricing() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Head>
        <title>Pricing Plans — LinkPika</title>
        <meta name="description" content="Affordable link cloaker subscription tiers for everyone" />
      </Head>

      <Header />

      <main className="page-container">
        <header className="page-header">
          <h1>Choose Your Plan</h1>
          <p className="subtitle">
            Scale your link optimization process without any complexity. Start for free, upgrade when you grow.
          </p>
        </header>

        <div className="pricing-grid">
          {/* Card 1: Free */}
          <div className="glass-panel pricing-card">
            <span className="plan-name">Free Plan</span>
            <div className="plan-price">
              <span className="currency">$</span>
              <span className="amount">0</span>
              <span className="period">/ month</span>
            </div>
            <p className="plan-desc">Best for beginners and testing features.</p>
            <hr className="divider" />
            <ul className="plan-features">
              <li>
                <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                50 Short Links / Month
              </li>
              <li>
                <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Basic Redirects (Normal vs Bots)
              </li>
              <li>
                <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Local Browser History (localStorage)
              </li>
              <li className="disabled">
                <svg className="cross-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
                MySQL Database Storage
              </li>
              <li className="disabled">
                <svg className="cross-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Unlimited Custom Meta Overrides
              </li>
            </ul>
            <button className="btn-secondary w-full" style={{ marginTop: 'auto' }}>Get Started</button>
          </div>

          {/* Card 2: Pro (Best Value) */}
          <div className="glass-panel pricing-card featured">
            <span className="badge-popular">MOST POPULAR</span>
            <span className="plan-name text-primary">Pro Cloaker</span>
            <div className="plan-price">
              <span className="currency text-primary">$</span>
              <span className="amount text-primary">19</span>
              <span className="period">/ month</span>
            </div>
            <p className="plan-desc">For active bloggers and social media marketers.</p>
            <hr className="divider" />
            <ul className="plan-features">
              <li>
                <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Unlimited Links / Month
              </li>
              <li>
                <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Cloudflare Workers Integration
              </li>
              <li>
                <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Hostinger MySQL Saved Records
              </li>
              <li>
                <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                ImgBB Multi-Image Uploader
              </li>
              <li>
                <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Email Support (24 Hours)
              </li>
            </ul>
            <button className="btn-primary w-full" style={{ marginTop: 'auto' }}>Upgrade to Pro</button>
          </div>

          {/* Card 3: Enterprise */}
          <div className="glass-panel pricing-card">
            <span className="plan-name">Business</span>
            <div className="plan-price">
              <span className="currency">$</span>
              <span className="amount">49</span>
              <span className="period">/ month</span>
            </div>
            <p className="plan-desc">For heavy marketing teams and agencies.</p>
            <hr className="divider" />
            <ul className="plan-features">
              <li>
                <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Everything in Pro Plan
              </li>
              <li>
                <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Multi-User Access Sharing
              </li>
              <li>
                <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                API Access for automation
              </li>
              <li>
                <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Custom Domain Redirection Setup
              </li>
              <li>
                <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Dedicated VIP Support (Slack/Call)
              </li>
            </ul>
            <button className="btn-secondary w-full" style={{ marginTop: 'auto' }}>Contact Sales</button>
          </div>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .page-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 60px 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .page-header {
          text-align: center;
          margin-bottom: 60px;
          max-width: 600px;
        }

        .page-header h1 {
          font-size: 3rem;
          font-weight: 800;
          color: var(--text-main);
          margin-bottom: 16px;
          letter-spacing: -1px;
        }

        .subtitle {
          font-size: 1.15rem;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 30px;
          width: 100%;
          align-items: stretch;
        }

        .pricing-card {
          display: flex;
          flex-direction: column;
          position: relative;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .pricing-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
        }

        .pricing-card.featured {
          border: 2px solid var(--primary);
          box-shadow: 0 8px 32px rgba(0, 113, 227, 0.15);
          transform: scale(1.02);
        }

        .pricing-card.featured:hover {
          transform: scale(1.02) translateY(-5px);
        }

        .badge-popular {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #0071e3, #45a1ff);
          color: white;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 1px;
          box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
        }

        .plan-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 15px;
        }

        .text-primary {
          color: var(--primary) !important;
        }

        .plan-price {
          display: flex;
          align-items: baseline;
          margin-bottom: 15px;
        }

        .currency {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-main);
          margin-right: 2px;
        }

        .amount {
          font-size: 3.5rem;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -2px;
          line-height: 1;
        }

        .period {
          font-size: 1rem;
          color: var(--text-muted);
          margin-left: 5px;
        }

        .plan-desc {
          color: var(--text-muted);
          font-size: 0.95rem;
          line-height: 1.5;
          margin-bottom: 24px;
          min-height: 44px;
        }

        .divider {
          border: 0;
          border-top: 1px solid var(--glass-border);
          margin: 0 0 24px 0;
        }

        .plan-features {
          list-style: none;
          padding: 0;
          margin: 0 0 32px 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .plan-features li {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.95rem;
          color: var(--text-main);
          font-weight: 500;
        }

        .plan-features li.disabled {
          color: var(--text-muted);
          text-decoration: line-through;
          opacity: 0.7;
        }

        .check-icon {
          width: 20px;
          height: 20px;
          color: var(--success);
          flex-shrink: 0;
        }

        .cross-icon {
          width: 20px;
          height: 20px;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .w-full {
          width: 100%;
        }
        
        @media (max-width: 768px) {
          .pricing-card.featured {
            transform: none;
          }
          .pricing-card.featured:hover {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </div>
  );
}

