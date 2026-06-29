import React from "react";
import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Terms() {
  return (
    <div className="wrapper">
      <Head>
        <title>Terms & Conditions — LinkPika</title>
        <meta name="description" content="Terms of Services and usage policies for LinkPika SaaS tool" />
      </Head>

      <Header />

      <div className="background-glows">
        <div className="glow glow-1"></div>
      </div>

      <main className="container">
        <div className="card doc-card">
          <h1>Terms & Conditions</h1>
          <p className="last-updated">Last Updated: June 2026</p>
          <hr />

          <section>
            <h2>1. Agreement to Terms</h2>
            <p>
              LinkPika platform ko use karke aap hamare in legal terms aur conditions ko fully accept karte hain. Agar aap in rules se sehmat nahi hain, to please is tool ka use na karein.
            </p>
          </section>

          <section>
            <h2>2. Acceptable Use Policy</h2>
            <p>
              Aap is tool ko kisi bhi spamming, malware deployment, phishing activity, fake news, ya copyright violation redirects generate karne ke liye use nahi karenge. Aise links paye jaane par aapke redirects delete kar diye jayenge aur account access permanantly terminate kar diya jayega.
            </p>
          </section>

          <section>
            <h2>3. Service Availability & Database Limits</h2>
            <p>
              LinkPika redirect edge network (Cloudflare/Vercel serverless) par high-availability support deta hai. Par hum aapke redirects database data ki backup integrity par absolute control guarantee nahi lete hain, isliye critical redirect configurations ka local back up jarur rakhein.
            </p>
          </section>

          <section>
            <h2>4. Limitation of Liability</h2>
            <p>
              LinkPika ya uske developers kisi bhi financial losses, domain blacklist status (jaise social platform spam filters par block hona), ya target server downtime issues ke liye direct/indirect roop se zimmewar nahi honge.
            </p>
          </section>
        </div>
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

        .container {
          max-width: 800px;
          margin: 60px auto;
          padding: 0 25px;
          position: relative;
          z-index: 2;
        }

        .card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(24px);
          border-radius: 24px;
          padding: 50px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
        }

        .doc-card h1 {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 5px;
        }

        .last-updated {
          font-size: 0.9rem;
          color: #9ca3af;
          margin-bottom: 20px;
        }

        hr {
          border: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 30px;
        }

        section {
          margin-bottom: 30px;
          text-align: left;
        }

        section h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #c084fc;
          margin-bottom: 12px;
        }

        section p {
          font-size: 0.95rem;
          color: #d1d5db;
          line-height: 1.7;
        }

        @media (max-width: 768px) {
          .doc-card h1 { font-size: 2rem; }
          .container { margin: 30px auto; }
          .card { padding: 30px 20px; }
        }
      `}</style>
    </div>
  );
}
