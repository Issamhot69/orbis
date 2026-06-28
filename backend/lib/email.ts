import 'dotenv/config'
import 'dotenv/config'
import nodemailer from 'nodemailer'

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@orbis.app'
const FROM_NAME  = 'ORBIS — One platform. Every business. Everywhere.'

// ─── Create transporter ───────────────────────
function createTransporter() {
  if (process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host:   process.env.EMAIL_HOST,
      port:   Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  }

  // Gmail SMTP
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    })
  }

  // Demo mode — log to console
  return null
}

// ─── Email templates ──────────────────────────
function baseTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin:0; padding:0; background:#060e1a; font-family:system-ui,sans-serif; color:#fff; }
    .container { max-width:600px; margin:0 auto; padding:40px 24px; }
    .logo { display:flex; align-items:center; gap:10px; margin-bottom:32px; }
    .logo-icon { width:40px; height:40px; background:#B22234; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:900; color:#fff; }
    .logo-text { font-size:20px; font-weight:900; color:#fff; }
    .card { background:#0a1628; border:1px solid #1e3a5f; border-radius:14px; padding:28px; margin-bottom:24px; }
    .btn { display:inline-block; padding:14px 28px; background:#B22234; color:#fff; text-decoration:none; border-radius:8px; font-weight:700; font-size:15px; }
    .footer { text-align:center; font-size:11px; color:#4a6fa5; margin-top:32px; }
    h1 { font-size:24px; font-weight:900; margin:0 0 12px; }
    p { font-size:14px; color:#c8d8f0; line-height:1.7; margin:0 0 16px; }
    .code { font-size:32px; font-weight:900; color:#B22234; letter-spacing:8px; text-align:center; padding:16px; background:#060e1a; border-radius:8px; margin:16px 0; }
    .divider { border:none; border-top:1px solid #1e3a5f; margin:20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-icon">◎</div>
      <div class="logo-text">ORBIS</div>
    </div>
    ${content}
    <div class="footer">
      <p>ORBIS Inc — Delaware, USA<br>
      <a href="https://orbis-smoky-gamma.vercel.app/privacy" style="color:#4a6fa5">Privacy Policy</a> &nbsp;|&nbsp;
      <a href="https://orbis-smoky-gamma.vercel.app/terms" style="color:#4a6fa5">Terms of Service</a></p>
      <p>Si vous n avez pas demande cet email, ignorez-le.</p>
    </div>
  </div>
</body>
</html>`
}

// ─── Send email ───────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = createTransporter()

  if (!transporter) {
    // Demo mode
    console.log(`[Email DEMO] To: ${to}`)
    console.log(`[Email DEMO] Subject: ${subject}`)
    console.log(`[Email DEMO] Content preview: ${html.slice(0,200)}...`)
    return true
  }

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    })
    console.log(`[Email] Sent to ${to}: ${subject}`)
    return true
  } catch(err: any) {
    console.error(`[Email] Error sending to ${to}:`, err.message)
    return false
  }
}

// ─── Email types ──────────────────────────────

export async function sendWelcomeEmail(to: string, firstName: string) {
  const html = baseTemplate(`
    <div class="card">
      <h1>Bienvenue sur ORBIS, ${firstName} ! 🎉</h1>
      <p>Votre compte a ete cree avec succes. Vous faites maintenant partie de la premiere plateforme B2B mondiale.</p>
      <p>Decouvrez tout ce qu ORBIS peut faire pour votre business :</p>
      <ul style="color:#c8d8f0;font-size:14px;line-height:2">
        <li>🛒 4 Marketplaces B2B mondiales</li>
        <li>🎙️ Speech-to-Speech IA en 12 langues</li>
        <li>🛂 Trust Passport — confiance verifiee</li>
        <li>📝 Contrats automatiques en 30 secondes</li>
        <li>🤖 AI Business Coach personnel</li>
      </ul>
      <hr class="divider">
      <a href="https://orbis-smoky-gamma.vercel.app/dashboard" class="btn">
        Acceder a mon dashboard →
      </a>
    </div>
  `)
  return sendEmail(to, 'Bienvenue sur ORBIS — One platform. Every business. Everywhere.', html)
}

export async function sendPasswordResetEmail(to: string, firstName: string, resetLink: string, code: string) {
  const html = baseTemplate(`
    <div class="card">
      <h1>Reinitialisation de mot de passe</h1>
      <p>Bonjour ${firstName},</p>
      <p>Vous avez demande la reinitialisation de votre mot de passe ORBIS. Cliquez sur le bouton ci-dessous ou utilisez le code :</p>
      <div class="code">${code}</div>
      <p style="text-align:center">
        <a href="${resetLink}" class="btn">Reinitialiser mon mot de passe →</a>
      </p>
      <hr class="divider">
      <p style="font-size:12px;color:#4a6fa5">Ce lien expire dans 1 heure. Si vous n avez pas demande cette reinitialisation, ignorez cet email.</p>
    </div>
  `)
  return sendEmail(to, 'ORBIS — Reinitialisation de votre mot de passe', html)
}

export async function send2FAEmail(to: string, firstName: string, code: string) {
  const html = baseTemplate(`
    <div class="card">
      <h1>Code de verification ORBIS</h1>
      <p>Bonjour ${firstName},</p>
      <p>Voici votre code de verification a usage unique :</p>
      <div class="code">${code}</div>
      <p style="text-align:center;font-size:12px;color:#4a6fa5">Ce code expire dans 10 minutes.</p>
      <hr class="divider">
      <p style="font-size:12px;color:#4a6fa5">Si vous n avez pas tente de vous connecter, changez votre mot de passe immediatement.</p>
    </div>
  `)
  return sendEmail(to, 'ORBIS — Code de verification ' + code, html)
}

export async function sendDealNotificationEmail(to: string, firstName: string, dealTitle: string, amount: number) {
  const html = baseTemplate(`
    <div class="card">
      <h1>Nouveau deal sur ORBIS ! 💰</h1>
      <p>Bonjour ${firstName},</p>
      <p>Un nouveau deal correspondant a votre profil vient d etre publie :</p>
      <div style="background:#060e1a;border:1px solid #1e3a5f;border-radius:10px;padding:16px;margin:16px 0">
        <div style="font-size:16px;font-weight:900;margin-bottom:4px">${dealTitle}</div>
        <div style="font-size:24px;font-weight:900;color:#00c896">$${amount.toLocaleString()}</div>
      </div>
      <a href="https://orbis-smoky-gamma.vercel.app/marketplace" class="btn">Voir le deal →</a>
    </div>
  `)
  return sendEmail(to, 'ORBIS — Nouveau deal : ' + dealTitle, html)
}

export async function sendContractSignedEmail(to: string, firstName: string, contractTitle: string) {
  const html = baseTemplate(`
    <div class="card">
      <h1>Contrat signe ! ✅</h1>
      <p>Bonjour ${firstName},</p>
      <p>Le contrat <strong style="color:#fff">"${contractTitle}"</strong> a ete signe par toutes les parties.</p>
      <p>Votre paiement escrow sera libere apres confirmation de livraison.</p>
      <hr class="divider">
      <a href="https://orbis-smoky-gamma.vercel.app/contracts" class="btn">Voir mes contrats →</a>
    </div>
  `)
  return sendEmail(to, 'ORBIS — Contrat signe : ' + contractTitle, html)
}

export async function sendMessageNotificationEmail(to: string, firstName: string, senderName: string, preview: string) {
  const html = baseTemplate(`
    <div class="card">
      <h1>Nouveau message de ${senderName} 💬</h1>
      <p>Bonjour ${firstName},</p>
      <div style="background:#060e1a;border-left:3px solid #B22234;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0">
        <div style="font-size:13px;color:#c8d8f0">${preview}</div>
      </div>
      <a href="https://orbis-smoky-gamma.vercel.app/messages" class="btn">Repondre →</a>
    </div>
  `)
  return sendEmail(to, 'ORBIS — Message de ' + senderName, html)
}
