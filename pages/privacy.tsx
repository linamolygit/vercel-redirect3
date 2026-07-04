import React from "react";
import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Privacy() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Head>
        <title>Privacy Policy — LinkPika</title>
        <meta name="description" content="Privacy Policy and user data processing guidelines for LinkPika" />
      </Head>

      <Header />

      <main className="page-container">
        <header className="page-header">
          <h1>Privacy Policy</h1>
          <p className="subtitle">Last Updated: June 2026</p>
        </header>

        <div className="glass-panel doc-panel">
          <section className="doc-section">
            <h2>1. Information We Collect</h2>
            <p>
              LinkPika respects your privacy. We only collect your email address at sign-up to manage your credentials. When using our tool in Guest Mode, we do not store any personal information on our central servers; your link history is stored entirely in your local browser storage (localStorage).
            </p>
          </section>

          <section className="doc-section">
            <h2>2. Link Data & Overrides</h2>
            <p>
              When you convert a WordPress URL using our tool, we store the target destination URL, custom override titles, descriptions, and image links in our Hostinger MySQL database to coordinate short link redirection.
            </p>
          </section>

          <section className="doc-section">
            <h2>3. Third Party Integrations</h2>
            <p>
              We utilize the standard ImgBB upload API to host your custom preview images. Uploaded images are processed according to ImgBB&apos;s privacy terms. We do not exercise control over their external storage rules.
            </p>
          </section>

          <section className="doc-section">
            <h2>4. Security</h2>
            <p>
              Your passwords are encrypted using one-way cryptographic hash functions (bcrypt) and sessions are managed securely using HTTP-Only JWT cookies to prevent unauthorized leakage or token interception.
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

