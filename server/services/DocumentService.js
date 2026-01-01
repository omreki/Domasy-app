const { db, bucket, FieldValue } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const COLLECTION = 'documents';

// Helper to normalize Firestore dates and handle document URLs
const mapDoc = (doc) => {
    const data = doc.data();
    const mapped = {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
    };

    // If using local storage, ensure URL is absolute if it's relative
    if (mapped.file && mapped.file.url && !mapped.file.url.startsWith('http')) {
        // We let the frontend handle prepending the base URL if needed
    }

    return mapped;
};

class DocumentService {
    // Create document
    static async create(documentData, file) {
        const docRef = db.collection(COLLECTION).doc();

        let fileData = null;

        // Save file info if provided (multer handles saving to disk)
        if (file) {
            const fileUrl = `/uploads/${file.filename}`;

            fileData = {
                filename: file.filename,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path, // Full path on disk
                url: fileUrl
            };
        }

        const document = {
            id: docRef.id,
            title: documentData.title,
            description: documentData.description || null,
            category: documentData.category,
            status: documentData.status || 'Uploaded',
            file: fileData,
            thumbnail: documentData.thumbnail || null,
            version: 1,
            uploadedBy: documentData.uploadedBy,
            currentApprover: documentData.currentApprover || null,
            approvalStage: documentData.approvalStage || 'Manager Review',
            project: documentData.project || null,
            tags: documentData.tags || [],
            virusScanStatus: 'Passed',
            metadata: documentData.metadata || {},
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        await docRef.set(document);

        return {
            ...document,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    // Find document by ID
    static async findById(id) {
        const doc = await db.collection(COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return mapDoc(doc);
    }

    // Get all documents with filters
    static async getAll(filters = {}, options = {}) {
        const startTime = Date.now();
        let query = db.collection(COLLECTION);

        // Apply filters
        if (filters.category) {
            query = query.where('category', '==', filters.category);
        }

        if (filters.status) {
            query = query.where('status', '==', filters.status);
        }

        if (filters.uploadedBy) {
            query = query.where('uploadedBy', '==', filters.uploadedBy);
        }

        if (filters.currentApprover) {
            query = query.where('currentApprover', '==', filters.currentApprover);
        }

        if (filters.project) {
            query = query.where('project', '==', filters.project);
        }

        // Pagination
        const limit = options.limit || 50; // Increased default for better UX
        const page = options.page || 1;

        query = query.orderBy('createdAt', 'desc').limit(limit);

        if (page > 1) {
            const offset = (page - 1) * limit;
            query = query.offset(offset);
        }

        const snapshot = await query.get();

        // Log query performance
        const queryTime = Date.now() - startTime;
        if (queryTime > 1000) {
            console.warn(`[SLOW QUERY] DocumentService.getAll took ${queryTime}ms for ${snapshot.size} documents`);
        }

        let documents = snapshot.docs.map(mapDoc);

        // Client-side search (Firestore doesn't support full-text search)
        // TODO: Consider using Algolia for better search performance
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            documents = documents.filter(doc =>
                doc.title.toLowerCase().includes(searchLower) ||
                (doc.description && doc.description.toLowerCase().includes(searchLower))
            );
        }

        return documents;
    }

    // Update document
    static async update(id, updateData) {
        const docRef = db.collection(COLLECTION).doc(id);

        const updates = {
            ...updateData,
            updatedAt: FieldValue.serverTimestamp()
        };

        await docRef.update(updates);

        const updated = await docRef.get();
        return mapDoc(updated);
    }

    // Delete document
    static async delete(id) {
        const document = await this.findById(id);

        if (!document) {
            throw new Error('Document not found');
        }

        // Delete file from local storage
        if (document.file && document.file.path) {
            try {
                const fs = require('fs');
                if (fs.existsSync(document.file.path)) {
                    fs.unlinkSync(document.file.path);
                }
            } catch (error) {
                console.error('Error deleting file from local storage:', error);
            }
        }

        // Delete document from Firestore
        await db.collection(COLLECTION).doc(id).delete();
    }

    // Get file download URL
    static async getDownloadUrl(filePath) {
        // For local storage, if filePath is already a URL or relative path
        // we just return it. If it's a disk path, we might need to map it.
        // But usually, we just use document.file.url directly on frontend.
        return filePath;
    }

    // Count documents
    static async count(filters = {}) {
        let query = db.collection(COLLECTION);

        if (filters.status) {
            query = query.where('status', '==', filters.status);
        }

        if (filters.uploadedBy) {
            query = query.where('uploadedBy', '==', filters.uploadedBy);
        }

        if (filters.currentApprover) {
            query = query.where('currentApprover', '==', filters.currentApprover);
        }

        if (filters.project) {
            query = query.where('project', '==', filters.project);
        }

        const snapshot = await query.get();
        return snapshot.size;
    }

    // Get documents by project
    static async getByProject(projectId) {
        try {
            const snapshot = await db.collection(COLLECTION)
                .where('project', '==', projectId)
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map(mapDoc);
        } catch (error) {
            // Fallback for missing index: return unordered if order fails
            if (error.code === 9 || error.message.includes('requires an index')) {
                console.warn('Firestore Index missing for getByProject, falling back to unordered fetch.');
                const snapshot = await db.collection(COLLECTION)
                    .where('project', '==', projectId)
                    .get();
                return snapshot.docs.map(mapDoc);
            }
            throw error;
        }
    }

    static async countByProject(projectId) {
        // Simple count doesn't require composite index
        const snapshot = await db.collection(COLLECTION)
            .where('project', '==', projectId)
            .get();
        return snapshot.size;
    }
}

module.exports = DocumentService;
