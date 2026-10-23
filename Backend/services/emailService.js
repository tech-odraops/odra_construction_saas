
const { Resend } = require("resend");

if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing from environment variables.");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "OdraOps <noreply@odraops.com>";

exports.sendPasswordResetEmail = async (email, resetUrl) => {
    const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [email],
        subject: "Reset your OdraOps password",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #222;">
                <h2>Reset your password</h2>
                <p>We received a request to reset your OdraOps account password.</p>
                <p>Click the button below to choose a new password. This link expires in 30 minutes.</p>
                <p style="margin: 28px 0;">
                    <a href="${resetUrl}"
                       style="background: #172554; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Reset Password
                    </a>
                </p>
                <p>If you did not request this, you can safely ignore this email.</p>
                <p style="font-size: 12px; color: #666;">
                    If the button does not work, copy and paste this URL into your browser:<br>
                    <a href="${resetUrl}">${resetUrl}</a>
                </p>
                <p style="font-size: 12px; color: #666;">OdraOps</p>
            </div>
        `
    });

    if (error) {
        throw new Error(error.message || "Failed to send password reset email.");
    }

    return data;
};
