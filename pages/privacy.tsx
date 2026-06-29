import React from "react";
import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Privacy() {
  return (
    <div className="wrapper">
      <Head>
        <title>Privacy Policy — LinkPika</title>
        <meta name="description" content="Privacy Policy and user data processing guidelines for LinkPika" />
      </Head>

      <Header />

      <div className="background-glows">
        <div className="glow glow-1"></div>
      </div>

      <main className="container">
        <div className="card doc-card">
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last Updated: June 2026</p>
          <hr />

          <section>
            <h2>1. Information We Collect</h2>
            <p>
              Bhai, LinkPika aapki privacy ki izzat karta hai. Hum aapse sign-up ke waqt sirf aapka basic email address collect karte hain. Guest mode me use karne par hum koi bhi personal information central server par collect nahi karte; aapka links data completely aapke local browser storage (localStorage) me hi save hota hai.
            </p>
          </section>

          <section>
            <h2>2. Link Data & Overrides</h2>
            <p>
              Jab aap hamare tool ke through kisi WordPress URL ko convert karte hain, to short link redirects coordinate karne ke liye hum target url, custom override titles, aur image urls ko Hostinger MySQL database me secure store karte hain.
            </p>
          </section>

          <section>
            <h2>3. Third Party Integrations</h2>
            <p>
              Hum aapke direct photo uploads ko store karne ke liye **ImgBB** standard upload API utilize karte hain. ImgBB par uploaded images unke privacy rules ke anusaar process hoti hain. Hamein in images ke storage rules par control nahi hai.
            </p>
          </section>

          <section>
            <h2>4. Security</h2>
            <p>
              Aapka password secure, one-way cryptographic hash functions (bcrypt) ke sath store kiya jata hai aur sessions HTTP-Only JWT tokens se encrypt kiye jate hain taaki koi cookies leak na ho sakein.
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
