const API_URL = 'http://localhost:5000/api';

class API {
    static get token() {
        return localStorage.getItem('token');
    }

    static set token(value) {
        if (value) {
            localStorage.setItem('token', value);
        } else {
            localStorage.removeItem('token');
        }
    }

    static get headers() {
        const headers = {
            'Content-Type': 'application/json'
        };
        const token = this.token;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    // Loader management
    static showLoader(message = 'Loading...') {
        const loader = document.getElementById('globalLoader');
        const loaderText = loader?.querySelector('.loader-text');
        if (loader) {
            loader.classList.add('show');
            if (loaderText) loaderText.textContent = message;
        }
    }

    static hideLoader() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.classList.remove('show');
        }
    }

    // Helper to add/remove button loading state
    static setButtonLoading(button, loading) {
        if (!button) return;
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    // Helper for fetch handling
    static async request(endpoint, options = {}) {
        const showLoader = options.showLoader !== false; // Default true
        const loaderMessage = options.loaderMessage || 'Loading...';

        // Remove custom options from fetch options
        delete options.showLoader;
        delete options.loaderMessage;

        try {
            if (showLoader) this.showLoader(loaderMessage);

            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers: {
                    ...this.headers,
                    ...options.headers
                }
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle 401 Unauthorized (token inspired/invalid)
                if (response.status === 401 && !endpoint.includes('login') && !endpoint.includes('register')) {
                    this.logout();
                    window.location.reload();
                    return;
                }
                throw new Error(data.message || 'API Error');
            }

            return data;
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        } finally {
            if (showLoader) this.hideLoader();
        }
    }

    // Auth
    static async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.token = data.data.token;
        localStorage.setItem('user', JSON.stringify(data.data.user));
        return data.data;
    }

    static async updateProfile(data) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async register(name, email, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
    }

    static logout() {
        this.token = null;
        localStorage.removeItem('user');
    }

    // Dashboard
    static async getDashboardStats() {
        return this.request('/dashboard/stats');
    }

    // Documents
    static async getDocuments(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        return this.request(`/documents?${query}`);
    }

    static async getDocument(id) {
        return this.request(`/documents/${id}`);
    }

    static async uploadDocument(formData) {
        // Multipart/form-data doesn't need Content-Type header manually set
        const token = this.token;

        try {
            this.showLoader('Uploading document...');

            const response = await fetch(`${API_URL}/documents`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            return data;
        } finally {
            this.hideLoader();
        }
    }

    static async deleteDocument(id) {
        return this.request(`/documents/${id}`, { method: 'DELETE' });
    }

    static async uploadRevision(id, formData) {
        const token = this.token;

        try {
            this.showLoader('Uploading revision...');

            const response = await fetch(`${API_URL}/documents/${id}/revision`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            return data;
        } finally {
            this.hideLoader();
        }
    }

    // Users
    static async getUsers(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        return this.request(`/users?${query}`);
    }

    static async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    static async updateUser(id, userData) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    static async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }

    // Projects
    static async getProjects() {
        return this.request('/projects');
    }

    static async createProject(data) {
        return this.request('/projects', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async getProject(id) {
        return this.request(`/projects/${id}`);
    }

    static async updateProject(id, data) {
        return this.request(`/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async deleteProject(id) {
        return this.request(`/projects/${id}`, {
            method: 'DELETE'
        });
    }


    // Categories
    static async getCategories() {
        return this.request('/categories');
    }

    static async createCategory(name) {
        return this.request('/categories', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    }

    static async deleteCategory(id) {
        return this.request(`/categories/${id}`, {
            method: 'DELETE'
        });
    }

    // Audit
    static async getAuditLogs(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        return this.request(`/audit?${query}`);
    }

    // Approvals
    static async getPendingApprovals() {
        return this.request('/approvals/pending');
    }

    static async getWorkflow(documentId) {
        return this.request(`/approvals/document/${documentId}`);
    }

    static async approveWorkflowStage(workflowId, note = 'Approved') {
        return this.request(`/approvals/${workflowId}/approve`, {
            method: 'POST',
            body: JSON.stringify({ note })
        });
    }

    static async rejectWorkflowStage(workflowId, note) {
        return this.request(`/approvals/${workflowId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ note })
        });
    }

    static async requestWorkflowChanges(workflowId, note) {
        return this.request(`/approvals/${workflowId}/request-changes`, {
            method: 'POST',
            body: JSON.stringify({ note })
        });
    }
}

// Export API globally
window.API = API;
