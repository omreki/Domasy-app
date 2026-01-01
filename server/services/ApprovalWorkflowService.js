const { db, FieldValue } = require('../config/firebase');

const COLLECTION = 'approval_workflows';

class ApprovalWorkflowService {
    // Create workflow
    static async create(workflowData) {
        const docRef = db.collection(COLLECTION).doc();

        const workflow = {
            id: docRef.id,
            document: workflowData.document, // ID of the document
            stages: workflowData.stages,
            currentStageIndex: workflowData.currentStageIndex || 0,
            overallStatus: workflowData.overallStatus || 'In Progress',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        await docRef.set(workflow);
        return workflow;
    }

    // Find workflow by Document ID
    static async findByDocumentId(documentId) {
        const snapshot = await db.collection(COLLECTION)
            .where('document', '==', documentId)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        return snapshot.docs[0].data();
    }

    // Find workflow by ID
    static async findById(id) {
        const doc = await db.collection(COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return doc.data();
    }

    // Update workflow
    static async update(id, updateData) {
        const docRef = db.collection(COLLECTION).doc(id);
        const updates = { ...updateData, updatedAt: FieldValue.serverTimestamp() };

        await docRef.update(updates);
        return (await docRef.get()).data();
    }

    // Delete by Document ID
    static async deleteByDocumentId(documentId) {
        const snapshot = await db.collection(COLLECTION)
            .where('document', '==', documentId)
            .get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
    }

    // Get pending workflows for user
    static async getPendingForUser(userId) {
        // This is complex in NoSQL. We'll fetch active workflows and filter in memory or 
        // rely on a specific 'currentAssignee' field if we optimize for read.
        // For matching exact MongoDB logic:

        // 1. Get all In Progress workflows
        const snapshot = await db.collection(COLLECTION)
            .where('overallStatus', '==', 'In Progress')
            .get();

        const workflows = snapshot.docs.map(doc => doc.data());

        // 2. Filter where current stage assignee matches userId
        return workflows.filter(wf => {
            const currentStage = wf.stages[wf.currentStageIndex];
            return currentStage && currentStage.assignee === userId && currentStage.status === 'current';
        });
    }

    // Methods like approveCurrentStage, rejectCurrentStage, etc. 
    // will be handled in controller logic using the update method, 
    // or we can encapsulate them here. I'll stick to basic CRUD here to keep it flexible.
}

module.exports = ApprovalWorkflowService;
