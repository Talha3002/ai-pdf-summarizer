
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: 'tarehman1@gmail.com', 
        pass: 'yguf kpgq okee mjze'
    }
});

// Function to send an email
const sendRegistrationEmail = async (toEmail, userName) => {
    try {
        const mailOptions = {
            from: '"AI PDF Summarizer" <tarehman1@gmail.com>',
            to: toEmail, 
            subject: 'Welcome to AI PDF Summarizer!', 
            html: `
                <h1>Welcome, ${userName}!</h1>
                <p>Thank you for signing up for AI PDF Summarizer. We're excited to have you on board!</p>
                <p>Feel free to explore our platform and enjoy your journey.</p>
                <p>Best Regards,<br>AI PDF Summarize</p>
            ` 
        };

        await transporter.sendMail(mailOptions);
        console.log('Registration email sent successfully!');
    } catch (error) {
        console.error('Error sending registration email:', error);
    }
};

module.exports = { sendRegistrationEmail };
