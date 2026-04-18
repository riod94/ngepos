import nodemailer from "nodemailer";
import crypto from "crypto";

// Configuration for SMTP Sumopod from environment variables
const SMTP_HOST = process.env.SMTP_HOST || "smtp.sumopod.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || `"Ngepos Auth" <auth@ngepos.id>`;
const SITE_URL = process.env.SITE_URL || "http://localhost:5173";

const transporter = nodemailer.createTransport({
	host: SMTP_HOST,
	port: SMTP_PORT,
	secure: SMTP_PORT === 465, // SSL: True if port is 465
	auth: {
		user: SMTP_USER,
		pass: SMTP_PASS,
	},
	// Prevent hanging if SMTP is unreachable
	connectionTimeout: 5000, // 5 seconds
	greetingTimeout: 5000,
	socketTimeout: 5000,
	// TLS configuration for better deliverability
	tls: {
		rejectUnauthorized: false, // Allow self-signed certs if needed
		minVersion: "TLSv1.2",
	},
});

/**
 * Generate a unique Message-ID for each email to improve deliverability
 */
function generateMessageId(): string {
	const domain = SMTP_FROM.match(/@([\w.-]+)/)?.[1] || "ngepos.id";
	return `<${crypto.randomUUID()}@${domain}>`;
}

/**
 * Sends a verification code (OTP) via email.
 */
export async function sendVerificationEmail(to: string, otpCode: string) {
	try {
		const info = await transporter.sendMail({
			from: SMTP_FROM,
			to,
			subject: `[Ngepos] Kode Verifikasi: ${otpCode}`,
			text: `Kode verifikasi Anda adalah: ${otpCode}. Kode ini akan kedaluwarsa dalam 15 menit.`,
			html: `
				<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #ffffff;">
					<div style="text-align: center; margin-bottom: 30px;">
						<div style="display: inline-block; padding: 15px; background: #EEF2FF; border-radius: 12px;">
							<img src="https://sumopod.com/logo.png" alt="Ngepos Logo" style="width: 48px; height: 48px;" onerror="this.style.display='none'" />
						</div>
					</div>
					<h2 style="color: #111827; text-align: center; font-size: 24px; font-weight: 800; margin-bottom: 10px;">Verifikasi Akun Anda</h2>
					<p style="color: #4B5563; font-size: 16px; line-height: 24px; text-align: center;">Halo, gunakan kode di bawah ini untuk mengaktifkan akun <b>Ngepos</b> Anda:</p>
					
					<div style="background: #F9FAFB; border: 2px dashed #E5E7EB; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
						<h1 style="letter-spacing: 10px; color: #4F46E5; margin: 0; font-size: 36px; font-weight: 900;">${otpCode}</h1>
					</div>
					
					<p style="color: #6B7280; font-size: 14px; text-align: center;">Kode ini berlaku selama <b>15 menit</b>. Jika Anda tidak merasa melakukan pendaftaran, abaikan email ini.</p>
					
					<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center;">
						<p style="color: #9CA3AF; font-size: 12px;">© 2026 Ngepos.id - Sistem Kasir Modern</p>
					</div>
				</div>
			`,
			headers: {
				"X-Priority": "3",
				"X-Mailer": "NgeposMailer-v1",
				"Message-ID": generateMessageId(),
				"List-Unsubscribe": `<mailto:support@ngepos.id?subject=unsubscribe>`,
				"List-Id": `Ngepos Authentication <auth.ngepos.id>`,
				"Precedence": "bulk",
				"X-Auto-Response-Suppress": "OOF, AutoReply",
			},
		});

		console.log("Verification email sent: %s", info.messageId);
		return true;
	} catch (error) {
		console.error("Failed to send verification email:", error);
		return false;
	}
}

/**
 * Sends a password reset link via email.
 */
export async function sendPasswordResetEmail(to: string, resetToken: string) {
	try {
		const resetUrl = `${SITE_URL}/reset-password?token=${resetToken}`;

		const info = await transporter.sendMail({
			from: SMTP_FROM,
			to,
			subject: `[Ngepos] Reset Password Akun Anda`,
			text: `Anda menerima email ini karena kami menerima permintaan reset password untuk akun Anda.\n\nKlik link berikut untuk mereset password Anda (berlaku 1 jam):\n${resetUrl}\n\nJika Anda tidak merasa melakukan permintaan ini, abaikan email ini dan password Anda tidak akan diubah.`,
			html: `
				<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #ffffff;">
					<div style="text-align: center; margin-bottom: 30px;">
						<div style="display: inline-block; padding: 15px; background: #EEF2FF; border-radius: 12px;">
							<img src="https://sumopod.com/logo.png" alt="Ngepos Logo" style="width: 48px; height: 48px;" onerror="this.style.display='none'" />
						</div>
					</div>
					<h2 style="color: #111827; text-align: center; font-size: 24px; font-weight: 800; margin-bottom: 10px;">Reset Password</h2>
					<p style="color: #4B5563; font-size: 16px; line-height: 24px; text-align: center;">Anda menerima email ini karena kami menerima permintaan reset password untuk akun <b>Ngepos</b> Anda.</p>
					
					<div style="text-align: center; margin: 30px 0;">
						<a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase;">
							Reset Password Saya
						</a>
					</div>
					
					<div style="background: #F9FAFB; border: 1px solid #E5E7EB; padding: 20px; border-radius: 12px; margin: 20px 0;">
						<p style="color: #6B7280; font-size: 13px; text-align: center; margin: 0;">Jika tombol di atas tidak berfungsi, salin dan tempel link berikut di browser Anda:</p>
						<p style="color: #4F46E5; font-size: 12px; text-align: center; word-break: break-all; margin: 10px 0 0 0;">${resetUrl}</p>
					</div>
					
					<p style="color: #6B7280; font-size: 14px; text-align: center;">Link ini berlaku selama <b>1 jam</b>. Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini dan password Anda tidak akan diubah.</p>
					
					<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center;">
						<p style="color: #9CA3AF; font-size: 12px;">© 2026 Ngepos.id - Sistem Kasir Modern</p>
					</div>
				</div>
			`,
			headers: {
				"X-Priority": "3",
				"X-Mailer": "NgeposMailer-v1",
				"Message-ID": generateMessageId(),
				"List-Unsubscribe": `<mailto:support@ngepos.id?subject=unsubscribe>`,
				"List-Id": `Ngepos Authentication <auth.ngepos.id>`,
				"Precedence": "bulk",
				"X-Auto-Response-Suppress": "OOF, AutoReply",
			},
		});

		console.log("Password reset email sent: %s", info.messageId);
		return true;
	} catch (error) {
		console.error("Failed to send password reset email:", error);
		return false;
	}
}
