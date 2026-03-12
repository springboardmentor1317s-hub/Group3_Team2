const nodemailer = require('nodemailer');

// We use Ethereal Email for fake/testing SMTP.
// This allows testing email functionality without requiring the user to
// set up real Gmail App Passwords.
let testAccount = null;
let transporter = null;

// Initialize the test email transporter asynchronously
async function initTransporter() {
  try {
    if (!testAccount) {
      testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user, // generated ethereal user
          pass: testAccount.pass, // generated ethereal password
        },
      });
      console.log('✉️  Ethereal Email Transporter Initialized.');
    }
  } catch (error) {
    console.error('Failed to initialize test email transporter', error);
  }
}

initTransporter();

/**
 * Sends a registration confirmation email.
 * @param {string} toEmail - The email address to send to
 * @param {Object} eventDetails - Details of the event (title, venue, dates, etc.)
 * @param {string} selectedSlot - The time slot selected, if any.
 */
async function sendRegistrationConfirmation(toEmail, eventDetails, selectedSlot) {
  if (!transporter) {
    await initTransporter();
  }

  try {
    const slotMessage = selectedSlot 
      ? `You have successfully booked the following time slot: <strong>${selectedSlot}</strong><br><br>`
      : ``;

    const info = await transporter.sendMail({
      from: '"CampusEventHub" <noreply@campuseventhub.com>', 
      to: toEmail, 
      subject: `Registration Confirmed: ${eventDetails.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">Registration Confirmed! 🎉</h2>
          <p>Hi there,</p>
          <p>Your registration for <strong>${eventDetails.title}</strong> has been received and is waiting for approval.</p>
          ${slotMessage}
          <h3>Event Details:</h3>
          <ul>
            <li><strong>Organizer:</strong> ${eventDetails.organizer}</li>
            <li><strong>Venue:</strong> ${eventDetails.venue}</li>
            <li><strong>Timing:</strong> ${new Date(eventDetails.startDate).toLocaleString()}</li>
          </ul>
          <p>You can check the latest status of your registration from your Student Dashboard.</p>
          <hr>
          <p style="font-size: 12px; color: #888;">This is an automated message from CampusEventHub.</p>
        </div>
      `,
    });

    console.log(`\n📧 Email sent: ${info.messageId}`);
    console.log(`🔗 Preview URL: ${nodemailer.getTestMessageUrl(info)}\n`);
    
    return info;
  } catch (error) {
    console.error('Email Sending Error:', error);
    return null;
  }
}

module.exports = {
  sendRegistrationConfirmation
};
