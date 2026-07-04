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

      

      <main className="studio-layout" style={{ flexDirection: "column", padding: "40px 20px" }}>
        <div className="card doc-card">
          <h1>Terms & Conditions</h1>
          <p className="last-updated">Last Updated: June 2026</p>
          <hr />

          <section>
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing or using the LinkPika platform, you agree to be bound by these legal terms and conditions. If you do not agree with any of these rules, please discontinue use of this tool.
            </p>
          </section>

          <section>
            <h2>2. Acceptable Use Policy</h2>
            <p>
              You agree not to use this tool for spamming, malware deployment, phishing activities, spreading fake news, or generating redirects that violate copyright laws. Any links found to be in violation will be deleted immediately and account access may be permanently terminated.
            </p>
          </section>

          <section>
            <h2>3. Service Availability & Database Limits</h2>
            <p>
              LinkPika redirect edge network (Cloudflare/Vercel serverless) operates on a high-availability infrastructure. However, we do not guarantee absolute data backup protection against host failures; we encourage users to keep a record of critical redirect configurations.
            </p>
          </section>

          <section>
            <h2>4. Limitation of Liability</h2>
            <p>
              LinkPika and its developers shall not be liable for any direct or indirect financial losses, domain blacklisting (e.g., social media platform spam flags), or target server downtime issues arising from the use of this service.
            </p>
          </section>
        </div>
      </main>

      <Footer />

      
    </div>
  );
}
