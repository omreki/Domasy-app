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

// Diagnostic check (Masked)
if (supabaseKey) {
    console.log(`[Supabase] Client initialized with key starting with: ${supabaseKey.substring(0, 10)}...`);
    // Check if it's a service role key (contains service_role in JWT)
    if (supabaseKey.includes('service_role') || supabaseKey.length > 100) {
        console.log('[Supabase] Using Service Role Key (should bypass RLS)');
    } else {
        console.warn('[Supabase] Warning: Key does not look like a Service Role Key. Storage uploads may fail due to RLS.');
    }
}

// Initialize storage buckets (Exported to be called manually if needed)
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

        const { error: tableError } = await supabase.from('system_settings').select('id').limit(1);
        if (tableError && tableError.message.includes('not found')) {
            console.warn('⚠️  system_settings table missing. Please run the SQL schema.');
        }
    } catch (err) {
        console.warn('Storage bucket initialization failed (check permissions):', err.message);
    }
};

// Auto-initialize buckets on startup
initBuckets().then(() => {
    console.log('[Supabase] Storage buckets initialized');
}).catch(err => {
    console.error('[Supabase] Bucket initialization failed:', err);
});

module.exports = supabase;
module.exports.initBuckets = initBuckets;
