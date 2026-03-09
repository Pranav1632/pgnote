import "server-only";

import nodemailer from "nodemailer";
import { describeAlgoAsMultilineText } from "@/lib/algo-description";
import { env } from "@/lib/env";
import { type PasskeyAlgo } from "@/lib/passkey";

declare global {
  var recoveryAlgoTransporter:
    | nodemailer.Transporter<nodemailer.SentMessageInfo>
    | undefined;
}

function getTransporter(): nodemailer.Transporter<nodemailer.SentMessageInfo> {
  const existing = globalThis.recoveryAlgoTransporter;
  if (existing) {
    return existing;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.recoveryAlgoTransporter = transporter;
  }

  return transporter;
}

interface SendRecoveryAlgoEmailInput {
  to: string;
  slug: string;
  algo: PasskeyAlgo;
}

export async function sendRecoveryAlgoEmail(input: SendRecoveryAlgoEmailInput): Promise<void> {
  const transporter = getTransporter();
  const algoText = describeAlgoAsMultilineText(input.algo);

  const text = [
    `Slug: ${input.slug}`,
    "",
    "Your recovery algorithm details:",
    algoText,
    "",
    "Your algorithm contains no keys, passwords, or session data.",
  ].join("\n");

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: `pgnote recovery for /${input.slug}`,
    text,
  });
}
