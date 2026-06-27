const nodemailer = require('nodemailer');

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
};

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(payload),
});

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...jsonHeaders,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { success: false, message: 'Method not allowed.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, { success: false, message: 'Invalid JSON body.' });
  }

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();

  if (!name || !email || !message) {
    return jsonResponse(400, { success: false, message: 'All fields are required.' });
  }

  if (!isValidEmail(email)) {
    return jsonResponse(400, { success: false, message: 'A valid email is required.' });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  const recipientEmail = process.env.RECIPIENT_EMAIL;

  if (!gmailUser || !gmailPass || !recipientEmail) {
    return jsonResponse(500, {
      success: false,
      message: 'Email configuration is missing. Set GMAIL_USER, GMAIL_PASS, and RECIPIENT_EMAIL in environment variables.',
    });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const mailOptions = {
    from: `"${name}" <${gmailUser}>`,
    to: recipientEmail,
    replyTo: email,
    subject: `New contact form message from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    html: `<h2>New message from portfolio</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    return jsonResponse(200, { success: true, message: 'Email sent successfully.' });
  } catch (error) {
    console.error('Email send error:', error);
    return jsonResponse(500, {
      success: false,
      message: 'Unable to send email. Please try again later.',
    });
  }
};