const supabase = require('../config/supabase');
const fs = require('fs');

const TABLE = 'documents';
const BUCKET = 'documents';

const { generateThumbnail } = require('../utils/thumbnailGenerator');

class DocumentService {
    // Helper to upload file to storage
    static async uploadFileToStorage(file) {
        if (!file) return null;

        try {
            // Support both buffer (memoryStorage) and path (diskStorage)
            const fileContent = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
            if (!fileContent) throw new Error('File content missing');

            const storagePath = `uploads/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

            // Upload to Supabase Storage
            const { data: storageData, error: storageError } = await supabase.storage
                .from(BUCKET)
                .upload(storagePath, fileContent, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (storageError) throw new Error(`Storage Error: ${storageError.message}`);

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(storagePath);

            const fileData = {
                file_name: file.filename || file.originalname,
                file_original_name: file.originalname,
                file_mimetype: file.mimetype,
                file_size: file.size,
                file_path: storageData.path, // Supabase storage path
                file_url: publicUrl
            };

            // Cleanup local file if it exists
            if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

            return fileData;
        } catch (err) {
            console.error('[DocumentService] File storage failed:', err);
            if (err.message && err.message.includes('row-level security policy')) {
                console.error('[DocumentService] RLS Violation detected. Ensure you are using the SERVICE_ROLE_KEY for backend uploads and that the bucket exists.');
            }
            throw new Error(`File upload helper failed: ${err.message}`);
        }
    }

    // Create document
    static async create(documentData, file) {
        let fileData = null;
        let thumbnail = null;

        if (file) {
            // Generate Thumbnail if PDF
            if (file.mimetype === 'application/pdf') {
                thumbnail = await generateThumbnail(file);
            }

            fileData = await this.uploadFileToStorage(file);
        }

        const document = {
            title: documentData.title,
            description: documentData.description || null,
            category: documentData.category, // assuming string
            status: documentData.status || 'Uploaded',

            // File fields
            ...(fileData || {}),

            thumbnail: thumbnail || documentData.thumbnail || null,
            version: 1,
            uploaded_by: documentData.uploadedBy, // from req.user.id
            current_approver: (documentData.currentApprover && documentData.currentApprover !== '') ? documentData.currentApprover : null,
            approval_stage: documentData.approvalStage || 'Manager Review',
            project_id: (documentData.project && documentData.project !== 'null' && documentData.project !== '') ? documentData.project : null,
            tags: documentData.tags || [],
            virus_scan_status: 'Passed',
            metadata: documentData.metadata || {},

            created_at: new Date(),
            updated_at: new Date()
        };

        const { data, error } = await supabase
            .from(TABLE)
            .insert(document)
            .select()
            .single();

        if (error) throw new Error(`Database Error: ${error.message}`);

        return data;
    }

    // Find document by ID
    static async findById(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }

    // Get all documents with filters
    static async getAll(filters = {}, options = {}) {
        let query = supabase.from(TABLE).select('*');

        // Apply filters
        if (filters.category) query = query.eq('category', filters.category);
        if (filters.status) query = query.eq('status', filters.status);
        if (filters.uploadedBy) query = query.eq('uploaded_by', filters.uploadedBy);
        if (filters.currentApprover) query = query.eq('current_approver', filters.currentApprover);
        if (filters.project) query = query.eq('project_id', filters.project); // mapped project -> project_id

        // Search
        if (filters.search) {
            query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        // Pagination
        const limit = options.limit || 50;
        const page = options.page || 1;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data;
    }

    // Update document
    static async update(id, updateData) {
        const updates = {
            ...updateData,
            updated_at: new Date()
        };

        // Sanitize
        delete updates._id;
        delete updates.reviewers; // Handled separately in controller
        delete updates.teamMembers;
        delete updates.uploadedBy; // Should not change

        // Map camelCase to snake_case if valid
        if (updates.approvalStage) {
            updates.approval_stage = updates.approvalStage;
            delete updates.approvalStage;
        }
        if (updates.currentApprover !== undefined) {
            updates.current_approver = (updates.currentApprover && updates.currentApprover !== '') ? updates.currentApprover : null;
            delete updates.currentApprover;
        }
        if (updates.project !== undefined) {
            updates.project_id = (updates.project && updates.project !== '' && updates.project !== 'null') ? updates.project : null;
            delete updates.project;
        }

        const { data, error } = await supabase
            .from(TABLE)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    // Delete document
    static async delete(id) {
        const document = await this.findById(id);
        if (!document) throw new Error('Document not found');

        // 1. Delete associated Audit Logs (Foreign Key Constraint)
        const { error: auditError } = await supabase
            .from('audit_logs')
            .delete()
            .eq('document_id', id);

        if (auditError) throw new Error(`Failed to clean up audit logs: ${auditError.message}`);

        // 2. Delete associated Approval Workflow
        // (Schema has ON DELETE CASCADE usually, but let's be safe if it doesn't)
        const { error: workflowError } = await supabase
            .from('approval_workflows')
            .delete()
            .eq('document_id', id);

        if (workflowError && workflowError.code !== 'PGRST116') {
            console.warn('Failed to delete workflow (might not exist or cascaded):', workflowError.message);
        }

        // 3. Delete from Storage
        if (document.file_path) {
            const { error: storageError } = await supabase.storage
                .from(BUCKET)
                .remove([document.file_path]);

            if (storageError) console.warn('Failed to delete file from storage', storageError);
        }

        // 4. Delete from DB
        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    }

    // Count documents
    static async count(filters = {}) {
        let query = supabase.from(TABLE).select('*', { count: 'exact', head: true });

        if (filters.status) query = query.eq('status', filters.status);
        if (filters.uploadedBy) query = query.eq('uploaded_by', filters.uploadedBy);

        const { count, error } = await query;
        if (error) throw new Error(error.message);
        return count;
    }

    // Get documents by project
    static async getByProject(projectId) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    // Count documents by project
    static async countByProject(projectId) {
        const { count, error } = await supabase
            .from(TABLE)
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId);

        if (error) throw error;
        return count || 0;
    }
}

module.exports = DocumentService;
