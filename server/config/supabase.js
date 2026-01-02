require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role Key for backend admin privileges

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Supabase URL or Service Role Key missing. Check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Initialize storage buckets
const initBuckets = async () => {
    try {
        const buckets = ['avatars', 'branding', 'documents'];
        for (const bucket of buckets) {
            const { data, error } = await supabase.storage.getBucket(bucket);
            if (error && (error.message?.includes('not found') || error.code === 'not_found')) {
                console.log(`Creating bucket: ${bucket}`);
                await supabase.storage.createBucket(bucket, { public: true });
            }
        }

        // Initialize system_settings table if needed (rpc or simple query check)
        // Note: Supabase doesn't allow 'CREATE TABLE' via JS client usually, 
        // but we can check if it exists by querying it.
        const { error: tableError } = await supabase.from('system_settings').select('id').limit(1);
        if (tableError && tableError.message.includes('not found')) {
            console.warn('⚠️  system_settings table missing. Please run the SQL schema.');
        }
    } catch (err) {
        console.warn('Storage bucket initialization failed (check permissions):', err.message);
    }
};

initBuckets();

module.exports = supabase;
