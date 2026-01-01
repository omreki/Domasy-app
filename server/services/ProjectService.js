const { db, FieldValue } = require('../config/firebase');

const COLLECTION = 'projects';

class ProjectService {
    // Create project
    static async create(projectData) {
        const docRef = db.collection(COLLECTION).doc();

        const project = {
            id: docRef.id,
            name: projectData.name,
            description: projectData.description || null,
            category: projectData.category,
            status: projectData.status || 'Active',
            participants: projectData.participants || [],
            createdBy: projectData.createdBy,
            dueDate: projectData.dueDate ? new Date(projectData.dueDate) : null,
            startDate: FieldValue.serverTimestamp(),
            completedDate: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        await docRef.set(project);
        return project;
    }

    // Find project by ID
    static async findById(id) {
        const doc = await db.collection(COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return doc.data();
    }

    // Get all projects
    static async getAll(filters = {}) {
        let query = db.collection(COLLECTION).orderBy('createdAt', 'desc');

        if (filters.status) {
            query = query.where('status', '==', filters.status);
        }

        if (filters.category) {
            query = query.where('category', '==', filters.category);
        }

        if (filters.createdBy) {
            query = query.where('createdBy', '==', filters.createdBy);
        }

        const snapshot = await query.get();
        const projects = snapshot.docs.map(doc => doc.data());

        // Calculate document counts (this would ideally be a separate counter or aggregation query)
        // For now, we'll fetch counts separately in the controller or assume the client fetches them

        return projects;
    }

    // Update project
    static async update(id, updateData) {
        const docRef = db.collection(COLLECTION).doc(id);
        const updates = { ...updateData, updatedAt: FieldValue.serverTimestamp() };

        await docRef.update(updates);
        return (await docRef.get()).data();
    }

    // Add participant
    static async addParticipant(id, participant) {
        const docRef = db.collection(COLLECTION).doc(id);
        await docRef.update({
            participants: FieldValue.arrayUnion(participant),
            updatedAt: FieldValue.serverTimestamp()
        });
        return (await docRef.get()).data();
    }

    // Count projects
    static async count(filters = {}) {
        let query = db.collection(COLLECTION);
        if (filters.status) {
            query = query.where('status', '==', filters.status);
        }
        const snapshot = await query.get();
        return snapshot.size;
    }
    // Delete project
    static async delete(id) {
        await db.collection(COLLECTION).doc(id).delete();
    }
}

module.exports = ProjectService;
