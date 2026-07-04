import React, { useState } from "react";
import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(true);
    setName("");
    setEmail("");
    setMessage("");
    setTimeout(() => setSuccess(false), 5000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Head>
        <title>Contact Us — LinkPika</title>
        <meta name="description" content="Reach out to LinkPika support team" />
      </Head>

      <Header />

      <main className="page-container">
        <header className="page-header">
          <h1>Get in Touch</h1>
          <p className="subtitle">
            Have any questions, bug reports, or partnership inquiries? Send us a message below.
          </p>
        </header>

        <div className="contact-grid">
          {/* Quick Info */}
          <div className="info-column">
            <div className="glass-panel info-card">
              <div className="icon-wrapper">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3>Support Email</h3>
              <p>For custom plans, bug reports, or partnership inquiries, reach out to us at:</p>
              <a href="mailto:support@linkpika.com" className="email-link">support@linkpika.com</a>
            </div>

            <div className="glass-panel info-card">
              <div className="icon-wrapper">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3>Instant Response</h3>
              <p>Our support team processes incoming tickets and responds within 24 hours. Please include links and error screenshots.</p>
            </div>
            
            <div className="glass-panel info-card">
              <div className="icon-wrapper">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3>Help & FAQs</h3>
              <p>Looking for quick answers? Check out our detailed FAQ section.</p>
              <a href="/faq" className="faq-link">Visit Help Center →</a>
            </div>
          </div>

          {/* Form */}
          <div className="glass-panel form-card">
            <h2>Send a Message</h2>
            {success && (
              <div className="success-banner">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Message sent successfully! We have received your query.
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="form-panel">
              <div className="input-group">
                <label htmlFor="name">Your Name</label>
                <input
                  type="text"
                  id="name"
                  placeholder="Enter your name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  placeholder="Type your query or feedback here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Send Message
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .page-container {
          max-width: 1100px;
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
          margin-bottom: 50px;
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

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 30px;
          width: 100%;
          align-items: start;
        }

        .info-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .info-card {
          padding: 30px;
          text-align: left;
        }

        .icon-wrapper {
          width: 48px;
          height: 48px;
          background: rgba(0, 113, 227, 0.1);
          color: var(--primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .icon-wrapper svg {
          width: 24px;
          height: 24px;
        }

        .info-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 10px;
          margin-top: 0;
        }

        .info-card p {
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 15px;
          font-size: 0.95rem;
        }

        .email-link {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--primary);
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .email-link:hover {
          opacity: 0.8;
          text-decoration: underline;
        }
        
        .faq-link {
          font-weight: 600;
          color: var(--primary);
          text-decoration: none;
        }
        
        .faq-link:hover {
          text-decoration: underline;
        }

        .form-card {
          padding: 40px;
        }

        .form-card h2 {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--text-main);
          margin-top: 0;
          margin-bottom: 30px;
          letter-spacing: -0.5px;
        }

        .success-banner {
          background: rgba(52, 199, 89, 0.1);
          color: var(--success);
          border: 1px solid rgba(52, 199, 89, 0.3);
          padding: 16px;
          border-radius: var(--radius-md);
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .form-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-main);
        }

        @media (max-width: 860px) {
          .contact-grid {
            grid-template-columns: 1fr;
          }
          .info-column {
            order: 2;
          }
          .form-card {
            order: 1;
            padding: 30px 20px;
          }
        }
      `}</style>
    </div>
  );
}

