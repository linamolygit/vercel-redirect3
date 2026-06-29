import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Brand Column */}
        <div className="footer-brand">
          <div className="footer-logo">
            <svg className="logo-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="logo-text">LinkPika</span>
          </div>
          <p className="brand-tagline">
            Professional link cloaker and social tag customizer for bloggers and digital marketers. Optimize CTR in one click.
          </p>
        </div>

        {/* Links Column 1 */}
        <div className="footer-column">
          <h4>SaaS Features</h4>
          <ul className="footer-links">
            <li>
              <Link href="/"><a>Link Cloaker</a></Link>
            </li>
            <li>
              <Link href="/clickable-image"><a>+ Clickable Image</a></Link>
            </li>
            <li>
              <Link href="/pricing"><a>Pricing Plans</a></Link>
            </li>
          </ul>
        </div>

        {/* Links Column 2 */}
        <div className="footer-column">
          <h4>Support & Contact</h4>
          <ul className="footer-links">
            <li>
              <Link href="/contact"><a>Contact Us</a></Link>
            </li>
            <li>
              <a href="mailto:support@linkpika.com">support@linkpika.com</a>
            </li>
            <li>
              <Link href="/contact#faq"><a>Help FAQs</a></Link>
            </li>
          </ul>
        </div>

        {/* Links Column 3 */}
        <div className="footer-column">
          <h4>Legal Policies</h4>
          <ul className="footer-links">
            <li>
              <Link href="/privacy"><a>Privacy Policy</a></Link>
            </li>
            <li>
              <Link href="/terms"><a>Terms of Services</a></Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} LinkPika. All rights reserved. Created with absolute precision.</p>
      </div>

      <style jsx>{`
        .footer {
          width: 100%;
          background: #04010a;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding: 60px 0 30px;
          margin-top: 50px;
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 25px;
          display: grid;
          grid-template-columns: 2fr repeat(3, 1fr);
          gap: 40px;
        }

        .footer-brand {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #f3f4f6;
        }

        .logo-icon {
          width: 24px;
          height: 24px;
          color: #a855f7;
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .brand-tagline {
          font-size: 0.9rem;
          color: #9ca3af;
          line-height: 1.6;
          max-width: 320px;
        }

        .footer-column {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .footer-column h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #f3f4f6;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .footer-links li a {
          font-size: 0.9rem;
          color: #9ca3af;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .footer-links li a:hover {
          color: #c084fc;
        }

        .footer-bottom {
          max-width: 1200px;
          margin: 40px auto 0;
          padding: 25px 25px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .footer-bottom p {
          font-size: 0.85rem;
          color: #6b7280;
          text-align: center;
        }

        @media (max-width: 768px) {
          .footer-container {
            grid-template-columns: 1fr;
            gap: 30px;
          }

          .footer-brand {
            align-items: center;
            text-align: center;
          }

          .brand-tagline {
            max-width: 100%;
          }

          .footer-column {
            align-items: center;
            text-align: center;
          }
        }
      `}</style>
    </footer>
  );
}
