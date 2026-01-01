# Domasy - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Open the Application
```bash
# Navigate to the project folder
cd /Users/morrismbaabu/Documents/SYSTEMS/Domasy-app

# Open in your default browser
open index.html
```

### Step 2: Explore the Dashboard
When the application loads, you'll see:
- **Statistics Cards**: Total documents, pending approvals, active projects, and active users
- **Recent Documents**: Latest uploaded documents
- **Recent Activity**: System activity feed

### Step 3: Navigate Through Pages
Use the sidebar to explore:
- 📊 **Dashboard** - Overview and statistics
- 📄 **Documents** - Browse and manage documents
- 📁 **Projects** - Organize documents into projects
- 👥 **Team** - Manage users and permissions
- 📋 **Audit Logs** - Track all system activities
- ⚙️ **Settings** - Application preferences

## 🎯 Key Features to Try

### 1. View a Document
1. Click on **Documents** in the sidebar
2. Click on any document card
3. See the approval workflow, document properties, and actions
4. Try clicking **Approve Document** or **Request Revision**

### 2. Create a Project
1. Click on **Projects** in the sidebar
2. Click the **Create Project** button
3. Fill in the project details:
   - Project Name (e.g., "Q4 Financial Review")
   - Category (select from dropdown)
   - Add team members
4. Click **Create Project**

### 3. Upload a Document
1. Go to **Documents** page
2. Click **Upload Document** button
3. Fill in the document details:
   - Document Title
   - Description (optional)
   - Category
   - Initial Approval Stage
4. Click **Upload & Notify**

### 4. Manage Team Members
1. Click on **Team** in the sidebar
2. Browse the user list
3. Use filters to find specific users:
   - Search by name, email, or role
   - Filter by role (Super Admin, Approver, Editor, Viewer)
   - Filter by status (Active, Pending, Revoked)

### 5. Review Audit Logs
1. Click on **Audit Logs** in the sidebar
2. See all system activities
3. Use filters to find specific actions:
   - Search by document ID or user
   - Filter by date range
   - Filter by action type
4. Try the **Export CSV** or **Export PDF** buttons

## 🎨 UI Features to Notice

### Interactive Elements
- **Hover Effects**: Cards lift up when you hover over them
- **Status Badges**: Color-coded indicators for different states
- **Smooth Animations**: Transitions between pages and modals
- **Toast Notifications**: Success messages appear in the top-right corner

### Responsive Design
- Try resizing your browser window
- On mobile screens, the sidebar collapses into a hamburger menu
- Cards and grids adapt to different screen sizes

### Visual Feedback
- **Active Navigation**: Current page is highlighted in the sidebar
- **Loading States**: Smooth transitions when switching pages
- **Focus States**: Form inputs highlight when clicked
- **Button States**: Hover effects on all interactive elements

## 📱 Mobile Experience

To test mobile view:
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Click the device toolbar icon (or Cmd+Shift+M)
3. Select a mobile device (e.g., iPhone 12)
4. See how the layout adapts:
   - Sidebar becomes a hamburger menu
   - Cards stack vertically
   - Tables become scrollable
   - Touch-friendly buttons

## 🔍 Search & Filter Examples

### Document Search
1. Go to **Documents** page
2. Type in the search box: "Financial"
3. See filtered results
4. Try category filter: "Finance"
5. Try status filter: "In Review"

### User Search
1. Go to **Team** page
2. Type in the search box: "Sarah"
3. See matching users
4. Try role filter: "Approver"
5. Try status filter: "Active"

### Audit Log Search
1. Go to **Audit Logs** page
2. Type in the search box: "Invoice"
3. See related audit entries
4. Try user filter: Select a specific user
5. Try action filter: "Approved"

## 💡 Tips & Tricks

### Keyboard Shortcuts
- **Tab**: Navigate through form fields
- **Enter**: Submit forms or click focused buttons
- **Esc**: Close modals (when implemented)

### Best Practices
- Use descriptive document titles for easy searching
- Assign appropriate categories to documents
- Add team members to projects for better collaboration
- Review audit logs regularly for compliance

### Understanding Status Colors
- 🟢 **Green (Success)**: Approved, Active, Completed
- 🔵 **Blue (Info)**: In Review, Current Stage
- 🟡 **Yellow (Warning)**: Pending, Changes Requested
- 🔴 **Red (Error)**: Rejected, Revoked
- ⚪ **Gray**: Neutral, Inactive, Uploaded

### Understanding User Roles
- **Super Admin**: Full system access, can manage everything
- **Approver**: Can approve/reject documents
- **Editor**: Can upload and edit documents
- **Viewer**: Read-only access to documents

## 🎬 Demo Scenarios

### Scenario 1: Document Approval Workflow
1. Go to **Dashboard**
2. See "8 Pending Approvals" in the statistics
3. Click on **Documents**
4. Find a document with "In Review" status
5. Click to view the document
6. See the approval chain on the right
7. Click **Approve Document**
8. See success notification
9. Check **Audit Logs** to see the logged action

### Scenario 2: Project Management
1. Click on **Projects**
2. See existing projects with team members
3. Click **Create Project**
4. Enter project details
5. Add team members from suggestions
6. Create the project
7. See success notification

### Scenario 3: Team Administration
1. Go to **Team** page
2. See user statistics at the top
3. Browse the user table
4. Notice different roles and statuses
5. Use search to find specific users
6. Click **Invite Member** to add new users

## 🐛 Troubleshooting

### Application Not Loading?
- Make sure you're opening `index.html` in a modern browser
- Check browser console for errors (F12)
- Ensure all files are in the same directory

### Styles Not Showing?
- Verify `styles.css` is in the same folder as `index.html`
- Check browser console for 404 errors
- Try hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

### JavaScript Not Working?
- Verify `app.js` and `data.js` are in the same folder
- Check browser console for JavaScript errors
- Make sure JavaScript is enabled in your browser

### Modals Not Appearing?
- Check if modal overlay is being blocked
- Look for z-index issues in browser DevTools
- Verify modal container exists in the DOM

## 📊 Sample Data Overview

The application comes with pre-loaded mock data:

### Users (10)
- 1 Super Admin (Alice Freeman)
- 3 Approvers (Bob Smith, Michael Brown, Sarah Jenkins)
- 2 Editors (Charlie Davis, John Smith)
- 4 Viewers (Diana Prince, Evan Matthews, Emily Chen, and others)

### Documents (6)
- Q3 Financial Report (In Review)
- Invoice #INV-2023-001 (Approved)
- Contract #CTR-9922 (Changes Requested)
- Expense Report Q3 (Uploaded)
- Invoice #INV-2023-009 (Rejected)
- Report #RPT-Daily-Oct23 (Generated)

### Projects (3)
- Q3 Financial Review (Active, 8 documents)
- Annual Contract Renewals (Active, 12 documents)
- HR Policy Update 2024 (Planning, 5 documents)

### Categories (7)
- Finance, HR, Legal, Operations, Marketing, IT, Reports

## 🎓 Learning Resources

### Understanding the Code
- `index.html`: Main structure and layout
- `styles.css`: All styling and design system
- `app.js`: Application logic and page rendering
- `data.js`: Mock data and helper functions

### Customization Points
- **Colors**: Edit CSS variables in `styles.css`
- **Data**: Modify `MOCK_DATA` in `data.js`
- **Layout**: Adjust HTML structure in `index.html`
- **Features**: Add new functions in `app.js`

## 🚀 Next Steps

### For Developers
1. Review the code structure
2. Understand the data flow
3. Add new features or pages
4. Integrate with a backend API
5. Add real file upload functionality

### For Users
1. Explore all pages and features
2. Test different workflows
3. Provide feedback on UX
4. Suggest improvements
5. Report any issues

## 📞 Need Help?

- Check the `README.md` for detailed documentation
- Review `requirements.md` for feature specifications
- Look at `IMPLEMENTATION_CHECKLIST.md` for development tasks
- Inspect browser console for error messages

---

**Enjoy exploring Domasy! 🎉**

*Built with modern web technologies - no frameworks, no build tools, just clean code!*
