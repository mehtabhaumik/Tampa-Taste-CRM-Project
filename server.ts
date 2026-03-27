import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to send email
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html || (typeof subject === 'string' && !subject.trim()) || (typeof html === 'string' && !html.trim())) {
      console.error("Missing or empty required fields for email:", { to, subject, hasHtml: !!html });
      return res.status(400).json({ error: "Missing or empty required fields (to, subject, html)" });
    }

    if (!resend) {
      const keyPrefix = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 5) : "none";
      console.warn(`RESEND_API_KEY is not set or invalid (prefix: ${keyPrefix}). Email not sent.`);
      return res.status(200).json({ message: "Email not sent (no API key)" });
    }

    try {
      console.log(`Attempting to send email to: ${JSON.stringify(to)}`);
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const recipients = Array.isArray(to) ? to : [to];
      
      if (recipients.length === 0) {
        console.error("No recipients provided");
        return res.status(400).json({ error: "At least one recipient is required" });
      }
      
      for (const recipient of recipients) {
        if (typeof recipient !== 'string' || !emailRegex.test(recipient.trim())) {
          console.error("Invalid recipient email format:", recipient);
          return res.status(400).json({ error: `Invalid recipient email format: ${recipient}` });
        }
      }

      const fromEmail = (process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev").trim();
      const fromName = (process.env.RESEND_FROM_NAME || "PortfolioContact").trim();
      
      // If using onboarding@resend.dev, it MUST be exactly that address without a name in many cases
      // Otherwise, use the quoted name format which is safer for names with spaces
      const from = fromEmail === "onboarding@resend.dev" 
        ? "onboarding@resend.dev" 
        : `"${fromName}" <${fromEmail}>`;

      console.log(`Using from address: ${from}`);

      const { data, error } = await resend.emails.send({
        from,
        to: to,
        subject: subject,
        html: html,
      });

      if (error) {
        console.error("Resend API error details:", JSON.stringify(error, null, 2));
        
        // Provide more helpful error messages for common Resend issues
        let errorMessage = (error as any).message || "Validation error";
        const errorName = (error as any).name;

        if (errorName === "validation_error" && fromEmail === "onboarding@resend.dev") {
          errorMessage = "Resend Sandbox Restriction: When using 'onboarding@resend.dev', you can only send emails to the address you signed up with. To send to others, you must verify a domain in your Resend dashboard.";
        } else if (errorName === "validation_error") {
          errorMessage = `Resend Validation Error: ${errorMessage}. Ensure your 'from' address (${fromEmail}) is a verified domain in your Resend dashboard.`;
        }

        return res.status(400).json({ 
          error: errorMessage,
          name: errorName,
          details: error 
        });
      }

      console.log("Email sent successfully:", data?.id);
      res.status(200).json({ data });
    } catch (err) {
      console.error("Server error during email send:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
