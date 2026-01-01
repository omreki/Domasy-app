const { db, FieldValue } = require('../config/firebase');

const COLLECTION = 'audit_logs';

class AuditLogService {
    // Create log
    static async create(logData) {
        try {
            const docRef = db.collection(COLLECTION).doc();

            const log = {
                id: docRef.id,
                user: logData.user ? logData.user.toString() : null, // Store User ID
                action: logData.action,
                actionType: logData.actionType || 'info',
                document: logData.document ? logData.document.toString() : null,
                documentTitle: logData.documentTitle || null,
                project: logData.project ? logData.project.toString() : null,
                details: logData.details || '',
                ipAddress: logData.ipAddress || null,
                userAgent: logData.userAgent || null,
                automated: logData.automated || false,
                metadata: logData.metadata || {},
                createdAt: FieldValue.serverTimestamp()
            };

            await docRef.set(log);
            return log;
        } catch (error) {
            console.error('Error creating audit log:', error);
            // Don't crash app on audit log error
            return null;
        }
    }

    // Get all logs
    static async getAll(filters = {}, options = {}) {
        let query = db.collection(COLLECTION).orderBy('createdAt', 'desc');

        if (filters.user) {
            query = query.where('user', '==', filters.user);
        }

        if (filters.action) {
            query = query.where('action', '==', filters.action);
        }

        if (filters.startDate) {
            query = query.where('createdAt', '>=', new Date(filters.startDate));
        }

        if (filters.endDate) {
            query = query.where('createdAt', '<=', new Date(filters.endDate));
        }

        // Pagination
        const limit = options.limit || 50;
        const page = options.page || 1;

        query = query.limit(limit);

        if (page > 1) {
            const offset = (page - 1) * limit;
            query = query.offset(offset);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => doc.data());
    }

    // Count logs
    static async count(filters = {}) {
        let query = db.collection(COLLECTION);

        if (filters.user) query = query.where('user', '==', filters.user);
        if (filters.action) query = query.where('action', '==', filters.action);

        const snapshot = await query.get();
        return snapshot.size;
    }
}

module.exports = AuditLogService;
