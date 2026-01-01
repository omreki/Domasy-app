const { db, FieldValue } = require('../config/firebase');
const bcrypt = require('bcryptjs');

const COLLECTION = 'users';

const mapUser = (doc) => {
    const data = doc.data();
    return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        invitedAt: data.invitedAt?.toDate ? data.invitedAt.toDate() : data.invitedAt,
        lastLogin: data.lastLogin?.toDate ? data.lastLogin.toDate() : data.lastLogin
    };
};

class UserService {
    // Create user
    static async create(userData) {
        const userRef = db.collection(COLLECTION).doc();

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        const user = {
            id: userRef.id,
            name: userData.name,
            email: userData.email.toLowerCase(),
            password: hashedPassword,
            role: userData.role || 'Viewer',
            status: userData.status || 'Pending',
            avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=4F46E5&color=fff`,
            department: userData.department || null,
            lastLogin: null,
            invitedBy: userData.invitedBy || null,
            invitedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        };

        await userRef.set(user);

        // Remove password from returned object
        const { password, ...userWithoutPassword } = user;

        // Return with hydrated dates
        return {
            ...userWithoutPassword,
            invitedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    // Find user by email
    static async findByEmail(email) {
        const snapshot = await db.collection(COLLECTION)
            .where('email', '==', email.toLowerCase())
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        return mapUser(snapshot.docs[0]);
    }

    // Find user by ID
    static async findById(id) {
        const doc = await db.collection(COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return mapUser(doc);
    }

    // Update user
    static async update(id, updateData) {
        const userRef = db.collection(COLLECTION).doc(id);

        const updates = {
            ...updateData,
            updatedAt: FieldValue.serverTimestamp()
        };

        await userRef.update(updates);

        const updated = await userRef.get();
        return mapUser(updated);
    }

    // Update last login
    static async updateLastLogin(id) {
        await db.collection(COLLECTION).doc(id).update({
            lastLogin: FieldValue.serverTimestamp()
        });
    }

    // Get all users with filters
    static async getAll(filters = {}) {
        const startTime = Date.now();
        let query = db.collection(COLLECTION);

        if (filters.role) {
            query = query.where('role', '==', filters.role);
        }

        if (filters.status) {
            query = query.where('status', '==', filters.status);
        }

        // Apply ordering
        query = query.orderBy('createdAt', 'desc');

        // Apply pagination
        const limit = filters.limit ? parseInt(filters.limit) : 100;
        query = query.limit(limit);

        if (filters.startAfter) {
            const startDoc = await db.collection(COLLECTION).doc(filters.startAfter).get();
            if (startDoc.exists) {
                query = query.startAfter(startDoc);
            }
        }

        const snapshot = await query.get();

        // Log query performance
        const queryTime = Date.now() - startTime;
        if (queryTime > 1000) {
            console.warn(`[SLOW QUERY] UserService.getAll took ${queryTime}ms`);
        }

        let users = snapshot.docs.map(mapUser);

        // Filter by search term (client-side filtering for now)
        // TODO: Consider using Algolia or similar for better search performance
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            users = users.filter(user =>
                user.name.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower)
            );
        }

        // Remove passwords and optionally limit fields
        return users.map(({ password, ...user }) => {
            // Return only requested fields if specified
            if (filters.fields && Array.isArray(filters.fields)) {
                const projected = { id: user.id };
                filters.fields.forEach(field => {
                    if (user[field] !== undefined) {
                        projected[field] = user[field];
                    }
                });
                return projected;
            }
            return user;
        });
    }

    // Compare password
    static async comparePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    // Delete user
    static async delete(id) {
        await db.collection(COLLECTION).doc(id).delete();
    }

    // Count users
    static async count(filters = {}) {
        let query = db.collection(COLLECTION);

        if (filters.status) {
            query = query.where('status', '==', filters.status);
        }

        const snapshot = await query.get();
        return snapshot.size;
    }
}

module.exports = UserService;
