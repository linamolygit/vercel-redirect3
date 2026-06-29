import React, { useState } from "react";
import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(true);
    setName("");
    setEmail("");
    setMessage("");
    setTimeout(() => setSuccess(false), 5000);
  };

  const toggleFaq = (index: number) => {
    if (faqOpen === index) {
      setFaqOpen(null);
    } else {
      setFaqOpen(index);
    }
  };

  const faqs = [
    {
      q: "Why is Facebook redirection failing or returning a 403 Forbidden error?",
      a: "This happens because your WordPress hosting firewall blocks Facebook crawlers (facebookexternalhit) from reading dynamic responses directly from your site. We solved this by bypassing client-side meta tags and serving customized database meta directly from LinkPika to Facebook. Normal visitors are redirected at the server-side 320 redirect level instantly.",
    },
    {
      q: "Can I use the tool without logging in?",
      a: "Yes! LinkPika supports Guest Mode. You can convert any WordPress post link immediately without signing up. Your generated links history will be stored securely inside your browser's localStorage.",
    },
    {
      q: "What is the ImgBB upload limit?",
      a: "Our uploader uses standard ImgBB API keys, supporting files up to 32MB each and completely unlimited total hosting storage.",
    },
    {
      q: "How do I configure custom domains?",
      a: "You can point your custom DNS CNAME records (e.g., links.yourblog.com) to our Vercel or Cloudflare Worker endpoints to host cloaked links under your custom brand domain name.",
    },
  ];

  return (
    <div className="wrapper">
      <Head>
        <title>Contact & Help Support — LinkPika</title>
        <meta name="description" content="Reach out to LinkPika support team and view help FAQs" />
      </Head>

      <Header />

      <div className="background-glows">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
      </div>

      <main className="container">
        <header className="page-header">
          <h1>Get in Touch</h1>
          <p className="subtitle">
            Have any questions or need guidance? Send us a message or find quick answers in the FAQ section below.
          </p>
        </header>

        <div className="contact-grid">
          {/* Form */}
          <div className="card form-card">
            <h2>Send a Message ✉️</h2>
            {success && <div className="success-banner">Message sent successfully! We have received your query. ✅</div>}
            
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
                  rows={4}
                  required
                />
              </div>

              <button type="submit" className="btn-submit">Send Message</button>
            </form>
          </div>

          {/* Quick Info */}
          <div className="info-column">
            <div className="info-card">
              <h3>Support Email</h3>
              <p>For custom plans, bug reports, or partnership inquiries, reach out to us at:</p>
              <a href="mailto:support@linkpika.com" className="email-link">support@linkpika.com</a>
            </div>

            <div className="info-card">
              <h3>Instant Response</h3>
              <p>Our support team processes incoming tickets and responds within 24 hours. Please include links and error screenshots.</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <section id="faq" className="faq-section">
          <h2>Frequently Asked Questions ❓</h2>
          <div className="faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className={`faq-item ${faqOpen === i ? "open" : ""}`} onClick={() => toggleFaq(i)}>
                <div className="faq-question">
                  <span>{faq.q}</span>
                  <svg className="chevron-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {faqOpen === i && <div className="faq-answer"><p>{faq.a}</p></div>}
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      <style jsx>{`
        .wrapper {
          min-height: 100vh;
          background: #070215;
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
          max-width: 1000px;
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

        .contact-grid {
          display: grid;
          grid-template-columns: 1.8fr 1fr;
          gap: 30px;
          align-items: start;
        }

        .card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(24px);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
        }

        .form-card h2 {
          font-size: 1.4rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 25px;
        }

        .success-banner {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.25);
          color: #4ade80;
          padding: 15px 20px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 20px;
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
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #9ca3af;
        }

        .input-group input,
        .input-group textarea {
          width: 100%;
          padding: 15px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: #f3f4f6;
          font-size: 0.95rem;
          font-family: inherit;
          outline: none;
          transition: all 0.3s ease;
        }

        .input-group input:focus,
        .input-group textarea:focus {
          border-color: #a855f7;
          box-shadow: 0 0 12px rgba(168, 85, 247, 0.25);
        }

        .btn-submit {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          border: none;
          color: #fff;
          padding: 15px;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.4);
        }

        .info-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .info-card {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 30px;
          border-radius: 20px;
        }

        .info-card h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #c084fc;
          margin-bottom: 10px;
        }

        .info-card p {
          font-size: 0.9rem;
          color: #9ca3af;
          line-height: 1.5;
          margin-bottom: 15px;
        }

        .email-link {
          font-size: 1rem;
          color: #fff;
          font-weight: 700;
          text-decoration: none;
          border-bottom: 1.5px solid #a855f7;
          padding-bottom: 2px;
          transition: all 0.25s ease;
        }

        .email-link:hover {
          color: #c084fc;
          border-color: #c084fc;
        }

        /* FAQ Styling */
        .faq-section {
          margin-top: 20px;
        }

        .faq-section h2 {
          font-size: 1.6rem;
          font-weight: 800;
          color: #f3f4f6;
          margin-bottom: 25px;
          text-align: center;
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
          max-width: 800px;
          margin: 0 auto;
        }

        .faq-item {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .faq-item:hover {
          border-color: rgba(168, 85, 247, 0.25);
          background: rgba(168, 85, 247, 0.01);
        }

        .faq-item.open {
          border-color: rgba(168, 85, 247, 0.4);
          background: rgba(168, 85, 247, 0.015);
        }

        .faq-question {
          padding: 20px 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          font-size: 0.95rem;
          color: #f3f4f6;
        }

        .chevron-icon {
          width: 18px;
          height: 18px;
          color: #9ca3af;
          transition: transform 0.25s ease;
        }

        .faq-item.open .chevron-icon {
          transform: rotate(180deg);
          color: #c084fc;
        }

        .faq-answer {
          padding: 0 25px 20px;
          font-size: 0.9rem;
          color: #9ca3af;
          line-height: 1.6;
          border-top: 1px solid rgba(255, 255, 255, 0.03);
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .contact-grid { grid-template-columns: 1fr; }
          .page-header h1 { font-size: 2.3rem; }
          .container { margin: 30px auto; }
          .card { padding: 30px 20px; }
        }
      `}</style>
    </div>
  );
}
