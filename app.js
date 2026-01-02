// ========================================
// DOMASY - Main Application Logic
// ========================================

class DomasApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.isAuthenticated = !!API.token;
        this.currentUser = JSON.parse(localStorage.getItem('user'));
        this.branding = {
            logo: null,
            name: 'Domasy',
            displayMode: 'both' // 'logo-only', 'name-only', 'both'
        };
        this.init();
    }

    async init() {
        const appContainer = document.getElementById('app');
        this.loadBranding();

        if (!this.isAuthenticated) {
            // Hide main app when not authenticated
            if (appContainer) appContainer.style.display = 'none';
            this.renderLogin();
        } else {
            // Show main app when authenticated
            if (appContainer) appContainer.style.display = '';

            // Ensure UI exists (if re-initializing after login)
            if (!document.querySelector('.app-container')) {
                // Re-render full layout if missing (e.g. was on login screen)
                window.location.reload();
                return;
            }

            this.setupEventListeners();
            this.updateUserProfileUI();
            this.updateNavigationForRole(); // Update nav based on role
            this.loadPage('dashboard');
        }
    }

    async loadBranding() {
        try {
            const response = await API.getSettings('branding');
            if (response.success && response.data) {
                this.branding = {
                    ...this.branding,
                    ...response.data
                };
                this.updateBrandingUI();
            }
        } catch (error) {
            console.error('Failed to load branding:', error);
        }
    }

    updateBrandingUI() {
        const logoContainers = document.querySelectorAll('.logo');
        const logoTexts = document.querySelectorAll('.logo-text');
        const systemName = this.branding.name || 'Domasy';
        const displayMode = this.branding.displayMode || 'both';

        // Update document title
        document.title = `${systemName} - Document Management System`;

        logoContainers.forEach(container => {
            // Logo Image / Icon
            const showLogo = displayMode === 'both' || displayMode === 'logo-only';
            const icon = container.querySelector('i');
            let img = container.querySelector('img.custom-logo');

            // Add mode class
            container.classList.remove('logo-both', 'logo-only', 'logo-name-only');
            container.classList.add(`logo-${displayMode}`);

            if (showLogo) {
                if (this.branding.logo) {
                    if (icon) icon.style.display = 'none';
                    if (!img) {
                        img = document.createElement('img');
                        img.className = 'custom-logo';
                        img.style.height = '32px';
                        img.style.marginRight = '12px';
                        container.prepend(img);
                    }
                    img.src = this.branding.logo;
                    img.style.display = 'block';
                } else {
                    if (img) img.style.display = 'none';
                    if (icon) icon.style.display = 'block';
                }
            } else {
                if (img) img.style.display = 'none';
                if (icon) icon.style.display = 'none';
            }
        });

        logoTexts.forEach(text => {
            const showName = displayMode === 'both' || displayMode === 'name-only';
            text.textContent = systemName;
            text.style.display = showName ? 'block' : 'none';
        });

        // Update login page if visible
        const loginSubtitle = document.querySelector('#loginOverlay p');
        if (loginSubtitle) {
            loginSubtitle.textContent = `Sign in to access your secure ${systemName} workspace`;
        }

        // Apply Sidebar Colors
        if (this.branding.sidebarColor) {
            document.documentElement.style.setProperty('--sidebar-bg', this.branding.sidebarColor);
        } else {
            document.documentElement.style.removeProperty('--sidebar-bg');
        }

        if (this.branding.sidebarTextColor) {
            document.documentElement.style.setProperty('--sidebar-text', this.branding.sidebarTextColor);
        } else {
            document.documentElement.style.removeProperty('--sidebar-text');
        }

        if (this.branding.sidebarActiveBg) {
            // If it's a hex, we might want to add transparency
            const activeBg = this.branding.sidebarActiveBg.startsWith('#')
                ? `${this.branding.sidebarActiveBg}26` // Add ~15% transparency (26 in hex)
                : this.branding.sidebarActiveBg;
            document.documentElement.style.setProperty('--sidebar-active-bg', activeBg);
        } else {
            document.documentElement.style.removeProperty('--sidebar-active-bg');
        }

        if (this.branding.sidebarActiveIndicator) {
            document.documentElement.style.setProperty('--sidebar-active-indicator', this.branding.sidebarActiveIndicator);
        } else {
            document.documentElement.style.removeProperty('--sidebar-active-indicator');
        }

        // Unified Active Item / Role Color
        const activeTextColor = this.branding.sidebarActiveTextColor || this.branding.sidebarRoleColor;
        if (activeTextColor) {
            document.documentElement.style.setProperty('--sidebar-active-text', activeTextColor);
        } else {
            document.documentElement.style.removeProperty('--sidebar-active-text');
        }
    }

    updateUserProfileUI() {
        if (!this.currentUser) return;

        const sidebarName = document.getElementById('sidebarUserName');
        const sidebarRole = document.getElementById('sidebarUserRole');
        const sidebarAvatar = document.getElementById('sidebarUserAvatar');
        const headerAvatar = document.getElementById('headerUserAvatarImg');

        const avatarUrl = this.currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.name)}&background=4F46E5&color=fff`;

        if (sidebarName) sidebarName.textContent = this.currentUser.name;
        if (sidebarRole) sidebarRole.textContent = this.currentUser.role;
        if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
        if (headerAvatar) headerAvatar.src = avatarUrl;
    }

    renderLogin() {
        // Overlay logic
        const loginDiv = document.createElement('div');
        loginDiv.id = 'loginOverlay';
        loginDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:var(--bg-secondary);z-index:9999;display:flex;justify-content:center;align-items:center;';
        loginDiv.innerHTML = `
            <div class="card" style="width: 100%; max-width: 400px; padding: var(--spacing-xl); box-shadow: var(--shadow-xl); border: 1px solid var(--gray-200);">
                <div style="text-align: center; margin-bottom: var(--spacing-xl);">
                    <div style="color: var(--primary-600); font-size: 36px; margin-bottom: var(--spacing-md);">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h1 style="font-size: 24px; font-weight: 700; color: var(--text-primary);">Welcome Back</h1>
                    <p style="color: var(--gray-600);">Sign in to access your secure ${this.branding.name || 'Domasy'} workspace</p>
                </div>
                
                <form id="authForm" onsubmit="app.handleAuth(event)">
                    <input type="hidden" id="authMode" value="login">
                    
                    <div class="form-group" id="nameGroup" style="display:none;">
                        <label class="form-label" style="font-weight: 500;">Full Name</label>
                        <div class="input-wrapper">
                            <i class="fas fa-user input-icon"></i>
                            <input type="text" id="authName" class="form-input with-icon" placeholder="John Doe">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" style="font-weight: 500;">Email Address</label>
                        <div class="input-wrapper">
                            <i class="fas fa-envelope input-icon"></i>
                            <input type="email" id="authEmail" class="form-input with-icon" required placeholder="name@company.com">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--spacing-xs);">
                            <label class="form-label" style="margin-bottom:0; font-weight: 500;">Password</label>
                            <a href="#" class="link-primary" style="font-size: var(--font-size-sm);" onclick="alert('Please contact your administrator to reset password.')">Forgot password?</a>
                        </div>
                        <div class="input-wrapper">
                            <i class="fas fa-lock input-icon"></i>
                            <input type="password" id="authPassword" class="form-input with-icon" required placeholder="••••••••">
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 600; margin-top: var(--spacing-md);" id="authSubmitBtn">
                        Sign In
                    </button>
                </form>

                <div style="text-align: center; margin-top: var(--spacing-lg); padding-top: var(--spacing-lg); border-top: 1px solid var(--gray-200);">
                    <p style="color: var(--gray-600); font-size: var(--font-size-sm);">
                        <span id="authSwitchText">Don't have an account?</span>
                        <a href="#" class="link-primary" style="font-weight: 600;" onclick="app.toggleAuthMode()">
                            <span id="authSwitchLink">Sign up</span>
                        </a>
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(loginDiv);

        // Add specific styles for login overlay to ensure it looks premium
        const style = document.createElement('style');
        style.innerHTML = `
            .input-wrapper { position: relative; }
            .input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400); }
            .form-input.with-icon { padding-left: 38px; }
            .link-primary { color: var(--primary-600); text-decoration: none; transition: color 0.2s; }
            .link-primary:hover { color: var(--primary-700); text-decoration: underline; }
            #loginOverlay { animation: fadeIn 0.3s ease-out; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    toggleAuthMode() {
        const modeInput = document.getElementById('authMode');
        const nameGroup = document.getElementById('nameGroup');
        const submitBtn = document.getElementById('authSubmitBtn');
        const switchText = document.getElementById('authSwitchText');
        const switchLink = document.getElementById('authSwitchLink');
        const title = document.querySelector('#loginOverlay h1');
        const subtitle = document.querySelector('#loginOverlay p');

        if (modeInput.value === 'login') {
            // Switch to Signup
            modeInput.value = 'signup';
            nameGroup.style.display = 'block';
            document.getElementById('authName').required = true;
            submitBtn.textContent = 'Create Account';
            switchText.textContent = 'Already have an account?';
            switchLink.textContent = 'Sign in';
            title.textContent = 'Create Account';
            subtitle.textContent = `Join ${this.branding.name || 'Domasy'} today`;
        } else {
            // Switch to Login
            modeInput.value = 'login';
            nameGroup.style.display = 'none';
            document.getElementById('authName').required = false;
            submitBtn.textContent = 'Sign In';
            switchText.textContent = "Don't have an account?";
            switchLink.textContent = 'Sign up';
            title.textContent = 'Welcome Back';
            subtitle.textContent = `Sign in to access your secure ${this.branding.name || 'Domasy'} workspace`;
        }
    }

    async handleAuth(e) {
        e.preventDefault();
        const mode = document.getElementById('authMode').value;
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const name = document.getElementById('authName').value;
        const submitBtn = document.getElementById('authSubmitBtn');

        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;

        try {
            if (mode === 'signup') {
                await API.register(name, email, password);
                alert('Registration successful! Please sign in.');
                this.toggleAuthMode(); // Switch back to login
            } else {
                await API.login(email, password);
                window.location.reload(); // Reload to start app fresh
            }
        } catch (error) {
            alert((mode === 'signup' ? 'Registration' : 'Login') + ' Failed: ' + error.message);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    logout() {
        API.logout();
        window.location.reload();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigateTo(page);
            });
        });

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.getElementById('sidebar');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }

        // Global search
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => {
                this.handleGlobalSearch(e.target.value);
            });
        }
        // User Dropdown Toggle (Header)
        const headerAvatar = document.getElementById('headerUserAvatar');
        const userDropdown = document.getElementById('userDropdown');
        if (headerAvatar && userDropdown) {
            headerAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close sidebar dropdown if open
                const sidebarDropdown = document.getElementById('sidebarUserDropdown');
                if (sidebarDropdown) sidebarDropdown.style.display = 'none';

                userDropdown.classList.toggle('show');
            });
        }

        // Sidebar User Dropdown Toggle
        const sidebarProfile = document.getElementById('sidebarUserProfile');
        const sidebarDropdown = document.getElementById('sidebarUserDropdown');
        if (sidebarProfile && sidebarDropdown) {
            sidebarProfile.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close header dropdown if open
                if (userDropdown) userDropdown.classList.remove('show');

                sidebarDropdown.style.display = sidebarDropdown.style.display === 'none' ? 'block' : 'none';
            });
        }

        // Close dropdowns on click outside
        document.addEventListener('click', () => {
            if (userDropdown) userDropdown.classList.remove('show');
            if (sidebarDropdown) sidebarDropdown.style.display = 'none';
        });
    }

    navigateTo(page) {
        this.currentPage = page;

        // Update active nav item (Sidebar)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });

        // Update active nav item (Top Nav)
        document.querySelectorAll('.top-nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });

        // Update breadcrumb
        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.innerHTML = `<span>${this.formatPageTitle(page)}</span>`;

        // Load page content
        this.loadPage(page);

        // Close mobile menu
        document.getElementById('sidebar').classList.remove('active');
    }

    formatPageTitle(page) {
        return page.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    updateNavigationForRole() {
        if (!this.currentUser) return;

        // Define Admin Roles
        const adminRoles = ['Super Admin', 'Admin'];
        const isAdmin = adminRoles.some(role => this.currentUser.role.includes(role));

        const body = document.body;

        if (!isAdmin) {
            // Enable Top Nav Layout
            body.classList.add('layout-top-nav');
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.style.display = 'none'; // Force Inline hide

            // Hide breadcrumb for top-nav layout to save space
            const breadcrumb = document.getElementById('breadcrumb');
            if (breadcrumb) breadcrumb.style.display = 'none';

            // Inject Top Nav Links and Logo if not already present
            if (!document.getElementById('topNav')) {
                const headerLeft = document.querySelector('.header-left');
                if (headerLeft) {
                    // Create Logo Container
                    const logoContainer = document.createElement('div');
                    logoContainer.className = 'logo header-logo';
                    logoContainer.innerHTML = `
                        <i class="fas fa-shield-alt"></i>
                        <span class="logo-text">Domasy</span>
                    `;
                    headerLeft.prepend(logoContainer);

                    const navContainer = document.createElement('div');
                    navContainer.id = 'topNav';
                    navContainer.className = 'top-nav-links';
                    navContainer.innerHTML = `
                        <a href="#" class="top-nav-item active" data-page="dashboard" onclick="app.handleTopNavClick(event, 'dashboard')">Dashboard</a>
                        <a href="#" class="top-nav-item" data-page="documents" onclick="app.handleTopNavClick(event, 'documents')">Documents</a>
                        <a href="#" class="top-nav-item" data-page="projects" onclick="app.handleTopNavClick(event, 'projects')">Projects</a>
                        <a href="#" class="top-nav-item" data-page="team" onclick="app.handleTopNavClick(event, 'team')">Team</a>
                    `;
                    headerLeft.appendChild(navContainer);
                }
            }

            // Re-trigger branding UI after injecting new logo container
            this.updateBrandingUI();
        } else {
            // Ensure standard layout
            body.classList.remove('layout-top-nav');
            const topNav = document.getElementById('topNav');
            if (topNav) topNav.remove();

            const headerLogo = document.querySelector('.header-logo');
            if (headerLogo) headerLogo.remove();

            const breadcrumb = document.getElementById('breadcrumb');
            if (breadcrumb) breadcrumb.style.display = '';

            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.style.display = ''; // Reset
        }
    }

    handleTopNavClick(e, page) {
        e.preventDefault();
        this.navigateTo(page);
    }

    async loadPage(page) {
        const pageContent = document.getElementById('pageContent');
        pageContent.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:400px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary-600)"></i></div>';

        // Role-based Access Control
        const adminRoles = ['Super Admin', 'Admin'];
        const isAdmin = this.currentUser && adminRoles.some(role => this.currentUser.role.includes(role));
        // Team is View Only for non-admins, but still accessible. Audit is blocked.
        const restrictedPages = ['audit-log'];

        if (!isAdmin && restrictedPages.includes(page)) {
            // Redirect non-admins to dashboard if they try to access restricted pages
            this.navigateTo('dashboard');
            return;
        }

        try {
            switch (page) {
                case 'dashboard':
                    if (isAdmin) {
                        pageContent.innerHTML = await this.renderDashboard();
                    } else {
                        pageContent.innerHTML = await this.renderUserDashboard();
                    }
                    break;
                case 'documents':
                    pageContent.innerHTML = await this.renderDocuments();
                    this.setupDocumentsPageListeners();
                    break;
                case 'projects':
                    pageContent.innerHTML = await this.renderProjects();
                    this.setupProjectsPageListeners();
                    break;
                case 'team':
                    pageContent.innerHTML = await this.renderTeam();
                    this.setupTeamPageListeners();
                    break;
                case 'audit-log':
                    pageContent.innerHTML = await this.renderAuditLog();
                    this.setupAuditLogListeners();
                    break;
                case 'settings':
                    pageContent.innerHTML = this.renderSettings();
                    this.setupSettingsPageListeners();
                    break;
                case 'project-details':
                    if (this.currentProjectViewId) {
                        const response = await API.getProject(this.currentProjectViewId);
                        pageContent.innerHTML = this.renderProjectDetails(response.data.project, response.data.documents);
                    } else {
                        pageContent.innerHTML = await this.renderProjects();
                        this.setupProjectsPageListeners();
                    }
                    break;
                default:
                    if (isAdmin) {
                        pageContent.innerHTML = await this.renderDashboard();
                    } else {
                        pageContent.innerHTML = await this.renderUserDashboard();
                    }
            }
        } catch (error) {
            console.error('Page Load Error:', error);
            pageContent.innerHTML = `<div style="text-align:center;padding:50px;color:red;">Failed to load data: ${error.message}</div>`;
        }
    }

    // ========================================
    // USER DASHBOARD (NON-ADMIN)
    // ========================================
    async renderUserDashboard() {
        const dashboardData = await API.getDashboardStats();
        // Use global stats or potentially filter them if API allows. 
        // For now, we will show relevant stats for a general user.
        const stats = dashboardData.data.stats;

        // Filter recent docs to show only those uploaded by this user, if possible, or just recent global ones if that's the intention.
        // Assuming "My Documents" is preferred.
        // We will do a client-side filter if the data returns populated users.
        const allRecentDocs = dashboardData.data.recentDocuments;
        const myRecentDocs = allRecentDocs.filter(doc =>
            doc.uploadedBy && (doc.uploadedBy._id === this.currentUser.id || doc.uploadedBy.id === this.currentUser.id || doc.uploadedBy.email === this.currentUser.email)
        );

        // Use myRecentDocs if available, otherwise fallback to all (e.g. for Viewers who just view)
        const displayDocs = myRecentDocs.length > 0 ? myRecentDocs : allRecentDocs;

        return `
            <div class="dashboard-page">
                <div class="page-header mb-4">
                    <h1 class="page-title">My Dashboard</h1>
                    <p class="page-subtitle">Welcome back, ${this.currentUser.name}</p>
                </div>

                <!-- Simple Stats Grid -->
                <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="fas fa-file-alt"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">My Documents</div>
                            <div class="stat-value">
                                ${displayDocs.length} <span style="font-size:0.6em; color:var(--gray-500)">(Recent)</span>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card">
                         <div class="stat-icon info">
                            <i class="fas fa-folder"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Active Projects</div>
                            <div class="stat-value">
                                ${stats.activeProjects}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Documents -->
                <div class="card mt-4">
                    <div class="card-header">
                        <h2 class="card-title">My Recent Documents</h2>
                        <button class="btn btn-sm btn-outline" onclick="app.navigateTo('documents')">
                            View All
                        </button>
                    </div>
                    <div class="card-body" style="padding: 0;">
                        <div class="document-list">
                            ${displayDocs.length > 0
                ? displayDocs.map(doc => this.renderDocumentListItem(doc)).join('')
                : '<div style="padding:20px;text-align:center;color:#666">No recent documents found for you.</div>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========================================
    // DASHBOARD PAGE
    // ========================================
    async renderDashboard() {
        const dashboardData = await API.getDashboardStats();
        const stats = dashboardData.data.stats;
        const recentDocs = dashboardData.data.recentDocuments;
        const recentLogs = dashboardData.data.recentActivity;

        return `
            <div class="dashboard-page">
                <div class="page-header mb-4">
                    <h1 class="page-title">Dashboard</h1>
                    <p class="page-subtitle">Welcome back, ${this.currentUser.name}</p>
                </div>

                <!-- Stats Grid -->
                <div class="stats-grid">
                    <div class="stat-card clickable" onclick="app.navigateTo('documents')" style="cursor: pointer;">
                        <div class="stat-icon primary">
                            <i class="fas fa-file-alt"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Total Documents</div>
                            <div class="stat-value">
                                ${stats.totalDocuments.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div class="stat-card clickable" onclick="app.navigateTo('documents')" style="cursor: pointer;">
                        <div class="stat-icon warning">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Pending Approvals</div>
                            <div class="stat-value">
                                ${stats.pendingApprovals}
                                <span class="badge badge-warning">Action Required</span>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card clickable" onclick="app.navigateTo('projects')" style="cursor: pointer;">
                        <div class="stat-icon info">
                            <i class="fas fa-folder"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Active Projects</div>
                            <div class="stat-value">
                                ${stats.activeProjects}
                            </div>
                        </div>
                    </div>

                    <div class="stat-card clickable" onclick="app.navigateTo('team')" style="cursor: pointer;">
                        <div class="stat-icon success">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Active Users</div>
                            <div class="stat-value">
                                ${stats.activeUsers}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Documents & Activity -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--spacing-xl); margin-top: var(--spacing-xl);">
                    <!-- Recent Documents -->
                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title">Recent Documents</h2>
                            <button class="btn btn-sm btn-outline" onclick="app.navigateTo('documents')">
                                View All
                            </button>
                        </div>
                        <div class="card-body" style="padding: 0;">
                            <div class="document-list">
                                ${recentDocs.length > 0
                ? recentDocs.map(doc => this.renderDocumentListItem(doc)).join('')
                : '<div style="padding:20px;text-align:center;color:#666">No recent documents</div>'}
                            </div>
                        </div>
                    </div>

                    <!-- Recent Activity -->
                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title">Recent Activity</h2>
                            <button class="btn btn-sm btn-outline" onclick="app.navigateTo('audit-log')">
                                View All
                            </button>
                        </div>
                        <div class="card-body" style="padding: 0;">
                            <div class="activity-list">
                                ${recentLogs.length > 0
                ? recentLogs.map(log => this.renderActivityItem(log)).join('')
                : '<div style="padding:20px;text-align:center;color:#666">No recent activity</div>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderDocumentListItem(doc) {
        const uploader = doc.uploadedBy;
        const statusColors = {
            'Approved': 'success',
            'In Review': 'info',
            'Changes Requested': 'warning',
            'Rejected': 'error',
            'Uploaded': 'gray',
            'Generated': 'info',
            'ChangesRequested': 'warning'
        };

        // Normalize fields
        const createdAt = doc.created_at || doc.createdAt;
        const rawFileSize = doc.file_size || doc.file?.size || 0;

        // Format Date
        const dateStr = createdAt ? new Date(createdAt).toLocaleDateString() : 'Unknown';
        const fileSize = (rawFileSize / 1024 / 1024).toFixed(2) + ' MB';

        return `
            <div class="document-list-item" onclick="app.viewDocument('${doc._id || doc.id}')">
                <div class="document-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div class="document-info">
                    <div class="document-title">${doc.title}</div>
                    <div class="document-meta">
                        ${uploader ? (uploader.name || 'User') : 'System'} • ${dateStr} • ${fileSize}
                    </div>
                </div>
                <span class="badge badge-${statusColors[doc.status.replace(' ', '')] || 'gray'}">${doc.status}</span>
            </div>
        `;
    }

    renderActivityItem(log) {
        const user = log.user;
        const actionColors = {
            'success': 'success',
            'warning': 'warning',
            'error': 'error',
            'info': 'info',
            'primary': 'primary'
        };

        const createdAt = log.created_at || log.createdAt;
        const dateStr = createdAt ? new Date(createdAt).toLocaleString() : 'Just now';
        const actionType = log.action_type || log.actionType || 'info';
        const docTitle = log.document_title || log.documentTitle || (log.document?.title !== 'Untitled' ? log.document?.title : '');

        return `
            <div class="activity-item clickable" onclick="app.navigateTo('audit-log')" style="cursor: pointer;">
                <div class="activity-avatar">
                    ${user && user.avatar ? `<img src="${user.avatar}" alt="${user.name}" style="object-fit: cover;">` : '<div style="width:32px;height:32px;background:var(--gray-100);border-radius:50%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-user" style="color:var(--gray-400);font-size:12px"></i></div>'}
                </div>
                <div class="activity-content">
                    <div class="activity-header">
                        <strong>${user && user.name !== 'Unknown' ? user.name : 'System'}</strong>
                        <span class="badge badge-${actionColors[actionType] || 'info'}">${log.action}</span>
                    </div>
                    ${docTitle ? `<div class="activity-document" style="font-weight:500; font-size:12px; margin:2px 0;">${docTitle}</div>` : ''}
                    ${log.details ? `<div class="activity-details" style="color:var(--gray-500); font-style:italic;">"${log.details}"</div>` : ''}
                    <div class="activity-time">${dateStr}</div>
                </div>
            </div>
        `;
    }

    // ========================================
    // DOCUMENTS PAGE
    // ========================================
    // ========================================
    // DOCUMENTS PAGE
    // ========================================
    async renderDocuments() {
        const response = await API.getDocuments(this.documentFilters || {});
        // Fix: Extract documents array correctly from response.data.documents
        const documents = response.data.documents || [];
        // Ensure documents are sorted by date (newest first)
        documents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        this.currentDocuments = documents; // Store for filtering locally

        return `
            <div class="documents-page">
                <div class="page-header mb-4">
                    <div>
                        <h1 class="page-title">Documents</h1>
                        <p class="page-subtitle">Manage and review all documents</p>
                    </div>
                    <button class="btn btn-primary" onclick="app.showUploadDocumentModal()">
                        <i class="fas fa-upload"></i>
                        Upload Document
                    </button>
                </div>

                <!-- Filters -->
                <div class="card mb-4">
                    <div class="card-body">
                        <div style="display: flex; gap: var(--spacing-md); flex-wrap: wrap;">
                            <div class="form-group" style="margin: 0; min-width: 200px;">
                                <input type="text" class="form-input" placeholder="Search documents..." id="docSearch" value="${this.documentFilters?.search || ''}">
                            </div>
                            <select class="form-select" id="statusFilter" style="min-width: 150px;">
                                <option value="">All Status</option>
                                <option value="Approved">Approved</option>
                                <option value="In Review">In Review</option>
                                <option value="Changes Requested">Changes Requested</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Uploaded">Uploaded</option>
                            </select>
                            <button class="btn btn-outline" onclick="app.resetDocumentFilters()">
                                <i class="fas fa-redo"></i>
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Documents Grid -->
                <div class="documents-grid" id="documentsGrid">
                    ${documents.length > 0
                ? documents.map(doc => this.renderDocumentCard(doc)).join('')
                : '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gray-500);">No documents found</div>'}
                </div>
            </div>
        `;
    }

    renderDocumentCard(doc) {
        const uploader = doc.uploadedBy;
        const project = doc.project ? (doc.project.name || doc.project) : 'Unassigned';
        const teamMembers = doc.teamMembers || [];

        const statusColors = {
            'Approved': 'success',
            'In Review': 'info',
            'Changes Requested': 'warning',
            'Rejected': 'error',
            'Uploaded': 'gray',
            'Generated': 'info'
        };
        const dateStr = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Unknown';

        // Thumbnail handling: use explicit thumbnail or file URL if image
        let thumbnail = doc.thumbnail;
        if (!thumbnail && doc.file?.mimetype?.startsWith('image/') && doc.file?.url) {
            if (doc.file.url.startsWith('http')) {
                thumbnail = doc.file.url;
            } else {
                thumbnail = `${API_URL.replace('/api', '')}${doc.file.url.startsWith('/') ? '' : '/'}${doc.file.url}`;
            }
        }

        // Ensure thumbnail has full URL if it exists
        if (thumbnail && !thumbnail.startsWith('http')) {
            thumbnail = `${API_URL.replace('/api', '')}${thumbnail.startsWith('/') ? '' : '/'}${thumbnail}`;
        }

        // Team Members HTML
        const teamHtml = teamMembers.length > 0 ? `
            <div class="document-team" style="display:flex; margin-top:8px; margin-bottom:8px; align-items:center;">
                <span style="font-size:11px; color:var(--gray-500); margin-right:6px; font-weight:600;">TEAM:</span>
                <div style="display:flex; align-items:center; flex-wrap:wrap; gap:2px;">
                    ${teamMembers.map(m => `
                        <div title="${m.name}" style="transition: transform 0.2s; position:relative; z-index:1;">
                             <img src="${m.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.name)}" 
                                  style="width:24px;height:24px;border-radius:50%;border:1px solid white; object-fit:cover;" 
                                  alt="${m.name}">
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        return `
            <div class="document-card" onclick="app.viewDocument('${doc._id || doc.id}')">
                <div class="document-thumbnail" style="${!thumbnail ? 'background:var(--gray-100);display:flex;align-items:center;justify-content:center;' : ''}">
                    ${thumbnail
                ? `<img src="${thumbnail}" alt="${doc.title}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null;this.parentNode.innerHTML='<i class=\\\'fas fa-file-alt fa-3x\\\' style=\\\'color:var(--gray-400)\\\'></i>'">`
                : `<i class="fas fa-file-alt fa-3x" style="color:var(--gray-400)"></i>`
            }
                    <div class="document-overlay">
                        <i class="fas fa-eye"></i>
                        <span>View Document</span>
                    </div>
                </div>
                <div class="document-card-content">
                    <div class="document-card-header" style="justify-content: space-between;">
                        <span class="badge badge-${statusColors[doc.status] || 'gray'}">${doc.status}</span>
                        <span class="badge badge-gray" style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px;">
                            <i class="fas fa-folder" style="margin-right:4px;"></i>${project}
                        </span>
                    </div>
                    
                    <h3 class="document-card-title">${doc.title}</h3>
                    <p class="document-card-description">${doc.description || 'No description'}</p>
                    
                    ${teamHtml}

                    <div class="document-card-footer">
                        <div class="document-card-user">
                            ${uploader ? `
                                <img src="${uploader.avatar || 'https://via.placeholder.com/24'}" alt="${uploader.name}">
                                <span>${uploader.name}</span>
                            ` : '<span>System</span>'}
                        </div>
                        <div class="document-card-meta">
                            <span>${dateStr}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupDocumentsPageListeners() {
        const docSearch = document.getElementById('docSearch');
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');

        if (docSearch) {
            docSearch.addEventListener('input', () => this.filterDocuments());
        }
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.filterDocuments());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterDocuments());
        }
    }

    filterDocuments() {
        const searchTerm = document.getElementById('docSearch')?.value.toLowerCase() || '';
        const category = document.getElementById('categoryFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';

        // FIX: Use currentDocuments instead of MOCK_DATA
        let filtered = this.currentDocuments || [];

        if (searchTerm) {
            filtered = filtered.filter(doc =>
                doc.title.toLowerCase().includes(searchTerm) ||
                (doc.description && doc.description.toLowerCase().includes(searchTerm))
            );
        }

        if (category) {
            filtered = filtered.filter(doc => doc.category === category);
        }

        if (status) {
            filtered = filtered.filter(doc => doc.status === status);
        }

        // Maintain sort order (newest first)
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const grid = document.getElementById('documentsGrid');
        if (grid) {
            grid.innerHTML = filtered.length > 0
                ? filtered.map(doc => this.renderDocumentCard(doc)).join('')
                : '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gray-500);">No documents found</div>';
        }
    }

    resetDocumentFilters() {
        if (document.getElementById('docSearch')) document.getElementById('docSearch').value = '';
        if (document.getElementById('categoryFilter')) document.getElementById('categoryFilter').value = '';
        if (document.getElementById('statusFilter')) document.getElementById('statusFilter').value = '';
        this.filterDocuments();
    }

    // ========================================
    // PROJECTS PAGE
    // ========================================
    async renderProjects() {
        const response = await API.getProjects();
        const projects = response.data.projects || [];
        const statusColors = {
            'Active': 'success',
            'Completed': 'info',
            'On Hold': 'warning',
            'Planning': 'primary'
        };

        return `
            <div class="projects-page">
                <div class="page-header mb-4">
                    <div>
                        <h1 class="page-title">Projects</h1>
                        <p class="page-subtitle">Track and manage ongoing projects and document collections.</p>
                    </div>
                    <button class="btn btn-primary" onclick="app.showCreateProjectModal()">
                        <i class="fas fa-plus"></i>
                        New Project
                    </button>
                </div>

                <div class="projects-grid">
                    ${projects.length > 0
                ? projects.map(project => `
                        <div class="project-card" onclick="app.viewProject('${project._id || project.id}')">
                            <div class="project-header">
                                <div class="project-icon">
                                    <i class="fas fa-folder"></i>
                                </div>
                                <div class="project-options">
                                    <button class="btn-icon" onclick="event.stopPropagation(); app.showEditProjectModal('${project._id || project.id}')" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-icon" onclick="event.stopPropagation(); app.deleteProject('${project._id || project.id}')" title="Delete" style="color:var(--error-500);">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <h3 class="project-title">${project.name}</h3>
                            <p class="project-description">${project.description || 'No description'}</p>

                            <div class="project-meta">
                                <div class="project-stat">
                                    <span class="stat-value">${project.documentCount || 0}</span>
                                    <span class="stat-label">Documents</span>
                                </div>
                                <div class="project-stat">
                                    <span class="stat-value">${project.teamSize || 0}</span>
                                    <span class="stat-label">Members</span>
                                </div>
                            </div>

                            <div class="project-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${project.progress || 0}%"></div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--gray-500); margin-top: var(--spacing-xs);">
                                    <span>Progress</span>
                                    <span>${project.progress || 0}%</span>
                                </div>
                            </div>

                            <div class="project-footer">
                                <div class="project-members">
                                    ${(project.members || []).slice(0, 3).map(m => `
                                        <img src="${m.avatar || 'https://via.placeholder.com/24'}" alt="${m.name}" title="${m.name}">
                                    `).join('')}
                                    ${(project.members || []).length > 3 ? `<div class="more-members">+${project.members.length - 3}</div>` : ''}
                                </div>
                                <span class="badge badge-${statusColors[project.status] || 'gray'}">${project.status}</span>
                            </div>
                        </div>
                    `).join('')
                : '<div style="grid-column:1/-1;text-align:center;padding:50px;color:var(--gray-500)">No projects found</div>'}
                </div>
            </div>
        `;
    }

    setupProjectsPageListeners() {
        // Add any project-specific listeners here
    }

    // Helper for date formatting
    formatDate(dateInput) {
        if (!dateInput) return 'N/A';
        let date;
        if (typeof dateInput === 'object' && dateInput._seconds) {
            date = new Date(dateInput._seconds * 1000);
        } else {
            date = new Date(dateInput);
        }
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString();
    }

    formatDateTime(dateInput) {
        if (!dateInput) return 'N/A';
        let date;
        if (typeof dateInput === 'object' && dateInput._seconds) {
            date = new Date(dateInput._seconds * 1000);
        } else {
            date = new Date(dateInput);
        }
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleString();
    }

    renderAuditRow(log) {
        const user = log.user;
        const actionColors = {
            'LOGIN': 'success',
            'UPLOAD': 'info',
            'Updated': 'info',
            'Deleted': 'error',
            'Downloaded': 'gray',
            'VIEW': 'gray',
            'Approved': 'success',
            'Rejected': 'error',
            'Changes Requested': 'warning',
            'Project Created': 'primary',
            'Project Updated': 'info',
            'Project Deleted': 'error',
            'User Created': 'primary',
            'User Updated': 'info',
            'User Deleted': 'error'
        };
        const dateStr = this.formatDateTime(log.createdAt);

        return `
            <tr>
                <td>
                    <div style="font-weight: 600; font-size: var(--font-size-sm);">${dateStr.split(',')[0]}</div>
                    <div style="font-size: var(--font-size-xs); color: var(--gray-500);">${dateStr.split(',')[1] || ''}</div>
                </td>
                <td>
                    ${user ? `
                        <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                            <img src="${user.avatar || 'https://via.placeholder.com/32'}" alt="${user.name}" style="width: 24px; height: 24px; border-radius: var(--radius-full);">
                            <span style="font-size: var(--font-size-sm); font-weight: 500;">${user.name}</span>
                        </div>
                    ` : '<span style="color:var(--gray-500);">System</span>'}
                </td>
                <td>
                    <span class="badge badge-${(actionColors[log.action] || 'gray')}">${log.action}</span>
                </td>
                <td>
                    <div style="font-weight: 500; font-size: var(--font-size-sm); margin-bottom: 2px;">
                        ${log.documentTitle || log.details || '-'}
                    </div>
                     ${log.documentTitle && log.details ? `<div style="font-size: 11px; color: var(--gray-500);">${log.details}</div>` : ''}
                </td>
                <td style="color: var(--gray-500); font-family: monospace; font-size: 11px;">
                    ${log.ipAddress || '-'}
                </td>
            </tr>
        `;
    }

    async viewProject(projectId) {
        this.currentProjectViewId = projectId;
        this.currentPage = 'project-details';
        const pageContent = document.getElementById('pageContent');
        pageContent.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:400px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary-600)"></i></div>';

        try {
            const response = await API.getProject(projectId);
            const { project, documents } = response.data;

            pageContent.innerHTML = this.renderProjectDetails(project, documents);
        } catch (error) {
            console.error(error);
            this.showToast('error', 'Error', 'Failed to load project details');
            this.navigateTo('projects');
        }
    }

    renderProjectDetails(project, documents) {
        const uploaderImg = 'https://ui-avatars.com/api/?name=';
        return `
            <div class="project-details-page">
                <div class="page-header mb-4">
                    <div style="display:flex; align-items:center; gap:var(--spacing-md);">
                        <button class="btn btn-icon" onclick="app.navigateTo('projects')">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div>
                            <h1 class="page-title" style="margin:0;">${project.name}</h1>
                            <p class="page-subtitle" style="margin:0;">${project.category} • Created on ${this.formatDate(project.createdAt)}</p>
                        </div>
                    </div>
                    <div style="display:flex; gap:var(--spacing-sm);">
                        <button class="btn btn-outline" onclick="app.showEditProjectModal('${project._id || project.id}')">
                            <i class="fas fa-edit"></i> Edit Project
                        </button>
                        <button class="btn btn-outline" style="color:var(--error-500); border-color:var(--error-200);" onclick="app.deleteProject('${project._id || project.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        <button class="btn btn-primary" onclick="app.showUploadDocumentModal('${project._id || project.id}')">
                            <i class="fas fa-upload"></i> Upload
                        </button>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--spacing-xl);">
                    <!-- Documents List -->
                    <div>
                        <div class="card">
                            <div class="card-header">
                                <h2 class="card-title">Project Documents</h2>
                                <span class="badge badge-gray">${documents.length} Files</span>
                            </div>
                            <div class="card-body" style="padding: 0;">
                                <div class="table-container" style="border:none; border-radius:0;">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Status</th>
                                                <th>Uploaded</th>
                                                <th>Size</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${documents.length > 0
                ? documents.map(doc => `
                                                    <tr>
                                                        <td>
                                                            <div style="display:flex; align-items:center; gap:var(--spacing-sm);">
                                                                <i class="fas fa-file-pdf" style="color:var(--error-500)"></i>
                                                                <span style="font-weight:600; cursor:pointer; color:var(--primary-600);" onclick="app.viewDocument('${doc._id || doc.id}')">${doc.title}</span>
                                                            </div>
                                                        </td>
                                                        <td><span class="badge badge-info">${doc.status}</span></td>
                                                        <td>${this.formatDate(doc.createdAt)}</td>
                                                        <td>${(doc.file?.size / 1024 / 1024).toFixed(2)} MB</td>
                                                        <td style="text-align:right;">
                                                            <button class="btn-icon" onclick="app.viewDocument('${doc._id || doc.id}')"><i class="fas fa-eye"></i></button>
                                                        </td>
                                                    </tr>
                                                `).join('')
                : '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--gray-500);">No documents in this project</td></tr>'
            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Project Info Sidebar -->
                    <div style="display:flex; flex-direction:column; gap:var(--spacing-lg);">
                        <!-- About -->
                        <div class="card">
                            <div class="card-header"><h3 class="card-title">About Project</h3></div>
                            <div class="card-body">
                                <p style="color:var(--gray-600); font-size:var(--font-size-sm); line-height:1.6; margin-bottom:var(--spacing-md);">
                                    ${project.description || 'No description provided.'}
                                </p>
                                <div class="properties-grid">
                                    <div class="property-item">
                                        <div class="property-label">STATUS</div>
                                        <div class="property-value"><span class="badge badge-success">${project.status}</span></div>
                                    </div>
                                    <div class="property-item">
                                        <div class="property-label">DUE DATE</div>
                                        <div class="property-value">${this.formatDate(project.dueDate) || 'No deadline'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Participants -->
                        <div class="card">
                            <div class="card-header"><h3 class="card-title">Team Members</h3></div>
                            <div class="card-body" style="padding:0;">
                                <div class="member-list">
                                    ${project.participants.map(p => `
                                        <div style="display:flex; align-items:center; gap:var(--spacing-md); padding:var(--spacing-md); border-bottom:1px solid var(--gray-100);">
                                            <img src="${p.user?.avatar || (uploaderImg + encodeURIComponent(p.user?.name || 'U'))}" style="width:32px; height:32px; border-radius:50%;">
                                            <div style="flex:1;">
                                                <div style="font-weight:600; font-size:var(--font-size-sm);">${p.user?.name || 'Unknown'}</div>
                                                <div style="font-size:var(--font-size-xs); color:var(--gray-500);">${p.role}</div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========================================
    // TEAM PAGE
    // ========================================
    async renderTeam() {
        const response = await API.getUsers();
        const users = response.data.users || [];
        this.allUsers = users; // Cache for local filtering

        return `
            <div class="team-page">
                <div class="page-header mb-4">
                    <div>
                        <h1 class="page-title">Team Management</h1>
                        <p class="page-subtitle">Manage system users, define roles, and organize departments.</p>
                    </div>
                    ${this.currentUser.role === 'Super Admin' || this.currentUser.role === 'Admin' ? `
                    <button class="btn btn-primary" onclick="app.showAddUserModal()">
                        <i class="fas fa-user-plus"></i>
                        Add Team Member
                    </button>
                    ` : ''}
                </div>

                <div class="card mb-4">
                    <div class="card-body">
                        <div class="filters-row">
                            <div class="search-group" style="flex: 1;">
                                <i class="fas fa-search"></i>
                                <input type="text" id="userSearch" class="form-input" placeholder="Search by name, email, or role...">
                            </div>
                            <div class="filter-group">
                                <select id="roleFilter" class="form-select" style="min-width: 150px;">
                                    <option value="">All Roles</option>
                                    <option value="Super Admin">Super Admin</option>
                                    <option value="Approver">Approver</option>
                                    <option value="Editor">Editor</option>
                                    <option value="Viewer">Viewer</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <select id="userStatusFilter" class="form-select" style="min-width: 130px;">
                                    <option value="">All Statuses</option>
                                    <option value="Active">Active</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <button class="btn btn-secondary" onclick="app.resetUserFilters()">
                                <i class="fas fa-undo"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>MEMBER</th>
                                    <th>ROLE</th>
                                    <th>DEPARTMENT</th>
                                    <th>STATUS</th>
                                    <th>LAST LOGIN</th>
                                    <th style="text-align: right;">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody id="usersTableBody">
                                ${users.map(u => this.renderUserRow(u)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderUserRow(user) {
        const roleColors = {
            'Super Admin': 'primary',
            'Approver': 'info',
            'Editor': 'warning',
            'Viewer': 'gray'
        };

        const statusColors = {
            'Active': 'success',
            'Pending': 'warning',
            'Inactive': 'gray',
            'Revoked': 'error'
        };

        const lastLoginStr = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never';

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: var(--spacing-md);">
                        <img src="${user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4F46E5&color=fff`}" 
                             style="width: 36px; height: 36px; border-radius: var(--radius-full);">
                        <div>
                            <div style="font-weight: 600; font-size: var(--font-size-sm);">${user.name}</div>
                            <div style="font-size: var(--font-size-xs); color: var(--gray-500);">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge badge-${roleColors[user.role] || 'gray'}">${user.role}</span>
                </td>
                <td>
                    <span style="font-size: var(--font-size-sm); color: var(--gray-600);">${user.department || 'N/A'}</span>
                </td>
                <td>
                    <span class="badge badge-${statusColors[user.status] || 'gray'}">${user.status}</span>
                </td>
                <td style="font-size: var(--font-size-sm); color: var(--gray-500);">
                    ${lastLoginStr}
                </td>
                <td style="text-align: right;">
                    ${(this.currentUser.role === 'Super Admin' || this.currentUser.role === 'Admin') && user.id !== this.currentUser.id ? `
                    <div style="display: flex; justify-content: flex-end; gap: var(--spacing-xs);">
                        <button class="btn-icon" onclick="app.showEditUserModal('${user.id}')" title="Edit Role/Dept">
                            <i class="fas fa-user-edit"></i>
                        </button>
                        <button class="btn-icon" style="color: var(--error-500);" onclick="app.deleteTeamMember('${user.id}')" title="Remove Member">
                            <i class="fas fa-user-times"></i>
                        </button>
                    </div>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    setupTeamPageListeners() {
        const userSearch = document.getElementById('userSearch');
        const roleFilter = document.getElementById('roleFilter');
        const userStatusFilter = document.getElementById('userStatusFilter');

        if (userSearch) userSearch.addEventListener('input', () => this.filterUsers());
        if (roleFilter) roleFilter.addEventListener('change', () => this.filterUsers());
        if (userStatusFilter) userStatusFilter.addEventListener('change', () => this.filterUsers());
    }

    filterUsers() {
        const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
        const role = document.getElementById('roleFilter')?.value || '';
        const status = document.getElementById('userStatusFilter')?.value || '';

        const filtered = this.allUsers.filter(user => {
            const matchesSearch = !searchTerm ||
                user.name.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm) ||
                (user.department && user.department.toLowerCase().includes(searchTerm));

            const matchesRole = !role || user.role === role;
            const matchesStatus = !status || user.status === status;

            return matchesSearch && matchesRole && matchesStatus;
        });

        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = filtered.length > 0
                ? filtered.map(u => this.renderUserRow(u)).join('')
                : '<tr><td colspan="6" style="text-align:center; padding:var(--spacing-xl); color:var(--gray-400);">No users found matching filters</td></tr>';
        }
    }

    resetUserFilters() {
        const userSearch = document.getElementById('userSearch');
        const roleFilter = document.getElementById('roleFilter');
        const userStatusFilter = document.getElementById('userStatusFilter');

        if (userSearch) userSearch.value = '';
        if (roleFilter) roleFilter.value = '';
        if (userStatusFilter) userStatusFilter.value = '';

        this.filterUsers();
    }

    async showAddUserModal() {
        const roles = ['Super Admin', 'Approver', 'Editor', 'Viewer'];
        const modal = `
            <div class="modal-overlay" id="addUserModal" onclick="app.closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <div>
                            <h2 class="modal-title">Add Team Member</h2>
                            <p class="modal-subtitle">Create a new user account and assign roles.</p>
                        </div>
                        <button class="modal-close" onclick="app.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Full Name <span style="color:var(--error-500)">*</span></label>
                            <input type="text" id="newUserName" class="form-input" placeholder="e.g. John Doe">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email Address <span style="color:var(--error-500)">*</span></label>
                            <input type="email" id="newUserEmail" class="form-input" placeholder="john@example.com">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Temporary Password <span style="color:var(--error-500)">*</span></label>
                            <input type="password" id="newUserPassword" class="form-input" value="Welcome123!">
                            <small style="color:var(--gray-500); font-size:10px;">User can change this later.</small>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                            <div class="form-group">
                                <label class="form-label">Role</label>
                                <select id="newUserRole" class="form-select">
                                    ${roles.map(r => `<option value="${r}">${r}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Department</label>
                                <input type="text" id="newUserDept" class="form-input" placeholder="e.g. Legal">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="app.saveNewUser()">Create User</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modalsContainer').innerHTML = modal;
    }

    async saveNewUser() {
        const name = document.getElementById('newUserName').value;
        const email = document.getElementById('newUserEmail').value;
        const password = document.getElementById('newUserPassword').value;
        const role = document.getElementById('newUserRole').value;
        const department = document.getElementById('newUserDept').value;

        if (!name || !email || !password) {
            alert('Please fill in name, email and temporary password');
            return;
        }

        const btn = document.querySelector('#addUserModal .btn-primary');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        btn.disabled = true;

        try {
            await API.createUser({ name, email, password, role, department });
            this.showToast('success', 'User Created', `${name} has been added to the team.`);
            this.closeModal();

            // Refresh table
            const content = await this.renderTeam();
            document.getElementById('pageContent').innerHTML = content;
            this.setupTeamPageListeners();
        } catch (error) {
            this.showToast('error', 'Failed', error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async showEditUserModal(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (!user) return;

        const roles = ['Super Admin', 'Approver', 'Editor', 'Viewer'];
        const modal = `
            <div class="modal-overlay" id="editUserModal" onclick="app.closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <div>
                            <h2 class="modal-title">Edit Team Member</h2>
                            <p class="modal-subtitle">Update permissions and details for ${user.name}.</p>
                        </div>
                        <button class="modal-close" onclick="app.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Department</label>
                            <input type="text" id="editUserDept" class="form-input" value="${user.department || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Role</label>
                            <select id="editUserRole" class="form-select">
                                ${roles.map(r => `<option value="${r}" ${user.role === r ? 'selected' : ''}>${r}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select id="editUserStatus" class="form-select">
                                <option value="Active" ${user.status === 'Active' ? 'selected' : ''}>Active</option>
                                <option value="Inactive" ${user.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                                <option value="Pending" ${user.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="app.saveEditedUser('${userId}')">Update User</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modalsContainer').innerHTML = modal;
    }

    async saveEditedUser(userId) {
        const department = document.getElementById('editUserDept').value;
        const role = document.getElementById('editUserRole').value;
        const status = document.getElementById('editUserStatus').value;

        const btn = document.querySelector('#editUserModal .btn-primary');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        try {
            await API.updateUser(userId, { department, role, status });
            this.showToast('success', 'User Updated', 'User details have been updated.');
            this.closeModal();

            // Refresh table
            const content = await this.renderTeam();
            document.getElementById('pageContent').innerHTML = content;
            this.setupTeamPageListeners();
        } catch (error) {
            this.showToast('error', 'Failed', error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async deleteTeamMember(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (!user) return;

        if (!confirm(`Are you sure you want to remove ${user.name} from the team? This action cannot be undone.`)) {
            return;
        }

        try {
            await API.deleteUser(userId);
            this.showToast('success', 'User Removed', 'The user has been deleted from the system.');

            // Refresh table
            const content = await this.renderTeam();
            document.getElementById('pageContent').innerHTML = content;
            this.setupTeamPageListeners();
        } catch (error) {
            this.showToast('error', 'Failed', error.message);
        }
    }
    // ========================================
    // AUDIT LOG PAGE
    // ========================================
    async renderAuditLog() {
        // Fetch logs with current filters
        const response = await API.getAuditLogs(this.auditFilters || {});
        // Fetch users for the filter dropdown
        const usersRes = await API.getUsers();
        const users = usersRes.data.users || [];

        const logs = response.data.logs || [];
        const filters = this.auditFilters || {};

        return `
            <div class="audit-log-page">
                <div class="page-header mb-4">
                    <div>
                        <h1 class="page-title">System Audit Log</h1>
                        <p class="page-subtitle">Track the complete history of document approvals, user actions, and system events.</p>
                    </div>
                </div>

                <!-- Filters -->
                <div class="card mb-4">
                    <div class="card-body">
                        <div class="filters-row" style="display: flex; gap: var(--spacing-md); flex-wrap: wrap; align-items: end;">
                            
                            <!-- Search (Client-side usually, or handled purely by backend if supported) -->
                            <!-- Note: Backend search not implemented for Audit logs in this iteration, keeping UI simple -->
                            
                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">User</label>
                                <select class="form-select" id="userFilterAudit" style="min-width: 150px;">
                                    <option value="">All Users</option>
                                    ${users.map(u => `<option value="${u.id}" ${filters.user === u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
                                </select>
                            </div>

                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">Action</label>
                                <select class="form-select" id="actionFilter" style="min-width: 140px;">
                                    <option value="">All Actions</option>
                                    <option value="LOGIN" ${filters.action === 'LOGIN' ? 'selected' : ''}>Login</option>
                                    <option value="UPLOAD" ${filters.action === 'UPLOAD' ? 'selected' : ''}>Upload</option>
                                    <option value="Updated" ${filters.action === 'Updated' ? 'selected' : ''}>Doc Updated</option>
                                    <option value="Deleted" ${filters.action === 'Deleted' ? 'selected' : ''}>Doc Deleted</option>
                                    <option value="Downloaded" ${filters.action === 'Downloaded' ? 'selected' : ''}>Doc Downloaded</option>
                                    <option value="Approved" ${filters.action === 'Approved' ? 'selected' : ''}>Approved</option>
                                    <option value="Rejected" ${filters.action === 'Rejected' ? 'selected' : ''}>Rejected</option>
                                    <option value="Changes Requested" ${filters.action === 'Changes Requested' ? 'selected' : ''}>Changes Req.</option>
                                    <option value="Project Created" ${filters.action === 'Project Created' ? 'selected' : ''}>Project Created</option>
                                    <option value="Project Updated" ${filters.action === 'Project Updated' ? 'selected' : ''}>Project Updated</option>
                                    <option value="Project Deleted" ${filters.action === 'Project Deleted' ? 'selected' : ''}>Project Deleted</option>
                                    <option value="User Created" ${filters.action === 'User Created' ? 'selected' : ''}>User Created</option>
                                    <option value="User Updated" ${filters.action === 'User Updated' ? 'selected' : ''}>User Updated</option>
                                    <option value="User Deleted" ${filters.action === 'User Deleted' ? 'selected' : ''}>User Deleted</option>
                                </select>
                            </div>

                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">Start Date</label>
                                <input type="date" class="form-input" id="startDateFilter" value="${filters.startDate || ''}">
                            </div>

                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">End Date</label>
                                <input type="date" class="form-input" id="endDateFilter" value="${filters.endDate || ''}">
                            </div>

                            <button class="btn btn-outline" onclick="app.resetAuditFilters()" style="height: 38px; margin-bottom: 1px;" title="Reset Filters">
                                <i class="fas fa-undo"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Audit Log Table -->
                <div class="card">
                    <div class="table-container">
                        <table class="table" id="auditTable">
                            <thead>
                                <tr>
                                    <th>TIMESTAMP</th>
                                    <th>USER</th>
                                    <th>ACTION</th>
                                    <th>DETAILS / DOCUMENT</th>
                                    <th>IP ADDRESS</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${logs.length > 0
                ? logs.map(log => this.renderAuditRow(log)).join('')
                : '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--gray-500);">No logs found matching criteria</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderAuditRow(log) {
        const user = log.user;
        const actionColors = {
            'LOGIN': 'success',
            'UPLOAD': 'info',
            'Updated': 'info',
            'Deleted': 'error',
            'Downloaded': 'gray',
            'VIEW': 'gray',
            'Approved': 'success',
            'Rejected': 'error',
            'Changes Requested': 'warning',
            'Project Created': 'primary',
            'Project Updated': 'info',
            'Project Deleted': 'error',
            'User Created': 'primary',
            'User Updated': 'info',
            'User Deleted': 'error'
        };

        const createdAt = log.created_at || log.createdAt;
        const dateStr = createdAt ? new Date(createdAt).toLocaleString() : 'Unknown';
        const ipAddress = log.ip_address || log.ipAddress || '-';
        const details = log.details || '';
        const docTitle = log.document_title || log.documentTitle || (log.document?.title !== 'Untitled' ? log.document?.title : '');

        return `
            <tr>
                <td>
                    <div style="font-weight: 600; font-size: var(--font-size-sm);">${dateStr.split(',')[0]}</div>
                    <div style="font-size: var(--font-size-xs); color: var(--gray-500);">${dateStr.split(',')[1] || ''}</div>
                </td>
                <td>
                    ${user && user.name !== 'Unknown' ? `
                        <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                            <img src="${user.avatar || 'https://via.placeholder.com/32'}" alt="${user.name}" style="width: 24px; height: 24px; border-radius: var(--radius-full); object-fit: cover;">
                            <span style="font-size: var(--font-size-sm); font-weight: 500;">${user.name}</span>
                        </div>
                    ` : '<span style="color:var(--gray-500); font-size: var(--font-size-sm);">System / Unknown</span>'}
                </td>
                <td>
                    <span class="badge badge-${(actionColors[log.action] || 'gray')}">${log.action}</span>
                </td>
                <td>
                    <div style="font-weight: 500; font-size: var(--font-size-sm); margin-bottom: 2px;">
                        ${docTitle || details || '-'}
                    </div>
                     ${docTitle && details ? `<div style="font-size: 11px; color: var(--gray-500);">${details}</div>` : ''}
                </td>
                <td style="color: var(--gray-500); font-family: monospace; font-size: 11px;">
                    ${ipAddress}
                </td>
            </tr>
        `;
    }

    setupAuditLogListeners() {
        const userFilter = document.getElementById('userFilterAudit');
        const actionFilter = document.getElementById('actionFilter');
        const startDateFilter = document.getElementById('startDateFilter');
        const endDateFilter = document.getElementById('endDateFilter');

        const updateFilters = () => {
            this.auditFilters = {
                user: userFilter ? userFilter.value : '',
                action: actionFilter ? actionFilter.value : '',
                startDate: startDateFilter ? startDateFilter.value : '',
                endDate: endDateFilter ? endDateFilter.value : ''
            };
            this.loadPage('audit-log');
        };

        if (userFilter) userFilter.addEventListener('change', updateFilters);
        if (actionFilter) actionFilter.addEventListener('change', updateFilters);
        if (startDateFilter) startDateFilter.addEventListener('change', updateFilters);
        if (endDateFilter) endDateFilter.addEventListener('change', updateFilters);
    }

    resetAuditFilters() {
        this.auditFilters = {};
        this.loadPage('audit-log');
    }

    // ========================================
    // SETTINGS PAGE
    // ========================================
    // ========================================
    // SETTINGS PAGE
    // ========================================
    renderSettings() {
        const user = this.currentUser;
        const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4F46E5&color=fff`;

        return `
            <div class="settings-page">
                <div class="page-header mb-4">
                    <h1 class="page-title">Settings</h1>
                    <p class="page-subtitle">Manage your account and application preferences</p>
                </div>

                <div class="settings-container" style="display: grid; grid-template-columns: 250px 1fr; gap: var(--spacing-xl);">
                    <!-- Settings Sidebar -->
                    <div class="card" style="height: fit-content;">
                        <div class="settings-nav">
                            <button class="settings-nav-item active" onclick="app.switchSettingsTab('profile')">
                                <i class="fas fa-user-circle"></i> Profile
                            </button>
                            <button class="settings-nav-item" onclick="app.switchSettingsTab('security')">
                                <i class="fas fa-lock"></i> Security
                            </button>
                            <button class="settings-nav-item" onclick="app.switchSettingsTab('notifications')">
                                <i class="fas fa-bell"></i> Notifications
                            </button>
                            ${user.role === 'Super Admin' ? `
                            <button class="settings-nav-item" onclick="app.switchSettingsTab('branding')">
                                <i class="fas fa-brush"></i> Branding
                            </button>
                            ` : ''}
                            <button class="settings-nav-item" onclick="app.switchSettingsTab('categories')">
                                <i class="fas fa-tags"></i> Project Categories
                            </button>
                        </div>
                    </div>

                    <!-- Settings Content -->
                    <div class="settings-content">
                        <!-- Profile Settings -->
                        <div id="settings-profile" class="card">
                            <div class="card-header">
                                <h2 class="card-title">Profile Information</h2>
                                <p class="card-subtitle">Update your photo and personal details.</p>
                            </div>
                            <div class="card-body">
                                <form onsubmit="app.saveProfile(event)">
                                    <div class="form-group" style="display: flex; align-items: center; gap: var(--spacing-lg);">
                                        <div style="position: relative;">
                                            <img src="${avatarUrl}" id="profileAvatarPreview" alt="Profile" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gray-200);">
                                            <input type="file" id="avatarUploadInput" style="display: none;" accept="image/*" onchange="app.handleAvatarUpload(event)">
                                        </div>
                                        <div>
                                            <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('avatarUploadInput').click()">
                                                <i class="fas fa-camera"></i> Change Photo
                                            </button>
                                            <p style="font-size: 11px; color: var(--gray-500); margin-top: 5px;">JPG, PNG. Max 2MB.</p>
                                        </div>
                                    </div>

                                    <div class="grid-2">
                                        <div class="form-group">
                                            <label class="form-label">Full Name</label>
                                            <input type="text" class="form-input" id="settingsName" value="${user.name}">
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Department</label>
                                            <input type="text" class="form-input" id="settingsDept" value="${user.department || ''}" placeholder="e.g. Engineering">
                                        </div>
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label">Email Address</label>
                                        <input type="email" class="form-input" id="settingsEmail" value="${user.email}" disabled style="background: var(--gray-100); cursor: not-allowed;">
                                        <small style="color: var(--gray-500);">Email address cannot be changed. Contact admin for assistance.</small>
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label">Role</label>
                                        <input type="text" class="form-input" value="${user.role}" disabled style="background: var(--gray-100);">
                                    </div>

                                    <div style="margin-top: var(--spacing-lg); text-align: right;">
                                        <button type="submit" class="btn btn-primary">Save Changes</button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <!-- Security Settings (Placeholder) -->
                        <div id="settings-security" class="card" style="display: none;">
                            <div class="card-header">
                                <h2 class="card-title">Security</h2>
                                <p class="card-subtitle">Manage your password and session settings.</p>
                            </div>
                            <div class="card-body">
                                <form onsubmit="app.changePassword(event)">
                                    <div class="form-group">
                                        <label class="form-label">Current Password</label>
                                        <input type="password" class="form-input">
                                    </div>
                                    <div class="grid-2">
                                        <div class="form-group">
                                            <label class="form-label">New Password</label>
                                            <input type="password" class="form-input">
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Confirm New Password</label>
                                            <input type="password" class="form-input">
                                        </div>
                                    </div>
                                    <div style="margin-top: var(--spacing-lg); text-align: right;">
                                        <button type="submit" class="btn btn-primary">Update Password</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                        
                        <div id="settings-notifications" class="card" style="display: none;">
                             <div class="card-header">
                                <h2 class="card-title">Notifications</h2>
                                <p class="card-subtitle">Manage how you received updates.</p>
                            </div>
                            <div class="card-body">
                                <p>Notification settings coming soon...</p>
                            </div>
                        </div>

                        <!-- Branding Settings (Admin Only) -->
                        <div id="settings-branding" class="card" style="display: none;">
                            <div class="card-header">
                                <h2 class="card-title">Application Branding</h2>
                                <p class="card-subtitle">Customize the appearance of the application.</p>
                            </div>
                            <div class="card-body">
                                <form onsubmit="app.saveBranding(event)">
                                    <div class="form-group">
                                        <label class="form-label">System Name</label>
                                        <input type="text" class="form-input" id="brandingName" value="${this.branding.name || 'Domasy'}">
                                    </div>

                                    <div class="form-group" style="margin-top: var(--spacing-md);">
                                        <label class="form-label">Display Mode</label>
                                        <select class="form-input" id="brandingDisplayMode">
                                            <option value="both" ${this.branding.displayMode === 'both' ? 'selected' : ''}>Logo and Name</option>
                                            <option value="logo-only" ${this.branding.displayMode === 'logo-only' ? 'selected' : ''}>Logo Only</option>
                                            <option value="name-only" ${this.branding.displayMode === 'name-only' ? 'selected' : ''}>Name Only</option>
                                        </select>
                                    </div>
                                    
                                    <div class="grid-2" style="margin-top: var(--spacing-md);">
                                        <div class="form-group">
                                            <label class="form-label">Sidebar Background Color</label>
                                            <div style="display: flex; align-items: center; gap: var(--spacing-md);">
                                                <input type="color" class="form-input" id="brandingSidebarColor" value="${this.branding.sidebarColor || '#243B53'}" style="width: 50px; padding: 2px; height: 38px;">
                                                <span style="font-size: var(--font-size-sm); color: var(--gray-500);">${this.branding.sidebarColor || '#243B53 (Default)'}</span>
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Sidebar Text Color</label>
                                            <div style="display: flex; align-items: center; gap: var(--spacing-md);">
                                                <input type="color" class="form-input" id="brandingSidebarTextColor" value="${this.branding.sidebarTextColor || '#ffffff'}" style="width: 50px; padding: 2px; height: 38px;">
                                                <span style="font-size: var(--font-size-sm); color: var(--gray-500);">${this.branding.sidebarTextColor || '#ffffff (Default)'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="grid-2" style="margin-top: var(--spacing-md);">
                                        <div class="form-group">
                                            <label class="form-label">Active Item Background</label>
                                            <div style="display: flex; align-items: center; gap: var(--spacing-md);">
                                                <input type="color" class="form-input" id="brandingSidebarActiveBg" value="${this.branding.sidebarActiveBg || '#4f46e5'}" style="width: 50px; padding: 2px; height: 38px;">
                                                <span style="font-size: var(--font-size-sm); color: var(--gray-500);">${this.branding.sidebarActiveBg || '#4f46e5'}</span>
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">Active Item Indicator</label>
                                            <div style="display: flex; align-items: center; gap: var(--spacing-md);">
                                                <input type="color" class="form-input" id="brandingSidebarActiveIndicator" value="${this.branding.sidebarActiveIndicator || '#818cf8'}" style="width: 50px; padding: 2px; height: 38px;">
                                                <span style="font-size: var(--font-size-sm); color: var(--gray-500);">${this.branding.sidebarActiveIndicator || '#818cf8'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="form-group" style="margin-top: var(--spacing-md);">
                                        <label class="form-label">Active Item Text Color</label>
                                        <div style="display: flex; align-items: center; gap: var(--spacing-md);">
                                            <input type="color" class="form-input" id="brandingSidebarActiveTextColor" value="${this.branding.sidebarActiveTextColor || this.branding.sidebarRoleColor || '#ffffff'}" style="width: 50px; padding: 2px; height: 38px;">
                                            <span style="font-size: var(--font-size-sm); color: var(--gray-500);">${this.branding.sidebarActiveTextColor || this.branding.sidebarRoleColor || '#ffffff (Default)'}</span>
                                        </div>
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label">System Logo</label>
                                        <div style="display: flex; align-items: start; gap: var(--spacing-lg); margin-top: 10px;">
                                            <div style="width: 60px; height: 60px; background: var(--gray-100); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; border: 1px dashed var(--gray-300);">
                                                ${this.branding.logo ? `<img src="${this.branding.logo}" style="max-width: 100%; max-height: 100%;">` : `<i class="fas fa-image" style="color: var(--gray-400);"></i>`}
                                            </div>
                                            <div>
                                                <input type="file" id="logoUploadInput" style="display: none;" accept="image/*" onchange="app.handleLogoUpload(event)">
                                                <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('logoUploadInput').click()">Upload Logo</button>
                                                <p style="font-size: 11px; color: var(--gray-500); margin-top: 5px;">Recommended size: 60x60px. PNG or SVG.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div style="margin-top: var(--spacing-lg); text-align: right;">
                                        <button type="submit" class="btn btn-primary">Update Branding</button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <!-- Categories Settings -->
                        <div id="settings-categories" class="card" style="display: none;">
                            <div class="card-header">
                                <h2 class="card-title">Project Categories</h2>
                                <p class="card-subtitle">Manage the list of available project categories.</p>
                            </div>
                            <div class="card-body">
                                <div class="form-group" style="display:flex; gap:var(--spacing-md);">
                                    <input type="text" id="newCategoryInput" class="form-input" placeholder="New Category Name">
                                    <button class="btn btn-primary" onclick="app.addCategory()">Add</button>
                                </div>
                                <div id="settingsCategoriesList" style="margin-top: var(--spacing-lg);">
                                    <div style="text-align:center; color:var(--gray-500);">Loading...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    switchSettingsTab(tabName) {
        // Update Nav
        document.querySelectorAll('.settings-nav-item').forEach(item => item.classList.remove('active'));
        event.target.closest('.settings-nav-item').classList.add('active');

        // Update Content
        ['profile', 'security', 'notifications', 'categories', 'branding'].forEach(tab => {
            const el = document.getElementById(`settings-${tab}`);
            if (el) el.style.display = tab === tabName ? 'block' : 'none';
        });

        if (tabName === 'categories') {
            this.loadSettingsCategories();
        }
    }

    async saveProfile(e) {
        e.preventDefault();
        const name = document.getElementById('settingsName').value;
        const department = document.getElementById('settingsDept').value;

        this.showLoader();

        try {
            const response = await API.updateProfile({ name, department });
            if (response.success) {
                this.currentUser = { ...this.currentUser, name, department };
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                this.updateUserProfileUI();
                this.showToast('success', 'Profile Updated', 'Your profile details have been saved.');
            }
        } catch (error) {
            console.error('Update profile failed:', error);
            this.showToast('error', 'Update Failed', error.message || 'Could not update profile');
        } finally {
            this.hideLoader();
        }
    }

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        this.showLoader();

        try {
            const response = await API.updateAvatar(formData);
            if (response.success) {
                const user = response.data.user;
                this.currentUser = { ...this.currentUser, avatar: user.avatar };
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                this.updateUserProfileUI();

                // Update preview in settings if visible
                const preview = document.getElementById('profileAvatarPreview');
                if (preview) preview.src = user.avatar;

                this.showToast('success', 'Photo Updated', 'Your profile photo has been updated.');
            }
        } catch (error) {
            console.error('Avatar upload failed:', error);
            this.showToast('error', 'Upload Failed', error.message || 'Could not upload photo');
        } finally {
            this.hideLoader();
        }
    }

    async saveBranding(e) {
        e.preventDefault();
        const name = document.getElementById('brandingName').value;
        const displayMode = document.getElementById('brandingDisplayMode').value;
        const sidebarColor = document.getElementById('brandingSidebarColor').value;
        const sidebarTextColor = document.getElementById('brandingSidebarTextColor').value;
        const sidebarActiveBg = document.getElementById('brandingSidebarActiveBg').value;
        const sidebarActiveIndicator = document.getElementById('brandingSidebarActiveIndicator').value;
        const sidebarActiveTextColor = document.getElementById('brandingSidebarActiveTextColor').value;

        this.showLoader();

        try {
            const response = await API.updateSettings('branding', {
                name,
                displayMode,
                sidebarColor,
                sidebarTextColor,
                sidebarActiveBg,
                sidebarActiveIndicator,
                sidebarActiveTextColor
            });
            if (response.success) {
                this.branding.name = name;
                this.branding.displayMode = displayMode;
                this.branding.sidebarColor = sidebarColor;
                this.branding.sidebarTextColor = sidebarTextColor;
                this.branding.sidebarActiveBg = sidebarActiveBg;
                this.branding.sidebarActiveIndicator = sidebarActiveIndicator;
                this.branding.sidebarActiveTextColor = sidebarActiveTextColor;
                this.updateBrandingUI();
                this.showToast('success', 'Branding Updated', 'System branding settings have been saved.');
            }
        } catch (error) {
            console.error('Update branding failed:', error);
            this.showToast('error', 'Update Failed', error.message || 'Could not update branding');
        } finally {
            this.hideLoader();
        }
    }

    async handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        this.showLoader();

        try {
            const response = await API.uploadBrandingAsset('logo', formData);
            if (response.success) {
                this.branding = {
                    ...this.branding,
                    ...response.data.settings
                };
                this.updateBrandingUI();
                this.navigateTo('settings'); // Refresh settings view
                this.showToast('success', 'Logo Uploaded', 'System logo has been updated.');
            }
        } catch (error) {
            console.error('Logo upload failed:', error);
            this.showToast('error', 'Upload Failed', error.message || 'Could not upload logo');
        } finally {
            this.hideLoader();
        }
    }

    async changePassword(e) {
        e.preventDefault();
        this.showToast('info', 'Not Implemented', 'Password change is not yet available in this demo.');
    }

    setupSettingsPageListeners() {
        // Initial load if on categories tab (not default, but good practice)
    }

    async loadSettingsCategories() {
        const listContainer = document.getElementById('settingsCategoriesList');
        if (!listContainer) return;

        listContainer.innerHTML = '<div style="text-align:center; color:var(--gray-500);"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

        try {
            const response = await API.getCategories();
            const categories = response.data.categories || [];

            if (categories.length === 0) {
                listContainer.innerHTML = '<div style="text-align:center; color:var(--gray-500);">No categories found.</div>';
                return;
            }

            listContainer.innerHTML = `
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${categories.map(cat => `
                                <tr>
                                    <td>${cat.name}</td>
                                    <td style="text-align:right;">
                                        <button class="btn-icon" style="color:var(--error-500);" onclick="app.deleteCategory('${cat.id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error(error);
            listContainer.innerHTML = `<div style="color:var(--error-500);">Failed to load categories: ${error.message}</div>`;
        }
    }

    async addCategory() {
        const input = document.getElementById('newCategoryInput');
        const name = input.value.trim();
        if (!name) return;

        try {
            await API.createCategory(name);
            input.value = '';
            this.showToast('success', 'Success', 'Category added');
            this.loadSettingsCategories();
        } catch (error) {
            this.showToast('error', 'Error', error.message);
        }
    }

    async deleteCategory(id) {
        if (!confirm('Are you sure you want to delete this category?')) return;

        try {
            await API.deleteCategory(id);
            this.showToast('success', 'Success', 'Category deleted');
            this.loadSettingsCategories();
        } catch (error) {
            this.showToast('error', 'Error', error.message);
        }
    }

    // ========================================
    // MODALS
    // ========================================

    async showCreateProjectModal() {
        let categories = [];
        try {
            const response = await API.getCategories();
            categories = (response.data.categories || []).map(c => c.name);
        } catch (e) {
            console.error('Failed to load categories', e);
            categories = ['General']; // Fallback
        }

        const modal = `
            <div class="modal-overlay" id="createProjectModal" onclick="app.closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <div>
                            <h2 class="modal-title">Create Project</h2>
                            <p class="modal-subtitle">Define your project details and assign your team.</p>
                        </div>
                        <button class="modal-close" onclick="app.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Project Name <span style="color:var(--error-500)">*</span></label>
                            <input type="text" id="projectTitle" class="form-input" placeholder="e.g., Q3 Financial Report">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <select id="projectCategory" class="form-select">
                                <option value="General">Select category</option>
                                ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea id="projectDesc" class="form-textarea" placeholder="Describe project goals..."></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Due Date</label>
                            <input type="date" id="projectDueDate" class="form-input">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="app.createProject()">Create Project</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalsContainer').innerHTML = modal;
    }

    async showUploadDocumentModal(preSelectedProjectId = null) {
        let projects = [];
        let categories = [];
        let users = [];
        try {
            const [projectsRes, categoriesRes, usersRes] = await Promise.all([
                API.getProjects(),
                API.getCategories(),
                API.getUsers()
            ]);
            projects = (projectsRes.data.projects || []).sort((a, b) => a.name.localeCompare(b.name));
            categories = (categoriesRes.data.categories || []).map(c => c.name);
            if (categories.length === 0) categories = ['General'];
            users = (usersRes.data.users || []).filter(u => u.role !== 'Viewer'); // Only approvers/editors
        } catch (error) {
            console.error('Failed to load data', error);
            // Fallback
            categories = ['General', 'Finance', 'HR', 'Legal', 'Marketing'];
        }

        const modal = `
            <div class="modal-overlay" id="uploadDocumentModal" onclick="app.closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()" style="max-width: 900px;">
                    <div class="modal-header">
                        <div>
                            <h2 class="modal-title">Upload New Document</h2>
                            <p class="modal-subtitle">Add a new file to the system.</p>
                        </div>
                        <button class="modal-close" onclick="app.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg);">
                            <div>
                                <div class="form-group">
                                    <label class="form-label">Document Title</label>
                                    <input type="text" id="uploadTitle" class="form-input" placeholder="e.g., Q3 2023 Financial Report">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Project <span style="color:var(--error-500)">*</span></label>
                                    <select id="uploadProject" class="form-select">
                                        <option value="">Select a project...</option>
                                        ${projects.map(p => `
                                            <option value="${p._id || p.id}" ${preSelectedProjectId === (p._id || p.id) ? 'selected' : ''}>
                                                ${p.name}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Tag / Category</label>
                                    <select id="uploadCategory" class="form-select">
                                        <option value="General">General</option>
                                        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Description <span style="color: var(--gray-400);">(Optional)</span></label>
                                    <textarea id="uploadDesc" class="form-textarea" placeholder="Briefly describe the contents..." style="min-height:80px;"></textarea>
                                </div>
                                
                                <!-- Reviewers Section -->
                                <div class="form-group">
                                    <label class="form-label">
                                        Assign Reviewers 
                                        <span style="color: var(--gray-400);">(Optional)</span>
                                    </label>
                                    <p style="font-size: var(--font-size-xs); color: var(--gray-500); margin-bottom: var(--spacing-sm);">
                                        Select team members who need to review this document
                                    </p>
                                    <div id="reviewersList" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: var(--spacing-sm);">
                                        ${users.length > 0 ? users.map(user => `
                                            <label style="display: flex; align-items: center; padding: var(--spacing-xs); cursor: pointer; border-radius: var(--radius-sm); transition: background 0.2s;" onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background='transparent'">
                                                <input type="checkbox" class="reviewer-checkbox" value="${user.id}" style="margin-right: var(--spacing-sm);">
                                                <img src="${user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4F46E5&color=fff`}" style="width: 24px; height: 24px; border-radius: 50%; margin-right: var(--spacing-sm);">
                                                <div style="flex: 1;">
                                                    <div style="font-weight: 500; font-size: var(--font-size-sm);">${user.name}</div>
                                                    <div style="font-size: var(--font-size-xs); color: var(--gray-500);">${user.role} • ${user.department || 'N/A'}</div>
                                                </div>
                                            </label>
                                        `).join('') : '<div style="padding: var(--spacing-md); text-align: center; color: var(--gray-500);">No users available</div>'}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label class="form-label">File Attachment</label>
                                <div class="upload-area" onclick="document.getElementById('docFileInput').click()" style="cursor:pointer; height:200px; display:flex; flex-direction:column; justify-content:center; border: 2px dashed var(--gray-300); background: var(--gray-50);">
                                    <i class="fas fa-cloud-upload-alt" style="font-size:3rem; color:var(--primary-300); margin-bottom:var(--spacing-md);"></i>
                                    <h3>Click to upload</h3>
                                    <p>PDF, DOCX, PNG (max. 25MB)</p>
                                    <input type="file" id="docFileInput" hidden onchange="app.handleFileSelect(event)">
                                </div>
                                <div id="selectedFileInfo" style="margin-top: var(--spacing-md); display:none;">
                                    <div class="document-preview-info" style="border: 1px solid var(--gray-200); border-radius:var(--radius-lg); padding: var(--spacing-md);">
                                        <div id="fileName" style="font-weight: 600; font-size: var(--font-size-sm);"></div>
                                        <div id="fileSize" style="font-size: var(--font-size-xs); color: var(--gray-500);"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="app.uploadDocument()">
                            <i class="fas fa-upload"></i>
                            Upload & Notify
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalsContainer').innerHTML = modal;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            document.getElementById('selectedFileInfo').style.display = 'block';
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('fileSize').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
            // Auto-fill title if empty
            const titleInput = document.getElementById('uploadTitle');
            if (!titleInput.value) {
                titleInput.value = file.name.split('.')[0];
            }
        }
    }

    async uploadDocument() {
        const fileInput = document.getElementById('docFileInput');
        const file = fileInput.files[0];
        const title = document.getElementById('uploadTitle').value;
        const description = document.getElementById('uploadDesc').value;
        const category = document.getElementById('uploadCategory').value;
        const project = document.getElementById('uploadProject').value;

        // Collect selected reviewers
        const reviewerCheckboxes = document.querySelectorAll('.reviewer-checkbox:checked');
        const reviewers = Array.from(reviewerCheckboxes).map(cb => cb.value);

        if (!file) {
            this.showToast('error', 'Missing File', 'Please select a file to upload.');
            return;
        }
        if (!title) {
            this.showToast('error', 'Missing Title', 'Please enter a document title.');
            return;
        }
        if (!project) {
            this.showToast('error', 'Missing Project', 'Please select a project.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('tags', category);
        formData.append('project', project);

        // Append reviewers as JSON string
        if (reviewers.length > 0) {
            formData.append('reviewers', JSON.stringify(reviewers));
        }

        // Show loading state
        const btn = document.querySelector('#uploadDocumentModal .btn-primary');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        btn.disabled = true;

        try {
            await API.uploadDocument(formData);
            this.showToast('success', 'Document Uploaded', 'Your document has been uploaded successfully.');
            this.closeModal();
            // Refresh dashboard or documents list
            if (this.currentPage === 'dashboard') {
                const html = await this.renderDashboard();
                document.getElementById('pageContent').innerHTML = html;
            }
            if (this.currentPage === 'documents') {
                const html = await this.renderDocuments();
                document.getElementById('pageContent').innerHTML = html;
            }
            if (this.currentPage === 'project-details') {
                this.viewProject(this.currentProjectViewId);
            }
        } catch (error) {
            console.error(error);
            this.showToast('error', 'Upload Failed', error.message);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async showUploadRevisionModal(docId) {
        const modal = `
            <div class="modal-overlay" id="uploadRevisionModal" onclick="app.closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()" style="max-width: 600px;">
                    <div class="modal-header">
                        <div>
                            <h2 class="modal-title">Upload Revision</h2>
                            <p class="modal-subtitle">Upload a new version of this document.</p>
                        </div>
                        <button class="modal-close" onclick="app.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">New File</label>
                            <input type="file" class="form-input" id="revisionFileInput" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg">
                            <p class="form-help">Max size: 10MB. Allowed: PDF, Word, Excel, Images.</p>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Revision Note</label>
                            <textarea class="form-input" id="revisionNote" rows="3" placeholder="What changed in this version?"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="app.submitUploadRevision('${docId}')">
                            <i class="fas fa-upload"></i> Upload Revision
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modalsContainer').innerHTML = modal;
    }

    async submitUploadRevision(docId) {
        const fileInput = document.getElementById('revisionFileInput');
        const note = document.getElementById('revisionNote').value;
        const file = fileInput.files[0];

        if (!file) {
            this.showToast('error', 'Missing File', 'Please select a file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('note', note);

        // Show loading state
        const btn = document.querySelector('#uploadRevisionModal .btn-primary');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        btn.disabled = true;

        try {
            await API.uploadRevision(docId, formData);
            this.showToast('success', 'Revision Uploaded', 'New version has been uploaded successfully.');
            this.closeModal();
            // Refresh document view to show new version
            this.viewDocument(docId);
        } catch (error) {
            console.error(error);
            this.showToast('error', 'Upload Failed', error.message);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async viewDocument(docId) {
        try {
            const response = await API.getDocument(docId);
            const doc = response.data.document;
            const workflow = response.data.workflow;
            const uploader = doc.uploadedBy || {};

            // Normalize Supabase fields
            const fileUrl = doc.file_url || doc.file?.url || '';
            const fileName = doc.file_name || doc.file?.filename || '';
            const fileOriginalName = doc.file_original_name || doc.file?.originalName || '';
            const fileMimetype = doc.file_mimetype || doc.file?.mimetype || '';
            const rawFileSize = doc.file_size || doc.file?.size || 0;
            const createdAt = doc.created_at || doc.createdAt;

            // Thumbnail handling
            let thumbnail = doc.thumbnail;
            if (!thumbnail && fileMimetype.startsWith('image/') && fileUrl) {
                thumbnail = fileUrl.startsWith('http') ? fileUrl : `http://localhost:5000${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
            }

            // Ensure thumbnail has full URL if it exists
            if (thumbnail && !thumbnail.startsWith('http')) {
                thumbnail = `http://localhost:5000${thumbnail.startsWith('/') ? '' : '/'}${thumbnail}`;
            }

            const fileSize = (rawFileSize / 1024 / 1024).toFixed(2) + ' MB';
            const dateObj = new Date(createdAt);
            const formattedDate = !isNaN(dateObj)
                ? `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Unknown Date';

            // Check permissions with robust ID matching
            const currentUserId = this.currentUser.id || this.currentUser._id;
            const uploaderId = uploader.id || uploader._id;

            // Allow if IDs match (as strings) OR if Super Admin
            const isUploader = currentUserId && uploaderId && String(currentUserId) === String(uploaderId);
            const isSuperAdmin = this.currentUser.role === 'Super Admin';

            const canEdit = isUploader || isSuperAdmin;

            // Re-upload permission: Uploader or Admin can upload revision if Rejected or Changes Requested
            const canUploadRevision = (isUploader || isSuperAdmin) &&
                (doc.status === 'Rejected' || doc.status === 'Changes Requested');

            // Watermark Logic
            let watermarkText = '';
            let watermarkClass = '';
            if (doc.status === 'Approved') {
                watermarkText = 'APPROVED';
                watermarkClass = 'approved';
            } else if (doc.status === 'Rejected') {
                watermarkText = 'REJECTED';
                watermarkClass = 'rejected';
            } else if (doc.status === 'Changes Requested' || doc.status === 'In Review') {
                watermarkText = doc.status.toUpperCase();
                watermarkClass = 'draft';
            }

            const modal = `
                <div class="modal-overlay" id="viewDocumentModal" onclick="app.closeModal(event)">
                    <div class="modal" onclick="event.stopPropagation()" style="max-width: 1200px;">
                        <div class="modal-header">
                            <div>
                                <h2 class="modal-title">${doc.title}</h2>
                                <div style="display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-sm);">
                                    <span class="badge badge-info">${doc.status}</span>
                                    <span class="badge badge-gray">v${doc.version || 1}</span>
                                </div>
                            </div>
                            <div style="display: flex; gap: var(--spacing-sm);">
                                ${canUploadRevision ? `
                                    <button class="btn btn-primary btn-sm" onclick="app.showUploadRevisionModal('${docId}')">
                                        <i class="fas fa-upload"></i> Upload Revision
                                    </button>
                                ` : ''}
                                ${canEdit ? `
                                    <button class="btn btn-outline btn-sm" onclick="app.showEditDocumentModal('${docId}')">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="btn btn-outline btn-sm" style="color: var(--error-600); border-color: var(--error-200);" onclick="app.deleteDocument('${docId}')">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                ` : ''}
                                <button class="modal-close" onclick="app.closeModal()">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div class="modal-body" style="padding: 0;">
                            <div style="display: grid; grid-template-columns: 1fr 400px; min-height: 600px;">
                                <!-- Document Viewer -->
                                <div style="background: var(--gray-100); display: flex; align-items: center; justify-content: center; padding: var(--spacing-xl); position: relative; overflow: hidden;">
                                    
                                    ${watermarkText ? `
                                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; font-weight: 800; color: rgba(0,0,0,0.1); z-index: 10; pointer-events: none; border: 8px solid currentColor; padding: 20px 40px; white-space: nowrap; opacity: 0.4; text-transform: uppercase;" class="watermark-${watermarkClass}">
                                            ${watermarkText}
                                        </div>
                                    ` : ''}

                                    <div style="background: white; padding: var(--spacing-xl); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); max-width: 600px; width: 100%; position: relative; z-index: 1; min-height: 400px; display: flex; align-items: center; justify-content: center;">
                                        ${thumbnail
                    ? `<img src="${thumbnail}" alt="${doc.title}" style="max-width: 100%; max-height: 100%; border-radius: var(--radius-md); object-fit: contain;">`
                    : (fileMimetype === 'application/pdf'
                        ? `<div id="pdf-preview-container" style="width: 100%; height: 100%; display: flex; justify-content: center;"><canvas id="pdf-render" style="max-width: 100%; border-radius: var(--radius-md); box-shadow: 0 0 10px rgba(0,0,0,0.1);"></canvas></div>`
                        : `<div style="text-align:center;padding:50px;">
                             <i class="fas fa-file-alt fa-5x" style="color:var(--gray-300)"></i>
                             <div style="margin-top: 20px; font-weight: 600; color: var(--gray-600);">${fileOriginalName || 'Document'}</div>
                             <br><br>
                             <a href="${fileUrl}" target="_blank" class="btn btn-primary" style="display:inline-block;">
                                <i class="fas fa-download"></i> Download File
                             </a>
                           </div>`
                    )
                }
                                    </div>
                                </div>

                                <!-- Sidebar -->
                                <div style="border-left: 1px solid var(--gray-200); display: flex; flex-direction: column;">
                                    <!-- Tabs -->
                                    <div style="display: flex; border-bottom: 1px solid var(--gray-200);">
                                        <button class="tab-btn active" onclick="app.switchTab(event, 'details')">Details</button>
                                        <button class="tab-btn" onclick="app.switchTab(event, 'workflow')">Workflow</button>
                                    </div>

                                    <!-- Tab Content -->
                                    <div style="flex: 1; overflow-y: auto;">
                                        <!-- Details Tab -->
                                        <div id="detailsTab" class="tab-content active" style="padding: var(--spacing-lg);">
                                            <h3 style="font-size: var(--font-size-base); font-weight: 700; margin-bottom: var(--spacing-md);">Properties</h3>
                                            <div class="properties-grid">
                                                <div class="property-item">
                                                    <div class="property-label">UPLOADED BY</div>
                                                    <div class="property-value">${uploader.name || 'Unknown'}</div>
                                                </div>
                                                <div class="property-item">
                                                    <div class="property-label">DATE / TIME</div>
                                                    <div class="property-value">${formattedDate}</div>
                                                </div>
                                                <div class="property-item">
                                                    <div class="property-label">Size</div>
                                                    <div class="property-value">${fileSize}</div>
                                                </div>
                                            </div>
                                            <div class="property-item" style="margin-top: var(--spacing-md);">
                                                <div class="property-label">DESCRIPTION</div>
                                                <div class="property-value">${doc.description || 'No description'}</div>
                                            </div>

                                            <div style="margin-top: var(--spacing-xl);">
                                                <a href="${fileUrl}" target="_blank" class="btn btn-outline" style="width: 100%; margin-bottom: var(--spacing-sm); display: flex; align-items: center; justify-content: center; gap: 8px;">
                                                    <i class="fas fa-external-link-alt"></i> View Full File
                                                </a>
                                                
                                                ${(() => {
                    // Determine if current user should see action buttons
                    if (!workflow) return '';

                    const overallStatus = workflow.overall_status || workflow.overallStatus;
                    if (overallStatus === 'Approved' || overallStatus === 'Rejected') return '';

                    const stageIndex = workflow.current_stage_index ?? workflow.currentStageIndex ?? 0;
                    const currentStage = workflow.stages ? workflow.stages[stageIndex] : null;

                    const currentUserId = this.currentUser.id || this.currentUser._id;

                    // Assignee could be a string ID or an object with id
                    let stageAssigneeId = null;
                    if (currentStage) {
                        stageAssigneeId = typeof currentStage.assignee === 'object'
                            ? (currentStage.assignee?.id || currentStage.assignee?._id)
                            : currentStage.assignee;
                    }

                    const isCurrentApprover = stageAssigneeId && currentUserId && String(stageAssigneeId) === String(currentUserId);

                    // Check if user is any assignee in the pending stages
                    const isAnyPendingReviewer = workflow.stages && workflow.stages.some(stage => {
                        if (stage.status === 'current' || stage.status === 'pending') {
                            const assigneeId = typeof stage.assignee === 'object'
                                ? (stage.assignee?.id || stage.assignee?._id)
                                : stage.assignee;
                            return assigneeId && String(assigneeId) === String(currentUserId);
                        }
                        return false;
                    });

                    // Allow Super Admins and users with Approver role
                    const isSuperAdmin = this.currentUser.role === 'Super Admin';
                    const isApproverRole = this.currentUser.role === 'Approver';

                    if (!isCurrentApprover && !isAnyPendingReviewer && !isSuperAdmin && !isApproverRole) return '';

                    return `
                                                    <div style="margin-top: var(--spacing-lg); border-top: 1px solid var(--gray-100); padding-top: var(--spacing-lg);">
                                                        <h4 style="font-size: var(--font-size-sm); margin-bottom: var(--spacing-md);">YOUR ACTION REQUIRED</h4>
                                                        <button class="btn btn-primary" onclick="app.approveWorkflow('${docId}', '${workflow.id}')" style="width: 100%; margin-bottom: var(--spacing-sm);">
                                                            <i class="fas fa-check"></i> Approve Document
                                                        </button>
                                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm);">
                                                            <button class="btn btn-outline" onclick="app.requestWorkflowChanges('${docId}', '${workflow.id}')">
                                                                <i class="fas fa-edit"></i> Revision
                                                            </button>
                                                            <button class="btn btn-outline" style="color: var(--error-600); border-color: var(--error-200);" onclick="app.rejectWorkflow('${docId}', '${workflow.id}')">
                                                                <i class="fas fa-times"></i> Reject
                                                            </button>
                                                        </div>
                                                    </div>
                                                    `;
                })()}
                                            </div>
                                        </div>

                                        <!-- Workflow Tab -->
                                        <div id="workflowTab" class="tab-content" style="padding: var(--spacing-lg); display: none;">
                                            <h3 style="font-size: var(--font-size-base); font-weight: 700; margin-bottom: var(--spacing-md);">Approval Chain</h3>
                                            ${this.renderWorkflowChain(workflow)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('modalsContainer').innerHTML = modal;

            // Inject dynamic style for watermark colors
            if (!document.getElementById('watermarkStyles')) {
                const style = document.createElement('style');
                style.id = 'watermarkStyles';
                style.innerHTML = `
                    .watermark-approved { color: rgba(22, 163, 74, 0.4) !important; border-color: rgba(22, 163, 74, 0.4) !important; }
                    .watermark-rejected { color: rgba(220, 38, 38, 0.4) !important; border-color: rgba(220, 38, 38, 0.4) !important; }
                    .watermark-draft { color: rgba(202, 138, 4, 0.4) !important; border-color: rgba(202, 138, 4, 0.4) !important; }
                `;
                document.head.appendChild(style);
            }

            // Render PDF if needed (Client-side fallback)
            if (!thumbnail && doc.file?.mimetype === 'application/pdf' && doc.file?.url) {
                const canvas = document.getElementById('pdf-render');
                if (canvas && window.pdfjsLib) {
                    try {
                        let url = doc.file.url;
                        if (!url.startsWith('http')) {
                            url = `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
                        }

                        const loadingTask = pdfjsLib.getDocument(url);
                        loadingTask.promise.then(function (pdf) {
                            pdf.getPage(1).then(function (page) {
                                const scale = 1.0;
                                const viewport = page.getViewport({ scale: scale });
                                const context = canvas.getContext('2d');

                                // Limit max width to container
                                const containerWidth = 500;
                                const finalScale = containerWidth / viewport.width;
                                const scaledViewport = page.getViewport({ scale: finalScale });

                                canvas.height = scaledViewport.height;
                                canvas.width = scaledViewport.width;

                                const renderContext = {
                                    canvasContext: context,
                                    viewport: scaledViewport
                                };
                                page.render(renderContext);
                            });
                        }).catch(err => {
                            console.error('PDF Render Error:', err);
                            canvas.parentNode.innerHTML = '<div style="color:red">Failed to preview PDF</div>';
                        });
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        } catch (error) {
            console.error(error);
            this.showToast('error', 'Error', 'Failed to load document details');
        }
    }

    async showEditDocumentModal(docId) {
        try {
            const response = await API.getDocument(docId);
            const doc = response.data.document;
            const workflow = response.data.workflow;

            // Fetch projects, categories, and users
            const [projectsRes, categoriesRes, usersRes] = await Promise.all([
                API.getProjects(),
                API.getCategories(),
                API.getUsers()
            ]);

            const projects = projectsRes.data.projects || [];
            const categories = (categoriesRes.data.categories || []).map(c => c.name);
            const users = (usersRes.data.users || []).filter(u => u.role !== 'Viewer');

            // Determine current reviewers from workflow
            const currentReviewerIds = new Set();
            if (workflow && workflow.stages) {
                workflow.stages.forEach(stage => {
                    // We only care about active/pending reviewers for the edit form
                    // History (completed/rejected) generally stays, but we allow re-defining the Future path.
                    // If we want to show ALL originally assigned, we check them all. 
                    // Let's pre-select 'pending' and 'current' assignees.
                    if (stage.status === 'pending' || stage.status === 'current') {
                        if (stage.assignee && (stage.assignee.id || stage.assignee._id)) {
                            currentReviewerIds.add(stage.assignee.id || stage.assignee._id);
                        } else if (typeof stage.assignee === 'string') {
                            currentReviewerIds.add(stage.assignee);
                        }
                    }
                });
            }

            const modal = `
                <div class="modal-overlay" id="editDocumentModal">
                    <div class="modal" style="max-width: 600px;">
                        <div class="modal-header">
                            <h2 class="modal-title">Edit Document</h2>
                            <button class="modal-close" onclick="app.closeModal()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="editDocForm" onsubmit="event.preventDefault(); app.updateDocument('${docId}')">
                                <div class="form-group">
                                    <label class="form-label">Document Title</label>
                                    <input type="text" class="form-input" id="editDocTitle" value="${doc.title}" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Project</label>
                                    <select class="form-select" id="editDocProject">
                                        <option value="">No Project</option>
                                        ${projects.map(p => `<option value="${p.id}" ${doc.project && (doc.project.id === p.id || doc.project === p.id || doc.project === p.name) ? 'selected' : ''}>${p.name}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Tag / Category</label>
                                    <select class="form-select" id="editDocCategory">
                                        ${categories.map(c => `<option value="${c}" ${doc.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Description</label>
                                    <textarea class="form-textarea" id="editDocDescription" rows="3">${doc.description || ''}</textarea>
                                </div>

                                <!-- Team / Reviewers Section -->
                                <div class="form-group">
                                    <label class="form-label">Manage Approval Team</label>
                                    <p style="font-size: var(--font-size-xs); color: var(--gray-500); margin-bottom: var(--spacing-sm);">
                                        Add or remove team members for the approval workflow.
                                    </p>
                                    <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: var(--spacing-sm); background: var(--gray-50);">
                                        ${users.length > 0 ? users.map(user => `
                                            <label style="display: flex; align-items: center; padding: var(--spacing-xs); cursor: pointer; border-radius: var(--radius-sm); transition: background 0.2s;" onmouseover="this.style.background='var(--gray-100)'" onmouseout="this.style.background='transparent'">
                                                <input type="checkbox" class="edit-reviewer-checkbox" value="${user.id}" ${currentReviewerIds.has(user.id) ? 'checked' : ''} style="margin-right: var(--spacing-sm);">
                                                <img src="${user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4F46E5&color=fff`}" style="width: 24px; height: 24px; border-radius: 50%; margin-right: var(--spacing-sm);">
                                                <div style="flex: 1;">
                                                    <div style="font-weight: 500; font-size: var(--font-size-sm);">${user.name}</div>
                                                    <div style="font-size: var(--font-size-xs); color: var(--gray-500);">${user.role}</div>
                                                </div>
                                            </label>
                                        `).join('') : '<div style="padding:10px; text-align:center; color:gray;">No eligible users found</div>'}
                                    </div>
                                </div>

                                <div style="display: flex; justify-content: flex-end; gap: var(--spacing-sm); margin-top: var(--spacing-xl);">
                                    <button type="button" class="btn btn-outline" onclick="app.closeModal()">Cancel</button>
                                    <button type="submit" class="btn btn-primary">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('modalsContainer').innerHTML = modal;
        } catch (error) {
            console.error(error);
            this.showToast('error', 'Error', 'Failed to load document for editing');
        }
    }

    async updateDocument(docId) {
        const title = document.getElementById('editDocTitle').value;
        const project = document.getElementById('editDocProject').value;
        const category = document.getElementById('editDocCategory').value;
        const description = document.getElementById('editDocDescription').value;

        // Collect reviewers
        const reviewerCheckboxes = document.querySelectorAll('.edit-reviewer-checkbox:checked');
        const reviewers = Array.from(reviewerCheckboxes).map(cb => cb.value);

        if (!title) {
            this.showToast('error', 'Missing Title', 'Please enter a document title');
            return;
        }

        const btn = document.querySelector('#editDocumentModal .btn-primary');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        try {
            await API.updateDocument(docId, {
                title,
                project,
                category,
                description,
                reviewers: JSON.stringify(reviewers) // Send as JSON string
            });

            this.showToast('success', 'Document Updated', 'Document details and workflow updated');
            this.closeModal();

            // Refresh current view
            if (this.currentPage === 'documents') {
                const html = await this.renderDocuments();
                document.getElementById('pageContent').innerHTML = html;
            } else if (this.currentPage === 'dashboard') {
                const html = await this.renderDashboard();
                document.getElementById('pageContent').innerHTML = html;
            }
            // Re-open view document modal to show changes
            this.viewDocument(docId);
        } catch (error) {
            console.error(error);
            this.showToast('error', 'Update Failed', error.message);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async deleteDocument(docId) {
        if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
            return;
        }

        try {
            await API.deleteDocument(docId);
            this.showToast('success', 'Document Deleted', 'Document has been permanently deleted');
            this.closeModal();
            // Refresh current view
            if (this.currentPage === 'documents') {
                const html = await this.renderDocuments();
                document.getElementById('pageContent').innerHTML = html;
            } else if (this.currentPage === 'dashboard') {
                const html = await this.renderDashboard();
                document.getElementById('pageContent').innerHTML = html;
            }
        } catch (error) {
            console.error(error);
            this.showToast('error', 'Delete Failed', error.message);
        }
    }

    renderWorkflowChain(workflow) {
        if (!workflow || !workflow.stages) {
            return '<div style="color: var(--gray-500); font-style: italic; text-align: center; margin-top: 40px;">No workflow associated with this document.</div>';
        }

        // Count reviewer statistics
        const reviewerStages = workflow.stages.filter((s, i) => i > 0); // Exclude first "Draft Submission" stage
        const completedReviews = reviewerStages.filter(s => s.status === 'completed').length;
        const totalReviewers = reviewerStages.length;
        const currentReviewer = reviewerStages.find(s => s.status === 'current');

        return `
            <!-- Workflow Summary -->
            <div style="background: var(--gray-50); border-radius: var(--radius-md); padding: var(--spacing-md); margin-bottom: var(--spacing-lg);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm);">
                    <h4 style="margin: 0; font-size: var(--font-size-sm); font-weight: 600; color: var(--gray-700);">Review Progress</h4>
                    <span class="badge badge-${workflow.overallStatus === 'Approved' ? 'success' : workflow.overallStatus === 'Rejected' ? 'error' : 'info'}" style="font-size: 11px;">
                        ${workflow.overallStatus}
                    </span>
                </div>
                <div style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-xs);">
                    <div style="flex: 1; height: 6px; background: var(--gray-200); border-radius: var(--radius-full); overflow: hidden;">
                        <div style="height: 100%; width: ${(totalReviewers > 0 ? (completedReviews / totalReviewers) * 100 : 0)}%; background: var(--success-500); transition: width 0.3s;"></div>
                    </div>
                    <span style="font-size: var(--font-size-xs); color: var(--gray-600); white-space: nowrap;">${completedReviews}/${totalReviewers}</span>
                </div>
                ${currentReviewer ? `
                    <div style="font-size: var(--font-size-xs); color: var(--gray-600);">
                        <i class="fas fa-user-clock" style="margin-right: 4px;"></i>
                        Awaiting review from: <strong>${currentReviewer.assignee?.name || 'Unknown'}</strong>
                    </div>
                ` : ''}
            </div>

            <!-- Workflow Timeline -->
            <div class="workflow-timeline">
                ${workflow.stages.map((stage, index) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current';
            const isRejected = stage.status === 'rejected'; // 'rejected' or 'changes_requested'
            const isChangesRequested = stage.status === 'changes_requested';

            // Determine display status
            let statusIcon = '<i class="far fa-circle"></i>';
            let colorClass = 'pending';
            let statusLabel = 'PENDING';
            let statusText = 'Pending Review';

            if (isCompleted) {
                statusIcon = '<i class="fas fa-check-circle"></i>';
                colorClass = 'completed';
                statusLabel = stage.action ? stage.action.toUpperCase() : 'COMPLETED';
                statusText = stage.action || 'Completed';
            } else if (isCurrent) {
                statusIcon = '<i class="fas fa-clock"></i>';
                colorClass = 'current';
                statusLabel = 'IN REVIEW';
                statusText = 'Currently Reviewing';
            } else if (isRejected) {
                statusIcon = '<i class="fas fa-times-circle"></i>';
                colorClass = 'rejected';
                statusLabel = 'REJECTED';
                statusText = 'Rejected';
            } else if (isChangesRequested) {
                statusIcon = '<i class="fas fa-exclamation-circle"></i>';
                colorClass = 'warning';
                statusLabel = 'CHANGES REQ';
                statusText = 'Changes Requested';
            }

            return `
                        <div class="workflow-stage ${colorClass}" style="position: relative; display: flex; gap: var(--spacing-md); padding: var(--spacing-md); border-left: 3px solid var(--${colorClass === 'completed' ? 'success' : colorClass === 'current' ? 'info' : colorClass === 'rejected' ? 'error' : colorClass === 'warning' ? 'warning' : 'gray'}-300); margin-bottom: var(--spacing-sm); background: white; border-radius: var(--radius-md);">
                            <div class="stage-icon" style="flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; background: var(--${colorClass === 'completed' ? 'success' : colorClass === 'current' ? 'info' : colorClass === 'rejected' ? 'error' : colorClass === 'warning' ? 'warning' : 'gray'}-100); color: var(--${colorClass === 'completed' ? 'success' : colorClass === 'current' ? 'info' : colorClass === 'rejected' ? 'error' : colorClass === 'warning' ? 'warning' : 'gray'}-600);">
                                ${statusIcon}
                            </div>
                            <div class="stage-content" style="flex: 1;">
                                <div class="stage-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--spacing-xs);">
                                    <div>
                                        <div class="stage-name" style="font-weight: 600; font-size: var(--font-size-sm); color: var(--gray-900); margin-bottom: 2px;">
                                            ${stage.name}
                                        </div>
                                        <div style="font-size: var(--font-size-xs); color: var(--gray-500);">
                                            ${stage.department || 'N/A'}
                                        </div>
                                    </div>
                                    <span class="badge badge-${colorClass === 'current' ? 'info' : (colorClass === 'completed' ? 'success' : (colorClass === 'rejected' ? 'error' : (colorClass === 'warning' ? 'warning' : 'gray')))}" style="font-size: 10px;">
                                        ${statusLabel}
                                    </span>
                                </div>
                                
                                <div class="stage-assignee" style="display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-xs); background: var(--gray-50); border-radius: var(--radius-sm); margin-bottom: var(--spacing-xs);">
                                    <img src="${stage.assignee?.avatar || 'https://ui-avatars.com/api/?name=User&background=94a3b8&color=fff'}" alt="${stage.assignee?.name || 'Unassigned'}" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600; font-size: var(--font-size-sm);">${stage.assignee?.name || 'Unassigned'}</div>
                                        <div style="font-size: var(--font-size-xs); color: var(--gray-500);">
                                            ${stage.assignee?.role || 'N/A'} 
                                            <span style="margin: 0 4px">•</span> 
                                            <span style="color:var(--${colorClass === 'completed' ? 'success' : colorClass === 'current' ? 'info' : (colorClass === 'rejected' ? 'error' : (colorClass === 'warning' ? 'warning' : 'gray'))}-600); font-weight:500;">${statusText}</span>
                                        </div>
                                    </div>
                                </div>

                                ${stage.note ? `
                                    <div class="stage-note" style="background: var(--gray-50); border-left: 3px solid var(--${colorClass === 'completed' ? 'success' : colorClass === 'rejected' ? 'error' : 'info'}-400); padding: var(--spacing-sm); border-radius: var(--radius-sm); font-size: var(--font-size-xs); color: var(--gray-700); font-style: italic;">
                                        <i class="fas fa-comment-dots" style="margin-right: 6px; color: var(--gray-400);"></i>
                                        "${stage.note}"
                                    </div>
                                ` : ''}
                                ${stage.actionDate ? `
                                    <div class="stage-date" style="font-size: var(--font-size-xs); color: var(--gray-500); margin-top: var(--spacing-xs);">
                                        <i class="fas fa-clock" style="margin-right: 4px;"></i>
                                        ${new Date(stage.actionDate).toLocaleString()}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }


    switchTab(event, tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        // Toggle content
        const detailsTab = document.getElementById('detailsTab');
        const workflowTab = document.getElementById('workflowTab');

        if (tabName === 'details') {
            if (detailsTab) detailsTab.style.display = 'block';
            if (workflowTab) workflowTab.style.display = 'none';
        } else {
            if (detailsTab) detailsTab.style.display = 'none';
            if (workflowTab) workflowTab.style.display = 'block';
        }
    }

    closeModal(event) {
        if (!event || event.target.classList.contains('modal-overlay')) {
            document.getElementById('modalsContainer').innerHTML = '';
        }
    }

    async createProject() {
        const titleInput = document.getElementById('projectTitle');
        const catInput = document.getElementById('projectCategory');
        const descInput = document.getElementById('projectDesc');
        const dateInput = document.getElementById('projectDueDate');

        const name = titleInput ? titleInput.value : '';
        const category = catInput ? catInput.value : 'General';
        const description = descInput ? descInput.value : '';
        const dueDate = dateInput ? dateInput.value : '';

        if (!name) {
            alert('Please enter a project name');
            return;
        }

        const btn = document.querySelector('#createProjectModal .btn-primary');
        let originalText = '';
        if (btn) {
            originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            btn.disabled = true;
        }

        try {
            await API.createProject({
                name,
                category,
                description,
                dueDate,
                participants: [] // Simplified for now
            });

            this.showToast('success', 'Project Created', 'Your project has been created successfully!');
            this.closeModal();

            if (this.currentPage === 'projects') {
                const content = await this.renderProjects();
                document.getElementById('pageContent').innerHTML = content;
            }
        } catch (error) {
            console.error(error);
            this.showToast('error', 'Error', error.message);
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    }

    async showEditProjectModal(projectId) {
        console.log('showEditProjectModal called with ID:', projectId); // Debug log
        try {
            const response = await API.getProject(projectId);
            console.log('API Response:', response); // Debug log
            if (!response || !response.data || !response.data.project) {
                throw new Error('Invalid response structure');
            }
            const project = response.data.project;

            let categories = [];
            try {
                const catRes = await API.getCategories();
                categories = (catRes.data.categories || []).map(c => c.name);
            } catch (e) {
                categories = ['General', 'Finance', 'HR', 'Legal', 'Operations', 'IT', 'Marketing']; // Fallback
            }

            // Format date for input[type=date]
            let formattedDate = '';
            if (project.dueDate) {
                let date;
                // Handle Firestore Timestamp
                if (project.dueDate._seconds) {
                    date = new Date(project.dueDate._seconds * 1000);
                } else {
                    date = new Date(project.dueDate);
                }

                // Handle invalid dates
                if (!isNaN(date.getTime())) {
                    formattedDate = date.toISOString().split('T')[0];
                }
            }

            const modal = `
                <div class="modal-overlay" id="editProjectModal" onclick="app.closeModal(event)">
                    <div class="modal" onclick="event.stopPropagation()">
                        <div class="modal-header">
                            <div>
                                <h2 class="modal-title">Edit Project</h2>
                                <p class="modal-subtitle">Update your project information.</p>
                            </div>
                            <button class="modal-close" onclick="app.closeModal()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label class="form-label">Project Name <span style="color:var(--error-500)">*</span></label>
                                <input type="text" id="editProjectTitle" class="form-input" value="${project.name || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Category</label>
                                <select id="editProjectCategory" class="form-select">
                                    ${categories.map(cat => `<option value="${cat}" ${project.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Description</label>
                                <textarea id="editProjectDesc" class="form-textarea" placeholder="Describe project goals...">${project.description || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Due Date</label>
                                <input type="date" id="editProjectDueDate" class="form-input" value="${formattedDate}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Status</label>
                                <select id="editProjectStatus" class="form-select">
                                    <option value="Active" ${project.status === 'Active' ? 'selected' : ''}>Active</option>
                                    <option value="On Hold" ${project.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
                                    <option value="Completed" ${project.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                    <option value="Planning" ${project.status === 'Planning' ? 'selected' : ''}>Planning</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
                            <button class="btn btn-primary" onclick="app.updateProject('${projectId}')">Save Changes</button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('modalsContainer').innerHTML = modal;
        } catch (error) {
            console.error('showEditProjectModal Error:', error);
            this.showToast('error', 'Error', 'Failed to load project data: ' + error.message);
        }
    }

    async updateProject(projectId) {
        const titleInput = document.getElementById('editProjectTitle');
        const catInput = document.getElementById('editProjectCategory');
        const descInput = document.getElementById('editProjectDesc');
        const dateInput = document.getElementById('editProjectDueDate');
        const statusInput = document.getElementById('editProjectStatus');

        const name = titleInput.value;
        const category = catInput.value;
        const description = descInput.value;
        const dueDate = dateInput.value;
        const status = statusInput.value;

        if (!name) {
            alert('Please enter a project name');
            return;
        }

        const btn = document.querySelector('#editProjectModal .btn-primary');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        try {
            await API.updateProject(projectId, { name, category, description, dueDate, status });
            this.showToast('success', 'Project Updated', 'Changes saved successfully');
            this.closeModal();

            // Refresh view
            if (this.currentPage === 'projects') {
                const content = await this.renderProjects();
                document.getElementById('pageContent').innerHTML = content;
            } else if (this.currentPage === 'project-details') {
                this.viewProject(projectId);
            }
        } catch (error) {
            console.error(error);
            this.showToast('error', 'Error', error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this project? This will NOT delete the actual documents, but they will no longer be associated with this project.')) {
            return;
        }

        try {
            await API.deleteProject(projectId);
            this.showToast('success', 'Project Deleted', 'Project removed successfully');

            if (this.currentPage === 'project-details' && this.currentProjectViewId === projectId) {
                this.navigateTo('projects');
            } else if (this.currentPage === 'projects') {
                const content = await this.renderProjects();
                document.getElementById('pageContent').innerHTML = content;
            }
        } catch (error) {
            console.error(error);
            this.showToast('error', 'Error', error.message);
        }
    }


    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const el = document.getElementById('selectedFileInfo');
            if (el) el.style.display = 'block';
            const nameEl = document.getElementById('fileName');
            if (nameEl) nameEl.textContent = file.name;
            const sizeEl = document.getElementById('fileSize');
            if (sizeEl) sizeEl.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
        }
    }

    async uploadDocument() {
        const fileInput = document.getElementById('docFileInput');
        const file = fileInput ? fileInput.files[0] : null;
        const titleInput = document.getElementById('uploadTitle');
        const descInput = document.getElementById('uploadDesc');
        const catInput = document.getElementById('uploadCategory');
        const projectSelect = document.getElementById('uploadProject');

        const title = titleInput ? titleInput.value : '';
        const description = descInput ? descInput.value : '';
        const category = catInput ? catInput.value : 'General';
        const projectId = projectSelect ? projectSelect.value : '';

        if (!title) {
            alert('Please enter a document title');
            return;
        }

        if (!projectId) {
            alert('Please select a project');
            return;
        }

        if (!file) {
            alert('Please select a file');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('project', projectId);

        // Generate thumbnail for PDF on client-side (fallback for backend)
        // Note: This is async, but we are inside an async function.
        // We will try to generate it and append as 'thumbnailBase64' string or just append a second file?
        // Simplest: If logic allows, just rely on backend? But backend failed.
        // Let's rely on viewDocument's on-fly-renderer for viewing.
        // For grid view, we really want a saved thumbnail. 

        // Let's leave backend to try its best (we added puppeteer logic). 
        // If puppeteer fails, we just don't have a thumbnail on grid yet.
        // But the user's specific complaint is "Thumbnail still not showing".
        // The previous "viewDocument" change fixes the modal view immediately.

        const btn = document.querySelector('#uploadDocumentModal .btn-primary');
        let originalText = '';
        if (btn) {
            originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            btn.disabled = true;
        }

        try {
            await API.uploadDocument(formData);
            this.showToast('success', 'Document Uploaded', 'Your document has been saved successfully.');
            this.closeModal();

            // Refresh content
            if (this.currentPage === 'documents') {
                const content = await this.renderDocuments();
                document.getElementById('pageContent').innerHTML = content;
                this.setupDocumentsPageListeners();
            } else if (this.currentPage === 'dashboard') {
                const html = await this.renderDashboard();
                document.getElementById('pageContent').innerHTML = html;
            } else if (this.currentPage === 'project-details') {
                // If we know which project we are viewing, refresh it
                // We don't easily have the current project ID here unless we store it
                // But we can reload the page if we have a current project object
                if (this.currentProjectViewId) {
                    this.viewProject(this.currentProjectViewId);
                }
            }
        } catch (error) {
            console.error(error);
            this.showToast('error', 'Upload Failed', error.message);
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    }

    // Workflow Actions
    async approveWorkflow(docId, workflowId) {
        const note = prompt('Add a note (optional):', 'Approved');
        if (note === null) return;

        try {
            await API.approveWorkflowStage(workflowId, note);
            this.showToast('success', 'Approved', 'Workflow stage approved successfully');
            this.closeModal();
            // Refresh main view
            if (this.currentPage === 'documents') {
                document.getElementById('pageContent').innerHTML = await this.renderDocuments();
            } else if (this.currentPage === 'dashboard') {
                document.getElementById('pageContent').innerHTML = await this.renderDashboard();
            }
        } catch (error) {
            this.showToast('error', 'Action Failed', error.message);
        }
    }

    async rejectWorkflow(docId, workflowId) {
        const note = prompt('Reason for rejection (required):');
        if (!note) return;

        try {
            await API.rejectWorkflowStage(workflowId, note);
            this.showToast('success', 'Rejected', 'Document has been rejected');
            this.closeModal();
            // Refresh main view
            if (this.currentPage === 'documents') {
                document.getElementById('pageContent').innerHTML = await this.renderDocuments();
            } else if (this.currentPage === 'dashboard') {
                document.getElementById('pageContent').innerHTML = await this.renderDashboard();
            }
        } catch (error) {
            this.showToast('error', 'Action Failed', error.message);
        }
    }

    async requestWorkflowChanges(docId, workflowId) {
        const note = prompt('Details of changes requested (required):');
        if (!note) return;

        try {
            await API.requestWorkflowChanges(workflowId, note);
            this.showToast('warning', 'Changes Requested', 'Changes have been requested');
            this.closeModal();
            // Refresh main view
            if (this.currentPage === 'documents') {
                document.getElementById('pageContent').innerHTML = await this.renderDocuments();
            } else if (this.currentPage === 'dashboard') {
                document.getElementById('pageContent').innerHTML = await this.renderDashboard();
            }
        } catch (error) {
            this.showToast('error', 'Action Failed', error.message);
        }
    }

    // ========================================
    // UTILITIES
    // ========================================

    showToast(type, title, message) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                ${type === 'success' ? '<i class="fas fa-check-circle"></i>' :
                type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' :
                    type === 'warning' ? '<i class="fas fa-exclamation-triangle"></i>' :
                        '<i class="fas fa-info-circle"></i>'}
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
        `;

        const container = document.getElementById('toastContainer');
        if (container) {
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.animation = 'slideInRight 200ms reverse';
                setTimeout(() => toast.remove(), 200);
            }, 3000);
        }
    }

    handleGlobalSearch(query) {
        if (query.length < 2) return;
        console.log('Global search for:', query);
        // Implement real search if needed
    }
    showLoader(text = 'Loading...') {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            const loaderText = loader.querySelector('.loader-text');
            if (loaderText) loaderText.textContent = text;
            loader.classList.add('show');
        }
    }

    hideLoader() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.classList.remove('show');
        }
    }
}

// Initialize the app
const app = new DomasApp();
window.app = app;
