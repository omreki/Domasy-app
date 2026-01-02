const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs'); // Only if we keep password hashing separate, but we should use Supabase Auth

const TABLE = 'users';

class UserService {
    // Create user (This now likely creates a profile in public.users, 
    // real auth user creation should happen via Supabase Auth API)
    // However, if this is called by Admin to add a user, we might need to use supabase.auth.admin.createUser
    // Create user profile (Sync from Auth)
    static async createProfile(userData) {
        const userProfile = {
            id: userData.id,
            name: userData.name,
            email: userData.email.toLowerCase(),
            role: userData.role || 'Viewer',
            status: userData.status || 'Active', // Default to Active
            avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=4F46E5&color=fff`,
            department: userData.department || null,
            updated_at: new Date()
        };

        const { data, error } = await supabase
            .from(TABLE)
            .upsert(userProfile, { onConflict: 'id' })
            .select()
            .single();

        if (error) throw new Error(`Database Error: ${error.message}`);
        return data;
    }

    // Create user (Admin/System)
    static async create(userData) {
        // 1. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true, // Auto confirm if created by admin
            user_metadata: { name: userData.name }
        });

        if (authError) throw new Error(`Auth Error: ${authError.message}`);

        // 2. Create Profile in public.users
        return await this.createProfile({
            id: authData.user.id,
            ...userData
        });
    }

    // Find user by email
    static async findByEmail(email) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'not found'
        return data;
    }

    // Find user by ID
    static async findById(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }

    // Update user
    static async update(id, updateData) {
        // Filter out undefined/null values to avoid overwriting with nulls
        const cleanData = {};
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                cleanData[key] = updateData[key];
            }
        });

        const updates = {
            ...cleanData,
            updated_at: new Date()
        };

        const { data, error } = await supabase
            .from(TABLE)
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw new Error(error.message);

        // Return the first result or null
        if (!data || data.length === 0) {
            throw new Error('User not found or no changes made');
        }

        return data[0];
    }

    // Update last login
    static async updateLastLogin(id) {
        await supabase
            .from(TABLE)
            .update({ last_login: new Date() })
            .eq('id', id);
    }

    // Get all users with filters
    static async getAll(filters = {}) {
        let query = supabase.from(TABLE).select('*');

        if (filters.role) {
            query = query.eq('role', filters.role);
        }

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        // Search
        if (filters.search) {
            query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
        }

        // Pagination
        const limit = filters.limit ? parseInt(filters.limit) : 100;
        const page = filters.page || 1;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data, error } = await query;

        if (error) throw new Error(error.message);
        return data;
    }

    // Compare password - DEPRECATED/UNUSED with Supabase Auth
    // But kept to avoid breaking calls if any (though we should remove calls)
    static async comparePassword(plainPassword, hashedPassword) {
        // Supabase handles this. If this is called, it's likely a mistake in migration.
        // Returning true to bypass if legacy code calls it, BUT strictly we should remove usage.
        console.warn('UserService.comparePassword called - this should not happen with Supabase Auth');
        return false;
    }

    // Delete user
    static async delete(id) {
        // 1. Orphanize Audit Logs (Set user_id to null)
        const { error: auditError } = await supabase
            .from('audit_logs')
            .update({ user_id: null })
            .eq('user_id', id);

        if (auditError) console.warn('Failed to orphan audit logs', auditError);

        // 2. Orphanize Projects (Set created_by to null)
        const { error: projectError } = await supabase
            .from('projects')
            .update({ created_by: null })
            .eq('created_by', id);

        if (projectError) console.warn('Failed to orphan projects', projectError);

        // 3. Orphanize Documents (Set uploaded_by, current_approver to null)
        const { error: docError } = await supabase
            .from('documents')
            .update({ uploaded_by: null, current_approver: null })
            .or(`uploaded_by.eq.${id},current_approver.eq.${id}`);

        if (docError) console.warn('Failed to orphan documents', docError);

        // 4. Delete from Auth (this usually triggers public profile delete if cascaded, or we do it manually)
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError) throw new Error(authError.message);

        // 5. Ensure public profile is gone
        const { error } = await supabase.from(TABLE).delete().eq('id', id);
        if (error && error.code !== 'PGRST116') throw new Error(error.message);
    }

    // Count users
    static async count(filters = {}) {
        let query = supabase.from(TABLE).select('*', { count: 'exact', head: true });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        const { count, error } = await query;
        if (error) throw new Error(error.message);
        return count;
    }
}

module.exports = UserService;
