const { db, FieldValue } = require('../config/firebase');

const COLLECTION = 'project_categories';

/**
 * Service to manage project categories
 */
class CategoryService {

    // Create a new category
    static async create(name) {
        if (!name) throw new Error('Category name is required');

        // check for duplicate
        const snapshot = await db.collection(COLLECTION).where('name', '==', name).get();
        if (!snapshot.empty) {
            throw new Error('Category already exists');
        }

        const docRef = db.collection(COLLECTION).doc();
        const category = {
            id: docRef.id,
            name: name,
            createdAt: FieldValue.serverTimestamp()
        };

        await docRef.set(category);
        return category;
    }

    // Get all categories
    static async getAll() {
        const snapshot = await db.collection(COLLECTION).orderBy('name').get();
        return snapshot.docs.map(doc => doc.data());
    }

    // Delete a category
    static async delete(id) {
        await db.collection(COLLECTION).doc(id).delete();
        return true;
    }
}

module.exports = CategoryService;
