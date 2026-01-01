# Domasy - Document Management System

A modern, feature-rich document management and approval system built with vanilla HTML, CSS, and JavaScript.

## 🌟 Features

### Core Functionality
- **Document Management**: Upload, view, and manage documents with metadata
- **Approval Workflows**: Multi-stage approval chains with visual tracking
- **Project Organization**: Group documents into projects with team collaboration
- **Team Management**: User roles, permissions, and access control
- **Audit Logging**: Complete history of all document actions and system events
- **Advanced Search & Filtering**: Find documents, users, and activities quickly

### User Interface
- **Modern Design**: Clean, professional interface with premium aesthetics
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile devices
- **Interactive Components**: Smooth animations and micro-interactions
- **Real-time Updates**: Toast notifications for user actions
- **Dark Sidebar**: Professional navy blue sidebar navigation

### Pages Included

1. **Dashboard**
   - Statistics overview (Total Documents, Pending Approvals, Active Projects, Active Users)
   - Recent documents list
   - Recent activity feed

2. **Documents**
   - Grid view of all documents with thumbnails
   - Filter by category and status
   - Search functionality
   - Upload new documents modal
   - Document viewer with approval workflow

3. **Projects**
   - Project cards with participant avatars
   - Project statistics (document count, due dates)
   - Create new project modal
   - Team member assignment

4. **Team Members**
   - User management table
   - Role-based access control (Super Admin, Approver, Editor, Viewer)
   - User status tracking (Active, Pending, Revoked)
   - Search and filter users
   - Invite new members

5. **Audit Log**
   - Complete system activity history
   - Filter by date, user, and action type
   - Export to CSV or PDF
   - Detailed action tracking with IP addresses

6. **Settings**
   - Account preferences (placeholder for future implementation)

## 🎨 Design System

### Color Palette
- **Primary**: Indigo/Purple (#4F46E5)
- **Success**: Green (#10B981)
- **Warning**: Amber (#F59E0B)
- **Error**: Red (#EF4444)
- **Info**: Blue (#3B82F6)
- **Navy**: Dark Blue (#243B53) - Sidebar

### Typography
- **Font Family**: Inter (Google Fonts)
- **Font Sizes**: 0.75rem to 2.25rem (responsive scale)

### Components
- Cards with hover effects
- Badges for status indicators
- Buttons (primary, secondary, outline, success, danger)
- Form inputs with focus states
- Tables with hover rows
- Modals with backdrop blur
- Toast notifications
- Tabs for content organization

## 📁 File Structure

```
Domasy-app/
├── index.html              # Main HTML structure
├── styles.css              # Complete CSS with design system
├── app.js                  # Application logic and page rendering
├── data.js                 # Mock data and helper functions
├── requirements.md         # Project requirements (empty)
└── IMPLEMENTATION_CHECKLIST.md  # Development checklist
```

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No build tools or dependencies required!

### Installation

1. Clone or download this repository
2. Open `index.html` in your web browser
3. That's it! The application runs entirely in the browser.

### Quick Start

```bash
# Navigate to the project directory
cd Domasy-app

# Open in browser (macOS)
open index.html

# Or on Windows
start index.html

# Or on Linux
xdg-open index.html
```

Alternatively, you can use a local server:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Then open http://localhost:8000 in your browser
```

## 💡 Usage

### Navigating the Application

1. **Sidebar Navigation**: Click on any menu item to navigate between pages
2. **Dashboard**: View overview statistics and recent activity
3. **Documents**: Browse, search, and filter documents
4. **Upload Document**: Click the "Upload Document" button to add new files
5. **View Document**: Click any document card to see details and approval workflow
6. **Create Project**: Organize documents into projects with team members
7. **Team Management**: View and manage user access and roles
8. **Audit Log**: Track all system activities and user actions

### Key Interactions

- **Approve Document**: Click on a document, then click "Approve Document"
- **Request Revision**: Click on a document, then click "Request Revision"
- **Filter Documents**: Use the search bar and dropdown filters
- **Create Project**: Click "Create Project" and fill in the details
- **View User Details**: Click on any user in the Team page

## 🎯 Features Demonstrated

### Based on Screenshot Requirements

✅ **Screenshot 1 - Create Project Modal**
- Project name input
- Category dropdown
- Participants multi-select with chips
- Suggested team members
- Import from Group functionality

✅ **Screenshot 2 - Document Workflow View**
- Document preview area
- Approval chain visualization
- Multi-stage workflow (Draft → Manager Review → VP Approval)
- Document properties panel
- Approve/Request Revision buttons

✅ **Screenshot 3 - User Management**
- User statistics dashboard
- User table with roles and status
- Search and filter functionality
- Role badges (Super Admin, Approver, Editor, Viewer)
- Status indicators (Active, Pending, Revoked)

✅ **Screenshot 4 - Audit Log**
- System audit trail
- Timestamp, user, action, details columns
- IP address tracking
- Export CSV/PDF buttons
- Advanced filtering

✅ **Screenshot 5 - Upload Document**
- Document title and description fields
- Category and approval stage selectors
- File drag-and-drop area
- Document preview with thumbnail
- Virus scan status indicator

## 🔧 Customization

### Adding New Documents

Edit `data.js` and add new entries to the `MOCK_DATA.documents` array:

```javascript
{
    id: 7,
    title: 'New Document',
    description: 'Document description',
    category: 'Finance',
    status: 'In Review',
    uploadDate: 'Dec 29, 2023',
    size: '1.5 MB',
    uploadedBy: 1,
    currentApprover: 2,
    approvalStage: 'Manager Review',
    thumbnail: 'https://via.placeholder.com/200x280/4F46E5/ffffff?text=Document'
}
```

### Adding New Users

Add entries to `MOCK_DATA.users`:

```javascript
{
    id: 11,
    name: 'New User',
    email: 'user@example.com',
    role: 'Viewer',
    status: 'Active',
    lastLogin: '1 hour ago',
    avatar: 'https://ui-avatars.com/api/?name=New+User&background=4F46E5&color=fff'
}
```

### Customizing Colors

Edit the CSS variables in `styles.css`:

```css
:root {
    --primary-600: #4F46E5;  /* Change primary color */
    --navy-800: #243B53;     /* Change sidebar color */
    /* ... other variables */
}
```

## 📱 Responsive Design

The application is fully responsive with breakpoints at:
- **Desktop**: > 1024px (full layout)
- **Tablet**: 768px - 1024px (adjusted sidebar)
- **Mobile**: < 768px (collapsible sidebar, stacked layout)

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📝 Mock Data

The application uses mock data stored in `data.js`. All interactions are simulated and data is not persisted. To add persistence, you would need to integrate with a backend API.

### Available Mock Data:
- 10 Users with different roles
- 6 Documents with various statuses
- 3 Projects
- 5 Audit log entries
- 7 Categories

## 🎨 Design Highlights

- **Glassmorphism**: Subtle backdrop blur effects on modals
- **Micro-animations**: Smooth hover effects and transitions
- **Color-coded Status**: Visual indicators for different states
- **Avatar System**: User avatars generated via UI Avatars API
- **Icon Library**: Font Awesome 6.4.0 for consistent iconography

## 🔐 Security Features (UI Only)

- Role-based access control visualization
- Audit trail tracking
- IP address logging (mock data)
- Virus scan status indicators
- Document approval workflows

## 🚧 Future Enhancements

- Backend API integration
- Real file upload functionality
- PDF viewer integration
- Email notifications
- Advanced reporting and analytics
- Document versioning
- Comments and annotations
- Real-time collaboration
- Mobile app version

## 📄 License

This is a demonstration project. Feel free to use and modify as needed.

## 👨‍💻 Development

Built with:
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **JavaScript (ES6+)**: Vanilla JS with class-based architecture
- **Font Awesome**: Icon library
- **Google Fonts**: Inter typeface

No frameworks, no build tools, no dependencies - just clean, modern web development!

## 🤝 Contributing

This is a demonstration project, but suggestions and improvements are welcome!

## 📞 Support

For questions or issues, please refer to the code comments or create an issue in the repository.

---

**Built with ❤️ using modern web technologies**
