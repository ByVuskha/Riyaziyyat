// EmailJS Configuration
// Get your keys from: https://www.emailjs.com/
const EMAILJS_CONFIG = {
    serviceId: 'service_3yho55d',  // EmailJS Service ID
    templateId: 'template_pb22glt', // EmailJS Template ID
    publicKey: 'KHhtmB4rDMpEz-ucJ'    // EmailJS Public Key
};

// Initialize EmailJS
function initEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_CONFIG.publicKey);
        console.log('✅ EmailJS initialized');
        return true;
    } else {
        console.error('❌ EmailJS library not loaded');
        return false;
    }
}

// Send verification email
async function sendVerificationEmail(toEmail, userName, verificationCode) {
    try {
        // Check if EmailJS is configured (check for placeholder values)
        if (EMAILJS_CONFIG.serviceId === 'YOUR_SERVICE_ID' || 
            EMAILJS_CONFIG.templateId === 'YOUR_TEMPLATE_ID' ||
            EMAILJS_CONFIG.publicKey === 'YOUR_PUBLIC_KEY') {
            console.warn('⚠️ EmailJS not configured, using demo mode');
            return {
                success: true,
                demo: true,
                code: verificationCode
            };
        }

        // Initialize EmailJS
        if (!initEmailJS()) {
            throw new Error('EmailJS initialization failed');
        }

        // Email template parameters
        const templateParams = {
            to_email: toEmail,
            to_name: userName,
            verification_code: verificationCode,
            site_name: 'Bizim Riyaziyyat',
            site_url: window.location.origin
        };

        // Send email via EmailJS
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            templateParams
        );

        console.log('✅ Email sent successfully:', response);
        
        return {
            success: true,
            demo: false,
            response: response
        };

    } catch (error) {
        console.error('❌ Email send failed:', error);
        
        // Fallback to demo mode
        return {
            success: true,
            demo: true,
            code: verificationCode,
            error: error.message
        };
    }
}

// Generate 6-digit verification code
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send welcome email after registration
async function sendWelcomeEmail(toEmail, userName) {
    try {
        if (EMAILJS_CONFIG.serviceId === 'YOUR_SERVICE_ID') {
            console.warn('⚠️ EmailJS not configured, skipping welcome email');
            return { success: true, demo: true };
        }

        if (!initEmailJS()) {
            throw new Error('EmailJS initialization failed');
        }

        const templateParams = {
            to_email: toEmail,
            to_name: userName,
            site_name: 'Bizim Riyaziyyat',
            site_url: window.location.origin,
            dashboard_url: window.location.origin + '/dashboard.html'
        };

        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            'welcome_template', // You need to create this template in EmailJS
            templateParams
        );

        console.log('✅ Welcome email sent:', response);
        return { success: true, demo: false };

    } catch (error) {
        console.error('❌ Welcome email failed:', error);
        return { success: false, error: error.message };
    }
}

// Send password reset email
async function sendPasswordResetEmail(toEmail, userName, resetCode) {
    try {
        if (EMAILJS_CONFIG.serviceId === 'YOUR_SERVICE_ID') {
            console.warn('⚠️ EmailJS not configured, using demo mode');
            return { success: true, demo: true, code: resetCode };
        }

        if (!initEmailJS()) {
            throw new Error('EmailJS initialization failed');
        }

        const templateParams = {
            to_email: toEmail,
            to_name: userName,
            reset_code: resetCode,
            site_name: 'Bizim Riyaziyyat',
            site_url: window.location.origin
        };

        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            'reset_template', // You need to create this template in EmailJS
            templateParams
        );

        console.log('✅ Password reset email sent:', response);
        return { success: true, demo: false };

    } catch (error) {
        console.error('❌ Password reset email failed:', error);
        return { success: true, demo: true, code: resetCode };
    }
}
