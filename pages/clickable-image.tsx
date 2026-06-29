import React from "react";
import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function ClickableImage() {
  return (
    <div className="wrapper">
      <Head>
        <title>+ Clickable Image — LinkPika SaaS</title>
        <meta name="description" content="Create image links that redirect users to any destination upon clicks" />
      </Head>

      <Header />

      <div className="background-glows">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
      </div>

      <main className="container">
        <div className="card hero-card">
          <span className="badge-featured">🔥 UPCOMING PREMIUM FEATURE</span>
          <h1>+ Clickable Image Links</h1>
          <p className="description">
            Convert your social media links into fully interactive visual images. When users click the shared image on Facebook or WhatsApp, they will be redirected to your target destination or affiliate offer.
          </p>
        </div>

        <div className="feature-grid">
          {/* Box 1 */}
          <div className="feature-box">
            <div className="icon-wrapper bg-indigo">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3>Fake Video Player Mockup</h3>
            <p>Overlay a play button on top of any preview image to double your click-through rates.</p>
          </div>

          {/* Box 2 */}
          <div className="feature-box">
            <div className="icon-wrapper bg-purple">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3>Direct Click Hijacking</h3>
            <p>Users who click the image will instantly land on your target article, bypassing intermediate steps.</p>
          </div>

          {/* Box 3 */}
          <div className="feature-box">
            <div className="icon-wrapper bg-pink">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3>Real-Time Analytics</h3>
            <p>Track exactly how many clicks your custom images receive and compare creatives to maximize revenue.</p>
          </div>
        </div>

        <div className="card coming-soon-panel">
          <div className="loader-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <h2>Under Active Development 🛠️</h2>
          <p>
            We are currently linking the database schema and Cloudflare worker rules for custom clickable image redirects. This feature will go live on the dashboard soon!
          </p>
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
          gap: 40px;
          position: relative;
          z-index: 2;
        }

        .card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 24px;
          padding: 50px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
          text-align: center;
        }

        .hero-card h1 {
          font-size: 2.8rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 15px 0;
        }

        .badge-featured {
          background: rgba(236, 72, 153, 0.15);
          color: #f472b6;
          border: 1px solid rgba(236, 72, 153, 0.3);
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .description {
          font-size: 1.1rem;
          color: #9ca3af;
          line-height: 1.6;
          max-width: 700px;
          margin: 0 auto;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 25px;
        }

        .feature-box {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 30px;
          border-radius: 20px;
          text-align: left;
          transition: all 0.3s ease;
        }

        .feature-box:hover {
          border-color: rgba(168, 85, 247, 0.3);
          background: rgba(168, 85, 247, 0.02);
          transform: translateY(-4px);
        }

        .icon-wrapper {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #fff;
          margin-bottom: 20px;
        }

        .icon-wrapper svg {
          width: 26px;
          height: 26px;
        }

        .bg-indigo { background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); }
        .bg-purple { background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
        .bg-pink { background: rgba(236, 72, 153, 0.2); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3); }

        .feature-box h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #f3f4f6;
          margin-bottom: 10px;
        }

        .feature-box p {
          font-size: 0.9rem;
          color: #9ca3af;
          line-height: 1.5;
        }

        .coming-soon-panel {
          border-color: rgba(168, 85, 247, 0.2);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.01) 0%, rgba(168, 85, 247, 0.02) 100%);
        }

        .coming-soon-panel h2 {
          font-size: 1.6rem;
          font-weight: 700;
          color: #c084fc;
          margin: 15px 0 10px;
        }

        .coming-soon-panel p {
          font-size: 0.95rem;
          color: #9ca3af;
          line-height: 1.6;
          max-width: 600px;
          margin: 0 auto;
        }

        .loader-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .loader-dots span {
          width: 8px;
          height: 8px;
          background: #a855f7;
          border-radius: 50%;
          animation: pulse 1.4s infinite ease-in-out both;
        }

        .loader-dots span:nth-child(1) { animation-delay: -0.32s; }
        .loader-dots span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        @media (max-width: 768px) {
          .hero-card h1 { font-size: 2.1rem; }
          .container { margin: 30px auto; }
          .card { padding: 30px 20px; }
        }
      `}</style>
    </div>
  );
}
