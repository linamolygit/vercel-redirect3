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

      

      <main className="studio-layout" style={{ flexDirection: "column", padding: "40px 20px" }}>
        <div className="card doc-card">
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last Updated: June 2026</p>
          <hr />

          <section>
            <h2>1. Information We Collect</h2>
            <p>
              LinkPika respects your privacy. We only collect your email address at sign-up to manage your credentials. When using our tool in Guest Mode, we do not store any personal information on our central servers; your link history is stored entirely in your local browser storage (localStorage).
            </p>
          </section>

          <section>
            <h2>2. Link Data & Overrides</h2>
            <p>
              When you convert a WordPress URL using our tool, we store the target destination URL, custom override titles, descriptions, and image links in our Hostinger MySQL database to coordinate short link redirection.
            </p>
          </section>

          <section>
            <h2>3. Third Party Integrations</h2>
            <p>
              We utilize the standard ImgBB upload API to host your custom preview images. Uploaded images are processed according to ImgBB&apos;s privacy terms. We do not exercise control over their external storage rules.
            </p>
          </section>

          <section>
            <h2>4. Security</h2>
            <p>
              Your passwords are encrypted using one-way cryptographic hash functions (bcrypt) and sessions are managed securely using HTTP-Only JWT cookies to prevent unauthorized leakage or token interception.
            </p>
          </section>
        </div>
      </main>

      <Footer />

      
    </div>
  );
}
