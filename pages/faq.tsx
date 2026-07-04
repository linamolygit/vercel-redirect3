import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function FAQ() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

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
      a: "This happens because your WordPress hosting firewall blocks Facebook crawlers (facebookexternalhit) from reading dynamic responses directly from your site. We solved this by bypassing client-side meta tags and serving customized database meta directly from LinkPika to Facebook. Normal visitors are redirected at the server-side 302 redirect level instantly.",
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
    {
      q: "Is it safe to use for Facebook Ads?",
      a: "Yes, our cloaking mechanism complies with general redirection standards. However, you should always ensure the final destination content complies with Facebook's Advertising Policies to avoid account bans.",
    },
    {
      q: "How does the Clickable Image Generator work?",
      a: "The Clickable Image Generator allows you to upload multiple photos and arrange them in a Facebook-style collage. We generate a single 1200x630 OG image that looks like a multi-photo post. When users click on any 'photo' in the collage, they are redirected to your link.",
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Head>
        <title>Help & FAQs — LinkPika</title>
        <meta name="description" content="Frequently Asked Questions and Help Center for LinkPika" />
      </Head>

      <Header />

      <main className="page-container">
        <header className="page-header">
          <h1>Help Center & FAQs</h1>
          <p className="subtitle">
            Find quick answers to common questions about LinkPika&apos;s link cloaking and image tools.
          </p>
        </header>

        <div className="faq-container glass-panel">
          {faqs.map((faq, i) => (
            <div key={i} className={`faq-item ${faqOpen === i ? "open" : ""}`} onClick={() => toggleFaq(i)}>
              <div className="faq-question">
                <span>{faq.q}</span>
                <svg className="chevron-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div className="faq-answer">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="contact-prompt">
          <p>Still need help?</p>
          <Link href="/contact">
            <a className="btn-secondary">Contact Support</a>
          </Link>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .page-container {
          max-width: 900px;
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

        .faq-container {
          width: 100%;
          padding: 10px 30px;
        }

        .faq-item {
          border-bottom: 1px solid var(--glass-border);
          overflow: hidden;
        }

        .faq-item:last-child {
          border-bottom: none;
        }

        .faq-question {
          padding: 24px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-main);
          transition: color 0.2s;
        }

        .faq-question:hover {
          color: var(--primary);
        }

        .chevron-icon {
          width: 20px;
          height: 20px;
          color: var(--text-muted);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .faq-item.open .chevron-icon {
          transform: rotate(180deg);
          color: var(--primary);
        }

        .faq-answer {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
        }

        .faq-item.open .faq-answer {
          max-height: 500px; /* Arbitrary large height to allow expansion */
          opacity: 1;
          padding-bottom: 24px;
        }

        .faq-answer p {
          margin: 0;
          color: var(--text-muted);
          line-height: 1.6;
          font-size: 0.95rem;
        }
        
        .contact-prompt {
          margin-top: 50px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        
        .contact-prompt p {
          color: var(--text-muted);
          font-size: 1.1rem;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
