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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Head>
        <title>Contact & Help Support — LinkPika</title>
        <meta name="description" content="Reach out to LinkPika support team and view help FAQs" />
      </Head>

      <Header />

      

      <main className="studio-layout" style={{ flexDirection: "column", padding: "40px 20px" }}>
        <header className="page-header">
          <h1>Get in Touch</h1>
          <p className="subtitle">
            Have any questions or need guidance? Send us a message or find quick answers in the FAQ section below.
          </p>
        </header>

        <div className="contact-grid">
          {/* Form */}
          <div className="card form-card">
            <h2>Send a Message </h2>
            {success && <div className="success-banner">Message sent successfully! We have received your query. <svg style={{display:'inline', width:'18px', height:'18px', verticalAlign:'middle', marginRight:'4px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>}
            
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

      
    </div>
  );
}
