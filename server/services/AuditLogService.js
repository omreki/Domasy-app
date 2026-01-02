const supabase = require('../config/supabase');

const TABLE = 'audit_logs';

class AuditLogService {
    // Create log
    static async create(logData) {
        try {
            const log = {
                user_id: logData.user ? logData.user.toString() : null,
                action: logData.action,
                action_type: logData.actionType || 'info',
                document_id: logData.document ? logData.document.toString() : null,
                document_title: logData.documentTitle || null,
                project_id: logData.project ? logData.project.toString() : null,
                details: logData.details || '',
                ip_address: logData.ipAddress || null,
                user_agent: logData.userAgent || null,
                automated: logData.automated || false,
                metadata: logData.metadata || {},
                created_at: new Date()
            };

            const { data, error } = await supabase
                .from(TABLE)
                .insert(log)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating audit log:', error);
            return null;
        }
    }

    // Get all logs
    static async getAll(filters = {}, options = {}) {
        let query = supabase.from(TABLE).select('*');

        if (filters.user) query = query.eq('user_id', filters.user);
        if (filters.action) query = query.eq('action', filters.action);
        if (filters.startDate) query = query.gte('created_at', filters.startDate);
        if (filters.endDate) query = query.lte('created_at', filters.endDate);

        // Pagination
        const limit = options.limit || 50;
        const page = options.page || 1;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data, error } = await query;
        if (error) throw error;

        return data;
    }

    // Count logs
    static async count(filters = {}) {
        let query = supabase.from(TABLE).select('*', { count: 'exact', head: true });

        if (filters.user) query = query.eq('user_id', filters.user);
        if (filters.action) query = query.eq('action', filters.action);

        const { count, error } = await query;
        if (error) throw error;
        return count;
    }
}

module.exports = AuditLogService;
