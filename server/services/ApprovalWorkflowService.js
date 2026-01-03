const supabase = require('../config/supabase');

const TABLE = 'approval_workflows';

class ApprovalWorkflowService {
    // Create workflow
    static async create(workflowData) {
        const workflow = {
            document_id: workflowData.document_id || workflowData.document, // ID of the document
            stages: workflowData.stages,
            current_stage_index: workflowData.currentStageIndex || 0,
            overall_status: workflowData.overallStatus || 'In Progress',
            created_at: new Date(),
            updated_at: new Date()
        };

        const { data, error } = await supabase
            .from(TABLE)
            .insert(workflow)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    // Find workflow by Document ID
    static async findByDocumentId(documentId) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('document_id', documentId)
            .single();

        if (error) return null; // Handle not found
        return data;
    }

    // Find workflow by ID
    static async findById(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }

    // Update workflow
    static async update(id, updateData) {
        const updates = { ...updateData, updated_at: new Date() };

        // Map if needed, but keys seem to match generic structure mostly
        if (updateData.currentStageIndex !== undefined) {
            updates.current_stage_index = updateData.currentStageIndex;
            delete updates.currentStageIndex;
        }
        if (updateData.overallStatus) {
            updates.overall_status = updateData.overallStatus;
            delete updates.overallStatus;
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

    // Delete by Document ID
    static async deleteByDocumentId(documentId) {
        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('document_id', documentId);

        if (error) throw new Error(error.message);
    }

    // Get pending workflows for user
    static async getPendingForUser(userId) {
        // 1. Get all In Progress workflows
        const { data: workflows, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('overall_status', 'In Progress');

        if (error) throw new Error(error.message);

        // 2. Filter where current stage assignee matches userId
        return workflows.filter(wf => {
            // wf.stages is JSONB (array)
            const currentStage = wf.stages[wf.current_stage_index || 0];
            return currentStage && currentStage.assignee === userId && currentStage.status === 'current';
        });
    }
}

module.exports = ApprovalWorkflowService;
