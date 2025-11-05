import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}


export async function sendEmail({ to, subject, text, html }: EmailOptions) {
  try {
    const requiredEnvVars = ["MAIL_HOST", "MAIL_PORT", "MAIL_FROM_ADDRESS"];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    const port = parseInt(process.env.MAIL_PORT as string, 10);
    const isSsl = port === 465; 
    const transportConfig: any = {
      host: process.env.MAIL_HOST,
      port,
      secure: isSsl,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    // Handle Herd Pro authentication - try multiple approaches
    if (process.env.MAIL_HOST === "127.0.0.1" || process.env.MAIL_HOST === "localhost") {
      // For Herd Pro local SMTP, try without authentication first
      console.log("📧 Using Herd Pro local SMTP without authentication");
    } else if (process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD !== "null") {
      // For remote SMTP servers with real credentials
      transportConfig.auth = {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      };
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // Prepare email data
    const fromAddress = process.env.MAIL_FROM_NAME
      ? `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_ADDRESS}>`
      : process.env.MAIL_FROM_ADDRESS;

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      ...(text && { text }),
      ...(html && { html }),
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully:", {
      messageId: info.messageId,
      to,
      subject,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return {
      success: true,
      messageId: info.messageId,
      info,
    };
  } catch (error) {
    console.error("❌ Failed to send email:", {
      error: error instanceof Error ? error.message : "Unknown error",
      to,
      subject,
    });

    throw new Error(`Email sending failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
