require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const EmailService = require('../services/emailService');

(async () => {
    console.log('Attempting to send test email to omrekilimited@gmail.com...');
    try {
        const result = await EmailService.sendEmail({
            to: 'omrekilimited@gmail.com',
            subject: 'Domasy System - Test Email',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                    <h2 style="color: #4f46e5;">Test Email</h2>
                    <p>This is a test email from your <strong>Domasy Document Management System</strong>.</p>
                    <p>If you are reading this, your SMTP configuration is working correctly!</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">Sent from Domasy Server Script</p>
                </div>
            `,
            text: 'This is a test email from the Domasy Document Management System. If you are reading this, your configuration is working.'
        });

        if (result) {
            console.log('✅ Successfully sent email.');
            console.log('Message ID:', result.messageId);
        } else {
            console.error('❌ Failed to send email. Please check server logs for details.');
        }
    } catch (error) {
        console.error('❌ Script error:', error);
    }
    process.exit(0);
})();
