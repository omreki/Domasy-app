require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const supabase = require('../config/supabase');

(async () => {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('settings')
            .eq('id', 'email_config')
            .single();

        if (error) {
            console.error('Error fetching settings:', error.message);
        } else {
            console.log('Current Email Settings in DB:');
            const s = data.settings || {};
            console.log(JSON.stringify({
                smtpHost: s.smtpHost,
                smtpPort: s.smtpPort,
                smtpUser: s.smtpUser,
                senderEmail: s.senderEmail,
                // Masking password
                smtpPass: s.smtpPass ? '********' : '(not set)'
            }, null, 2));

            if (s.smtpHost && s.smtpHost.includes('@')) {
                console.log('\n⚠️  WARNING: smtpHost looks like an email address!');
                console.log('   Expected format: smtp.gmail.com, smtp.office365.com, etc.');
            }
        }
    } catch (err) {
        console.error('Script error:', err);
    }
    process.exit(0);
})();
