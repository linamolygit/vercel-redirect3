import React from "react";
import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Pricing() {
  return (
    <div className="wrapper">
      <Head>
        <title>Pricing Plans — LinkPika</title>
        <meta name="description" content="Affordable link cloaker subscription tiers for everyone" />
      </Head>

      <Header />

      <div className="background-glows">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
      </div>

      <main className="container">
        <header className="page-header">
          <h1>Choose Your Plan</h1>
          <p className="subtitle">
            Scale your link optimization process without any complexity. Start for free, upgrade when you grow.
          </p>
        </header>

        <div className="pricing-grid">
          {/* Card 1: Free */}
          <div className="pricing-card">
            <span className="plan-name">Free Plan</span>
            <div className="plan-price">
              <span className="currency">$</span>
              <span className="amount">0</span>
              <span className="period">/ month</span>
            </div>
            <p className="plan-desc">Best for beginners and testing features.</p>
            <hr />
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
            <button className="btn-plan-secondary">Get Started</button>
          </div>

          {/* Card 2: Pro (Best Value) */}
          <div className="pricing-card featured">
            <span className="badge-popular">MOST POPULAR</span>
            <span className="plan-name">Pro Cloaker</span>
            <div className="plan-price">
              <span className="currency">$</span>
              <span className="amount">19</span>
              <span className="period">/ month</span>
            </div>
            <p className="plan-desc">For active bloggers and social media marketers.</p>
            <hr />
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
            <button className="btn-plan-primary">Upgrade to Pro</button>
          </div>

          {/* Card 3: Enterprise */}
          <div className="pricing-card">
            <span className="plan-name">Business</span>
            <div className="plan-price">
              <span className="currency">$</span>
              <span className="amount">49</span>
              <span className="period">/ month</span>
            </div>
            <p className="plan-desc">For heavy marketing teams and agencies.</p>
            <hr />
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
            <button className="btn-plan-secondary">Contact Sales</button>
          </div>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .wrapper {
          min-height: 100vh;
          background: var(--bg);
          color: #f3f4f6;
          font-family: 'Outfit', sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .background-glows {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          overflow: hidden;
          z-index: 1;
          pointer-events: none;
        }

        .glow {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.15;
        }

        .glow-1 {
          top: -10%;
          left: -10%;
          background: #6366f1;
        }

        .glow-2 {
          bottom: 20%;
          right: -10%;
          background: #a855f7;
        }

        .container {
          max-width: 1100px;
          margin: 60px auto;
          padding: 0 25px;
          display: flex;
          flex-direction: column;
          gap: 50px;
          position: relative;
          z-index: 2;
        }

        .page-header {
          text-align: center;
        }

        .page-header h1 {
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 15px;
        }

        .subtitle {
          font-size: 1.1rem;
          color: #9ca3af;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
          align-items: stretch;
        }

        .pricing-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 24px;
          padding: 40px 30px;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: all 0.3s ease;
        }

        .pricing-card:hover {
          border-color: rgba(255, 255, 255, 0.12);
          transform: translateY(-4px);
        }

        .pricing-card.featured {
          border-color: rgba(168, 85, 247, 0.4);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(168, 85, 247, 0.02) 100%);
          box-shadow: 0 20px 50px rgba(168, 85, 247, 0.1);
        }

        .pricing-card.featured:hover {
          border-color: rgba(168, 85, 247, 0.6);
        }

        .badge-popular {
          position: absolute;
          top: -15px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: #fff;
          padding: 6px 16px;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 1px;
          box-shadow: 0 4px 10px rgba(168, 85, 247, 0.4);
        }

        .plan-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .plan-price {
          display: flex;
          align-items: baseline;
          margin: 20px 0 10px;
        }

        .currency {
          font-size: 1.8rem;
          font-weight: 700;
          color: #f3f4f6;
        }

        .amount {
          font-size: 3.5rem;
          font-weight: 800;
          color: #f3f4f6;
        }

        .period {
          font-size: 1rem;
          color: #9ca3af;
          margin-left: 5px;
        }

        .plan-desc {
          font-size: 0.9rem;
          color: #9ca3af;
          margin-bottom: 25px;
        }

        hr {
          border: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 25px;
        }

        .plan-features {
          list-style: none;
          padding: 0;
          margin: 0 0 35px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .plan-features li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          color: #d1d5db;
        }

        .plan-features li.disabled {
          color: #6b7280;
        }

        .check-icon {
          width: 16px;
          height: 16px;
          color: #34d399;
        }

        .cross-icon {
          width: 16px;
          height: 16px;
          color: #ef4444;
        }

        .btn-plan-primary {
          width: 100%;
          padding: 14px;
          margin-top: auto;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          border: none;
          color: #fff;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
        }

        .btn-plan-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.45);
        }

        .btn-plan-secondary {
          width: 100%;
          padding: 14px;
          margin-top: auto;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #f3f4f6;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-plan-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }

        @media (max-width: 768px) {
          .page-header h1 { font-size: 2.3rem; }
          .container { margin: 30px auto; }
        }
      `}</style>
    </div>
  );
}
