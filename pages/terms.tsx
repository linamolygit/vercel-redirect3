import React from "react";
import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Terms() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Head>
        <title>Terms & Conditions — LinkPika</title>
        <meta name="description" content="Terms of Services and usage policies for LinkPika SaaS tool" />
      </Head>

      <Header />

      <main className="page-container">
        <header className="page-header">
          <h1>Terms & Conditions</h1>
          <p className="subtitle">Last Updated: June 2026</p>
        </header>

        <div className="glass-panel doc-panel">
          <section className="doc-section">
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing or using the LinkPika platform, you agree to be bound by these legal terms and conditions. If you do not agree with any of these rules, please discontinue use of this tool.
            </p>
          </section>

          <section className="doc-section">
            <h2>2. Acceptable Use Policy</h2>
            <p>
              You agree not to use this tool for spamming, malware deployment, phishing activities, spreading fake news, or generating redirects that violate copyright laws. Any links found to be in violation will be deleted immediately and account access may be permanently terminated.
            </p>
          </section>

          <section className="doc-section">
            <h2>3. Service Availability & Database Limits</h2>
            <p>
              LinkPika redirect edge network (Cloudflare/Vercel serverless) operates on a high-availability infrastructure. However, we do not guarantee absolute data backup protection against host failures; we encourage users to keep a record of critical redirect configurations.
            </p>
          </section>

          <section className="doc-section">
            <h2>4. Limitation of Liability</h2>
            <p>
              LinkPika and its developers shall not be liable for any direct or indirect financial losses, domain blacklisting (e.g., social media platform spam flags), or target server downtime issues arising from the use of this service.
            </p>
          </section>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .page-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 60px 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .page-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .page-header h1 {
          font-size: 3rem;
          font-weight: 800;
          color: var(--text-main);
          margin-bottom: 12px;
          letter-spacing: -1px;
        }

        .subtitle {
          font-size: 1.1rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .doc-panel {
          width: 100%;
          padding: 50px;
          text-align: left;
        }

        .doc-section {
          margin-bottom: 40px;
        }
        
        .doc-section:last-child {
          margin-bottom: 0;
        }

        .doc-section h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 16px;
          letter-spacing: -0.5px;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 10px;
        }

        .doc-section p {
          font-size: 1.05rem;
          color: var(--text-muted);
          line-height: 1.7;
          margin: 0;
        }

        @media (max-width: 768px) {
          .doc-panel {
            padding: 30px 20px;
          }
          .page-header h1 {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
}

