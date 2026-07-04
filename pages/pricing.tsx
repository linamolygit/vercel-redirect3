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

      

      <main className="studio-layout" style={{ flexDirection: "column", padding: "40px 20px" }}>
        <header className="page-header">
          <h1>Choose Your Plan</h1>
          <p className="subtitle">
            Scale your link optimization process without any complexity. Start for free, upgrade when you grow.
          </p>
        </header>

        <div className="pricing-grid">
          {/* Card 1: Free */}
          <div className="glass-panel" style={{ padding: "40px", flex: 1, minWidth: "300px" }}>
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
          <div className="glass-panel" style={{ padding: "40px", flex: 1, minWidth: "300px", border: "2px solid var(--primary)" }}>
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
          <div className="glass-panel" style={{ padding: "40px", flex: 1, minWidth: "300px" }}>
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

      
    </div>
  );
}
