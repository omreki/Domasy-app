// ========================================
// DOMASY - Mock Data
// ========================================

const MOCK_DATA = {
    // Current User
    currentUser: {
        id: 1,
        name: 'James Admin',
        email: 'james@domasy.com',
        role: 'Super Admin',
        avatar: 'https://ui-avatars.com/api/?name=James+Admin&background=4F46E5&color=fff'
    },

    // Users/Team Members
    users: [
        {
            id: 1,
            name: 'Alice Freeman',
            email: 'alice.f@docapp.com',
            role: 'Super Admin',
            status: 'Active',
            lastLogin: '2 minutes ago',
            avatar: 'https://ui-avatars.com/api/?name=Alice+Freeman&background=10B981&color=fff'
        },
        {
            id: 2,
            name: 'Bob Smith',
            email: 'bob.smith@docapp.com',
            role: 'Approver',
            status: 'Pending',
            lastLogin: 'Invited 2 days ago',
            avatar: 'https://ui-avatars.com/api/?name=Bob+Smith&background=3B82F6&color=fff'
        },
        {
            id: 3,
            name: 'Charlie Davis',
            email: 'charlie@docapp.com',
            role: 'Viewer',
            status: 'Active',
            lastLogin: '1 week ago',
            avatar: 'https://ui-avatars.com/api/?name=Charlie+Davis&background=F59E0B&color=fff'
        },
        {
            id: 4,
            name: 'Diana Prince',
            email: 'diana.p@docapp.com',
            role: 'Editor',
            status: 'Revoked',
            lastLogin: '1 month ago',
            avatar: 'https://ui-avatars.com/api/?name=Diana+Prince&background=EF4444&color=fff'
        },
        {
            id: 5,
            name: 'Evan Matthews',
            email: 'evan.m@docapp.com',
            role: 'Viewer',
            status: 'Active',
            lastLogin: '3 hours ago',
            avatar: 'https://ui-avatars.com/api/?name=Evan+Matthews&background=8B5CF6&color=fff'
        },
        {
            id: 6,
            name: 'Sarah Connor',
            email: 'sarah.connor@acme.com',
            role: 'Approver',
            status: 'Active',
            lastLogin: '1 day ago',
            avatar: 'https://ui-avatars.com/api/?name=Sarah+Connor&background=EC4899&color=fff'
        },
        {
            id: 7,
            name: 'John Smith',
            email: 'john.smith@acme.com',
            role: 'Editor',
            status: 'Active',
            lastLogin: '5 hours ago',
            avatar: 'https://ui-avatars.com/api/?name=John+Smith&background=6366F1&color=fff'
        },
        {
            id: 8,
            name: 'Michael Brown',
            email: 'michael.b@acme.com',
            role: 'Approver',
            status: 'Active',
            lastLogin: '2 days ago',
            avatar: 'https://ui-avatars.com/api/?name=Michael+Brown&background=14B8A6&color=fff'
        },
        {
            id: 9,
            name: 'Emily Chen',
            email: 'emily.chen@acme.com',
            role: 'Viewer',
            status: 'Active',
            lastLogin: '1 week ago',
            avatar: 'https://ui-avatars.com/api/?name=Emily+Chen&background=F97316&color=fff'
        },
        {
            id: 10,
            name: 'Sarah Jenkins',
            email: 'sarah.jenkins@finance.com',
            role: 'Approver',
            status: 'Active',
            lastLogin: '30 minutes ago',
            avatar: 'https://ui-avatars.com/api/?name=Sarah+Jenkins&background=A855F7&color=fff'
        }
    ],

    // Documents
    documents: [
        {
            id: 1,
            title: 'Q3 Financial Report - Final_v2.pdf',
            description: 'Quarterly financial breakdown including profit margins, EBITDA, and operational costs for Q3.',
            category: 'Finance',
            status: 'In Review',
            uploadDate: 'Oct 24, 2023',
            size: '2.4 MB',
            uploadedBy: 10,
            currentApprover: 1,
            approvalStage: 'Manager Review',
            thumbnail: 'https://via.placeholder.com/200x280/4F46E5/ffffff?text=Financial+Report'
        },
        {
            id: 2,
            title: 'Invoice #INV-2023-001',
            description: 'Invoice for Q3 services rendered to client XYZ Corp.',
            category: 'Finance',
            status: 'Approved',
            uploadDate: 'Oct 24, 2023',
            size: '1.2 MB',
            uploadedBy: 10,
            currentApprover: null,
            approvalStage: 'Completed',
            thumbnail: 'https://via.placeholder.com/200x280/10B981/ffffff?text=Invoice'
        },
        {
            id: 3,
            title: 'Contract #CTR-9922',
            description: 'Annual service contract with vendor ABC Solutions.',
            category: 'Legal',
            status: 'Changes Requested',
            uploadDate: 'Oct 24, 2023',
            size: '3.1 MB',
            uploadedBy: 3,
            currentApprover: 4,
            approvalStage: 'Legal Review',
            thumbnail: 'https://via.placeholder.com/200x280/F59E0B/ffffff?text=Contract'
        },
        {
            id: 4,
            title: 'Expense_Report_Q3.pdf',
            description: 'Detailed expense report for Q3 operations.',
            category: 'Finance',
            status: 'Uploaded',
            uploadDate: 'Oct 23, 2023',
            size: '1.8 MB',
            uploadedBy: 7,
            currentApprover: 1,
            approvalStage: 'Initial Review',
            thumbnail: 'https://via.placeholder.com/200x280/3B82F6/ffffff?text=Expense+Report'
        },
        {
            id: 5,
            title: 'Invoice #INV-2023-009',
            description: 'Invoice for consulting services - October 2023.',
            category: 'Finance',
            status: 'Rejected',
            uploadDate: 'Oct 22, 2023',
            size: '0.9 MB',
            uploadedBy: 10,
            currentApprover: null,
            approvalStage: 'Rejected',
            thumbnail: 'https://via.placeholder.com/200x280/EF4444/ffffff?text=Invoice'
        },
        {
            id: 6,
            title: 'Report #RPT-Daily-Oct23',
            description: 'Automated daily report generation successful.',
            category: 'Reports',
            status: 'Generated',
            uploadDate: 'Oct 23, 2023',
            size: '0.5 MB',
            uploadedBy: null,
            currentApprover: null,
            approvalStage: 'Auto-generated',
            thumbnail: 'https://via.placeholder.com/200x280/8B5CF6/ffffff?text=Daily+Report'
        }
    ],

    // Projects
    projects: [
        {
            id: 1,
            name: 'Q3 Financial Review',
            category: 'Finance',
            description: 'Quarterly financial review and reporting',
            participants: [6, 7, 10],
            documentCount: 8,
            status: 'Active',
            createdDate: 'Oct 1, 2023',
            dueDate: 'Oct 31, 2023'
        },
        {
            id: 2,
            name: 'Annual Contract Renewals',
            category: 'Legal',
            description: 'Review and renew all annual vendor contracts',
            participants: [3, 4, 8],
            documentCount: 12,
            status: 'Active',
            createdDate: 'Sep 15, 2023',
            dueDate: 'Dec 31, 2023'
        },
        {
            id: 3,
            name: 'HR Policy Update 2024',
            category: 'HR',
            description: 'Update company HR policies for 2024',
            participants: [1, 2, 9],
            documentCount: 5,
            status: 'Planning',
            createdDate: 'Oct 20, 2023',
            dueDate: 'Jan 15, 2024'
        }
    ],

    // Audit Logs
    auditLogs: [
        {
            id: 1,
            timestamp: 'Oct 24, 2023 10:42 AM',
            user: 10,
            action: 'Approved',
            actionType: 'success',
            document: 'Invoice #INV-2023-001',
            details: 'Review complete. This matches the PO perfectly. Approved for payment.',
            ipAddress: '192.168.1.42'
        },
        {
            id: 2,
            timestamp: 'Oct 24, 2023 09:15 AM',
            user: 4,
            action: 'Changes Requested',
            actionType: 'warning',
            document: 'Contract #CTR-9922',
            details: 'Section 4.2 needs clarification regarding the indemnity clause. Please revise.',
            ipAddress: '10.0.0.55'
        },
        {
            id: 3,
            timestamp: 'Oct 23, 2023 04:00 PM',
            user: null,
            action: 'Generated',
            actionType: 'info',
            document: 'Report #RPT-Daily-Oct23',
            details: 'Automated daily report generation successful.',
            ipAddress: 'Localhost',
            automated: true
        },
        {
            id: 4,
            timestamp: 'Oct 23, 2023 05:32 PM',
            user: 7,
            action: 'Uploaded',
            actionType: 'info',
            document: 'Expense_Report_Q3.pdf',
            details: 'New document version v1.0 created.',
            ipAddress: '192.168.1.101'
        },
        {
            id: 5,
            timestamp: 'Oct 22, 2023 11:15 AM',
            user: 10,
            action: 'Rejected',
            actionType: 'error',
            document: 'Invoice #INV-2023-009',
            details: 'Duplicate invoice detected. Please verify with the vendor.',
            ipAddress: '192.168.1.42'
        }
    ],

    // Categories
    categories: [
        { id: 1, name: 'Finance', color: '#4F46E5' },
        { id: 2, name: 'HR', color: '#10B981' },
        { id: 3, name: 'Legal', color: '#F59E0B' },
        { id: 4, name: 'Operations', color: '#3B82F6' },
        { id: 5, name: 'Marketing', color: '#EC4899' },
        { id: 6, name: 'IT', color: '#8B5CF6' },
        { id: 7, name: 'Reports', color: '#14B8A6' }
    ],

    // Workflow Stages
    workflowStages: [
        { id: 1, name: 'Draft Submission', order: 1 },
        { id: 2, name: 'Manager Review', order: 2 },
        { id: 3, name: 'Department Head Approval', order: 3 },
        { id: 4, name: 'Final VP Approval', order: 4 },
        { id: 5, name: 'Completed', order: 5 }
    ],

    // Approval Workflows (for specific documents)
    approvalWorkflows: {
        1: [ // Document ID 1
            {
                stage: 'Draft Submission',
                assignee: 10,
                department: 'Finance Dept.',
                status: 'completed',
                completedDate: 'Oct 24',
                note: 'Sarah Jenkins submitted version 1.0'
            },
            {
                stage: 'Manager Review',
                assignee: 1,
                department: 'You',
                status: 'current',
                completedDate: null,
                note: 'Awaiting your approval.'
            },
            {
                stage: 'Final VP Approval',
                assignee: 7,
                department: 'John Doe',
                status: 'pending',
                completedDate: null,
                note: 'Pending previous steps'
            }
        ]
    },

    // Dashboard Statistics
    dashboardStats: {
        totalDocuments: 1248,
        documentsChange: '+5%',
        pendingApprovals: 8,
        activeProjects: 12,
        projectsChange: '+3',
        activeUsers: 124,
        usersChange: '+12%'
    }
};

// Helper Functions
const DataHelpers = {
    getUserById(id) {
        return MOCK_DATA.users.find(u => u.id === id);
    },

    getDocumentById(id) {
        return MOCK_DATA.documents.find(d => d.id === id);
    },

    getProjectById(id) {
        return MOCK_DATA.projects.find(p => p.id === p);
    },

    getCategoryById(id) {
        return MOCK_DATA.categories.find(c => c.id === id);
    },

    getCategoryByName(name) {
        return MOCK_DATA.categories.find(c => c.name === name);
    },

    getDocumentsByStatus(status) {
        return MOCK_DATA.documents.filter(d => d.status === status);
    },

    getDocumentsByCategory(category) {
        return MOCK_DATA.documents.filter(d => d.category === category);
    },

    getUsersByRole(role) {
        return MOCK_DATA.users.filter(u => u.role === role);
    },

    getUsersByStatus(status) {
        return MOCK_DATA.users.filter(u => u.status === status);
    },

    getRecentAuditLogs(limit = 10) {
        return MOCK_DATA.auditLogs.slice(0, limit);
    },

    searchDocuments(query) {
        const lowerQuery = query.toLowerCase();
        return MOCK_DATA.documents.filter(d => 
            d.title.toLowerCase().includes(lowerQuery) ||
            d.description.toLowerCase().includes(lowerQuery) ||
            d.category.toLowerCase().includes(lowerQuery)
        );
    },

    searchUsers(query) {
        const lowerQuery = query.toLowerCase();
        return MOCK_DATA.users.filter(u => 
            u.name.toLowerCase().includes(lowerQuery) ||
            u.email.toLowerCase().includes(lowerQuery) ||
            u.role.toLowerCase().includes(lowerQuery)
        );
    }
};
