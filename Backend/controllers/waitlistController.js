const Waitlist = require('../models/Waitlist');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'nitinmohapatra26@gmail.com';


// Email to the person who registered
const sendUserConfirmationEmail = async (ownerName, companyName, email, phone) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You’re officially on the ODRAOPS list.</title>
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 560px; margin: 40px auto; background: #ffffff;
                     border-radius: 16px; overflow: hidden;
                     box-shadow: 0 4px 24px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: #0f172a; padding: 36px 40px; text-align: center; border-bottom: 3px solid #ff5500; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
        .header h1 span { color: #ff5500; font-weight: 900; }
        .body { padding: 36px 40px; color: #334155; line-height: 1.7; font-size: 15px; }
        .body p { margin: 0 0 16px; color: #334155; }
        .footer { background: #f1f5f9; text-align: center; padding: 20px;
                  font-size: 13px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header" style="background: #0f172a; padding: 36px 40px; text-align: center; border-bottom: 3px solid #ff5500;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; font-family: 'Inter', Arial, sans-serif;">ODRA<span style="color: #ff5500; font-weight: 900;"> OPS</span></h1>
        </div>
        <div class="body">
          <p>Thank you for registering.</p>
          <p>ODRAOPS isn’t generic software that forces you to change how you operate. Every firm works differently, so we build ODRAOPS around your unique workflow, not the other way around.</p>
          <p>That’s why we’re building it for just 11 development firms.</p>
          <p>Each firm gets a dedicated team to implement, adapt, and continuously optimise the platform around how your projects actually run. We’d rather serve 11 firms exceptionally well than give 500 companies a template experience.</p>
          <p>You’ve registered before those 11 spots are filled.</p>
          <p>We’ll share more about ODRAOPS and what being one of the first 11 means in the coming days. If your company is a fit, you’ll hear from us directly.</p>
          <p>Until then, keep this in mind:</p>
          <p><strong>Know what’s happening before you have to ask.</strong></p>
          <p style="margin-top: 24px; font-weight: 600;">— Team ODRAOPS</p>
        </div>
        <div class="footer">© ${new Date().getFullYear()} ODRAOPS. All rights reserved.</div>
      </div>
    </body>
    </html>
    `;
    try {
        const { data, error } = await resend.emails.send({
            from: 'OdraOps <noreply@odraops.com>',
            to: email,
            subject: "You�re officially on the ODRAOPS list.",
            html,
        });
        if (error) throw error;
        console.log('Resend user confirmation email sent:', data.id);
        return data;
    } catch (err) {
        console.error('Error sending user email:', err);
    }
};

// Email to admin
const sendAdminNotificationEmail = async (ownerName, companyName, email, phone) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 520px; margin: 40px auto; background: #fff;
                     border-radius: 12px; overflow: hidden;
                     box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .header { background: #0f172a; padding: 28px 36px; }
        .header h2 { color: #ff5500; margin: 0; font-size: 20px; }
        .body { padding: 28px 36px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 10px 0; border-bottom: 1px solid #f1f5f9;
             color: #334155; font-size: 15px; }
        td:first-child { font-weight: 600; color: #0f172a; width: 40%; }
        .footer { text-align: center; padding: 16px; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h2>New Waitlist Registration</h2></div>
        <div class="body">
          <p style="color:#475569; margin:0 0 20px;">A new firm has applied for ODRAOPS priority access.</p>
          <table>
            <tr><td>Company Name</td><td>${companyName}</td></tr>
            <tr><td>Owner / Director</td><td>${ownerName}</td></tr>
            <tr><td>Email</td><td>${email}</td></tr>
            <tr><td>Phone Number</td><td>${phone}</td></tr>
            <tr><td>Registered At</td><td>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>
          </table>
        </div>
        <div class="footer">ODRAOPS Admin Notification System</div>
      </div>
    </body>
    </html>
    `;
    try {
        const { data, error } = await resend.emails.send({
            from: 'OdraOps <noreply@odraops.com>',
            to: ADMIN_EMAIL,
            subject: `New Waitlist Application: ${companyName} (${ownerName})`,
            html,
        });
        if (error) throw error;
        console.log('Resend admin notification email sent:', data.id);
        return data;
    } catch (err) {
        console.error('Error sending admin notification email:', err);
    }
};

// Controller: POST /waitlist
exports.joinWaitlist = async (req, res) => {
    try {
        const { companyName, ownerName, email, phone } = req.body;

        if (!companyName || !ownerName || !email || !phone) {
            return res.status(400).json({ success: false, message: 'All fields (Company Name, Owner/Director, Work Email, and Phone Number) are required.' });
        }

        // Check duplicate email
        const existing = await Waitlist.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'This email is already registered on the waitlist!',
            });
        }

        const entry = await Waitlist.create({ companyName, ownerName, email, phone });

        // Fire emails concurrently
        Promise.all([
            sendUserConfirmationEmail(ownerName, companyName, email, phone),
            sendAdminNotificationEmail(ownerName, companyName, email, phone),
        ]).catch(err => console.error('Email send error:', err));

        return res.status(201).json({
            success: true,
            message: 'Application submitted successfully! Our team will contact you shortly.',
            data: { id: entry._id, email: entry.email, phone: entry.phone },
        });
    } catch (error) {
        console.error('Waitlist error:', error);
        return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
};

// Controller: GET /waitlist (admin only)
exports.getWaitlist = async (req, res) => {
    try {
        const entries = await Waitlist.find().sort({ createdAt: -1 });
        return res.status(200).json({ success: true, count: entries.length, data: entries });
    } catch (error) {
        console.error('Get waitlist error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// Controller: DELETE /waitlist/:id (admin only)
exports.deleteWaitlistEntry = async (req, res) => {
    try {
        const { id } = req.params;
        await Waitlist.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: 'Entry removed.' });
    } catch (error) {
        console.error('Delete waitlist error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};
