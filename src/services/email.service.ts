import { EmailClient } from '@azure/communication-email';
import config from '../config/config.js';

const sendHtmlBodyEmail = async (to: string, subject: string, html: string) => {
  const azureEmailClient = new EmailClient(config.azure.emailServiceConnectionString);
  const emailMessage = {
    senderAddress: config.azure.emailSenderAddress,
    content: {
      subject,
      html
    },
    recipients: {
      to: [{ address: to }]
    }
  };
  const poller = await azureEmailClient.beginSend(emailMessage);
  await poller.pollUntilDone();
};

const sendResetPasswordEmail = async (to: { email: string; username: string }, token: string) => {
  const subject = 'Edubot: Password Reset Request';
  const resetPasswordLink = `${config.edubotLmsUiBaseUrl}/reset-password?token=${token}`;
  const text = `<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="background-color: #f9f9f9; border-radius: 5px; padding: 20px;">
    <div style="margin-bottom: 20px;">
        <img style="max-width: 200px; width: 150px;" src="https://edubotprodpublicassets.blob.core.windows.net/public-assets/edubot_logo_white_high_res.png" alt="Company Logo">
    </div>
        <h2 style="color: hsla(239, 59%, 28%, 1);">Password Reset Request</h2>
        <p>Hello ${to.username},</p>
        <p>We received a request to reset your password for your account. If you did not make this request, please ignore this email.</p>
        <p>To reset your password, please click the button below:</p>
        <a href="${resetPasswordLink}" style="display: inline-block; background-color: hsla(239, 59%, 28%, 1); color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin-top: 20px;">Reset Password</a>
        <p>This link will expire in 24 hours for security reasons.</p>
        <p>If you're having trouble clicking the button, copy and paste the following URL into your web browser:</p>
        <p>${resetPasswordLink}</p>
    </div>
    <div style="margin-top: 20px; font-size: 12px; color: #777;">
        <p>This is an automated message, please do not reply to this email. If you need assistance, please contact our support team.</p>
        <p>&copy; 2023 Your Company Name. All rights reserved.</p>
    </div>
</body>`;
  await sendHtmlBodyEmail(to.email, subject, text);
};

const sendVerificationEmail = async (
  to: { email: string; username: string; password?: string },
  token: string
) => {
  const subject = 'Welcome to Edubot - Your Account is Ready';
  // replace this url with the link to the email verification page of your front-end app
  const verificationEmailUrl = `${config.edubotLmsUiBaseUrl}/reset-password?token=${token}`;

  let passwordMessage = '';
  let buttonText = 'Set Password';

  if (to.password) {
    passwordMessage = `
        <p>Your temporary password is: <span style="font-weight: 600; color: rgb(29, 31, 114);">${to.password}</span></p>
        <p>For security reasons, we strongly recommend that you reset your password immediately.</p>
    `;
    buttonText = 'Reset Password';
  }

  const text = `<body style="font-family: Arial, sans-serif;line-height: 1.6;color: #333;">
    
    <div style="background-color: #f9f9f9; border-radius: 5px; padding: 20px;">
        <div style="">
        <img style="max-width: 200px; width: 150px;" src="https://edubotprodpublicassets.blob.core.windows.net/public-assets/edubot_logo_white_high_res.png" alt="Company Logo">
    </div>
    <h2 style="color: hsla(239, 59%, 28%, 1);">Welcome to Your New Account</h2>
        <p>Hello ${to.username},</p>
        <p>Your account has been successfully created.</p>
        ${passwordMessage}
        <p>Please click the button below to ${to.password ? 'reset' : 'set'} your password:</p>
        <a href="${verificationEmailUrl}" style="display: inline-block; background-color: hsla(239, 59%, 28%, 1); color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin-top: 20px;">${buttonText}</a>
        <p>This link will expire in 24 hours for security reasons.</p>
        <p>If you're having trouble clicking the button, copy and paste the following URL into your web browser:</p>
        <p>${verificationEmailUrl}</p>
    </div>
    <div style="margin-top: 20px; font-size: 12px; color: #777;">
        <p>This is an automated message, please do not reply to this email. If you need assistance, please contact our support team.</p>
        <p>© 2023 Your Company Name. All rights reserved.</p>
    </div>
</body>`;
  await sendHtmlBodyEmail(to.email, subject, text);
};

export default {
  sendHtmlBodyEmail,
  sendResetPasswordEmail,
  sendVerificationEmail
};
