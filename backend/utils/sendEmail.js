const transporter = require("../config/mailer");

const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Ayrene App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent:", info.messageId);
  } catch (error) {
    console.error("❌ EMAIL ERROR:", error);
    throw new Error("Email sending failed");
  }
};

module.exports = sendEmail;