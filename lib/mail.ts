import nodemailer from "nodemailer";

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(options: MailOptions): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || `"WP Link Cloaker" <noreply@yourdomain.com>`;

  // Fallback check: if SMTP environment details are missing, print the link in logs
  if (!host || !user || !pass) {
    console.warn("⚠️ SMTP Credentials missing in env. Fallback mode: Printing email content below.");
    console.log("------------------------------------------");
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`HTML Message:`);
    console.log(options.html);
    console.log("------------------------------------------");
    return true; // Return success for dev simulation
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log("Email sent successfully: %s", info.messageId);
    return true;
  } catch (error: any) {
    console.error("Failed to send email via SMTP:", error.message);
    // Even if SMTP fails, return false so the API can report it, but fallback print in console
    console.log("FALLBACK PRINT - To:", options.to, "HTML:", options.html);
    return false;
  }
}
