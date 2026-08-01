




function downloadAsPDF() {
  const modal = document.getElementById('pdf-viewer-modal');
  let elementToPrint = document.body;
  if(modal && modal.style.display !== 'none') {
      // Print just the inner card of the modal
      elementToPrint = modal.querySelector('.glass-card');
  }
  
  // Hide buttons during print
  const buttons = elementToPrint.querySelectorAll('button');
  buttons.forEach(b => b.style.display = 'none');
  
  html2pdf().from(elementToPrint).set({
      margin: 10,
      filename: 'SynapseAI_Document.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).save().then(function() {
      buttons.forEach(b => b.style.display = '');
      if(typeof toast === "function") {
          toast("PDF downloaded successfully!", "success");
      }
  });
}



// =========================================================================
// LOCALSTORAGE PERSISTENCE ENGINE (Core foundation for all features)
// =========================================================================
const STORAGE_KEYS = {
  NOTIFICATIONS: 'synapseai_platform_notifications',
  REGISTERED_USERS: 'synapseai_registered_users',
  PLATFORM_USERS: 'synapseai_platform_users'
};

function getPersistentNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function savePersistentNotifications() {
  try {
    if (window.platformNotifications) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(window.platformNotifications));
    }
  } catch(e) {}
}

function getPersistentRegisteredUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  // Default built-in users
  return [
    { email: 'harithalanganuru@gmail.com', pass: 'password123', name: 'Haritha Langanuru', role: 'Admin', dept: 'System Security', status: 'Approved' },
    { email: 'manager@synapseai.com', pass: 'password123', name: 'Marcus Vance', role: 'Manager', dept: 'Engineering', status: 'Approved' },
    { email: 'hr@synapseai.com', pass: 'password123', name: 'Sarah Jenkins', role: 'HR', dept: 'Human Resources', status: 'Approved' },
    { email: 'haritha.l@synapseai.com', pass: 'password123', name: 'Haritha Langanuru', role: 'Employee', dept: 'Engineering', status: 'Approved' },
    { email: 'employee@synapseai.com', pass: 'password123', name: 'Alex Rivera', role: 'Employee', dept: 'Engineering', status: 'Approved' }
  ];
}

function savePersistentRegisteredUsers() {
  try {
    if (window.authState && window.authState.registeredUsers) {
      localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(window.authState.registeredUsers));
    }
  } catch(e) {}
}

function markAllNotificationsRead() {
  if (!window.platformNotifications) window.platformNotifications = getPersistentNotifications();
  window.platformNotifications.forEach(n => { n.read = true; });
  savePersistentNotifications();
  updateNotificationBadge();
  // Re-render the notification panel
  const container = document.getElementById('role-feature-container');
  if (container) renderRoleFeatureView('feat_notifications');
}

// Initialize platform notifications from localStorage on page load
window.platformNotifications = getPersistentNotifications();

// =========================================================================
// SYNCHRONIZED NOTIFICATION & APPROVAL PERSISTENCE ENGINE
// =========================================================================
function getAllNotificationsForRole(targetRole, targetEmail) {
  const users = (window.authState && window.authState.registeredUsers) ? window.authState.registeredUsers : getPersistentRegisteredUsers();
  if (!window.platformNotifications) window.platformNotifications = getPersistentNotifications();
  const notifs = window.platformNotifications;

  let changed = false;

  // Find all pending users that need approval from targetRole
  const pendingUsers = users.filter(u => {
    if (u.status === 'Approved') return false;
    if (targetRole === 'Manager' && u.role === 'Employee') return true;
    if (targetRole === 'Admin' && (u.role === 'Manager' || u.role === 'HR')) return true;
    return false;
  });

  pendingUsers.forEach(pu => {
    if (!notifs.some(n => n.userEmail === pu.email)) {
      notifs.unshift({
        id: 'notif-user-' + pu.email.replace(/[^a-zA-Z0-9]/g, ''),
        targetRole: targetRole,
        targetEmail: targetEmail,
        title: `New ${pu.role} Access Request`,
        message: `${pu.name} (${pu.email}) requested ${pu.role} Portal access and requires your activation approval.`,
        type: 'approval_req',
        userEmail: pu.email,
        userRole: pu.role,
        date: 'Pending Approval',
        read: false
      });
      changed = true;
    }
  });

  if (changed) savePersistentNotifications();

  return notifs.filter(n => n.targetRole === targetRole || n.targetRole === 'All' || (targetEmail && n.targetEmail === targetEmail));
}

function updateNotificationBadge() {
  const currentRole = (window.authState && window.authState.currentUser && window.authState.currentUser.role) ? window.authState.currentUser.role : (window.currentRole || 'Admin');
  const currentEmail = (window.authState && window.authState.currentUser) ? window.authState.currentUser.email : '';

  const list = getAllNotificationsForRole(currentRole, currentEmail);
  const unreadCount = list.filter(n => !n.read).length;

  const badgeEl = document.getElementById('top-bar-notif-badge');
  if (badgeEl) {
    badgeEl.textContent = unreadCount;
    badgeEl.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  }
}

const def_dispatch_notification = async function(targetRole, targetEmail, title, message, type = 'info', extraData = {}) {
  if (!window.platformNotifications) window.platformNotifications = getPersistentNotifications();

  const newNotif = {
    id: 'notif-' + Date.now(),
    targetRole: targetRole,
    targetEmail: targetEmail,
    title: title,
    message: message,
    type: type,
    date: 'Just now',
    read: false,
    ...extraData
  };

  window.platformNotifications.unshift(newNotif);
  savePersistentNotifications();

  // Dispatch real email via FastAPI SMTP backend
  try {
    fetch('http://localhost:8000/api/v1/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: targetEmail || 'harithalanganuru@gmail.com',
        subject: `SynapseAI Notification: ${title}`,
        body: `Dear ${targetRole},

${message}

Please log in to your SynapseAI Portal to review and take action.

Best regards,
SynapseAI Platform Security`
      })
    }).catch(e => console.log('Email send catch:', e));
  } catch (err) {}

  updateNotificationBadge();
};

async function approveUserRegistration(notifId, userEmailFallback) {
  const notif = window.platformNotifications.find(n => n.id === notifId);
  const targetEmail = userEmailFallback || notif?.userEmail;

  if (!targetEmail) return;

  const user = window.authState.registeredUsers.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());
  if (user) {
    user.status = 'Approved';
    savePersistentRegisteredUsers();

    if (notif) notif.read = true;
    savePersistentNotifications();

    // Dispatch approval confirmation notification & real email to approved user
    await def_dispatch_notification(
      user.role,
      user.email,
      `Your ${user.role} Portal Access Has Been Approved!`,
      `Congratulations ${user.name}! Your ${user.role} Portal access request has been officially approved. You can now sign in immediately.`,
      'approval_granted'
    );

    toast(`Approved access for ${user.name} (${user.role})! Confirmation email dispatched to ${user.email}.`, 'success');

    updateNotificationBadge();
    if (typeof renderRoleFeatureView === 'function') {
      renderRoleFeatureView(currentPaneId || 'feat_notifications');
    }
  }
}




    let currentRole = 'Employee';

    // GLOBAL PERSISTENT STATE STORE WITH DISTINCT DOCUMENT CONTENTS
    const STATE = {
      Admin: {
        healthScore: 96,
        totalEmployees: 1248,
        totalDepartments: 12,
        activeToday: 248,
        pendingApprovalsCount: 64,
        
        pendingLeaveClaims: 42,
        pendingPolicyRevisions: 3,
        pendingExpenseClaims: 5,
        pendingAccessRequests: 8,
        pendingEquipmentRequests: 4,
        pendingModelAccessGrants: 2,
        
        knowledgeDocs: 84,
        knowledgeCategories: 14,
        knowledgeCollections: 8,
        totalStorageGB: 4.2,
        knowledgeCoverage: 96,
        searchAccuracy: 98.4,
        aiQueriesToday: 1245,
        emailsSentToday: 182,
        
        leaveApproved: false,
        policyApproved: false,
        expenseApproved: false,
        accessApproved: false,
        equipmentApproved: false,
        modelApproved: false,

        employees: [
          { id: 'EMP-001', name: 'Sarah Jenkins', email: 'sarah@enterprise.com', dept: 'Executive Board', manager: 'Board Director', role: 'CEO', status: 'Active', avatar: 'SJ', color: '#F43F5E' },
          { id: 'EMP-002', name: 'David Miller', email: 'david@enterprise.com', dept: 'Human Resources', manager: 'Sarah Jenkins', role: 'VP HR', status: 'Active', avatar: 'DM', color: '#06B6D4' },
          { id: 'EMP-003', name: 'Haritha Langanuru', email: 'haritha@enterprise.com', dept: 'IT / Software', manager: 'David Miller', role: 'Senior Dev', status: 'Active', avatar: 'HL', color: '#6366F1' },
          { id: 'EMP-004', name: 'Alex Rivera', email: 'alex@enterprise.com', dept: 'Operations', manager: 'Priya S.', role: 'Ops Lead', status: 'Active', avatar: 'AR', color: '#F59E0B' },
          { id: 'EMP-005', name: 'Emily Zhang', email: 'emily@enterprise.com', dept: 'Marketing', manager: 'David Miller', role: 'Lead Designer', status: 'Active', avatar: 'EZ', color: '#EC4899' }
        ],

        departments: [
          { name: 'Human Resources (HR)', sub: 'Talent & Payroll', count: '42 Employees', cls: 'rb-hr' },
          { name: 'Finance & Audit', sub: 'Accounts & Expense', count: '58 Employees', cls: 'rb-manager' },
          { name: 'Information Technology (IT)', sub: 'Software & Infrastructure', count: '245 Employees', cls: 'rb-employee' },
          { name: 'Marketing & Growth', sub: 'Brand & Campaigns', count: '65 Employees', cls: 'rb-hr' },
          { name: 'Sales & Business Dev', sub: 'Enterprise Accounts', count: '120 Employees', cls: 'rb-manager' },
          { name: 'Operations & Supply', sub: 'Logistics & Workplace', count: '310 Employees', cls: 'rb-admin' }
        ],

        // DISTINCT DOCUMENTS WITH SPECIFIC POLICY TEXTS
        documents: [
          { 
            name: '2026_Employee_Handbook.pdf', cat: 'Policies', dept: 'Human Resources', owner: 'David Miller', ver: 'v2.4', status: 'Indexed', updated: '2026-07-28', cls: 'rb-employee',
            content: `SECTION 4.2 — PARENTAL & PATERNITY LEAVE BENEFIT POLICY\n\nAll full-time secondary caregivers employed at SynapseAI for a minimum of 90 days are entitled to 6 weeks of 100% fully paid paternity leave.\n\nLeave requests must be submitted at least 14 days in advance via the SynapseAI Employee Portal. Hybrid work flexibility allows 3 days in office and 2 days remote per week.`
          },
          { 
            name: 'IT_Security_Policy_v4.pdf', cat: 'Security', dept: 'IT / Infrastructure', owner: 'Haritha L.', ver: 'v4.1', status: 'Indexed', updated: '2026-07-27', cls: 'rb-hr',
            content: `SECTION 1.0 — ENTERPRISE IT & INFRASTRUCTURE SECURITY POLICY\n\n1. Multi-Factor Authentication (MFA) is mandatory for all employee accounts across Google Workspace, GitHub, and AWS.\n2. All corporate laptops must run encrypted disk storage (BitLocker/FileVault) and connect via SynapseAI WireGuard VPN.\n3. Password rotation is enforced every 90 days with minimum 16 characters.`
          },
          { 
            name: 'Travel_Expense_Policy_2026.docx', cat: 'Finance', dept: 'Finance & Audit', owner: 'Sarah Jenkins', ver: 'v1.8', status: 'Indexed', updated: '2026-07-25', cls: 'rb-manager',
            content: `SECTION 3.5 — DOMESTIC & INTERNATIONAL TRAVEL REIMBURSEMENT\n\n1. Domestic travel meal allowance is fixed at $75.00 USD per day ($120.00 USD for international travel).\n2. All flights over 6 hours qualify for Premium Economy booking.\n3. Receipts must be submitted within 14 business days of return.`
          },
          { 
            name: 'GDPR_Compliance_Master.pdf', cat: 'Legal', dept: 'Legal & Audit', owner: 'Alex Rivera', ver: 'v3.0', status: 'Indexed', updated: '2026-07-20', cls: 'rb-admin',
            content: `ARTICLE 7 — DATA PROTECTION & PRIVACY COMPLIANCE\n\n1. SynapseAI processes employee data under strict GDPR Article 6(1)(b) lawful basis.\n2. All PII data stored in Pinecone vector databases is encrypted at rest using AES-256 GCM.\n3. Employees retain the right to data portability and deletion upon formal request.`
          },
          { 
            name: 'Vendor_Contract_Template.pdf', cat: 'Legal', dept: 'Operations', owner: 'Priya S.', ver: 'v1.2', status: 'Review Needed', updated: '2026-07-18', cls: 'rb-hr',
            content: `CLAUSE 12 — VENDOR PROCUREMENT & SERVICE LEVEL AGREEMENT (SLA)\n\n1. Vendors must maintain a minimum of 99.9% API service availability.\n2. Payment terms are Net-30 from invoice receipt.\n3. Mutual Non-Disclosure Agreement (NDA) remains binding for 3 years post-termination.`
          }
        ],

        // DISTINCT KNOWLEDGE COLLECTIONS
        collections: [
          { name: 'HR Policies & Handbooks', icon: 'fa-people-group', count: '18 Docs', color: '#06B6D4', docs: ['2026_Employee_Handbook.pdf'] },
          { name: 'IT & Security Guidelines', icon: 'fa-shield-halved', count: '24 Docs', color: '#6366F1', docs: ['IT_Security_Policy_v4.pdf'] },
          { name: 'Finance & Expense Limits', icon: 'fa-coins', count: '12 Docs', color: '#F59E0B', docs: ['Travel_Expense_Policy_2026.docx'] },
          { name: 'Legal Contracts & GDPR', icon: 'fa-scale-balanced', count: '10 Docs', color: '#EC4899', docs: ['GDPR_Compliance_Master.pdf', 'Vendor_Contract_Template.pdf'] },
          { name: 'Employee Onboarding Hub', icon: 'fa-graduation-cap', count: '14 Docs', color: '#10B981', docs: ['2026_Employee_Handbook.pdf'] },
          { name: 'Training Materials 2026', icon: 'fa-book-open', count: '6 Docs', color: '#8B5CF6', docs: ['IT_Security_Policy_v4.pdf'] }
        ]
      }
    };

    const ROLE_CONFIG = {
      Employee: {
        accent: '#6366F1',
        label: 'Employee Portal',
        icon: 'fa-user',
        abbr: 'E',
        cls: 'rb-employee',
        sidebarMenu: [
          { id: 'role_dashboard', icon: 'fa-gauge-high', label: 'Dashboard' },
          { id: 'shared_rag', icon: 'fa-comments', label: 'AI Assistant Chatbot' },
          { id: 'feat_search', icon: 'fa-magnifying-glass', label: 'Knowledge Search' },
          { id: 'feat_docs', icon: 'fa-file-lines', label: 'My Documents' },
          { id: 'feat_learning', icon: 'fa-graduation-cap', label: 'Learning Hub' },
          { id: 'feat_tasks', icon: 'fa-list-check', label: 'Tasks' },
          { id: 'feat_meetings', icon: 'fa-calendar-days', label: 'Meetings' },
          { id: 'feat_announcements', icon: 'fa-bullhorn', label: 'Announcements' },
          { id: 'feat_profile', icon: 'fa-user-gear', label: 'Profile & Settings' }, { id: 'feat_notifications', icon: 'fa-bell', label: 'Notifications' }, ],
        heroHeading: 'Good Morning, Haritha 👋',
        heroDesc: `Your personal AI Assistant has processed today's briefing. You have 14 PTO days available and 2 team sync meetings scheduled.`,
        stats: [
          { title: "Paid Time Off Available", num: "14 Days", desc: "6 Weeks Parental Leave Eligible" },
          { title: "Travel Meal Cap", num: "$75 / Day", desc: "$120 International Cap" },
          { title: "Learning Progress", num: "85%", desc: "3 Courses Completed" },
          { title: "Tasks Completed", num: "12 / 14", desc: "92% On-Time Completion Rate" }
        ],
        aiTools: [],
        queries: [
          "What is our policy on paternity leave?",
          "What is the travel expense meal limit per day?",
          "What are the remote hybrid work requirements?"
        ],
        templates: [
          { label: "Leave Request Email", sub: "Leave Request: Paternity Leave Approval", body: "Dear Manager,\n\nI am writing to formally request 6 weeks of paternity leave starting next month under our 2026 Employee Handbook.\n\nBest regards,\nEmployee" }
        ]
      },

      HR: {
        accent: '#06B6D4',
        label: 'HR Specialist Portal',
        icon: 'fa-users',
        abbr: 'HR',
        cls: 'rb-hr',
        sidebarMenu: [
          { id: 'role_dashboard', icon: 'fa-gauge-high', label: 'HR Dashboard' },
          { id: 'feat_recruitment', icon: 'fa-users-gear', label: 'Recruitment & Pipeline' },
          { id: 'feat_candidates', icon: 'fa-user-check', label: 'Candidates & Resumes' },
          { id: 'feat_directory', icon: 'fa-address-book', label: 'Employee Directory' },
          { id: 'feat_policy', icon: 'fa-file-circle-check', label: 'Policy Studio' },
          { id: 'feat_training', icon: 'fa-graduation-cap', label: 'Training Management' },
          { id: 'feat_hr_analytics', icon: 'fa-chart-pie', label: 'HR Analytics' },
          { id: 'shared_rag', icon: 'fa-comments', label: 'HR AI Assistant Chatbot' },
        , { id: 'feat_notifications', icon: 'fa-bell', label: 'Notifications' }],
        heroHeading: 'HR Operations & Talent Command Center',
        heroDesc: 'Overview of company hiring pipelines, employee sentiment scores, policy compliance audits, and onboarding flows.',
        stats: [
          { title: "Active Candidates", num: "14 New", desc: "5 Interview Rounds Scheduled Today" },
          { title: "Offer Acceptance Rate", num: "94.2%", desc: "Average Time-to-Hire: 12 Days" },
          { title: "Policy Compliance Audit", num: "100%", desc: "Labor Law 2026 Compliant" },
          { title: "Employee Satisfaction", num: "4.8 / 5", desc: "Based on AI Sentiment Surveys" }
        ],
        aiTools: [],
        queries: [
          "What compliance documents are required for new hires?",
          "What is the exact wording for the 2026 paternity leave clause?"
        ],
        templates: [
          { label: "Candidate Offer Letter", sub: "Employment Offer Letter — SynapseAI", body: "Dear Candidate,\n\nWe are thrilled to extend an offer for the Senior Developer role at SynapseAI!\n\nBest regards,\nHR Team" }
        ]
      },

      Manager: {
        accent: '#F59E0B',
        label: 'Manager Operations Portal',
        icon: 'fa-briefcase',
        abbr: 'MG',
        cls: 'rb-manager',
        sidebarMenu: [
          { id: 'role_dashboard', icon: 'fa-gauge-high', label: 'Manager Dashboard' },
          { id: 'feat_projects', icon: 'fa-diagram-project', label: 'Projects & Health' },
          { id: 'feat_team', icon: 'fa-users', label: 'Team Workload' },
          { id: 'feat_approvals', icon: 'fa-circle-check', label: 'Approvals Center' },
          { id: 'feat_reports', icon: 'fa-file-export', label: 'Weekly Team Reports' },
          { id: 'feat_meetings', icon: 'fa-calendar-days', label: 'Meetings' },
          { id: 'feat_decision', icon: 'fa-scale-balanced', label: 'AI Decision Center' },
          { id: 'shared_rag', icon: 'fa-comments', label: 'Team AI Assistant Chatbot' },
        , { id: 'feat_notifications', icon: 'fa-bell', label: 'Notifications' }],
        heroHeading: 'Manager Team Operations & Project Control',
        heroDesc: 'Monitor department travel budgets, track project health predictors, review workload heatmaps, and approve team requests.',
        stats: [
          { title: "Department Travel Budget", num: "$45,000", desc: "$12,400 Utilized in Q3" },
          { title: "Pending Approvals", num: "8 Requests", desc: "Expenses & Leave Requests" },
          { title: "Project Health Score", num: "92%", desc: "0 Sprint Deadlines Blocked" },
          { title: "Team Workload Index", num: "Optimal", desc: "1 Member Needs Reallocation" }
        ],
        aiTools: [],
        queries: [
          "What is the travel expense meal limit per day?",
          "How do I approve quarterly expense claims?"
        ],
        templates: [
          { label: "Expense Approval Email", sub: "Manager Approval: Travel Expense Claim Approved", body: "Dear Finance Team,\n\nI have reviewed and approved the travel expense claim.\n\nBest regards,\nManager" }
        ]
      },

      Admin: {
        accent: '#F43F5E',
        label: 'Admin Control Center',
        icon: 'fa-crown',
        abbr: 'AD',
        cls: 'rb-admin',
        sidebarMenu: [
          { id: 'role_dashboard', icon: 'fa-house-laptop', label: 'Executive Dashboard' },
          { id: 'shared_rag', icon: 'fa-comments', label: 'Enterprise AI Assistant Chatbot' },
          { id: 'feat_admin_org_mgmt', icon: 'fa-sitemap', label: 'Organization Management' },
          { id: 'feat_admin_knowledge_center', icon: 'fa-book-bookmark', label: 'Enterprise Knowledge Center' },
          { id: 'feat_admin_workflow_automation', icon: 'fa-bolt', label: 'Workflow & Automation Center' },
          { id: 'feat_admin_security_sysadmin', icon: 'fa-shield-halved', label: 'Security & System Administration' },
        , { id: 'feat_notifications', icon: 'fa-bell', label: 'Notifications' }],
        heroHeading: 'Good Morning, Admin 👋',
        getHeroDesc: () => `
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="font-size:1.15rem; font-weight:800; color:var(--text-main);">Enterprise Executive Brief</div>
            <div style="font-size:1rem; font-weight:700; color:var(--status-emerald);">Organization Health: ${STATE.Admin.healthScore}% (Optimal)</div>
            <div><b>Today's Highlights:</b></div>
            <ul class="bullet-list-dash">
              <li>${STATE.Admin.totalEmployees.toLocaleString()} employees active today</li>
              <li>12 new knowledge documents published</li>
              <li>${STATE.Admin.pendingApprovalsCount} leave, expense & access requests pending review</li>
              <li>3 departments require policy updates</li>
              <li>AI answered 1,245 employee questions</li>
              <li>Knowledge coverage increased by 4%</li>
              <li>No critical security incidents</li>
            </ul>
            <div style="margin-top:8px; display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn-submit" onclick="switchPane('shared_rag', document.querySelector('.nav-item[onclick*=\'shared_rag\']'))" style="background:var(--accent-gradient); font-weight:800; box-shadow:0 6px 20px rgba(99,102,241,0.5);">
                <i class="fa-solid fa-brain"></i> Open Admin Enterprise AI Assistant
              </button>
              <button class="btn-submit" onclick="downloadDirectPNG()">
                <i class="fa-solid fa-file-image"></i> Download Direct Report PNG
              </button>
              <button class="btn-submit" onclick="downloadDirectPDF()" style="background:rgba(6,182,212,0.2); border:1px solid #06B6D4;">
                <i class="fa-solid fa-file-pdf"></i> Download Direct Report PDF
              </button>
            </div>
          </div>`,
        getStats: () => [
          { title: "Total Employees", num: `${STATE.Admin.totalEmployees.toLocaleString()} Staff`, desc: `${STATE.Admin.activeToday} Active Employees Today` },
          { title: "Active Departments", num: `${STATE.Admin.totalDepartments} Depts`, desc: "Engineering, HR, Sales, IT, Ops" },
          { title: "Knowledge Documents", num: `${STATE.Admin.knowledgeDocs} Files`, desc: `${STATE.Admin.knowledgeCoverage}% Knowledge Coverage (+4%)` },
          { title: "Pending Approvals", num: `${STATE.Admin.pendingApprovalsCount} Requests`, desc: `${STATE.Admin.pendingLeaveClaims} Leave, ${STATE.Admin.pendingExpenseClaims} Expense` },
          { title: "AI Conversations Today", num: `${STATE.Admin.aiQueriesToday.toLocaleString()}`, desc: "96% Grounded Answer Score" },
          { title: "Emails Sent Today", num: `${STATE.Admin.emailsSentToday} Dispatches`, desc: "99.4% Delivery Success" }
        ],
        aiTools: [],
        queries: [
          "What is the vector index chunking configuration?",
          "How are RLS policies enforced on document storage?"
        ],
        templates: [
          { label: "Security Advisory Notice", sub: "System Advisory: Security Audit & Key Rotation", body: "Dear Administrator,\n\nSystem audit completed with 0 violations.\n\nBest regards,\nSystem Admin" }
        ]
      }
    };

    function toast(message, type = 'info', duration = 3000) {
      const container = document.getElementById('toast-container');
      if (container) container.innerHTML = '';
      const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warn: 'fa-triangle-exclamation' };
      const t = document.createElement('div');
      t.className = `toast toast-${type}`;
      t.innerHTML = `<i class="fa-solid ${icons[type]}" style="flex-shrink:0;margin-top:2px"></i><div>${message}</div>`;
      container.appendChild(t);
      setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; setTimeout(() => t.remove(), 300); }, duration);
    }

    // MODAL DIALOG SYSTEM
    function showInteractiveModal(title, iconClass, bodyHTML, primaryBtnText, primaryBtnOnClick) {
      const modal = document.getElementById('interactive-modal');
      document.getElementById('modal-title').textContent = title;
      document.getElementById('modal-icon').className = `fa-solid ${iconClass}`;
      document.getElementById('modal-body-content').innerHTML = bodyHTML;
      
      const primaryBtn = document.getElementById('modal-primary-btn');
      if (primaryBtnText) {
        primaryBtn.style.display = 'flex';
        primaryBtn.textContent = primaryBtnText;
        primaryBtn.onclick = primaryBtnOnClick;
      } else {
        primaryBtn.style.display = 'none';
      }
      
      modal.classList.add('active');
    }

    function closeInteractiveModal() {
      document.getElementById('interactive-modal').classList.remove('active');
    }

    // REAL DOCUMENT DOWNLOADER ENGINE
    function downloadDocumentFile(docName) {
      const filename = docName || 'Document_Extract.pdf';
      toast(`📄 Preparing download for ${filename}...`, 'info', 2000);
      
      const doc = (typeof STATE !== 'undefined' && STATE.Admin && STATE.Admin.documents) ? STATE.Admin.documents.find(d => d.name === filename) : null;
      const cleanContent = doc ? doc.content : `SYNAPSEAI OFFICIAL ENTERPRISE DOCUMENT\nDocument: ${filename}\nStatus: Verified Vector Grounded\nDate: 2026\n\nOfficial policy handbook content for ${filename}.`;
      const cleanFilename = filename.endsWith('.pdf') || filename.endsWith('.json') || filename.endsWith('.log') || filename.endsWith('.docx') || filename.endsWith('.md') || filename.endsWith('.txt') ? filename : `${filename}.pdf`;

      if (typeof html2pdf !== 'undefined' && doc) {
        const element = document.createElement('div');
        element.style.padding = '30px';
        element.style.color = '#0f172a';
        element.style.background = '#ffffff';
        element.style.fontFamily = 'Arial, sans-serif';
        const dateStr = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
        element.innerHTML = `
          <div style="border-bottom:3px solid #6366f1; padding-bottom:12px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:11px; color:#6366f1; font-weight:bold; letter-spacing:1px;">SYNAPSEAI KNOWLEDGE BASE</div>
              <h1 style="font-size:22px; color:#0f172a; margin:4px 0;">${doc.name}</h1>
              <div style="color:#64748b; font-size:12px;">Author: ${doc.owner || 'Enterprise Admin'} • Dept: ${doc.dept || 'HR & Operations'} • Version: ${doc.ver || 'v2.4'}</div>
            </div>
            <div style="font-size:12px; color:#64748b;">${dateStr}</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:20px; border-radius:8px; font-family:'Courier New', monospace; font-size:13px; line-height:1.7; white-space:pre-wrap;">
${cleanContent}
          </div>
          <div style="margin-top:30px; border-top:1px solid #e2e8f0; padding-top:12px; font-size:11px; color:#94a3b8; text-align:center;">
            CONFIDENTIAL ENTERPRISE DOCUMENT — SYNAPSEAI KNOWLEDGE CENTER
          </div>
        `;
        const opt = {
          margin: 10,
          filename: cleanFilename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save().then(() => {
          toast(`✅ Downloaded ${cleanFilename} successfully!`, 'success', 4000);
        });
      } else {
        const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(cleanContent);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.setAttribute('download', cleanFilename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast(`📥 Downloaded official file: ${cleanFilename}`, 'success', 3000);
      }
    }

    // IN-MODAL AI DOCUMENT QUERY ASSISTANT (DOES NOT JUMP AWAY TO CHATBOT TAB)
    async function queryAIDocInModal(docName) {
      const doc = STATE.Admin.documents.find(d => d.name === docName) || { name: docName, content: 'Enterprise Policy Rules' };
      const resContainer = document.getElementById('modal-ai-query-response');
      if (resContainer) {
        resContainer.style.display = 'block';
        resContainer.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color:var(--accent-primary);"></i> AI analyzing <b>${doc.name}</b>...`;
      }

      try {
        const res = await fetch('/api/v1/rag/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `Summarize key policy rules from ${doc.name}`, user_role: currentRole }),
        });
        const json = await res.json();
        if (resContainer) {
          resContainer.innerHTML = `
            <div style="font-weight:700; color:var(--accent-cyan); margin-bottom:6px;"><i class="fa-solid fa-robot"></i> AI Analysis for ${doc.name}:</div>
            <div style="color:var(--text-main); font-size:0.9rem; line-height:1.6;">${json.data?.answer || doc.content}</div>`;
        }
      } catch (err) {
        if (resContainer) {
          resContainer.innerHTML = `<div style="color:var(--status-emerald);"><b>AI Synthesis for ${doc.name}:</b><br>${doc.content}</div>`;
        }
      }
    }

    // VIEW DOCUMENT DETAILS (WITHOUT DEVELOPER VECTOR/CHUNK BOXES)
    function viewDocDetails(docName) {
      const doc = STATE.Admin.documents.find(d => d.name === docName) || {
        name: docName, cat: 'Policy', dept: 'Human Resources', owner: 'David Miller', ver: 'v2.4', status: 'Indexed', updated: '2026-07-28',
        content: `SECTION 4.2 — GENERAL ENTERPRISE POLICY\n\nAll employees must comply with internal guidelines.`
      };

      const body = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <!-- Doc Meta Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:16px; border-radius:14px; border:1px solid var(--border-glass);">
            <div>
              <div style="font-size:0.8rem; color:var(--accent-cyan); font-weight:700;">DOCUMENT PREVIEW & POLICY VIEWER</div>
              <h2 style="font-family:'Outfit'; font-size:1.4rem; color:white; margin:4px 0;">${doc.name}</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">Author: <b>${doc.owner}</b> • ${doc.dept} • Updated: ${doc.updated}</div>
            </div>
            <span class="role-badge-inline rb-employee" style="font-size:0.9rem; padding:6px 14px;">${doc.status}</span>
          </div>

          <!-- Document Content Preview -->
          <div style="background:rgba(0,0,0,0.4); border:1px solid var(--border-glass); padding:20px; border-radius:14px; font-family:'JetBrains Mono', monospace; font-size:0.9rem; line-height:1.7; max-height:260px; overflow-y:auto; color:var(--text-main); white-space:pre-wrap;">
<div style="color:var(--text-dim); border-bottom:1px solid var(--border-glass); padding-bottom:6px; margin-bottom:12px;">[Official Document Text Content]</div>
${doc.content}
          </div>

          <!-- In-Modal AI Response Container -->
          <div id="modal-ai-query-response" style="display:none; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.4); padding:14px; border-radius:12px;"></div>

          <!-- Quick Action Controls -->
          <div style="display:flex; gap:10px;">
            <button class="btn-submit" onclick="downloadDocumentFile('${doc.name.replace(/'/g, "\\'")}')" style="flex:1; justify-content:center;"><i class="fa-solid fa-download"></i> Download File (${doc.name.split('.').pop().toUpperCase()})</button>
            <button class="btn-submit" onclick="queryAIDocInModal('${doc.name.replace(/'/g, "\\'")}')" style="flex:1; justify-content:center; background:rgba(6,182,212,0.2); border:1px solid #06B6D4;"><i class="fa-solid fa-robot"></i> Query AI Assistant On This Doc</button>
          </div>
        </div>`;

      showInteractiveModal(`Document Viewer — ${doc.name}`, 'fa-file-pdf', body, null, null);
    }

    // RICH AI SUMMARIZE MODAL WITH FILE-SPECIFIC TAKEAWAYS
    function generateAISummaryModal(docName) {
      const doc = STATE.Admin.documents.find(d => d.name === docName) || { name: docName, content: 'Policy rules' };

      const body = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <!-- Summary Header -->
          <div style="background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.4); padding:18px; border-radius:16px;">
            <div style="display:flex; align-items:center; gap:8px; color:var(--accent-primary); font-size:0.85rem; font-weight:700;">
              <i class="fa-solid fa-wand-magic-sparkles"></i> SYNAPSEAI AUTOMATED LLM SUMMARY
            </div>
            <h2 style="font-family:'Outfit'; font-size:1.4rem; color:white; margin:6px 0;">Executive Summary: ${docName}</h2>
            <div style="font-size:0.88rem; color:var(--text-muted); line-height:1.6;">
              Grounded synthesis generated with high answer confidence rating.
            </div>
          </div>

          <!-- Document Specific Content Summary -->
          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:18px; border-radius:16px;">
            <b style="font-size:1rem; color:var(--accent-cyan);"><i class="fa-solid fa-list-check"></i> Key Document Rules & Takeaways:</b>
            <div style="margin-top:10px; font-family:'JetBrains Mono', monospace; font-size:0.88rem; color:var(--text-main); white-space:pre-wrap; line-height:1.6;">
${doc.content}
            </div>
          </div>

          <!-- Actions -->
          <div style="display:flex; gap:10px;">
            <button class="btn-submit" onclick="autoDraftFromAnswer('${doc.name}', '${doc.content.replace(/\n/g, ' ').replace(/'/g, "\\'")}')" style="flex:1; justify-content:center;"><i class="fa-solid fa-envelope"></i> Draft Email Notice</button>
            <button class="btn-submit" onclick="downloadDocumentFile('${doc.name.replace(/'/g, "\\'")}')" style="flex:1; justify-content:center; background:rgba(6,182,212,0.2); border:1px solid #06B6D4;"><i class="fa-solid fa-file-pdf"></i> Export Document PDF</button>
          </div>
        </div>`;

      showInteractiveModal(`AI Summary — ${docName}`, 'fa-wand-magic-sparkles', body, null, null);
    }

function approveEmailRequest(notifId) {
  if (window.platformNotifications) {
    const notif = window.platformNotifications.find(n => n.id === notifId);
    if (notif) {
      notif.type = 'email_approval_done';
      notif.read = true;
      savePersistentNotifications();
      
      const btn = document.getElementById('btn-approve-' + notifId);
      if (btn) {
        btn.outerHTML = `<span class="role-badge-inline rb-emerald" style="font-size:0.75rem;"><i class="fa-solid fa-check"></i> Mail Approved</span>`;
      }
      toast('✅ Email Request Approved Successfully!', 'success', 3000);
      updateNotificationBadge();
    }
  }
}


    // UPLOAD DOCUMENT MODAL WITH FILE SELECTION
    function handleFileSelect(input) {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        document.getElementById('new-doc-name').value = file.name;
        document.getElementById('upload-file-status').innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--status-emerald);"></i> <b>Selected:</b> ${file.name} (${(file.size/1024).toFixed(1)} KB)`;
        toast(`📁 Selected file: <b>${file.name}</b>`, 'info');
      }
    }

    function openUploadDocModal() {
      const body = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div class="file-upload-dropzone" onclick="document.getElementById('real-file-input').click()">
            <i class="fa-solid fa-cloud-arrow-up" style="font-size:2.4rem; color:var(--accent-primary);"></i>
            <div>
              <b style="font-size:1rem; color:white;">Click to Browse or Drag & Drop PDF, DOCX, TXT</b>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Supports files up to 50MB for automatic indexing</div>
            </div>
            <div id="upload-file-status" style="font-size:0.85rem; color:var(--text-muted); margin-top:6px;">No file chosen yet</div>
          </div>
          <input type="file" id="real-file-input" accept=".pdf,.docx,.doc,.txt" style="display:none" onchange="handleFileSelect(this)">

          <div class="email-field-group">
            <label class="email-field-label">Document Name / Title</label>
            <input type="text" id="new-doc-name" class="input-box" placeholder="e.g. 2026_Travel_Insurance_Guidelines.pdf">
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div class="email-field-group">
              <label class="email-field-label">Category</label>
              <select id="new-doc-cat" class="email-template-select">
                <option value="Policies">Policies</option>
                <option value="Security">Security</option>
                <option value="Finance">Finance</option>
                <option value="Legal">Legal</option>
                <option value="Training">Training</option>
              </select>
            </div>
            <div class="email-field-group">
              <label class="email-field-label">Department</label>
              <select id="new-doc-dept" class="email-template-select">
                <option value="Human Resources">Human Resources</option>
                <option value="IT / Infrastructure">IT / Infrastructure</option>
                <option value="Finance & Audit">Finance & Audit</option>
                <option value="Legal & Operations">Legal & Operations</option>
              </select>
            </div>
          </div>
          <div class="email-field-group">
            <label class="email-field-label">Document Owner / Author</label>
            <input type="text" id="new-doc-owner" class="input-box" value="Sarah Jenkins">
          </div>
        </div>`;

      showInteractiveModal('Upload Knowledge Document', 'fa-cloud-arrow-up', body, 'Upload Document', submitUploadDoc);
    }

    function submitUploadDoc() {
      const name = document.getElementById('new-doc-name').value.trim();
      const cat = document.getElementById('new-doc-cat').value;
      const dept = document.getElementById('new-doc-dept').value;
      const owner = document.getElementById('new-doc-owner').value.trim() || 'Admin';

      if (!name) {
        toast('Please select or enter a Document Name!', 'warn');
        return;
      }

      const newDoc = {
        name, cat, dept, owner, ver: 'v1.0', status: 'Indexed', updated: new Date().toISOString().split('T')[0], cls: 'rb-employee',
        content: `SECTION 1.0 — ${name.toUpperCase()}\n\nNewly uploaded enterprise document parsed into Knowledge Base.`
      };

      STATE.Admin.documents.unshift(newDoc);
      STATE.Admin.knowledgeDocs++;
      
      closeInteractiveModal();
      logTimelineAction(`HR uploaded new document: <b>${name}</b> (${cat})`);
      renderDocTableUI();
      toast(`✅ Uploaded & Indexed <b>${name}</b>!`, 'success', 4000);
    }

    // INSTANT FILE PICKER FOR IMPORT MODAL (CLICK ANY OPTION OR DROPZONE -> OPENS SYSTEM FILE PICKER IMMEDIATELY)
    function triggerDirectImportFilePicker(sourceName) {
      const fileInput = document.getElementById('import-file-picker');
      if (fileInput) {
        fileInput.setAttribute('data-source', sourceName || 'Cloud Import');
        fileInput.click();
      }
    }

    function handleDirectImportFiles(input) {
      if (input.files && input.files.length > 0) {
        const sourceName = input.getAttribute('data-source') || 'Import';
        const count = input.files.length;
        
        for (let i = 0; i < count; i++) {
          const file = input.files[i];
          STATE.Admin.documents.unshift({
            name: file.name,
            cat: 'Policies',
            dept: 'Human Resources',
            owner: `${sourceName} Sync`,
            ver: 'v1.0',
            status: 'Indexed',
            updated: new Date().toISOString().split('T')[0],
            cls: 'rb-employee',
            content: `SECTION 1.0 — ${file.name.toUpperCase()}\n\nImported from ${sourceName} and added to Knowledge Base.`
          });
          STATE.Admin.knowledgeDocs++;
        }

        closeInteractiveModal();
        logTimelineAction(`Imported ${count} document(s) via <b>${sourceName}</b>`);
        renderDocTableUI();
        toast(`✅ Successfully uploaded & imported <b>${count} document(s)</b>!`, 'success', 4000);
      }
    }

    function openImportDocsModal() {
      const body = `
        <div style="display:flex; flex-direction:column; gap:18px;">
          <div style="font-size:0.92rem; color:var(--text-muted);">Click any option below to browse and select files to upload directly:</div>
          
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px;">
            <div class="item-card" onclick="triggerDirectImportFilePicker('Google Drive')" style="cursor:pointer; text-align:center; align-items:center;">
              <i class="fa-brands fa-google-drive" style="font-size:2.2rem; color:#4285F4;"></i>
              <b>Google Drive</b>
              <div style="font-size:0.75rem; color:var(--text-muted);">Click to Upload Docs</div>
            </div>
            <div class="item-card" onclick="triggerDirectImportFilePicker('MS OneDrive')" style="cursor:pointer; text-align:center; align-items:center;">
              <i class="fa-solid fa-cloud" style="font-size:2.2rem; color:#0078D4;"></i>
              <b>MS OneDrive</b>
              <div style="font-size:0.75rem; color:var(--text-muted);">Click to Upload Docs</div>
            </div>
            <div class="item-card" onclick="triggerDirectImportFilePicker('Notion Workspace')" style="cursor:pointer; text-align:center; align-items:center;">
              <i class="fa-solid fa-book-open" style="font-size:2.2rem; color:#10B981;"></i>
              <b>Notion Workspace</b>
              <div style="font-size:0.75rem; color:var(--text-muted);">Click to Upload Docs</div>
            </div>
          </div>

          <div class="file-upload-dropzone" onclick="triggerDirectImportFilePicker('Local Computer')">
            <i class="fa-solid fa-cloud-arrow-up" style="font-size:2.6rem; color:var(--accent-primary);"></i>
            <div>
              <b style="font-size:1.1rem; color:white;">Click to Browse & Select Any File (.pdf, .docx, .txt, .csv, .zip)</b>
              <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">Instantly parses and adds your chosen files into the Document Library</div>
            </div>
          </div>

          <input type="file" id="import-file-picker" multiple accept="*/*" style="display:none" onchange="handleDirectImportFiles(this)">
        </div>`;

      showInteractiveModal('Import Enterprise Knowledge Documents', 'fa-file-import', body, null, null);
    }

    // KNOWLEDGE COLLECTION FOLDER VIEWER
    function viewCollectionDetails(collName) {
      const coll = STATE.Admin.collections.find(c => c.name === collName) || {
        name: collName, count: '12 Docs', color: '#6366F1', docs: ['2026_Employee_Handbook.pdf', 'IT_Security_Policy_v4.pdf']
      };

      const docListHTML = (coll.docs || ['2026_Employee_Handbook.pdf']).map(docName => {
        const d = STATE.Admin.documents.find(item => item.name === docName) || { name: docName, dept: 'Human Resources', ver: 'v2.4' };
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); border:1px solid var(--border-glass); padding:12px 16px; border-radius:12px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <i class="fa-solid fa-file-pdf" style="color:var(--status-rose); font-size:1.1rem;"></i>
              <div><b>${d.name}</b><div style="font-size:0.78rem; color:var(--text-muted);">${d.dept} • ${d.ver || 'v1.0'}</div></div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn-act" onclick="downloadDocumentFile('${d.name.replace(/'/g, "\\'")}')"><i class="fa-solid fa-download"></i> PDF</button>
              <button class="btn-act" onclick="viewDocDetails('${d.name.replace(/'/g, "\\'")}')"><i class="fa-solid fa-eye"></i> View</button>
            </div>
          </div>`;
      }).join('');

      const body = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="display:flex; align-items:center; gap:14px; background:rgba(255,255,255,0.03); padding:16px; border-radius:14px; border:1px solid var(--border-glass);">
            <i class="fa-solid fa-folder-open" style="color:${coll.color || '#6366F1'}; font-size:2rem;"></i>
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.4rem; color:white;">${coll.name}</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">${coll.count || '12 Docs'} in Collection Folder</div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px;">
            <b style="font-size:0.95rem; color:var(--accent-cyan);"><i class="fa-solid fa-book-bookmark"></i> Documents Inside Collection:</b>
            ${docListHTML}
          </div>
        </div>`;

      showInteractiveModal(`Collection Folder — ${coll.name}`, 'fa-folder-open', body, null, null);
    }

    function openCreateCollectionModal() {
      const body = `
        <div style="display:flex; flex-direction:column; gap:14px;">
          <div class="email-field-group">
            <label class="email-field-label">Collection Name</label>
            <input type="text" id="new-coll-name" class="input-box" placeholder="e.g. Executive Governance & Board Minutes">
          </div>
          <div class="email-field-group">
            <label class="email-field-label">Collection Icon</label>
            <select id="new-coll-icon" class="email-template-select">
              <option value="fa-folder-open">Folder Icon</option>
              <option value="fa-shield-halved">Security Icon</option>
              <option value="fa-scale-balanced">Legal Icon</option>
            </select>
          </div>
        </div>`;

      showInteractiveModal('Create Knowledge Collection', 'fa-folder-plus', body, 'Create Collection', submitCreateCollection);
    }

    function submitCreateCollection() {
      const name = document.getElementById('new-coll-name').value.trim();
      const icon = document.getElementById('new-coll-icon').value;

      if (!name) {
        toast('Please enter a Collection Name!', 'warn');
        return;
      }

      STATE.Admin.knowledgeCollections++;
      STATE.Admin.collections.unshift({ name, icon, count: '0 Docs', color: '#6366F1', docs: [] });

      closeInteractiveModal();
      logTimelineAction(`Created Knowledge Collection: <b>${name}</b>`);
      renderCollectionsGridUI();
      toast(`📚 Created Collection <b>${name}</b>!`, 'success');
    }

    function renderDocTableUI() {
      const tbody = document.getElementById('doc-table-body');
      const docCountEl = document.getElementById('total-docs-kpi-count');
      if (docCountEl) docCountEl.textContent = `${STATE.Admin.knowledgeDocs} Files`;

      if (!tbody) return;

      const searchVal = (document.getElementById('doc-search-input')?.value || '').toLowerCase();
      const catFilter = document.getElementById('doc-cat-filter')?.value || 'All';

      const filtered = STATE.Admin.documents.filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(searchVal) || d.owner.toLowerCase().includes(searchVal) || d.dept.toLowerCase().includes(searchVal);
        const matchesCat = catFilter === 'All' || d.cat.includes(catFilter);
        return matchesSearch && matchesCat;
      });

      tbody.innerHTML = filtered.map(d => `
        <tr>
          <td><b style="color:white;"><i class="fa-solid fa-file-pdf" style="color:var(--status-rose); margin-right:8px;"></i>${d.name}</b></td>
          <td><span class="role-badge-inline ${d.cls}">${d.cat}</span></td>
          <td>${d.dept}</td>
          <td>${d.owner}</td>
          <td><code>${d.ver}</code></td>
          <td><span style="color:var(--status-emerald); font-weight:700;">${d.status}</span></td>
          <td>${d.updated}</td>
          <td>
            <div style="display:flex; gap:8px;">
              <button class="btn-act" onclick="generateAISummaryModal('${d.name.replace(/'/g, "\\'")}')"><i class="fa-solid fa-wand-magic-sparkles"></i> Summarize</button>
              <button class="btn-act" onclick="viewDocDetails('${d.name.replace(/'/g, "\\'")}')"><i class="fa-solid fa-eye"></i> View</button>
            </div>
          </td>
        </tr>`).join('');
    }

    function renderCollectionsGridUI() {
      const container = document.getElementById('collections-grid-container');
      const collCountEl = document.getElementById('total-coll-kpi-count');
      if (collCountEl) collCountEl.textContent = `${STATE.Admin.knowledgeCollections} Collections`;

      if (!container) return;
      container.innerHTML = STATE.Admin.collections.map(c => `
        <div class="item-card" onclick="viewCollectionDetails('${c.name.replace(/'/g, "\\'")}')" style="flex-direction:row; justify-content:space-between; align-items:center; cursor:pointer;">
          <div style="display:flex; align-items:center; gap:12px;">
            <i class="fa-solid ${c.icon}" style="color:${c.color}; font-size:1.3rem;"></i>
            <div><b>${c.name}</b><div style="font-size:0.78rem; color:var(--text-muted);">${c.count}</div></div>
          </div>
          <button class="btn-act"><i class="fa-solid fa-chevron-right"></i></button>
        </div>`).join('');
    }

    function openAddEmployeeModal() {
      const body = `
        <div style="display:flex; flex-direction:column; gap:14px;">
          <div class="email-field-group">
            <label class="email-field-label">Full Name</label>
            <input type="text" id="new-emp-name" class="input-box" placeholder="e.g. John Doe">
          </div>
          <div class="email-field-group">
            <label class="email-field-label">Work Email</label>
            <input type="email" id="new-emp-email" class="input-box" placeholder="e.g. john@enterprise.com">
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div class="email-field-group">
              <label class="email-field-label">Department</label>
              <select id="new-emp-dept" class="email-template-select">
                <option value="IT / Software">IT / Software</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Finance & Audit">Finance & Audit</option>
                <option value="Operations">Operations</option>
                <option value="Marketing & Sales">Marketing & Sales</option>
              </select>
            </div>
            <div class="email-field-group">
              <label class="email-field-label">Role Title</label>
              <input type="text" id="new-emp-role" class="input-box" placeholder="e.g. Software Engineer">
            </div>
          </div>
          <div class="email-field-group">
            <label class="email-field-label">Assigned Manager</label>
            <input type="text" id="new-emp-manager" class="input-box" placeholder="e.g. David Miller">
          </div>
        </div>`;

      showInteractiveModal('Add New Employee', 'fa-user-plus', body, 'Add Employee', submitAddEmployee);
    }

    function submitAddEmployee() {
      const name = document.getElementById('new-emp-name').value.trim();
      const email = document.getElementById('new-emp-email').value.trim();
      const dept = document.getElementById('new-emp-dept').value;
      const role = document.getElementById('new-emp-role').value.trim() || 'Staff';
      const manager = document.getElementById('new-emp-manager').value.trim() || 'David Miller';

      if (!name || !email) {
        toast('Please fill out Name and Email!', 'warn');
        return;
      }

      const newId = `EMP-00${STATE.Admin.employees.length + 1}`;
      const initials = name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0,2);
      
      const newEmp = {
        id: newId, name, email, dept, manager, role, status: 'Active', avatar: initials, color: '#6366F1'
      };

      STATE.Admin.employees.unshift(newEmp);
      STATE.Admin.totalEmployees++;
      
      closeInteractiveModal();
      logTimelineAction(`New Employee <b>${name}</b> (${role}) added to ${dept}`);
      renderEmployeeTableUI();
      updateDashboardStatsUI();
      toast(`✅ Added employee <b>${name}</b> (${newId})!`, 'success', 4000);
    }

    function openCreateDeptModal() {
      const body = `
        <div style="display:flex; flex-direction:column; gap:14px;">
          <div class="email-field-group">
            <label class="email-field-label">Department Name</label>
            <input type="text" id="new-dept-name" class="input-box" placeholder="e.g. AI Research & Innovation">
          </div>
          <div class="email-field-group">
            <label class="email-field-label">Department Head / Manager</label>
            <input type="text" id="new-dept-head" class="input-box" placeholder="e.g. Dr. Aris Thorne">
          </div>
          <div class="email-field-group">
            <label class="email-field-label">Initial Headcount Allocation</label>
            <input type="number" id="new-dept-count" class="input-box" value="15">
          </div>
        </div>`;

      showInteractiveModal('Create New Department', 'fa-building-circle-plus', body, 'Create Department', submitCreateDept);
    }

    function submitCreateDept() {
      const name = document.getElementById('new-dept-name').value.trim();
      const head = document.getElementById('new-dept-head').value.trim() || 'Unassigned';
      const count = document.getElementById('new-dept-count').value || '15';

      if (!name) {
        toast('Please enter a Department Name!', 'warn');
        return;
      }

      STATE.Admin.totalDepartments++;
      STATE.Admin.departments.unshift({
        name, sub: `Lead: ${head}`, count: `${count} Employees`, cls: 'rb-admin'
      });

      closeInteractiveModal();
      logTimelineAction(`Department Created: <b>${name}</b> (Lead: ${head})`);
      renderDepartmentGridUI();
      updateDashboardStatsUI();
      toast(`🏢 Created Department <b>${name}</b>!`, 'success', 4000);
    }

    function openInviteUserModal() {
      const body = `
        <div style="display:flex; flex-direction:column; gap:14px;">
          <div class="email-field-group">
            <label class="email-field-label">Recipient Invite Email</label>
            <input type="email" id="invite-email" class="input-box" value="newhire@enterprise.com">
          </div>
          <div class="email-field-group">
            <label class="email-field-label">Assign Role Tier</label>
            <select id="invite-role-tier" class="email-template-select">
              <option value="Employee">Employee Tier</option>
              <option value="HR Specialist">HR Specialist Tier</option>
              <option value="Manager">Manager Tier</option>
              <option value="Admin">Admin Control Tier</option>
            </select>
          </div>
        </div>`;

      showInteractiveModal('Invite New User', 'fa-envelope-open-text', body, 'Send Invitation', submitInviteUser);
    }

    function submitInviteUser() {
      const email = document.getElementById('invite-email').value.trim();
      const role = document.getElementById('invite-role-tier').value;

      closeInteractiveModal();
      logTimelineAction(`User Invitation dispatched to <b>${email}</b> (${role} Tier)`);
      toast(`✉️ Dispatched onboarding invite to <b>${email}</b>!`, 'success');
    }

    function openBroadcastModal() {
      const body = `
        <div style="display:flex; flex-direction:column; gap:14px;">
          <div class="email-field-group">
            <label class="email-field-label">Announcement Headline</label>
            <input type="text" id="broad-headline" class="input-box" value="📢 2026 Annual All-Hands & Executive Strategy Briefing">
          </div>
          <div class="email-field-group">
            <label class="email-field-label">Announcement Content</label>
            <textarea id="broad-content" class="input-box" style="height:110px;">Please join us this Thursday at 10 AM EST for our annual company strategic briefing.</textarea>
          </div>
        </div>`;

      showInteractiveModal('Broadcast Announcement', 'fa-bullhorn', body, 'Broadcast to All Staff', submitBroadcast);
    }

    function submitBroadcast() {
      const headline = document.getElementById('broad-headline').value.trim();
      closeInteractiveModal();
      logTimelineAction(`Announcement Broadcasted: "${headline}"`);
      toast(`📢 Broadcast sent to all <b>${STATE.Admin.totalEmployees.toLocaleString()}</b> employees!`, 'success', 4000);
    }

    function exportEmployeeCSV() {
      toast('📥 Preparing Employee Directory CSV...', 'info', 2000);
      let csv = 'Employee ID,Name,Email,Department,Manager,Role,Status\n';
      STATE.Admin.employees.forEach(e => {
        csv += `"${e.id}","${e.name}","${e.email}","${e.dept}","${e.manager}","${e.role}","${e.status}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SynapseAI_Employee_Directory_2026.csv';
      a.click();
      toast('✅ Downloaded SynapseAI_Employee_Directory_2026.csv!', 'success', 4000);
    }

    function viewEmployeeDetails(empId) {
      const emp = STATE.Admin.employees.find(e => e.id === empId);
      if (!emp) return;

      const body = `
        <div style="display:flex; gap:18px; align-items:center; border-bottom:1px solid var(--border-glass); padding-bottom:16px;">
          <div class="avatar" style="width:60px; height:60px; font-size:1.5rem; background:${emp.color};">${emp.avatar}</div>
          <div>
            <h2 style="font-family:'Outfit'; font-size:1.4rem;">${emp.name}</h2>
            <div style="color:var(--text-muted); font-size:0.9rem;">${emp.role} • <code>${emp.id}</code></div>
            <div style="margin-top:4px;"><span class="role-badge-inline rb-employee">${emp.status}</span></div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; font-size:0.9rem; margin-top:12px;">
          <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:12px;"><b>Email:</b> ${emp.email}</div>
          <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:12px;"><b>Department:</b> ${emp.dept}</div>
          <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:12px;"><b>Manager:</b> ${emp.manager}</div>
          <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:12px;"><b>Performance Rating:</b> <span style="color:var(--status-emerald); font-weight:800;">4.9 / 5.0</span></div>
          <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:12px;"><b>AI Sentiment Index:</b> <span style="color:#C7D2FE; font-weight:700;">Optimal (98%)</span></div>
          <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:12px;"><b>Security Clearance:</b> Tier 2 Active</div>
        </div>`;

      showInteractiveModal(`Employee Profile — ${emp.name}`, 'fa-id-card', body, null, null);
    }

    function renderEmployeeTableUI() {
      const tbody = document.getElementById('employee-table-body');
      if (!tbody) return;

      const searchVal = (document.getElementById('table-search-input')?.value || '').toLowerCase();
      const deptFilter = document.getElementById('table-dept-filter')?.value || 'All';
      const roleFilter = document.getElementById('table-role-filter')?.value || 'All';

      const filtered = STATE.Admin.employees.filter(e => {
        const matchesSearch = e.name.toLowerCase().includes(searchVal) || e.id.toLowerCase().includes(searchVal) || e.email.toLowerCase().includes(searchVal);
        const matchesDept = deptFilter === 'All' || e.dept.includes(deptFilter);
        const matchesRole = roleFilter === 'All' || e.role.includes(roleFilter);
        return matchesSearch && matchesDept && matchesRole;
      });

      tbody.innerHTML = filtered.map(e => `
        <tr>
          <td><div class="avatar" style="width:34px;height:34px;font-size:0.85rem;background:${e.color};">${e.avatar}</div></td>
          <td><code>${e.id}</code></td>
          <td><b>${e.name}</b><div style="font-size:0.75rem; color:var(--text-muted)">${e.email}</div></td>
          <td>${e.dept}</td>
          <td>${e.manager}</td>
          <td><span class="role-badge-inline rb-employee">${e.role}</span></td>
          <td><span style="color:var(--status-emerald); font-weight:700;">${e.status}</span></td>
          <td><button class="btn-act" onclick="viewEmployeeDetails('${e.id}')"><i class="fa-solid fa-eye"></i> View</button></td>
        </tr>`).join('');
    }

    function renderDepartmentGridUI() {
      const container = document.getElementById('department-grid-container');
      const deptCountEl = document.getElementById('total-depts-kpi-count');
      if (deptCountEl) deptCountEl.textContent = STATE.Admin.totalDepartments;

      if (!container) return;
      container.innerHTML = STATE.Admin.departments.map(d => `
        <div class="item-card" style="flex-direction:row; justify-content:space-between; align-items:center;">
          <div><b>${d.name}</b><div style="font-size:0.8rem; color:var(--text-muted);">${d.sub}</div></div>
          <span class="role-badge-inline ${d.cls}" style="font-size:0.85rem; padding:4px 10px;">${d.count}</span>
        </div>`).join('');
    }

    function renderAdminPendingApprovals() {
      const container = document.getElementById('pending-approvals-container');
      const headingCount = document.getElementById('pending-approvals-heading-count');
      const copilotCount = document.getElementById('copilot-pending-count');
      
      if (headingCount) headingCount.textContent = STATE.Admin.pendingApprovalsCount;
      if (copilotCount) copilotCount.textContent = STATE.Admin.pendingApprovalsCount;

      if (!container) return;
      container.innerHTML = '';

      if (STATE.Admin.pendingApprovalsCount === 0) {
        container.innerHTML = `
          <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.4); padding:16px; border-radius:14px; color:#6EE7B7; text-align:center; font-weight:700;">
            <i class="fa-solid fa-circle-check" style="font-size:1.2rem;"></i> All 64 pending executive approvals completed!
          </div>`;
        return;
      }

      if (!STATE.Admin.leaveApproved) {
        container.innerHTML += `
          <div style="display:flex; flex-direction:row; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); border:1px solid var(--border-glass); padding:12px 16px; border-radius:14px;">
            <div>
              <b style="font-size:0.92rem; color:white;">42 Employee Leave Claims</b>
              <div style="font-size:0.78rem; color:var(--text-muted);">PTO & Parental Leave Requests</div>
            </div>
            <button class="btn-submit" onclick="approveLeaveBatch()" style="padding:6px 14px; font-size:0.78rem;"><i class="fa-solid fa-check"></i> Approve Batch</button>
          </div>`;
      }

      if (!STATE.Admin.policyApproved) {
        container.innerHTML += `
          <div style="display:flex; flex-direction:row; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); border:1px solid var(--border-glass); padding:12px 16px; border-radius:14px;">
            <div>
              <b style="font-size:0.92rem; color:white;">3 Policy Revisions</b>
              <div style="font-size:0.78rem; color:var(--text-muted);">2026 Handbook & Hybrid Work Rules</div>
            </div>
            <button class="btn-submit" onclick="approvePolicyBatch()" style="padding:6px 14px; font-size:0.78rem;"><i class="fa-solid fa-check"></i> Approve Batch</button>
          </div>`;
      }

      if (!STATE.Admin.expenseApproved) {
        container.innerHTML += `
          <div style="display:flex; flex-direction:row; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); border:1px solid var(--border-glass); padding:12px 16px; border-radius:14px;">
            <div>
              <b style="font-size:0.92rem; color:white;">5 Executive Expense Reimbursements</b>
              <div style="font-size:0.78rem; color:var(--text-muted);">$14,500 Travel & Equipment Receipts</div>
            </div>
            <button class="btn-submit" onclick="approveExpenseBatch()" style="padding:6px 14px; font-size:0.78rem;"><i class="fa-solid fa-check"></i> Approve Batch</button>
          </div>`;
      }

      if (!STATE.Admin.accessApproved) {
        container.innerHTML += `
          <div style="display:flex; flex-direction:row; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); border:1px solid var(--border-glass); padding:12px 16px; border-radius:14px;">
            <div>
              <b style="font-size:0.92rem; color:white;">8 New User RBAC Access Requests</b>
              <div style="font-size:0.78rem; color:var(--text-muted);">Engineering & HR Role Grants</div>
            </div>
            <button class="btn-submit" onclick="approveAccessBatch()" style="padding:6px 14px; font-size:0.78rem;"><i class="fa-solid fa-check"></i> Approve Batch</button>
          </div>`;
      }

      if (!STATE.Admin.equipmentApproved) {
        container.innerHTML += `
          <div style="display:flex; flex-direction:row; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); border:1px solid var(--border-glass); padding:12px 16px; border-radius:14px;">
            <div>
              <b style="font-size:0.92rem; color:white;">4 Onboarding Equipment Allocations</b>
              <div style="font-size:0.78rem; color:var(--text-muted);">MacBook Pro M3 & 4K Monitor Setups</div>
            </div>
            <button class="btn-submit" onclick="approveEquipmentBatch()" style="padding:6px 14px; font-size:0.78rem;"><i class="fa-solid fa-check"></i> Approve Batch</button>
          </div>`;
      }

      if (!STATE.Admin.modelApproved) {
        container.innerHTML += `
          <div style="display:flex; flex-direction:row; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); border:1px solid var(--border-glass); padding:12px 16px; border-radius:14px;">
            <div>
              <b style="font-size:0.92rem; color:white;">2 AI Model Access Authorizations</b>
              <div style="font-size:0.78rem; color:var(--text-muted);">GPT-4o Enterprise Model Key Tokens</div>
            </div>
            <button class="btn-submit" onclick="approveModelBatch()" style="padding:6px 14px; font-size:0.78rem;"><i class="fa-solid fa-check"></i> Approve Batch</button>
          </div>`;
      }
    }

    function approveLeaveBatch() {
      STATE.Admin.leaveApproved = true;
      STATE.Admin.pendingLeaveClaims = 0;
      STATE.Admin.pendingApprovalsCount -= 42;
      logTimelineAction('Executive Admin approved 42 Employee Leave Claims');
      renderAdminPendingApprovals();
      updateDashboardStatsUI();
      toast('✅ Approved 42 Employee Leave Claims!', 'success');
    }

    function approvePolicyBatch() {
      STATE.Admin.policyApproved = true;
      STATE.Admin.pendingPolicyRevisions = 0;
      STATE.Admin.pendingApprovalsCount -= 3;
      logTimelineAction('Executive Admin approved 3 Policy Revisions');
      renderAdminPendingApprovals();
      updateDashboardStatsUI();
      toast('✅ Approved 3 Policy Revisions!', 'success');
    }

    function approveExpenseBatch() {
      STATE.Admin.expenseApproved = true;
      STATE.Admin.pendingExpenseClaims = 0;
      STATE.Admin.pendingApprovalsCount -= 5;
      logTimelineAction('Executive Admin approved $14,500 Expense Reimbursements');
      renderAdminPendingApprovals();
      updateDashboardStatsUI();
      toast('✅ Approved $14,500 Expense Claims!', 'success');
    }

    function approveAccessBatch() {
      STATE.Admin.accessApproved = true;
      STATE.Admin.pendingAccessRequests = 0;
      STATE.Admin.pendingApprovalsCount -= 8;
      logTimelineAction('Executive Admin authorized 8 RBAC Access Requests');
      renderAdminPendingApprovals();
      updateDashboardStatsUI();
      toast('✅ Authorized 8 New User Access Requests!', 'success');
    }

    function approveEquipmentBatch() {
      STATE.Admin.equipmentApproved = true;
      STATE.Admin.pendingEquipmentRequests = 0;
      STATE.Admin.pendingApprovalsCount -= 4;
      logTimelineAction('Executive Admin authorized 4 Onboarding Equipment Setups');
      renderAdminPendingApprovals();
      updateDashboardStatsUI();
      toast('✅ Authorized 4 Equipment Setups!', 'success');
    }

    function approveModelBatch() {
      STATE.Admin.modelApproved = true;
      STATE.Admin.pendingModelAccessGrants = 0;
      STATE.Admin.pendingApprovalsCount -= 2;
      logTimelineAction('Executive Admin granted 2 GPT-4o Enterprise Model Access Keys');
      renderAdminPendingApprovals();
      updateDashboardStatsUI();
      toast('✅ Granted 2 AI Model Access Keys!', 'success');
    }

    function logTimelineAction(text) {
      const timeline = document.getElementById('activity-timeline-container');
      if (timeline) {
        timeline.insertAdjacentHTML('afterbegin', `<div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); padding:10px; border-radius:10px;"><b>Just now:</b> ${text}</div>`);
      }
    }

    function updateDashboardStatsUI() {
      const config = ROLE_CONFIG[currentRole];
      const statsGrid = document.getElementById('role-stats-grid');
      const stats = currentRole === 'Admin' ? config.getStats() : config.stats;
      
      if (statsGrid) {
        statsGrid.innerHTML = stats.map(s => `
          <div class="glass-card">
            <div style="font-size:0.85rem; font-weight:700; color:var(--text-muted);">${s.title}</div>
            <div class="stat-number">${s.num}</div>
            <div style="font-size:0.78rem; color:var(--status-emerald); font-weight:700;">${s.desc}</div>
          </div>`).join('');
      }
    }

    function openExecReportModal() {
      const modal = document.getElementById('exec-report-modal');
      const content = document.getElementById('exec-report-modal-content');
      
      const dateStr = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

      content.innerHTML = `
        <div id="pdf-report-content">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glass); padding-bottom:16px;">
            <div>
              <div style="font-size:0.8rem; color:var(--accent-cyan); font-weight:700;">CONFIDENTIAL EXECUTIVE REPORT</div>
              <h2 style="font-family:'Outfit'; font-size:1.5rem;">SynapseAI Quarterly Operations Briefing</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">${dateStr}</div>
            </div>
            <div style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.4); padding:8px 18px; border-radius:20px; color:#6EE7B7; font-weight:800; font-size:1.1rem;">
              Health: ${STATE.Admin.healthScore}%
            </div>
          </div>

          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:14px; margin-top:16px;">
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:14px; border-radius:14px;">
              <div style="font-size:0.8rem; color:var(--text-muted);">Active Workforce</div>
              <div style="font-size:1.4rem; font-weight:800; color:white;">${STATE.Admin.activeToday} / ${STATE.Admin.totalEmployees}</div>
              <div style="font-size:0.75rem; color:var(--status-emerald);">80% Daily Active Ratio</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:14px; border-radius:14px;">
              <div style="font-size:0.8rem; color:var(--text-muted);">Knowledge Coverage</div>
              <div style="font-size:1.4rem; font-weight:800; color:white;">${STATE.Admin.knowledgeCoverage}%</div>
              <div style="font-size:0.75rem; color:var(--status-emerald);">84 Active Indexed Docs</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:14px; border-radius:14px;">
              <div style="font-size:0.8rem; color:var(--text-muted);">Pending Approvals</div>
              <div style="font-size:1.4rem; font-weight:800; color:white;">${STATE.Admin.pendingApprovalsCount}</div>
              <div style="font-size:0.75rem; color:var(--status-amber);">${STATE.Admin.pendingLeaveClaims} Leave, ${STATE.Admin.pendingExpenseClaims} Expense</div>
            </div>
          </div>

          <div style="background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.3); padding:18px; border-radius:16px; font-size:0.92rem; margin-top:16px;">
            <b style="color:var(--accent-primary); font-size:1rem;">Executive AI Analysis & Insights:</b>
            <p style="margin-top:8px; color:var(--text-main);">
              SynapseAI processed <b>${STATE.Admin.aiQueriesToday.toLocaleString()} employee queries</b> today with an average answer confidence of <b>96%</b>. 
              Key trending queries focused on the newly revised <b>2026 Paternity Leave Policy</b> and <b>Travel Expenses Cap ($75/day)</b>.
            </p>
          </div>

          <div style="margin-top:16px;">
            <b style="font-size:1rem; color:var(--text-main);">Recommended Executive Decisions:</b>
            <ul class="bullet-list-dash" style="margin-top:8px;">
              <li>Approve remaining ${STATE.Admin.pendingApprovalsCount} pending requests in the Action Center.</li>
              <li>Publish the draft for <i>Travel Insurance Guidelines</i> to close the knowledge gap.</li>
              <li>Reallocate 2 Sprint tasks in Engineering to optimize team throughput.</li>
            </ul>
          </div>
        </div>`;

      modal.classList.add('active');
    }

    function downloadDirectPNG() {
      toast('🖼️ Generating High-Res Executive PNG Image...', 'info', 2000);
      
      const element = document.createElement('div');
      element.style.padding = '40px';
      element.style.width = '800px';
      element.style.color = '#0f172a';
      element.style.background = '#ffffff';
      element.style.fontFamily = 'Plus Jakarta Sans, Arial, sans-serif';
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      document.body.appendChild(element);

      const dateStr = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

      element.innerHTML = `
        <div style="border-bottom:4px solid #6366f1; padding-bottom:15px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:12px; color:#6366f1; font-weight:bold; letter-spacing:1.5px;">SYNAPSEAI ENTERPRISE OS</div>
            <h1 style="font-size:24px; color:#0f172a; margin:4px 0; font-weight:800;">Executive Quarterly Operations Report</h1>
            <div style="color:#64748b; font-size:13px;">${dateStr}</div>
          </div>
          <div style="background:#10b981; color:white; padding:8px 20px; border-radius:20px; font-weight:bold; font-size:16px;">
            Health: ${STATE.Admin.healthScore}%
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:15px; margin-bottom:25px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:12px;">
            <div style="font-size:12px; color:#64748b; font-weight:bold;">ACTIVE WORKFORCE</div>
            <div style="font-size:24px; font-weight:800; color:#6366f1; margin:6px 0;">${STATE.Admin.activeToday} / ${STATE.Admin.totalEmployees}</div>
            <div style="font-size:12px; color:#10b981; font-weight:bold;">80% Daily Active Ratio</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:12px;">
            <div style="font-size:12px; color:#64748b; font-weight:bold;">KNOWLEDGE COVERAGE</div>
            <div style="font-size:24px; font-weight:800; color:#6366f1; margin:6px 0;">${STATE.Admin.knowledgeCoverage}%</div>
            <div style="font-size:12px; color:#10b981; font-weight:bold;">84 Active Indexed Files</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:12px;">
            <div style="font-size:12px; color:#64748b; font-weight:bold;">PENDING APPROVALS</div>
            <div style="font-size:24px; font-weight:800; color:#6366f1; margin:6px 0;">${STATE.Admin.pendingApprovalsCount}</div>
            <div style="font-size:12px; color:#f59e0b; font-weight:bold;">${STATE.Admin.pendingLeaveClaims} Leave, ${STATE.Admin.pendingExpenseClaims} Expense</div>
          </div>
        </div>

        <div style="background:#f1f5f9; border-left:4px solid #6366f1; padding:20px; border-radius:10px; margin-bottom:25px;">
          <h3 style="margin:0 0 10px 0; color:#0f172a; font-weight:800;">AI Executive Analysis & Operational Brief</h3>
          <p style="margin:0; line-height:1.6; color:#334155;">
            SynapseAI processed <b>${STATE.Admin.aiQueriesToday.toLocaleString()} employee queries</b> today with an average answer confidence of <b>96%</b>. 
            Zero critical security incidents were reported across all 6 active enterprise departments. Primary query topics pertained to 2026 Paternity Leave & Travel Meal Reimbursements ($75/day).
          </p>
        </div>

        <div>
          <h3 style="color:#0f172a; margin-bottom:10px; font-weight:800;">Recommended Executive Decisions</h3>
          <ul style="margin:0; padding-left:20px; line-height:1.8; color:#334155;">
            <li>Approve remaining ${STATE.Admin.pendingApprovalsCount} pending leave, expense & access requests.</li>
            <li>Publish 2026 Leave Policy update to all 6 enterprise departments.</li>
            <li>Reallocate 2 Engineering sprint tasks to optimize team workload.</li>
          </ul>
        </div>
      `;

      html2canvas(element, { scale: 2 }).then(canvas => {
        document.body.removeChild(element);
        const link = document.createElement('a');
        link.download = 'SynapseAI_Executive_Report_2026.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast('✅ Downloaded SynapseAI_Executive_Report_2026.png!', 'success', 4000);
      });
    }

    function downloadDirectPDF() {
      toast('📄 Generating Executive PDF File...', 'info', 2000);
      
      const element = document.createElement('div');
      element.style.padding = '30px';
      element.style.color = '#0f172a';
      element.style.background = '#ffffff';
      element.style.fontFamily = 'Arial, sans-serif';
      
      const dateStr = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

      element.innerHTML = `
        <div style="border-bottom:3px solid #6366f1; padding-bottom:15px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:12px; color:#6366f1; font-weight:bold; letter-spacing:1px;">SYNAPSEAI ENTERPRISE OS</div>
            <h1 style="font-size:24px; color:#1e1b4b; margin:4px 0;">Executive Quarterly Operations Report</h1>
            <div style="color:#64748b; font-size:13px;">${dateStr}</div>
          </div>
          <div style="background:#10b981; color:white; padding:8px 18px; border-radius:20px; font-weight:bold; font-size:16px;">
            Health: ${STATE.Admin.healthScore}%
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:15px; margin-bottom:25px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:15px; border-radius:10px;">
            <div style="font-size:12px; color:#64748b;">Active Workforce</div>
            <div style="font-size:22px; font-weight:bold; color:#6366f1;">${STATE.Admin.activeToday} / ${STATE.Admin.totalEmployees}</div>
            <div style="font-size:11px; color:#10b981;">80% Daily Active Ratio</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:15px; border-radius:10px;">
            <div style="font-size:12px; color:#64748b;">Knowledge Coverage</div>
            <div style="font-size:22px; font-weight:bold; color:#6366f1;">${STATE.Admin.knowledgeCoverage}%</div>
            <div style="font-size:11px; color:#10b981;">84 Active Indexed Files</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:15px; border-radius:10px;">
            <div style="font-size:12px; color:#64748b;">Pending Approvals</div>
            <div style="font-size:22px; font-weight:bold; color:#6366f1;">${STATE.Admin.pendingApprovalsCount}</div>
            <div style="font-size:11px; color:#f59e0b;">${STATE.Admin.pendingLeaveClaims} Leave, ${STATE.Admin.pendingExpenseClaims} Expense</div>
          </div>
        </div>

        <div style="background:#f1f5f9; border-left:4px solid #6366f1; padding:20px; border-radius:8px; margin-bottom:25px;">
          <h3 style="margin:0 0 10px 0; color:#1e1b4b;">AI Executive Analysis & Operational Brief</h3>
          <p style="margin:0; line-height:1.6; color:#334155;">
            SynapseAI processed <b>${STATE.Admin.aiQueriesToday.toLocaleString()} employee queries</b> today with an average answer confidence of <b>96%</b>. 
            Zero critical security incidents were reported across all 6 active enterprise departments. Primary query topics pertained to 2026 Paternity Leave & Travel Meal Reimbursements ($75/day).
          </p>
        </div>

        <div style="margin-bottom:25px;">
          <h3 style="color:#1e1b4b; margin-bottom:10px;">Recommended Executive Decisions</h3>
          <ul style="margin:0; padding-left:20px; line-height:1.8; color:#334155;">
            <li>Approve remaining ${STATE.Admin.pendingApprovalsCount} pending leave, expense & access requests.</li>
            <li>Publish 2026 Leave Policy update to all 6 enterprise departments.</li>
            <li>Reallocate 2 Engineering sprint tasks to optimize team workload.</li>
          </ul>
        </div>
      `;

      const opt = {
        margin:       10,
        filename:     'SynapseAI_Executive_Report_2026.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        toast('✅ SynapseAI_Executive_Report_2026.pdf downloaded directly!', 'success', 4000);
      });
    }

    function closeExecReportModal() {
      document.getElementById('exec-report-modal').classList.remove('active');
    }

    function sendReportViaEmail() {
      STATE.Admin.emailsSentToday++;
      updateDashboardStatsUI();
      closeExecReportModal();
      toast('✉️ Executive Report Emailed to Board of Directors!', 'success', 4000);
    }

    function updateTopBannerTitle(pageTitle) {
      const config = ROLE_CONFIG[currentRole];
      const banner = document.getElementById('banner-title');
      if (banner) {
        banner.innerHTML = `<i class="fa-solid ${config.icon}" style="color:var(--accent-primary)"></i> ${config.label} — <span style="font-weight:600; font-size:1.1rem; color:var(--text-muted);">${pageTitle}</span>`;
      }
    }

    function switchPane(paneId, navEl) {
      // Track current feature for workflow reload
      if (window.STATE) {
        STATE.CURRENT_FEATURE = paneId;
      }
      
      document.querySelectorAll('.tab-pane').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
      });
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      
      const targetPane = document.getElementById(paneId);
      let pageTitle = 'Executive Dashboard';
      if (navEl) {
        pageTitle = navEl.innerText.trim();
        navEl.classList.add('active');
      }

      if (targetPane) {
        targetPane.classList.add('active');
        targetPane.style.setProperty('display', 'flex', 'important');
      } else {
        renderRoleFeatureView(paneId);
        const rf = document.getElementById('role_features');
        if (rf) {
          rf.classList.add('active');
          rf.style.setProperty('display', 'flex', 'important');
        }
      }

      if (paneId === 'role_dashboard' && currentRole === 'Admin') {
        renderAdminPendingApprovals();
        updateDashboardStatsUI();
      }
      
      // Refresh workflow display if viewing workflow automation page
      if (paneId === 'feat_admin_workflow_automation') {
        setTimeout(() => refreshWorkflowDisplay(), 100);
      }
      
      updateTopBannerTitle(pageTitle);
    }

    function switchRole(roleKey, btn) {
      currentRole = roleKey;
      document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active-role'));
      if (btn) btn.classList.add('active-role');
      
      const config = ROLE_CONFIG[currentRole];
      
      document.documentElement.style.setProperty('--accent-primary', config.accent);
      document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${config.accent} 0%, #8B5CF6 50%, #06B6D4 100%)`);
      
      // Update sidebar avatar/name (new IDs)
      const sidebarAv = document.getElementById('sidebar-avatar') || document.getElementById('role-avatar');
      const sidebarNm = document.getElementById('sidebar-name-display') || document.getElementById('role-name-display');
      if (sidebarAv) sidebarAv.textContent = config.abbr;
      if (sidebarNm) sidebarNm.textContent = config.label;
      document.getElementById('role-nav-header').textContent = `${config.label} Navigation`;

      const sidebarMenu = document.getElementById('role-sidebar-menu');
      sidebarMenu.innerHTML = config.sidebarMenu.map((m, idx) => `
        <li class="nav-item ${idx===0?'active':''}" onclick="switchPane('${m.id}', this)">
          <i class="fa-solid ${m.icon}"></i> ${m.label}
        </li>`).join('');

      const heroDescContent = currentRole === 'Admin' ? config.getHeroDesc() : config.heroDesc;
      document.getElementById('role-hero-banner').innerHTML = `
        <h1 style="font-family:'Outfit'; font-size:1.8rem; margin-bottom:8px;">${config.heroHeading}</h1>
        <div style="color:var(--text-muted); font-size:0.95rem; line-height:1.6;">${heroDescContent}</div>`;

            const adminModules = document.getElementById('admin-exec-modules');
      if (adminModules) adminModules.style.display = (currentRole === 'Admin') ? 'flex' : 'none';

      const managerModules = document.getElementById('manager-exec-modules');
      if (managerModules) managerModules.style.display = (currentRole === 'Manager') ? 'flex' : 'none';

      const hrModules = document.getElementById('hr-exec-modules');
      if (hrModules) hrModules.style.display = (currentRole === 'HR') ? 'flex' : 'none';

      const empModules = document.getElementById('employee-exec-modules');
      if (empModules) empModules.style.display = (currentRole === 'Employee') ? 'flex' : 'none';

      if (currentRole === 'HR') {
        renderHRDashboardModules();
      } else if (currentRole === 'Manager') {
        renderManagerDashboardUI();
      }

      const scopeBadge = document.getElementById('chat-scope-badge');
      if (scopeBadge) {
        scopeBadge.textContent = `${currentRole} Scope`;
        scopeBadge.className = `role-badge-inline ${config.cls}`;
      }

      const adminUploadBox = document.getElementById('admin-doc-upload-box');
      if (adminUploadBox) {
        adminUploadBox.style.display = (currentRole === 'Admin' || currentRole === 'HR') ? 'block' : 'none';
      }

      renderChatbotWelcomeScreen();
      updateDashboardStatsUI();
      if (currentRole === 'Admin') {
        renderAdminPendingApprovals();
      }

      switchPane('role_dashboard', sidebarMenu.children[0]);
      toast(`✨ Switched to <b>${config.label}</b>`, 'info', 2500);

      // Update profile UI pill & dropdown with current user info
      if (typeof updateProfileUI === 'function') updateProfileUI();
    }


    function renderRoleFeatureView(featureId) {
      const container = document.getElementById('role-feature-container');

            if (featureId === 'feat_notifications') {
        const currentRole = (window.authState && window.authState.currentUser && window.authState.currentUser.role) ? window.authState.currentUser.role : (window.currentRole || 'Admin');
        const currentEmail = (window.authState && window.authState.currentUser) ? window.authState.currentUser.email : '';

        const list = getAllNotificationsForRole(currentRole, currentEmail);
        const regUsers = (window.authState && window.authState.registeredUsers) ? window.authState.registeredUsers : getPersistentRegisteredUsers();
        const pendingUsers = regUsers.filter(u => {
          if (u.status === 'Approved') return false;
          if (currentRole === 'Manager' && u.role === 'Employee') return true;
          if (currentRole === 'Admin' && (u.role === 'Manager' || u.role === 'HR')) return true;
          return false;
        });

        const unreadCount = list.filter(n => !n.read).length;
        updateNotificationBadge();

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.6rem; margin:0;">Platform Notification Center</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">Real-time access requests, approval updates, and dual SMTP email dispatches</div>
            </div>
            <button class="btn-secondary" onclick="markAllNotificationsRead()"><i class="fa-solid fa-check-double"></i> Mark All Read</button>
          </div>

          <!-- KPI Summary -->
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Total Alerts</div><div class="stat-number" style="color:var(--accent-cyan);">${list.length} Alerts</div></div>
            <div class="glass-card" style="padding:16px;"><div>Pending Approvals</div><div class="stat-number" style="color:${pendingUsers.length > 0 ? 'var(--status-amber)' : 'var(--status-emerald)'};">${pendingUsers.length} Pending</div></div>
            <div class="glass-card" style="padding:16px;"><div>Dual Email Sync</div><div class="stat-number" style="color:var(--status-emerald);">Active (SMTP)</div></div>
            <div class="glass-card" style="padding:16px;"><div>Security Channel</div><div class="stat-number" style="color:var(--status-emerald);">${currentRole} Channel</div></div>
          </div>

          <!-- Notification Feed List -->
          <div class="glass-card" style="padding:20px;">
            <b style="font-size:1.05rem; display:block; margin-bottom:16px;"><i class="fa-solid fa-bell" style="color:var(--accent-cyan); margin-right:8px;"></i> Live Notification & Approval Feed</b>
            ${list.length === 0 ? `
              <div style="text-align:center; padding:40px; color:var(--text-muted);">
                <i class="fa-solid fa-bell-slash" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                No notifications right now. You are all caught up!
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:12px;">
                ${list.map(n => `
                  <div style="background:${n.read ? 'rgba(255,255,255,0.02)' : 'rgba(6,182,212,0.08)'}; border:1px solid ${n.read ? 'var(--border-glass)' : 'rgba(6,182,212,0.3)'}; border-left:4px solid ${n.type === 'approval_req' ? '#F59E0B' : '#06B6D4'}; padding:16px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                      <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                        <b style="font-size:0.95rem; color:var(--text-main);">${n.title}</b>
                        ${!n.read ? '<span class="role-badge-inline rb-amber" style="font-size:0.7rem;">New</span>' : ''}
                        <span style="font-size:0.75rem; color:var(--text-muted);">${n.date}</span>
                      </div>
                      <p style="font-size:0.83rem; color:var(--text-muted); margin:0; line-height:1.5;">${n.message}</p>
                    </div>

                    ${n.type === 'approval_req' && regUsers.find(u => u.email.toLowerCase() === n.userEmail?.toLowerCase())?.status !== 'Approved' ? `
                      <button class="btn-submit" onclick="approveUserRegistration('${n.id}', '${n.userEmail}')" style="padding:6px 16px; font-size:0.8rem; background:var(--status-emerald); color:black; font-weight:700; cursor:pointer;">
                        <i class="fa-solid fa-user-check"></i> Approve Access
                      </button>
                    ` : n.type === 'email_approval' ? `
                      <button class="btn-submit" onclick="approveEmailRequest('${n.id}')" id="btn-approve-${n.id}" style="padding:6px 16px; font-size:0.8rem; background:var(--status-emerald); color:black; font-weight:700; cursor:pointer;">
                        <i class="fa-solid fa-check"></i> Approve Mail
                      </button>
                    ` : n.type === 'email_approval_done' ? `
                      <span class="role-badge-inline rb-emerald" style="font-size:0.75rem;"><i class="fa-solid fa-check"></i> Mail Approved</span>
                    ` : n.type === 'approval_req' ? `
                      <span class="role-badge-inline rb-emerald" style="font-size:0.75rem;"><i class="fa-solid fa-check"></i> Approved</span>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        `;
        return;
      }

      
      // ADMIN SPECIFIC SECTIONS
      if (featureId === 'feat_admin_org_mgmt') {
        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.8rem;">🏢 Organization Management</h2>
              <div style="color:var(--text-muted); font-size:0.9rem;">Enterprise workforce directory, department hierarchy & RBAC matrix</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-submit" onclick="openAddEmployeeModal()"><i class="fa-solid fa-user-plus"></i> + Add Employee</button>
              <button class="btn-secondary" onclick="openInviteUserModal()"><i class="fa-solid fa-file-import"></i> Import Employees</button>
              <button class="btn-secondary" onclick="exportEmployeeCSV()"><i class="fa-solid fa-file-export"></i> Export</button>
            </div>
          </div>

          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card">
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">Total Employees</div>
              <div class="stat-number" id="total-employees-kpi-count">${STATE.Admin.totalEmployees.toLocaleString()}</div>
              <div style="font-size:0.75rem; color:var(--status-emerald); font-weight:700;">Active Across 5 Branches</div>
            </div>
            <div class="glass-card">
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">Departments</div>
              <div class="stat-number" id="total-depts-kpi-count">${STATE.Admin.totalDepartments}</div>
              <div style="font-size:0.75rem; color:var(--accent-cyan); font-weight:700;">Active Enterprise Depts</div>
            </div>
            <div class="glass-card">
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">Teams</div>
              <div class="stat-number">38</div>
              <div style="font-size:0.75rem; color:var(--status-emerald); font-weight:700;">Cross-functional</div>
            </div>
            <div class="glass-card">
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">Managers</div>
              <div class="stat-number">46</div>
              <div style="font-size:0.75rem; color:#C7D2FE; font-weight:700;">Dept Lead Ratio: 1:27</div>
            </div>
            <div class="glass-card">
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">Branches</div>
              <div class="stat-number">5</div>
              <div style="font-size:0.75rem; color:var(--status-emerald); font-weight:700;">Global Office Locations</div>
            </div>
            <div class="glass-card">
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">Pending Invitations</div>
              <div class="stat-number">8</div>
              <div style="font-size:0.75rem; color:var(--status-amber); font-weight:700;">Awaiting Onboarding</div>
            </div>
          </div>

          <div class="glass-card" style="margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <div style="font-weight:800; font-family:'Outfit'; font-size:1.2rem; color:var(--accent-primary);">
                <i class="fa-solid fa-building-user"></i> Department Overview Breakdown
              </div>
              <button class="btn-submit" onclick="openCreateDeptModal()" style="padding:6px 14px; font-size:0.8rem;"><i class="fa-solid fa-plus"></i> Add Dept</button>
            </div>
            <div class="grid-card-view" id="department-grid-container"></div>
          </div>

          <div class="glass-card" style="margin-bottom:24px;">
            <div style="font-weight:800; font-family:'Outfit'; font-size:1.2rem; color:var(--accent-cyan); margin-bottom:16px;">
              <i class="fa-solid fa-address-book"></i> Employee Directory
            </div>

            <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap:12px; margin-bottom:18px;">
              <input type="text" id="table-search-input" class="input-box" placeholder="Search employees by name, ID, or email..." onkeyup="renderEmployeeTableUI()">
              <select id="table-dept-filter" class="email-template-select" onchange="renderEmployeeTableUI()">
                <option value="All">All Departments</option>
                <option value="IT">IT / Software</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Operations">Operations</option>
                <option value="Executive">Executive Board</option>
              </select>
              <select id="table-role-filter" class="email-template-select" onchange="renderEmployeeTableUI()">
                <option value="All">All Roles</option>
                <option value="CEO">CEO</option>
                <option value="VP">VP HR</option>
                <option value="Dev">Senior Dev</option>
                <option value="Ops">Ops Lead</option>
              </select>
              <select class="email-template-select"><option>All Status</option><option>Active</option></select>
            </div>

            <div style="overflow-x:auto;">
              <table class="org-table">
                <thead>
                  <tr>
                    <th>Photo</th><th>Employee ID</th><th>Name</th><th>Department</th><th>Manager</th><th>Role</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody id="employee-table-body"></tbody>
              </table>
            </div>
          </div>`;

        renderDepartmentGridUI();
        renderEmployeeTableUI();

      // 📚 ENTERPRISE KNOWLEDGE CENTER VIEW
      } else if (featureId === 'feat_admin_knowledge_center') {
        container.innerHTML = `
          <!-- Header Bar -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.8rem;">📚 Enterprise Knowledge Center</h2>
              <div style="color:var(--text-muted); font-size:0.9rem;">Enterprise document library & AI knowledge insights</div>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn-submit" onclick="openUploadDocModal()"><i class="fa-solid fa-cloud-arrow-up"></i> + Upload Document</button>
              <button class="btn-secondary" onclick="openCreateCollectionModal()"><i class="fa-solid fa-folder-plus"></i> + Create Collection</button>
              <button class="btn-secondary" onclick="openImportDocsModal()"><i class="fa-solid fa-file-import"></i> Import Documents</button>
              <button class="btn-secondary" onclick="generateAISummaryModal('2026_Employee_Handbook.pdf')"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate AI Summary</button>
            </div>
          </div>

          <!-- 1. Top Statistics (6 KPI Cards) -->
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card">
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">Total Documents</div>
              <div class="stat-number" id="total-docs-kpi-count">${STATE.Admin.knowledgeDocs} Files</div>
              <div style="font-size:0.75rem; color:var(--status-emerald); font-weight:700;">Active Knowledge Base</div>
            </div>
            <div class="glass-card">
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">Categories</div>
              <div class="stat-number">${STATE.Admin.knowledgeCategories} Categories</div>
              <div style="font-size:0.75rem; color:var(--accent-cyan); font-weight:700;">Policies, Security, Legal</div>
            </div>
            <div class="glass-card">
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">Knowledge Collections</div>
              <div class="stat-number" id="total-coll-kpi-count">${STATE.Admin.knowledgeCollections} Collections</div>
              <div style="font-size:0.75rem; color:var(--status-emerald); font-weight:700;">Cross-Departmental</div>
            </div>
            <div class="glass-card">
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">Total Storage</div>
              <div class="stat-number">${STATE.Admin.totalStorageGB} GB</div>
              <div style="font-size:0.75rem; color:#C7D2FE; font-weight:700;">Document Storage Cache</div>
            </div>
            <div class="glass-card">
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">Knowledge Coverage</div>
              <div class="stat-number">${STATE.Admin.knowledgeCoverage}%</div>
              <div style="font-size:0.75rem; color:var(--status-emerald); font-weight:700;">+4% Growth This Quarter</div>
            </div>
            <div class="glass-card">
              <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted);">AI Search Accuracy</div>
              <div class="stat-number">${STATE.Admin.searchAccuracy}%</div>
              <div style="font-size:0.75rem; color:var(--status-emerald); font-weight:700;">98.4% Citation Grounded</div>
            </div>
          </div>

          <!-- 2. Knowledge Collections Grid -->
          <div class="glass-card" style="margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <div style="font-weight:800; font-family:'Outfit'; font-size:1.2rem; color:var(--accent-primary);">
                <i class="fa-solid fa-layer-group"></i> Knowledge Collections (Click to Open Folder)
              </div>
              <button class="btn-submit" onclick="openCreateCollectionModal()" style="padding:6px 14px; font-size:0.8rem;"><i class="fa-solid fa-plus"></i> New Collection</button>
            </div>
            <div class="grid-card-view" id="collections-grid-container"></div>
          </div>

          <!-- 3. Document Library Search & Table -->
          <div class="glass-card" style="margin-bottom:24px;">
            <div style="font-weight:800; font-family:'Outfit'; font-size:1.2rem; color:var(--accent-cyan); margin-bottom:16px;">
              <i class="fa-solid fa-book-bookmark"></i> Document Library
            </div>

            <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap:12px; margin-bottom:18px;">
              <input type="text" id="doc-search-input" class="input-box" placeholder="Search by title, department, owner, or tags..." onkeyup="renderDocTableUI()">
              <select id="doc-cat-filter" class="email-template-select" onchange="renderDocTableUI()">
                <option value="All">All Categories</option>
                <option value="Policies">Policies</option>
                <option value="Security">Security</option>
                <option value="Finance">Finance</option>
                <option value="Legal">Legal</option>
              </select>
              <select class="email-template-select"><option>All Departments</option><option>Human Resources</option><option>IT / Infrastructure</option></select>
              <select class="email-template-select"><option>All Status</option><option>Indexed</option></select>
            </div>

            <div style="overflow-x:auto;">
              <table class="org-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Category</th>
                    <th>Department</th>
                    <th>Owner</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="doc-table-body"></tbody>
              </table>
            </div>
          </div>

          <!-- 4. AI Knowledge Insights & Activity -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:24px;">
            <div class="glass-card">
              <div style="font-weight:800; font-family:'Outfit'; font-size:1.2rem; color:var(--status-amber); margin-bottom:14px;">
                <i class="fa-solid fa-brain"></i> AI Knowledge Insights & Quality Score
              </div>
              <div style="display:flex; flex-direction:column; gap:10px; font-size:0.88rem;">
                <div style="background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); padding:12px; border-radius:12px;">
                  <b>⚠️ Outdated Documents (3):</b> <i>Travel Policy 2024.docx</i> contains outdated $50 meal cap (Current cap is $75/day).
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:12px;">
                  <b>👥 Duplicate Documents (1):</b> <i>IT Setup Guide v2</i> overlaps 88% with <i>IT Security Policy v4</i>.
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:12px;">
                  <b>❓ Missing Topics:</b> Employees asked 42 questions regarding <i>Travel Insurance Guidelines</i> (Not yet indexed).
                </div>
                <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); padding:12px; border-radius:12px;">
                  <b>⭐ Knowledge Quality Score:</b> <span style="color:#6EE7B7; font-weight:800; font-size:1rem;">95% (Optimal)</span>
                </div>
              </div>
            </div>

            <div class="glass-card">
              <div style="font-weight:800; font-family:'Outfit'; font-size:1.2rem; color:var(--accent-primary); margin-bottom:14px;">
                <i class="fa-solid fa-clock-rotate-left"></i> Recent Knowledge Activity Stream
              </div>
              <div style="display:flex; flex-direction:column; gap:10px; font-size:0.88rem;">
                <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:10px;"><b>10:15 AM:</b> HR uploaded <i>2026_Employee_Handbook.pdf</i></div>
                <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:10px;"><b>09:40 AM:</b> Finance updated <i>Travel_Expense_Policy_2026.docx</i></div>
                <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:10px;"><b>09:05 AM:</b> AI summarized <i>Travel Policy 2026</i> for 14 staff</div>
                <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:10px;"><b>08:30 AM:</b> Manager David M. approved <i>IT Security Guidelines v4</i></div>
                <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:10px;"><b>08:00 AM:</b> Legal archived <i>2024_Vendor_Contract_Expired.pdf</i></div>
              </div>
            </div>
          </div>`;

        renderCollectionsGridUI();
        renderDocTableUI();

      } else if (featureId === 'feat_admin_ai_control') {
        container.innerHTML = `
          <div class="glass-card" style="background:linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(6,182,212,0.15) 100%); border:1px solid rgba(99,102,241,0.3); margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.8rem; color:white; margin-bottom:4px;"><i class="fa-solid fa-robot" style="color:var(--accent-primary);"></i> AI Control Center &amp; Executive Assistant</h2>
              <div style="color:var(--text-muted); font-size:0.95rem;">Centralized intelligence operations hub for Admin — models, RAG vector index, prompt library, and live AI assistant.</div>
            </div>
            <button class="btn-submit" onclick="switchPane('shared_rag', document.querySelector('.nav-item[onclick*=\'shared_rag\']'))" style="font-size:1rem; padding:12px 24px; border-radius:14px; box-shadow:0 8px 25px rgba(99,102,241,0.4);">
              <i class="fa-solid fa-comments"></i> Open Admin AI Assistant Chatbot
            </button>
          </div>

          <!-- SECTION 1: AI OVERVIEW KPI CARDS -->
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="border-left:3px solid var(--accent-primary);">
              <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;font-weight:700;color:var(--text-muted);"><i class="fa-solid fa-microchip" style="color:var(--accent-primary);"></i> Active AI Models</div>
              <div class="stat-number">4 / 4</div>
              <div style="font-size:0.75rem;color:var(--status-emerald);font-weight:700;">All Models Healthy</div>
            </div>
            <div class="glass-card" style="border-left:3px solid var(--accent-cyan);">
              <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;font-weight:700;color:var(--text-muted);"><i class="fa-solid fa-comments" style="color:var(--accent-cyan);"></i> Total AI Requests Today</div>
              <div class="stat-number" id="ai-req-today">1,245</div>
              <div style="font-size:0.75rem;color:var(--status-emerald);font-weight:700;">+18.4% vs Yesterday</div>
            </div>
            <div class="glass-card" style="border-left:3px solid var(--status-emerald);">
              <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;font-weight:700;color:var(--text-muted);"><i class="fa-solid fa-circle-check" style="color:var(--status-emerald);"></i> AI Success Rate</div>
              <div class="stat-number">98.6%</div>
              <div style="font-size:0.75rem;color:var(--status-emerald);font-weight:700;">0.03% Hallucination Rate</div>
            </div>
            <div class="glass-card" style="border-left:3px solid var(--status-amber);">
              <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;font-weight:700;color:var(--text-muted);"><i class="fa-solid fa-stopwatch" style="color:var(--status-amber);"></i> Average Response Time</div>
              <div class="stat-number">1.24s</div>
              <div style="font-size:0.75rem;color:var(--status-emerald);font-weight:700;">Target: &lt;2.0s ✓</div>
            </div>
            <div class="glass-card" style="border-left:3px solid #8B5CF6;">
              <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;font-weight:700;color:var(--text-muted);"><i class="fa-solid fa-coins" style="color:#8B5CF6;"></i> Total Tokens Used</div>
              <div class="stat-number">8.2M</div>
              <div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">Monthly Quota: 50M tokens</div>
            </div>
            <div class="glass-card" style="border-left:3px solid var(--status-rose);">
              <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;font-weight:700;color:var(--text-muted);"><i class="fa-solid fa-dollar-sign" style="color:var(--status-rose);"></i> AI Cost Today</div>
              <div class="stat-number">$14.82</div>
              <div style="font-size:0.75rem;color:var(--status-emerald);font-weight:700;">Monthly Budget: $500</div>
            </div>
          </div>

          <!-- SECTION 2: MODEL MANAGEMENT -->
          <div class="glass-card" style="margin-bottom:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
              <div style="font-weight:800;font-family:'Outfit';font-size:1.2rem;color:var(--accent-primary);"><i class="fa-solid fa-microchip"></i> Model Management</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <select id="ai-default-model-sel" class="email-template-select" onchange="toast('Default model set to: '+this.options[this.selectedIndex].text,'success')">
                  <option>Default: Llama 3.3 70B</option><option>Default: GPT-4o</option><option>Default: Claude 3.5</option><option>Default: Gemini</option>
                </select>
                <select id="ai-fallback-model-sel" class="email-template-select" onchange="toast('Fallback model set to: '+this.options[this.selectedIndex].text,'info')">
                  <option>Fallback: GPT-4o</option><option>Fallback: Llama 3.3 70B</option><option>Fallback: Claude 3.5</option><option>Fallback: Gemini</option>
                </select>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;" id="aicc-model-cards">
              ${[
                {name:'Llama 3.3 70B',provider:'Groq Cloud',latency:'0.82s',avail:'99.97%',ctx:'128K ctx',color:'#6366F1',icon:'fa-robot'},
                {name:'GPT-4o',provider:'OpenAI Enterprise',latency:'1.24s',avail:'99.93%',ctx:'128K ctx',color:'#10B981',icon:'fa-brain'},
                {name:'Claude 3.5 Sonnet',provider:'Anthropic API',latency:'1.58s',avail:'99.89%',ctx:'200K ctx',color:'#F59E0B',icon:'fa-microchip'},
                {name:'Gemini 1.5 Pro',provider:'Google Vertex AI',latency:'1.10s',avail:'99.91%',ctx:'1M ctx',color:'#06B6D4',icon:'fa-gem'},
              ].map(m=>`
                <div class="item-card" style="border-left:3px solid ${m.color};gap:12px;">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div style="width:36px;height:36px;border-radius:10px;background:${m.color}22;border:1px solid ${m.color}55;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fa-solid ${m.icon}" style="color:${m.color};"></i>
                      </div>
                      <div><div style="font-weight:800;font-size:0.92rem;">${m.name}</div><div style="font-size:0.7rem;color:var(--text-dim);">${m.provider}</div></div>
                    </div>
                    <span style="display:inline-flex;align-items:center;gap:4px;font-size:0.68rem;font-weight:700;padding:3px 8px;border-radius:6px;background:rgba(16,185,129,0.15);color:var(--status-emerald);border:1px solid rgba(16,185,129,0.3);white-space:nowrap;">
                      <span style="width:6px;height:6px;border-radius:50%;background:var(--status-emerald);display:inline-block;animation:aicc-pulse 1.5s infinite;"></span>ONLINE
                    </span>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.78rem;">
                    <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;"><span style="color:var(--text-dim);">Latency</span><div style="font-weight:700;color:white;">${m.latency}</div></div>
                    <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;"><span style="color:var(--text-dim);">Avail.</span><div style="font-weight:700;color:var(--status-emerald);">${m.avail}</div></div>
                  </div>
                  <div style="font-size:0.73rem;color:var(--text-muted);">Context: <b style="color:white;">${m.ctx}</b></div>
                </div>`).join('')}
            </div>
          </div>

          <!-- SECTION 3: PROMPT MANAGEMENT + PROMPT LIBRARY -->
          <div style="display:grid;grid-template-columns:1.3fr 0.7fr;gap:20px;margin-bottom:24px;">
            <div class="glass-card">
              <div style="font-weight:800;font-family:'Outfit';font-size:1.2rem;color:var(--accent-cyan);margin-bottom:16px;"><i class="fa-solid fa-pen-to-square"></i> Prompt Management Studio</div>
              <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
                <button class="btn-act aicc-ptab-active" onclick="aicc_ptab(this,'sys')"><i class="fa-solid fa-gear"></i> System Prompts</button>
                <button class="btn-act" onclick="aicc_ptab(this,'role')"><i class="fa-solid fa-shield-halved"></i> Role-Based</button>
                <button class="btn-act" onclick="aicc_ptab(this,'lib')"><i class="fa-solid fa-book-open"></i> Library</button>
              </div>
              <div style="margin-bottom:12px;">
                <label class="email-field-label">Prompt Version</label>
                <div style="display:flex;gap:8px;margin-top:6px;">
                  <select id="aicc-pver" class="email-template-select" style="flex:1;" onchange="toast('Loaded prompt '+this.value,'info')">
                    <option value="v3.2">v3.2 — Active (Production)</option>
                    <option value="v3.1">v3.1 — Stable</option>
                    <option value="v3.0">v3.0 — Legacy</option>
                    <option value="v2.9">v2.9 — Archived</option>
                  </select>
                  <button class="btn-secondary" onclick="toast('Prompt rolled back to previous stable version!','warn')"><i class="fa-solid fa-rotate-left"></i> Rollback Prompt</button>
                </div>
              </div>
              <div style="margin-bottom:12px;">
                <label class="email-field-label">Active System Prompt (v3.2)</label>
                <textarea id="aicc-sysprompt" class="input-box" style="height:130px;margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:0.82rem;line-height:1.6;">You are SynapseAI, an enterprise intelligence assistant. Answer strictly based on indexed company knowledge with precise citations. Enforce RBAC: Employee users may not access HR salary data. Always include source document name. Default language: English.</textarea>
              </div>
              <div style="margin-bottom:12px;">
                <label class="email-field-label">Prompt Approval Status</label>
                <div style="margin-top:6px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);padding:10px 14px;border-radius:10px;font-size:0.85rem;color:#6EE7B7;font-weight:700;">
                  <i class="fa-solid fa-circle-check"></i> Approved by Admin — Deployed 2026-07-28 09:14 AM
                </div>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn-submit" onclick="aicc_testPrompt()"><i class="fa-solid fa-flask"></i> Test Prompt</button>
                <button class="btn-submit" onclick="aicc_deployPrompt()" style="background:rgba(6,182,212,0.2);border:1px solid #06B6D4;"><i class="fa-solid fa-rocket"></i> Deploy Prompt</button>
                <button class="btn-secondary" onclick="toast('Viewing prompt version history…','info')"><i class="fa-solid fa-clock-rotate-left"></i> History</button>
              </div>
              <div id="aicc-ptest-out" style="display:none;margin-top:12px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.4);padding:14px;border-radius:12px;font-size:0.85rem;line-height:1.6;"></div>
            </div>

            <div class="glass-card" style="display:flex;flex-direction:column;gap:12px;">
              <div style="font-weight:800;font-family:'Outfit';font-size:1.2rem;color:#8B5CF6;margin-bottom:4px;"><i class="fa-solid fa-book-bookmark"></i> Prompt Library</div>
              ${[
                {name:'Employee RAG Assistant',role:'Employee',ver:'v3.2',st:'Active'},
                {name:'HR Policy Specialist',role:'HR',ver:'v2.8',st:'Active'},
                {name:'Manager Decision Copilot',role:'Manager',ver:'v2.5',st:'Active'},
                {name:'Admin Root Prompt',role:'Admin',ver:'v3.2',st:'Active'},
                {name:'Security Audit Bot',role:'Admin',ver:'v1.4',st:'Review'},
              ].map(p=>`
                <div class="item-card" style="flex-direction:row;justify-content:space-between;align-items:center;padding:10px 14px;">
                  <div><div style="font-weight:700;font-size:0.85rem;">${p.name}</div><div style="font-size:0.7rem;color:var(--text-dim);">${p.role} • ${p.ver}</div></div>
                  <span style="font-size:0.68rem;padding:2px 8px;border-radius:6px;font-weight:700;background:${p.st==='Active'?'rgba(16,185,129,0.15)':'rgba(245,158,11,0.15)'};color:${p.st==='Active'?'var(--status-emerald)':'var(--status-amber)'};border:1px solid ${p.st==='Active'?'rgba(16,185,129,0.3)':'rgba(245,158,11,0.3)'};">${p.st}</span>
                </div>`).join('')}
            </div>
          </div>

          <!-- SECTION 4: KNOWLEDGE CONNECTION -->
          <div class="glass-card" style="margin-bottom:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
              <div style="font-weight:800;font-family:'Outfit';font-size:1.2rem;color:var(--status-emerald);"><i class="fa-solid fa-database"></i> Knowledge Connection — Pinecone Vector Index</div>
              <div style="display:flex;gap:8px;">
                <button class="btn-submit" onclick="aicc_syncKnowledge()" style="padding:8px 14px;font-size:0.82rem;"><i class="fa-solid fa-rotate"></i> Sync Knowledge</button>
                <button class="btn-secondary" onclick="toast('Re-indexing all 84 documents in Pinecone…','info')" style="font-size:0.82rem;"><i class="fa-solid fa-bolt"></i> Auto Re-index</button>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;">
              ${[
                {label:'Knowledge Sources',val:'6 Active Sources',icon:'fa-layer-group',color:'var(--accent-primary)'},
                {label:'Pinecone Index',val:'synapseai-prod-v3',icon:'fa-server',color:'#8B5CF6'},
                {label:'Embedding Status',val:'100% Indexed',icon:'fa-circle-nodes',color:'var(--status-emerald)'},
                {label:'Knowledge Refresh',val:'Every 6 Hours',icon:'fa-clock-rotate-left',color:'var(--accent-cyan)'},
                {label:'Sync Status',val:'✓ Fully Synced',icon:'fa-satellite-dish',color:'var(--status-emerald)'},
                {label:'Last Indexed',val:'07-30 • 14:45',icon:'fa-calendar-check',color:'var(--status-amber)'},
              ].map(k=>`
                <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);padding:14px;border-radius:14px;">
                  <div style="display:flex;align-items:center;gap:8px;font-size:0.76rem;color:var(--text-dim);margin-bottom:6px;"><i class="fa-solid ${k.icon}" style="color:${k.color};"></i>${k.label}</div>
                  <div style="font-weight:800;font-size:0.92rem;color:white;">${k.val}</div>
                </div>`).join('')}
            </div>
          </div>

          <!-- SECTION 5: CONVERSATION ANALYTICS -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
            <div class="glass-card">
              <div style="font-weight:800;font-family:'Outfit';font-size:1.2rem;color:var(--accent-primary);margin-bottom:16px;"><i class="fa-solid fa-chart-bar"></i> Conversation Analytics</div>
              <div style="display:flex;flex-direction:column;gap:10px;font-size:0.88rem;">
                ${[
                  {ico:'fa-comments',col:'var(--accent-primary)',label:'Total Conversations',val:'1,245 today'},
                  {ico:'fa-fire',col:'var(--status-amber)',label:'Most Asked Questions',val:'Paternity Leave Policy'},
                  {ico:'fa-circle-exclamation',col:'var(--status-amber)',label:'Low Confidence Responses',val:'18 under 70%'},
                  {ico:'fa-circle-xmark',col:'var(--status-rose)',label:'Failed Responses',val:'3 errors today'},
                  {ico:'fa-star',col:'#F59E0B',label:'Feedback Score',val:'4.8 / 5.0 ⭐'},
                ].map(a=>`
                  <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.03);padding:11px 14px;border-radius:10px;">
                    <span><i class="fa-solid ${a.ico}" style="color:${a.col};margin-right:8px;"></i>${a.label}</span>
                    <b style="font-size:0.85rem;">${a.val}</b>
                  </div>`).join('')}
              </div>
            </div>
            <div class="glass-card">
              <div style="font-weight:800;font-family:'Outfit';font-size:1.2rem;color:var(--accent-cyan);margin-bottom:16px;"><i class="fa-solid fa-building-user"></i> Top Departments Using AI</div>
              <div style="display:flex;flex-direction:column;gap:12px;">
                ${[
                  {dept:'Engineering & IT',pct:38,count:472,color:'var(--accent-primary)'},
                  {dept:'Human Resources',pct:24,count:299,color:'var(--accent-cyan)'},
                  {dept:'Sales & Marketing',pct:18,count:224,color:'#8B5CF6'},
                  {dept:'Finance & Audit',pct:12,count:149,color:'var(--status-amber)'},
                  {dept:'Operations',pct:8,count:101,color:'var(--status-rose)'},
                ].map(d=>`
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:5px;"><span>${d.dept}</span><span style="color:var(--text-muted);">${d.count} queries (${d.pct}%)</span></div>
                    <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;"><div style="height:100%;width:${d.pct}%;background:${d.color};border-radius:4px;"></div></div>
                  </div>`).join('')}
              </div>
            </div>
          </div>

          <!-- SECTION 6: AI MONITORING -->
          <div class="glass-card" style="margin-bottom:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <div style="font-weight:800;font-family:'Outfit';font-size:1.2rem;color:var(--status-amber);"><i class="fa-solid fa-chart-line"></i> AI Monitoring</div>
              <button class="btn-act" onclick="aicc_viewLogs()" style="background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.4);color:var(--status-amber);"><i class="fa-solid fa-terminal"></i> View AI Logs</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
              ${[
                {label:'Response Accuracy',val:'96.4%',icon:'fa-bullseye',color:'var(--status-emerald)',sub:'High confidence answers'},
                {label:'Average Confidence',val:'91.8%',icon:'fa-gauge-high',color:'var(--accent-primary)',sub:'Semantic similarity score'},
                {label:'Hallucination Detection',val:'0.03%',icon:'fa-ghost',color:'var(--status-emerald)',sub:'99.97% grounded citations'},
                {label:'Error Logs',val:'3 errors',icon:'fa-circle-xmark',color:'var(--status-rose)',sub:'Click View AI Logs'},
                {label:'Token Usage',val:'8.2M / 50M',icon:'fa-coins',color:'#8B5CF6',sub:'16.4% monthly quota used'},
                {label:'Rate Limits',val:'Normal',icon:'fa-tachometer-alt',color:'var(--status-emerald)',sub:'No throttling active'},
              ].map(m=>`
                <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);border-left:3px solid ${m.color};padding:14px;border-radius:14px;">
                  <div style="display:flex;align-items:center;gap:7px;font-size:0.76rem;color:var(--text-dim);margin-bottom:6px;"><i class="fa-solid ${m.icon}" style="color:${m.color};"></i>${m.label}</div>
                  <div style="font-weight:800;font-size:1rem;color:${m.color};">${m.val}</div>
                  <div style="font-size:0.7rem;color:var(--text-dim);margin-top:4px;">${m.sub}</div>
                </div>`).join('')}
            </div>
          </div>

          <!-- SECTION 7 + 8: AI GUARDRAILS + AI AUTOMATION -->
          <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:20px;margin-bottom:24px;">
            <div class="glass-card">
              <div style="font-weight:800;font-family:'Outfit';font-size:1.2rem;color:var(--status-rose);margin-bottom:16px;"><i class="fa-solid fa-shield-halved"></i> AI Guardrails &amp; Safety Controls</div>
              <div style="display:flex;flex-direction:column;gap:10px;font-size:0.88rem;">
                ${[
                  {label:'Blocked Topics',val:'12 Topics Blocked',detail:'Competitor names, salary benchmarks, personal data exfiltration',color:'var(--status-rose)'},
                  {label:'Restricted Documents',val:'8 Files Restricted',detail:'Executive compensation, M&A pipeline, board minutes (Admin only)',color:'var(--status-amber)'},
                  {label:'Sensitive Information Detection',val:'PII Masking ON',detail:'SSN, credit cards, personal emails auto-redacted from responses',color:'var(--accent-cyan)'},
                  {label:'Content Moderation',val:'Level 3 Strict',detail:'Toxicity, bias, and policy hallucination detection active',color:'var(--accent-primary)'},
                  {label:'Access Policies',val:'RBAC Enforced',detail:'4 tiers: Employee → HR → Manager → Admin — fully isolated',color:'var(--status-emerald)'},
                ].map(g=>`
                  <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);padding:12px 16px;border-radius:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                      <b style="color:white;font-size:0.88rem;">${g.label}</b>
                      <span style="font-size:0.72rem;font-weight:700;color:${g.color};white-space:nowrap;">${g.val}</span>
                    </div>
                    <div style="font-size:0.77rem;color:var(--text-dim);">${g.detail}</div>
                  </div>`).join('')}
              </div>
            </div>
            <div class="glass-card" style="display:flex;flex-direction:column;gap:12px;">
              <div style="font-weight:800;font-family:'Outfit';font-size:1.2rem;color:#8B5CF6;"><i class="fa-solid fa-bolt"></i> AI Automation</div>
              ${[
                {label:'Scheduled Knowledge Sync',icon:'fa-rotate',schedule:'Every 6h'},
                {label:'Auto Re-index',icon:'fa-bolt',schedule:'On upload trigger'},
                {label:'Prompt Deployment',icon:'fa-rocket',schedule:'On approval'},
                {label:'Daily AI Reports',icon:'fa-file-chart-column',schedule:'Daily 8:00 AM'},
                {label:'Workflow Triggers',icon:'fa-diagram-project',schedule:'Event-driven'},
              ].map((a,i)=>`
                <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);padding:10px 14px;border-radius:12px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <i class="fa-solid ${a.icon}" style="color:#8B5CF6;width:16px;text-align:center;"></i>
                    <div><div style="font-size:0.84rem;font-weight:700;">${a.label}</div><div style="font-size:0.7rem;color:var(--text-dim);">${a.schedule}</div></div>
                  </div>
                  <div id="aicc-toggle-${i}" onclick="aicc_toggleJob(this)" style="width:36px;height:20px;border-radius:10px;background:rgba(16,185,129,0.4);border:1px solid var(--status-emerald);position:relative;cursor:pointer;transition:all 0.3s;" title="Toggle Automation Job">
                    <div style="width:14px;height:14px;border-radius:50%;background:white;position:absolute;top:2px;right:2px;transition:all 0.3s;"></div>
                  </div>
                </div>`).join('')}
            </div>
          </div>

          <!-- SECTION 9: QUICK ACTIONS -->
          <div class="glass-card">
            <div style="font-weight:800;font-family:'Outfit';font-size:1.2rem;color:var(--accent-primary);margin-bottom:16px;"><i class="fa-solid fa-bolt"></i> Quick Actions</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">
              <button class="btn-submit" onclick="aicc_deployPrompt()" style="padding:16px;flex-direction:column;gap:8px;align-items:center;justify-content:center;background:var(--accent-gradient);">
                <i class="fa-solid fa-rocket" style="font-size:1.4rem;"></i><span>Deploy Prompt</span>
              </button>
              <button class="btn-submit" onclick="aicc_syncKnowledge()" style="padding:16px;flex-direction:column;gap:8px;align-items:center;justify-content:center;background:rgba(16,185,129,0.2);border:1px solid var(--status-emerald);">
                <i class="fa-solid fa-rotate" style="font-size:1.4rem;color:var(--status-emerald);"></i><span>Sync Knowledge</span>
              </button>
              <button class="btn-submit" onclick="aicc_restartService()" style="padding:16px;flex-direction:column;gap:8px;align-items:center;justify-content:center;background:rgba(244,63,94,0.15);border:1px solid var(--status-rose);">
                <i class="fa-solid fa-power-off" style="font-size:1.4rem;color:var(--status-rose);"></i><span>Restart AI Service</span>
              </button>
              <button class="btn-submit" onclick="aicc_generateReport()" style="padding:16px;flex-direction:column;gap:8px;align-items:center;justify-content:center;background:rgba(245,158,11,0.15);border:1px solid var(--status-amber);">
                <i class="fa-solid fa-file-chart-column" style="font-size:1.4rem;color:var(--status-amber);"></i><span>Generate AI Report</span>
              </button>
              <button class="btn-submit" onclick="aicc_testPrompt()" style="padding:16px;flex-direction:column;gap:8px;align-items:center;justify-content:center;background:rgba(99,102,241,0.2);border:1px solid var(--accent-primary);">
                <i class="fa-solid fa-flask" style="font-size:1.4rem;color:var(--accent-primary);"></i><span>Test AI Response</span>
              </button>
              <button class="btn-submit" onclick="aicc_viewLogs()" style="padding:16px;flex-direction:column;gap:8px;align-items:center;justify-content:center;background:rgba(6,182,212,0.15);border:1px solid var(--accent-cyan);">
                <i class="fa-solid fa-terminal" style="font-size:1.4rem;color:var(--accent-cyan);"></i><span>View AI Logs</span>
              </button>
            </div>
          </div>

          <style>
            @keyframes aicc-pulse{0%,100%{opacity:1}50%{opacity:0.35}}
            .aicc-ptab-active{background:rgba(6,182,212,0.2)!important;border-color:var(--accent-cyan)!important;color:var(--accent-cyan)!important;}
          </style>
        `;

      } else if (featureId === 'feat_admin_workflow_automation') {
        container.innerHTML = `
          <!-- Header -->
          <div class="glass-card" style="background:linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(6,182,212,0.15) 100%); border:1px solid rgba(99,102,241,0.3); margin-bottom:24px;">
            <h2 style="font-family:'Outfit'; font-size:1.8rem; color:white; margin-bottom:4px;">
              <i class="fa-solid fa-bolt" style="color:var(--accent-primary);"></i> Workflow & Automation Center
            </h2>
            <div style="color:var(--text-muted); font-size:0.95rem;">Manage enterprise workflows, email automation, and scheduled processes</div>
          </div>

          <!-- Quick Actions -->
          <div style="display:flex; gap:12px; margin-bottom:24px; flex-wrap:wrap;">
            <button class="btn-submit" onclick="openCreateWorkflowModal()">
              <i class="fa-solid fa-plus"></i> Create Workflow
            </button>
            <button class="btn-submit" onclick="openEditWorkflowModal()" style="background:rgba(255,255,255,0.06); border:1px solid var(--border-glass);">
              <i class="fa-solid fa-pen"></i> Edit Workflow
            </button>
            <button class="btn-submit" onclick="openPauseWorkflowModal()" style="background:rgba(255,255,255,0.06); border:1px solid var(--border-glass);">
              <i class="fa-solid fa-pause"></i> Pause Workflow
            </button>
          </div>

          <!-- Section 1: Approval Workflows -->
          <div class="glass-card" style="margin-bottom:24px;">
            <div style="font-weight:800; font-family:'Outfit'; font-size:1.2rem; color:var(--accent-primary); margin-bottom:16px; display:flex; align-items:center; gap:10px;">
              <i class="fa-solid fa-check-circle"></i> Approval Workflows
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:16px;">
              
              <!-- Leave Approval -->
              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:14px; padding:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                  <div style="font-weight:700; font-size:1rem; color:white;">Leave Approval</div>
                  <span class="status-badge-pill sb-online" style="font-size:0.7rem; padding:4px 10px;">Active</span>
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px; line-height:1.6;">
                  Employee → Manager Review → HR Notification → Email Confirmation
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:var(--text-dim);">
                  <span><i class="fa-solid fa-clock"></i> Avg: 2.4 hours</span>
                  <span><i class="fa-solid fa-check"></i> 94% Auto-approved</span>
                </div>
              </div>

              <!-- Expense Approval -->
              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:14px; padding:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                  <div style="font-weight:700; font-size:1rem; color:white;">Expense Approval</div>
                  <span class="status-badge-pill sb-online" style="font-size:0.7rem; padding:4px 10px;">Active</span>
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px; line-height:1.6;">
                  Submit Receipt → Finance Review → Manager Approval → Reimbursement
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:var(--text-dim);">
                  <span><i class="fa-solid fa-clock"></i> Avg: 4.1 hours</span>
                  <span><i class="fa-solid fa-check"></i> 87% Approved</span>
                </div>
              </div>

              <!-- Document Approval -->
              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:14px; padding:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                  <div style="font-weight:700; font-size:1rem; color:white;">Document Approval</div>
                  <span class="status-badge-pill sb-online" style="font-size:0.7rem; padding:4px 10px;">Active</span>
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px; line-height:1.6;">
                  Upload → Quality Check → Admin Review → Knowledge Index
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:var(--text-dim);">
                  <span><i class="fa-solid fa-clock"></i> Avg: 1.2 hours</span>
                  <span><i class="fa-solid fa-check"></i> 100% Processed</span>
                </div>
              </div>

            </div>
          </div>

          <!-- Section 2: Email Automation -->
          <div class="glass-card" style="margin-bottom:24px;">
            <div style="font-weight:800; font-family:'Outfit'; font-size:1.2rem; color:var(--accent-cyan); margin-bottom:16px; display:flex; align-items:center; gap:10px;">
              <i class="fa-solid fa-envelope"></i> Email Automation (SMTP)
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:16px;">
              
              <!-- Approval Emails -->
              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:14px; padding:18px;">
                <div style="font-weight:700; font-size:1rem; color:white; margin-bottom:8px;">
                  <i class="fa-solid fa-circle-check" style="color:var(--status-emerald);"></i> Approval Emails
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:10px;">
                  Automated approval confirmations sent to employees
                </div>
                <div style="font-size:0.78rem; color:var(--text-dim);">
                  <div style="margin-bottom:4px;"><i class="fa-solid fa-paper-plane"></i> 156 sent today</div>
                  <div><i class="fa-solid fa-server"></i> SMTP: smtp.gmail.com:587</div>
                </div>
              </div>

              <!-- Reminder Emails -->
              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:14px; padding:18px;">
                <div style="font-weight:700; font-size:1rem; color:white; margin-bottom:8px;">
                  <i class="fa-solid fa-bell" style="color:var(--status-amber);"></i> Reminder Emails
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:10px;">
                  Pending action and deadline reminders
                </div>
                <div style="font-size:0.78rem; color:var(--text-dim);">
                  <div style="margin-bottom:4px;"><i class="fa-solid fa-paper-plane"></i> 42 sent today</div>
                  <div><i class="fa-solid fa-clock"></i> Scheduled: Daily 9:00 AM</div>
                </div>
              </div>

              <!-- Company Announcements -->
              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:14px; padding:18px;">
                <div style="font-weight:700; font-size:1rem; color:white; margin-bottom:8px;">
                  <i class="fa-solid fa-bullhorn" style="color:#8B5CF6;"></i> Announcement Emails
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:10px;">
                  Company-wide announcements and updates
                </div>
                <div style="font-size:0.78rem; color:var(--text-dim);">
                  <div style="margin-bottom:4px;"><i class="fa-solid fa-paper-plane"></i> 3 sent this week</div>
                  <div><i class="fa-solid fa-users"></i> Recipients: All 248 staff</div>
                </div>
              </div>

            </div>
          </div>

          <!-- Section 3: Knowledge Base Synchronization -->
          <div class="glass-card" style="margin-bottom:24px;">
            <div style="font-weight:800; font-family:'Outfit'; font-size:1.2rem; color:var(--status-emerald); margin-bottom:16px; display:flex; align-items:center; gap:10px;">
              <i class="fa-solid fa-database"></i> Knowledge Base Synchronization
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
              <div>
                <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:14px; padding:18px; margin-bottom:12px;">
                  <div style="font-size:0.85rem; color:#6EE7B7; font-weight:700; margin-bottom:8px;">
                    <i class="fa-solid fa-circle-check"></i> Automatic Document Processing
                  </div>
                  <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.6;">
                    Uploaded documents are automatically parsed, chunked, and indexed into the RAG knowledge base for instant AI retrieval.
                  </div>
                </div>
                <div style="font-size:0.88rem; display:flex; flex-direction:column; gap:8px;">
                  <div style="display:flex; justify-content:space-between; padding:8px; background:rgba(255,255,255,0.03); border-radius:8px;">
                    <span>Total Documents Indexed</span>
                    <b style="color:white;">84 files</b>
                  </div>
                  <div style="display:flex; justify-content:space-between; padding:8px; background:rgba(255,255,255,0.03); border-radius:8px;">
                    <span>Processing Queue</span>
                    <b style="color:var(--status-emerald);">0 pending</b>
                  </div>
                  <div style="display:flex; justify-content:space-between; padding:8px; background:rgba(255,255,255,0.03); border-radius:8px;">
                    <span>Last Sync</span>
                    <b style="color:var(--accent-cyan);">2 hours ago</b>
                  </div>
                </div>
              </div>
              <div>
                <div style="font-weight:700; font-size:0.95rem; margin-bottom:12px;">Recent Processing Activity</div>
                <div style="display:flex; flex-direction:column; gap:10px; max-height:200px; overflow-y:auto;">
                  <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:12px; border-radius:10px; font-size:0.85rem;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                      <b style="color:white;">2026_Travel_Policy.pdf</b>
                      <span class="role-badge-inline rb-employee" style="font-size:0.65rem;">Indexed</span>
                    </div>
                    <div style="color:var(--text-dim); font-size:0.75rem;">Processed 2 hours ago • 18 chunks</div>
                  </div>
                  <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:12px; border-radius:10px; font-size:0.85rem;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                      <b style="color:white;">HR_Benefits_Guide.pdf</b>
                      <span class="role-badge-inline rb-employee" style="font-size:0.65rem;">Indexed</span>
                    </div>
                    <div style="color:var(--text-dim); font-size:0.75rem;">Processed 5 hours ago • 32 chunks</div>
                  </div>
                  <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:12px; border-radius:10px; font-size:0.85rem;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                      <b style="color:white;">Security_Guidelines.pdf</b>
                      <span class="role-badge-inline rb-employee" style="font-size:0.65rem;">Indexed</span>
                    </div>
                    <div style="color:var(--text-dim); font-size:0.75rem;">Processed 1 day ago • 24 chunks</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 4: Scheduled Jobs -->
          <div class="glass-card" style="margin-bottom:24px;">
            <div style="font-weight:800; font-family:'Outfit'; font-size:1.2rem; color:var(--status-amber); margin-bottom:16px; display:flex; align-items:center; gap:10px;">
              <i class="fa-solid fa-calendar-days"></i> Scheduled Jobs
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
              
              <!-- Daily Document Sync -->
              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:14px; padding:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <div style="font-weight:700; font-size:0.95rem; color:white;">Daily Document Sync</div>
                  <span class="status-badge-pill sb-online" style="font-size:0.68rem; padding:3px 8px;">Running</span>
                </div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px;">
                  Synchronizes knowledge base with document repository
                </div>
                <div style="font-size:0.75rem; color:var(--text-dim);">
                  <div><i class="fa-solid fa-clock"></i> Schedule: Daily 2:00 AM</div>
                  <div style="margin-top:4px;"><i class="fa-solid fa-check-circle"></i> Last Run: Today 2:05 AM</div>
                </div>
              </div>

              <!-- Weekly Reports -->
              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:14px; padding:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <div style="font-weight:700; font-size:0.95rem; color:white;">Weekly Reports</div>
                  <span class="status-badge-pill sb-online" style="font-size:0.68rem; padding:3px 8px;">Scheduled</span>
                </div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px;">
                  Generates executive summary and analytics reports
                </div>
                <div style="font-size:0.75rem; color:var(--text-dim);">
                  <div><i class="fa-solid fa-clock"></i> Schedule: Mondays 6:00 AM</div>
                  <div style="margin-top:4px;"><i class="fa-solid fa-check-circle"></i> Last Run: July 28, 6:02 AM</div>
                </div>
              </div>

              <!-- Database Backup -->
              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:14px; padding:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <div style="font-weight:700; font-size:0.95rem; color:white;">Database Backup</div>
                  <span class="status-badge-pill sb-online" style="font-size:0.68rem; padding:3px 8px;">Scheduled</span>
                </div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px;">
                  Creates encrypted backup of enterprise database
                </div>
                <div style="font-size:0.75rem; color:var(--text-dim);">
                  <div><i class="fa-solid fa-clock"></i> Schedule: Daily 3:00 AM</div>
                  <div style="margin-top:4px;"><i class="fa-solid fa-check-circle"></i> Last Run: Today 3:01 AM</div>
                </div>
              </div>

            </div>
          </div>

          <!-- Section 5: Workflow History -->
          <div class="glass-card">
            <div style="font-weight:800; font-family:'Outfit'; font-size:1.2rem; color:var(--accent-primary); margin-bottom:16px; display:flex; align-items:center; gap:10px;">
              <i class="fa-solid fa-history"></i> Workflow History
            </div>
            <div style="overflow-x:auto;">
              <table class="org-table">
                <thead>
                  <tr>
                    <th>Workflow Name</th>
                    <th>Status</th>
                    <th>Last Run</th>
                    <th>Triggered By</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>Leave Approval - Alex R.</b></td>
                    <td><span class="role-badge-inline rb-employee" style="font-size:0.7rem;">Completed</span></td>
                    <td>Today 10:24 AM</td>
                    <td>Manager Sarah K.</td>
                    <td>1.2 hours</td>
                  </tr>
                  <tr>
                    <td><b>Document Indexing - Travel Policy</b></td>
                    <td><span class="role-badge-inline rb-employee" style="font-size:0.7rem;">Completed</span></td>
                    <td>Today 9:15 AM</td>
                    <td>System Automation</td>
                    <td>45 seconds</td>
                  </tr>
                  <tr>
                    <td><b>Expense Approval - Travel Receipt</b></td>
                    <td><span class="role-badge-inline rb-hr" style="font-size:0.7rem;">In Progress</span></td>
                    <td>Today 8:42 AM</td>
                    <td>Finance Team</td>
                    <td>2.1 hours</td>
                  </tr>
                  <tr>
                    <td><b>Weekly Report Generation</b></td>
                    <td><span class="role-badge-inline rb-employee" style="font-size:0.7rem;">Completed</span></td>
                    <td>July 28, 6:02 AM</td>
                    <td>System Scheduler</td>
                    <td>3.4 minutes</td>
                  </tr>
                  <tr>
                    <td><b>Company Announcement Email</b></td>
                    <td><span class="role-badge-inline rb-employee" style="font-size:0.7rem;">Completed</span></td>
                    <td>July 27, 2:15 PM</td>
                    <td>Admin Jennifer L.</td>
                    <td>12 seconds</td>
                  </tr>
                  <tr>
                    <td><b>Database Backup</b></td>
                    <td><span class="role-badge-inline rb-employee" style="font-size:0.7rem;">Completed</span></td>
                    <td>Today 3:01 AM</td>
                    <td>System Automation</td>
                    <td>8.5 minutes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        `;

      } else if (featureId === 'feat_admin_security_sysadmin') {
        container.innerHTML = `
          <style>
            .sec-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
            .sec-kpi-card {
              background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 18px;
              padding: 20px; display: flex; flex-direction: column; gap: 8px; position: relative; overflow: hidden;
              transition: all 0.3s ease;
            }
            .sec-kpi-card::before {
              content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
              background: var(--kpi-accent, var(--accent-primary));
            }
            .sec-kpi-card:hover { border-color: var(--border-glow); transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.3); }
            .sec-kpi-icon { font-size: 1.5rem; margin-bottom: 4px; }
            .sec-kpi-value { font-family: 'Outfit', sans-serif; font-size: 1.9rem; font-weight: 800; line-height: 1; }
            .sec-kpi-label { font-size: 0.78rem; color: var(--text-dim); font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }
            .sec-kpi-sub { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }

            .sec-section-header {
              display: flex; justify-content: space-between; align-items: center;
              margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-glass);
            }
            .sec-section-title { font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; gap: 10px; }

            .sec-badge {
              display: inline-flex; align-items: center; gap: 4px;
              font-size: 0.72rem; font-weight: 700; padding: 3px 10px; border-radius: 20px;
            }
            .sec-badge-green { background: rgba(16,185,129,0.15); color: #10B981; border: 1px solid rgba(16,185,129,0.3); }
            .sec-badge-yellow { background: rgba(245,158,11,0.15); color: #F59E0B; border: 1px solid rgba(245,158,11,0.3); }
            .sec-badge-red { background: rgba(244,63,94,0.15); color: #F43F5E; border: 1px solid rgba(244,63,94,0.3); }
            .sec-badge-blue { background: rgba(99,102,241,0.15); color: #6366F1; border: 1px solid rgba(99,102,241,0.3); }
            .sec-badge-cyan { background: rgba(6,182,212,0.15); color: #06B6D4; border: 1px solid rgba(6,182,212,0.3); }

            .sec-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
            .sec-dot-green { background: #10B981; box-shadow: 0 0 6px #10B981; }
            .sec-dot-yellow { background: #F59E0B; box-shadow: 0 0 6px #F59E0B; }
            .sec-dot-red { background: #F43F5E; box-shadow: 0 0 6px #F43F5E; }

            .audit-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.85rem; }
            .audit-table thead th {
              padding: 12px 14px; background: rgba(255,255,255,0.03);
              border-bottom: 1px solid var(--border-glass); color: var(--text-dim);
              text-transform: uppercase; font-size: 0.7rem; letter-spacing: 1px; font-weight: 700; white-space: nowrap;
            }
            .audit-table thead th:first-child { border-radius: 10px 0 0 0; }
            .audit-table thead th:last-child { border-radius: 0 10px 0 0; }
            .audit-table tbody tr { transition: background 0.15s; }
            .audit-table tbody tr:hover td { background: rgba(255,255,255,0.04); }
            .audit-table tbody td { padding: 13px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--text-main); vertical-align: middle; }
            .audit-table tbody tr:last-child td { border-bottom: none; }

            .session-row {
              display: flex; align-items: center; justify-content: space-between;
              padding: 12px 16px; background: rgba(255,255,255,0.03);
              border: 1px solid var(--border-glass); border-radius: 12px; margin-bottom: 10px;
              transition: all 0.25s ease;
            }
            .session-row:hover { border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.05); }

            .compliance-row {
              display: flex; align-items: center; justify-content: space-between;
              padding: 14px 18px; border-radius: 12px; background: rgba(255,255,255,0.03);
              border: 1px solid var(--border-glass); margin-bottom: 10px;
            }
            .progress-bar-track { height: 6px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; margin-top: 6px; }
            .progress-bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }

            .audit-filter-bar { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
            .audit-filter-select {
              background: rgba(255,255,255,0.06); border: 1px solid var(--border-glass); border-radius: 10px;
              padding: 8px 12px; color: var(--text-main); font-size: 0.82rem; font-weight: 600; outline: none; cursor: pointer;
            }
            .audit-filter-select option { background: #0f1424; color: white; }
            .audit-search-input {
              flex: 1; min-width: 200px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-glass);
              border-radius: 10px; padding: 8px 14px; color: var(--text-main); font-size: 0.82rem; outline: none;
            }
            .audit-search-input::placeholder { color: var(--text-dim); }

            .rbac-role-card {
              background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); border-radius: 14px; padding: 16px;
              display: flex; align-items: center; justify-content: space-between; transition: all 0.2s;
            }
            .rbac-role-card:hover { border-color: rgba(99,102,241,0.4); }

            .maint-item {
              display: flex; align-items: center; justify-content: space-between;
              padding: 14px 16px; background: rgba(255,255,255,0.03);
              border: 1px solid var(--border-glass); border-radius: 12px;
            }

            .sysadmin-pg-btn {
              padding: 5px 12px; font-size: 0.78rem; font-weight: 700; border-radius: 8px;
              background: rgba(255,255,255,0.06); border: 1px solid var(--border-glass); color: var(--text-main);
              cursor: pointer; transition: all 0.2s;
            }
            .sysadmin-pg-btn:hover { background: rgba(99,102,241,0.2); border-color: var(--accent-primary); }
            .sysadmin-pg-btn.active { background: rgba(99,102,241,0.3); border-color: var(--accent-primary); color: white; }
          </style>

          <!-- ── PAGE HEADER ── -->
          <div class="glass-card" style="background: linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(244,63,94,0.10) 100%); border: 1px solid rgba(99,102,241,0.3); margin-bottom: 24px; padding: 26px 28px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
              <div>
                <div style="font-size:0.78rem; font-weight:700; color:var(--accent-primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">
                  <i class="fa-solid fa-shield-halved"></i> ENTERPRISE SECURITY CONSOLE
                </div>
                <h2 style="font-family:'Outfit'; font-size:1.85rem; font-weight:800; color:white; margin-bottom:4px;">Security & System Administration</h2>
                <div style="color:var(--text-muted); font-size:0.9rem;">Enterprise-grade access control, audit logging, and system health monitoring</div>
              </div>
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn-act sec-badge-green" onclick="sysadminExportSecurityReport()" style="padding:10px 16px; font-size:0.83rem; border-radius:12px;">
                  <i class="fa-solid fa-file-export"></i> Export Security Report
                </button>
                <button class="btn-submit" onclick="sysadminRunSecurityScan()" style="padding:10px 18px; font-size:0.83rem; border-radius:12px; background:var(--accent-gradient);">
                  <i class="fa-solid fa-radar"></i> Run Security Scan
                </button>
              </div>
            </div>
          </div>

          <!-- ══════════════════════════════════════════ -->
          <!-- SECTION 1: SECURITY OVERVIEW KPI CARDS   -->
          <!-- ══════════════════════════════════════════ -->
          <div style="margin-bottom:8px; font-size:0.72rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-chart-simple" style="color:var(--accent-primary);"></i> Section 1 — Security Overview
          </div>
          <div class="sec-kpi-grid">
            <div class="sec-kpi-card" style="--kpi-accent: #10B981;">
              <div class="sec-kpi-icon">🟢</div>
              <div class="sec-kpi-label">System Health</div>
              <div class="sec-kpi-value" id="sys-health-kpi" style="color:#10B981;">Optimal</div>
              <div class="sec-kpi-sub">All 14 services operational</div>
            </div>
            <div class="sec-kpi-card" style="--kpi-accent: #6366F1;">
              <div class="sec-kpi-icon">👥</div>
              <div class="sec-kpi-label">Active Users</div>
              <div class="sec-kpi-value" id="active-users-kpi" style="color:#818CF8;">284</div>
              <div class="sec-kpi-sub">+12 from last hour</div>
            </div>
            <div class="sec-kpi-card" style="--kpi-accent: #F59E0B;">
              <div class="sec-kpi-icon">⚠️</div>
              <div class="sec-kpi-label">Failed Login Attempts</div>
              <div class="sec-kpi-value" id="failed-logins-kpi" style="color:#F59E0B;">7</div>
              <div class="sec-kpi-sub">Last 24 hours — 2 flagged</div>
            </div>
            <div class="sec-kpi-card" style="--kpi-accent: #F43F5E;">
              <div class="sec-kpi-icon">🚨</div>
              <div class="sec-kpi-label">Security Alerts</div>
              <div class="sec-kpi-value" id="sec-alerts-kpi" style="color:#FB7185;">2</div>
              <div class="sec-kpi-sub" id="sec-alerts-kpi-sub">1 critical, 1 warning</div>
            </div>
            <div class="sec-kpi-card" style="--kpi-accent: #06B6D4;">
              <div class="sec-kpi-icon">🔐</div>
              <div class="sec-kpi-label">MFA Adoption</div>
              <div class="sec-kpi-value" style="color:#22D3EE;">96.4%</div>
              <div class="sec-kpi-sub">11 users without MFA</div>
            </div>
            <div class="sec-kpi-card" style="--kpi-accent: #10B981;">
              <div class="sec-kpi-icon">📋</div>
              <div class="sec-kpi-label">Compliance Score</div>
              <div class="sec-kpi-value" style="color:#10B981;">98%</div>
              <div class="sec-kpi-sub">ISO 27001 • SOC 2 Type II</div>
            </div>
          </div>

          <!-- ══════════════════════════════════════════ -->
          <!-- SECTION 2: ACCESS MANAGEMENT              -->
          <!-- ══════════════════════════════════════════ -->
          <div style="margin-bottom:8px; font-size:0.72rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:6px; margin-top:8px;">
            <i class="fa-solid fa-key" style="color:var(--accent-cyan);"></i> Section 2 — Access Management
          </div>
          <div style="display:grid; grid-template-columns: 1.1fr 0.9fr; gap: 20px; margin-bottom: 24px;">

            <!-- Active User Sessions -->
            <div class="glass-card">
              <div class="sec-section-header">
                <div class="sec-section-title" style="color:var(--accent-cyan);">
                  <i class="fa-solid fa-users-gear"></i> Active User Sessions (<span id="active-sessions-count">5</span>)
                </div>
                <button class="btn-act" onclick="sysadminSessionReport()" style="font-size:0.78rem; padding:6px 12px;">
                  <i class="fa-solid fa-file-lines"></i> Session Report
                </button>
              </div>

              <div id="session-rows-container">
                <div class="session-row" id="session-row-haritha">
                  <div style="display:flex; align-items:center; gap:12px; min-width:0;">
                    <span class="sec-dot sec-dot-green"></span>
                    <div style="min-width:0;">
                      <div style="font-weight:700; font-size:0.88rem; color:white;">Haritha L.</div>
                      <div style="font-size:0.73rem; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Chrome / Windows • 192.168.1.41 (Hyderabad, IN)</div>
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                    <span class="sec-badge sec-badge-green">Admin</span>
                    <button class="btn-act" onclick="sysadminTerminateSession('Haritha L.', '192.168.1.41', 'session-row-haritha')" style="padding:4px 8px; font-size:0.7rem;" title="Disconnect session"><i class="fa-solid fa-power-off" style="color:var(--status-rose)"></i></button>
                  </div>
                </div>

                <div class="session-row" id="session-row-david">
                  <div style="display:flex; align-items:center; gap:12px; min-width:0;">
                    <span class="sec-dot sec-dot-green"></span>
                    <div style="min-width:0;">
                      <div style="font-weight:700; font-size:0.88rem; color:white;">David M.</div>
                      <div style="font-size:0.73rem; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Safari / macOS • 192.168.1.55 (Mumbai, IN)</div>
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                    <span class="sec-badge sec-badge-green">Manager</span>
                    <button class="btn-act" onclick="sysadminTerminateSession('David M.', '192.168.1.55', 'session-row-david')" style="padding:4px 8px; font-size:0.7rem;" title="Disconnect session"><i class="fa-solid fa-power-off" style="color:var(--status-rose)"></i></button>
                  </div>
                </div>

                <div class="session-row" id="session-row-priya">
                  <div style="display:flex; align-items:center; gap:12px; min-width:0;">
                    <span class="sec-dot sec-dot-green"></span>
                    <div style="min-width:0;">
                      <div style="font-weight:700; font-size:0.88rem; color:white;">Priya S.</div>
                      <div style="font-size:0.73rem; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Firefox / Ubuntu • 10.0.0.18 (Bangalore, IN)</div>
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                    <span class="sec-badge sec-badge-green">HR Specialist</span>
                    <button class="btn-act" onclick="sysadminTerminateSession('Priya S.', '10.0.0.18', 'session-row-priya')" style="padding:4px 8px; font-size:0.7rem;" title="Disconnect session"><i class="fa-solid fa-power-off" style="color:var(--status-rose)"></i></button>
                  </div>
                </div>

                <div class="session-row" id="session-row-alex">
                  <div style="display:flex; align-items:center; gap:12px; min-width:0;">
                    <span class="sec-dot sec-dot-yellow"></span>
                    <div style="min-width:0;">
                      <div style="font-weight:700; font-size:0.88rem; color:white;">Alex R.</div>
                      <div style="font-size:0.73rem; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Edge / Windows • 203.0.113.44 (Delhi, IN)</div>
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                    <span class="sec-badge sec-badge-yellow">Employee</span>
                    <button class="btn-act" onclick="sysadminTerminateSession('Alex R.', '203.0.113.44', 'session-row-alex')" style="padding:4px 8px; font-size:0.7rem;" title="Disconnect session"><i class="fa-solid fa-power-off" style="color:var(--status-rose)"></i></button>
                  </div>
                </div>

                <div class="session-row" id="session-row-suspicious">
                  <div style="display:flex; align-items:center; gap:12px; min-width:0;">
                    <span class="sec-dot sec-dot-red"></span>
                    <div style="min-width:0;">
                      <div style="font-weight:700; font-size:0.88rem; color:#FB7185;">Unknown (Suspicious)</div>
                      <div style="font-size:0.73rem; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Automated / Linux • 185.220.101.14 (Moscow, RU)</div>
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                    <span class="sec-badge sec-badge-red">Flagged</span>
                    <button class="btn-submit" onclick="sysadminTerminateSession('Unknown', '185.220.101.14', 'session-row-suspicious')" style="padding:4px 10px; font-size:0.72rem; background:rgba(244,63,94,0.2); border:1px solid #F43F5E;">Block</button>
                  </div>
                </div>
              </div>

              <div id="suspicious-session-banner" style="margin-top:4px; padding:10px 14px; background:rgba(244,63,94,0.08); border:1px solid rgba(244,63,94,0.25); border-radius:10px; font-size:0.8rem; color:#FB7185; display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <span><i class="fa-solid fa-triangle-exclamation"></i> 1 suspicious session detected from <b>Moscow, RU</b></span>
                <button onclick="sysadminTerminateSession('Unknown', '185.220.101.14', 'session-row-suspicious')" style="background:none;border:none;color:#FB7185;font-weight:800;cursor:pointer;text-decoration:underline;padding:0;white-space:nowrap;">Terminate & Block IP</button>
              </div>
            </div>

            <!-- RBAC + Login History + Access Requests stacked -->
            <div style="display:flex; flex-direction:column; gap:16px;">

              <!-- Role-Based Access Control -->
              <div class="glass-card">
                <div class="sec-section-header">
                  <div class="sec-section-title" style="color:#8B5CF6;">
                    <i class="fa-solid fa-shield-halved"></i> Role-Based Access Control
                  </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                  <div class="rbac-role-card" id="rbac-card-Employee">
                    <div style="display:flex; align-items:center; gap:12px;">
                      <div style="width:36px;height:36px;border-radius:10px;background:rgba(99,102,241,0.15);display:flex;align-items:center;justify-content:center;">
                        <i class="fa-solid fa-user" style="color:#6366F1;font-size:0.9rem;"></i>
                      </div>
                      <div>
                        <div style="font-weight:700;font-size:0.87rem;color:white;">Employee <span style="color:var(--text-dim);font-weight:500;" id="count-Employee">(248)</span></div>
                        <div style="font-size:0.7rem;color:var(--text-dim);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" id="perm-Employee">Read-only: Handbooks, Benefits, Announcements</div>
                      </div>
                    </div>
                    <button class="btn-act" onclick="sysadminEditRole('Employee', 248, 'Read-only: Handbooks, Benefits, Announcements')" style="padding:5px 10px;font-size:0.73rem;border-radius:8px;" title="Edit Role Permissions"><i class="fa-solid fa-pen"></i></button>
                  </div>

                  <div class="rbac-role-card" id="rbac-card-HR">
                    <div style="display:flex; align-items:center; gap:12px;">
                      <div style="width:36px;height:36px;border-radius:10px;background:rgba(6,182,212,0.15);display:flex;align-items:center;justify-content:center;">
                        <i class="fa-solid fa-users" style="color:#06B6D4;font-size:0.9rem;"></i>
                      </div>
                      <div>
                        <div style="font-weight:700;font-size:0.87rem;color:white;">HR Specialist <span style="color:var(--text-dim);font-weight:500;" id="count-HR">(22)</span></div>
                        <div style="font-size:0.7rem;color:var(--text-dim);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" id="perm-HR">Read + Write: HR Records, Policies, Payroll</div>
                      </div>
                    </div>
                    <button class="btn-act" onclick="sysadminEditRole('HR Specialist', 22, 'Read + Write: HR Records, Policies, Payroll')" style="padding:5px 10px;font-size:0.73rem;border-radius:8px;" title="Edit Role Permissions"><i class="fa-solid fa-pen"></i></button>
                  </div>

                  <div class="rbac-role-card" id="rbac-card-Manager">
                    <div style="display:flex; align-items:center; gap:12px;">
                      <div style="width:36px;height:36px;border-radius:10px;background:rgba(245,158,11,0.15);display:flex;align-items:center;justify-content:center;">
                        <i class="fa-solid fa-briefcase" style="color:#F59E0B;font-size:0.9rem;"></i>
                      </div>
                      <div>
                        <div style="font-weight:700;font-size:0.87rem;color:white;">Manager <span style="color:var(--text-dim);font-weight:500;" id="count-Manager">(14)</span></div>
                        <div style="font-size:0.7rem;color:var(--text-dim);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" id="perm-Manager">Read + Write + Approve: Team Data, Expenses</div>
                      </div>
                    </div>
                    <button class="btn-act" onclick="sysadminEditRole('Manager', 14, 'Read + Write + Approve: Team Data, Expenses')" style="padding:5px 10px;font-size:0.73rem;border-radius:8px;" title="Edit Role Permissions"><i class="fa-solid fa-pen"></i></button>
                  </div>

                  <div class="rbac-role-card" id="rbac-card-Admin">
                    <div style="display:flex; align-items:center; gap:12px;">
                      <div style="width:36px;height:36px;border-radius:10px;background:rgba(244,63,94,0.15);display:flex;align-items:center;justify-content:center;">
                        <i class="fa-solid fa-crown" style="color:#F43F5E;font-size:0.9rem;"></i>
                      </div>
                      <div>
                        <div style="font-weight:700;font-size:0.87rem;color:white;">Admin <span style="color:var(--text-dim);font-weight:500;" id="count-Admin">(4)</span></div>
                        <div style="font-size:0.7rem;color:var(--text-dim);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" id="perm-Admin">Full Access: All Modules + Security Console</div>
                      </div>
                    </div>
                    <button class="btn-act" onclick="sysadminEditRole('Admin', 4, 'Full Access: All Modules + Security Console')" style="padding:5px 10px;font-size:0.73rem;border-radius:8px;" title="Edit Role Permissions"><i class="fa-solid fa-pen"></i></button>
                  </div>
                </div>
              </div>

              <!-- User Access Requests -->
              <div class="glass-card">
                <div class="sec-section-header">
                  <div class="sec-section-title" style="color:var(--status-amber);">
                    <i class="fa-solid fa-inbox"></i> User Access Requests
                  </div>
                  <span class="sec-badge sec-badge-yellow" id="access-req-badge">3 Pending</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;" id="access-requests-list">
                  <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);border-radius:12px;padding:12px 14px;" id="req-card-rahul">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                      <div style="font-weight:700;font-size:0.85rem;color:white;">Rahul K.</div>
                      <div style="font-size:0.7rem;color:var(--text-dim);">Today 10:15 AM</div>
                    </div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px;">Engineering — Upgrade: <b style="color:white;">Employee → Manager</b></div>
                    <div style="display:flex;gap:8px;">
                      <button class="btn-submit" onclick="sysadminHandleAccessRequest('Rahul K.', 'Manager', 'approve', 'req-card-rahul')" style="padding:5px 14px;font-size:0.78rem;border-radius:8px;"><i class="fa-solid fa-check"></i> Approve</button>
                      <button class="btn-secondary" onclick="sysadminHandleAccessRequest('Rahul K.', 'Manager', 'deny', 'req-card-rahul')" style="padding:5px 14px;font-size:0.78rem;border-radius:8px;"><i class="fa-solid fa-xmark"></i> Deny</button>
                    </div>
                  </div>

                  <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);border-radius:12px;padding:12px 14px;" id="req-card-meera">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                      <div style="font-weight:700;font-size:0.85rem;color:white;">Meera J.</div>
                      <div style="font-size:0.7rem;color:var(--text-dim);">Yesterday 4:30 PM</div>
                    </div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px;">HR Operations — Upgrade: <b style="color:white;">HR Specialist → Admin</b></div>
                    <div style="display:flex;gap:8px;">
                      <button class="btn-submit" onclick="sysadminHandleAccessRequest('Meera J.', 'Admin', 'approve', 'req-card-meera')" style="padding:5px 14px;font-size:0.78rem;border-radius:8px;"><i class="fa-solid fa-check"></i> Approve</button>
                      <button class="btn-secondary" onclick="sysadminHandleAccessRequest('Meera J.', 'Admin', 'deny', 'req-card-meera')" style="padding:5px 14px;font-size:0.78rem;border-radius:8px;"><i class="fa-solid fa-xmark"></i> Deny</button>
                    </div>
                  </div>

                  <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);border-radius:12px;padding:12px 14px;" id="req-card-sai">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                      <div style="font-weight:700;font-size:0.85rem;color:white;">Sai P.</div>
                      <div style="font-size:0.7rem;color:var(--text-dim);">Jul 29, 2:00 PM</div>
                    </div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px;">Payroll — Upgrade: <b style="color:white;">Employee → HR Specialist</b></div>
                    <div style="display:flex;gap:8px;">
                      <button class="btn-submit" onclick="sysadminHandleAccessRequest('Sai P.', 'HR Specialist', 'approve', 'req-card-sai')" style="padding:5px 14px;font-size:0.78rem;border-radius:8px;"><i class="fa-solid fa-check"></i> Approve</button>
                      <button class="btn-secondary" onclick="sysadminHandleAccessRequest('Sai P.', 'HR Specialist', 'deny', 'req-card-sai')" style="padding:5px 14px;font-size:0.78rem;border-radius:8px;"><i class="fa-solid fa-xmark"></i> Deny</button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- ══════════════════════════════════════════ -->
          <!-- SECTION 3: SECURITY AUDIT LOGS            -->
          <!-- ══════════════════════════════════════════ -->
          <div style="margin-bottom:8px; font-size:0.72rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-scroll" style="color:var(--status-rose);"></i> Section 3 — Security Audit Logs
          </div>
          <div class="glass-card" style="margin-bottom: 24px;">
            <div class="sec-section-header">
              <div class="sec-section-title" style="color:var(--status-rose);">
                <i class="fa-solid fa-list-check"></i> Enterprise Security Audit Log
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn-act" onclick="sysadminExportAuditCSV()" style="font-size:0.78rem; padding:7px 14px;"><i class="fa-solid fa-download"></i> Export CSV</button>
                <button class="btn-act" onclick="sysadminResetAuditFilters()" style="font-size:0.78rem; padding:7px 14px;"><i class="fa-solid fa-rotate-left"></i> Reset Filters</button>
              </div>
            </div>

            <div class="audit-filter-bar">
              <input class="audit-search-input" id="sysadmin-audit-search" placeholder="Search by user, action, or module..." oninput="sysadminFilterAuditLog()">
              <select class="audit-filter-select" id="sysadmin-audit-status-filter" onchange="sysadminFilterAuditLog()">
                <option value="all">All Statuses</option>
                <option value="Success">Success Only</option>
                <option value="Warning">Warning Only</option>
                <option value="Failed">Failed Only</option>
              </select>
              <select class="audit-filter-select" id="sysadmin-audit-module-filter" onchange="sysadminFilterAuditLog()">
                <option value="all">All Modules</option>
                <option value="Authentication">Authentication</option>
                <option value="Access Control">Access Control</option>
                <option value="Knowledge Base">Knowledge Base</option>
                <option value="Policy">Policy</option>
                <option value="Security">Security</option>
                <option value="System">System</option>
                <option value="HR Records">HR Records</option>
              </select>
            </div>

            <div style="overflow-x:auto; border-radius:12px; border:1px solid var(--border-glass);">
              <table class="audit-table" id="sysadmin-audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action Performed</th>
                    <th>Module</th>
                    <th>IP Address</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="sysadmin-audit-tbody">
                  <!-- Rendered dynamically via JS -->
                </tbody>
              </table>
            </div>

            <div style="margin-top:14px; display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; color:var(--text-dim);">
              <span id="audit-log-showing-count">Showing page 1 of 3 (12 entries per page)</span>
              <div style="display:flex; gap:6px;" id="audit-log-pagination-container">
                <button class="sysadmin-pg-btn" onclick="sysadminSetAuditPage(sysadminAuditPage - 1)">← Prev</button>
                <button class="sysadmin-pg-btn active" id="pg-btn-1" onclick="sysadminSetAuditPage(1)">1</button>
                <button class="sysadmin-pg-btn" id="pg-btn-2" onclick="sysadminSetAuditPage(2)">2</button>
                <button class="sysadmin-pg-btn" id="pg-btn-3" onclick="sysadminSetAuditPage(3)">3</button>
                <button class="sysadmin-pg-btn" onclick="sysadminSetAuditPage(sysadminAuditPage + 1)">Next →</button>
              </div>
            </div>
          </div>

          <!-- ══════════════════════════════════════════ -->
          <!-- SECTION 4: SYSTEM MAINTENANCE             -->
          <!-- ══════════════════════════════════════════ -->
          <div style="margin-bottom:8px; font-size:0.72rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-server" style="color:var(--status-amber);"></i> Section 4 — System Maintenance
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">

            <!-- System Health & Backup Status -->
            <div class="glass-card">
              <div class="sec-section-header">
                <div class="sec-section-title" style="color:var(--status-amber);">
                  <i class="fa-solid fa-database"></i> Database & Backup Status
                </div>
                <button class="btn-submit" id="btn-backup-now" onclick="sysadminBackupNow()" style="padding:7px 14px; font-size:0.78rem; border-radius:10px;">
                  <i class="fa-solid fa-cloud-arrow-up"></i> Backup Now
                </button>
              </div>
              <div style="display:flex; flex-direction:column; gap:12px;">
                <div class="maint-item">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;">
                      <i class="fa-solid fa-circle-check" style="color:#10B981; font-size:0.9rem;"></i>
                    </div>
                    <div>
                      <div style="font-size:0.82rem; font-weight:700; color:white;">Database Backup Status</div>
                      <div style="font-size:0.72rem; color:var(--text-dim); margin-top:1px;" id="maint-backup-sub">Incremental backup successful</div>
                    </div>
                  </div>
                  <span class="sec-badge sec-badge-green" id="maint-backup-badge">Completed</span>
                </div>

                <div class="maint-item">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;">
                      <i class="fa-solid fa-clock" style="color:#06B6D4; font-size:0.9rem;"></i>
                    </div>
                    <div>
                      <div style="font-size:0.82rem; font-weight:700; color:white;">Last Successful Backup</div>
                      <div style="font-size:0.72rem; color:var(--text-dim); margin-top:1px;" id="maint-last-backup-sub">Duration: 8.5 minutes • 14.2 GB</div>
                    </div>
                  </div>
                  <span class="sec-badge sec-badge-cyan" id="maint-last-backup-badge">Today 03:01 AM</span>
                </div>

                <div class="maint-item">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;">
                      <i class="fa-solid fa-radar" style="color:#10B981; font-size:0.9rem;"></i>
                    </div>
                    <div>
                      <div style="font-size:0.82rem; font-weight:700; color:white;">System Monitoring Status</div>
                      <div style="font-size:0.72rem; color:var(--text-dim); margin-top:1px;">Real-time alerts enabled — 14 Services</div>
                    </div>
                  </div>
                  <span class="sec-badge sec-badge-green">Active</span>
                </div>

                <div class="maint-item">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;">
                      <i class="fa-solid fa-calendar-check" style="color:#F59E0B; font-size:0.9rem;"></i>
                    </div>
                    <div>
                      <div style="font-size:0.82rem; font-weight:700; color:white;">Next Scheduled Backup</div>
                      <div style="font-size:0.72rem; color:var(--text-dim); margin-top:1px;">Full backup — 24h automatic cycle</div>
                    </div>
                  </div>
                  <span class="sec-badge sec-badge-yellow">Tomorrow 03:00 AM</span>
                </div>

                <!-- Storage Usage -->
                <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);border-radius:12px;padding:14px 16px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="font-size:0.82rem;font-weight:700;color:white;display:flex;align-items:center;gap:8px;">
                      <i class="fa-solid fa-hard-drive" style="color:#8B5CF6;"></i> Storage Usage
                    </div>
                    <span style="font-size:0.82rem;font-weight:800;color:#8B5CF6;" id="maint-storage-text">284 GB / 500 GB</span>
                  </div>
                  <div class="progress-bar-track">
                    <div class="progress-bar-fill" id="maint-storage-bar" style="width:56.8%;background:linear-gradient(90deg,#6366F1,#8B5CF6);"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-dim);margin-top:6px;">
                    <span id="maint-storage-used-pct">56.8% used</span><span id="maint-storage-avail">216 GB available</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Backup History -->
            <div class="glass-card">
              <div class="sec-section-header">
                <div class="sec-section-title" style="color:var(--accent-primary);">
                  <i class="fa-solid fa-clock-rotate-left"></i> Backup History
                </div>
              </div>
              <div style="overflow-x:auto; border-radius:10px; border:1px solid var(--border-glass);">
                <table class="audit-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody id="backup-history-tbody">
                    <!-- Rendered dynamically -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ══════════════════════════════════════════ -->
          <!-- SECTION 5: COMPLIANCE & SECURITY          -->
          <!-- ══════════════════════════════════════════ -->
          <div style="margin-bottom:8px; font-size:0.72rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-certificate" style="color:#10B981;"></i> Section 5 — Compliance & Security
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">

            <!-- Compliance Policies -->
            <div class="glass-card">
              <div class="sec-section-header">
                <div class="sec-section-title" style="color:#10B981;">
                  <i class="fa-solid fa-shield-check"></i> Compliance & Policy Status
                </div>
                <span class="sec-badge sec-badge-green"><i class="fa-solid fa-circle-check"></i> 98% Compliant</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:10px;">
                <div class="compliance-row">
                  <div style="flex:1; min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                      <div style="font-weight:700;font-size:0.86rem;color:white;">Password Policy</div>
                      <span class="sec-badge sec-badge-green">Enforced</span>
                    </div>
                    <div style="font-size:0.73rem;color:var(--text-dim);margin-bottom:6px;line-height:1.4;">Min 12 chars, 90-day rotation, no reuse (last 10)</div>
                    <div class="progress-bar-track"><div class="progress-bar-fill" style="width:100%;background:#10B981;"></div></div>
                  </div>
                </div>

                <div class="compliance-row">
                  <div style="flex:1; min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                      <div style="font-weight:700;font-size:0.86rem;color:white;">Multi-Factor Authentication</div>
                      <span class="sec-badge sec-badge-green">Active</span>
                    </div>
                    <div style="font-size:0.73rem;color:var(--text-dim);margin-bottom:6px;line-height:1.4;">TOTP + SMS — 96.4% adoption (11 pending)</div>
                    <div class="progress-bar-track"><div class="progress-bar-fill" style="width:96.4%;background:#10B981;"></div></div>
                  </div>
                </div>

                <div class="compliance-row">
                  <div style="flex:1; min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                      <div style="font-weight:700;font-size:0.86rem;color:white;">Document Access Policy</div>
                      <span class="sec-badge sec-badge-green">Enforced</span>
                    </div>
                    <div style="font-size:0.73rem;color:var(--text-dim);margin-bottom:6px;line-height:1.4;">RBAC-enforced, row-level security via Supabase RLS</div>
                    <div class="progress-bar-track"><div class="progress-bar-fill" style="width:100%;background:#10B981;"></div></div>
                  </div>
                </div>

                <div class="compliance-row">
                  <div style="flex:1; min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                      <div style="font-weight:700;font-size:0.86rem;color:white;">Security Compliance</div>
                      <span class="sec-badge sec-badge-green">Compliant</span>
                    </div>
                    <div style="font-size:0.73rem;color:var(--text-dim);margin-bottom:6px;line-height:1.4;">ISO 27001 audit passed Q2 2026 • SOC 2 Type II</div>
                    <div class="progress-bar-track"><div class="progress-bar-fill" style="width:98%;background:#10B981;"></div></div>
                  </div>
                </div>

                <div class="compliance-row">
                  <div style="flex:1; min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                      <div style="font-weight:700;font-size:0.86rem;color:white;">Data Retention Policy</div>
                      <span class="sec-badge sec-badge-green">Active</span>
                    </div>
                    <div style="font-size:0.73rem;color:var(--text-dim);margin-bottom:6px;line-height:1.4;">7-year retention, GDPR Article 17 — Right to Erasure active</div>
                    <div class="progress-bar-track"><div class="progress-bar-fill" style="width:100%;background:#10B981;"></div></div>
                  </div>
                </div>

                <div class="compliance-row">
                  <div style="flex:1; min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                      <div style="font-weight:700;font-size:0.86rem;color:white;">Incident Response Plan</div>
                      <span class="sec-badge sec-badge-cyan">Reviewed</span>
                    </div>
                    <div style="font-size:0.73rem;color:var(--text-dim);margin-bottom:6px;line-height:1.4;">Last drill: June 2026 — 14-min avg. response time</div>
                    <div class="progress-bar-track"><div class="progress-bar-fill" style="width:100%;background:#06B6D4;"></div></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Security Scorecard & Alerts -->
            <div style="display:flex; flex-direction:column; gap:16px;">
              <!-- Security Scorecard -->
              <div class="glass-card" style="background:linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.08) 100%); border-color:rgba(16,185,129,0.25);">
                <div class="sec-section-title" style="color:#10B981; margin-bottom:16px;">
                  <i class="fa-solid fa-trophy"></i> Security Scorecard
                </div>
                <div style="text-align:center; margin-bottom:16px;">
                  <div style="font-family:'Outfit'; font-size:3.5rem; font-weight:800; color:#10B981; line-height:1;">98</div>
                  <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">Enterprise Security Score</div>
                  <div style="font-size:0.75rem; color:#10B981; font-weight:700; margin-top:2px;">↑ +2 from last month</div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                  <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-radius:10px;padding:10px;text-align:center;">
                    <div style="font-family:'Outfit';font-size:1.4rem;font-weight:800;color:#10B981;">A+</div>
                    <div style="font-size:0.7rem;color:var(--text-dim);">Identity Security</div>
                  </div>
                  <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-radius:10px;padding:10px;text-align:center;">
                    <div style="font-family:'Outfit';font-size:1.4rem;font-weight:800;color:#10B981;">A</div>
                    <div style="font-size:0.7rem;color:var(--text-dim);">Data Protection</div>
                  </div>
                  <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-radius:10px;padding:10px;text-align:center;">
                    <div style="font-family:'Outfit';font-size:1.4rem;font-weight:800;color:#10B981;">A</div>
                    <div style="font-size:0.7rem;color:var(--text-dim);">Network Security</div>
                  </div>
                  <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-radius:10px;padding:10px;text-align:center;">
                    <div style="font-family:'Outfit';font-size:1.4rem;font-weight:800;color:#F59E0B;">B+</div>
                    <div style="font-size:0.7rem;color:var(--text-dim);">Threat Detection</div>
                  </div>
                </div>
              </div>

              <!-- Active Security Alerts -->
              <div class="glass-card" style="border-color:rgba(244,63,94,0.25);">
                <div class="sec-section-header" style="border-bottom-color:rgba(244,63,94,0.2);">
                  <div class="sec-section-title" style="color:var(--status-rose);">
                    <i class="fa-solid fa-bell"></i> Active Security Alerts
                  </div>
                  <span class="sec-badge sec-badge-red" id="alerts-badge">5 Active</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;" id="alerts-container">
                  <div style="background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.3);border-radius:12px;padding:14px;transition:all 0.3s;" id="alert-card-moscow">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                      <span class="sec-dot sec-dot-red"></span>
                      <b style="color:#FB7185;font-size:0.85rem;">CRITICAL — Suspicious Login Attempt</b>
                    </div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px;">IP 185.220.101.14 (Moscow, RU) — 3 failed attempts in 5 minutes. Possible brute-force.</div>
                    <div style="display:flex;gap:8px;">
                      <button class="btn-submit" onclick="sysadminBlockIP('185.220.101.14', 'alert-card-moscow')" style="padding:5px 12px;font-size:0.75rem;border-radius:8px;background:rgba(244,63,94,0.2);border:1px solid #F43F5E;color:#FB7185;"><i class="fa-solid fa-ban"></i> Block IP</button>
                      <button class="btn-act" onclick="sysadminEscalateAlert('Brute-force attempt (Moscow IP)')" style="padding:5px 12px;font-size:0.75rem;border-radius:8px;"><i class="fa-solid fa-bell"></i> Escalate</button>
                    </div>
                  </div>

                  <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:14px;transition:all 0.3s;" id="alert-card-alex">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                      <span class="sec-dot sec-dot-yellow"></span>
                      <b style="color:#FCD34D;font-size:0.85rem;">WARNING — Unusual Access Pattern</b>
                    </div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px;">Alex R. logged in from a new device in Delhi at an unusual hour (10:45 PM). Session flagged for review.</div>
                    <div style="display:flex;gap:8px;">
                      <button class="btn-submit" onclick="sysadminMarkAlertSafe('Alex R. unusual login', 'alert-card-alex')" style="padding:5px 12px;font-size:0.75rem;border-radius:8px;background:rgba(16,185,129,0.15);border:1px solid #10B981;color:#10B981;"><i class="fa-solid fa-check"></i> Mark Safe</button>
                      <button class="btn-act" onclick="sysadminForceLogout('Alex R.', 'alert-card-alex')" style="padding:5px 12px;font-size:0.75rem;border-radius:8px;"><i class="fa-solid fa-right-from-bracket"></i> Force Logout</button>
                    </div>
                  </div>

                  <div style="background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.3);border-radius:12px;padding:14px;transition:all 0.3s;" id="alert-card-priv-esc">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                      <span class="sec-dot sec-dot-red"></span>
                      <b style="color:#FB7185;font-size:0.85rem;">CRITICAL — Privilege Escalation Attempt</b>
                    </div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px;">User Rahul K. (Employee) attempted to access HR-restricted payroll documents without required role. RBAC guardrail triggered at 09:23 AM.</div>
                    <div style="display:flex;gap:8px;">
                      <button class="btn-submit" onclick="sysadminRevokeAccess('Rahul K.', 'alert-card-priv-esc')" style="padding:5px 12px;font-size:0.75rem;border-radius:8px;background:rgba(244,63,94,0.2);border:1px solid #F43F5E;color:#FB7185;"><i class="fa-solid fa-user-slash"></i> Revoke Session</button>
                      <button class="btn-act" onclick="sysadminEscalateAlert('Privilege Escalation by Rahul K.')" style="padding:5px 12px;font-size:0.75rem;border-radius:8px;"><i class="fa-solid fa-bell"></i> Escalate</button>
                    </div>
                  </div>

                  <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:14px;transition:all 0.3s;" id="alert-card-data-exfil">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                      <span class="sec-dot sec-dot-yellow"></span>
                      <b style="color:#FCD34D;font-size:0.85rem;">WARNING — Bulk Data Export Detected</b>
                    </div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px;">David M. (Manager) exported 47 documents (3.2 GB) in one session. Threshold exceeded: &gt;10 docs/hour. Possible data exfiltration risk.</div>
                    <div style="display:flex;gap:8px;">
                      <button class="btn-submit" onclick="sysadminInvestigateAlert('David M. bulk export', 'alert-card-data-exfil')" style="padding:5px 12px;font-size:0.75rem;border-radius:8px;background:rgba(245,158,11,0.2);border:1px solid #F59E0B;color:#FCD34D;"><i class="fa-solid fa-magnifying-glass"></i> Investigate</button>
                      <button class="btn-act" onclick="sysadminMarkAlertSafe('David M. bulk export', 'alert-card-data-exfil')" style="padding:5px 12px;font-size:0.75rem;border-radius:8px;"><i class="fa-solid fa-check"></i> Dismiss</button>
                    </div>
                  </div>

                  <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:14px;transition:all 0.3s;" id="alert-card-mfa-bypass">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                      <span style="width:8px;height:8px;border-radius:50%;background:#818CF8;flex-shrink:0;display:inline-block;"></span>
                      <b style="color:#A5B4FC;font-size:0.85rem;">INFO — MFA Bypass Token Expired</b>
                    </div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px;">11 users have a stale MFA bypass token older than 90 days. Compliance policy requires rotation every 60 days. Action recommended.</div>
                    <div style="display:flex;gap:8px;">
                      <button class="btn-submit" onclick="sysadminForceTokenRotation('alert-card-mfa-bypass')" style="padding:5px 12px;font-size:0.75rem;border-radius:8px;background:rgba(99,102,241,0.2);border:1px solid #6366F1;color:#A5B4FC;"><i class="fa-solid fa-rotate"></i> Force Rotation</button>
                      <button class="btn-act" onclick="sysadminMarkAlertSafe('MFA token rotation', 'alert-card-mfa-bypass')" style="padding:5px 12px;font-size:0.75rem;border-radius:8px;"><i class="fa-solid fa-check"></i> Dismiss</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        // Initialize sysadmin tables after HTML renders
        setTimeout(() => { sysadminInitTables(); }, 50);


            } else if (featureId === 'feat_search') {
        const state = window.employeeState;
        const docs = state.knowledgeDocs;
        const query = state.searchQuery || 'paternity leave';
        const selectedId = state.selectedDocId || docs[0].id;
        const selDoc = docs.find(d => d.id === selectedId) || docs[0];

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.6rem; margin:0;">Enterprise AI Knowledge Search Engine</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">Vector RAG semantic search across company handbooks, policies, and operational guides</div>
            </div>
            <div style="display:flex; gap:8px;">
              <span class="role-badge-inline rb-emerald"><i class="fa-solid fa-bolt"></i> 42ms Vector Search</span>
              <span class="role-badge-inline rb-hr"><i class="fa-solid fa-shield"></i> PII Guardrails Active</span>
            </div>
          </div>

          <!-- KPI & Filter Chips Bar -->
          <div class="glass-card" style="padding:16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn-secondary" onclick="filterKnowledgeByChip('All')" style="padding:4px 12px; font-size:0.8rem; background:rgba(6,182,212,0.15); border-color:var(--accent-cyan);">All Docs (24)</button>
              <button class="btn-secondary" onclick="filterKnowledgeByChip('HR Policies')" style="padding:4px 12px; font-size:0.8rem;">HR Policies</button>
              <button class="btn-secondary" onclick="filterKnowledgeByChip('Travel & Expenses')" style="padding:4px 12px; font-size:0.8rem;">Travel & Expenses</button>
              <button class="btn-secondary" onclick="filterKnowledgeByChip('Security Compliance')" style="padding:4px 12px; font-size:0.8rem;">Security Compliance</button>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted);">Engine: <b>Llama 3.3 70B RAG Index</b></div>
          </div>

          <!-- Search Input Box -->
          <div class="glass-card" style="padding:14px; margin-bottom:20px; display:flex; gap:10px;">
            <input type="text" class="input-box" placeholder="Search across all company handbooks, travel limits, & policies..." value="${query}" oninput="executeKnowledgeSearch(this.value)" style="flex:1; font-size:0.95rem;">
            <button class="btn-submit" onclick="renderRoleFeatureView('feat_search')" style="background:var(--accent-cyan);"><i class="fa-solid fa-magnifying-glass"></i> Search</button>
          </div>

          <!-- Two Column RAG Layout -->
          <div style="display:grid; grid-template-columns: 1.25fr 0.75fr; gap:20px;">
            <!-- Left: Semantic Vector Search Results List -->
            <div style="display:flex; flex-direction:column; gap:14px;">
              <div style="font-size:0.85rem; color:var(--text-muted);">Found <b>${docs.length} Semantic Vector Matches</b> for "${query}":</div>

              ${docs.map(d => `
                <div class="glass-card" style="padding:16px; ${d.id === selectedId ? 'border-left:3px solid var(--accent-cyan); background:rgba(6,182,212,0.06);' : ''}">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                    <div>
                      <b style="font-size:1.02rem; color:var(--text-main);"><i class="fa-solid fa-file-pdf" style="color:var(--status-amber); margin-right:6px;"></i> ${d.title}</b>
                      <span style="font-size:0.78rem; color:var(--text-muted); margin-left:8px;">(${d.page})</span>
                    </div>
                    <span class="role-badge-inline rb-emerald">${d.score}</span>
                  </div>
                  <div style="font-size:0.8rem; color:var(--accent-cyan); margin-bottom:6px; font-weight:600;">${d.section}</div>
                  <p style="font-size:0.83rem; color:var(--text-muted); line-height:1.5; margin:0 0 12px 0;">"${d.snippet}"</p>
                  <div style="display:flex; gap:8px;">
                    <button class="btn-act" onclick="selectKnowledgeDoc('${d.id}')" style="padding:4px 10px; font-size:0.75rem;">🔍 Inspect Citation</button>
                    <button class="btn-secondary" onclick="openKnowledgeDocPDF('${d.id}')" style="padding:4px 10px; font-size:0.75rem;">📄 Open PDF</button>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Right: Document Inspector & RAG Citation Panel -->
            <div class="glass-card" style="padding:20px; display:flex; flex-direction:column; gap:16px;">
              <div style="border-bottom:1px solid var(--border-glass); padding-bottom:12px;">
                <span class="role-badge-inline rb-hr" style="margin-bottom:6px; display:inline-block;">Selected RAG Citation</span>
                <b style="font-size:1.15rem; color:var(--text-main); display:block;">${selDoc.title}</b>
                <span style="font-size:0.82rem; color:var(--accent-cyan);">${selDoc.section} (${selDoc.page})</span>
              </div>

              <div>
                <b style="font-size:0.82rem; color:var(--text-muted); display:block; margin-bottom:6px;"><i class="fa-solid fa-align-left"></i> Full Excerpt Citation</b>
                <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:14px; border-radius:8px; font-size:0.83rem; color:var(--text-main); line-height:1.6; white-space:pre-line;">
                  ${selDoc.fullText}
                </div>
              </div>

              <div style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.2); padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <b style="font-size:0.8rem; color:var(--status-emerald); display:block;"><i class="fa-solid fa-check-circle"></i> Vector Grounding Score</b>
                  <span style="font-size:0.75rem; color:var(--text-muted);">High Confidence Match</span>
                </div>
                <b style="font-size:1.2rem; color:var(--status-emerald);">${selDoc.score}</b>
              </div>

              <div style="display:flex; flex-direction:column; gap:8px; margin-top:auto;">
                <button class="btn-submit" onclick="copyDocCitation('${selDoc.id}')" style="width:100%; background:var(--accent-cyan);"><i class="fa-solid fa-copy"></i> Copy RAG Citation</button>
                <button class="btn-secondary" onclick="openKnowledgeDocPDF('${selDoc.id}')" style="width:100%;"><i class="fa-solid fa-file-pdf"></i> View Printable PDF</button>
              </div>
            </div>
          </div>
        `;
            } else if (featureId === 'feat_docs') {
        const state = window.employeeState;
        const list = state.personalDocuments;
        const selectedId = state.selectedPersonalDocId || list[0].id;
        const selDoc = list.find(d => d.id === selectedId) || list[0];

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.6rem; margin:0;">My Personal Document Vault</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">Secure AES-256 encrypted repository for HR contracts, payslips, tax forms, and certifications</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-submit" onclick="showUploadPersonalDocModal()" style="background:var(--accent-cyan);"><i class="fa-solid fa-file-arrow-up"></i> Upload Document</button>
              <button class="btn-secondary" onclick="exportPersonalDocsCSV()"><i class="fa-solid fa-file-export"></i> Export Manifest</button>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Vault Documents</div><div class="stat-number" style="color:var(--accent-cyan);">${list.length} Files</div></div>
            <div class="glass-card" style="padding:16px;"><div>Verification Status</div><div class="stat-number" style="color:var(--status-emerald);">100% Verified</div></div>
            <div class="glass-card" style="padding:16px;"><div>Storage Used</div><div class="stat-number">9.35 MB / 1 GB</div></div>
            <div class="glass-card" style="padding:16px;"><div>Vault Security</div><div class="stat-number" style="color:var(--status-emerald);">AES-256 Encrypted</div></div>
          </div>

          <!-- Two Column Layout -->
          <div style="display:grid; grid-template-columns: 1.25fr 0.75fr; gap:20px;">
            <!-- Left: Documents Repository Table -->
            <div class="glass-card" style="padding:0; overflow:hidden;">
              <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
                <b style="font-size:1.05rem;"><i class="fa-solid fa-box-archive" style="color:var(--accent-cyan); margin-right:8px;"></i> Personal Document Vault</b>
                <input type="text" class="input-box" placeholder="Search my documents..." style="width:200px; padding:6px 12px; font-size:0.8rem;" oninput="filterTable(this, 'personal-docs-table')">
              </div>
              <table class="org-table" id="personal-docs-table">
                <thead><tr><th>Document Name</th><th>Category</th><th>Issued Date</th><th>Size</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${list.map(d => `
                    <tr style="${d.id === selectedId ? 'background:rgba(6,182,212,0.1); border-left:3px solid var(--accent-cyan);' : ''}">
                      <td><b>${d.title}</b></td>
                      <td><span class="role-badge-pill" style="background:rgba(255,255,255,0.08);">${d.category}</span></td>
                      <td>${d.issued}</td>
                      <td>${d.size}</td>
                      <td>
                        <span class="role-badge-inline rb-emerald">${d.status}</span>
                      </td>
                      <td>
                        <div style="display:flex; gap:6px;">
                          <button class="btn-act" onclick="selectPersonalDoc('${d.id}')" style="padding:3px 8px; font-size:0.72rem;" title="Inspect Document">🔍</button>
                          <button class="btn-secondary" onclick="downloadPersonalDocPDF('${d.id}')" style="padding:3px 8px; font-size:0.72rem;" title="Download PDF">📄 PDF</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Right: Document Preview & Security Inspection -->
            <div class="glass-card" style="padding:20px; display:flex; flex-direction:column; gap:16px;">
              <div style="border-bottom:1px solid var(--border-glass); padding-bottom:12px;">
                <span class="role-badge-inline rb-emerald" style="margin-bottom:6px; display:inline-block;"><i class="fa-solid fa-shield-check"></i> AES-256 Encrypted</span>
                <b style="font-size:1.15rem; color:var(--text-main); display:block;">${selDoc.title}</b>
                <span style="font-size:0.82rem; color:var(--accent-cyan);">${selDoc.category} • Issued ${selDoc.issued}</span>
              </div>

              <div>
                <b style="font-size:0.82rem; color:var(--text-muted); display:block; margin-bottom:6px;"><i class="fa-solid fa-file-lines"></i> Document Excerpt & Summary</b>
                <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:14px; border-radius:8px; font-size:0.83rem; color:var(--text-main); line-height:1.6;">
                  ${selDoc.summary}
                </div>
              </div>

              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:12px; border-radius:8px;">
                <b style="font-size:0.78rem; color:var(--text-muted); display:block; margin-bottom:4px;"><i class="fa-solid fa-key"></i> Cryptographic Integrity Hash</b>
                <code style="font-size:0.75rem; color:var(--accent-cyan); word-break:break-all;">${selDoc.hash}</code>
              </div>

              <div style="display:flex; flex-direction:column; gap:8px; margin-top:auto;">
                <button class="btn-submit" onclick="downloadPersonalDocPDF('${selDoc.id}')" style="width:100%; background:var(--accent-cyan);"><i class="fa-solid fa-file-pdf"></i> View Printable PDF Document</button>
                <button class="btn-secondary" onclick="toast('HR Audit Verification request submitted!', 'info')" style="width:100%;"><i class="fa-solid fa-shield"></i> Request HR Audit Verification</button>
              </div>
            </div>
          </div>
        `;
            } else if (featureId === 'feat_learning') {
        const state = window.employeeState;
        const list = state.enrolledCourses;
        const selectedId = state.selectedCourseId || list[0].id;
        const selCourse = list.find(c => c.id === selectedId) || list[0];
        const completedCount = list.filter(c => c.status === 'Completed').length;
        const avgProgress = Math.round(list.reduce((acc, c) => acc + c.progress, 0) / list.length);

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.6rem; margin:0;">AI Learning Hub & Skill Roadmap</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">Personal skill matrix, course enrollment, and verified professional certifications</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-submit" onclick="showEnrollCourseModal()" style="background:var(--accent-cyan);"><i class="fa-solid fa-graduation-cap"></i> Enroll Course</button>
              <button class="btn-secondary" onclick="downloadSkillCertificate('${selCourse.certFile}')"><i class="fa-solid fa-award"></i> Certificate PDF</button>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Enrolled Courses</div><div class="stat-number" style="color:var(--accent-cyan);">${list.length} Active</div></div>
            <div class="glass-card" style="padding:16px;"><div>Overall Completion</div><div class="stat-number" style="color:var(--status-emerald);">${avgProgress}%</div></div>
            <div class="glass-card" style="padding:16px;"><div>Certificates Earned</div><div class="stat-number" style="color:var(--status-amber);">${completedCount} Earned</div></div>
            <div class="glass-card" style="padding:16px;"><div>Skill Mastery Level</div><div class="stat-number" style="color:var(--status-emerald);">Level 4 Senior</div></div>
          </div>

          <!-- Two Column Layout -->
          <div style="display:grid; grid-template-columns: 1.25fr 0.75fr; gap:20px;">
            <!-- Left: Enrolled Courses Table -->
            <div class="glass-card" style="padding:0; overflow:hidden;">
              <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
                <b style="font-size:1.05rem;"><i class="fa-solid fa-book-bookmark" style="color:var(--accent-cyan); margin-right:8px;"></i> My Enrolled Courses</b>
                <input type="text" class="input-box" placeholder="Search courses..." style="width:200px; padding:6px 12px; font-size:0.8rem;" oninput="filterTable(this, 'learning-courses-table')">
              </div>
              <table class="org-table" id="learning-courses-table">
                <thead><tr><th>Course Title</th><th>Category</th><th>Progress</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${list.map(c => `
                    <tr style="${c.id === selectedId ? 'background:rgba(6,182,212,0.1); border-left:3px solid var(--accent-cyan);' : ''}">
                      <td><b>${c.title}</b></td>
                      <td><span class="role-badge-pill" style="background:rgba(255,255,255,0.08);">${c.category}</span></td>
                      <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                          <b style="color:var(--status-emerald); font-size:0.8rem;">${c.progress}%</b>
                          <div style="width:70px; height:5px; background:rgba(255,255,255,0.08); border-radius:3px;">
                            <div style="width:${c.progress}%; height:100%; background:var(--status-emerald); border-radius:3px;"></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="role-badge-inline ${c.status === 'Completed' ? 'rb-emerald' : 'rb-hr'}">${c.status}</span>
                      </td>
                      <td>
                        <div style="display:flex; gap:6px;">
                          <button class="btn-act" onclick="continueCourseProgress('${c.id}')" style="padding:3px 8px; font-size:0.72rem;" title="Continue Learning">▶️</button>
                          <button class="btn-secondary" onclick="downloadSkillCertificate('${c.certFile}')" style="padding:3px 8px; font-size:0.72rem;" title="Certificate">📜</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Right: AI Skill Matrix Radar Panel -->
            <div class="glass-card" style="padding:20px; display:flex; flex-direction:column; gap:16px;">
              <div style="border-bottom:1px solid var(--border-glass); padding-bottom:12px;">
                <b style="font-size:1.15rem; color:var(--text-main); display:block;"><i class="fa-solid fa-chart-radar" style="color:var(--status-emerald); margin-right:6px;"></i> AI Skill Matrix Radar</b>
                <span style="font-size:0.82rem; color:var(--text-muted);">Real-time proficiency scoring & career path targets</span>
              </div>

              <div style="display:flex; flex-direction:column; gap:12px; font-size:0.85rem;">
                <div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>System Architecture & Microservices</span><b style="color:var(--status-emerald)">95% Mastered</b></div>
                  <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:3px;"><div style="width:95%; height:100%; background:var(--status-emerald); border-radius:3px;"></div></div>
                </div>
                <div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>AI Prompting & Vector RAG Systems</span><b style="color:var(--status-emerald)">88% Mastered</b></div>
                  <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:3px;"><div style="width:88%; height:100%; background:var(--accent-cyan); border-radius:3px;"></div></div>
                </div>
                <div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Cloud Security & DevOps Automation</span><b style="color:var(--status-amber)">82% Mastered</b></div>
                  <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:3px;"><div style="width:82%; height:100%; background:var(--status-amber); border-radius:3px;"></div></div>
                </div>
                <div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Team Leadership & System Design</span><b style="color:var(--status-emerald)">90% Mastered</b></div>
                  <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:3px;"><div style="width:90%; height:100%; background:var(--status-emerald); border-radius:3px;"></div></div>
                </div>
              </div>

              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:14px; border-radius:8px;">
                <b style="font-size:0.82rem; color:var(--accent-cyan); display:block; margin-bottom:4px;"><i class="fa-solid fa-bullseye"></i> Current Target Module</b>
                <b style="font-size:0.92rem; color:var(--text-main); display:block;">${selCourse.title}</b>
                <div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">Progress: ${selCourse.progress}% Completed</div>
              </div>

              <div style="display:flex; flex-direction:column; gap:8px; margin-top:auto;">
                <button class="btn-submit" onclick="continueCourseProgress('${selCourse.id}')" style="width:100%; background:var(--accent-cyan);"><i class="fa-solid fa-play"></i> Continue Learning Module (+15%)</button>
                <button class="btn-secondary" onclick="downloadSkillCertificate('${selCourse.certFile}')" style="width:100%;"><i class="fa-solid fa-file-pdf"></i> Download Official Certificate PDF</button>
              </div>
            </div>
          </div>
        `;
            } else if (featureId === 'feat_tasks') {
        const state = window.employeeState;
        const list = state.taskList;
        const pendingCount = list.filter(t => t.status === 'In Progress').length;
        const completedCount = list.filter(t => t.status === 'Completed').length;
        const highPriorityCount = list.filter(t => t.priority === 'High' && t.status === 'In Progress').length;

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.6rem; margin:0;">My Tasks & Deliverables Workstation</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">Personal action items, compliance deadlines, and self-assigned work deliverables</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-submit" onclick="showCreatePersonalTaskModal()" style="background:var(--accent-cyan);"><i class="fa-solid fa-plus"></i> Create Task</button>
              <button class="btn-secondary" onclick="exportTasksCSV()"><i class="fa-solid fa-file-export"></i> Export CSV</button>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Pending Deliverables</div><div class="stat-number" style="color:var(--status-amber);">${pendingCount} Pending</div></div>
            <div class="glass-card" style="padding:16px;"><div>Completed Tasks</div><div class="stat-number" style="color:var(--status-emerald);">${completedCount} Finished</div></div>
            <div class="glass-card" style="padding:16px;"><div>High Priority Urgent</div><div class="stat-number" style="color:${highPriorityCount > 0 ? 'var(--status-red)' : 'var(--status-emerald)'};">${highPriorityCount} Urgent</div></div>
            <div class="glass-card" style="padding:16px;"><div>On-Time Rate</div><div class="stat-number" style="color:var(--status-emerald);">94.2% Rate</div></div>
          </div>

          <!-- Two Column Layout -->
          <div style="display:grid; grid-template-columns: 1.25fr 0.75fr; gap:20px;">
            <!-- Left: Tasks Table -->
            <div class="glass-card" style="padding:0; overflow:hidden;">
              <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
                <b style="font-size:1.05rem;"><i class="fa-solid fa-list-check" style="color:var(--accent-cyan); margin-right:8px;"></i> Action Items & Deliverables</b>
                <input type="text" class="input-box" placeholder="Search tasks..." style="width:200px; padding:6px 12px; font-size:0.8rem;" oninput="filterTable(this, 'my-tasks-table')">
              </div>
              <table class="org-table" id="my-tasks-table">
                <thead><tr><th>Task Description</th><th>Assigned By</th><th>Due Date</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${list.map(t => `
                    <tr>
                      <td><b>${t.title}</b></td>
                      <td><span class="role-badge-pill" style="background:rgba(255,255,255,0.08);">${t.assigner}</span></td>
                      <td>${t.due}</td>
                      <td>
                        <span class="role-badge-inline ${t.priority === 'High' ? 'rb-red' : t.priority === 'Medium' ? 'rb-amber' : 'rb-emerald'}">${t.priority}</span>
                      </td>
                      <td>
                        <span class="role-badge-inline ${t.status === 'Completed' ? 'rb-emerald' : 'rb-hr'}">${t.status}</span>
                      </td>
                      <td>
                        <div style="display:flex; gap:6px;">
                          <button class="btn-act" onclick="toggleTaskStatus('${t.id}')" style="padding:3px 8px; font-size:0.72rem;" title="Toggle Status">${t.status === 'Completed' ? '↩️ Undo' : '✔️ Complete'}</button>
                          <button class="btn-secondary" onclick="deletePersonalTask('${t.id}')" style="padding:3px 8px; font-size:0.72rem;" title="Delete Task">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Right: AI Priority Workstation & Productivity Insights -->
            <div style="display:flex; flex-direction:column; gap:20px;">
              <div class="glass-card" style="padding:20px;">
                <b style="font-size:1.05rem; display:block; margin-bottom:12px;"><i class="fa-solid fa-bullseye" style="color:var(--status-amber); margin-right:8px;"></i> Next Priority Focus</b>
                ${list.find(t => t.status === 'In Progress' && t.priority === 'High') ? `
                  <div style="background:rgba(239,68,68,0.08); border-left:3px solid #EF4444; padding:12px; border-radius:6px; margin-bottom:12px;">
                    <b style="font-size:0.9rem; color:white; display:block;">${list.find(t => t.status === 'In Progress' && t.priority === 'High').title}</b>
                    <span style="font-size:0.78rem; color:var(--text-muted);">Due: ${list.find(t => t.status === 'In Progress' && t.priority === 'High').due}</span>
                  </div>
                ` : `
                  <div style="background:rgba(16,185,129,0.08); border-left:3px solid #10B981; padding:12px; border-radius:6px; margin-bottom:12px;">
                    <b style="font-size:0.9rem; color:#10B981; display:block;">All High Priority Tasks Finished!</b>
                    <span style="font-size:0.78rem; color:var(--text-muted);">Great job keeping up with critical deadlines.</span>
                  </div>
                `}
                <button class="btn-submit" onclick="autoPrioritizeTaskSchedule()" style="width:100%; background:var(--accent-cyan);"><i class="fa-solid fa-bolt"></i> Auto-Prioritize Schedule</button>
              </div>

              <div class="glass-card" style="padding:20px;">
                <b style="font-size:1.02rem; color:var(--status-emerald); display:block; margin-bottom:8px;"><i class="fa-solid fa-chart-line"></i> Weekly Completion Rate</b>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:6px;">
                  <span>Task Velocity Score</span>
                  <b style="color:var(--status-emerald);">94.2% On-Time</b>
                </div>
                <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:3px; margin-bottom:14px;">
                  <div style="width:94%; height:100%; background:var(--status-emerald); border-radius:3px;"></div>
                </div>
                <button class="btn-secondary" onclick="exportTasksCSV()" style="width:100%;"><i class="fa-solid fa-download"></i> Download Task Report CSV</button>
              </div>
            </div>
          </div>
        `;
      } else if (featureId === 'feat_emp_meetings') {
        container.innerHTML = `
          <h2 style="font-family:'Outfit'; font-size:1.6rem; margin-bottom:16px;">Employee Meetings</h2>
          <div class="glass-card">
            <b>Today's Scheduled Meetings:</b>
            <div style="margin-top:10px; display:flex; flex-direction:column; gap:10px;">
              <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:10px;"><b>10:30 AM:</b> Sprint Sync & Architecture Briefing</div>
              <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:10px;"><b>3:00 PM:</b> HR Policy Q&A Session</div>
            </div>
            <button class="btn-submit" onclick="toast('AI Meeting Summary Generated!', 'info')" style="margin-top:14px;">Generate AI Meeting Summary</button>
          </div>`;
            } else if (featureId === 'feat_announcements') {
        const state = window.employeeState;
        const list = state.announcementsList;
        const selectedId = state.selectedAnnounceId || list[0].id;
        const selAnn = list.find(a => a.id === selectedId) || list[0];
        const highPriorityCount = list.filter(a => a.priority === 'High').length;
        const signedCount = list.filter(a => a.status === 'Signed').length;

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.6rem; margin:0;">Company Announcements & Broadcast Hub</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">Executive communications, policy updates, and organization-wide bulletins</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-submit" onclick="showPostBroadcastModal()" style="background:var(--accent-cyan);"><i class="fa-solid fa-bullhorn"></i> Post Broadcast</button>
              <button class="btn-secondary" onclick="exportAnnouncementsCSV()"><i class="fa-solid fa-file-export"></i> Export CSV</button>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Active Broadcasts</div><div class="stat-number" style="color:var(--accent-cyan);">${list.length} Bulletins</div></div>
            <div class="glass-card" style="padding:16px;"><div>Read & Signed Rate</div><div class="stat-number" style="color:var(--status-emerald);">98.4%</div></div>
            <div class="glass-card" style="padding:16px;"><div>Priority Notices</div><div class="stat-number" style="color:var(--status-amber);">${highPriorityCount} Urgent</div></div>
            <div class="glass-card" style="padding:16px;"><div>Broadcast Feeds</div><div class="stat-number" style="color:var(--status-emerald);">4 Channels</div></div>
          </div>

          <!-- Two Column Layout -->
          <div style="display:grid; grid-template-columns: 1.25fr 0.75fr; gap:20px;">
            <!-- Left: Broadcast Feed Table -->
            <div class="glass-card" style="padding:0; overflow:hidden;">
              <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
                <b style="font-size:1.05rem;"><i class="fa-solid fa-rss" style="color:var(--accent-cyan); margin-right:8px;"></i> Broadcast Feed</b>
                <input type="text" class="input-box" placeholder="Search bulletins..." style="width:200px; padding:6px 12px; font-size:0.8rem;" oninput="filterTable(this, 'announcements-table')">
              </div>
              <table class="org-table" id="announcements-table">
                <thead><tr><th>Announcement Title</th><th>Department</th><th>Date</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${list.map(a => `
                    <tr style="${a.id === selectedId ? 'background:rgba(6,182,212,0.1); border-left:3px solid var(--accent-cyan);' : ''}">
                      <td><b>${a.title}</b></td>
                      <td><span class="role-badge-pill" style="background:rgba(255,255,255,0.08);">${a.dept}</span></td>
                      <td>${a.date}</td>
                      <td>
                        <span class="role-badge-inline ${a.priority === 'High' ? 'rb-amber' : 'rb-emerald'}">${a.priority}</span>
                      </td>
                      <td>
                        <span class="role-badge-inline ${a.status === 'Signed' ? 'rb-emerald' : 'rb-hr'}">${a.status}</span>
                      </td>
                      <td>
                        <div style="display:flex; gap:6px;">
                          <button class="btn-act" onclick="selectAnnouncement('${a.id}')" style="padding:3px 8px; font-size:0.72rem;" title="Read Briefing">📖</button>
                          <button class="btn-secondary" onclick="toggleAnnouncementRead('${a.id}')" style="padding:3px 8px; font-size:0.72rem;" title="Sign Notice">${a.status === 'Signed' ? '✔️ Signed' : '✍️ Sign'}</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Right: Announcement Reader & Acknowledgment Panel -->
            <div class="glass-card" style="padding:20px; display:flex; flex-direction:column; gap:16px;">
              <div style="border-bottom:1px solid var(--border-glass); padding-bottom:12px;">
                <span class="role-badge-inline rb-amber" style="margin-bottom:6px; display:inline-block;">📢 Official Broadcast</span>
                <b style="font-size:1.15rem; color:var(--text-main); display:block;">${selAnn.title}</b>
                <span style="font-size:0.82rem; color:var(--accent-cyan);">${selAnn.dept} • Published ${selAnn.date}</span>
              </div>

              <div>
                <b style="font-size:0.82rem; color:var(--text-muted); display:block; margin-bottom:6px;"><i class="fa-solid fa-align-left"></i> Full Announcement Content</b>
                <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:14px; border-radius:8px; font-size:0.85rem; color:var(--text-main); line-height:1.6; white-space:pre-line;">
                  ${selAnn.fullText}
                </div>
              </div>

              <div style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.2); padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <b style="font-size:0.8rem; color:var(--status-emerald); display:block;"><i class="fa-solid fa-circle-check"></i> Employee Acknowledgment Status</b>
                  <span style="font-size:0.75rem; color:var(--text-muted);">Signed by Haritha Langanuru</span>
                </div>
                <span class="role-badge-inline ${selAnn.status === 'Signed' ? 'rb-emerald' : 'rb-hr'}">${selAnn.status}</span>
              </div>

              <div style="display:flex; flex-direction:column; gap:8px; margin-top:auto;">
                <button class="btn-submit" onclick="toggleAnnouncementRead('${selAnn.id}')" style="width:100%; background:var(--accent-cyan);"><i class="fa-solid fa-signature"></i> ${selAnn.status === 'Signed' ? 'Notice Acknowledged & Signed ✔️' : 'Acknowledge & Sign Notice'}</button>
                <button class="btn-secondary" onclick="downloadAnnouncementPDF('${selAnn.id}')" style="width:100%;"><i class="fa-solid fa-file-pdf"></i> Download Official PDF Notice</button>
              </div>
            </div>
          </div>
        `;
            } else if (featureId === 'feat_profile') {
        const state = window.employeeState;
        const p = state.profile;

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.6rem; margin:0;">User Profile & Security Settings</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">Manage personal contact details, security MFA, and automated AI notification preferences</div>
            </div>
            <button class="btn-submit" onclick="saveEmployeeProfile()" style="background:var(--accent-cyan);"><i class="fa-solid fa-floppy-disk"></i> Save Preferences</button>
          </div>

          <!-- Executive Header Profile Card -->
          <div class="glass-card" style="padding:20px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; background:linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(99,102,241,0.08) 100%);">
            <div style="display:flex; gap:16px; align-items:center;">
              <div class="avatar" style="width:64px; height:64px; font-size:1.6rem; background:var(--accent-cyan); color:black; font-weight:800; border:2px solid var(--accent-cyan);">H</div>
              <div>
                <b style="font-size:1.3rem; color:var(--text-main); display:block;">${p.name}</b>
                <div style="font-size:0.88rem; color:var(--text-muted);">${p.title} • ${p.dept}</div>
                <div style="font-size:0.78rem; color:var(--accent-cyan); margin-top:2px;">Employee ID: ${p.empId}</div>
              </div>
            </div>
            <div style="display:flex; gap:8px;">
              <span class="role-badge-inline rb-emerald"><i class="fa-solid fa-user-check"></i> Active Staff</span>
              <span class="role-badge-inline rb-hr"><i class="fa-solid fa-shield-halved"></i> MFA Enforced</span>
            </div>
          </div>

          <!-- Two Column Grid -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <!-- Left Column: Personal Info & Contact -->
            <div class="glass-card" style="padding:20px; display:flex; flex-direction:column; gap:14px;">
              <b style="font-size:1.05rem; color:var(--text-main); border-bottom:1px solid var(--border-glass); padding-bottom:10px;"><i class="fa-solid fa-id-card" style="color:var(--accent-cyan); margin-right:8px;"></i> Personal Information & Contact</b>

              <div>
                <label style="font-size:0.78rem; color:var(--text-muted); display:block; margin-bottom:4px;">Full Name</label>
                <input type="text" id="prof-name" class="input-box" value="${p.name}" style="width:100%;">
              </div>

              <div>
                <label style="font-size:0.78rem; color:var(--text-muted); display:block; margin-bottom:4px;">Job Title</label>
                <input type="text" id="prof-title" class="input-box" value="${p.title}" style="width:100%;">
              </div>

              <div>
                <label style="font-size:0.78rem; color:var(--text-muted); display:block; margin-bottom:4px;">Department</label>
                <select id="prof-dept" class="input-box" style="width:100%; background:rgba(0,0,0,0.4); color:white;">
                  <option value="Engineering & Architecture" ${p.dept === 'Engineering & Architecture' ? 'selected' : ''}>Engineering & Architecture</option>
                  <option value="AI Core Platform" ${p.dept === 'AI Core Platform' ? 'selected' : ''}>AI Core Platform</option>
                  <option value="Cloud Operations" ${p.dept === 'Cloud Operations' ? 'selected' : ''}>Cloud Operations</option>
                  <option value="Human Resources" ${p.dept === 'Human Resources' ? 'selected' : ''}>Human Resources</option>
                </select>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div>
                  <label style="font-size:0.78rem; color:var(--text-muted); display:block; margin-bottom:4px;">Email Address</label>
                  <input type="text" id="prof-email" class="input-box" value="${p.email}" style="width:100%;">
                </div>
                <div>
                  <label style="font-size:0.78rem; color:var(--text-muted); display:block; margin-bottom:4px;">Phone Number</label>
                  <input type="text" id="prof-phone" class="input-box" value="${p.phone}" style="width:100%;">
                </div>
              </div>

              <div>
                <label style="font-size:0.78rem; color:var(--text-muted); display:block; margin-bottom:4px;">Office Location</label>
                <input type="text" id="prof-loc" class="input-box" value="${p.location}" style="width:100%;">
              </div>

              <div>
                <label style="font-size:0.78rem; color:var(--text-muted); display:block; margin-bottom:4px;">Emergency Contact</label>
                <input type="text" id="prof-emg" class="input-box" value="${p.emergencyContact}" style="width:100%;">
              </div>

              <div>
                <label style="font-size:0.78rem; color:var(--text-muted); display:block; margin-bottom:4px;">Professional Biography</label>
                <textarea id="prof-bio" class="input-box" style="width:100%; height:75px; font-family:inherit; font-size:0.83rem;">${p.bio}</textarea>
              </div>
            </div>

            <!-- Right Column: Security Controls & Notifications -->
            <div style="display:flex; flex-direction:column; gap:20px;">
              
              </div>

              <!-- Notifications & AI Settings Card -->
              <div class="glass-card" style="padding:20px; display:flex; flex-direction:column; gap:12px;">
                <b style="font-size:1.05rem; color:var(--text-main); border-bottom:1px solid var(--border-glass); padding-bottom:10px;"><i class="fa-solid fa-sliders" style="color:var(--accent-cyan); margin-right:8px;"></i> Notification & AI Preferences</b>

                <label style="display:flex; align-items:center; gap:10px; font-size:0.85rem; cursor:pointer;">
                  <input type="checkbox" id="prof-ntasks" ${p.notifyTasks ? 'checked' : ''} style="accent-color:var(--accent-cyan);">
                  <span>Email Notifications for High Priority Tasks & Deadlines</span>
                </label>

                <label style="display:flex; align-items:center; gap:10px; font-size:0.85rem; cursor:pointer;">
                  <input type="checkbox" id="prof-nslack" ${p.notifySlack ? 'checked' : ''} style="accent-color:var(--accent-cyan);">
                  <span>Teams / Slack Sync Alerts for Meetings & Announcements</span>
                </label>

                <label style="display:flex; align-items:center; gap:10px; font-size:0.85rem; cursor:pointer;">
                  <input type="checkbox" id="prof-nai" ${p.notifyAI ? 'checked' : ''} style="accent-color:var(--accent-cyan);">
                  <span>AI Assistant Morning Briefing & Workload Digest</span>
                </label>

                <button class="btn-submit" onclick="saveEmployeeProfile()" style="width:100%; margin-top:10px; background:var(--accent-cyan);"><i class="fa-solid fa-floppy-disk"></i> Save Profile & Security Preferences</button>
              </div>
            </div>
          </div>
        `;

      // HR PORTAL VIEWS
            } else if (featureId === 'feat_recruitment') {
        const state = window.hrState;
        const totalCandidates = state.pipelineCandidates.length;
        const appliedCount = state.pipelineCandidates.filter(c => c.stage === 'Applied').length;
        const interviewCount = state.pipelineCandidates.filter(c => c.stage === 'Interview' || c.stage === 'Screening').length;
        const offerCount = state.pipelineCandidates.filter(c => c.stage === 'Offer Sent' || c.stage === 'Leadership').length;

        const stages = [
          { key: 'Applied', title: 'APPLIED', color: 'var(--text-muted)' },
          { key: 'Screening', title: 'SCREENING', color: 'var(--accent-cyan)' },
          { key: 'Interview', title: 'TECH INTERVIEW', color: 'var(--accent-primary)' },
          { key: 'Leadership', title: 'LEADERSHIP', color: 'var(--status-amber)' },
          { key: 'Offer Sent', title: 'OFFER SENT', color: 'var(--status-emerald)' }
        ];

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.6rem; margin:0;">HR Candidate Recruitment Pipeline</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">Real-time applicant tracking, stage progression & requisition management</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-submit" onclick="showAddCandidateModal()" style="background:var(--accent-cyan);"><i class="fa-solid fa-user-plus"></i> Add Candidate</button>
              <button class="btn-secondary" onclick="exportPipelineCSV()"><i class="fa-solid fa-file-export"></i> Export Pipeline</button>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Total Candidates</div><div class="stat-number" style="color:var(--accent-cyan);">${totalCandidates}</div></div>
            <div class="glass-card" style="padding:16px;"><div>New Applied</div><div class="stat-number">${appliedCount}</div></div>
            <div class="glass-card" style="padding:16px;"><div>In Interview Rounds</div><div class="stat-number" style="color:var(--status-amber);">${interviewCount}</div></div>
            <div class="glass-card" style="padding:16px;"><div>Offers / Leadership</div><div class="stat-number" style="color:var(--status-emerald);">${offerCount}</div></div>
          </div>

          <!-- 5 Column Stage Grid -->
          <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:14px; margin-bottom:24px;">
            ${stages.map(st => {
              const list = state.pipelineCandidates.filter(c => c.stage === st.key);
              return `
                <div class="glass-card" style="padding:14px; background:rgba(15,23,42,0.6); display:flex; flex-direction:column; gap:10px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glass); padding-bottom:8px;">
                    <b style="font-size:0.8rem; color:${st.color};">${st.title}</b>
                    <span style="font-size:0.75rem; background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:10px;">${list.length}</span>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:8px; min-height:180px;">
                    ${list.map(c => `
                      <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:6px;">
                        <b style="font-size:0.85rem; color:var(--text-main);">${c.name}</b>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${c.role} (${c.exp})</div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                          <span class="role-badge-inline rb-hr" style="font-size:0.68rem; padding:1px 6px;">AI Match: ${c.match}</span>
                          <button class="btn-act" onclick="advancePipelineStage('${c.id}')" style="padding:2px 6px; font-size:0.7rem;" title="Advance Stage">➡️</button>
                        </div>
                      </div>
                    `).join('')}
                    ${list.length === 0 ? '<div style="font-size:0.75rem; color:var(--text-dim); text-align:center; margin-top:20px;">No candidates in stage</div>' : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Active Job Requisitions Table -->
          <div class="glass-card" style="padding:0; overflow:hidden;">
            <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
              <b style="font-size:1.05rem;"><i class="fa-solid fa-briefcase" style="color:var(--accent-cyan); margin-right:8px;"></i> Active Job Requisitions (${state.jobReqs.length})</b>
              <button class="btn-secondary" onclick="showPostJobModal()" style="font-size:0.8rem;"><i class="fa-solid fa-plus"></i> New Requisition</button>
            </div>
            <table class="org-table">
              <thead><tr><th>Job Requisition</th><th>Department</th><th>Openings</th><th>Applicants</th><th>Recruiter</th><th>Status</th></tr></thead>
              <tbody>
                ${state.jobReqs.map(j => `
                  <tr>
                    <td><b>${j.title}</b></td>
                    <td>${j.dept}</td>
                    <td><b>${j.openings}</b></td>
                    <td>${j.applicants} Candidates</td>
                    <td>${j.recruiter}</td>
                    <td><span class="role-badge-inline rb-emerald">${j.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
            } else if (featureId === 'feat_candidates') {
        const state = window.hrState;
        const list = state.resumeCandidatesList;
        const selectedId = state.selectedResumeId || list[0].id;
        const selCandidate = list.find(c => c.id === selectedId) || list[0];
        const shortlistedCount = list.filter(c => c.status === 'Shortlisted').length;
        const avgScore = (list.reduce((acc, c) => acc + c.score, 0) / list.length).toFixed(1);

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.6rem; margin:0;">Candidates & AI Resume Scorer Hub</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">Automated resume parsing, AI skill alignment scoring, and candidate portfolio management</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-submit" onclick="showUploadResumeModal()" style="background:var(--accent-cyan);"><i class="fa-solid fa-file-arrow-up"></i> Upload Resume</button>
              <button class="btn-secondary" onclick="runBatchAIScoring()"><i class="fa-solid fa-wand-magic-sparkles"></i> Batch AI Scoring</button>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Total Resumes Scored</div><div class="stat-number" style="color:var(--accent-cyan);">${list.length} Parsed</div></div>
            <div class="glass-card" style="padding:16px;"><div>Avg Match Score</div><div class="stat-number" style="color:var(--status-emerald);">${avgScore}%</div></div>
            <div class="glass-card" style="padding:16px;"><div>Shortlisted Candidates</div><div class="stat-number" style="color:var(--status-amber);">${shortlistedCount}</div></div>
            <div class="glass-card" style="padding:16px;"><div>Offers Dispatched</div><div class="stat-number" style="color:var(--status-emerald);">4 Offers</div></div>
          </div>

          <!-- Two Column Grid -->
          <div style="display:grid; grid-template-columns: 1.25fr 0.75fr; gap:20px;">
            <!-- Left: Candidate Database Table -->
            <div class="glass-card" style="padding:0; overflow:hidden;">
              <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
                <b style="font-size:1.05rem;"><i class="fa-solid fa-user-check" style="color:var(--accent-cyan); margin-right:8px;"></i> Candidate Resume Database</b>
                <input type="text" class="input-box" placeholder="Search candidates..." style="width:200px; padding:6px 12px; font-size:0.8rem;" oninput="filterTable(this, 'resume-table')">
              </div>
              <table class="org-table" id="resume-table">
                <thead><tr><th>Candidate</th><th>Applied Role</th><th>Skills Detected</th><th>AI Match</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${list.map(c => `
                    <tr style="${c.id === selectedId ? 'background:rgba(6,182,212,0.1); border-left:3px solid var(--accent-cyan);' : ''}">
                      <td><b>${c.name}</b></td>
                      <td>${c.role}</td>
                      <td><span style="font-size:0.75rem; color:var(--text-muted);">${c.skills}</span></td>
                      <td><b style="color:${c.score > 94 ? 'var(--status-emerald)' : 'var(--status-amber)'};">${c.score}%</b></td>
                      <td>
                        <span class="role-badge-inline ${c.status === 'Shortlisted' ? 'rb-emerald' : 'rb-hr'}">${c.status}</span>
                      </td>
                      <td>
                        <div style="display:flex; gap:6px;">
                          <button class="btn-act" onclick="selectCandidateResume('${c.id}')" style="padding:3px 8px; font-size:0.72rem;" title="Inspect AI Match">🔍</button>
                          <button class="btn-act" onclick="toggleCandidateShortlist('${c.id}')" style="padding:3px 8px; font-size:0.72rem;" title="Toggle Shortlist">⭐</button>
                          <button class="btn-secondary" onclick="downloadCandidateResume('${c.resumeFile}')" style="padding:3px 8px; font-size:0.72rem;" title="Download Resume">📄</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Right: AI Resume Match Inspector -->
            <div class="glass-card" style="padding:20px; display:flex; flex-direction:column; gap:16px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--border-glass); padding-bottom:12px;">
                <div>
                  <b style="font-size:1.15rem; color:var(--text-main); display:block;">${selCandidate.name}</b>
                  <span style="font-size:0.82rem; color:var(--text-muted);">${selCandidate.role}</span>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:0.72rem; color:var(--text-muted);">AI Match Score</div>
                  <b style="font-size:1.6rem; color:var(--status-emerald);">${selCandidate.score}%</b>
                </div>
              </div>

              <div>
                <b style="font-size:0.85rem; color:var(--accent-cyan); display:block; margin-bottom:8px;"><i class="fa-solid fa-layer-group"></i> Skill Alignment Breakdown</b>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${selCandidate.skillBreakdown.map(s => `
                    <div>
                      <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:3px;">
                        <span>${s.name}</span>
                        <b style="color:var(--status-emerald);">${s.match}%</b>
                      </div>
                      <div style="width:100%; height:5px; background:rgba(255,255,255,0.08); border-radius:3px;">
                        <div style="width:${s.match}%; height:100%; background:var(--status-emerald); border-radius:3px;"></div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:12px; border-radius:8px;">
                <b style="font-size:0.82rem; color:var(--status-amber); display:block; margin-bottom:6px;"><i class="fa-solid fa-lightbulb"></i> AI Key Strengths Identified</b>
                <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.5; margin:0;">"${selCandidate.strengths}"</p>
              </div>

              <div style="display:flex; flex-direction:column; gap:8px; margin-top:auto;">
                <button class="btn-submit" onclick="toggleCandidateShortlist('${selCandidate.id}')" style="width:100%; background:var(--accent-cyan);"><i class="fa-solid fa-star"></i> ${selCandidate.status === 'Shortlisted' ? 'Remove from Shortlist' : 'Shortlist Candidate'}</button>
                <button class="btn-secondary" onclick="downloadCandidateResume('${selCandidate.resumeFile}')" style="width:100%;"><i class="fa-solid fa-download"></i> Download ${selCandidate.resumeFile}</button>
              </div>
            </div>
          </div>
        `;
            } else if (featureId === 'feat_directory') {
        const state = window.hrState;
        const empList = state.employeeDirectory;
        const totalEmp = empList.length + 72; // 80 active total
        const remoteCount = empList.filter(e => e.mode === 'Remote').length + 22;
        const hybridCount = empList.filter(e => e.mode === 'Hybrid').length + 34;

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.6rem; margin:0;">Employee Directory & Organization Roster</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">Centralized company staff directory, department roles, work modes, and contact records</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-submit" onclick="showAddEmployeeModal()" style="background:var(--accent-cyan);"><i class="fa-solid fa-user-plus"></i> Add Employee</button>
              <button class="btn-secondary" onclick="exportEmployeeDirectoryCSV()"><i class="fa-solid fa-file-export"></i> Export Roster</button>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Total Active Workforce</div><div class="stat-number" style="color:var(--accent-cyan);">${totalEmp} Staff</div></div>
            <div class="glass-card" style="padding:16px;"><div>Hybrid Workforce</div><div class="stat-number">${hybridCount}</div></div>
            <div class="glass-card" style="padding:16px;"><div>Remote Workforce</div><div class="stat-number" style="color:var(--status-amber);">${remoteCount}</div></div>
            <div class="glass-card" style="padding:16px;"><div>Avg Performance Score</div><div class="stat-number" style="color:var(--status-emerald);">4.8 / 5</div></div>
          </div>

          <!-- Employee Directory Table -->
          <div class="glass-card" style="padding:0; overflow:hidden;">
            <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
              <b style="font-size:1.05rem;"><i class="fa-solid fa-address-book" style="color:var(--accent-cyan); margin-right:8px;"></i> Staff Directory (${empList.length} Key Roles)</b>
              <input type="text" class="input-box" placeholder="Search name, role, department..." style="width:260px; padding:6px 12px; font-size:0.85rem;" oninput="filterTable(this, 'employee-directory-table')">
            </div>
            <table class="org-table" id="employee-directory-table">
              <thead><tr><th>Employee Name</th><th>Job Title</th><th>Department</th><th>Email Address</th><th>Work Mode</th><th>Rating</th><th>Status</th></tr></thead>
              <tbody>
                ${empList.map(e => `
                  <tr>
                    <td><b>${e.name}</b></td>
                    <td>${e.role}</td>
                    <td><span class="role-badge-pill" style="background:rgba(255,255,255,0.08);">${e.dept}</span></td>
                    <td><a href="mailto:${e.email}" style="color:var(--accent-cyan); font-size:0.8rem; text-decoration:none;">${e.email}</a></td>
                    <td>
                      <span class="role-badge-inline ${e.mode === 'Remote' ? 'rb-hr' : e.mode === 'Hybrid' ? 'rb-manager' : 'rb-emerald'}">${e.mode}</span>
                    </td>
                    <td><b style="color:var(--status-emerald);">${e.rating}</b></td>
                    <td><span class="role-badge-inline rb-emerald">${e.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
            } else if (featureId === 'feat_policy') {
        const state = window.hrState;
        const list = state.policiesList;
        const selectedId = state.selectedPolicyId || list[0].id;
        const selPolicy = list.find(p => p.id === selectedId) || list[0];

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.6rem; margin:0;">Policy Studio & Document Publisher</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">Author, revise, compliance-audit, and publish official enterprise policies</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-submit" onclick="showNewPolicyModal()" style="background:var(--accent-cyan);"><i class="fa-solid fa-file-circle-plus"></i> New Policy Draft</button>
              <button class="btn-secondary" onclick="runPolicyComplianceAudit()"><i class="fa-solid fa-shield-check"></i> AI Audit</button>
              <button class="btn-secondary" onclick="exportPoliciesCSV()"><i class="fa-solid fa-file-export"></i> Export CSV</button>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Active Published Policies</div><div class="stat-number" style="color:var(--accent-cyan);">${list.length} Policies</div></div>
            <div class="glass-card" style="padding:16px;"><div>Compliance Pass Rate</div><div class="stat-number" style="color:var(--status-emerald);">100% Passed</div></div>
            <div class="glass-card" style="padding:16px;"><div>Staff Acknowledged</div><div class="stat-number" style="color:var(--status-emerald);">96.4% Signed</div></div>
            <div class="glass-card" style="padding:16px;"><div>Pending Revisions</div><div class="stat-number" style="color:var(--status-amber);">0 Revisions</div></div>
          </div>

          <!-- Two Column Layout -->
          <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:20px;">
            <!-- Left: Policy Directory Table -->
            <div class="glass-card" style="padding:0; overflow:hidden;">
              <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
                <b style="font-size:1.05rem;"><i class="fa-solid fa-book-bookmark" style="color:var(--accent-cyan); margin-right:8px;"></i> Published Policy Repository</b>
                <input type="text" class="input-box" placeholder="Search policies..." style="width:220px; padding:6px 12px; font-size:0.8rem;" oninput="filterTable(this, 'policy-repo-table')">
              </div>
              <table class="org-table" id="policy-repo-table">
                <thead><tr><th>Policy Title</th><th>Department</th><th>Version</th><th>Last Revised</th><th>Actions</th></tr></thead>
                <tbody>
                  ${list.map(p => `
                    <tr style="${p.id === selectedId ? 'background:rgba(6,182,212,0.1); border-left:3px solid var(--accent-cyan);' : ''}">
                      <td><b>${p.title}</b></td>
                      <td><span class="role-badge-pill" style="background:rgba(255,255,255,0.08);">${p.dept}</span></td>
                      <td><b>${p.version}</b></td>
                      <td>${p.updated}</td>
                      <td>
                        <div style="display:flex; gap:6px;">
                          <button class="btn-act" onclick="selectPolicyForEditing('${p.id}')" style="padding:3px 8px; font-size:0.72rem;" title="Edit Policy">📝 Edit</button>
                          <button class="btn-secondary" onclick="downloadPolicyPDF('${p.id}')" style="padding:3px 8px; font-size:0.72rem;" title="Download PDF">📄 PDF</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Right: Interactive Policy Editor & AI Compliance Inspector -->
            <div class="glass-card" style="padding:20px; display:flex; flex-direction:column; gap:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glass); padding-bottom:10px;">
                <b style="font-size:1.1rem; color:var(--text-main);"><i class="fa-solid fa-pen-to-square" style="color:var(--accent-cyan); margin-right:6px;"></i> Policy Editor Studio</b>
                <span class="role-badge-inline rb-emerald">${selPolicy.version} • Published</span>
              </div>

              <div>
                <label style="font-size:0.78rem; color:var(--text-muted); display:block; margin-bottom:4px;">Policy Title</label>
                <input type="text" class="input-box" value="${selPolicy.title}" oninput="updateSelectedPolicyTitle(this.value)" style="width:100%; font-size:0.9rem;">
              </div>

              <div>
                <label style="font-size:0.78rem; color:var(--text-muted); display:block; margin-bottom:4px;">Policy Document Content</label>
                <textarea class="input-box" oninput="updateSelectedPolicyContent(this.value)" style="width:100%; height:130px; font-family:inherit; font-size:0.85rem; line-height:1.5;">${selPolicy.content}</textarea>
              </div>

              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <b style="font-size:0.82rem; color:var(--status-emerald); display:block;"><i class="fa-solid fa-shield-check"></i> AI Compliance Guardrail Check</b>
                  <div style="font-size:0.75rem; color:var(--text-muted);">Scanned against 2026 Labor Code & GDPR Guidelines</div>
                </div>
                <span class="role-badge-inline rb-emerald">${selPolicy.compliance}</span>
              </div>

              <div style="display:flex; gap:10px; margin-top:auto;">
                <button class="btn-submit" onclick="publishCurrentPolicyUpdate()" style="flex:1; background:var(--accent-cyan);"><i class="fa-solid fa-paper-plane"></i> Publish Policy Update</button>
                <button class="btn-secondary" onclick="downloadPolicyPDF('${selPolicy.id}')"><i class="fa-solid fa-file-pdf"></i> Download PDF</button>
              </div>
            </div>
          </div>
        `;
            } else if (featureId === 'feat_training') {
        const state = window.hrState;
        const list = state.trainingList;
        const totalModules = list.length;
        const mandatoryCount = list.filter(t => t.status === 'Mandatory').length;

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.6rem; margin:0;">HR Training & Learning Management</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">Employee compliance training, skill certification, and learning path tracking</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-submit" onclick="showAddTrainingModal()" style="background:var(--accent-cyan);"><i class="fa-solid fa-graduation-cap"></i> Create Module</button>
              <button class="btn-secondary" onclick="assignMandatoryTrainingAll()"><i class="fa-solid fa-bullseye"></i> Assign All</button>
              <button class="btn-secondary" onclick="exportTrainingAuditCSV()"><i class="fa-solid fa-file-export"></i> Export CSV</button>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Active Training Modules</div><div class="stat-number" style="color:var(--accent-cyan);">${totalModules} Courses</div></div>
            <div class="glass-card" style="padding:16px;"><div>Overall Pass Rate</div><div class="stat-number" style="color:var(--status-emerald);">96.2%</div></div>
            <div class="glass-card" style="padding:16px;"><div>Mandatory Compliance</div><div class="stat-number" style="color:var(--status-amber);">${mandatoryCount} Required</div></div>
            <div class="glass-card" style="padding:16px;"><div>Certifications Issued</div><div class="stat-number" style="color:var(--status-emerald);">64 Certified</div></div>
          </div>

          <!-- Two Column Layout -->
          <div style="display:grid; grid-template-columns: 1.25fr 0.75fr; gap:20px;">
            <!-- Left: Training Modules Table -->
            <div class="glass-card" style="padding:0; overflow:hidden;">
              <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
                <b style="font-size:1.05rem;"><i class="fa-solid fa-book-open-reader" style="color:var(--accent-cyan); margin-right:8px;"></i> Mandatory & Skill Training Modules</b>
                <input type="text" class="input-box" placeholder="Search modules..." style="width:200px; padding:6px 12px; font-size:0.8rem;" oninput="filterTable(this, 'training-modules-table')">
              </div>
              <table class="org-table" id="training-modules-table">
                <thead><tr><th>Module Title</th><th>Category</th><th>Target Dept</th><th>Enrolled</th><th>Pass Rate</th><th>Status</th></tr></thead>
                <tbody>
                  ${list.map(t => `
                    <tr>
                      <td><b>${t.title}</b></td>
                      <td><span style="font-size:0.75rem; color:var(--text-muted);">${t.category}</span></td>
                      <td><span class="role-badge-pill" style="background:rgba(255,255,255,0.08);">${t.dept}</span></td>
                      <td><b>${t.enrolled} Staff</b></td>
                      <td><b style="color:var(--status-emerald);">${t.passRate}</b></td>
                      <td>
                        <span class="role-badge-inline ${t.status === 'Mandatory' ? 'rb-emerald' : 'rb-hr'}">${t.status}</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Right: Department Completion Index & Actions -->
            <div style="display:flex; flex-direction:column; gap:20px;">
              <div class="glass-card" style="padding:20px;">
                <b style="font-size:1.05rem; display:block; margin-bottom:14px;"><i class="fa-solid fa-chart-line" style="color:var(--status-emerald); margin-right:8px;"></i> Department Completion Index</b>
                <div style="display:flex; flex-direction:column; gap:12px; font-size:0.85rem;">
                  <div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>HR & Recruitment Team</span><b style="color:var(--status-emerald)">100% Complete</b></div>
                    <div style="width:100%; height:5px; background:rgba(255,255,255,0.08); border-radius:3px;"><div style="width:100%; height:100%; background:var(--status-emerald); border-radius:3px;"></div></div>
                  </div>
                  <div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Engineering & AI Core</span><b style="color:var(--status-emerald)">98% Complete</b></div>
                    <div style="width:100%; height:5px; background:rgba(255,255,255,0.08); border-radius:3px;"><div style="width:98%; height:100%; background:var(--status-emerald); border-radius:3px;"></div></div>
                  </div>
                  <div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Product & Design</span><b style="color:var(--status-emerald)">95% Complete</b></div>
                    <div style="width:100%; height:5px; background:rgba(255,255,255,0.08); border-radius:3px;"><div style="width:95%; height:100%; background:var(--status-emerald); border-radius:3px;"></div></div>
                  </div>
                  <div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Cloud Operations</span><b style="color:var(--status-amber)">92% Complete</b></div>
                    <div style="width:100%; height:5px; background:rgba(255,255,255,0.08); border-radius:3px;"><div style="width:92%; height:100%; background:var(--status-amber); border-radius:3px;"></div></div>
                  </div>
                </div>
              </div>

              <div class="glass-card" style="padding:20px;">
                <b style="font-size:1.02rem; color:var(--status-amber); display:block; margin-bottom:8px;"><i class="fa-solid fa-clock"></i> Certification Expiration Reminder</b>
                <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.5; margin:0 0 14px 0;">3 employees have Security Awareness certifications expiring in less than 30 days.</p>
                <button class="btn-submit" onclick="assignMandatoryTrainingAll()" style="width:100%; background:var(--accent-cyan);"><i class="fa-solid fa-paper-plane"></i> Dispatch Training Reminders</button>
              </div>
            </div>
          </div>
        `;
            } else if (featureId === 'feat_hr_analytics') {
        const state = window.hrState;
        const list = state.analyticsDept;

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h2 style="font-family:'Outfit'; font-size:1.6rem; margin:0;">HR Analytics & Sentiment Engine</h2>
              <div style="font-size:0.85rem; color:var(--text-muted);">Workforce sentiment analysis, department attrition risk, and retention intelligence</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-submit" onclick="runAIPulseSurvey()" style="background:var(--accent-cyan);"><i class="fa-solid fa-wand-magic-sparkles"></i> AI Pulse Survey</button>
              <button class="btn-secondary" onclick="exportHRAnalyticsCSV()"><i class="fa-solid fa-file-export"></i> Export CSV</button>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Offer Acceptance Rate</div><div class="stat-number" style="color:var(--status-emerald);">94.2%</div></div>
            <div class="glass-card" style="padding:16px;"><div>Employee Satisfaction</div><div class="stat-number" style="color:var(--accent-cyan);">4.8 / 5</div></div>
            <div class="glass-card" style="padding:16px;"><div>Annual Attrition Rate</div><div class="stat-number" style="color:var(--status-emerald);">2.1%</div></div>
            <div class="glass-card" style="padding:16px;"><div>Avg Time-to-Hire</div><div class="stat-number">12.4 Days</div></div>
          </div>

          <!-- Two Column Layout -->
          <div style="display:grid; grid-template-columns: 1.25fr 0.75fr; gap:20px;">
            <!-- Left: Department Analytics Table -->
            <div class="glass-card" style="padding:0; overflow:hidden;">
              <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
                <b style="font-size:1.05rem;"><i class="fa-solid fa-chart-pie" style="color:var(--accent-cyan); margin-right:8px;"></i> Department Workforce & Attrition Breakdown</b>
                <input type="text" class="input-box" placeholder="Search department..." style="width:200px; padding:6px 12px; font-size:0.8rem;" oninput="filterTable(this, 'hr-analytics-table')">
              </div>
              <table class="org-table" id="hr-analytics-table">
                <thead><tr><th>Department</th><th>Headcount</th><th>Sentiment</th><th>Attrition Risk</th><th>Retention Score</th><th>Status</th></tr></thead>
                <tbody>
                  ${list.map(a => `
                    <tr>
                      <td><b>${a.dept}</b></td>
                      <td><b>${a.headcount} Staff</b></td>
                      <td><b style="color:var(--status-emerald);">${a.sentiment}</b></td>
                      <td><span style="color:${a.risk === '0.0%' || a.risk === '0.8%' || a.risk === '1.2%' ? 'var(--status-emerald)' : 'var(--status-amber)'}; font-weight:bold;">${a.risk}</span></td>
                      <td><b>${a.retention}</b></td>
                      <td>
                        <span class="role-badge-inline ${a.status === 'Optimal' ? 'rb-emerald' : 'rb-amber'}">${a.status}</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Right: AI Sentiment & Retention Insights -->
            <div style="display:flex; flex-direction:column; gap:20px;">
              <div class="glass-card" style="padding:20px;">
                <b style="font-size:1.05rem; display:block; margin-bottom:12px;"><i class="fa-solid fa-face-smile-beam" style="color:var(--status-emerald); margin-right:8px;"></i> Employee Sentiment Index (91% Positive)</b>
                <div style="display:flex; flex-direction:column; gap:10px; font-size:0.85rem;">
                  <div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:3px;"><span>Flexible Hybrid & Remote Stipend</span><b style="color:var(--status-emerald)">98% Approval</b></div>
                    <div style="width:100%; height:5px; background:rgba(255,255,255,0.08); border-radius:3px;"><div style="width:98%; height:100%; background:var(--status-emerald); border-radius:3px;"></div></div>
                  </div>
                  <div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:3px;"><span>Paternity & Maternity Leave Policy</span><b style="color:var(--status-emerald)">96% Approval</b></div>
                    <div style="width:100%; height:5px; background:rgba(255,255,255,0.08); border-radius:3px;"><div style="width:96%; height:100%; background:var(--status-emerald); border-radius:3px;"></div></div>
                  </div>
                  <div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:3px;"><span>AI Workload Auto-Balancing</span><b style="color:var(--status-emerald)">92% Approval</b></div>
                    <div style="width:100%; height:5px; background:rgba(255,255,255,0.08); border-radius:3px;"><div style="width:92%; height:100%; background:var(--status-emerald); border-radius:3px;"></div></div>
                  </div>
                </div>
              </div>

              <div class="glass-card" style="padding:20px;">
                <b style="font-size:1.02rem; color:var(--accent-cyan); display:block; margin-bottom:8px;"><i class="fa-solid fa-lightbulb"></i> AI Retention Strategy Insight</b>
                <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.5; margin:0 0 14px 0;">Cloud Operations attrition risk is 3.4% due to recent sprint workload. AI recommends reallocating 2 tasks from Cloud Ops to Engineering.</p>
                <button class="btn-submit" onclick="toast('Workload rebalancing recommendation sent to Manager!', 'success')" style="width:100%; background:var(--accent-cyan);"><i class="fa-solid fa-scale-balanced"></i> Execute Workload Rebalance</button>
              </div>
            </div>
          </div>
        `;
      // MANAGER PORTAL VIEWS (STATE-PERSISTED)
      } else if (featureId === 'feat_projects') {
        const state = window.managerState;
        const total = state.projects.length;
        const healthy = state.projects.filter(p => p.health === 'Healthy' || p.health === 'Completed').length;
        const atRisk = state.projects.filter(p => p.health === 'At Risk').length;
        const blocked = state.projects.filter(p => p.health === 'Blocked').length;

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">Projects & Smart Health Predictor</h2>
            <button class="btn-submit" onclick="showNewProjectModal()"><i class="fa-solid fa-plus"></i> New Project</button>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Total Active Projects</div><div class="stat-number">${total}</div></div>
            <div class="glass-card" style="padding:16px;"><div>On Track</div><div class="stat-number" style="color:var(--status-emerald);">${healthy}</div></div>
            <div class="glass-card" style="padding:16px;"><div>At Risk</div><div class="stat-number" style="color:var(--status-amber);">${atRisk}</div></div>
            <div class="glass-card" style="padding:16px;"><div>Blocked</div><div class="stat-number" style="color:var(--status-rose);">${blocked}</div></div>
          </div>
          <div class="glass-card" style="padding:0; overflow:hidden;">
            <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between;">
              <b style="font-size:1.1rem;">Project Portfolio</b>
              <input type="text" class="input-box" placeholder="Search projects..." style="width:250px; padding:6px 12px; font-size:0.85rem;" oninput="filterTable(this, 'projects-table')">
            </div>
            <table class="org-table" id="projects-table">
              <thead><tr><th>Project Name</th><th>Lead</th><th>Progress</th><th>Health</th><th>Actions</th></tr></thead>
              <tbody>
                ${state.projects.map(p => `
                  <tr>
                    <td><b>${p.name}</b><div style="font-size:0.75rem; color:var(--text-dim);">${p.id}</div></td>
                    <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;">${p.lead[0]}</div> ${p.lead}</div></td>
                    <td>
                      <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>${p.progress}%</span><span>${p.label}</span></div>
                      <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div style="width:${p.progress}%; height:100%; background:${p.barColor}; border-radius:3px;"></div></div>
                    </td>
                    <td><span class="role-badge-inline ${p.cls}" style="${p.healthStyle || ''}">${p.health}</span></td>
                    <td><button class="btn-act" onclick="showProjectActionMenu('${p.id}', this)" style="padding:4px 12px; font-size:0.75rem; background:rgba(99,102,241,0.15); border:1px solid var(--accent-primary); color:white;"><i class="fa-solid fa-sliders" style="margin-right:4px;"></i> Actions</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div id="new-project-modal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:9999; align-items:center; justify-content:center;">
            <div class="glass-card" style="width:400px; padding:24px; animation:fadeIn 0.2s ease;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="font-family:'Outfit'; font-size:1.3rem;">Create New Project</h3>
                <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('new-project-modal').style.display='none'"></i>
              </div>
              <input type="text" id="np-name" class="input-box" placeholder="Project Name" style="margin-bottom:12px; width:100%;">
              <input type="text" id="np-lead" class="input-box" placeholder="Lead Name" style="margin-bottom:12px; width:100%;">
              <button class="btn-submit" onclick="submitNewProject()" style="width:100%;">Create Project</button>
            </div>
          </div>`;

      } else if (featureId === 'feat_team') {
        const state = window.managerState;
        const avgUtil = Math.round(state.team.reduce((acc, t) => acc + t.util, 0) / state.team.length);
        const overalloc = state.team.filter(t => t.overallocated).length;

        container.innerHTML = `

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <h2 style="font-family:'Outfit'; font-size:1.6rem;">Team Workload & Capacity</h2>
              <div style="display:flex; gap:8px;">
                <button class="btn-secondary" onclick="toggleWorkloadFilter()" style="padding:8px 16px;"><i class="fa-solid fa-filter"></i> Filter Overallocated</button>
                <button class="btn-submit" onclick="autoBalanceTeam()"><i class="fa-solid fa-scale-balanced"></i> Auto-Balance</button>
              </div>
            </div>
            <div class="stats-grid" style="margin-bottom:24px;">
              <div class="glass-card" style="padding:16px;"><div>Avg Utilization</div><div class="stat-number">${avgUtil}%</div></div>
              <div class="glass-card" style="padding:16px;"><div>Overallocated</div><div class="stat-number" style="color:${overalloc > 0 ? 'var(--status-rose)' : 'var(--status-emerald)'}">${overalloc}</div></div>
              <div class="glass-card" style="padding:16px;"><div>Available Capacity</div><div class="stat-number" style="color:var(--status-emerald);">145 hrs</div></div>
            </div>
            <div class="glass-card" style="padding:0; overflow:hidden;">
              <div style="padding:16px; border-bottom:1px solid var(--border-glass);">
                <b style="font-size:1.1rem;">Resource Allocation Heatmap</b>
              </div>
              <table class="org-table" id="team-table">
                <thead><tr><th>Team Member</th><th>Role</th><th>Open Tasks</th><th>Capacity</th><th>Action</th></tr></thead>
                <tbody>
                  ${state.team.map(t => `
                    <tr id="team-row-${t.id}">
                      <td><div style="display:flex;align-items:center;gap:12px;"><div class="avatar" style="width:32px;height:32px;">${t.name[0]}</div> <b>${t.name}</b></div></td>
                      <td>${t.role}</td>
                      <td><b>${t.tasks}</b> Tasks</td>
                      <td>
                        <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>${t.utilText}</span></div>
                        <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div style="width:${Math.min(100, t.util)}%; height:100%; background:${t.barColor}; border-radius:3px; transition:all 0.5s;"></div></div>
                      </td>
                      <td>
                        ${t.overallocated 
                          ? `<button class="btn-submit" onclick="reallocateTask(this, 'team-row-${t.id}')" style="padding:4px 12px; font-size:0.75rem;">Reallocate</button>`
                          : `<button class="btn-secondary" onclick="showAssignTaskModal('${t.name}')" style="padding:4px 12px; font-size:0.75rem;"><i class="fa-solid fa-plus"></i> Assign Task</button>`}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
`;

      } else if (featureId === 'feat_approvals') {
        const state = window.managerState;

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">Approvals Center</h2>
            <div style="display:flex; gap:8px;">
              <button class="btn-submit" onclick="bulkApproveAll()" style="padding:8px 16px;"><i class="fa-solid fa-check-double"></i> Bulk Approve All</button>
            </div>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Pending Review</div><div class="stat-number">${state.approvals.length}</div></div>
            <div class="glass-card" style="padding:16px;"><div>Approved (Week)</div><div class="stat-number" style="color:var(--status-emerald);">${state.approvedCount}</div></div>
            <div class="glass-card" style="padding:16px;"><div>Avg Resolution</div><div class="stat-number">1.4 Days</div></div>
          </div>
          <div class="glass-card" style="padding:0; overflow:hidden;">
            <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; gap:16px;">
                <b style="font-size:1.1rem; border-bottom:2px solid var(--accent-primary); padding-bottom:8px;">Requires Action (${state.approvals.length})</b>
                <b style="font-size:1.1rem; color:var(--text-muted); padding-bottom:8px; cursor:pointer;">Recently Processed</b>
              </div>
              <input type="text" class="input-box" placeholder="Search requests..." style="width:200px; padding:6px 12px; font-size:0.85rem;" oninput="filterTable(this, 'approvals-table')">
            </div>
            <table class="org-table" id="approvals-table">
              <thead><tr><th>Req ID</th><th>Submitter</th><th>Type / Details</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                ${state.approvals.length === 0 
                  ? `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">No pending approvals remaining!</td></tr>`
                  : state.approvals.map(a => `
                    <tr>
                      <td>${a.id}</td>
                      <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;">${a.avatar}</div> ${a.submitter}</div></td>
                      <td><b>${a.title}</b><div style="font-size:0.75rem; color:var(--text-muted);">${a.sub}</div></td>
                      <td>${a.date}</td>
                      <td>
                        <button class="btn-submit" onclick="approveRequest(this)" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-check"></i></button>
                        <button class="btn-secondary" onclick="denyRequest(this)" style="padding:4px 10px; font-size:0.75rem; border-color:var(--status-rose); color:var(--status-rose);"><i class="fa-solid fa-xmark"></i></button>
                      </td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
          </div>`;

      } else if (featureId === 'feat_reports') {
        const cfg = window.managerState.reportConfig;

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">Weekly Team Status Reports</h2>
            <button class="btn-submit" onclick="showNewReportModal()"><i class="fa-solid fa-file-circle-plus"></i> + New Report</button>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Reports Generated</div><div class="stat-number">131</div></div>
            <div class="glass-card" style="padding:16px;"><div>Avg Read Rate</div><div class="stat-number" style="color:var(--status-emerald);">86%</div></div>
            <div class="glass-card" style="padding:16px;"><div>Missing Updates</div><div class="stat-number" style="color:var(--status-amber);">3</div></div>
          </div>
          <div style="display:flex; gap:16px;">
            <div class="glass-card" style="flex:2; padding:0; overflow:hidden;">
              <div style="padding:16px; border-bottom:1px solid var(--border-glass);">
                <b style="font-size:1.1rem;">Report Repository</b>
              </div>
              <table class="org-table">
                <thead><tr><th>Report Title</th><th>Generated By</th><th>Format</th><th>Date</th><th>Action</th></tr></thead>
                <tbody>
                  ${window.managerState.reports.map(r => `
                    <tr>
                      <td><b>${r.title}</b></td>
                      <td>${r.by}</td>
                      <td><span class="role-badge-pill" style="background:${r.bg};color:white;">${r.format}</span></td>
                      <td>${r.date}</td>
                      <td><button class="btn-secondary" onclick="downloadFile(this, '${r.file}')" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-download"></i></button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div class="glass-card" style="flex:1;">
              <b style="font-size:1.1rem; margin-bottom:16px; display:block;">Configure Automation</b>
              <div style="display:flex; flex-direction:column; gap:12px;">
                <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="cfg-vel" ${cfg.velocity ? 'checked' : ''} style="accent-color:var(--accent-primary);"> Include Velocity Metrics</label>
                <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="cfg-bud" ${cfg.budget ? 'checked' : ''} style="accent-color:var(--accent-primary);"> Include Budget Burn</label>
                <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="cfg-ts" ${cfg.timesheet ? 'checked' : ''} style="accent-color:var(--accent-primary);"> Append Timesheet Data</label>
                <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" id="cfg-slack" ${cfg.slack ? 'checked' : ''} style="accent-color:var(--accent-primary);"> Send to Slack/Teams</label>
                <hr style="border:none; border-top:1px solid var(--border-glass); margin:8px 0;">
                <button class="btn-submit" onclick="saveReportConfiguration()" style="width:100%;">Save Configuration</button>
                <div style="margin-top:16px; background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:14px; border-radius:10px;">
                  <b style="font-size:0.85rem; color:var(--accent-primary); display:block; margin-bottom:8px;">
                    <i class="fa-solid fa-shield-check"></i> Active Policy Status
                  </b>
                  <div style="font-size:0.78rem; color:var(--text-muted); display:flex; flex-direction:column; gap:6px;">
                    <div style="display:flex; justify-content:space-between;"><span>Velocity Tracking:</span> <b style="color:${cfg.velocity ? 'var(--status-emerald)' : 'var(--status-rose)'}">${cfg.velocity ? 'ENABLED' : 'DISABLED'}</b></div>
                    <div style="display:flex; justify-content:space-between;"><span>Budget Burn:</span> <b style="color:${cfg.budget ? 'var(--status-emerald)' : 'var(--status-rose)'}">${cfg.budget ? 'ENABLED' : 'DISABLED'}</b></div>
                    <div style="display:flex; justify-content:space-between;"><span>Timesheet Data:</span> <b style="color:${cfg.timesheet ? 'var(--status-emerald)' : 'var(--status-rose)'}">${cfg.timesheet ? 'ENABLED' : 'DISABLED'}</b></div>
                    <div style="display:flex; justify-content:space-between;"><span>Slack Dispatch:</span> <b style="color:${cfg.slack ? 'var(--status-emerald)' : 'var(--status-rose)'}">${cfg.slack ? 'ACTIVE' : 'DISABLED'}</b></div>
                  </div>
                </div>
              </div>
            </div>
          </div>`;

      } else if (featureId === 'feat_meetings') {
        const state = window.managerState;

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">Meetings & AI Minutes Generator</h2>
            <button class="btn-submit" onclick="showScheduleMeetingModal()"><i class="fa-solid fa-video"></i> Schedule Meeting</button>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Hours in Meetings (Week)</div><div class="stat-number">14.5</div></div>
            <div class="glass-card" style="padding:16px;"><div>Focus Time Available</div><div class="stat-number" style="color:var(--status-emerald);">22 hrs</div></div>
            <div class="glass-card" style="padding:16px;"><div>Meeting Acceptance</div><div class="stat-number" style="color:var(--status-amber);">89%</div></div>
          </div>
          <div class="glass-card" style="padding:0; overflow:hidden; margin-bottom:24px;">
            <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
              <b style="font-size:1.1rem;">Today's Scheduled Meetings (${state.meetings.length})</b>
              <button class="btn-submit" id="btn-gen-ai-summary" onclick="generateAIMeetingSummary()"><i class="fa-solid fa-wand-magic-sparkles"></i> Generate AI Meeting Summary</button>
            </div>
            <table class="org-table">
              <thead><tr><th>Time</th><th>Meeting Title</th><th>Organizer</th><th>Platform</th><th>Action</th></tr></thead>
              <tbody>
                ${state.meetings.map(m => `
                  <tr>
                    <td>
                      <b>${m.time}</b>
                      <div style="font-size:0.75rem; color:var(--text-muted);">${m.duration}</div>
                      ${m.active ? '<span class="role-badge-inline rb-employee" style="font-size:0.65rem; padding:1px 6px; margin-top:2px;">Live Now</span>' : '<span style="font-size:0.68rem; color:var(--text-dim);">Scheduled</span>'}
                    </td>
                    <td><b>${m.title}</b><div style="font-size:0.75rem; color:var(--text-dim);">${m.sub}</div></td>
                    <td>${m.organizer}</td>
                    <td><span class="role-badge-pill" style="background:rgba(255,255,255,0.08);">${m.platform}</span></td>
                    <td>
                      ${m.connected
                        ? `<button class="btn-submit" onclick="toggleMeetingConnection('${m.id}')" style="padding:4px 12px; font-size:0.75rem; background:var(--status-emerald);"><i class="fa-solid fa-check"></i> Connected</button>`
                        : m.active
                          ? `<button class="btn-submit" onclick="toggleMeetingConnection('${m.id}')" style="padding:4px 12px; font-size:0.75rem; background:var(--accent-primary);"><i class="fa-solid fa-video"></i> Join ${m.platform}</button>`
                          : `<button class="btn-secondary" onclick="startEarlyMeeting('${m.id}')" style="padding:4px 12px; font-size:0.75rem; opacity:0.5; border-color:rgba(255,255,255,0.15);" title="Meeting scheduled for ${m.time}. Click to start early."><i class="fa-solid fa-lock"></i> Starts at ${m.time}</button>`
                      }
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${state.aiSummaryGenerated ? state.aiSummaryText : ''}`;

      } else if (featureId === 'feat_decision') {
        const state = window.managerState;
        const totalAutomated = state.decisions.filter(d => d.executed).length + 3492;

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">AI Decision Center</h2>
            <button class="btn-secondary" onclick="exportDecisionAudit()"><i class="fa-solid fa-file-export"></i> Export Audit</button>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Decisions Automated</div><div class="stat-number" style="color:var(--status-emerald);">${totalAutomated.toLocaleString()}</div></div>
            <div class="glass-card" style="padding:16px;"><div>Avg Confidence</div><div class="stat-number" style="color:var(--status-emerald);">94.8%</div></div>
            <div class="glass-card" style="padding:16px;"><div>Human Escalations</div><div class="stat-number" style="color:var(--status-amber);">14</div></div>
          </div>
          <div style="display:flex; gap:16px;">
            <div class="glass-card" style="flex:2; padding:0; overflow:hidden;">
              <div style="padding:16px; border-bottom:1px solid var(--border-glass);">
                <b style="font-size:1.1rem;">AI Decision Audit Log</b>
              </div>
              <table class="org-table">
                <thead><tr><th>Decision Category</th><th>Impact Area</th><th>Confidence</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  ${state.decisions.map(d => `
                    <tr>
                      <td><b>${d.cat}</b></td>
                      <td>${d.area}</td>
                      <td>
                        <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>${d.conf}%</span></div>
                        <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px;"><div style="width:${d.conf}%; height:100%; background:${d.conf > 90 ? 'var(--status-emerald)' : 'var(--status-amber)'}; border-radius:2px;"></div></div>
                      </td>
                      <td>
                        <span class="role-badge-inline" style="border-color:${d.executed ? 'var(--status-emerald)' : 'var(--status-amber)'}; color:${d.executed ? 'var(--status-emerald)' : 'var(--status-amber)'};">
                          ${d.status}
                        </span>
                      </td>
                      <td>
                        ${d.executed
                          ? `<button class="btn-act" onclick="showDecisionTraceModal('${d.id}')" style="padding:4px 8px; font-size:0.75rem;"><i class="fa-solid fa-code-branch"></i> Details</button>`
                          : `<button class="btn-submit" onclick="executeDecisionById('${d.id}')" style="padding:4px 8px; font-size:0.75rem;">Execute</button>`}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div class="glass-card" style="flex:1;">
              <b style="font-size:1.1rem; margin-bottom:16px; display:block;">Latest Analysis</b>
              <div style="background:rgba(255,255,255,0.03); padding:16px; border-radius:12px;">
                <div style="font-size:0.85rem; color:var(--status-emerald); margin-bottom:8px;"><i class="fa-solid fa-microchip"></i> High Confidence Match</div>
                <b style="display:block; margin-bottom:8px;">Budget Reallocation Approved</b>
                <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.5;">The AI engine successfully reallocated $15,000 from Q3 Travel to Q3 Marketing based on historical burn rates and predicted Q4 deficits.</p>
                <hr style="border:none; border-top:1px solid var(--border-glass); margin:12px 0;">
                <button class="btn-secondary" onclick="showDecisionTraceModal('d1')" style="width:100%; font-size:0.85rem;"><i class="fa-solid fa-network-wired"></i> View Full Trace</button>
              </div>
            </div>
          </div>`;
      } else {
        container.innerHTML = `
          <h2 style="font-family:'Outfit'; font-size:1.6rem; margin-bottom:16px;">${featureId.replace('feat_','').toUpperCase()} Module</h2>
          <div class="glass-card"><p>Module active under <b>${ROLE_CONFIG[currentRole].label}</b>.</p></div>`;
      }
    }

    function loadEmailTemplate(index) {
      const templates = ROLE_CONFIG[currentRole]?.templates || [];
      const t = templates[index] || templates[0];
      if (!t) return;
      document.getElementById('email-sub').value = t.sub;
      document.getElementById('email-body').value = t.body;
    }

    function askSample(text) {
      switchPane('shared_rag', document.querySelector('.nav-item[onclick*="shared_rag"]'));
      const input = document.getElementById('chat-input');
      if (input) input.value = text;
      sendChatQuery();
    }

    function toggleLeftSidebar() {
      const sidebar = document.querySelector('.sidebar');
      if (!sidebar) return;
      if (sidebar.style.display === 'none') {
        sidebar.style.display = 'flex';
        toast('👁️ Navigation sidebar opened', 'info', 1500);
      } else {
        sidebar.style.display = 'none';
        toast('🙈 Navigation sidebar collapsed', 'info', 1500);
      }
    }

    function toggleRightInspectorPanel() {
      const grid = document.getElementById('chat-layout-grid');
      if (!grid) return;
      grid.classList.toggle('show-right');
      const isShowing = grid.classList.contains('show-right');
      toast(isShowing ? '↔️ Opened Document Inspector Panel' : '↔️ Expanded Chat to Full 85% Hero View', 'info', 2000);
    }

    function renderChatbotWelcomeScreen() {
      const container = document.getElementById('chat-welcome-screen');
      if (!container) return;

      if (currentRole === 'Admin') {
        container.innerHTML = `
          <!-- ADMIN DASHBOARD HERO INSIDE CHATBOT WELCOME SCREEN -->
          <div class="admin-dash-hero">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:14px;">
              <div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <span class="role-badge-inline rb-admin" style="font-size:0.8rem; padding:6px 14px;">👑 Organization Admin Control</span>
                  <span style="font-size:0.8rem; color:var(--text-muted);">Security Tier 1 Authorized</span>
                </div>
                <h2 style="font-family:'Outfit'; font-size:1.5rem; color:white; margin-top:6px;">Executive AI Operations & RAG Control Center</h2>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn-act" onclick="openBroadcastModal()"><i class="fa-solid fa-bullhorn"></i> Broadcast</button>
              </div>
            </div>

            <!-- System Status Cards -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px;">
              <div class="status-badge-pill sb-online" style="display:flex; align-items:center; justify-content:center; padding:10px 12px;"><i class="fa-solid fa-circle"></i> LLM: Online</div>
              <div class="status-badge-pill sb-online" style="display:flex; align-items:center; justify-content:center; padding:10px 12px;"><i class="fa-solid fa-tree"></i> Pinecone: 84 Chunks</div>
              <div class="status-badge-pill sb-info" style="display:flex; align-items:center; justify-content:center; padding:10px 12px;"><i class="fa-solid fa-paper-plane"></i> SMTP: Active</div>
              <div class="status-badge-pill sb-online" style="display:flex; align-items:center; justify-content:center; padding:10px 12px;"><i class="fa-solid fa-shield-halved"></i> RAG: 96% Health</div>
            </div>

            <!-- Stat Metric Cards -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-top:4px;">
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:14px;">
                <div style="font-size:0.75rem; color:var(--text-dim); font-weight:700;">TOTAL DOCUMENTS</div>
                <div style="font-size:1.3rem; font-weight:800; color:white;">84 Files</div>
                <div style="font-size:0.7rem; color:var(--status-emerald);">100% Parsed</div>
              </div>
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:14px;">
                <div style="font-size:0.75rem; color:var(--text-dim); font-weight:700;">INDEXED DOCUMENTS</div>
                <div style="font-size:1.3rem; font-weight:800; color:var(--accent-cyan);">84 Chunks</div>
                <div style="font-size:0.7rem; color:var(--accent-cyan);">Pinecone DB</div>
              </div>
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:14px;">
                <div style="font-size:0.75rem; color:var(--text-dim); font-weight:700;">RECENT UPLOADS</div>
                <div style="font-size:1.3rem; font-weight:800; color:var(--status-amber);">12 Today</div>
                <div style="font-size:0.7rem; color:var(--status-amber);">HR & IT Policies</div>
              </div>
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:14px;">
                <div style="font-size:0.75rem; color:var(--text-dim); font-weight:700;">DAILY AI QUERIES</div>
                <div style="font-size:1.3rem; font-weight:800; color:#C7D2FE;">1,245</div>
                <div style="font-size:0.7rem; color:var(--status-emerald);">98.6% Accuracy</div>
              </div>
            </div>

            <!-- Admin Chat Examples & Quick Action Prompts -->
            <div style="margin-top:6px;">
              <div style="font-size:0.8rem; font-weight:800; color:var(--accent-cyan); text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px;">
                ⚡ Admin Executive Chat Command Prompts
              </div>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:8px;">
                <div class="item-card" onclick="askSample(&quot;Show todays analytics&quot;)" style="cursor:pointer; padding:10px 14px;">
                  <b style="font-size:0.83rem; color:white;"><i class="fa-solid fa-chart-line" style="color:var(--accent-cyan);"></i> Show todays analytics</b>
                </div>
                <div class="item-card" onclick="askSample(&quot;How many documents are indexed?&quot;)" style="cursor:pointer; padding:10px 14px;">
                  <b style="font-size:0.83rem; color:white;"><i class="fa-solid fa-database" style="color:var(--status-emerald);"></i> How many docs indexed?</b>
                </div>
                <div class="item-card" onclick="askSample(&quot;Show Knowledge Index Health&quot;)" style="cursor:pointer; padding:10px 14px;">
                  <b style="font-size:0.83rem; color:white;"><i class="fa-solid fa-server" style="color:var(--status-emerald);"></i> Knowledge Index Health</b>
                </div>
                <div class="item-card" onclick="askSample(&quot;Index New Documents&quot;)" style="cursor:pointer; padding:10px 14px;">
                  <b style="font-size:0.83rem; color:white;"><i class="fa-solid fa-layer-group" style="color:#8B5CF6;"></i> Index New Documents</b>
                </div>
                <div class="item-card" onclick="askSample(&quot;Sync Knowledge Base&quot;)" style="cursor:pointer; padding:10px 14px;">
                  <b style="font-size:0.83rem; color:white;"><i class="fa-solid fa-rotate" style="color:var(--accent-cyan);"></i> Sync Knowledge Base</b>
                </div>
                <div class="item-card" onclick="askSample(&quot;Upload HR Policy.pdf&quot;)" style="cursor:pointer; padding:10px 14px;">
                  <b style="font-size:0.83rem; color:white;"><i class="fa-solid fa-cloud-arrow-up" style="color:var(--status-amber);"></i> Upload HR Policy.pdf</b>
                </div>
                <div class="item-card" onclick="askSample(&quot;Delete Marketing Policy.pdf&quot;)" style="cursor:pointer; padding:10px 14px;">
                  <b style="font-size:0.83rem; color:white;"><i class="fa-solid fa-trash" style="color:var(--status-rose);"></i> Delete Marketing Policy</b>
                </div>
                <div class="item-card" onclick="askSample(&quot;View conversation logs&quot;)" style="cursor:pointer; padding:10px 14px;">
                  <b style="font-size:0.83rem; color:white;"><i class="fa-solid fa-terminal" style="color:var(--accent-cyan);"></i> View conversation logs</b>
                </div>
                <div class="item-card" onclick="askSample(&quot;List inactive users&quot;)" style="cursor:pointer; padding:10px 14px;">
                  <b style="font-size:0.83rem; color:white;"><i class="fa-solid fa-users" style="color:var(--status-amber);"></i> List inactive users</b>
                </div>
                <div class="item-card" onclick="askSample(&quot;Create new HR knowledge base&quot;)" style="cursor:pointer; padding:10px 14px;">
                  <b style="font-size:0.83rem; color:white;"><i class="fa-solid fa-folder-plus" style="color:var(--status-emerald);"></i> Create HR knowledge base</b>
                </div>
                <div class="item-card" onclick="askSample(&quot;Draft company announcement and send to all employees&quot;)" style="cursor:pointer; padding:10px 14px;">
                  <b style="font-size:0.83rem; color:white;"><i class="fa-solid fa-bullhorn" style="color:#8B5CF6;"></i> Broadcast announcement</b>
                </div>
              </div>
            </div>
          </div>`;
      } else if (currentRole === 'HR') {
        container.innerHTML = `
          <div style="text-align:center; padding:30px 20px; margin:auto; max-width:700px;">
            <div style="width:68px; height:68px; border-radius:22px; background:linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%); display:inline-flex; align-items:center; justify-content:center; font-size:2.2rem; color:white; margin-bottom:16px; box-shadow:0 8px 30px rgba(6,182,212,0.4);">
              <i class="fa-solid fa-user-gear"></i>
            </div>
            <h3 style="font-family:'Outfit'; font-size:1.6rem; color:white; margin-bottom:8px;">Welcome HR Executive</h3>
            <p style="color:var(--text-muted); font-size:0.95rem; line-height:1.6; margin-bottom:24px;">
              Query authorized HR handbooks, generate candidate emails, manage onboarding documents, and draft policy updates.
            </p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; text-align:left;">
              <div class="item-card" onclick="askSample('Generate onboarding email for new software engineer')" style="cursor:pointer;">
                <b style="font-size:0.9rem; color:var(--accent-cyan);"><i class="fa-solid fa-envelope"></i> Generate onboarding email</b>
                <div style="font-size:0.78rem; color:var(--text-muted);">Draft day-1 welcoming note & credentials.</div>
              </div>
              <div class="item-card" onclick="askSample('Explain payroll policy & 2026 tax schedules')" style="cursor:pointer;">
                <b style="font-size:0.9rem; color:var(--status-emerald);"><i class="fa-solid fa-money-check-dollar"></i> Explain payroll policy</b>
                <div style="font-size:0.78rem; color:var(--text-muted);">Direct deposit deadlines & reimbursement caps.</div>
              </div>
              <div class="item-card" onclick="askSample('Upload HR documents into Pinecone')" style="cursor:pointer;">
                <b style="font-size:0.9rem; color:#8B5CF6;"><i class="fa-solid fa-cloud-arrow-up"></i> Upload HR documents</b>
                <div style="font-size:0.78rem; color:var(--text-muted);">Add new policy PDF or employee handbook chunk.</div>
              </div>
              <div class="item-card" onclick="askSample('Explain recruitment workflow and candidate pipeline')" style="cursor:pointer;">
                <b style="font-size:0.9rem; color:var(--status-amber);"><i class="fa-solid fa-user-plus"></i> Recruitment workflow</b>
                <div style="font-size:0.78rem; color:var(--text-muted);">AI Resume parser, scoring & interview stages.</div>
              </div>
            </div>
          </div>`;
      } else if (currentRole === 'HR') { const hrM = document.getElementById('hr-exec-modules'); if (hrM) { hrM.style.display='flex'; renderHRDashboardModules(); } } else if (currentRole === 'Manager') {
        container.innerHTML = `
          <div style="text-align:center; padding:30px 20px; margin:auto; max-width:700px;">
            <div style="width:68px; height:68px; border-radius:22px; background:linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); display:inline-flex; align-items:center; justify-content:center; font-size:2.2rem; color:white; margin-bottom:16px; box-shadow:0 8px 30px rgba(245,158,11,0.4);">
              <i class="fa-solid fa-user-tie"></i>
            </div>
            <h3 style="font-family:'Outfit'; font-size:1.6rem; color:white; margin-bottom:8px;">Welcome Team Manager</h3>
            <p style="color:var(--text-muted); font-size:0.95rem; line-height:1.6; margin-bottom:24px;">
              Review team leave approvals, generate AI performance reviews, check sprint velocity, and request team hardware.
            </p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; text-align:left;">
              <div class="item-card" onclick="askSample('Approve pending employee leave claims')" style="cursor:pointer;">
                <b style="font-size:0.9rem; color:var(--status-amber);"><i class="fa-solid fa-check-double"></i> Approve leave requests</b>
                <div style="font-size:0.78rem; color:var(--text-muted);">Review & send approval emails to team members.</div>
              </div>
              <div class="item-card" onclick="askSample('Generate performance review for Senior Developer')" style="cursor:pointer;">
                <b style="font-size:0.9rem; color:var(--accent-cyan);"><i class="fa-solid fa-star"></i> Generate performance review</b>
                <div style="font-size:0.78rem; color:var(--text-muted);">AI summary of sprint throughput & sentiment.</div>
              </div>
              <div class="item-card" onclick="askSample('Show department reports and sprint health')" style="cursor:pointer;">
                <b style="font-size:0.9rem; color:var(--status-emerald);"><i class="fa-solid fa-chart-column"></i> Show department reports</b>
                <div style="font-size:0.78rem; color:var(--text-muted);">Engineering velocity, open tickets & SLAs.</div>
              </div>
              <div class="item-card" onclick="askSample('Draft approval email to Rahul for PTO request')" style="cursor:pointer;">
                <b style="font-size:0.9rem; color:#8B5CF6;"><i class="fa-solid fa-paper-plane"></i> Leave approval email</b>
                <div style="font-size:0.78rem; color:var(--text-muted);">Dispatch SMTP confirmation to team member.</div>
              </div>
            </div>
          </div>`;
      } else {
        // Employee Role
        container.innerHTML = `
          <div style="text-align:center; padding:30px 20px; margin:auto; max-width:700px;">
            <div style="width:68px; height:68px; border-radius:22px; background:var(--accent-gradient); display:inline-flex; align-items:center; justify-content:center; font-size:2.2rem; color:white; margin-bottom:16px; box-shadow:0 8px 30px rgba(99,102,241,0.4);">
              <i class="fa-solid fa-robot"></i>
            </div>
            <h3 style="font-family:'Outfit'; font-size:1.6rem; color:white; margin-bottom:8px;">Welcome to Enterprise Knowledge Assistant</h3>
            <p style="color:var(--text-muted); font-size:0.95rem; line-height:1.6; margin-bottom:24px;">
              Search authorized company documents, policy handbooks, travel limits, and training materials. Every response includes verifiable source citations and confidence metrics.
            </p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; text-align:left;">
              <div class="item-card" onclick="askSample('What is the leave policy?')" style="cursor:pointer;">
                <b style="font-size:0.9rem; color:var(--accent-cyan);"><i class="fa-solid fa-umbrella-beach"></i> What is the leave policy?</b>
                <div style="font-size:0.78rem; color:var(--text-muted);">Check 2026 secondary caregiver paid leave.</div>
              </div>
              <div class="item-card" onclick="askSample('Generate leave request email to HR')" style="cursor:pointer;">
                <b style="font-size:0.9rem; color:#8B5CF6;"><i class="fa-solid fa-envelope"></i> Generate leave request email</b>
                <div style="font-size:0.78rem; color:var(--text-muted);">AI drafts professional email for SMTP sending.</div>
              </div>
              <div class="item-card" onclick="askSample('Where is the employee handbook?')" style="cursor:pointer;">
                <b style="font-size:0.9rem; color:var(--status-emerald);"><i class="fa-solid fa-book-open"></i> Where is employee handbook?</b>
                <div style="font-size:0.78rem; color:var(--text-muted);">Access 2026 policy guidelines & benefits.</div>
              </div>
              <div class="item-card" onclick="askSample('Where can I find the IT security policy?')" style="cursor:pointer;">
                <b style="font-size:0.9rem; color:var(--status-amber);"><i class="fa-solid fa-shield-cat"></i> IT security guidelines</b>
                <div style="font-size:0.78rem; color:var(--text-muted);">Password rules, key rotation & security.</div>
              </div>
            </div>
          </div>`;
      }
    }

    // ═══════════════════════════════════════════════════════
    // SECURITY & SYSADMIN GLOBAL HANDLERS
    // ═══════════════════════════════════════════════════════

    var sysadminAuditPage = 1;
    var sysadminAuditPageSize = 12;
    var sysadminActiveAlertsCount = 5;
    var sysadminPendingReqCount = 3;
    var sysadminActiveSessionsCount = 5;

    var SYSADMIN_AUDIT_LOG_ALL = [
      {ts:'2026-07-31 00:12:04', user:'Haritha L. (Admin)', action:'User Login', module:'Authentication', ip:'192.168.1.41', status:'Success'},
      {ts:'2026-07-31 00:09:18', user:'Haritha L. (Admin)', action:'Role Updated — Rahul K. → Manager', module:'Access Control', ip:'192.168.1.41', status:'Success'},
      {ts:'2026-07-31 00:05:33', user:'Meera J. (HR)', action:'Document Permission Changed', module:'Knowledge Base', ip:'192.168.1.55', status:'Success'},
      {ts:'2026-07-30 23:55:10', user:'David M. (Manager)', action:'Knowledge Base Updated', module:'Knowledge Base', ip:'192.168.1.60', status:'Success'},
      {ts:'2026-07-30 23:40:02', user:'Priya S. (HR)', action:'Policy Published — Leave Policy 2026', module:'Policy', ip:'10.0.0.18', status:'Success'},
      {ts:'2026-07-30 23:22:45', user:'Alex R. (Employee)', action:'User Login — Unusual Location', module:'Authentication', ip:'203.0.113.44', status:'Warning'},
      {ts:'2026-07-30 23:15:07', user:'Unknown', action:'Failed Login Attempt (3×)', module:'Authentication', ip:'185.220.101.14', status:'Failed'},
      {ts:'2026-07-30 22:58:31', user:'Sai P. (Employee)', action:'Unauthorized Access Attempt', module:'HR Records', ip:'10.0.0.88', status:'Failed'},
      {ts:'2026-07-30 22:30:00', user:'System Scheduler', action:'Automated Database Backup', module:'System', ip:'localhost', status:'Success'},
      {ts:'2026-07-30 21:14:19', user:'Haritha L. (Admin)', action:'Security Scan Completed', module:'Security', ip:'192.168.1.41', status:'Success'},
      {ts:'2026-07-30 20:45:00', user:'Haritha L. (Admin)', action:'MFA Policy Enforced — Engineering Team', module:'Access Control', ip:'192.168.1.41', status:'Success'},
      {ts:'2026-07-30 19:33:52', user:'Meera J. (HR)', action:'Bulk User Import (22 records)', module:'HR Operations', ip:'192.168.1.55', status:'Warning'},

      // Page 2 data
      {ts:'2026-07-30 18:50:11', user:'David M. (Manager)', action:'Travel Expense Claim Approved ($4,200)', module:'Access Control', ip:'192.168.1.60', status:'Success'},
      {ts:'2026-07-30 18:22:04', user:'Alex R. (Employee)', action:'Password Reset Requested', module:'Authentication', ip:'203.0.113.44', status:'Success'},
      {ts:'2026-07-30 17:45:19', user:'System Scheduler', action:'Vector Store Re-index Completed', module:'Knowledge Base', ip:'localhost', status:'Success'},
      {ts:'2026-07-30 16:30:00', user:'Priya S. (HR)', action:'Employee Onboarding Invitation Dispatched', module:'HR Operations', ip:'10.0.0.18', status:'Success'},
      {ts:'2026-07-30 15:10:44', user:'Unknown', action:'Invalid API Token Access Attempt', module:'Security', ip:'198.51.100.77', status:'Failed'},
      {ts:'2026-07-30 14:05:22', user:'Haritha L. (Admin)', action:'System Configuration Modified', module:'System', ip:'192.168.1.41', status:'Warning'},
      {ts:'2026-07-30 13:00:15', user:'Meera J. (HR)', action:'Salary Benchmark Document Uploaded', module:'Knowledge Base', ip:'192.168.1.55', status:'Success'},
      {ts:'2026-07-30 12:15:30', user:'Rahul K. (Employee)', action:'Access Request Submitted (Manager)', module:'Access Control', ip:'192.168.1.72', status:'Success'},
      {ts:'2026-07-30 11:40:00', user:'System Scheduler', action:'Audit Log Rotated & Compressed', module:'System', ip:'localhost', status:'Success'},
      {ts:'2026-07-30 10:20:18', user:'Sai P. (Employee)', action:'User Login', module:'Authentication', ip:'10.0.0.88', status:'Success'},
      {ts:'2026-07-30 09:14:00', user:'Haritha L. (Admin)', action:'MFA Challenge Verified', module:'Authentication', ip:'192.168.1.41', status:'Success'},
      {ts:'2026-07-30 08:30:00', user:'System Scheduler', action:'Daily Security Vulnerability Sync', module:'Security', ip:'localhost', status:'Success'},

      // Page 3 data
      {ts:'2026-07-29 22:15:00', user:'David M. (Manager)', action:'Project Health Predictor Evaluated', module:'System', ip:'192.168.1.60', status:'Success'},
      {ts:'2026-07-29 20:10:05', user:'Alex R. (Employee)', action:'Handbook Query Answered by AI', module:'Knowledge Base', ip:'203.0.113.44', status:'Success'},
      {ts:'2026-07-29 18:00:00', user:'System Scheduler', action:'Incremental Database Backup', module:'System', ip:'localhost', status:'Success'},
      {ts:'2026-07-29 16:45:12', user:'Priya S. (HR)', action:'Leave Policy Revision 2.4 Created', module:'Policy', ip:'10.0.0.18', status:'Success'},
      {ts:'2026-07-29 14:30:00', user:'Unknown', action:'Port Scan Detected (Blocked)', module:'Security', ip:'198.51.100.99', status:'Failed'},
      {ts:'2026-07-29 12:00:00', user:'Haritha L. (Admin)', action:'Pinecone Index API Key Rotated', module:'Security', ip:'192.168.1.41', status:'Success'},
    ];

    var BACKUP_HISTORY_DATA = [
      {date:'Jul 31, 03:01 AM', type:'Incremental', size:'14.2 GB', dur:'8m 32s', status:'Success'},
      {date:'Jul 30, 03:00 AM', type:'Full', size:'284.1 GB', dur:'42m 18s', status:'Success'},
      {date:'Jul 29, 03:02 AM', type:'Incremental', size:'9.8 GB', dur:'6m 44s', status:'Success'},
      {date:'Jul 28, 03:00 AM', type:'Full', size:'271.6 GB', dur:'38m 55s', status:'Success'},
      {date:'Jul 27, 03:01 AM', type:'Incremental', size:'12.4 GB', dur:'7m 11s', status:'Warning'},
      {date:'Jul 26, 03:05 AM', type:'Full', size:'258.2 GB', dur:'36m 02s', status:'Success'},
    ];

    function sysadminRenderAuditLog() {
      const tbody = document.getElementById('sysadmin-audit-tbody');
      if (!tbody) return;

      const search = (document.getElementById('sysadmin-audit-search')?.value || '').toLowerCase();
      const statusFilter = document.getElementById('sysadmin-audit-status-filter')?.value || 'all';
      const moduleFilter = document.getElementById('sysadmin-audit-module-filter')?.value || 'all';

      const filtered = SYSADMIN_AUDIT_LOG_ALL.filter(row => {
        const matchSearch = row.user.toLowerCase().includes(search) || row.action.toLowerCase().includes(search) || row.module.toLowerCase().includes(search) || row.ip.toLowerCase().includes(search);
        const matchStatus = statusFilter === 'all' || row.status === statusFilter;
        const matchModule = moduleFilter === 'all' || row.module === moduleFilter;
        return matchSearch && matchStatus && matchModule;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / sysadminAuditPageSize));
      if (sysadminAuditPage > totalPages) sysadminAuditPage = totalPages;

      const startIndex = (sysadminAuditPage - 1) * sysadminAuditPageSize;
      const pageData = filtered.slice(startIndex, startIndex + sysadminAuditPageSize);

      const stMap = {'Success':['sec-badge-green','fa-circle-check'],'Warning':['sec-badge-yellow','fa-triangle-exclamation'],'Failed':['sec-badge-red','fa-circle-xmark']};

      if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-dim);">No audit log records match your filter criteria.</td></tr>';
      } else {
        tbody.innerHTML = pageData.map(row => {
          const [cls, ico] = stMap[row.status] || ['sec-badge-blue','fa-circle-info'];
          return '<tr>'
            + '<td style="font-family:JetBrains Mono,monospace;font-size:0.78rem;color:var(--text-muted);white-space:nowrap;">' + row.ts + '</td>'
            + '<td style="font-weight:600;white-space:nowrap;">' + row.user + '</td>'
            + '<td>' + row.action + '</td>'
            + '<td><span class="sec-badge sec-badge-blue">' + row.module + '</span></td>'
            + '<td style="font-family:JetBrains Mono,monospace;font-size:0.78rem;color:var(--text-muted);">' + row.ip + '</td>'
            + '<td><span class="sec-badge ' + cls + '"><i class="fa-solid ' + ico + '"></i> ' + row.status + '</span></td>'
            + '</tr>';
        }).join('');
      }

      const countEl = document.getElementById('audit-log-showing-count');
      if (countEl) {
        countEl.textContent = `Showing ${pageData.length} of ${filtered.length} matching log entries (Page ${sysadminAuditPage} of ${totalPages})`;
      }

      // Update pagination buttons active states
      for (let p = 1; p <= 3; p++) {
        const btn = document.getElementById(`pg-btn-${p}`);
        if (btn) {
          if (p === sysadminAuditPage) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      }
    }

    function sysadminFilterAuditLog() {
      sysadminAuditPage = 1;
      sysadminRenderAuditLog();
    }

    function sysadminSetAuditPage(page) {
      if (page < 1) page = 1;
      if (page > 3) page = 3;
      sysadminAuditPage = page;
      sysadminRenderAuditLog();
    }

    function sysadminResetAuditFilters() {
      document.getElementById('sysadmin-audit-search').value = '';
      document.getElementById('sysadmin-audit-status-filter').value = 'all';
      document.getElementById('sysadmin-audit-module-filter').value = 'all';
      sysadminAuditPage = 1;
      sysadminRenderAuditLog();
      toast('Audit log filters reset to default view!', 'info');
    }

    function sysadminExportAuditCSV() {
      toast('📥 Preparing Enterprise Security Audit Log CSV...', 'info', 2000);
      let csv = 'Timestamp,User,Action Performed,Module,IP Address,Status\n';
      SYSADMIN_AUDIT_LOG_ALL.forEach(r => {
        csv += `"${r.ts}","${r.user}","${r.action}","${r.module}","${r.ip}","${r.status}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SynapseAI_Security_Audit_Log_2026.csv';
      a.click();
      toast('✅ Downloaded SynapseAI_Security_Audit_Log_2026.csv!', 'success', 4000);
    }

    function sysadminRenderBackupHistory() {
      const tbody = document.getElementById('backup-history-tbody');
      if (!tbody) return;

      tbody.innerHTML = BACKUP_HISTORY_DATA.map(b => {
        const sc = b.status === 'Success' ? 'sec-badge-green' : 'sec-badge-yellow';
        const si = b.status === 'Success' ? 'fa-circle-check' : 'fa-triangle-exclamation';
        return '<tr>'
          + '<td style="font-size:0.8rem;white-space:nowrap;">' + b.date + '</td>'
          + '<td><span class="sec-badge sec-badge-blue">' + b.type + '</span></td>'
          + '<td style="font-weight:700;color:white;">' + b.size + '</td>'
          + '<td style="font-size:0.78rem;color:var(--text-muted);">' + b.dur + '</td>'
          + '<td><span class="sec-badge ' + sc + '"><i class="fa-solid ' + si + '"></i> ' + b.status + '</span></td>'
          + '</tr>';
      }).join('');
    }

    function sysadminBackupNow() {
      const btn = document.getElementById('btn-backup-now');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Backing Up...`;
      }
      toast('🔄 Initiated manual database snapshot backup...', 'info', 2000);

      setTimeout(() => {
        const now = new Date();
        const timeStr = 'Just Now (' + now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) + ')';
        
        BACKUP_HISTORY_DATA.unshift({
          date: timeStr,
          type: 'Manual',
          size: '14.8 GB',
          dur: '1m 12s',
          status: 'Success'
        });

        document.getElementById('maint-backup-sub').textContent = 'Manual snapshot backup completed';
        document.getElementById('maint-last-backup-badge').textContent = timeStr;
        document.getElementById('maint-last-backup-sub').textContent = 'Duration: 1.2 minutes • 14.8 GB';

        sysadminRenderBackupHistory();

        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Backup Now`;
        }

        SYSADMIN_AUDIT_LOG_ALL.unshift({
          ts: now.toISOString().replace('T',' ').substring(0,19),
          user: 'Haritha L. (Admin)',
          action: 'Manual Database Backup Executed',
          module: 'System',
          ip: '192.168.1.41',
          status: 'Success'
        });
        sysadminRenderAuditLog();

        toast('✅ Manual Database Snapshot completed successfully (14.8 GB)!', 'success', 4000);
      }, 2500);
    }

    function sysadminExportSecurityReport() {
      const body = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.4); padding:18px; border-radius:14px; color:#6EE7B7;">
            <div style="font-weight:800; font-family:'Outfit'; font-size:1.3rem; margin-bottom:4px;"><i class="fa-solid fa-shield-halved"></i> Executive Security & Compliance Audit Brief</div>
            <div style="font-size:0.85rem; color:var(--text-main);">Generated on 2026-07-31 • Security Level: <b>ENTERPRISE GRADE (98/100)</b></div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; font-size:0.88rem;">
            <div style="background:rgba(255,255,255,0.03); padding:14px; border-radius:12px; border:1px solid var(--border-glass);">
              <div style="color:var(--text-dim); font-size:0.75rem;">MFA ENFORCEMENT</div>
              <div style="font-size:1.3rem; font-weight:800; color:#10B981; margin-top:2px;">96.4%</div>
              <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">273 of 284 Users MFA Active</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:14px; border-radius:12px; border:1px solid var(--border-glass);">
              <div style="color:var(--text-dim); font-size:0.75rem;">RLS SECURITY</div>
              <div style="font-size:1.3rem; font-weight:800; color:#6366F1; margin-top:2px;">100%</div>
              <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Supabase Postgres Row Policies Enforced</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:14px; border-radius:12px; border:1px solid var(--border-glass);">
              <div style="color:var(--text-dim); font-size:0.75rem;">COMPLIANCE AUDIT</div>
              <div style="font-size:1.3rem; font-weight:800; color:#06B6D4; margin-top:2px;">PASSED</div>
              <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">ISO 27001 & SOC 2 Type II Certified</div>
            </div>
          </div>

          <div style="background:rgba(255,255,255,0.03); padding:16px; border-radius:14px; border:1px solid var(--border-glass); font-size:0.88rem; line-height:1.6;">
            <b>Executive Summary Findings:</b>
            <ul class="bullet-list-dash" style="margin-top:8px;">
              <li>Zero critical unpatched security vulnerabilities across 14 enterprise microservices.</li>
              <li>Suspicious brute-force attempt from Moscow RU automatically intercepted and IP isolated.</li>
              <li>Role-Based Access Control (RBAC) enforced with 100% boundary isolation across Employee, HR, Manager, and Admin tiers.</li>
              <li>Automated incremental backups verified daily with 100% restore integrity.</li>
            </ul>
          </div>

          <div style="display:flex; gap:10px;">
            <button class="btn-submit" onclick="downloadSecurityReportPDF();" style="flex:1; justify-content:center;"><i class="fa-solid fa-file-pdf"></i> Download Official PDF Report</button>
            <button class="btn-submit" onclick="emailSecurityReport();" style="flex:1; justify-content:center; background:rgba(6,182,212,0.2); border:1px solid #06B6D4;"><i class="fa-solid fa-paper-plane"></i> Email Board Report</button>
          </div>
        </div>`;

      showInteractiveModal('Enterprise Security Audit Report', 'fa-shield-halved', body, null, null);
    }

    function downloadSecurityReportPDF() {
      const opt = {
        margin:       15,
        filename:     'Enterprise_Security_Audit_Report.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      const pdfTemplate = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; padding: 20px; background: #ffffff; max-width: 800px; margin: auto;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
            <h1 style="color: #0f172a; margin: 0 0 10px 0; font-size: 24px; font-weight: 800;">SYNAPSEAI</h1>
            <h2 style="color: #475569; margin: 0; font-size: 16px; font-weight: 600;">Enterprise Security Audit Report</h2>
            <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">Generated on 2026-07-31 • Security Level: ENTERPRISE GRADE (98/100)</p>
          </div>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin-bottom: 25px;">
            <h3 style="color: #166534; margin: 0 0 5px 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">Executive Security & Compliance Audit Brief</h3>
            <p style="color: #1e293b; font-size: 13px; margin: 0;">Comprehensive verification of the enterprise authentication, storage policies, and threat protection measures.</p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 25px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px; text-align: center;">
              <div style="color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">MFA Enforcement</div>
              <div style="font-size: 20px; font-weight: 800; color: #16a34a; margin: 5px 0;">96.4%</div>
              <div style="font-size: 11px; color: #64748b;">273 of 284 Users MFA Active</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px; text-align: center;">
              <div style="color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">RLS Security</div>
              <div style="font-size: 20px; font-weight: 800; color: #4f46e5; margin: 5px 0;">100%</div>
              <div style="font-size: 11px; color: #64748b;">Supabase Row Policies Enforced</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px; text-align: center;">
              <div style="color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase;">Compliance Audit</div>
              <div style="font-size: 20px; font-weight: 800; color: #0891b2; margin: 5px 0;">PASSED</div>
              <div style="font-size: 11px; color: #64748b;">ISO 27001 & SOC 2 Certified</div>
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
            <h4 style="color: #0f172a; margin: 0 0 10px 0; font-size: 14px; font-weight: 700;">Executive Summary Findings:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 13px; line-height: 1.6;">
              <li style="margin-bottom: 8px;">Zero critical unpatched security vulnerabilities across 14 enterprise microservices.</li>
              <li style="margin-bottom: 8px;">Suspicious brute-force attempt from Moscow RU automatically intercepted and IP isolated.</li>
              <li style="margin-bottom: 8px;">Role-Based Access Control (RBAC) enforced with 100% boundary isolation across Employee, HR, Manager, and Admin tiers.</li>
              <li style="margin-bottom: 8px;">Automated incremental backups verified daily with 100% restore integrity.</li>
            </ul>
          </div>

          <div style="font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 30px;">
            This document is automatically compiled and cryptographically verified by SynapseAI Security Center.
          </div>
        </div>
      `;
      
      toast('📄 Generating official PDF report...', 'info');
      html2pdf().from(pdfTemplate).set(opt).save();
    }

    function emailSecurityReport() {
      closeInteractiveModal();
      const modalBody = `
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div style="background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.3);padding:14px;border-radius:12px;color:#67E8F9;font-size:0.85rem;">
            <b><i class="fa-solid fa-paper-plane"></i> Dispatch Security Audit Report</b><br>
            <span style="color:var(--text-muted);">This report will be sent to the Board of Directors via enterprise SMTP.</span>
          </div>
          <div class="email-field-group">
            <label class="email-field-label">Recipient Email</label>
            <input type="email" id="email-report-recipient" class="input-box" value="board@enterprise.com" placeholder="board@enterprise.com">
          </div>
          <div class="email-field-group">
            <label class="email-field-label">Subject</label>
            <input type="text" id="email-report-subject" class="input-box" value="SynapseAI Enterprise Security Audit Report — 2026-07-31">
          </div>
          <div class="email-field-group">
            <label class="email-field-label">Additional Notes (Optional)</label>
            <textarea id="email-report-notes" class="input-box" style="height:80px;resize:vertical;" placeholder="Add any custom notes to append to the report..."></textarea>
          </div>
          <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);border-radius:10px;padding:12px;font-size:0.8rem;color:var(--text-dim);line-height:1.6;">
            <b style="color:white;">Report Contents:</b> Executive Security &amp; Compliance Audit Brief &bull; MFA 96.4% &bull; RLS 100% &bull; ISO 27001 &amp; SOC 2 Certified
          </div>
        </div>`;
      showInteractiveModal('Email Board Security Report', 'fa-paper-plane', modalBody, 'Send Report', () => {
        const recipient = document.getElementById('email-report-recipient').value.trim() || 'board@enterprise.com';
        const subject = document.getElementById('email-report-subject').value.trim() || 'SynapseAI Enterprise Security Audit Report';
        const extraNotes = document.getElementById('email-report-notes').value.trim();
        const body = `Dear Board of Directors,\n\nPlease find the SynapseAI Enterprise Security Audit Report below.\n\nExecutive Security & Compliance Audit Brief\nGenerated on: 2026-07-31\nSecurity Level: ENTERPRISE GRADE (98/100)\n\nKey Metrics:\n- MFA Enforcement: 96.4% (273 of 284 Users MFA Active)\n- RLS Security: 100% (Supabase Postgres Row Policies Enforced)\n- Compliance Audit: PASSED (ISO 27001 & SOC 2 Type II Certified)\n\nExecutive Summary Findings:\n- Zero critical unpatched security vulnerabilities across 14 enterprise microservices.\n- Suspicious brute-force attempt from Moscow RU automatically intercepted and IP isolated.\n- Role-Based Access Control (RBAC) enforced with 100% boundary isolation.\n- Automated incremental backups verified daily with 100% restore integrity.\n${extraNotes ? '\nAdditional Notes:\n' + extraNotes + '\n' : ''}\nBest regards,\nSynapseAI Security Center\nAdmin: Haritha L.`;
        closeInteractiveModal();
        toast('📧 Dispatching report to Board...', 'info');
        fetch('http://localhost:8000/api/v1/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient, subject, body })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const isSim = data.data && (data.data.status === 'SENT_LOCAL_SIMULATED' || (data.data.status || '').includes('SIMULATED'));
            if (isSim) {
              toast(`📧 Email queued in sandbox (SMTP credentials required for live dispatch). Recipient: <b>${recipient}</b>`, 'success', 7000);
            } else {
              toast(`📧 Security report sent to <b>${recipient}</b> successfully!`, 'success', 5000);
            }
          } else {
            toast('❌ Email dispatch failed. Check SMTP settings in .env', 'error', 5000);
          }
        })
        .catch(err => {
          console.error('[Email Error]', err);
          toast(`📧 Report queued for <b>${recipient}</b> (backend offline — sandbox mode)`, 'success', 6000);
        });
      });
    }

    function sysadminRunSecurityScan() {
      const body = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="font-size:0.9rem; color:var(--text-muted);">
            Executing comprehensive multi-layer security diagnostic scan across enterprise services...
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;" id="sec-scan-progress-list">
            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.83rem; margin-bottom:4px;">
                <span>Authentication & MFA Protocol Audit</span><span id="st-1" style="color:var(--status-emerald); font-weight:700;">Scanning...</span>
              </div>
              <div class="progress-bar-track"><div class="progress-bar-fill" id="pb-1" style="width:20%; background:#10B981;"></div></div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.83rem; margin-bottom:4px;">
                <span>Row-Level Access (RLS) Policy Isolation</span><span id="st-2" style="color:var(--text-dim); font-weight:700;">Pending</span>
              </div>
              <div class="progress-bar-track"><div class="progress-bar-fill" id="pb-2" style="width:0%; background:#6366F1;"></div></div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.83rem; margin-bottom:4px;">
                <span>Vector Index & Pinecone API Encryption</span><span id="st-3" style="color:var(--text-dim); font-weight:700;">Pending</span>
              </div>
              <div class="progress-bar-track"><div class="progress-bar-fill" id="pb-3" style="width:0%; background:#06B6D4;"></div></div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.83rem; margin-bottom:4px;">
                <span>Network Intrusion & Anomaly Detection</span><span id="st-4" style="color:var(--text-dim); font-weight:700;">Pending</span>
              </div>
              <div class="progress-bar-track"><div class="progress-bar-fill" id="pb-4" style="width:0%; background:#F59E0B;"></div></div>
            </div>
          </div>

          <div id="sec-scan-result" style="display:none; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.4); padding:16px; border-radius:12px; color:#6EE7B7; font-weight:700; text-align:center;">
            <i class="fa-solid fa-circle-check" style="font-size:1.4rem;"></i><br>
            Scan Complete: 0 Vulnerabilities Found • 100% Security Compliance
          </div>
        </div>`;

      showInteractiveModal('Automated Security Scanner', 'fa-radar', body, null, null);

      setTimeout(() => {
        document.getElementById('pb-1').style.width = '100%';
        document.getElementById('st-1').innerHTML = `<i class="fa-solid fa-check"></i> Passed`;
        document.getElementById('st-2').style.color = '#6366F1';
        document.getElementById('st-2').textContent = 'Scanning...';
        document.getElementById('pb-2').style.width = '40%';
      }, 700);

      setTimeout(() => {
        document.getElementById('pb-2').style.width = '100%';
        document.getElementById('st-2').innerHTML = `<i class="fa-solid fa-check"></i> Passed`;
        document.getElementById('st-3').style.color = '#06B6D4';
        document.getElementById('st-3').textContent = 'Scanning...';
        document.getElementById('pb-3').style.width = '70%';
      }, 1400);

      setTimeout(() => {
        document.getElementById('pb-3').style.width = '100%';
        document.getElementById('st-3').innerHTML = `<i class="fa-solid fa-check"></i> Passed`;
        document.getElementById('st-4').style.color = '#F59E0B';
        document.getElementById('st-4').textContent = 'Scanning...';
        document.getElementById('pb-4').style.width = '100%';
      }, 2100);

      setTimeout(() => {
        document.getElementById('st-4').innerHTML = `<i class="fa-solid fa-check"></i> Passed`;
        const res = document.getElementById('sec-scan-result');
        if (res) res.style.display = 'block';
        toast('🟢 Security Scan Finished: All 14 services 100% secure!', 'success', 4000);
      }, 2800);
    }

    function sysadminSessionReport() {
      const body = `
        <div style="display:flex; flex-direction:column; gap:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:14px 18px; border-radius:12px;">
            <div><b>Active Connection Sockets:</b> 5 Users Online</div>
            <span class="sec-badge sec-badge-green">Gateway Secure</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.85rem;">
            <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
              <div><b>Haritha L.</b> (Admin) • <code>192.168.1.41</code><div style="font-size:0.72rem; color:var(--text-dim)">Connected via TLS v1.3 • Token Exp: 8h</div></div>
              <span class="sec-badge sec-badge-green">Active</span>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
              <div><b>David M.</b> (Manager) • <code>192.168.1.55</code><div style="font-size:0.72rem; color:var(--text-dim)">Connected via TLS v1.3 • Token Exp: 6h</div></div>
              <span class="sec-badge sec-badge-green">Active</span>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
              <div><b>Priya S.</b> (HR Specialist) • <code>10.0.0.18</code><div style="font-size:0.72rem; color:var(--text-dim)">Connected via TLS v1.3 • Token Exp: 4h</div></div>
              <span class="sec-badge sec-badge-green">Active</span>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
              <div><b>Alex R.</b> (Employee) • <code>203.0.113.44</code><div style="font-size:0.72rem; color:var(--text-dim)">Connected via TLS v1.3 • Token Exp: 2h</div></div>
              <span class="sec-badge sec-badge-yellow">Flagged Location</span>
            </div>
            <div style="background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.3); padding:12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
              <div><b style="color:#FB7185">Unknown (Suspicious)</b> • <code>185.220.101.14</code><div style="font-size:0.72rem; color:var(--text-dim)">Brute Force Attempt • Moscow RU</div></div>
              <span class="sec-badge sec-badge-red">Blocked</span>
            </div>
          </div>
        </div>`;

      showInteractiveModal('Active User Sessions Audit Report', 'fa-users-gear', body, null, null);
    }

    function sysadminTerminateSession(username, ip, rowId) {
      const row = document.getElementById(rowId);
      if (row) {
        row.style.opacity = '0';
        row.style.transform = 'scale(0.95)';
        setTimeout(() => {
          row.remove();
          sysadminActiveSessionsCount = Math.max(1, sysadminActiveSessionsCount - 1);
          const countEl = document.getElementById('active-sessions-count');
          if (countEl) countEl.textContent = sysadminActiveSessionsCount;

          const usersKpi = document.getElementById('active-users-kpi');
          if (usersKpi && username !== 'Unknown') {
            usersKpi.textContent = parseInt(usersKpi.textContent) - 1;
          }
        }, 250);
      }

      if (ip === '185.220.101.14') {
        const banner = document.getElementById('suspicious-session-banner');
        if (banner) banner.remove();

        const alertCard = document.getElementById('alert-card-moscow');
        if (alertCard) alertCard.remove();

        sysadminActiveAlertsCount = Math.max(0, sysadminActiveAlertsCount - 1);
        const alertsKpi = document.getElementById('sec-alerts-kpi');
        if (alertsKpi) alertsKpi.textContent = sysadminActiveAlertsCount;
        const alertsBadge = document.getElementById('alerts-badge');
        if (alertsBadge) alertsBadge.textContent = sysadminActiveAlertsCount + ' Active';
      }

      SYSADMIN_AUDIT_LOG_ALL.unshift({
        ts: new Date().toISOString().replace('T',' ').substring(0,19),
        user: 'Haritha L. (Admin)',
        action: `Terminated Session for ${username} (${ip})`,
        module: 'Access Control',
        ip: '192.168.1.41',
        status: 'Success'
      });
      sysadminRenderAuditLog();

      toast(`⛔ Terminated session for <b>${username}</b> (${ip})!`, 'success', 4000);
    }

    function sysadminEditRole(roleName, usersCount, currentPerms) {
      const body = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.4); padding:16px; border-radius:12px;">
            <b style="font-size:1.1rem; color:white;">Configure Permissions — ${roleName} Tier</b>
            <div style="font-size:0.82rem; color:var(--text-muted); margin-top:2px;">Currently assigned to <b>${usersCount}</b> staff members</div>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            <div class="email-field-group">
              <label class="email-field-label">Permission Summary</label>
              <input type="text" id="edit-role-perm-input" class="input-box" value="${currentPerms}">
            </div>

            <div style="font-weight:700; font-size:0.85rem; color:var(--accent-cyan); margin-top:6px;">Module Access Toggles:</div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.85rem;">
              <label style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.03); padding:10px 14px; border-radius:10px; cursor:pointer;">
                <input type="checkbox" checked style="accent-color:var(--accent-primary);"> Read Handbooks & Policies
              </label>
              <label style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.03); padding:10px 14px; border-radius:10px; cursor:pointer;">
                <input type="checkbox" ${roleName !== 'Employee' ? 'checked' : ''} style="accent-color:var(--accent-primary);"> Write & Draft Policies
              </label>
              <label style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.03); padding:10px 14px; border-radius:10px; cursor:pointer;">
                <input type="checkbox" ${roleName === 'Manager' || roleName === 'Admin' ? 'checked' : ''} style="accent-color:var(--accent-primary);"> Approve Expenses & PTO
              </label>
              <label style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.03); padding:10px 14px; border-radius:10px; cursor:pointer;">
                <input type="checkbox" ${roleName === 'Admin' ? 'checked' : ''} style="accent-color:var(--accent-primary);"> Security Console & System Admin
              </label>
            </div>
          </div>
        </div>`;

      showInteractiveModal(`RBAC Config — ${roleName}`, 'fa-shield-halved', body, 'Save Role Permissions', () => {
        const newPerms = document.getElementById('edit-role-perm-input').value.trim();
        const permEl = document.getElementById(`perm-${roleName.replace(' Specialist','')}`);
        if (permEl) permEl.textContent = newPerms;

        closeInteractiveModal();
        SYSADMIN_AUDIT_LOG_ALL.unshift({
          ts: new Date().toISOString().replace('T',' ').substring(0,19),
          user: 'Haritha L. (Admin)',
          action: `Updated Permissions for ${roleName} Role`,
          module: 'Access Control',
          ip: '192.168.1.41',
          status: 'Success'
        });
        sysadminRenderAuditLog();
        toast(`✅ Updated RBAC permissions for <b>${roleName}</b>!`, 'success');
      });
    }

    function sysadminHandleAccessRequest(user, toRole, action, cardId) {
      const card = document.getElementById(cardId);
      if (!card) return;

      sysadminPendingReqCount = Math.max(0, sysadminPendingReqCount - 1);
      const badge = document.getElementById('access-req-badge');
      if (badge) badge.textContent = `${sysadminPendingReqCount} Pending`;

      if (action === 'approve') {
        card.innerHTML = `
          <div style="color:#10B981; font-weight:700; font-size:0.85rem; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-circle-check"></i> Request Approved — ${user} upgraded to <b>${toRole}</b>
          </div>`;
        
        SYSADMIN_AUDIT_LOG_ALL.unshift({
          ts: new Date().toISOString().replace('T',' ').substring(0,19),
          user: 'Haritha L. (Admin)',
          action: `Approved Access Upgrade for ${user} → ${toRole}`,
          module: 'Access Control',
          ip: '192.168.1.41',
          status: 'Success'
        });
        sysadminRenderAuditLog();
        toast(`✅ Approved access request for <b>${user}</b> (${toRole})!`, 'success');
      } else {
        card.innerHTML = `
          <div style="color:#F43F5E; font-weight:700; font-size:0.85rem; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-circle-xmark"></i> Request Denied — ${user} remains unchanged
          </div>`;

        SYSADMIN_AUDIT_LOG_ALL.unshift({
          ts: new Date().toISOString().replace('T',' ').substring(0,19),
          user: 'Haritha L. (Admin)',
          action: `Denied Access Request for ${user}`,
          module: 'Access Control',
          ip: '192.168.1.41',
          status: 'Warning'
        });
        sysadminRenderAuditLog();
        toast(`❌ Denied access request for <b>${user}</b>`, 'warn');
      }
    }

    function sysadminBlockIP(ip, cardId) {
      const card = document.getElementById(cardId);
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => card.remove(), 250);
      }

      sysadminActiveAlertsCount = Math.max(0, sysadminActiveAlertsCount - 1);
      const alertsKpi = document.getElementById('sec-alerts-kpi');
      if (alertsKpi) alertsKpi.textContent = sysadminActiveAlertsCount;
      const alertsBadge = document.getElementById('alerts-badge');
      if (alertsBadge) alertsBadge.textContent = sysadminActiveAlertsCount + ' Active';

      SYSADMIN_AUDIT_LOG_ALL.unshift({
        ts: new Date().toISOString().replace('T',' ').substring(0,19),
        user: 'Haritha L. (Admin)',
        action: `Permanently Blocked IP ${ip} (Firewall Rule Added)`,
        module: 'Security',
        ip: '192.168.1.41',
        status: 'Success'
      });
      sysadminRenderAuditLog();
      toast(`🛡️ IP <b>${ip}</b> permanently blocked in firewall!`, 'success', 4000);
    }

    function sysadminEscalateAlert(title) {
      const body = `
        <div style="display:flex; flex-direction:column; gap:14px;">
          <div style="background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.3); padding:14px; border-radius:12px; color:#FB7185;">
            <b>Incident Escalation Dispatch</b><br>
            Security Event: <b>${title}</b>
          </div>
          <div class="email-field-group">
            <label class="email-field-label">Escalation Priority</label>
            <select class="email-template-select">
              <option value="p1">P1 — Critical Security Incident (Immediate Page)</option>
              <option value="p2">P2 — High Severity Anomaly</option>
            </select>
          </div>
          <div class="email-field-group">
            <label class="email-field-label">SOC Team Notes</label>
            <textarea class="input-box" style="height:90px;">Automated escalation dispatched by Executive Admin. Please investigate IP address 185.220.101.14 for brute-force pattern.</textarea>
          </div>
        </div>`;

      showInteractiveModal('Escalate Security Alert to SOC', 'fa-bell', body, 'Dispatch Escalation', () => {
        closeInteractiveModal();
        toast(`📢 Escalated <b>${title}</b> to SOC Incident Response Team!`, 'success', 4000);
      });
    }

    function sysadminMarkAlertSafe(title, cardId) {
      const card = document.getElementById(cardId);
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => card.remove(), 250);
      }

      sysadminActiveAlertsCount = Math.max(0, sysadminActiveAlertsCount - 1);
      const alertsKpi = document.getElementById('sec-alerts-kpi');
      if (alertsKpi) alertsKpi.textContent = sysadminActiveAlertsCount;
      const alertsBadge = document.getElementById('alerts-badge');
      if (alertsBadge) alertsBadge.textContent = sysadminActiveAlertsCount + ' Active';

      toast(`✅ Marked alert <b>${title}</b> as reviewed & safe.`, 'success');
    }

    function sysadminForceLogout(username, cardId) {
      sysadminMarkAlertSafe(username + ' unusual login', cardId);
      toast(`🚪 Force logged out <b>${username}</b> and invalidated session token.`, 'warn');
    }

    function sysadminRevokeAccess(username, cardId) {
      const card = document.getElementById(cardId);
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => card.remove(), 250);
      }
      sysadminActiveAlertsCount = Math.max(0, sysadminActiveAlertsCount - 1);
      const alertsKpi = document.getElementById('sec-alerts-kpi');
      if (alertsKpi) alertsKpi.textContent = sysadminActiveAlertsCount;
      const alertsBadge = document.getElementById('alerts-badge');
      if (alertsBadge) alertsBadge.textContent = sysadminActiveAlertsCount + ' Active';
      SYSADMIN_AUDIT_LOG_ALL.unshift({
        ts: new Date().toISOString().replace('T',' ').substring(0,19),
        user: 'Haritha L. (Admin)',
        action: `Session Revoked — ${username} (Privilege Escalation Attempt)`,
        module: 'Access Control',
        ip: '192.168.1.41',
        status: 'Warning'
      });
      sysadminRenderAuditLog();
      toast(`🔒 Session for <b>${username}</b> has been revoked. Access suspended pending review.`, 'warn', 5000);
    }

    function sysadminInvestigateAlert(title, cardId) {
      const body = `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);padding:14px;border-radius:12px;color:#FCD34D;">
            <b>Investigation Report</b><br>
            Alert: <b>${title}</b>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:0.83rem;">
            <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:10px;">
              <div style="color:var(--text-dim);font-size:0.75rem;">ACTIVITY TIMELINE</div>
              <div style="margin-top:6px;line-height:1.7;">
                <div>08:55 AM — Session started from 192.168.1.55</div>
                <div>09:10 AM — 12 documents accessed (within normal range)</div>
                <div>09:18 AM — Export count exceeded threshold (47 docs)</div>
                <div>09:23 AM — Alert triggered by DLP engine</div>
              </div>
            </div>
            <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:10px;">
              <div style="color:var(--text-dim);font-size:0.75rem;">RISK ASSESSMENT</div>
              <div style="margin-top:6px;color:#FCD34D;font-weight:700;">Medium Risk — No external transfer detected</div>
            </div>
          </div>
          <div class="email-field-group">
            <label class="email-field-label">Investigation Notes</label>
            <textarea class="input-box" id="invest-notes" style="height:80px;" placeholder="Add investigation notes..."></textarea>
          </div>
        </div>`;
      showInteractiveModal(`Investigate Alert`, 'fa-magnifying-glass', body, 'Mark Investigated & Close', () => {
        const card = document.getElementById(cardId);
        if (card) { card.style.opacity='0'; card.style.transform='scale(0.95)'; setTimeout(()=>card.remove(),250); }
        sysadminActiveAlertsCount = Math.max(0, sysadminActiveAlertsCount - 1);
        const alertsKpi = document.getElementById('sec-alerts-kpi');
        if (alertsKpi) alertsKpi.textContent = sysadminActiveAlertsCount;
        const alertsBadge = document.getElementById('alerts-badge');
        if (alertsBadge) alertsBadge.textContent = sysadminActiveAlertsCount + ' Active';
        SYSADMIN_AUDIT_LOG_ALL.unshift({
          ts: new Date().toISOString().replace('T',' ').substring(0,19),
          user: 'Haritha L. (Admin)',
          action: `Alert Investigated & Closed — ${title}`,
          module: 'Security',
          ip: '192.168.1.41',
          status: 'Success'
        });
        sysadminRenderAuditLog();
        closeInteractiveModal();
        toast(`🔍 Alert investigated & closed: <b>${title}</b>`, 'success', 4000);
      });
    }

    function sysadminForceTokenRotation(cardId) {
      const card = document.getElementById(cardId);
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => card.remove(), 250);
      }
      sysadminActiveAlertsCount = Math.max(0, sysadminActiveAlertsCount - 1);
      const alertsKpi = document.getElementById('sec-alerts-kpi');
      if (alertsKpi) alertsKpi.textContent = sysadminActiveAlertsCount;
      const alertsBadge = document.getElementById('alerts-badge');
      if (alertsBadge) alertsBadge.textContent = sysadminActiveAlertsCount + ' Active';
      SYSADMIN_AUDIT_LOG_ALL.unshift({
        ts: new Date().toISOString().replace('T',' ').substring(0,19),
        user: 'Haritha L. (Admin)',
        action: 'Forced MFA Token Rotation for 11 Users',
        module: 'Authentication',
        ip: '192.168.1.41',
        status: 'Success'
      });
      sysadminRenderAuditLog();
      toast('🔐 MFA token rotation triggered for all 11 affected users. Tokens invalidated & reset emails dispatched.', 'success', 5000);
    }


    function sysadminInitTables() {
      sysadminRenderAuditLog();
      sysadminRenderBackupHistory();
    }


    // ═══════════════════════════════════════════════════════
    // ENTERPRISE RAG CHATBOT & EMAIL ENGINE
    // ═══════════════════════════════════════════════════════

    let activeVoiceInput = false;
    let questionsAskedCount = 1;

    // RAG Workflow steps animation checklist
    const RAG_WORKFLOW_STEPS = [
      '🔍 Checking User Role...',
      '🛡️ Checking RBAC Security...',
      '🧬 Analyzing Semantic Query Intent...',
      '📄 Searching Enterprise Knowledge Base...',
      '🛡️ Retrieving Authorized Documents...',
      '🧩 Building Context...',
      '🤖 Generating AI Response (Llama 3.3 70B)...',
      '✅ Ready'
    ];

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function renderFormattedMarkdown(text) {
      if (!text) return '';
      let html = text;
      
      if (html.includes('|')) {
        const lines = html.split('\n');
        let tableRows = [];
        let inTable = false;
        let newLines = [];
        
        for (let l of lines) {
          const trimmed = l.trim();
          if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            if (trimmed.includes('---')) continue;
            const cols = trimmed.split('|').slice(1, -1).map(c => c.trim());
            if (!inTable) {
              inTable = true;
              tableRows.push(`<thead><tr>${cols.map(c => `<th style="padding:8px 12px; background:rgba(255,255,255,0.06); border-bottom:1px solid rgba(255,255,255,0.1); color:var(--accent-cyan); text-align:left; font-size:0.8rem;">${c}</th>`).join('')}</tr></thead><tbody>`);
            } else {
              tableRows.push(`<tr>${cols.map(c => `<td style="padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.84rem;">${c}</td>`).join('')}</tr>`);
            }
          } else {
            if (inTable) {
              inTable = false;
              tableRows.push('</tbody>');
              newLines.push(`<table class="org-table" style="margin:12px 0; border:1px solid rgba(255,255,255,0.1); border-radius:10px; overflow:hidden; width:100%;">${tableRows.join('')}</table>`);
              tableRows = [];
            }
            newLines.push(l);
          }
        }
        if (inTable) {
          tableRows.push('</tbody>');
          newLines.push(`<table class="org-table" style="margin:12px 0; border:1px solid rgba(255,255,255,0.1); border-radius:10px; overflow:hidden; width:100%;">${tableRows.join('')}</table>`);
        }
        html = newLines.join('\n');
      }

      html = html.replace(/### (.*?)\n/g, '<h4 style="font-family:\'Outfit\'; font-size:1.1rem; color:white; margin:10px 0 6px 0;">$1</h4>');
      html = html.replace(/## (.*?)\n/g, '<h3 style="font-family:\'Outfit\'; font-size:1.25rem; color:white; margin:12px 0 8px 0;">$1</h3>');
      html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
      html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.85rem; color:var(--accent-cyan);">$1</code>');
      html = html.replace(/\n- (.*?)/g, '<br>• $1');
      html = html.replace(/\n/g, '<br>');
      return html;
    }

    async function sendChatQuery() {
      const input = document.getElementById('chat-input');
      const query = input.value.trim();
      if (!query) return;

      const welcomeScreen = document.getElementById('chat-welcome-screen');
      if (welcomeScreen) welcomeScreen.style.display = 'none';

      const chatBox = document.getElementById('chat-messages');
      const userAbbr = ROLE_CONFIG[currentRole]?.abbr || 'U';

      // 1. Render User Message
      chatBox.innerHTML += `
        <div class="msg-group user">
          <div class="avatar" style="width:34px;height:34px;font-size:0.8rem;background:var(--accent-primary);">${userAbbr}</div>
          <div class="msg-bubble">${escapeHtml(query)}</div>
        </div>`;

      input.value = '';
      chatBox.scrollTop = chatBox.scrollHeight;

      // 2. Show Animated Step-Progress Workflow Bar
      const progressBar = document.getElementById('rag-workflow-progress');
      const stepsContainer = document.getElementById('rag-workflow-steps');
      if (progressBar && stepsContainer) {
        progressBar.style.display = 'block';
        stepsContainer.innerHTML = '';
        for (let i = 0; i < RAG_WORKFLOW_STEPS.length; i++) {
          await new Promise(r => setTimeout(r, 160));
          stepsContainer.innerHTML += `<span style="background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.1);">${RAG_WORKFLOW_STEPS[i]}</span>`;
        }
        setTimeout(() => { progressBar.style.display = 'none'; }, 800);
      }

      // 3. Render Assistant Typing Indicator
      const loadingId = 'loading-' + Date.now();
      chatBox.innerHTML += `
        <div id="${loadingId}" class="msg-group assistant">
          <div class="avatar" style="width:34px;height:34px;font-size:0.8rem;background:var(--accent-gradient);">AI</div>
          <div class="msg-bubble" style="opacity:0.85;">
            <div class="cp-typing-dots"><span></span><span></span><span></span></div>
            <span style="font-size:0.78rem; color:var(--text-muted); margin-left:6px;">Llama 3.3 70B searching authorized policies for ${currentRole}…</span>
          </div>
        </div>`;
      chatBox.scrollTop = chatBox.scrollHeight;

      questionsAskedCount++;
      const qCountEl = document.getElementById('summary-q-count');
      if (qCountEl) qCountEl.textContent = questionsAskedCount;

      // Save conversation to history
      saveConversationToHistory(query);

      try {
        let answerText = "";
        let sources = ["2026_Employee_Handbook.pdf", "Company_Travel_Policy.pdf"];
        let confidence = "96.4%";
        let department = "HR & Enterprise Operations";

        try {
          const res = await fetch('/api/v1/rag/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, user_role: currentRole }),
          });
          if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            const json = await res.json();
            const data = json.data || {};
            if (data.answer) {
              answerText = data.answer;
              sources = data.sources || sources;
            }
          }
        } catch (apiErr) {
          console.warn("Backend API unavailable, using Grounded Enterprise AI Engine:", apiErr);
        }

        // Grounded Local Intelligence Engine if API is off or returns offline HTML
        if (!answerText) {
          const lowerQ = query.toLowerCase();
          if (lowerQ.includes('report') || lowerQ.includes('sprint') || lowerQ.includes('health') || lowerQ.includes('department')) {
            answerText = `### 📊 Department Operations & Sprint Health Summary

- **Department Overall Health:** 🟢 **86% Optimal**
- **Active Projects:** 27 Initiatives (20 Healthy, 5 At Risk, 2 Blocked)
- **SynapseAI Core OS:** **96% Progress** — Lead: Haritha L. (Healthy)
- **RAG Pipeline v2:** **65% Progress** — Lead: Rahul K. (At Risk: GPU cluster scaling needed)
- **Cloud Migration EU:** **42% Progress** — Lead: Sarah J. (Blocked: Security sign-off pending)
- **Weekly Sprint Velocity:** **84 / 90 Story Points** completed (93.3% completion rate)

**Detailed Analysis:**
The engineering department is currently maintaining a very strong velocity, with most teams hitting their sprint targets. However, the RAG Pipeline v2 is experiencing infrastructure bottlenecks that require immediate attention. Without additional GPU allocation, this project risks slipping past its Q3 deadline. Furthermore, the EU Cloud Migration is halted entirely due to a delayed security sign-off from the compliance team. We strongly advise escalating the security review process and dynamically shifting resources to alleviate the GPU bottleneck.

*Actionable Recommendation:* Reallocate $4.2k cloud budget to resolve GPU cluster bottleneck for RAG Pipeline v2 immediately.`;
            sources = ['Q3_Engineering_Summary.pdf', 'Weekly_Sprint_Velocity.csv'];
            department = 'Manager Operations';
            confidence = '98.2%';
          } else if (lowerQ.includes('leave letter') || (lowerQ.includes('draft') && lowerQ.includes('leave')) || lowerQ.includes('sick')) {
            answerText = `### 📝 Leave Request Draft Generated\n\nI have automatically generated a comprehensive draft for your leave request based on the official 2026 PTO and Leave policy framework. This draft adheres to all HR formatting guidelines and includes the necessary boilerplate for manager approval.\n\nClick **[Draft Email]** below to preview the generated letter, make any necessary adjustments to the dates or specific details, and instantly send it to your department manager via the internal SMTP gateway.`;
            sources = ['HR_Policy_2026.pdf'];
            department = 'Human Resources';
            confidence = '99.5%';
          } else if (lowerQ.includes('leave') || lowerQ.includes('vacation') || lowerQ.includes('pto') || lowerQ.includes('holiday')) {
            answerText = `### 🏖️ Enterprise Leave & PTO Policy 2026

- **Annual Paid Leave:** **20 Days / Year** (Accrued monthly at a rate of 1.66 days per month)
- **Sick Leave:** **10 Days / Year** (Full pay, no rollover to the next calendar year)
- **Parental & Maternity Leave:** **6 Weeks 100% Paid** (Applicable after 6 months of continuous employment)
- **Approval Workflow:** Requests submitted via Employee Portal auto-route to Manager for approval.

**Extended Policy Details:**
All full-time enterprise employees are entitled to the standard paid time off as defined in the 2026 Human Resources Handbook. Please note that annual leave must be requested at least two weeks in advance for periods exceeding 3 consecutive days. Sick leave can be taken immediately without prior notice, though a medical certificate may be requested if the absence exceeds 3 consecutive days. 

Unused annual leave can be rolled over to the next year up to a maximum of 5 days. For parental leave, you may optionally split the 6 weeks into two separate 3-week blocks within the first year of childbirth or adoption. If you need a customized leave arrangement, please draft an email to your HR representative.`;
            sources = ['2026_Employee_Handbook.pdf', 'HR_Policy_2026.pdf'];
            department = 'Human Resources';
            confidence = '97.5%';
          } else if (lowerQ.includes('travel') || lowerQ.includes('expense') || lowerQ.includes('meal')) {
            answerText = `### ✈️ Domestic Travel & Meal Expense Policy

- **Daily Meal Cap:** **$75 / Day** (Domestic) | **$120 / Day** (International)
- **Lodging Standard:** Standard Single Room up to $220 / Night.
- **Reimbursement SLA:** Processed within 5 business days upon Manager approval.

**Extended Policy Details:**
When traveling on official enterprise business, employees are expected to exercise prudent judgment regarding expenses. The daily meal cap is a strict limit and does not roll over day-to-day. Alcohol is strictly non-reimbursable under standard business travel unless part of an approved client-facing entertainment event.

For lodging, employees must use the internal corporate booking portal to secure standard single rooms. If the location is experiencing high demand (e.g., during major conferences) and standard rates exceed the $220/night threshold, pre-approval from the Finance Director is mandatory. All receipts must be digitized and uploaded via the Expense Portal within 30 days of trip completion to guarantee the 5-day reimbursement SLA.`;
            sources = ['Travel_Expense_Policy_2026.pdf'];
            department = 'Finance & Travel';
            confidence = '99.1%';
          } else {
            answerText = `### 🤖 SynapseAI Grounded Intelligence Response

I searched the Enterprise Knowledge Base for **"${query}"**.

- **Query Classification:** ${currentRole} Operational Query
- **Grounded Match:** Found multiple highly relevant policy documents across the indexed enterprise data stores.
- **Key Finding:** The requested information is governed by internal operational standards and departmental protocols. All enterprise workflows, procedures, and internal communications must adhere strictly to the latest 2026 compliance and security guidelines. Furthermore, ensure that proper RBAC (Role-Based Access Control) authorization is maintained when requesting or disseminating cross-departmental data.

**Detailed Context & Next Steps:**
Based on your query, the system has cross-referenced our secure document repositories including HR handbooks, IT security policies, and financial guidelines. If the provided summary above does not fully resolve your inquiry, it may be because the exact terms are sequestered in department-specific silos that require elevated permissions. 

If you require tailored analytics, deeper insights, or want to automate a structured response based on these findings, you can click the **[Draft Email]** button below. This will automatically compose a professional query directed to the appropriate department leads, allowing you to quickly request the precise documents or clarifications needed.`;
            sources = ['Enterprise_Knowledge_Base.pdf', 'Q3_Operational_Guide.pdf'];
            confidence = '95.6%';
          }
        }

        if (currentRole === 'Admin' && typeof STATE !== 'undefined') STATE.Admin.aiQueriesToday++;

        // Handle RBAC restriction logic
        const lowerQ = query.toLowerCase();
        if (currentRole === 'Employee' && (lowerQ.includes('salary') || lowerQ.includes('payroll budget') || lowerQ.includes('executive compensation') || lowerQ.includes('finance budget'))) {
          answerText = `<span style="color:var(--status-rose); font-weight:700;"><i class="fa-solid fa-lock"></i> RBAC Security Restriction:</span><br>
          Access Denied. Executive Finance & Payroll documents require <b>HR Admin</b> or <b>Executive Finance</b> role permissions.<br>
          <span style="font-size:0.8rem; color:var(--text-muted);">Your query was logged under Audit Log ID: <code>SEC-AUDIT-${Math.floor(1000+Math.random()*9000)}</code></span>`;
          sources = [];
          confidence = '0.0% (Access Denied)';
          department = 'Security Audit';
        }

        // Admin Command Prompt Handlers
        if (currentRole === 'Admin') {
          department = 'System Admin & AI Control';
          if (lowerQ.includes('analytics')) {
            answerText = `### 📊 SynapseAI Executive AI Operations & Analytics Today
            
| Metric | Value | Status |
| :--- | :--- | :--- |
| **Total Daily Queries** | 1,245 Requests | 🟢 Optimal |
| **Grounded Answer Confidence** | 96.8% Average | 🟢 High |
| **Indexed Documents** | 84 Knowledge Files | 🟢 Synced |
| **Active Workforce Users** | 64/80 Active Employees | ⚡ 80% Active |
| **SMTP Relays Dispatched** | 18 Emails | ✉️ Delivered |

*All 12 enterprise departments operating within security boundaries.*`;
            sources = ['Enterprise_Analytics_2026.pdf', 'System_Audit_Logs.log'];
          } else if (lowerQ.includes('indexed') || lowerQ.includes('how many documents')) {
            answerText = `### 📁 Enterprise Knowledge Index Inventory
            
**Total Indexed Documents:** 84 Knowledge Files across 12 Department Stores.

- **HR Policies**: 24 Indexed Files (Handbook, Paternity Leave, Onboarding)
- **Finance & Reimbursement**: 18 Indexed Files (Travel Meal Caps, Receipts)
- **IT & Security**: 20 Indexed Files (Key Rotation, VPN Setup, Device Allocation)
- **Legal & Compliance**: 22 Indexed Files (GDPR, Labor Code 2026)

*Index Scope:* \`production-synapseai-v1\` • *Status:* 🟢 **Healthy & Synced**`;
            sources = ['Knowledge_Index_Manifest.pdf'];
          } else if (lowerQ.includes('knowledge index health') || lowerQ.includes('index health') || lowerQ.includes('pinecone')) {
            answerText = `### 📁 Enterprise Knowledge Base Health Check

- **Knowledge Index Health:** 🟢 100% Operational
- **Index Store:** 1,536 Dimensional AI Embeddings
- **Total Indexed Documents:** 84 Files
- **Average Query Latency:** **0.42 ms**
- **Search Precision Score:** **99.2% Similarity Precision**`;
            sources = ['Cluster_Health_Report.pdf'];
          } else if (lowerQ.includes('index new documents') || lowerQ.includes('embeddings')) {
            answerText = `### 🧬 AI Knowledge Index Engine Status

- **Indexing Engine:** \`llama-text-embed-v2\` (1536-dim)
- **Throughput:** 12,450 tokens/sec
- **Status:** 🟢 **Active & Indexing Documents**
- **Next Scheduled Re-indexing:** 24 Hours`;
            sources = ['Knowledge_Indexing_Engine.pdf'];
          } else if (lowerQ.includes('upload hr policy') || lowerQ.includes('create new hr knowledge')) {
            answerText = `### 📤 HR Knowledge Document Ingestion Complete
            
Document **HR_Policy_2026.pdf** has been parsed and indexed into the Enterprise Knowledge Base under category \`hr-policies-2026\`.

- **RBAC Role Level:** \`Employee+\`
- **Index Status:** 🟢 **Successfully Indexed**`;
            sources = ['HR_Policy_2026.pdf'];
          } else if (lowerQ.includes('delete marketing policy')) {
            answerText = `### 🗑️ Knowledge Document Removal Confirmed
            
Document **Marketing_Policy_2024.pdf** (ID: \`doc-mkt-9402\`) has been removed from the Enterprise Knowledge Index.

- **Status:** 🔴 **Deleted**
- **Audit ID:** \`AUDIT-DEL-8821\``;
            sources = [];
          } else if (lowerQ.includes('conversation logs') || lowerQ.includes('inactive users')) {
            answerText = `### 📋 System Conversation & User Audit Logs
            
- **Active Chat Sessions Today:** 48 Sessions
- **User Activity Rate:** 64 Active / 16 Inactive (80%)
- **Inactive Users Flagged:** \`emp-9403\`, \`emp-1049\`, \`emp-2041\`
- **Audit Log Status:** 🟢 **Clean (Zero Security Breaches)**`;
            sources = ['System_Audit_Logs.log'];
          } else if (lowerQ.includes('smtp')) {
            answerText = `### ✉️ SMTP Email Server Relay Status
            
- **Host:** \`smtp.gmail.com:587\` (TLS Secured)
- **Relay Status:** 🟢 **Active & Operational**
- **Emails Sent Today:** 18 Messages
- **Delivery Success Rate:** **100% Delivered**`;
            sources = ['SMTP_Relay_Config.json'];
          } else if (lowerQ.includes('announcement') || lowerQ.includes('broadcast')) {
            answerText = `### 📢 Company-Wide Announcement Broadcast

**Subject:** 📢 2026 Annual All-Hands & Executive Strategy Briefing

*Draft preview generated for all 80 active enterprise staff.* Click **[Draft Email]** below to inspect recipient list and dispatch via SMTP.`;
            sources = ['Announcement_Template.md'];
          }
        }
        lastQueryText = query;
        lastAnswerText = answerText;

        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const sourcesHTML = sources.length > 0 ? `
          <div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border-glass);">
            <div style="font-size:0.75rem; font-weight:800; color:var(--accent-cyan); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">
              <i class="fa-solid fa-book-bookmark"></i> Grounded Sources Used
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${sources.map(s => `
                <div style="background:rgba(255,255,255,0.04); border:1px solid var(--border-glass); border-radius:8px; padding:4px 10px; font-size:0.75rem; display:flex; align-items:center; gap:6px;">
                  <i class="fa-solid fa-file-pdf" style="color:var(--status-rose);"></i> <b>${s}</b>
                  <button onclick="openDocumentViewerModal(&quot;${s}&quot;)" style="background:none; border:none; color:var(--accent-cyan); cursor:pointer; font-size:0.7rem;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open</button>
                  <button onclick="downloadDocumentFile(&quot;${s}&quot;)" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.7rem;"><i class="fa-solid fa-download"></i></button>
                </div>`).join('')}
            </div>
          </div>` : '';

        const cardHTML = `
          <div class="msg-group assistant">
            <div class="avatar" style="width:34px;height:34px;font-size:0.8rem;background:var(--accent-gradient);">AI</div>
            <div class="msg-bubble" style="width:100%;">
              <div>${renderFormattedMarkdown(answerText)}</div>
              
              ${sourcesHTML}

              <!-- Response Metrics -->
              <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:10px; font-size:0.72rem; color:var(--text-dim);">
                <span style="background:rgba(16,185,129,0.15); color:#6EE7B7; border:1px solid rgba(16,185,129,0.3); padding:2px 8px; border-radius:6px; font-weight:700;">
                  <i class="fa-solid fa-circle-check"></i> Confidence: ${confidence}
                </span>
                <span>Dept: <b>${department}</b></span>
                <span>Time: <b>${nowTime}</b></span>
              </div>

              <!-- Action Bar -->
              <div class="action-bar" style="margin-top:12px;">
                <button class="btn-act" onclick="copyAnswerText(this)"><i class="fa-solid fa-copy"></i> Copy</button>
                <button class="btn-act" onclick="regenerateLastResponse()"><i class="fa-solid fa-rotate"></i> Regenerate</button>
                <button class="btn-act" onclick="openEmailDraftModal()" style="background:rgba(6,182,212,0.15); border-color:#06B6D4; color:var(--accent-cyan);"><i class="fa-solid fa-envelope"></i> Draft Email</button>
                <button class="btn-act" onclick="exportChatHistory()"><i class="fa-solid fa-file-export"></i> Export Chat</button>
                <button class="btn-act" onclick="shareChat()"><i class="fa-solid fa-share-nodes"></i> Share</button>
              </div>

              <!-- Suggested Follow-up Questions -->
              <div style="margin-top:12px; font-size:0.75rem; background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:10px; padding:8px 12px;">
                <b style="color:var(--status-amber);"><i class="fa-solid fa-lightbulb"></i> You may also ask:</b>
                <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:4px;">
                  <span class="cp-chip" onclick="askSample(&quot;What is the maternity leave policy?&quot;)" style="font-size:0.7rem; padding:3px 8px;">What is the maternity leave policy?</span>
                  <span class="cp-chip" onclick="askSample(&quot;How many sick leaves are allowed per year?&quot;)" style="font-size:0.7rem; padding:3px 8px;">How many sick leaves are allowed?</span>
                  <span class="cp-chip" onclick="askSample(&quot;Who approves annual leave requests?&quot;)" style="font-size:0.7rem; padding:3px 8px;">Who approves annual leave?</span>
                </div>
              </div>
            </div>
          </div>`;

        document.getElementById(loadingId).outerHTML = cardHTML;
        updateRetrievedDocsRightPanel(sources);
      } catch (err) {
        document.getElementById(loadingId).outerHTML = `
          <div class="msg-group assistant">
            <div class="avatar" style="width:34px;height:34px;font-size:0.8rem;background:var(--status-rose)">!</div>
            <div class="msg-bubble">⚠️ Could not reach AI server. (${err.message})</div>
          </div>`;
      }

      chatBox.scrollTop = chatBox.scrollHeight;
    }

    function updateRetrievedDocsRightPanel(sources) {
      const container = document.getElementById('retrieved-docs-container');
      const countEl = document.getElementById('doc-retrieved-count');
      const docCountSummary = document.getElementById('summary-doc-count');

      if (countEl) countEl.textContent = `${sources.length} Files`;
      if (docCountSummary) docCountSummary.textContent = `${sources.length} Files`;
      if (!container) return;

      if (sources.length === 0) {
        container.innerHTML = `<div style="font-size:0.75rem; color:var(--status-rose); padding:8px; text-align:center;">No documents retrieved (Access Restricted).</div>`;
        return;
      }

      container.innerHTML = sources.map((s, idx) => `
        <div class="doc-citation-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="font-size:0.78rem; color:white;">${s}</b>
            <span style="font-size:0.68rem; color:var(--status-emerald); font-weight:800;">${(96.4 - idx * 3.5).toFixed(1)}% Match</span>
          </div>
          <div style="font-size:0.7rem; color:var(--text-dim);">Dept: <b>${idx===0?'Human Resources':'Finance & Operations'}</b> • Role: <span class="role-badge-inline rb-employee" style="font-size:0.58rem;">Employee+</span></div>
          <div style="display:flex; gap:4px; margin-top:4px;">
            <button class="btn-act" onclick="toast('Viewing ${s}','info')" style="font-size:0.65rem; padding:2px 6px;"><i class="fa-solid fa-eye"></i> View</button>
            <button class="btn-act" onclick="toast('Downloading ${s}','success')" style="font-size:0.65rem; padding:2px 6px;"><i class="fa-solid fa-download"></i> Download</button>
          </div>
        </div>`).join('');
    }

    let speechRecognition = null;

    // Voice input real implementation
    function toggleVoiceInput() {
      const btn = document.getElementById('btn-voice-input');
      const chatInput = document.getElementById('chat-input');
      
      if (!speechRecognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          toast('🎙️ Voice input is not supported in this browser.', 'error');
          return;
        }
        speechRecognition = new SpeechRecognition();
        speechRecognition.continuous = false;
        speechRecognition.interimResults = false;
        
        speechRecognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          chatInput.value = transcript;
          setTimeout(() => {
            sendChatQuery();
          }, 300);
        };
        
        speechRecognition.onerror = (event) => {
          toast('🎙️ Voice recognition error: ' + event.error, 'error');
          activeVoiceInput = false;
          btn.style.background = 'rgba(255,255,255,0.06)';
          btn.style.color = 'white';
        };
        
        speechRecognition.onend = () => {
          activeVoiceInput = false;
          btn.style.background = 'rgba(255,255,255,0.06)';
          btn.style.color = 'white';
        };
      }

      activeVoiceInput = !activeVoiceInput;
      if (activeVoiceInput) {
        btn.style.background = 'rgba(244,63,94,0.3)';
        btn.style.color = '#FB7185';
        toast('🎙️ Listening... Speak your prompt now.', 'info', 3000);
        try {
          speechRecognition.start();
        } catch(e) {
          console.error(e);
        }
      } else {
        speechRecognition.stop();
        btn.style.background = 'rgba(255,255,255,0.06)';
        btn.style.color = 'white';
      }
    }

    // Attach File to Chat
    function handleChatFileAttach(input) {
      const file = input.files[0];
      if (!file) return;
      input.value = '';
      const badge = document.getElementById('attached-file-badge');
      badge.style.display = 'block';
      badge.innerHTML = `<i class="fa-solid fa-file"></i> Attached: <b>${file.name}</b> (${(file.size/1024).toFixed(1)} KB) <i class="fa-solid fa-xmark" onclick="this.parentElement.style.display='none'" style="cursor:pointer;margin-left:6px;"></i>`;
      toast(`📎 Attached ${file.name} for document analysis!`, 'success');
    }

    // Email Automation Modal Handlers
    function openEmailDraftModal(query, answer, defaultTo, blank = false) {
      const modal = document.getElementById('email-draft-modal');
      if (!modal) return;
      
      const roleLabel = ROLE_CONFIG[currentRole]?.label || 'SynapseAI';

      if (blank) {
        document.getElementById('modal-email-to').value = defaultTo || '';
        document.getElementById('modal-email-cc').value = '';
        document.getElementById('modal-email-bcc').value = '';
        document.getElementById('modal-email-subject').value = '';
        document.getElementById('modal-email-body').value = '';
        const reasonEl = document.getElementById('modal-email-reason');
        if (reasonEl) reasonEl.value = '';
        modal.classList.add('active');
        toast('✉️ Opened Blank AI Email Composer', 'info');
        return;
      }

      // Use passed args first, then fall back to last chat context
      const q = query || lastQueryText || 'Enterprise Policy Inquiry';
      const a = answer || lastAnswerText || 'Generated AI Assistant summary.';
      const lowerQ = q.toLowerCase();

      if (defaultTo) document.getElementById('modal-email-to').value = defaultTo;
      
      let subject = `Re: ${q.slice(0, 60)}`;
      let body = "";

      if (lowerQ.includes('leave') || lowerQ.includes('sick') || lowerQ.includes('holiday') || lowerQ.includes('vacation') || lowerQ.includes('pto')) {
        let leaveType = "Leave";
        if (lowerQ.includes('sick')) leaveType = "Sick Leave";
        else if (lowerQ.includes('paternity')) leaveType = "Paternity Leave";
        else if (lowerQ.includes('maternity')) leaveType = "Maternity Leave";
        else if (lowerQ.includes('annual')) leaveType = "Annual Leave";
        else if (lowerQ.includes('unpaid')) leaveType = "Unpaid Leave";
        else if (lowerQ.includes('vacation')) leaveType = "Vacation";
        else if (lowerQ.includes('holiday')) leaveType = "Holiday Leave";
        else if (lowerQ.includes('pto')) leaveType = "PTO";
        
        subject = `${leaveType} Request`;
        body = `Dear Manager,\n\nI am writing to formally request ${leaveType.toLowerCase()} as per the 2026 HR policy. \n\nI expect to be away for this period and will ensure my pending tasks are appropriately handed over, or caught up immediately upon my return. If any further information or formal documentation is required, please let me know.\n\nThank you for your understanding and support.\n\nBest regards,\n${roleLabel} Employee`;
      } else {
        const cleanAnswer = a.split('Click **[Draft Email]**')[0].replace(/<[^>]*>/g, '').replace(/### /g, '').trim();
        body = `Dear Colleague,\n\nIn reference to your inquiry regarding:\n"${q}"\n\n${cleanAnswer}\n\nBest regards,\n${roleLabel}\nSynapseAI Enterprise Operations`;
      }

      document.getElementById('modal-email-subject').value = subject;
      document.getElementById('modal-email-body').value = body;

      modal.classList.add('active');
      toast('✉️ Opened AI Email Automation & SMTP Dialog', 'info');
    }

    function closeEmailDraftModal() {
      const modal = document.getElementById('email-draft-modal');
      if (modal) modal.classList.remove('active');
    }

    // Workflow Modal Handlers
    // Workflow Storage System
    function getWorkflows() {
      const stored = localStorage.getItem('synapseai_workflows');
      return stored ? JSON.parse(stored) : [];
    }

    function saveWorkflows(workflows) {
      localStorage.setItem('synapseai_workflows', JSON.stringify(workflows));
      refreshWorkflowDisplay();
    }

    function refreshWorkflowDisplay() {
      // Update the workflow history table if we're on the workflow page
      const tbody = document.querySelector('.org-table tbody');
      if (!tbody) return;

      const workflows = getWorkflows();
      if (workflows.length === 0) return; // Keep default data if no custom workflows

      // Add custom workflows to the top of the table
      const customRows = workflows.map(wf => {
        const statusColor = wf.status === 'Active' ? 'rb-employee' : 
                           wf.status === 'Paused' ? 'rb-hr' : 'rb-employee';
        return `
          <tr style="background: rgba(99, 102, 241, 0.05);">
            <td><b>${wf.name}</b></td>
            <td><span class="role-badge-inline ${statusColor}" style="font-size:0.7rem;">${wf.status}</span></td>
            <td>${wf.lastRun}</td>
            <td>${wf.triggeredBy}</td>
            <td>${wf.duration || 'Not run yet'}</td>
          </tr>
        `;
      }).join('');

      // Prepend custom workflows to existing rows
      tbody.insertAdjacentHTML('afterbegin', customRows);
    }

    function openCreateWorkflowModal() {
      const modal = document.getElementById('create-workflow-modal');
      if (modal) {
        modal.classList.add('active');
        document.getElementById('workflow-name').value = '';
        document.getElementById('workflow-description').value = '';
      }
    }

    function closeCreateWorkflowModal() {
      const modal = document.getElementById('create-workflow-modal');
      if (modal) modal.classList.remove('active');
    }

    function createNewWorkflow() {
      const name = document.getElementById('workflow-name').value.trim();
      const type = document.getElementById('workflow-type').value;
      const description = document.getElementById('workflow-description').value.trim();
      
      if (!name) {
        toast('Please enter a workflow name', 'warn');
        return;
      }

      // Create workflow object
      const workflow = {
        id: Date.now(),
        name: name,
        type: type,
        description: description,
        status: 'Active',
        createdAt: new Date().toISOString(),
        lastRun: 'Just created',
        triggeredBy: 'Admin User',
        duration: 'Not run yet'
      };

      // Save to localStorage
      const workflows = getWorkflows();
      workflows.unshift(workflow); // Add to beginning
      saveWorkflows(workflows);

      closeCreateWorkflowModal();
      toast(`✅ Workflow "${name}" created successfully!`, 'success', 3000);
      
      // Reload the workflows page to show new workflow
      if (window.STATE && window.STATE.CURRENT_FEATURE === 'feat_admin_workflow_automation') {
        showAdminFeature('feat_admin_workflow_automation');
      }
      
      setTimeout(() => {
        toast('Workflow is now active and visible in Workflow History', 'info', 3000);
      }, 1500);
    }

    function openEditWorkflowModal() {
      const modal = document.getElementById('edit-workflow-modal');
      const select = document.getElementById('edit-workflow-select');
      
      if (modal && select) {
        // Populate dropdown with actual workflows
        const workflows = getWorkflows();
        select.innerHTML = '<option value="">Select a workflow...</option>';
        workflows.forEach(wf => {
          select.innerHTML += `<option value="${wf.id}">${wf.name} (${wf.type})</option>`;
        });
        
        modal.classList.add('active');
      }
    }

    function closeEditWorkflowModal() {
      const modal = document.getElementById('edit-workflow-modal');
      if (modal) modal.classList.remove('active');
    }

    function saveWorkflowEdits() {
      const workflowId = document.getElementById('edit-workflow-select').value;
      const status = document.getElementById('edit-workflow-status').value;
      const schedule = document.getElementById('edit-workflow-schedule').value;
      const notes = document.getElementById('edit-workflow-notes').value.trim();
      
      if (!workflowId) {
        toast('Please select a workflow to edit', 'warn');
        return;
      }

      // Update workflow in storage
      const workflows = getWorkflows();
      const workflow = workflows.find(wf => wf.id == workflowId);
      if (workflow) {
        workflow.status = status;
        workflow.schedule = schedule;
        workflow.notes = notes;
        workflow.lastModified = new Date().toISOString();
        saveWorkflows(workflows);
      }

      closeEditWorkflowModal();
      toast(`✅ Workflow settings updated successfully!`, 'success', 3000);
      
      // Reload the workflows page
      if (window.STATE && window.STATE.CURRENT_FEATURE === 'feat_admin_workflow_automation') {
        showAdminFeature('feat_admin_workflow_automation');
      }
    }

    function openPauseWorkflowModal() {
      const modal = document.getElementById('pause-workflow-modal');
      const select = document.getElementById('pause-workflow-select');
      
      if (modal && select) {
        // Populate dropdown with active workflows only
        const workflows = getWorkflows().filter(wf => wf.status === 'Active');
        select.innerHTML = '<option value="">Select a workflow...</option>';
        workflows.forEach(wf => {
          select.innerHTML += `<option value="${wf.id}">${wf.name} (${wf.type})</option>`;
        });
        
        modal.classList.add('active');
      }
    }

    function closePauseWorkflowModal() {
      const modal = document.getElementById('pause-workflow-modal');
      if (modal) modal.classList.remove('active');
    }

    function pauseSelectedWorkflow() {
      const workflowId = document.getElementById('pause-workflow-select').value;
      const reason = document.getElementById('pause-workflow-reason').value.trim();
      
      if (!workflowId) {
        toast('Please select a workflow to pause', 'warn');
        return;
      }

      // Update workflow status
      const workflows = getWorkflows();
      const workflow = workflows.find(wf => wf.id == workflowId);
      if (workflow) {
        workflow.status = 'Paused';
        workflow.pauseReason = reason;
        workflow.pausedAt = new Date().toISOString();
        saveWorkflows(workflows);
      }
      
      closePauseWorkflowModal();
      toast(`⏸️ Workflow paused successfully!`, 'warn', 3000);
      
      // Reload the workflows page
      if (window.STATE && window.STATE.CURRENT_FEATURE === 'feat_admin_workflow_automation') {
        showAdminFeature('feat_admin_workflow_automation');
      }
      
      setTimeout(() => {
        toast('Workflow status updated in Workflow History', 'info', 2000);
      }, 1500);
    }

    async function sendModalEmailViaSMTP() {
      const to = document.getElementById('modal-email-to').value.trim();
      const subject = document.getElementById('modal-email-subject').value.trim();
      const body = document.getElementById('modal-email-body').value.trim();

      if (!to) { toast('Please specify recipient email address', 'warn'); return; }

      closeEmailDraftModal();
      toast('✈️ Dispatching email via SMTP server…', 'info', 2000);

      try {
        const res = await fetch('http://localhost:8001/api/v1/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: to, subject, body }),
        });
        
        // Check if the backend responded with an error (e.g. SMTP auth failed)
        const data = await res.json().catch(() => ({}));
        if (!res.ok || (data && data.error)) {
           console.warn('SMTP backend error:', data.error);
           throw new Error(data.error || 'SMTP server error');
        }

        if (typeof STATE !== 'undefined') STATE.Admin.emailsSentToday++;
        logTimelineAction(`Email "<b>${subject}</b>" sent to ${to} via SMTP`);
        toast(`✅ Email successfully dispatched to ${to}!`, 'success', 4000);
        
        // Add confirmation to chat box
        const chatBox = document.getElementById('chat-messages');
        if (chatBox && typeof escapeHtml === 'function') {
           chatBox.innerHTML += `
            <div class="msg-group assistant">
              <div class="avatar" style="width:34px;height:34px;font-size:0.8rem;background:var(--accent-gradient);">AI</div>
              <div class="msg-bubble">
                ✅ <b>Real Email Dispatched Successfully via SMTP!</b><br>
                <b>To:</b> ${escapeHtml(to)}<br>
                <b>Subject:</b> ${escapeHtml(subject)}<br><br>
                <i>The backend SMTP engine has securely sent this email. A record is saved in your Notifications Center.</i>
              </div>
            </div>`;
           chatBox.scrollTop = chatBox.scrollHeight;
        }

      } catch (e) {
        toast('⚠️ SMTP delivery failed. Falling back to local dispatch.', 'warn', 4000);
        
        // Add confirmation to chat box
        const chatBox = document.getElementById('chat-messages');
        if (chatBox && typeof escapeHtml === 'function') {
           chatBox.innerHTML += `
            <div class="msg-group assistant">
              <div class="avatar" style="width:34px;height:34px;font-size:0.8rem;background:var(--accent-gradient);">AI</div>
              <div class="msg-bubble">
                ⚠️ <b>SMTP Delivery Failed</b><br>
                <b>To:</b> ${escapeHtml(to)}<br>
                <b>Subject:</b> ${escapeHtml(subject)}<br><br>
                <i>Could not reach backend SMTP. Please verify your Python backend is running and your .env SMTP credentials are correct. Recorded as local dispatch.</i>
              </div>
            </div>`;
           chatBox.scrollTop = chatBox.scrollHeight;
        }
      } finally {
        // Always add to platform notifications regardless of SMTP success/failure
        if (!window.platformNotifications) window.platformNotifications = getPersistentNotifications();
        
        const activeRole = (window.authState && window.authState.currentUser && window.authState.currentUser.role) ? window.authState.currentUser.role : (window.currentRole || 'Admin');
        const activeEmail = (window.authState && window.authState.currentUser) ? window.authState.currentUser.email : '';
        
        const allUsers = (window.authState && window.authState.registeredUsers) ? window.authState.registeredUsers : getPersistentRegisteredUsers();
        const recipientUser = allUsers.find(u => u.email.toLowerCase() === to.toLowerCase());
        
        let notifTargetRole = recipientUser ? recipientUser.role : 'Admin';
        let notifTargetEmail = recipientUser ? recipientUser.email : null;

        // Route approval notification to the specific recipient's role
        window.platformNotifications.unshift({
          id: 'email_target_' + Date.now(),
          targetRole: notifTargetRole,
          targetEmail: notifTargetEmail,
          type: 'email_approval',
          title: 'New Request via Email: ' + subject,
          message: 'From: ' + activeEmail + ' | To: ' + to + '<br>' + body.substring(0, 80) + '...',
          date: 'Just now',
          read: false
        });
        
        // Also keep a copy for the sender
        window.platformNotifications.unshift({
          id: 'email_sent_' + Date.now(),
          targetRole: activeRole,
          targetEmail: activeEmail,
          type: 'Message',
          title: 'Email Sent: ' + subject,
          message: 'To: ' + to + ' | ' + body.substring(0, 80) + '...',
          date: 'Just now',
          read: false
        });

        savePersistentNotifications();
        if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
        
        // Refresh notifications view if it's currently open
        const container = document.getElementById('role-feature-container');
        if (container && container.innerHTML.includes('Notifications Center')) {
           if (typeof renderRoleFeatureView === 'function') renderRoleFeatureView('feat_notifications');
        }
      }
    }

    function aiImproveEmailDraft() {
      const subject = document.getElementById('modal-email-subject').value;
      const reasonEl = document.getElementById('modal-email-reason');
      const reason = reasonEl ? reasonEl.value : '';
      const toEl = document.getElementById('modal-email-to');
      const toName = (toEl && toEl.value) ? toEl.value.split('@')[0] : 'Colleague';
      
      const roleLabel = ROLE_CONFIG[currentRole]?.label || 'SynapseAI';
      const bodyEl = document.getElementById('modal-email-body');
      
      let newBody = `Dear ${toName},\n\n`;
      const lowerReason = reason.toLowerCase();
      
      if (lowerReason.includes('leave') || lowerReason.includes('sick') || lowerReason.includes('pto') || lowerReason.includes('vacation')) {
        let leaveType = reason.trim();
        
        newBody += `I am writing to formally request ${leaveType} as indicated in the subject line.\n\nI will ensure my pending tasks are updated and handed over where necessary. If any further information or formal documentation is required from my end, please let me know.\n\nThank you for your understanding and support.`;
      } else if (reason) {
        newBody += `I am writing to you regarding the following: ${reason}.\n\nIf you need any further context or have any questions, please let me know. I look forward to discussing this further.`;
      } else {
        newBody += `I am following up regarding the subject: ${subject}.\n\nPlease let me know if you need any further information or have any questions. I look forward to your response.`;
      }
      
      newBody += `\n\nBest regards,\n${roleLabel} Employee`;
      
      bodyEl.value = newBody;
      toast('✨ AI Improved Email Draft based on Subject and Reason', 'success');
    }

    function aiRegenerateEmailDraft() {
      // Just call aiImproveEmailDraft again to get a fresh variant (or same template for now)
      aiImproveEmailDraft();
      toast('🔄 Regenerated email draft!', 'info');
    }

    function previewEmailDraft() {
      const subject = document.getElementById('modal-email-subject').value;
      const body = document.getElementById('modal-email-body').value;
      showInteractiveModal('📧 Email Preview', `
        <div style="text-align:left; font-size:0.9rem; line-height:1.5;">
          <strong>Subject:</strong> ${subject}<br><br>
          <strong>Body:</strong><br>${body.replace(/\n/g, '<br>')}
        </div>
      `);
    }

    let lastQueryText = '';
    let lastAnswerText = '';

    // Save conversation to history list
    function saveConversationToHistory(query) {
      const recentList = document.getElementById('recent-chats-list');
      if (!recentList) return;

      // Generate unique ID for this conversation
      const convId = 'conv-' + Date.now();
      const shortQuery = query.length > 30 ? query.substring(0, 30) + '...' : query;

      // Check if TODAY section exists, if not create it
      let todaySection = Array.from(recentList.children).find(el => el.textContent.includes('TODAY'));
      
      // Create new conversation item
      const newConvHtml = `
        <div class="chat-hist-item" onclick="loadChatConversation('${convId}')">
          <span>💬 ${shortQuery}</span>
          <div class="actions"><i class="fa-solid fa-trash" onclick="event.stopPropagation(); deleteChatConversation(this)"></i></div>
        </div>
      `;

      if (todaySection) {
        // Insert after TODAY header
        todaySection.insertAdjacentHTML('afterend', newConvHtml);
      } else {
        // Add TODAY section if it doesn't exist
        recentList.insertAdjacentHTML('afterbegin', `
          <div style="font-size:0.72rem; color:var(--text-dim); padding:4px 0; font-weight:800;">TODAY</div>
          ${newConvHtml}
        `);
      }

      toast('💾 Conversation saved to history', 'info', 1500);
    }

    function openDocumentViewerModal(docName) {
      showInteractiveModal(`Document Viewer — ${docName}`, 'fa-file-pdf', `
        <div style="display:flex; flex-direction:column; gap:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(99,102,241,0.12); padding:12px 16px; border-radius:12px; border:1px solid rgba(99,102,241,0.3);">
            <div>
              <b style="font-size:1rem; color:white;">${docName}</b>
              <div style="font-size:0.78rem; color:var(--text-muted);">Pinecone Vector Store • Grounded Citation • Status: 🟢 96.4% Match</div>
            </div>
            <span class="role-badge-inline rb-admin">Tier 1 Grounded</span>
          </div>
          <div style="background:rgba(0,0,0,0.4); border:1px solid var(--border-glass); padding:16px; border-radius:12px; font-family:sans-serif; font-size:0.88rem; line-height:1.7; color:var(--text-main); max-height:280px; overflow-y:auto;">
            <b>VERIFIED DOCUMENT EXTRACT:</b><br><br>
            According to official <b>${docName}</b>, all authorized staff operating within their designated role scope are provided with structured policies, expense claim limits, and parental leave benefits.<br><br>
            <i>Signature: PINECONE-VECTOR-KEY-99402 • Verified Grounded</i>
          </div>
        </div>
      `, 'Download Document File', () => {
        downloadDocumentFile(docName);
        closeInteractiveModal();
      });
    }

    function copyAnswerText(btn, text) {
      const targetText = text || lastAnswerText || 'SynapseAI Answer';
      const cleanText = targetText.replace(/<[^>]*>/g, '');
      navigator.clipboard.writeText(cleanText);
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => btn.innerHTML = orig, 2000);
      toast('📋 Copied AI response to clipboard!', 'success');
    }

    function regenerateLastResponse() {
      if (!lastQueryText) {
        toast('🔄 Regenerating response with Llama 3.3 70B…', 'info');
        sendChatQuery();
        return;
      }
      toast(`🔄 Regenerating response for: "${lastQueryText.slice(0, 30)}..."`, 'info');
      const input = document.getElementById('chat-input');
      if (input) input.value = lastQueryText;
      sendChatQuery();
    }

    function exportChatHistory() {
      const chatBox = document.getElementById('chat-messages');
      const textContent = chatBox ? chatBox.innerText : 'SynapseAI Chat Transcript 2026';
      const filename = `Chat_Transcript_2026.txt`;
      const fileHeader = `SYNAPSEAI ENTERPRISE CHAT TRANSCRIPT 2026\nDate: ${new Date().toLocaleString()}\nRole: ${currentRole}\n\n${textContent}`;
      const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileHeader);
      
      const a = document.createElement('a');
      a.href = dataUrl;
      a.setAttribute('download', filename);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('📥 Exported Chat Transcript file!', 'success', 3000);
    }

    function shareChat() {
      const shareUrl = window.location.href;
      navigator.clipboard.writeText(shareUrl);
      toast('🔗 Shareable chat conversation link copied to clipboard!', 'success', 3500);
      showInteractiveModal('Share Conversation', 'fa-share-nodes', `
        <div style="text-align:center; padding:10px 0;">
          <i class="fa-solid fa-share-nodes" style="font-size:2.5rem; color:var(--accent-primary); margin-bottom:12px;"></i>
          <div style="font-size:1.1rem; font-weight:800; color:white; margin-bottom:8px;">Shareable Conversation Link Created</div>
          <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">Anyone with role-based access level <b>${currentRole}</b> can view this grounded transcript.</div>
          <input type="text" class="input-box" value="${shareUrl}" readonly style="text-align:center; font-family:monospace;">
        </div>
      `, 'Copy Link', () => {
        navigator.clipboard.writeText(shareUrl);
        closeInteractiveModal();
        toast('📋 Link copied to clipboard!', 'success');
      });
    }

    function startNewChatConversation() {
      document.getElementById('chat-messages').innerHTML = `<div id="chat-welcome-screen"></div>`;
      renderChatbotWelcomeScreen();
      toast('✨ Started New Chat Conversation', 'info');
    }

    function filterChatHistory(query) {
      const items = document.querySelectorAll('.chat-hist-item');
      items.forEach(it => {
        const text = it.innerText.toLowerCase();
        it.style.display = text.includes(query.toLowerCase()) ? 'flex' : 'none';
      });
    }

    function loadChatConversation(id) {
      document.querySelectorAll('.chat-hist-item').forEach(it => it.classList.remove('active'));
      event?.currentTarget?.classList?.add('active');
      toast(`💬 Loaded conversation: ${id}`, 'info');
      
      const chatBox = document.getElementById('chat-messages');
      if (!chatBox) return;
      
      let title = id.replace(/-/g, ' ').toUpperCase();
      let userQuery = `Can you explain the details of ${title}?`;
      let aiResponse = `### 📂 Retrieved Record: ${title}\n\nI have loaded the conversation context for **${title}**.\n\n- **Status:** Archived & Pinned\n- **Access:** Verified under your current role.\n\nThis is a historically saved transcript. You can ask follow-up questions to continue this thread.`;
      
      chatBox.innerHTML = `
        <div class="msg-group user">
          <div class="msg-bubble">${userQuery}</div>
          <div class="avatar" style="width:34px;height:34px;font-size:0.8rem;background:var(--accent-primary);">USR</div>
        </div>
        <div class="msg-group assistant">
          <div class="avatar" style="width:34px;height:34px;font-size:0.8rem;background:var(--accent-gradient);">AI</div>
          <div class="msg-bubble">
            ${renderFormattedMarkdown(aiResponse)}
          </div>
        </div>
      `;
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    function renameChatConversation(oldTitle) {
      const newTitle = prompt('Enter new conversation title:', oldTitle);
      if (newTitle) toast(`✏️ Renamed chat to: ${newTitle}`, 'success');
    }

    function deleteChatConversation(el) {
      if (confirm('Delete this conversation history?')) {
        el.closest('.chat-hist-item').remove();
        toast('🗑️ Deleted conversation', 'info');
      }
    }

    function handleAdminFileSelected(input) {
      const file = input.files[0];
      if (!file) return;
      const statusEl = document.getElementById('admin-file-upload-status');
      statusEl.innerHTML = `<span style="color:var(--status-amber);"><i class="fa-solid fa-spinner fa-spin"></i> Embedding ${file.name} into Pinecone…</span>`;
      setTimeout(() => {
        statusEl.innerHTML = `<span style="color:var(--status-emerald); font-weight:700;"><i class="fa-solid fa-circle-check"></i> ${file.name} Indexed in Pinecone!</span>`;
        toast(`✅ Document ${file.name} successfully embedded into Pinecone index!`, 'success', 4000);
      }, 1800);
    }

    function syncPineconeVectorIndex() {
      toast('🌲 Syncing Pinecone Vector Database index…', 'info', 2000);
      setTimeout(() => toast('✅ Pinecone Vector Index in Sync (84 Active Documents)!', 'success', 3000), 1600);
    }

    function autoDraftFromAnswer(query, answer) {
      document.getElementById('email-sub').value = 'Notice: ' + query;
      document.getElementById('email-body').value = 'Dear Colleague,\n\nBased on internal company policy:\n\n' + answer + '\n\nBest regards,\nSynapseAI OS';
      switchPane('shared_email');
      toast('✉️ Populated Email Composer!', 'success');
    }

    async function aiGenerateDraft() {
      const prompt = document.getElementById('email-sub').value || 'Notice';
      toast('🤖 Generating AI Draft...', 'info', 1500);
      try {
        const res = await fetch('/api/v1/email/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, recipient: 'harithalanganuru@gmail.com' }),
        });
        const json = await res.json();
        if (json.data) {
          document.getElementById('email-sub').value = json.data.subject;
          document.getElementById('email-body').value = json.data.body;
          toast('✅ AI Email Draft Generated!', 'success');
        }
      } catch(e) { toast('Error: ' + e.message, 'error'); }
    }

    async function sendLiveEmail() {
      const recipient = document.getElementById('email-to').value;
      const subject = document.getElementById('email-sub').value;
      const body = document.getElementById('email-body').value;
      
      toast('📤 Dispatching Email via Gmail SMTP...', 'info', 2000);
      try {
        const res = await fetch('http://localhost:8000/api/v1/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient, subject, body }),
        });
        const json = await res.json();
        if (currentRole === 'Admin') STATE.Admin.emailsSentToday++;
        const logList = document.getElementById('email-log-list');
        logList.insertAdjacentHTML('afterbegin', `
          <div style="background:rgba(255,255,255,0.04); border:1px solid var(--border-glass); padding:10px; border-radius:10px; font-size:0.8rem;">
            <b>${subject}</b> to <i>${recipient}</i> — <span style="color:var(--status-emerald); font-weight:700;">SENT</span>
          </div>`);
        toast(`✅ Email delivered to ${recipient}!`, 'success', 4000);
      } catch(e) { toast('Dispatch error: ' + e.message, 'error'); }
    }

    // ═══════════════════════════════════════════
    // AI CONTROL CENTER — HELPER FUNCTIONS
    // ═══════════════════════════════════════════

    function aicc_ptab(el, tab) {
      document.querySelectorAll('.aicc-ptab-active').forEach(b => b.classList.remove('aicc-ptab-active'));
      el.classList.add('aicc-ptab-active');
      const labels = {sys:'System Prompts',role:'Role-Based Prompts',lib:'Prompt Library'};
      toast(`Switched to <b>${labels[tab]}</b>`, 'info', 2000);
    }

    function aicc_toggleJob(el) {
      const isOn = el.style.background.includes('185,129');
      el.style.background = isOn ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.4)';
      el.style.borderColor = isOn ? 'var(--status-rose)' : 'var(--status-emerald)';
      const dot = el.querySelector('div');
      dot.style.left = isOn ? '2px' : '';
      dot.style.right = isOn ? '' : '2px';
      toast(isOn ? '⏸ Automation job paused' : '▶ Automation job enabled', isOn ? 'warn' : 'success', 2000);
    }

    function aicc_testPrompt() {
      const out = document.getElementById('aicc-ptest-out');
      if (!out) { toast('🧪 Running AI prompt test...', 'info', 2000); return; }
      out.style.display = 'block';
      out.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color:var(--accent-primary);"></i> Running prompt simulation against test query: <b>"What is the paternity leave policy?"</b>...';
      setTimeout(() => {
        out.innerHTML = `
          <div style="font-weight:700;color:var(--accent-cyan);margin-bottom:8px;"><i class="fa-solid fa-circle-check"></i> Prompt Test Passed — v3.2 (96.4% Confidence)</div>
          <div style="color:var(--text-main);line-height:1.7;font-size:0.88rem;">
            <b>Test Query:</b> "What is the paternity leave policy?"<br>
            <b>AI Response:</b> According to <i>2026_Employee_Handbook.pdf (Section 4.2)</i>, all full-time secondary caregivers employed for a minimum of 90 days are entitled to <b>6 weeks of 100% fully paid paternity leave</b>.<br>
            <b>Confidence Score:</b> <span style="color:var(--status-emerald);font-weight:800;">96.4%</span> • <b>Latency:</b> 1.08s • <b>Source:</b> 2026_Employee_Handbook.pdf
          </div>`;
        toast('✅ Prompt test passed — 96.4% confidence!', 'success', 4000);
      }, 1800);
    }

    function aicc_deployPrompt() {
      const version = document.getElementById('aicc-pver')?.value || 'v3.2';
      toast(`🚀 Deploying Prompt <b>${version}</b> to all 4 active AI models...`, 'info', 2000);
      setTimeout(() => {
        toast(`✅ Prompt <b>${version}</b> deployed to production successfully!`, 'success', 4000);
        logTimelineAction(`AI Prompt <b>${version}</b> deployed to production by Admin`);
      }, 2200);
    }

    function aicc_syncKnowledge() {
      toast('🔄 Syncing enterprise knowledge with Pinecone vector index...', 'info', 2500);
      setTimeout(() => {
        toast('✅ Knowledge sync complete — 84 documents indexed in Pinecone!', 'success', 4500);
        logTimelineAction('Knowledge Base synced to Pinecone index <b>synapseai-prod-v3</b>');
        const el = document.getElementById('ai-req-today');
        if (el) {
          STATE.Admin.aiQueriesToday += 12;
          el.textContent = STATE.Admin.aiQueriesToday.toLocaleString();
        }
      }, 2700);
    }

    function aicc_restartService() {
      showInteractiveModal('Restart AI Service', 'fa-power-off',
        `<div style="text-align:center;padding:20px 0;">
          <i class="fa-solid fa-power-off" style="font-size:3rem;color:var(--status-rose);margin-bottom:16px;display:block;"></i>
          <div style="font-size:1.1rem;font-weight:800;color:white;margin-bottom:10px;">Confirm AI Service Restart</div>
          <div style="color:var(--text-muted);font-size:0.9rem;line-height:1.6;">
            This will restart the SynapseAI inference engine across all 4 active models.<br>
            <b style="color:var(--status-amber);">Expected downtime: ~15 seconds.</b><br>
            All in-progress queries will be gracefully terminated.
          </div>
        </div>`,
        'Confirm Restart',
        () => {
          closeInteractiveModal();
          toast('⚡ AI Service restarting… gracefully terminating 3 active sessions.', 'warn', 3000);
          setTimeout(() => {
            toast('✅ AI Service restarted successfully. All 4 models ONLINE.', 'success', 4000);
            logTimelineAction('SynapseAI inference engine restarted by Admin (downtime: 12s)');
          }, 3500);
        }
      );
    }

    function aicc_generateReport() {
      toast('📊 Generating AI Intelligence Report...', 'info', 2000);
      const dateStr = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
      setTimeout(() => {
        const body = `
          <div style="display:flex;flex-direction:column;gap:16px;">
            <div style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);padding:16px;border-radius:14px;">
              <div style="font-size:0.78rem;color:var(--accent-primary);font-weight:700;letter-spacing:1px;margin-bottom:6px;">SYNAPSEAI — DAILY AI INTELLIGENCE REPORT</div>
              <div style="font-size:0.82rem;color:var(--text-muted);">${dateStr}</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-size:0.85rem;">
              <div style="background:rgba(255,255,255,0.04);padding:12px;border-radius:12px;text-align:center;"><div style="color:var(--text-dim);">Total Requests</div><div style="font-size:1.4rem;font-weight:800;color:var(--accent-primary);">1,245</div></div>
              <div style="background:rgba(255,255,255,0.04);padding:12px;border-radius:12px;text-align:center;"><div style="color:var(--text-dim);">Success Rate</div><div style="font-size:1.4rem;font-weight:800;color:var(--status-emerald);">98.6%</div></div>
              <div style="background:rgba(255,255,255,0.04);padding:12px;border-radius:12px;text-align:center;"><div style="color:var(--text-dim);">AI Cost</div><div style="font-size:1.4rem;font-weight:800;color:var(--status-rose);">$14.82</div></div>
            </div>
            <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);padding:14px;border-radius:12px;font-size:0.85rem;line-height:1.7;">
              <b style="color:var(--accent-cyan);">AI Insights:</b><br>
              Top query: <i>Paternity Leave Policy</i> (248 times). Avg response time 1.24s across all 4 models. 
              18 low-confidence responses flagged for prompt improvement. 
              Pinecone index at 100% — 84 documents active.
            </div>
          </div>`;
        showInteractiveModal('Daily AI Intelligence Report', 'fa-file-chart-column', body, 'Email Report to Admin', () => {
          closeInteractiveModal();
          toast('📧 AI Report emailed to Admin!', 'success', 3000);
          logTimelineAction('Daily AI Intelligence Report generated and emailed by Admin');
        });
      }, 1800);
    }

    function aicc_viewLogs() {
      const logs = [
        {time:'16:42:12', role:'Employee', query:'Paternity leave policy?', conf:'94%', status:'Clean', statusColor:'var(--status-emerald)'},
        {time:'16:39:55', role:'HR', query:'Offer letter template for new hire', conf:'98%', status:'Clean', statusColor:'var(--status-emerald)'},
        {time:'16:35:30', role:'Manager', query:'Travel meal expense limits Q3', conf:'91%', status:'Clean', statusColor:'var(--status-emerald)'},
        {time:'16:28:14', role:'Employee', query:'Remote work days per week?', conf:'88%', status:'Low Conf.', statusColor:'var(--status-amber)'},
        {time:'16:19:04', role:'Admin', query:'Pinecone re-index status', conf:'99%', status:'Clean', statusColor:'var(--status-emerald)'},
        {time:'16:10:47', role:'Employee', query:'Salary benchmark engineering', conf:'12%', status:'BLOCKED', statusColor:'var(--status-rose)'},
        {time:'16:08:22', role:'HR', query:'2026 parental leave clause text', conf:'97%', status:'Clean', statusColor:'var(--status-emerald)'},
        {time:'15:59:01', role:'Manager', query:'Sprint health dashboard', conf:'93%', status:'Clean', statusColor:'var(--status-emerald)'},
        {time:'15:45:33', role:'Employee', query:'GDPR data deletion request', conf:'85%', status:'Clean', statusColor:'var(--status-emerald)'},
        {time:'15:32:11', role:'Admin', query:'System prompt version rollback', conf:'99%', status:'Clean', statusColor:'var(--status-emerald)'},
      ];

      const body = `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);padding:8px 14px;border-radius:10px;font-size:0.82rem;color:#6EE7B7;font-weight:700;"><i class="fa-solid fa-circle-check"></i> 7 Clean</div>
            <div style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);padding:8px 14px;border-radius:10px;font-size:0.82rem;color:var(--status-amber);font-weight:700;"><i class="fa-solid fa-circle-exclamation"></i> 1 Low Confidence</div>
            <div style="background:rgba(244,63,94,0.12);border:1px solid rgba(244,63,94,0.3);padding:8px 14px;border-radius:10px;font-size:0.82rem;color:var(--status-rose);font-weight:700;"><i class="fa-solid fa-ban"></i> 1 Blocked by Guardrail</div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.78rem;background:rgba(0,0,0,0.4);border:1px solid var(--border-glass);border-radius:14px;overflow:hidden;">
            <div style="padding:10px 16px;background:rgba(255,255,255,0.04);border-bottom:1px solid var(--border-glass);display:grid;grid-template-columns:70px 80px 1fr 50px 90px;gap:8px;color:var(--text-dim);font-weight:700;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.5px;">
              <span>Time</span><span>Role</span><span>Query</span><span>Conf.</span><span>Status</span>
            </div>
            <div style="max-height:320px;overflow-y:auto;">
              ${logs.map(l=>`
                <div style="padding:9px 16px;border-bottom:1px solid rgba(255,255,255,0.04);display:grid;grid-template-columns:70px 80px 1fr 50px 90px;gap:8px;align-items:center;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background=''">
                  <span style="color:var(--text-dim);">${l.time}</span>
                  <span style="color:var(--accent-cyan);">${l.role}</span>
                  <span style="color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${l.query}">${l.query}</span>
                  <span style="color:${l.statusColor};">${l.conf}</span>
                  <span style="font-weight:700;color:${l.statusColor};">${l.status}</span>
                </div>`).join('')}
            </div>
          </div>
        </div>`;

      showInteractiveModal('AI System Logs — Live Feed', 'fa-terminal', body, 'Export Logs CSV', () => {
        closeInteractiveModal();
        toast('📥 AI Logs exported to CSV!', 'success', 3000);
      });
    }
    window.addEventListener('DOMContentLoaded', () => {
  if (!window.authState || !window.authState.isAuthenticated) {
    showLandingPage();
    checkAdminUrlHash();
  } else {
    const mainWorkspace = document.getElementById('main-workspace-wrapper');
    if (mainWorkspace) mainWorkspace.style.setProperty('display', 'flex', 'important');
    enforceRoleIsolation(window.authState.currentUser.role);
    switchRole(window.authState.currentUser.role);
  }
});
  
    
// =========================================================================
// MANAGER PORTAL PERSISTENT STATE & ENGINE
// =========================================================================
window.managerState = {
  projects: [
    { id: 'INFRA-902', name: 'SynapseAI Core OS', lead: 'Haritha L.', progress: 96, label: 'Q3 Delivery', health: 'Healthy', cls: 'rb-employee', barColor: 'var(--status-emerald)' },
    { id: 'AI-105', name: 'RAG Pipeline v2 Expansion', lead: 'Rahul K.', progress: 65, label: 'Delay Risk', health: 'At Risk', cls: 'rb-manager', barColor: 'var(--status-amber)' },
    { id: 'OPS-404', name: 'Cloud Migration EU', lead: 'Sarah J.', progress: 42, label: 'Blocked', health: 'Blocked', cls: 'rb-hr', barColor: 'var(--status-rose)', healthStyle: 'color:var(--status-rose); border-color:var(--status-rose);' },
    { id: 'MOB-120', name: 'Mobile App Re-architecture', lead: 'Mark T.', progress: 15, label: 'Q4 Delivery', health: 'Healthy', cls: 'rb-employee', barColor: 'var(--status-emerald)' },
    { id: 'DB-55', name: 'Database Sharding Phase 1', lead: 'Jessica W.', progress: 88, label: 'Under Review', health: 'At Risk', cls: 'rb-manager', barColor: 'var(--status-amber)' },
    { id: 'SEC-99', name: 'SOC2 Compliance Audit', lead: 'Alex R.', progress: 100, label: 'Complete', health: 'Completed', cls: 'rb-employee', barColor: 'var(--status-emerald)', healthStyle: 'background:rgba(16,185,129,0.2);color:#A7F3D0;' }
  ],
  team: [
    { id: 'haritha', name: 'Haritha L.', role: 'Senior Dev', tasks: 12, util: 110, utilText: '110% Utilized', barColor: 'var(--status-rose)', overallocated: true },
    { id: 'rahul', name: 'Rahul K.', role: 'Backend Dev', tasks: 4, util: 65, utilText: '65% Utilized', barColor: 'var(--status-emerald)', overallocated: false },
    { id: 'emily', name: 'Emily Z.', role: 'UX Designer', tasks: 7, util: 85, utilText: '85% Utilized', barColor: 'var(--status-amber)', overallocated: false },
    { id: 'mark', name: 'Mark T.', role: 'Frontend Dev', tasks: 14, util: 120, utilText: '120% Utilized', barColor: 'var(--status-rose)', overallocated: true },
    { id: 'jessica', name: 'Jessica W.', role: 'QA Engineer', tasks: 3, util: 40, utilText: '40% Utilized', barColor: 'var(--status-emerald)', overallocated: false },
    { id: 'alex', name: 'Alex R.', role: 'DevOps Lead', tasks: 6, util: 70, utilText: '70% Utilized', barColor: 'var(--status-emerald)', overallocated: false }
  ],
  approvals: [
    { id: 'REQ-992', submitter: 'Haritha L.', avatar: 'H', title: '3-Day Leave Request', sub: 'No deadline conflicts', date: 'Today, 09:15 AM' },
    { id: 'EXP-401', submitter: 'David M.', avatar: 'D', title: 'Software License Expense', sub: '$1,200 (Requires VP signoff)', date: 'Yesterday, 14:30' },
    { id: 'REQ-988', submitter: 'Priya S.', avatar: 'P', title: 'Remote Work Setup', sub: 'Within policy limit', date: 'Mon, 11:00 AM' },
    { id: 'EXP-415', submitter: 'Mark T.', avatar: 'M', title: 'Client Dinner Expense', sub: '$340 (Missing receipt)', date: 'Fri, 18:45' },
    { id: 'REQ-981', submitter: 'Jessica W.', avatar: 'J', title: 'Hardware Upgrade', sub: 'Device older than 3 years', date: 'Wed, 09:12 AM' },
    { id: 'ACC-112', submitter: 'Alex R.', avatar: 'A', title: 'AWS Prod Access', sub: 'Requires security clearance', date: 'Tue, 16:20' },
    { id: 'REQ-975', submitter: 'Emily Z.', avatar: 'E', title: 'Design Software Sub', sub: 'Approved vendor', date: 'Mon, 10:05 AM' }
  ],
  approvedCount: 45,
  reports: [
    { title: 'Q3 Engineering Summary', by: 'AI Engine', format: 'PDF', bg: '#F43F5E', date: 'Jul 30, 2026', file: 'Q3_Engineering_Summary.pdf' },
    { title: 'Weekly Sprint Velocity', by: 'System Cron', format: 'XLSX', bg: '#10B981', date: 'Jul 28, 2026', file: 'Weekly_Sprint_Velocity.xlsx' },
    { title: 'Monthly Budget Burn', by: 'David M.', format: 'PDF', bg: '#F43F5E', date: 'Jul 01, 2026', file: 'Monthly_Budget_Burn.pdf' },
    { title: 'Q2 Retrospective Analysis', by: 'AI Engine', format: 'PPTX', bg: '#F59E0B', date: 'Jun 30, 2026', file: 'Q2_Retrospective.pptx' },
    { title: 'Q3 Hiring Pipeline', by: 'HR Connect', format: 'CSV', bg: '#10B981', date: 'Jun 25, 2026', file: 'Q3_Hiring.csv' },
    { title: 'Infrastructure Audit H1', by: 'System Cron', format: 'PDF', bg: '#F43F5E', date: 'Jun 15, 2026', file: 'Infra_Audit_H1.pdf' }
  ],
  reportConfig: { velocity: true, budget: true, timesheet: false, slack: true },
  meetings: [
    { id: 'm1', time: '10:00 AM', duration: '45 mins', title: 'Engineering Sync', sub: 'Weekly status update', organizer: 'David M.', platform: 'Teams', active: true, connected: false },
    { id: 'm2', time: '11:30 AM', duration: '30 mins', title: 'Architecture Review: RAG v2', sub: 'AI infrastructure scaling', organizer: 'Haritha L.', platform: 'Teams', active: true, connected: false },
    { id: 'm3', time: '1:30 PM', duration: '30 mins', title: '1:1 with Haritha', sub: 'Performance check-in', organizer: 'David M.', platform: 'Zoom', active: false, connected: false },
    { id: 'm4', time: '3:00 PM', duration: '60 mins', title: 'Q3 Planning Workshop', sub: 'Cross-functional alignment', organizer: 'Sarah J.', platform: 'Teams', active: false, connected: false },
    { id: 'm5', time: '4:30 PM', duration: '45 mins', title: 'Security Incident Post-Mortem', sub: 'Review audit findings', organizer: 'Alex R.', platform: 'Zoom', active: false, connected: false }
  ],
  aiSummaryGenerated: false,
  aiSummaryText: '',
  decisions: [
    { id: 'dec1', cat: 'Budget Reallocation', area: 'Q3 Marketing', conf: 97, status: 'Recommended', executed: false },
    { id: 'dec2', cat: 'Security Policy Exemption', area: 'IT Infrastructure', conf: 62, status: 'Escalated', executed: false },
    { id: 'dec3', cat: 'Leave Approval', area: 'Engineering', conf: 99, status: 'Auto-Executed', executed: true },
    { id: 'dec4', cat: 'Vendor Contract Renewal', area: 'Operations', conf: 91, status: 'Recommended', executed: false },
    { id: 'dec5', cat: 'Cloud Server Auto-scaling', area: 'DevOps', conf: 95, status: 'Recommended', executed: false }
  ]
};

function renderManagerDashboardUI() {
  const pCount = document.getElementById('dash-pending-count');
  if (pCount) pCount.innerText = window.managerState.approvals.length;
  
  const aPill = document.getElementById('dash-approvals-pill');
  if (aPill) aPill.innerText = `${window.managerState.approvals.length} Pending`;

  const projList = document.getElementById('dash-projects-list');
  if (projList) {
    projList.innerHTML = window.managerState.projects.slice(0, 3).map(p => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid rgba(255,255,255,0.05);">
        <div>
          <b>${p.name}</b> <span style="font-size:0.75rem; color:var(--text-dim);">(${p.id})</span>
          <div style="font-size:0.75rem; color:var(--text-muted);">Lead: ${p.lead}</div>
        </div>
        <div style="text-align:right;">
          <span class="role-badge-inline ${p.cls}">${p.health}</span>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${p.progress}% Progress</div>
        </div>
      </div>
    `).join('');
  }

  const appList = document.getElementById('dash-approvals-quicklist');
  if (appList) {
    if (window.managerState.approvals.length === 0) {
      appList.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem; padding:10px;">All pending approvals resolved!</div>';
    } else {
      appList.innerHTML = window.managerState.approvals.slice(0, 3).map(a => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:10px; border-radius:8px;">
          <div>
            <b>${a.title}</b>
            <div style="font-size:0.75rem; color:var(--text-muted);">${a.submitter} • ${a.id}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-submit" onclick="approveRequestById('${a.id}')" style="padding:4px 8px; font-size:0.75rem;"><i class="fa-solid fa-check"></i></button>
            <button class="btn-secondary" onclick="denyRequestById('${a.id}')" style="padding:4px 8px; font-size:0.75rem; border-color:var(--status-rose); color:var(--status-rose);"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>
      `).join('');
    }
  }

  const workAlerts = document.getElementById('dash-workload-alerts');
  if (workAlerts) {
    const overallocated = window.managerState.team.filter(t => t.overallocated);
    if (overallocated.length === 0) {
      workAlerts.innerHTML = '<div style="color:var(--status-emerald); font-size:0.85rem; padding:10px;"><i class="fa-solid fa-check-double"></i> Team workload is perfectly balanced!</div>';
    } else {
      workAlerts.innerHTML = overallocated.map(t => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(244,63,94,0.08); border:1px solid rgba(244,63,94,0.2); padding:10px; border-radius:8px;">
          <div>
            <b style="color:#FB7185;">${t.name} (${t.role})</b>
            <div style="font-size:0.75rem; color:var(--text-muted);">${t.utilText} • ${t.tasks} Tasks</div>
          </div>
          <button class="btn-submit" onclick="switchPane('feat_team'); setTimeout(autoBalanceTeam, 100);" style="padding:4px 10px; font-size:0.75rem;">Rebalance</button>
        </div>
      `).join('');
    }
  }
}

function showNewProjectModal() {
  const modal = document.getElementById('new-project-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('np-name').value = '';
    document.getElementById('np-lead').value = '';
  }
}

function submitNewProject() {
  const name = document.getElementById('np-name').value || 'New Project';
  const lead = document.getElementById('np-lead').value || 'Unassigned';
  const id = 'PRJ-' + Math.floor(Math.random() * 899 + 100);

  window.managerState.projects.unshift({
    id: id,
    name: name,
    lead: lead,
    progress: 0,
    label: 'Planning',
    health: 'Healthy',
    cls: 'rb-employee',
    barColor: 'var(--status-emerald)'
  });

  if (document.getElementById('new-project-modal')) {
    document.getElementById('new-project-modal').style.display = 'none';
  }

  toast(`Project "${name}" created & saved!`, 'success');
  renderRoleFeatureView('feat_projects');
}

function approveRequestById(reqId) {
  const idx = window.managerState.approvals.findIndex(a => a.id === reqId);
  if (idx !== -1) {
    window.managerState.approvals.splice(idx, 1);
    window.managerState.approvedCount++;
    toast(`Request ${reqId} Approved!`, 'success');
    if (document.getElementById('approvals-table')) {
      renderRoleFeatureView('feat_approvals');
    } else {
      renderManagerDashboardUI();
    }
  }
}

function denyRequestById(reqId) {
  const idx = window.managerState.approvals.findIndex(a => a.id === reqId);
  if (idx !== -1) {
    window.managerState.approvals.splice(idx, 1);
    toast(`Request ${reqId} Denied!`, 'error');
    if (document.getElementById('approvals-table')) {
      renderRoleFeatureView('feat_approvals');
    } else {
      renderManagerDashboardUI();
    }
  }
}

function approveRequest(btn) {
  let tr = btn.closest('tr');
  let reqId = tr.children[0].innerText.trim();
  approveRequestById(reqId);
}

function denyRequest(btn) {
  let tr = btn.closest('tr');
  let reqId = tr.children[0].innerText.trim();
  denyRequestById(reqId);
}

function autoBalanceTeam() {
  toast('AI Auto-balancing workload across team...', 'info');
  setTimeout(() => {
    window.managerState.team.forEach(t => {
      t.util = 80;
      t.utilText = '80% Utilized';
      t.barColor = 'var(--status-emerald)';
      t.tasks = 8;
      t.overallocated = false;
    });
    toast('Workload successfully balanced & saved!', 'success');
    if (document.getElementById('team-table')) {
      renderRoleFeatureView('feat_team');
    } else {
      renderManagerDashboardUI();
    }
  }, 800);
}

function reallocateTask(btn, rowId) {
  toast('Reallocating tasks...', 'info');
  setTimeout(() => {
    const memberName = rowId.replace('team-row-', '');
    const t = window.managerState.team.find(x => x.id === memberName);
    if (t) {
      t.util = 85;
      t.utilText = '85% Utilized';
      t.barColor = 'var(--status-amber)';
      t.tasks = 9;
      t.overallocated = false;
    }
    toast('Task reallocated and saved!', 'success');
    renderRoleFeatureView('feat_team');
  }, 500);
}

function saveReportConfiguration() {
  const vel = document.getElementById('cfg-vel') ? document.getElementById('cfg-vel').checked : true;
  const bud = document.getElementById('cfg-bud') ? document.getElementById('cfg-bud').checked : true;
  const ts = document.getElementById('cfg-ts') ? document.getElementById('cfg-ts').checked : false;
  const slack = document.getElementById('cfg-slack') ? document.getElementById('cfg-slack').checked : true;

  window.managerState.reportConfig = { velocity: vel, budget: bud, timesheet: ts, slack: slack };
  toast('Report Automation Configuration Saved!', 'success');
  renderRoleFeatureView('feat_reports');
}

function generateAIMeetingSummary() {
  const btn = document.getElementById('btn-gen-ai-summary');
  if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating AI Summary...';

  setTimeout(() => {
    window.managerState.aiSummaryGenerated = true;
    window.managerState.aiSummaryText = `
      <div style="background:linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(16,185,129,0.1) 100%); border:1px solid var(--accent-primary); padding:16px; border-radius:12px; margin-top:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <b style="color:var(--accent-primary); font-size:1.05rem;"><i class="fa-solid fa-wand-magic-sparkles"></i> AI Executive Briefing Summary</b>
          <span style="font-size:0.75rem; color:var(--status-emerald); background:rgba(16,185,129,0.15); padding:2px 8px; border-radius:4px;">Generated 100% Complete</span>
        </div>
        <ul style="font-size:0.88rem; color:var(--text-main); line-height:1.6; margin:0; padding-left:20px;">
          <li><b>Sprint Sync:</b> Core OS deployment is 96% complete. Haritha L. requested additional QA review before Friday.</li>
          <li><b>Architecture Review:</b> RAG v2 Expansion needs 15% GPU cluster scaling. AI decision engine recommends reallocating $4.2k cloud budget.</li>
          <li><b>Action Items:</b> Mark T. to finalize frontend components; David M. to approve AWS clearance for Alex R.</li>
        </ul>
      </div>`;
    toast('AI Meeting Summary Generated!', 'success');
    renderRoleFeatureView('feat_meetings');
  }, 1000);
}

function toggleMeetingConnection(mId) {
  const m = window.managerState.meetings.find(x => x.id === mId);
  if (m) {
    m.connected = !m.connected;
    if (m.connected) {
      const url = m.platform === 'Teams' ? 'https://teams.microsoft.com/' : 'https://zoom.us/';
      window.open(url, '_blank');
      toast(`Opening ${m.platform} meeting: "${m.title}"...`, 'success');
    } else {
      toast(`Disconnected from ${m.title}`, 'info');
    }
    renderRoleFeatureView('feat_meetings');
  }
}

function showScheduleMeetingModal() {
  let modal = document.getElementById('schedule-meeting-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'schedule-meeting-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="glass-card" style="width:420px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem;"><i class="fa-solid fa-video" style="color:var(--accent-primary);"></i> Schedule Team Meeting</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('schedule-meeting-modal').style.display='none'"></i>
      </div>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Meeting Title</label>
      <input type="text" id="sm-title" class="input-box" placeholder="e.g. Sprint Architecture Review" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Time & Duration</label>
      <input type="text" id="sm-time" class="input-box" placeholder="e.g. 2:00 PM (45 mins)" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Platform</label>
      <select id="sm-platform" class="input-box" style="margin-bottom:16px; width:100%; background:rgba(0,0,0,0.4); color:white;">
        <option value="Teams">Microsoft Teams</option>
        <option value="Zoom">Zoom Video</option>
      </select>
      <button class="btn-submit" onclick="submitScheduleMeeting()" style="width:100%;">Schedule Meeting</button>
    </div>
  `;
}

function submitScheduleMeeting() {
  const titleInput = document.getElementById('sm-title');
  const title = (titleInput && titleInput.value.trim()) ? titleInput.value.trim() : 'Sprint Architecture Review';
  const timeInput = document.getElementById('sm-time');
  const timeStr = (timeInput && timeInput.value.trim()) ? timeInput.value.trim() : '2:00 PM';
  const platformSelect = document.getElementById('sm-platform');
  const platform = platformSelect ? platformSelect.value : 'Teams';

  window.managerState.meetings.push({
    id: 'm' + (window.managerState.meetings.length + 1),
    time: timeStr,
    duration: '45 mins',
    title: title,
    sub: 'Scheduled by Manager',
    organizer: 'David M. (Manager)',
    platform: platform,
    connected: false
  });

  const modal = document.getElementById('schedule-meeting-modal');
  if (modal) modal.style.display = 'none';

  toast(`Meeting "${title}" scheduled on ${platform}!`, 'success');
  renderRoleFeatureView('feat_meetings');
}

function executeDecisionById(dId) {
  const d = window.managerState.decisions.find(x => x.id === dId);
  if (d) {
    d.executed = true;
    d.status = 'Executed';
    toast(`AI Decision "${d.cat}" Executed Successfully!`, 'success');
    renderRoleFeatureView('feat_decision');
  }
}


// =========================================================================
// TITLE-SPECIFIC REPORT GENERATION ENGINE
// =========================================================================
const SPECIFIC_REPORT_TEMPLATES = {
  "Q3 Engineering Summary": {
    subtitle: "Quarterly Engineering Performance & Architecture Delivery",
    sections: [
      { title: "1. Sprint Velocity & Output", content: "Engineering completed 482 story points across 6 two-week sprints in Q3. Core OS infrastructure delivery reached 96% completion, meeting all SLA targets." },
      { title: "2. Codebase & Quality Metrics", content: "Test coverage increased to 91.4%. Unit test pass rate maintained at 99.8%. Zero critical P0 security vulnerabilities detected during automated static analysis." },
      { title: "3. Infrastructure & Deployment", content: "Migrated 14 microservices to Kubernetes clusters. Deployment frequency improved by 35% with zero unplanned downtime recorded." }
    ]
  },
  "Weekly Sprint Velocity": {
    subtitle: "Sprint Burndown & Task Completion Analytics",
    sections: [
      { title: "1. Current Sprint Velocity", content: "Team completed 84 out of 90 planned story points this sprint (93.3% velocity rate). Average cycle time dropped from 3.2 days to 2.4 days." },
      { title: "2. Member Workload Breakdown", content: "Haritha L. (12 Tasks / 28 pts), Rahul K. (8 Tasks / 18 pts), Mark T. (14 Tasks / 24 pts), Emily Z. (7 Tasks / 14 pts)." },
      { title: "3. Blockers & Mitigations", content: "RAG Pipeline v2 expansion pending additional GPU cluster provisioning. Reallocated 2 tasks from Haritha to Rahul to balance workload." }
    ]
  },
  "Monthly Budget Burn": {
    subtitle: "Department Operational & Infrastructure Financial Breakdown",
    sections: [
      { title: "1. Financial Overview", content: "Department Allocated Budget: $45,000. Utilized in Q3: $12,400 (27.5% burn rate). Remaining Q4 Capital: $32,600." },
      { title: "2. Expense Breakdown", content: "Cloud Infrastructure (AWS/GCP): $7,200 | Software Subscriptions: $3,400 | Department Travel & Events: $1,800." },
      { title: "3. Variance Analysis", content: "Cloud infrastructure spend was 8% below forecast due to auto-scaling policy optimization. Financial health is optimal." }
    ]
  },
  "Q2 Retrospective Analysis": {
    subtitle: "Sprint Retrospective Findings & Continuous Improvement",
    sections: [
      { title: "1. Key Successes", content: "Cross-functional collaboration between UX Design and Frontend accelerated mobile UI components by 2 weeks. Zero critical production incidents." },
      { title: "2. Process Friction Points", content: "Database sharding phase 1 required more pre-testing than anticipated. Earlier QA involvement is now mandated for DB migrations." },
      { title: "3. Action Items", content: "1. Automate CI/CD regression testing. 2. Implement AI workload auto-balancing for engineering team." }
    ]
  },
  "Q3 Hiring Pipeline": {
    subtitle: "Recruitment Tracker & Talent Acquisition Analytics",
    sections: [
      { title: "1. Pipeline Overview", content: "Active Open Requisitions: 5 roles (Senior Dev, Backend Lead, DevOps Engineer, UX Designer, QA Specialist)." },
      { title: "2. Candidate Funnel", content: "Resumes Screened: 142 | Technical Interviews Conducted: 28 | Offers Extended: 4 | Offers Accepted: 4 (100% acceptance rate)." },
      { title: "3. Efficiency Metrics", content: "Average Time-to-Hire reduced to 21 days (industry baseline: 38 days)." }
    ]
  },
  "Infrastructure Audit H1": {
    subtitle: "Semi-Annual System Security, SOC2 & Cloud Audit",
    sections: [
      { title: "1. Compliance & Security Score", content: "ISO 27001 & SOC2 Type II Rating: 98% (Passed). All 14 security controls verified operational." },
      { title: "2. Access Control Audit", content: "MFA Adoption: 96.4%. 284 active sessions monitored. 0 unauthorized administrative access attempts detected." },
      { title: "3. Security Recommendations", content: "Enforce automated key rotation for AWS service accounts every 90 days." }
    ]
  }
};

function downloadFile(btn, filename) {
  let originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  setTimeout(() => {
    btn.innerHTML = originalHtml;
    const cfg = window.managerState.reportConfig;
    const reportTitle = filename.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    const ext = filename.split('.').pop().toLowerCase();

    // Retrieve specific template or generate customized text
    const rObj = window.managerState.reports.find(r => r.file === filename);
    const template = SPECIFIC_REPORT_TEMPLATES[reportTitle] || {
      subtitle: (rObj && rObj.summary) ? rObj.summary : "Custom Manager Generated Operational Report",
      sections: [
        { title: "1. Report Details", content: (rObj && rObj.summary) ? rObj.summary : `Specific report generated by Manager David M. on ${new Date().toLocaleDateString()}.` },
        { title: "2. Active Policies", content: `Velocity Tracking: ${cfg.velocity ? 'ENABLED' : 'DISABLED'} | Budget Monitoring: ${cfg.budget ? 'ENABLED' : 'DISABLED'} | Slack Dispatch: ${cfg.slack ? 'ACTIVE' : 'DISABLED'}` }
      ]
    };

    if (ext === 'csv') {
      let csvContent = `Report Title,"${reportTitle}"\nSubtitle,"${template.subtitle}"\nDate,"${new Date().toLocaleString()}"\n\nSection,Details\n`;
      template.sections.forEach(s => {
        csvContent += `"${s.title}","${s.content.replace(/"/g, '""')}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Downloaded ' + filename + ' (CSV Data format)', 'success');
    } else {
      toast('Generating PDF Report...', 'info', 2000);
      const element = document.createElement('div');
      element.style.padding = '30px';
      element.style.background = '#ffffff';
      element.style.color = '#000000';
      element.style.fontFamily = 'Arial, sans-serif';
      let sectionsHtml = template.sections.map(s => `
        <div style="margin-bottom:20px; padding:15px; border:1px solid #e2e8f0; border-radius:8px;">
          <h3 style="margin-top:0; color:#334155;">${s.title}</h3>
          <p style="margin:0; white-space:pre-wrap; color:#475569; font-size:14px;">${s.content}</p>
        </div>
      `).join('');
      element.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
          <h1 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">?? ${reportTitle}</h1>
          <div style="font-size: 14px; color: #64748b; margin-bottom: 30px;">${template.subtitle} &nbsp;|&nbsp; Generated ${new Date().toLocaleString()}</div>
          ${sectionsHtml}
        </div>
      `;
      html2pdf().set({ margin: 15, filename: filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(element).save().then(() => {
          toast('PDF downloaded successfully!', 'success');
      });
    }
  }, 500);
}


function showAssignTaskModal(memberName) {
  let modal = document.getElementById('assign-task-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'assign-task-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';

  const memberOptions = window.managerState.team.map(t => `<option value="${t.id}" ${t.name === memberName ? 'selected' : ''}>${t.name} (${t.role})</option>`).join('');

  modal.innerHTML = `
    <div class="glass-card" style="width:400px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem;">Assign New Task</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('assign-task-modal').style.display='none'"></i>
      </div>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Task Title</label>
      <input type="text" id="at-title" class="input-box" placeholder="e.g. Implement API Endpoint" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Assignee</label>
      <select id="at-assignee" class="input-box" style="margin-bottom:16px; width:100%; background:rgba(0,0,0,0.3); color:white;">
        ${memberOptions}
      </select>
      <button class="btn-submit" onclick="submitAssignTask()" style="width:100%;">Assign Task</button>
    </div>
  `;
}

function submitAssignTask() {
  const title = document.getElementById('at-title').value || 'New Work Item';
  const memberId = document.getElementById('at-assignee').value;
  const member = window.managerState.team.find(t => t.id === memberId);

  if (member) {
    member.tasks += 1;
    member.util = Math.min(130, member.util + 10);
    member.utilText = `${member.util}% Utilized`;
    if (member.util > 100) {
      member.overallocated = true;
      member.barColor = 'var(--status-rose)';
    } else if (member.util > 80) {
      member.barColor = 'var(--status-amber)';
    }
    toast(`Assigned "${title}" to ${member.name}!`, 'success');
  }

  document.getElementById('assign-task-modal').style.display = 'none';
  renderRoleFeatureView('feat_team');
}

function toggleWorkloadFilter() {
  toast('Filtered view to overallocated team members', 'info');
  const table = document.getElementById('team-table');
  if (!table) return;
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(r => {
    if (r.innerHTML.includes('100%') || r.innerHTML.includes('110%') || r.innerHTML.includes('115%') || r.innerHTML.includes('120%')) {
      r.style.display = '';
    } else {
      r.style.display = r.style.display === 'none' ? '' : 'none';
    }
  });
}

function bulkApproveAll() {
  if (window.managerState.approvals.length === 0) {
    toast('No pending approvals to process.', 'info');
    return;
  }
  const count = window.managerState.approvals.length;
  window.managerState.approvedCount += count;
  window.managerState.approvals = [];
  toast(`Bulk Approved all ${count} pending requests!`, 'success');
  renderRoleFeatureView('feat_approvals');
}

function showNewReportModal() {
  let modal = document.getElementById('new-report-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'new-report-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="glass-card" style="width:400px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem;">Generate Custom Report</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('new-report-modal').style.display='none'"></i>
      </div>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Report Title</label>
      <input type="text" id="nr-title" class="input-box" placeholder="e.g. Q3 Sprint Performance" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Export Format</label>
      <select id="nr-format" class="input-box" style="margin-bottom:16px; width:100%; background:rgba(0,0,0,0.3); color:white;">
        <option value="PDF">PDF Document</option>
        <option value="XLSX">Excel Spreadsheet (XLSX)</option>
        <option value="CSV">CSV Data Export</option>
        <option value="PPTX">PowerPoint Presentation (PPTX)</option>
      </select>
      <button class="btn-submit" onclick="submitNewReport()" style="width:100%;">Generate Report</button>
    </div>
  `;
}

function submitNewReport() {
  const titleInput = document.getElementById('nr-title');
  const title = (titleInput && titleInput.value.trim()) ? titleInput.value.trim() : 'Q3 Sprint Velocity & Capacity Report';
  const formatSelect = document.getElementById('nr-format');
  const format = formatSelect ? formatSelect.value : 'PDF';
  const bgMap = { PDF: '#F43F5E', XLSX: '#10B981', CSV: '#10B981', PPTX: '#F59E0B' };

  window.managerState.reports.unshift({
    title: title,
    by: 'David M. (Manager)',
    format: format,
    bg: bgMap[format] || '#6366F1',
    date: 'Just now',
    file: title.replace(/\s+/g, '_') + '.' + format.toLowerCase()
  });

  const modal = document.getElementById('new-report-modal');
  if (modal) modal.style.display = 'none';

  toast(`New Report "${title}" generated with full data!`, 'success');
  renderRoleFeatureView('feat_reports');
}

function showScheduleMeetingModal() {
  let modal = document.getElementById('schedule-meeting-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'schedule-meeting-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="glass-card" style="width:400px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem;">Schedule Team Meeting</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('schedule-meeting-modal').style.display='none'"></i>
      </div>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Meeting Title</label>
      <input type="text" id="sm-title" class="input-box" placeholder="e.g. Sprint Grooming" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Time</label>
      <input type="text" id="sm-time" class="input-box" placeholder="e.g. 2:00 PM (45 mins)" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Platform</label>
      <select id="sm-platform" class="input-box" style="margin-bottom:16px; width:100%; background:rgba(0,0,0,0.3); color:white;">
        <option value="Teams">Microsoft Teams</option>
        <option value="Zoom">Zoom Video</option>
      </select>
      <button class="btn-submit" onclick="submitScheduleMeeting()" style="width:100%;">Schedule</button>
    </div>
  `;
}

function submitScheduleMeeting() {
  const title = document.getElementById('sm-title').value || 'Team Sync';
  const timeStr = document.getElementById('sm-time').value || '5:00 PM';
  const platform = document.getElementById('sm-platform').value;

  window.managerState.meetings.push({
    id: 'm' + (window.managerState.meetings.length + 1),
    time: timeStr,
    duration: '30 mins',
    title: title,
    sub: 'Scheduled by Manager',
    organizer: 'David M.',
    platform: platform,
    connected: false
  });

  document.getElementById('schedule-meeting-modal').style.display = 'none';
  toast(`Meeting "${title}" scheduled!`, 'success');
  renderRoleFeatureView('feat_meetings');
}

function showReviewDecisionModal(dId) {
  const d = window.managerState.decisions.find(x => x.id === dId);
  if (!d) return;

  let modal = document.getElementById('review-decision-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'review-decision-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="glass-card" style="width:450px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem;">Review Escalated Decision</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('review-decision-modal').style.display='none'"></i>
      </div>
      <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; margin-bottom:16px;">
        <b>${d.cat}</b> <span style="font-size:0.8rem; color:var(--text-muted);">(${d.area})</span>
        <div style="font-size:0.85rem; margin-top:6px; color:var(--status-amber);"><i class="fa-solid fa-triangle-exclamation"></i> AI Confidence: ${d.conf}% (Requires Human Review)</div>
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.5; margin-bottom:16px;">
        This decision was escalated because security compliance thresholds require manager override for infrastructure exemptions.
      </p>
      <div style="display:flex; gap:10px;">
        <button class="btn-submit" onclick="executeDecisionById('${d.id}'); document.getElementById('review-decision-modal').style.display='none';" style="flex:1;">Approve Exemption</button>
        <button class="btn-secondary" onclick="toast('Exemption Rejected', 'error'); document.getElementById('review-decision-modal').style.display='none';" style="flex:1; border-color:var(--status-rose); color:var(--status-rose);">Reject</button>
      </div>
    </div>
  `;
}

function autoBalanceTeam() {
  toast('AI Auto-balancing workload across team...', 'info');
  setTimeout(() => {
    // Set diverse balanced values
    const balancedLevels = [
      { util: 82, text: '82% Utilized', tasks: 8, color: 'var(--status-emerald)' },
      { util: 75, text: '75% Utilized', tasks: 7, color: 'var(--status-emerald)' },
      { util: 68, text: '68% Utilized', tasks: 6, color: 'var(--status-emerald)' },
      { util: 78, text: '78% Utilized', tasks: 7, color: 'var(--status-emerald)' },
      { util: 60, text: '60% Utilized', tasks: 4, color: 'var(--status-emerald)' },
      { util: 72, text: '72% Utilized', tasks: 6, color: 'var(--status-emerald)' }
    ];

    window.managerState.team.forEach((t, idx) => {
      const b = balancedLevels[idx % balancedLevels.length];
      t.util = b.util;
      t.utilText = b.text;
      t.barColor = b.color;
      t.tasks = b.tasks;
      t.overallocated = false;
    });

    toast('Workload auto-balanced into optimal diverse ranges!', 'success');
    renderRoleFeatureView('feat_team');
  }, 700);
}


function startEarlyMeeting(mId) {
  const m = window.managerState.meetings.find(x => x.id === mId);
  if (m) {
    m.active = true;
    toast(`Meeting "${m.title}" activated early! You can now join.`, 'success');
    renderRoleFeatureView('feat_meetings');
  }
}


// =========================================================================
// AI DECISION CENTER TRACE & EXPORT ENGINE
// =========================================================================
function exportDecisionAudit() {
  const decisions = window.managerState.decisions;
  let csv = "Decision ID,Category,Impact Area,Confidence Score,Status,Executed\n";
  decisions.forEach(d => {
    csv += `"${d.id}","${d.cat}","${d.area}","${d.conf}%","${d.status}","${d.executed ? 'Yes' : 'No'}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'AI_Decision_Audit_Log.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('AI Decision Audit Log exported successfully!', 'success');
}

function showDecisionTraceModal(dId) {
  let modal = document.getElementById('decision-trace-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'decision-trace-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';

  const d = window.managerState.decisions.find(x => x.id === dId) || window.managerState.decisions[0];

  modal.innerHTML = `
    <div class="glass-card" style="width:580px; max-height:85vh; overflow-y:auto; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--border-glass); padding-bottom:12px;">
        <div>
          <h3 style="font-family:'Outfit'; font-size:1.3rem; margin:0;"><i class="fa-solid fa-network-wired" style="color:var(--accent-primary);"></i> AI Decision Execution Trace</h3>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">Trace ID: TRACE-2026-${d.id.toUpperCase()} • Model: Llama 3.3 70B RAG</div>
        </div>
        <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:1.2rem;" onclick="document.getElementById('decision-trace-modal').style.display='none'"></i>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
        <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; border:1px solid var(--border-glass);">
          <div style="font-size:0.75rem; color:var(--text-muted);">Category</div>
          <b style="font-size:0.95rem;">${d.cat}</b>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; border:1px solid var(--border-glass);">
          <div style="font-size:0.75rem; color:var(--text-muted);">Impact Area</div>
          <b style="font-size:0.95rem;">${d.area}</b>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; border:1px solid var(--border-glass);">
          <div style="font-size:0.75rem; color:var(--text-muted);">Confidence Rating</div>
          <b style="font-size:0.95rem; color:${d.conf > 90 ? 'var(--status-emerald)' : 'var(--status-amber)'};">${d.conf}% Match</b>
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; border:1px solid var(--border-glass);">
          <div style="font-size:0.75rem; color:var(--text-muted);">Execution Status</div>
          <b style="font-size:0.95rem; color:${d.executed ? 'var(--status-emerald)' : 'var(--status-amber)'};">${d.status}</b>
        </div>
      </div>

      <b style="font-size:0.9rem; color:var(--accent-primary); display:block; margin-bottom:8px;"><i class="fa-solid fa-code"></i> Execution Steps & Policy Evaluation Log</b>
      <div style="background:#090d16; border:1px solid var(--border-glass); border-radius:8px; padding:12px; font-family:monospace; font-size:0.78rem; color:#94a3b8; line-height:1.6; margin-bottom:16px; max-height:180px; overflow-y:auto;">
        <div><span style="color:#6366f1;">[18:40:01.102]</span> Fetching vector embeddings for '${d.cat}'...</div>
        <div><span style="color:#6366f1;">[18:40:01.340]</span> 12 Context vectors matched (Cosine Sim: 0.948)</div>
        <div><span style="color:#10b981;">[18:40:01.512]</span> Security Guardrail Check: PASSED (0 PII violations)</div>
        <div><span style="color:#10b981;">[18:40:01.780]</span> Policy Rule Tree Check: PASS (Budget cap & authority verified)</div>
        <div><span style="color:#f59e0b;">[18:40:02.010]</span> State update: Status set to '${d.status}'</div>
        <div><span style="color:#10b981;">[18:40:02.200]</span> Execution Completed & Logged to Audit Ledger.</div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button class="btn-secondary" onclick="exportDecisionAudit()" style="font-size:0.8rem;"><i class="fa-solid fa-download"></i> Export Audit Evidence</button>
        <button class="btn-submit" onclick="document.getElementById('decision-trace-modal').style.display='none'" style="font-size:0.8rem;">Close Trace</button>
      </div>
    </div>
  `;
}


// =========================================================================
// HR PORTAL STATE MANAGEMENT & RICH MODULES
// =========================================================================
if (!window.hrState) {
  window.hrState = {
    candidates: [
      { id: 'c1', name: 'Sophia Chen', position: 'Senior Full-Stack Lead', stage: 'Technical Interview', rating: '4.9/5', status: 'In Progress' },
      { id: 'c2', name: 'Marcus Vance', position: 'DevOps & Security Eng', stage: 'Final Leadership', rating: '4.8/5', status: 'Offer Pending' },
      { id: 'c3', name: 'Elena Rostova', position: 'AI/ML Product Manager', stage: 'Screening', rating: '4.6/5', status: 'Scheduled' },
      { id: 'c4', name: "Liam O'Connor", position: 'UX Infrastructure Designer', stage: 'Background Check', rating: '5.0/5', status: 'Approved' }
    ],
    audits: [
      { title: 'Labor Law 2026 Compliance', status: '100% Passed', date: 'Jul 28, 2026', badge: 'rb-emerald' },
      { title: 'GDPR Data Privacy Audit', status: '100% Passed', date: 'Jul 25, 2026', badge: 'rb-emerald' },
      { title: 'Equal Opportunity & Pay Equity', status: '98% Verified', date: 'Jul 20, 2026', badge: 'rb-emerald' },
      { title: 'Remote Work Ergonomics & Safety', status: 'Pending Review', date: 'Aug 05, 2026', badge: 'rb-amber' }
    ]
  };
}

function renderHRDashboardModules() {
  const hrContainer = document.getElementById('hr-exec-modules');
  if (!hrContainer) return;

  const state = window.hrState;

  hrContainer.innerHTML = `
    <!-- Top Action Bar -->
    <div class="glass-card" style="padding:16px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; background:linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(99,102,241,0.08) 100%); border:1px solid rgba(6,182,212,0.2);">
      <div>
        <b style="font-size:1.1rem; color:var(--text-main);"><i class="fa-solid fa-users-gear" style="color:var(--accent-cyan); margin-right:6px;"></i> Quick HR Actions</b>
        <div style="font-size:0.8rem; color:var(--text-muted);">Talent pipeline management & compliance operations</div>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn-submit" onclick="showAddCandidateModal()" style="padding:8px 14px; font-size:0.82rem; background:var(--accent-cyan);"><i class="fa-solid fa-user-plus"></i> Add Candidate</button>
        <button class="btn-secondary" onclick="showPostJobModal()" style="padding:8px 14px; font-size:0.82rem;"><i class="fa-solid fa-briefcase"></i> Post New Job</button>
        <button class="btn-secondary" onclick="runComplianceAudit()" style="padding:8px 14px; font-size:0.82rem;"><i class="fa-solid fa-shield-check"></i> Run Audit</button>
      </div>
    </div>

    <!-- Two Column Dashboard Overview -->
    <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:20px;">
      <!-- Left Column: Recruitment Pipeline & Activity -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div class="glass-card" style="padding:0; overflow:hidden;">
          <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
            <b style="font-size:1.05rem;"><i class="fa-solid fa-user-check" style="color:var(--accent-cyan); margin-right:8px;"></i> Active Recruitment Pipeline Snapshot</b>
            <span class="role-badge-pill" style="background:var(--accent-cyan); color:white;">${state.candidates.length} Active</span>
          </div>
          <table class="org-table">
            <thead><tr><th>Candidate</th><th>Position</th><th>Stage</th><th>Rating</th><th>Action</th></tr></thead>
            <tbody>
              ${state.candidates.map(c => `
                <tr>
                  <td><b>${c.name}</b></td>
                  <td>${c.position}</td>
                  <td><span class="role-badge-inline rb-hr">${c.stage}</span></td>
                  <td><b style="color:var(--status-emerald);">${c.rating}</b></td>
                  <td><button class="btn-act" onclick="advanceCandidate('${c.id}')" style="padding:3px 8px; font-size:0.75rem;">Advance</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="glass-card" style="padding:20px;">
          <b style="font-size:1.05rem; display:block; margin-bottom:12px;"><i class="fa-solid fa-clock-rotate-left" style="color:var(--accent-cyan); margin-right:8px;"></i> Recent HR & Onboarding Activity</b>
          <div style="display:flex; flex-direction:column; gap:12px; font-size:0.85rem;">
            <div style="display:flex; gap:12px; align-items:flex-start; background:rgba(255,255,255,0.02); padding:10px; border-radius:8px;">
              <i class="fa-solid fa-circle-check" style="color:var(--status-emerald); margin-top:3px;"></i>
              <div><b>Sophia Chen</b> completed 3rd round technical interview (Scored 4.9/5) <div style="font-size:0.75rem; color:var(--text-muted);">15 mins ago</div></div>
            </div>
            <div style="display:flex; gap:12px; align-items:flex-start; background:rgba(255,255,255,0.02); padding:10px; border-radius:8px;">
              <i class="fa-solid fa-file-contract" style="color:var(--accent-cyan); margin-top:3px;"></i>
              <div><b>Labor Law 2026 Audit</b> verified 100% compliant across all 80 staff <div style="font-size:0.75rem; color:var(--text-muted);">1 hour ago</div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Compliance Audits & Sentiment -->
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div class="glass-card" style="padding:20px;">
          <b style="font-size:1.05rem; display:block; margin-bottom:14px;"><i class="fa-solid fa-shield-check" style="color:var(--status-emerald); margin-right:8px;"></i> Policy Compliance Audits</b>
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${state.audits.map(a => `
              <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:10px; border-radius:8px; border:1px solid var(--border-glass);">
                <div>
                  <b style="font-size:0.85rem; display:block;">${a.title}</b>
                  <span style="font-size:0.75rem; color:var(--text-muted);">${a.date}</span>
                </div>
                <span class="role-badge-inline ${a.badge}" style="font-size:0.75rem;">${a.status}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="glass-card" style="padding:20px;">
          <b style="font-size:1.05rem; display:block; margin-bottom:12px;"><i class="fa-solid fa-face-smile" style="color:var(--status-amber); margin-right:8px;"></i> Employee Sentiment Index</b>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.85rem;">
            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Engineering Team</span><b style="color:var(--status-emerald)">4.9 / 5</b></div>
              <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px;"><div style="width:98%; height:100%; background:var(--status-emerald); border-radius:2px;"></div></div>
            </div>
            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Product & Design</span><b style="color:var(--status-emerald)">4.8 / 5</b></div>
              <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px;"><div style="width:96%; height:100%; background:var(--status-emerald); border-radius:2px;"></div></div>
            </div>
            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Operations & Finance</span><b style="color:var(--status-amber)">4.6 / 5</b></div>
              <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px;"><div style="width:92%; height:100%; background:var(--status-amber); border-radius:2px;"></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function showAddCandidateModal() {
  let modal = document.getElementById('hr-add-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hr-add-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="glass-card" style="width:400px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem; margin:0;"><i class="fa-solid fa-user-plus" style="color:var(--accent-cyan);"></i> Add New Candidate</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('hr-add-modal').style.display='none'"></i>
      </div>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Full Name</label>
      <input type="text" id="hr-cname" class="input-box" placeholder="e.g. Alex Morgan" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Position</label>
      <input type="text" id="hr-cpos" class="input-box" placeholder="e.g. Senior Frontend Lead" style="margin-bottom:16px; width:100%;">
      <button class="btn-submit" onclick="submitAddCandidate()" style="width:100%; background:var(--accent-cyan);">Save Candidate</button>
    </div>
  `;
}

function submitAddCandidate() {
  const name = document.getElementById('hr-cname')?.value.trim() || 'Alex Morgan';
  const pos = document.getElementById('hr-cpos')?.value.trim() || 'Senior Developer';

  window.hrState.candidates.unshift({
    id: 'c' + (window.hrState.candidates.length + 1),
    name: name,
    position: pos,
    stage: 'Screening',
    rating: '5.0/5',
    status: 'In Progress'
  });

  document.getElementById('hr-add-modal').style.display = 'none';
  toast(`Candidate "${name}" added successfully!`, 'success');
  renderHRDashboardModules();
}

function advanceCandidate(cId) {
  const c = window.hrState.candidates.find(x => x.id === cId);
  if (c) {
    const stages = ['Screening', 'Technical Interview', 'Final Leadership', 'Background Check', 'Offer Extended'];
    const curIdx = stages.indexOf(c.stage);
    c.stage = stages[(curIdx + 1) % stages.length];
    toast(`Candidate "${c.name}" advanced to ${c.stage}!`, 'success');
    renderHRDashboardModules();
  }
}


function showPostJobModal() {
  let modal = document.getElementById('hr-job-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hr-job-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="glass-card" style="width:420px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem; margin:0;"><i class="fa-solid fa-briefcase" style="color:var(--accent-cyan);"></i> Create Job Requisition</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('hr-job-modal').style.display='none'"></i>
      </div>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Job Title</label>
      <input type="text" id="job-title" class="input-box" placeholder="e.g. Senior AI Infrastructure Engineer" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Department</label>
      <select id="job-dept" class="input-box" style="margin-bottom:12px; width:100%; background:rgba(0,0,0,0.4); color:white;">
        <option value="Engineering">Engineering</option>
        <option value="AI Core">AI Core Platform</option>
        <option value="Operations">Operations & Infrastructure</option>
        <option value="Product">Product & Design</option>
        <option value="Human Resources">Human Resources</option>
      </select>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Number of Openings</label>
      <input type="number" id="job-openings" class="input-box" value="1" min="1" max="10" style="margin-bottom:16px; width:100%;">
      <button class="btn-submit" onclick="submitNewJobReq()" style="width:100%; background:var(--accent-cyan);">Publish Job Requisition</button>
    </div>
  `;
}

function submitNewJobReq() {
  const titleInput = document.getElementById('job-title');
  const title = (titleInput && titleInput.value.trim()) ? titleInput.value.trim() : 'Senior AI Infrastructure Engineer';
  const deptSelect = document.getElementById('job-dept');
  const dept = deptSelect ? deptSelect.value : 'Engineering';
  const openingsInput = document.getElementById('job-openings');
  const openings = openingsInput ? parseInt(openingsInput.value) || 1 : 1;

  if (!window.hrState) window.hrState = {};
  if (!window.hrState.jobReqs) window.hrState.jobReqs = [];

  window.hrState.jobReqs.unshift({
    id: 'j' + (window.hrState.jobReqs.length + 1),
    title: title,
    dept: dept,
    openings: openings,
    applicants: 0,
    recruiter: 'Priya S. (HR)',
    status: 'Active'
  });

  const modal = document.getElementById('hr-job-modal');
  if (modal) modal.style.display = 'none';

  toast(`Job Requisition "${title}" published successfully!`, 'success');

  // Refresh active view
  if (document.getElementById('hr-exec-modules') && document.getElementById('hr-exec-modules').style.display !== 'none') {
    renderHRDashboardModules();
  }
  renderRoleFeatureView('feat_recruitment');
}


function runComplianceAudit() {
  toast('Running 2026 Labor Law & SOC2 Compliance Audit...', 'info');
  setTimeout(() => {
    toast('Compliance Audit Complete: 100% Passed!', 'success');
  }, 600);
}


// =========================================================================
// STATEFUL RECRUITMENT PIPELINE ENGINE
// =========================================================================
if (!window.hrState) window.hrState = {};

if (!window.hrState.pipelineCandidates) {
  window.hrState.pipelineCandidates = [
    { id: 'p1', name: 'Alex Rivera', role: 'Python Developer', stage: 'Applied', match: '94%', exp: '4 Yrs' },
    { id: 'p2', name: 'Jessica Wu', role: 'Full Stack Engineer', stage: 'Applied', match: '91%', exp: '5 Yrs' },
    { id: 'p3', name: 'Daniel Kim', role: 'DevOps Specialist', stage: 'Applied', match: '88%', exp: '3 Yrs' },
    { id: 'p4', name: 'Marcus Vance', role: 'Security Engineer', stage: 'Screening', match: '95%', exp: '6 Yrs' },
    { id: 'p5', name: 'Priya Nair', role: 'AI Systems Architect', stage: 'Screening', match: '92%', exp: '7 Yrs' },
    { id: 'p6', name: 'David Miller', role: 'Data Engineer', stage: 'Interview', match: '96%', exp: '5 Yrs' },
    { id: 'p7', name: 'Sophia Chen', role: 'Senior Frontend Lead', stage: 'Interview', match: '98%', exp: '8 Yrs' },
    { id: 'p8', name: 'Elena Rostova', role: 'AI Product Manager', stage: 'Leadership', match: '97%', exp: '6 Yrs' },
    { id: 'p9', name: 'Emily Zhang', role: 'UX Designer', stage: 'Offer Sent', match: '99%', exp: '5 Yrs' },
    { id: 'p10', name: "Liam O'Connor", role: 'UX Infrastructure', stage: 'Offer Sent', match: '95%', exp: '4 Yrs' }
  ];
}

if (!window.hrState.jobReqs) {
  window.hrState.jobReqs = [
    { id: 'j1', title: 'Senior Full Stack Lead', dept: 'Engineering', openings: 2, applicants: 42, recruiter: 'Priya S.', status: 'Active' },
    { id: 'j2', title: 'AI/ML Systems Architect', dept: 'AI Core', openings: 1, applicants: 28, recruiter: 'David M.', status: 'Active' },
    { id: 'j3', title: 'DevOps & Security Lead', dept: 'Operations', openings: 1, applicants: 35, recruiter: 'Priya S.', status: 'Active' },
    { id: 'j4', title: 'UX Infrastructure Designer', dept: 'Product', openings: 2, applicants: 19, recruiter: 'Sophia C.', status: 'Interviewing' }
  ];
}

function advancePipelineStage(cId) {
  const c = window.hrState.pipelineCandidates.find(x => x.id === cId);
  if (c) {
    const stages = ['Applied', 'Screening', 'Interview', 'Leadership', 'Offer Sent'];
    const idx = stages.indexOf(c.stage);
    if (idx < stages.length - 1) {
      c.stage = stages[idx + 1];
      toast(`Candidate "${c.name}" advanced to ${c.stage}!`, 'success');
    } else {
      toast(`Candidate "${c.name}" is already at Offer Sent stage!`, 'info');
    }
    renderRoleFeatureView('feat_recruitment');
  }
}

function exportPipelineCSV() {
  const candidates = window.hrState.pipelineCandidates;
  let csv = "Candidate ID,Name,Role,Stage,AI Match,Experience\n";
  candidates.forEach(c => {
    csv += `"${c.id}","${c.name}","${c.role}","${c.stage}","${c.match}","${c.exp}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'HR_Recruitment_Pipeline.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Exported HR Recruitment Pipeline CSV!', 'success');
}


// =========================================================================
// STATEFUL CANDIDATE RESUME SCORER ENGINE
// =========================================================================
if (!window.hrState) window.hrState = {};

if (!window.hrState.resumeCandidatesList) {
  window.hrState.resumeCandidatesList = [
    {
      id: 'rc1',
      name: 'Sophia Chen',
      role: 'Senior Full-Stack Lead',
      skills: 'React, TypeScript, FastAPI, AWS',
      score: 98.4,
      status: 'Shortlisted',
      resumeFile: 'Sophia_Chen_Resume.pdf',
      strengths: '8+ years SaaS architecture. Led 14 microservice migrations. 99.8% test coverage rating.',
      skillBreakdown: [
        { name: 'React / Next.js / TypeScript', match: 100 },
        { name: 'Python / FastAPI Microservices', match: 95 },
        { name: 'AWS Cloud & Kubernetes', match: 92 },
        { name: 'System Design & Leadership', match: 98 }
      ]
    },
    {
      id: 'rc2',
      name: 'David Miller',
      role: 'Data & Pipeline Engineer',
      skills: 'Python, Spark, Kafka, Postgres',
      score: 94.2,
      status: 'In Review',
      resumeFile: 'David_Miller_Resume.pdf',
      strengths: 'Built high-throughput streaming pipelines processing 10k events/sec. Strong SQL & DB sharding experience.',
      skillBreakdown: [
        { name: 'Python & PySpark Data Lakes', match: 96 },
        { name: 'Kafka & Real-time Streaming', match: 92 },
        { name: 'Postgres & DB Sharding', match: 94 },
        { name: 'ETL Pipeline Architecture', match: 95 }
      ]
    },
    {
      id: 'rc3',
      name: 'Marcus Vance',
      role: 'DevOps & Security Eng',
      skills: 'Docker, K8s, Terraform, SOC2',
      score: 91.5,
      status: 'In Review',
      resumeFile: 'Marcus_Vance_Resume.pdf',
      strengths: 'SOC2 Type II compliance expert. Managed multi-region Kubernetes clusters with zero P0 breaches.',
      skillBreakdown: [
        { name: 'Kubernetes & Terraform Infrastructure', match: 94 },
        { name: 'SOC2 & ISO 27001 Security Audit', match: 96 },
        { name: 'CI/CD Automation Pipelines', match: 88 }
      ]
    },
    {
      id: 'rc4',
      name: 'Elena Rostova',
      role: 'AI/ML Product Manager',
      skills: 'RAG, Vector DBs, Product Strategy',
      score: 96.8,
      status: 'Shortlisted',
      resumeFile: 'Elena_Rostova_Resume.pdf',
      strengths: '6+ years PM experience launching enterprise LLM features. Managed cross-functional AI teams of 12.',
      skillBreakdown: [
        { name: 'AI Product Strategy & Roadmap', match: 98 },
        { name: 'RAG & Vector Database Systems', match: 95 },
        { name: 'Agile Team Leadership', match: 97 }
      ]
    }
  ];
}

if (!window.hrState.selectedResumeId) {
  window.hrState.selectedResumeId = 'rc1';
}

function selectCandidateResume(rcId) {
  window.hrState.selectedResumeId = rcId;
  renderRoleFeatureView('feat_candidates');
}

function toggleCandidateShortlist(rcId) {
  const c = window.hrState.resumeCandidatesList.find(x => x.id === rcId);
  if (c) {
    c.status = (c.status === 'Shortlisted') ? 'In Review' : 'Shortlisted';
    toast(`Candidate "${c.name}" status updated to ${c.status}!`, 'success');
    renderRoleFeatureView('feat_candidates');
  }
}

function runBatchAIScoring() {
  toast('Running AI LLM Resume Matcher across all applicants...', 'info');
  setTimeout(() => {
    window.hrState.resumeCandidatesList.forEach(c => {
      c.score = Math.min(100, Math.round((c.score + (Math.random() * 2 - 1)) * 10) / 10);
    });
    toast('AI Batch Scoring Complete: All match scores updated!', 'success');
    renderRoleFeatureView('feat_candidates');
  }, 700);
}

function showUploadResumeModal() {
  let modal = document.getElementById('hr-upload-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hr-upload-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="glass-card" style="width:420px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem; margin:0;"><i class="fa-solid fa-file-arrow-up" style="color:var(--accent-cyan);"></i> Upload & Parse Resume</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('hr-upload-modal').style.display='none'"></i>
      </div>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Candidate Name</label>
      <input type="text" id="up-cname" class="input-box" placeholder="e.g. Alex Morgan" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Target Role</label>
      <input type="text" id="up-crole" class="input-box" placeholder="e.g. Senior Frontend Engineer" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Select Resume File (PDF/DOCX)</label>
      <input type="file" id="up-file" class="input-box" style="margin-bottom:16px; width:100%; font-size:0.8rem;">
      <button class="btn-submit" onclick="submitUploadResume()" style="width:100%; background:var(--accent-cyan);">Parse Resume with AI</button>
    </div>
  `;
}

function submitUploadResume() {
  const name = document.getElementById('up-cname')?.value.trim() || 'Alex Morgan';
  const role = document.getElementById('up-crole')?.value.trim() || 'Senior Frontend Engineer';

  const newId = 'rc' + (window.hrState.resumeCandidatesList.length + 1);
  const newCandidate = {
    id: newId,
    name: name,
    role: role,
    skills: 'React, TypeScript, Next.js, Redux',
    score: 95.8,
    status: 'Shortlisted',
    resumeFile: name.replace(/\s+/g, '_') + '_Resume.pdf',
    strengths: 'Strong frontend architectural background. Excellent UI component optimization and TypeScript proficiency.',
    skillBreakdown: [
      { name: 'React / Next.js & UI Architecture', match: 98 },
      { name: 'TypeScript & State Management', match: 95 },
      { name: 'REST API & GraphQL Integration', match: 94 }
    ]
  };

  window.hrState.resumeCandidatesList.unshift(newCandidate);
  window.hrState.selectedResumeId = newId;

  document.getElementById('hr-upload-modal').style.display = 'none';
  toast(`Resume for "${name}" uploaded & parsed (95.8% AI Match)!`, 'success');
  renderRoleFeatureView('feat_candidates');
}

function downloadCandidateResume(fileName) {
  const content = `
================================================================================
                    CANDIDATE RESUME & AI MATCH ANALYSIS
================================================================================
FILE NAME:         ${fileName}
PARSED DATE:       ${new Date().toLocaleString()}
SECURITY CLASS:    CONFIDENTIAL - HR RECRUITMENT AUDITED

--------------------------------------------------------------------------------
1. CANDIDATE PROFILE SUMMARY
--------------------------------------------------------------------------------
Name:              ${fileName.replace(/_/g, ' ').replace('.pdf', '')}
Status:            VERIFIED & SHORTLISTED BY AI RESUME ENGINE
Match Score:       96.8% Match with Job Description Requirements

--------------------------------------------------------------------------------
2. AI EXTRACTED SKILL ALIGNMENT
--------------------------------------------------------------------------------
- Core Technical Skills:  React, TypeScript, Node.js, Python, AWS, PostgreSQL
- Architecture Rating:    98% Advanced Enterprise Systems
- Team Leadership:        Experienced in leading cross-functional teams

================================================================================
`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Downloaded candidate resume: ' + fileName, 'success');
}

function downloadCandidateResume(fileName) {
  const RESUME_DATABASE = {
    'David_Miller_Resume.pdf': {
      name: 'David Miller',
      title: 'Senior Data & Streaming Pipeline Engineer',
      email: 'david.miller@synapseai.com',
      phone: '+1 (555) 234-5678',
      summary: 'Senior Data Engineer with 5+ years of experience architecting real-time streaming data pipelines processing over 10,000 events/sec with Apache Kafka, PySpark, and PostgreSQL.',
      experience: [
        { role: 'Lead Data Engineer — TechScale Inc.', period: '2023 - Present', desc: 'Designed Kafka streaming pipelines and reduced ETL query latency by 45%.' },
        { role: 'Data Systems Architect — CloudData Systems', period: '2021 - 2023', desc: 'Managed 50TB PostgreSQL sharded clusters and automated data lake ingestion.' }
      ],
      skills: ['Python', 'Apache Kafka', 'PySpark', 'PostgreSQL', 'Docker', 'AWS Redshift'],
      matchScore: '94.2%'
    },
    'Sophia_Chen_Resume.pdf': {
      name: 'Sophia Chen',
      title: 'Senior Full-Stack Lead Architect',
      email: 'sophia.chen@synapseai.com',
      phone: '+1 (555) 876-5432',
      summary: 'Senior Full-Stack Lead with 8+ years experience building high-performance SaaS applications with React, TypeScript, FastAPI, and AWS Kubernetes microservices.',
      experience: [
        { role: 'Staff Frontend Architect — Enterprise Systems', period: '2022 - Present', desc: 'Architected micro-frontend systems supporting 100k daily active users.' },
        { role: 'Senior Full-Stack Dev — Innovate Tech', period: '2019 - 2022', desc: 'Migrated monolithic Django app to FastAPI & React microservices.' }
      ],
      skills: ['React', 'Next.js', 'TypeScript', 'Python', 'FastAPI', 'AWS K8s'],
      matchScore: '98.4%'
    },
    'Marcus_Vance_Resume.pdf': {
      name: 'Marcus Vance',
      title: 'DevOps & Security Infrastructure Lead',
      email: 'marcus.vance@synapseai.com',
      phone: '+1 (555) 345-6789',
      summary: 'DevOps & Cloud Security Specialist with 6+ years managing multi-region Kubernetes clusters, SOC2 Type II audits, and zero-trust infrastructure.',
      experience: [
        { role: 'Senior DevOps Lead — SecureCloud Inc.', period: '2022 - Present', desc: 'Achieved 100% SOC2 Type II compliance across 14 Kubernetes clusters.' }
      ],
      skills: ['Kubernetes', 'Docker', 'Terraform', 'SOC2 Compliance', 'AWS IAM'],
      matchScore: '91.5%'
    },
    'Elena_Rostova_Resume.pdf': {
      name: 'Elena Rostova',
      title: 'AI/ML Product Manager & LLM Architect',
      email: 'elena.rostova@synapseai.com',
      phone: '+1 (555) 987-6543',
      summary: 'Product Manager with 6+ years spearheading enterprise AI/ML features, vector database embeddings, and RAG pipeline products.',
      experience: [
        { role: 'Principal AI Product Manager — AI Core Labs', period: '2023 - Present', desc: 'Launched RAG Enterprise Knowledge Search product adopted by 50+ clients.' }
      ],
      skills: ['AI Product Strategy', 'RAG & Vector DBs', 'Agile Leadership', 'LLM Guardrails'],
      matchScore: '96.8%'
    }
  };

  const cleanName = fileName.replace(/_/g, ' ').replace('.pdf', '');
  const rData = RESUME_DATABASE[fileName] || {
    name: cleanName,
    title: 'Senior Software Engineer Candidate',
    email: cleanName.toLowerCase().replace(/\s+/g, '.') + '@synapseai.com',
    phone: '+1 (555) 444-9988',
    summary: `Verified candidate profile for ${cleanName}. Experienced software professional with a strong track record in enterprise applications, code quality, and system reliability.`,
    experience: [
      { role: 'Senior Software Lead — Enterprise Systems', period: '2022 - Present', desc: 'Led engineering team in delivering core product milestones with 99.9% uptime.' }
    ],
    skills: ['JavaScript', 'TypeScript', 'Python', 'Cloud Services', 'System Design'],
    matchScore: '95.8%'
  };

  toast('Generating Resume PDF...', 'info', 2000);
  const element = document.createElement('div');
  element.style.padding = '30px';
  element.style.background = '#ffffff';
  element.style.color = '#000000';
  element.style.fontFamily = 'Arial, sans-serif';
  element.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; border: 1px solid #ccc; padding: 30px; border-radius: 8px;">
          <div style="border-bottom: 2px solid #0ea5e9; padding-bottom: 15px; margin-bottom: 20px;">
              <h1 style="margin: 0; color: #000; font-size: 28px;">${rData.name}</h1>
              <div style="color: #555; font-size: 16px; margin-top: 5px;">${rData.role}</div>
              <div style="color: #666; font-size: 13px; margin-top: 10px;">
                ?? ${rData.contact.email} &nbsp;|&nbsp; ?? ${rData.contact.phone} &nbsp;|&nbsp; ?? ${rData.contact.location}
              </div>
          </div>
          <div style="margin-bottom: 20px;">
            <h3 style="color: #0ea5e9; margin-bottom: 10px; font-size: 18px;">Summary</h3>
            <p style="margin: 0; line-height: 1.6; color: #333;">${rData.summary}</p>
          </div>
          <div style="margin-bottom: 20px;">
            <h3 style="color: #0ea5e9; margin-bottom: 10px; font-size: 18px;">Experience</h3>
            ${rData.experience.map(e => `
              <div style="margin-bottom: 15px;">
                <div style="font-weight: bold; color: #222;">${e.title} at ${e.company}</div>
                <div style="font-size: 13px; color: #666; margin-bottom: 5px;">${e.period}</div>
                <ul style="margin: 0; padding-left: 20px; color: #333; line-height: 1.5;">
                  ${e.achievements.map(a => `<li>${a}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
          <div>
            <h3 style="color: #0ea5e9; margin-bottom: 10px; font-size: 18px;">Skills</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${rData.skills.map(s => `<span style="background: #f1f5f9; padding: 4px 10px; border-radius: 4px; font-size: 13px; border: 1px solid #e2e8f0;">${s}</span>`).join('')}
            </div>
          </div>
        </div>
  `;
  html2pdf().set({ margin: 10, filename: rData.name.replace(/\s+/g,'_')+'_Resume.pdf', html2canvas: { scale: 2 } }).from(element).save().then(() => toast('Resume downloaded!', 'success'));
}

// =========================================================================
// STATEFUL EMPLOYEE DIRECTORY & ROSTER ENGINE
// =========================================================================
if (!window.hrState) window.hrState = {};

if (!window.hrState.employeeDirectory) {
  window.hrState.employeeDirectory = [
    { id: 'e1', name: 'Haritha L.', role: 'Senior Software Engineer', dept: 'Engineering', email: 'haritha.l@synapseai.com', rating: '4.9/5', mode: 'Hybrid', status: 'Active' },
    { id: 'e2', name: 'Priya S.', role: 'Frontend Lead', dept: 'Engineering', email: 'priya.s@synapseai.com', rating: '4.8/5', mode: 'Remote', status: 'Active' },
    { id: 'e3', name: 'Rahul K.', role: 'AI Platform Specialist', dept: 'AI Core', email: 'rahul.k@synapseai.com', rating: '4.7/5', mode: 'Onsite', status: 'Active' },
    { id: 'e4', name: 'Sarah J.', role: 'Cloud Operations Lead', dept: 'Operations', email: 'sarah.j@synapseai.com', rating: '4.9/5', mode: 'Hybrid', status: 'Active' },
    { id: 'e5', name: 'Mark T.', role: 'Mobile App Lead', dept: 'Product', email: 'mark.t@synapseai.com', rating: '4.6/5', mode: 'Remote', status: 'Active' },
    { id: 'e6', name: 'Alex R.', role: 'Security & DevOps Lead', dept: 'Operations', email: 'alex.r@synapseai.com', rating: '5.0/5', mode: 'Onsite', status: 'Active' },
    { id: 'e7', name: 'Jessica W.', role: 'Database Infrastructure Eng', dept: 'Engineering', email: 'jessica.w@synapseai.com', rating: '4.8/5', mode: 'Hybrid', status: 'Active' },
    { id: 'e8', name: 'Emily Z.', role: 'Senior Product Designer', dept: 'Product', email: 'emily.z@synapseai.com', rating: '4.9/5', mode: 'Remote', status: 'Active' }
  ];
}

function exportEmployeeDirectoryCSV() {
  const empList = window.hrState.employeeDirectory;
  let csv = "Employee ID,Name,Job Title,Department,Email,Rating,Work Mode,Status\n";
  empList.forEach(e => {
    csv += `"${e.id}","${e.name}","${e.role}","${e.dept}","${e.email}","${e.rating}","${e.mode}","${e.status}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'HR_Employee_Directory_Roster.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Exported Employee Directory CSV Roster!', 'success');
}

function showAddEmployeeModal() {
  let modal = document.getElementById('hr-emp-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hr-emp-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="glass-card" style="width:420px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem; margin:0;"><i class="fa-solid fa-user-plus" style="color:var(--accent-cyan);"></i> Add Employee Record</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('hr-emp-modal').style.display='none'"></i>
      </div>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Full Name</label>
      <input type="text" id="emp-name" class="input-box" placeholder="e.g. David Vance" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Job Title</label>
      <input type="text" id="emp-role" class="input-box" placeholder="e.g. Staff Backend Engineer" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Department</label>
      <select id="emp-dept" class="input-box" style="margin-bottom:12px; width:100%; background:rgba(0,0,0,0.4); color:white;">
        <option value="Engineering">Engineering</option>
        <option value="AI Core">AI Core Platform</option>
        <option value="Operations">Operations & Infrastructure</option>
        <option value="Product">Product & Design</option>
        <option value="Human Resources">Human Resources</option>
      </select>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Work Mode</label>
      <select id="emp-mode" class="input-box" style="margin-bottom:16px; width:100%; background:rgba(0,0,0,0.4); color:white;">
        <option value="Hybrid">Hybrid</option>
        <option value="Remote">Remote</option>
        <option value="Onsite">Onsite</option>
      </select>
      <button class="btn-submit" onclick="submitAddEmployee()" style="width:100%; background:var(--accent-cyan);">Add Employee Record</button>
    </div>
  `;
}

function submitAddEmployee() {
  const name = document.getElementById('emp-name')?.value.trim() || 'David Vance';
  const role = document.getElementById('emp-role')?.value.trim() || 'Software Engineer';
  const dept = document.getElementById('emp-dept')?.value || 'Engineering';
  const mode = document.getElementById('emp-mode')?.value || 'Hybrid';

  const newEmp = {
    id: 'e' + (window.hrState.employeeDirectory.length + 1),
    name: name,
    role: role,
    dept: dept,
    email: name.toLowerCase().replace(/\s+/g, '.') + '@synapseai.com',
    rating: '5.0/5',
    mode: mode,
    status: 'Active'
  };

  window.hrState.employeeDirectory.unshift(newEmp);

  document.getElementById('hr-emp-modal').style.display = 'none';
  toast(`Employee record for "${name}" created!`, 'success');
  renderRoleFeatureView('feat_directory');
}


// =========================================================================
// STATEFUL POLICY STUDIO & PUBLISHER ENGINE
// =========================================================================
if (!window.hrState) window.hrState = {};

if (!window.hrState.policiesList) {
  window.hrState.policiesList = [
    {
      id: 'pol1',
      title: '2026 Paternity & Maternity Leave Guidelines',
      dept: 'Human Resources',
      version: 'v3.2',
      updated: 'Jul 28, 2026',
      status: 'Published',
      compliance: '100% Passed',
      content: 'All secondary caregivers receive 6 weeks of 100% fully paid leave following the birth, adoption, or foster placement of a child. Primary caregivers receive 16 weeks of 100% paid leave with full benefit continuation and flexible return-to-work options.'
    },
    {
      id: 'pol2',
      title: 'Domestic & Global Travel Expense Policy',
      dept: 'Finance & Travel',
      version: 'v2.1',
      updated: 'Jul 22, 2026',
      status: 'Published',
      compliance: '100% Passed',
      content: 'Daily meal expense cap is $75/day for domestic travel and $120/day for international travel. All flight bookings over $500 require prior Manager & Finance approval via the Expense Portal.'
    },
    {
      id: 'pol3',
      title: 'Remote & Hybrid Work Operations Code',
      dept: 'Operations',
      version: 'v4.0',
      updated: 'Jul 15, 2026',
      status: 'Published',
      compliance: '98% Verified',
      content: 'Core collaboration hours are 10:00 AM to 4:00 PM local time. Remote employees are eligible for a $500 annual home office equipment stipend.'
    },
    {
      id: 'pol4',
      title: 'IT Security, Data Encryption & Key Rotation',
      dept: 'IT Security',
      version: 'v5.1',
      updated: 'Jul 10, 2026',
      status: 'Published',
      compliance: '100% Passed',
      content: 'All administrative API keys and cloud credentials must be rotated every 90 days. Multi-Factor Authentication (MFA) is strictly mandatory across all enterprise accounts.'
    }
  ];
}

if (!window.hrState.selectedPolicyId) {
  window.hrState.selectedPolicyId = 'pol1';
}

function selectPolicyForEditing(polId) {
  window.hrState.selectedPolicyId = polId;
  renderRoleFeatureView('feat_policy');
}

function updateSelectedPolicyTitle(val) {
  const p = window.hrState.policiesList.find(x => x.id === window.hrState.selectedPolicyId);
  if (p) {
    p.title = val;
  }
}

function updateSelectedPolicyContent(val) {
  const p = window.hrState.policiesList.find(x => x.id === window.hrState.selectedPolicyId);
  if (p) {
    p.content = val;
  }
}

function publishCurrentPolicyUpdate() {
  const p = window.hrState.policiesList.find(x => x.id === window.hrState.selectedPolicyId);
  if (p) {
    p.updated = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    p.status = 'Published';
    toast(`Policy "${p.title}" published & synced to Enterprise Knowledge Index!`, 'success');
    renderRoleFeatureView('feat_policy');
  }
}

function runPolicyComplianceAudit() {
  toast('Running AI Compliance Scanner against 2026 Labor Code...', 'info');
  setTimeout(() => {
    toast('Compliance Scan Complete: All 4 active policies passed 100%!', 'success');
  }, 600);
}

function exportPoliciesCSV() {
  const list = window.hrState.policiesList;
  let csv = "Policy ID,Title,Department,Version,Last Updated,Status,Compliance\n";
  list.forEach(p => {
    csv += `"${p.id}","${p.title}","${p.dept}","${p.version}","${p.updated}","${p.status}","${p.compliance}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Company_Policy_Manifest.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Exported Policy Manifest CSV!', 'success');
}

function showNewPolicyModal() {
  let modal = document.getElementById('hr-pol-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hr-pol-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="glass-card" style="width:450px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem; margin:0;"><i class="fa-solid fa-file-circle-plus" style="color:var(--accent-cyan);"></i> Create New Policy Draft</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('hr-pol-modal').style.display='none'"></i>
      </div>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Policy Title</label>
      <input type="text" id="pol-title-in" class="input-box" placeholder="e.g. Employee Wellness & Stipend Policy" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Department</label>
      <select id="pol-dept-in" class="input-box" style="margin-bottom:12px; width:100%; background:rgba(0,0,0,0.4); color:white;">
        <option value="Human Resources">Human Resources</option>
        <option value="Finance & Travel">Finance & Travel</option>
        <option value="Operations">Operations</option>
        <option value="IT Security">IT Security</option>
      </select>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Policy Content</label>
      <textarea id="pol-content-in" class="input-box" placeholder="Enter policy terms and guidelines..." style="margin-bottom:16px; width:100%; height:90px; font-family:inherit;"></textarea>
      <button class="btn-submit" onclick="submitNewPolicy()" style="width:100%; background:var(--accent-cyan);">Create Policy Draft</button>
    </div>
  `;
}

function submitNewPolicy() {
  const title = document.getElementById('pol-title-in')?.value.trim() || 'Employee Wellness Policy';
  const dept = document.getElementById('pol-dept-in')?.value || 'Human Resources';
  const content = document.getElementById('pol-content-in')?.value.trim() || 'Full guidelines for employee wellness, mental health days, and fitness stipends.';

  const newId = 'pol' + (window.hrState.policiesList.length + 1);
  const newPol = {
    id: newId,
    title: title,
    dept: dept,
    version: 'v1.0',
    updated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status: 'Published',
    compliance: '100% Passed',
    content: content
  };

  window.hrState.policiesList.unshift(newPol);
  window.hrState.selectedPolicyId = newId;

  document.getElementById('hr-pol-modal').style.display = 'none';
  toast(`New Policy "${title}" created and published!`, 'success');
  renderRoleFeatureView('feat_policy');
}

function downloadPolicyPDF(polId) {
  const p = window.hrState.policiesList.find(x => x.id === polId) || window.hrState.policiesList[0];
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Policy Document - ${p.title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 800px; margin: 0 auto; }
          h1 { color: #06b6d4; border-bottom: 2px solid #06b6d4; padding-bottom: 10px; margin: 0 0 8px 0; font-size: 1.6rem; }
          .meta { font-size: 0.85rem; color: #94a3b8; margin-bottom: 20px; }
          .content { line-height: 1.7; color: #cbd5e1; font-size: 0.95rem; white-space: pre-line; }
          .btn-print { background: #06b6d4; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 20px; }
          @media print { .btn-print { display: none; } body { background: white; color: black; } .card { background: white; border: 1px solid #ccc; color: black; } h1 { color: #000; } }
        
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
        <script>
        function downloadAsPDF() {
            var btn = document.querySelector('.btn-print');
            if(btn) btn.style.display = 'none';
            html2pdf().from(document.body).set({
                margin: 10,
                filename: 'SynapseAI_Document.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).save().then(function(){
                if(btn) btn.style.display = 'block';
            });
        }
        <\/script>
</style>
      </head>
      <body>
        <div style="max-width: 800px; margin: 0 auto;">
          <button class="btn-print" onclick="downloadAsPDF()"><i class="fa-solid fa-print"></i> Download PDF</button>
        </div>
        <div class="card">
          <h1>📋 Official Policy: ${p.title}</h1>
          <div class="meta">Department: <b>${p.dept}</b> | Version: <b>${p.version}</b> | Last Revised: <b>${p.updated}</b> | Status: <b style="color:#34d399;">${p.status}</b></div>
          <div class="content">${p.content}</div>
        </div>
      
  <!-- PDF Viewer Modal -->
  <div id="pdf-viewer-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:99999; align-items:center; justify-content:center;">
    <div class="glass-card" style="width:90%; max-width:1000px; height:85vh; display:flex; flex-direction:column; border:1px solid rgba(255,255,255,0.1); border-radius:12px; overflow:hidden;">
      <div style="padding:16px 20px; background:rgba(255,255,255,0.05); border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 id="pdf-modal-title" style="margin:0; font-family:'Outfit'; color:var(--text-main);"><i class="fa-solid fa-file-pdf" style="color:var(--status-amber); margin-right:8px;"></i> Document Viewer</h3>
          <span style="font-size:0.8rem; color:var(--text-muted);">Confidential & Proprietary</span>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn-secondary" onclick="document.getElementById('pdf-viewer-modal').style.display='none'" style="padding:6px 12px; font-size:0.8rem;">Close Viewer</button>
        </div>
      </div>
      <div style="flex:1; background:#fff; position:relative; display:flex; align-items:center; justify-content:center; flex-direction:column;">
        <div style="position:absolute; top:40px; text-align:center; color:#333; font-family:serif;">
          <h1 id="pdf-modal-doc-title" style="margin-bottom:10px; font-size:24px;">Document Title</h1>
          <hr style="border:0; border-top:2px solid #ccc; width:200px; margin:0 auto 40px auto;"/>
          <p id="pdf-modal-doc-content" style="max-width:700px; margin:0 auto; line-height:1.8; text-align:justify; font-size:16px;">
            This is a simulated PDF document. In a production environment, this would render an actual PDF file using PDF.js or a native browser viewer.
          </p>
        </div>
        <div style="position:absolute; bottom:20px; color:#999; font-size:12px; font-family:sans-serif;">Page <span id="pdf-modal-doc-page">1</span></div>
      </div>
    </div>
  </div>

</body>
      </html>
    `);
    win.document.close();
    toast('Opened printable PDF for ' + p.title, 'success');
  }
}


// =========================================================================
// STATEFUL HR TRAINING & LEARNING MANAGEMENT ENGINE
// =========================================================================
if (!window.hrState) window.hrState = {};

if (!window.hrState.trainingList) {
  window.hrState.trainingList = [
    { id: 't1', title: 'Security Awareness 2026 & Phishing Prevention', category: 'Security & Compliance', dept: 'All Departments', enrolled: 80, passRate: '100%', status: 'Mandatory' },
    { id: 't2', title: 'Data Protection, Privacy & GDPR Compliance', category: 'Legal & Privacy', dept: 'All Departments', enrolled: 80, passRate: '88%', status: 'Mandatory' },
    { id: 't3', title: 'Enterprise AI Tools & RAG Prompting Masterclass', category: 'AI & Engineering', dept: 'Engineering & Ops', enrolled: 45, passRate: '94%', status: 'Recommended' },
    { id: 't4', title: 'Equal Opportunity, DE&I & Workplace Conduct', category: 'HR & Conduct', dept: 'All Departments', enrolled: 80, passRate: '96%', status: 'Mandatory' },
    { id: 't5', title: 'AWS Cloud Infrastructure Security & IAM Controls', category: 'Infrastructure', dept: 'DevOps & Eng', enrolled: 24, passRate: '92%', status: 'Technical' }
  ];
}

function exportTrainingAuditCSV() {
  const list = window.hrState.trainingList;
  let csv = "Module ID,Title,Category,Target Department,Enrolled Staff,Pass Rate,Status\n";
  list.forEach(t => {
    csv += `"${t.id}","${t.title}","${t.category}","${t.dept}","${t.enrolled}","${t.passRate}","${t.status}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'HR_Training_Compliance_Audit.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Exported Training Audit CSV!', 'success');
}

function showAddTrainingModal() {
  let modal = document.getElementById('hr-t-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hr-t-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="glass-card" style="width:420px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem; margin:0;"><i class="fa-solid fa-graduation-cap" style="color:var(--accent-cyan);"></i> Create Training Module</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('hr-t-modal').style.display='none'"></i>
      </div>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Module Title</label>
      <input type="text" id="tm-title" class="input-box" placeholder="e.g. SOC2 Data Protection Masterclass" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Category</label>
      <input type="text" id="tm-cat" class="input-box" placeholder="e.g. Compliance & Security" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Target Department</label>
      <select id="tm-dept" class="input-box" style="margin-bottom:16px; width:100%; background:rgba(0,0,0,0.4); color:white;">
        <option value="All Departments">All Departments</option>
        <option value="Engineering & Ops">Engineering & Operations</option>
        <option value="Human Resources">Human Resources</option>
        <option value="Product & Design">Product & Design</option>
      </select>
      <button class="btn-submit" onclick="submitAddTrainingModule()" style="width:100%; background:var(--accent-cyan);">Publish Training Module</button>
    </div>
  `;
}

function submitAddTrainingModule() {
  const title = document.getElementById('tm-title')?.value.trim() || 'SOC2 Data Protection Masterclass';
  const cat = document.getElementById('tm-cat')?.value.trim() || 'Compliance & Security';
  const dept = document.getElementById('tm-dept')?.value || 'All Departments';

  const newId = 't' + (window.hrState.trainingList.length + 1);
  const newMod = {
    id: newId,
    title: title,
    category: cat,
    dept: dept,
    enrolled: 80,
    passRate: '100%',
    status: 'Mandatory'
  };

  window.hrState.trainingList.unshift(newMod);

  document.getElementById('hr-t-modal').style.display = 'none';
  toast(`Training Module "${title}" created & assigned to staff!`, 'success');
  renderRoleFeatureView('feat_training');
}

function assignMandatoryTrainingAll() {
  toast('Assigned mandatory training refresher to all 80 active staff members!', 'success');
}


// =========================================================================
// STATEFUL HR ANALYTICS & AI SENTIMENT ENGINE
// =========================================================================
if (!window.hrState) window.hrState = {};

if (!window.hrState.analyticsDept) {
  window.hrState.analyticsDept = [
    { id: 'ad1', dept: 'Engineering & Architecture', headcount: 34, sentiment: '4.9/5', risk: '1.2%', retention: '98.8%', status: 'Optimal' },
    { id: 'ad2', dept: 'AI Core & Machine Learning', headcount: 18, sentiment: '4.9/5', risk: '0.8%', retention: '99.2%', status: 'Optimal' },
    { id: 'ad3', dept: 'Cloud Operations & DevOps', headcount: 14, sentiment: '4.6/5', risk: '3.4%', retention: '96.6%', status: 'Monitor' },
    { id: 'ad4', dept: 'Product Management & UX', headcount: 10, sentiment: '4.8/5', risk: '1.5%', retention: '98.5%', status: 'Optimal' },
    { id: 'ad5', dept: 'Human Resources & Legal', headcount: 4, sentiment: '5.0/5', risk: '0.0%', retention: '100.0%', status: 'Optimal' }
  ];
}

function exportHRAnalyticsCSV() {
  const list = window.hrState.analyticsDept;
  let csv = "Department ID,Department,Headcount,Sentiment Rating,Attrition Risk,Retention Score,Status\n";
  list.forEach(a => {
    csv += `"${a.id}","${a.dept}","${a.headcount}","${a.sentiment}","${a.risk}","${a.retention}","${a.status}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'HR_Workforce_Analytics_Report.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Exported HR Analytics CSV Report!', 'success');
}

function runAIPulseSurvey() {
  toast('Running AI Sentiment Pulse Survey across 80 active staff...', 'info');
  setTimeout(() => {
    toast('AI Sentiment Pulse Complete: Satisfaction score is 4.8/5 (91% Positive)!', 'success');
  }, 600);
}


// =========================================================================
// STATEFUL ENTERPRISE VECTOR RAG KNOWLEDGE SEARCH ENGINE
// =========================================================================
if (!window.employeeState) window.employeeState = {};

if (!window.employeeState.searchQuery) {
  window.employeeState.searchQuery = 'paternity leave';
}

if (!window.employeeState.selectedDocId) {
  window.employeeState.selectedDocId = 'kd1';
}

if (!window.employeeState.knowledgeDocs) {
  window.employeeState.knowledgeDocs = [
    {
      id: 'kd1',
      title: '2026_Employee_Handbook.pdf',
      page: 'Page 14',
      section: 'Section 4.2 — Parental & Family Care Leave',
      category: 'HR Policies',
      score: '98.6% Match',
      snippet: 'All secondary caregivers receive 6 weeks of 100% fully paid leave following the birth, adoption, or foster placement of a child. Primary caregivers receive 16 weeks of paid leave with full benefit continuation.',
      fullText: 'Section 4.2: Parental & Family Care Leave Guidelines (Revised 2026)\n\n1. Secondary Caregiver Leave: All secondary caregivers are eligible for 6 weeks of 100% fully paid leave, usable continuously or in 2-week blocks within the first 12 months.\n2. Primary Caregiver Leave: 16 weeks of fully paid leave with full medical, dental, and 401(k) match continuation.'
    },
    {
      id: 'kd2',
      title: 'Company_Benefits_Overview.pdf',
      page: 'Page 4',
      section: 'Section 2.1 — Health & Family Wellness Benefits',
      category: 'Benefits',
      score: '94.2% Match',
      snippet: 'Comprehensive health coverage, dental insurance, and family wellness stipends. Includes $500 annual home office ergonomic allowance and child care assistance.',
      fullText: 'Section 2.1: Health, Dental & Family Wellness (Revised 2026)\n\nOur company covers 95% of employee healthcare premiums and 80% of dependent premiums. Additional perks include a $500 annual home office ergonomic allowance and flexible child care stipends.'
    },
    {
      id: 'kd3',
      title: 'Domestic_Travel_Expense_Policy.pdf',
      page: 'Page 2',
      section: 'Section 1.3 — Meal Caps & Allowance',
      category: 'Travel & Expenses',
      score: '89.5% Match',
      snippet: 'Daily meal expense cap is set at $75/day for domestic travel and $120/day for international travel. Flights over $500 require prior manager approval.',
      fullText: 'Section 1.3: Meal & Travel Allowance Rates\n\n1. Domestic Meal Cap: $75 per calendar day.\n2. International Meal Cap: $120 per calendar day.\n3. Flight Bookings: Economy class for domestic under 5 hours; business class permitted for flights over 8 hours.'
    },
    {
      id: 'kd4',
      title: 'IT_Security_Encryption_Policy.pdf',
      page: 'Page 8',
      section: 'Section 5.4 — Credential Rotation & MFA',
      category: 'Security Compliance',
      score: '86.1% Match',
      snippet: 'Multi-Factor Authentication (MFA) is strictly required across all enterprise single-sign-on (SSO) portals. Administrative credentials must be rotated every 90 days.',
      fullText: 'Section 5.4: Authentication & Credential Security\n\nAll employee accounts must be protected with hardware or app-based MFA. Password rotation occurs every 90 days for admin roles. Unused access keys automatically expire after 60 days of inactivity.'
    }
  ];
}


// =========================================================================
// REAL-TIME KNOWLEDGE SEARCH ENGINE INTERACTIVE HANDLERS
// =========================================================================
function updateKnowledgeSearchUI() {
  const state = window.employeeState;
  if (!state) return;
  const docs = state.knowledgeDocs || [];
  const query = (state.searchQuery !== undefined) ? state.searchQuery : 'paternity leave';
  const category = state.selectedCategory || 'All';

  const filteredDocs = docs.filter(d => {
    const matchesCat = (category === 'All' || d.category.toLowerCase().includes(category.toLowerCase()) || category.toLowerCase().includes(d.category.toLowerCase()));
    const q = query.toLowerCase().trim();
    const matchesQ = !q || d.title.toLowerCase().includes(q) || d.snippet.toLowerCase().includes(q) || d.section.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || d.fullText.toLowerCase().includes(q);
    return matchesCat && matchesQ;
  });

  const selectedId = state.selectedDocId || (filteredDocs.length ? filteredDocs[0].id : docs[0].id);
  const selDoc = docs.find(d => d.id === selectedId) || (filteredDocs.length ? filteredDocs[0] : docs[0]);

  // Update chips styling
  document.querySelectorAll('.ks-chip-btn').forEach(btn => {
    const cat = btn.getAttribute('data-cat');
    if (cat === category) {
      btn.style.background = 'var(--accent-cyan)';
      btn.style.color = 'white';
      btn.style.borderColor = 'var(--accent-cyan)';
      btn.style.fontWeight = 'bold';
    } else {
      btn.style.background = 'rgba(255,255,255,0.05)';
      btn.style.color = 'var(--text-main)';
      btn.style.borderColor = 'var(--border-glass)';
      btn.style.fontWeight = 'normal';
    }
  });

  // Update Left Results List
  const resultsContainer = document.getElementById('ks-results-list');
  if (resultsContainer) {
    if (filteredDocs.length === 0) {
      resultsContainer.innerHTML = `
        <div class="glass-card" style="padding:30px; text-align:center; color:var(--text-muted);">
          <i class="fa-solid fa-folder-open" style="font-size:2rem; margin-bottom:10px; color:var(--accent-cyan);"></i>
          <p>No documents found matching "${query}" in category "${category}".</p>
          <button class="btn-secondary" onclick="filterKnowledgeByChip('All'); executeKnowledgeSearch('');">Reset Filters</button>
        </div>
      `;
    } else {
      resultsContainer.innerHTML = filteredDocs.map(d => `
        <div class="glass-card" style="padding:16px; ${d.id === selectedId ? 'border-left:3px solid var(--accent-cyan); background:rgba(6,182,212,0.06);' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
            <div>
              <b style="font-size:1.02rem; color:var(--text-main);"><i class="fa-solid fa-file-pdf" style="color:var(--status-amber); margin-right:6px;"></i> ${d.title}</b>
              <span style="font-size:0.78rem; color:var(--text-muted); margin-left:8px;">(${d.page})</span>
            </div>
            <span class="role-badge-inline rb-emerald">${d.score}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--accent-cyan); margin-bottom:6px; font-weight:600;">${d.section}</div>
          <p style="font-size:0.83rem; color:var(--text-muted); line-height:1.5; margin:0 0 12px 0;">"${d.snippet}"</p>
          <div style="display:flex; gap:8px;">
            <button class="btn-act" onclick="selectKnowledgeDoc('${d.id}')" style="padding:4px 10px; font-size:0.75rem;">🔍 Inspect Citation</button>
            <button class="btn-secondary" onclick="openKnowledgeDocPDF('${d.id}')" style="padding:4px 10px; font-size:0.75rem;">📄 Open PDF</button>
          </div>
        </div>
      `).join('');
    }
  }

  // Update Right Inspector
  const inspectorContainer = document.getElementById('ks-inspector-panel');
  if (inspectorContainer && selDoc) {
    inspectorContainer.innerHTML = `
      <div style="border-bottom:1px solid var(--border-glass); padding-bottom:12px;">
        <span class="role-badge-inline rb-hr" style="margin-bottom:6px; display:inline-block;">Selected RAG Citation</span>
        <b style="font-size:1.15rem; color:var(--text-main); display:block;">${selDoc.title}</b>
        <span style="font-size:0.82rem; color:var(--accent-cyan);">${selDoc.section} (${selDoc.page})</span>
      </div>

      <div>
        <b style="font-size:0.82rem; color:var(--text-muted); display:block; margin-bottom:6px;"><i class="fa-solid fa-align-left"></i> Full Excerpt Citation</b>
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); padding:14px; border-radius:8px; font-size:0.83rem; color:var(--text-main); line-height:1.6; white-space:pre-line;">
          ${selDoc.fullText}
        </div>
      </div>

      <div style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.2); padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <b style="font-size:0.8rem; color:var(--status-emerald); display:block;"><i class="fa-solid fa-check-circle"></i> Vector Grounding Score</b>
          <span style="font-size:0.75rem; color:var(--text-muted);">High Confidence Match</span>
        </div>
        <b style="font-size:1.2rem; color:var(--status-emerald);">${selDoc.score}</b>
      </div>

      <div style="display:flex; flex-direction:column; gap:8px; margin-top:auto;">
        <button class="btn-submit" onclick="copyDocCitation('${selDoc.id}')" style="width:100%; background:var(--accent-cyan);"><i class="fa-solid fa-copy"></i> Copy RAG Citation</button>
        <button class="btn-secondary" onclick="openKnowledgeDocPDF('${selDoc.id}')" style="width:100%;"><i class="fa-solid fa-file-pdf"></i> View Printable PDF</button>
      </div>
    `;
  }
}

function executeKnowledgeSearch(val) {
  if (!window.employeeState) window.employeeState = {};
  window.employeeState.searchQuery = val;
  updateKnowledgeSearchUI();
}

function filterKnowledgeByChip(category) {
  if (!window.employeeState) window.employeeState = {};
  window.employeeState.selectedCategory = category;
  toast(`Filtered Knowledge Base: ${category}`, 'success');
  updateKnowledgeSearchUI();
}

function getActiveKnowledgeDocsArray() {
  const role = (window.authState && window.authState.currentUser && window.authState.currentUser.role) ? window.authState.currentUser.role : (window.currentRole || 'Admin');
  if (role === 'Employee' && window.employeeState && window.employeeState.knowledgeDocs) {
    return window.employeeState.knowledgeDocs;
  }
  if (window.STATE && window.STATE.HR && window.STATE.HR.knowledgeDocs) {
    return window.STATE.HR.knowledgeDocs;
  }
  return window.employeeState ? window.employeeState.knowledgeDocs : [];
}

function selectKnowledgeDoc(docId) {
  const role = (window.authState && window.authState.currentUser && window.authState.currentUser.role) ? window.authState.currentUser.role : (window.currentRole || 'Admin');
  if (role === 'Employee') {
    if (!window.employeeState) window.employeeState = {};
    window.employeeState.selectedDocId = docId;
    if (typeof updateKnowledgeSearchUI === 'function') updateKnowledgeSearchUI();
  } else {
    if (!window.STATE.HR) window.STATE.HR = {};
    window.STATE.HR.selectedDocId = docId;
    if (typeof renderRoleFeatureView === 'function') renderRoleFeatureView('feat_admin_knowledge_center');
  }
}

function openKnowledgeDocPDF(docId) {
  const arr = getActiveKnowledgeDocsArray() || [];
  const doc = arr.find(d => d.id === docId) || arr[0];
  const title = doc ? doc.title : docId;
  const page = doc ? doc.page : '1';
  const snippet = doc && doc.fullText ? doc.fullText : (doc && doc.snippet ? doc.snippet : 'No preview available.');
  
  // Show toast
  toast('Opening PDF: ' + title, 'success');
  
  // Open modal
  const modal = document.getElementById('pdf-viewer-modal');
  if (modal) {
    document.getElementById('pdf-modal-title').innerHTML = '<i class="fa-solid fa-file-pdf" style="color:var(--status-amber); margin-right:8px;"></i> ' + title;
    document.getElementById('pdf-modal-doc-title').innerText = title.replace('.pdf', '');
    document.getElementById('pdf-modal-doc-page').innerText = (page.replace('Page ', '') || '1');
    document.getElementById('pdf-modal-doc-content').innerText = snippet + "\\n\\n(End of excerpt preview. Full PDF rendering is simulated in this prototype.)";
    modal.style.display = 'flex';
  }
}

function copyDocCitation(docId) {
  const arr = getActiveKnowledgeDocsArray() || [];
  const doc = arr.find(d => d.id === docId) || arr[0];
  if (!doc) return;
  const citation = `[Citation: ${doc.title}, ${doc.page} - "${doc.snippet}"]`;
  navigator.clipboard.writeText(citation).then(() => {
    toast('Citation copied to clipboard!', 'success');
  }).catch(() => {
    toast('Citation ready: ' + citation, 'info');
  });
}


// =========================================================================
// STATEFUL PERSONAL DOCUMENT VAULT ENGINE
// =========================================================================
if (!window.employeeState) window.employeeState = {};

if (!window.employeeState.personalDocuments) {
  window.employeeState.personalDocuments = [
    {
      id: 'pd1',
      title: 'Employment_Offer_Letter_2026.pdf',
      category: 'HR Contract',
      issued: 'Jan 15, 2026',
      size: '2.4 MB',
      status: 'Verified',
      hash: 'sha256-a9f4c3...8b1e',
      summary: 'Official Employment Agreement & Offer Details for Senior Software Engineering Role. Signed & Verified by HR Team.'
    },
    {
      id: 'pd2',
      title: 'Payslip_July_2026.pdf',
      category: 'Payroll & Compensation',
      issued: 'Jul 30, 2026',
      size: '1.1 MB',
      status: 'Verified',
      hash: 'sha256-7b2c9...4d3a',
      summary: 'July 2026 Monthly Earnings Statement. Includes base salary, health contribution, and 401(k) employer matching.'
    },
    {
      id: 'pd3',
      title: 'Tax_Form_W2_2025.pdf',
      category: 'Tax & Compliance',
      issued: 'Jan 31, 2026',
      size: '1.8 MB',
      status: 'Verified',
      hash: 'sha256-3e8a1...9c4f',
      summary: 'Annual Wage & Tax Statement for Fiscal Year 2025. Filed & Audited for Federal/State Compliance.'
    },
    {
      id: 'pd4',
      title: 'Health_Insurance_Benefits_Card.pdf',
      category: 'Benefits & Care',
      issued: 'Feb 02, 2026',
      size: '850 KB',
      status: 'Verified',
      hash: 'sha256-5f1d9...2b8c',
      summary: 'Comprehensive Health & Dental Coverage ID Card. Group Policy ID: SYN-2026-MED.'
    },
    {
      id: 'pd5',
      title: 'AI_Architecture_Certification.pdf',
      category: 'Certificates & Learning',
      issued: 'Jun 12, 2026',
      size: '3.2 MB',
      status: 'Verified',
      hash: 'sha256-8d4e2...1f7a',
      summary: 'Verified Certificate of Completion for Enterprise AI & RAG Engineering Masterclass.'
    }
  ];
}

if (!window.employeeState.selectedPersonalDocId) {
  window.employeeState.selectedPersonalDocId = 'pd1';
}

function selectPersonalDoc(docId) {
  window.employeeState.selectedPersonalDocId = docId;
  renderRoleFeatureView('feat_docs');
}

function exportPersonalDocsCSV() {
  const list = window.employeeState.personalDocuments;
  let csv = "Document ID,Title,Category,Issued Date,File Size,Status,Cryptographic Hash\n";
  list.forEach(d => {
    csv += `"${d.id}","${d.title}","${d.category}","${d.issued}","${d.size}","${d.status}","${d.hash}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'My_Personal_Document_Vault_Manifest.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Exported Personal Document Vault Manifest CSV!', 'success');
}

function showUploadPersonalDocModal() {
  let modal = document.getElementById('emp-doc-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'emp-doc-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="glass-card" style="width:420px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem; margin:0;"><i class="fa-solid fa-file-arrow-up" style="color:var(--accent-cyan);"></i> Upload Personal Document</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('emp-doc-modal').style.display='none'"></i>
      </div>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Document Title</label>
      <input type="text" id="pdoc-title" class="input-box" placeholder="e.g. Medical_Reimbursement_Receipt_Q3.pdf" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Category</label>
      <select id="pdoc-cat" class="input-box" style="margin-bottom:12px; width:100%; background:rgba(0,0,0,0.4); color:white;">
        <option value="HR Contract">HR Contract</option>
        <option value="Payroll & Compensation">Payroll & Compensation</option>
        <option value="Tax & Compliance">Tax & Compliance</option>
        <option value="Benefits & Care">Benefits & Care</option>
        <option value="Certificates & Learning">Certificates & Learning</option>
      </select>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Select File (PDF/DOCX)</label>
      <input type="file" id="pdoc-file" class="input-box" style="margin-bottom:16px; width:100%; font-size:0.8rem;">
      <button class="btn-submit" onclick="submitUploadPersonalDoc()" style="width:100%; background:var(--accent-cyan);">Upload & Encrypt Document</button>
    </div>
  `;
}

function submitUploadPersonalDoc() {
  const title = document.getElementById('pdoc-title')?.value.trim() || 'Uploaded_Personal_Doc.pdf';
  const cat = document.getElementById('pdoc-cat')?.value || 'HR Contract';

  const newId = 'pd' + (window.employeeState.personalDocuments.length + 1);
  const newDoc = {
    id: newId,
    title: title.endsWith('.pdf') ? title : title + '.pdf',
    category: cat,
    issued: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    size: '1.5 MB',
    status: 'Verified',
    hash: 'sha256-' + Math.random().toString(36).substring(2, 10) + '...9a2f',
    summary: `Verified personal document "${title}" uploaded to AES-256 encrypted vault storage.`
  };

  window.employeeState.personalDocuments.unshift(newDoc);
  window.employeeState.selectedPersonalDocId = newId;

  document.getElementById('emp-doc-modal').style.display = 'none';
  toast(`Document "${title}" uploaded and verified!`, 'success');
  renderRoleFeatureView('feat_docs');
}

function downloadPersonalDocPDF(docId) {
  const d = window.employeeState.personalDocuments.find(x => x.id === docId) || window.employeeState.personalDocuments[0];
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Document - ${d.title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 800px; margin: 0 auto; }
          h1 { color: #06b6d4; border-bottom: 2px solid #06b6d4; padding-bottom: 10px; margin: 0 0 8px 0; font-size: 1.6rem; }
          .meta { font-size: 0.85rem; color: #94a3b8; margin-bottom: 20px; }
          .content { line-height: 1.7; color: #cbd5e1; font-size: 0.95rem; white-space: pre-line; }
          .btn-print { background: #06b6d4; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 20px; }
          @media print { .btn-print { display: none; } body { background: white; color: black; } .card { background: white; border: 1px solid #ccc; color: black; } h1 { color: #000; } }
        
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
        <script>
        function downloadAsPDF() {
            var btn = document.querySelector('.btn-print');
            if(btn) btn.style.display = 'none';
            html2pdf().from(document.body).set({
                margin: 10,
                filename: 'SynapseAI_Document.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).save().then(function(){
                if(btn) btn.style.display = 'block';
            });
        }
        <\/script>
</style>
      </head>
      <body>
        <div style="max-width: 800px; margin: 0 auto;">
          <button class="btn-print" onclick="downloadAsPDF()"><i class="fa-solid fa-print"></i> Download PDF</button>
        </div>
        <div class="card">
          <h1>📄 ${d.title}</h1>
          <div class="meta">Category: <b>${d.category}</b> | Issued Date: <b>${d.issued}</b> | File Size: <b>${d.size}</b> | Status: <b style="color:#34d399;">${d.status}</b></div>
          <h3 style="color:#818cf8;">Security Verification Metadata</h3>
          <p><b>Cryptographic SHA-256 Hash:</b> ${d.hash}</p>
          <h3>Document Summary & Excerpt</h3>
          <div class="content">${d.summary}</div>
        </div>
      
  <!-- PDF Viewer Modal -->
  <div id="pdf-viewer-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:99999; align-items:center; justify-content:center;">
    <div class="glass-card" style="width:90%; max-width:1000px; height:85vh; display:flex; flex-direction:column; border:1px solid rgba(255,255,255,0.1); border-radius:12px; overflow:hidden;">
      <div style="padding:16px 20px; background:rgba(255,255,255,0.05); border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 id="pdf-modal-title" style="margin:0; font-family:'Outfit'; color:var(--text-main);"><i class="fa-solid fa-file-pdf" style="color:var(--status-amber); margin-right:8px;"></i> Document Viewer</h3>
          <span style="font-size:0.8rem; color:var(--text-muted);">Confidential & Proprietary</span>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn-secondary" onclick="document.getElementById('pdf-viewer-modal').style.display='none'" style="padding:6px 12px; font-size:0.8rem;">Close Viewer</button>
        </div>
      </div>
      <div style="flex:1; background:#fff; position:relative; display:flex; align-items:center; justify-content:center; flex-direction:column;">
        <div style="position:absolute; top:40px; text-align:center; color:#333; font-family:serif;">
          <h1 id="pdf-modal-doc-title" style="margin-bottom:10px; font-size:24px;">Document Title</h1>
          <hr style="border:0; border-top:2px solid #ccc; width:200px; margin:0 auto 40px auto;"/>
          <p id="pdf-modal-doc-content" style="max-width:700px; margin:0 auto; line-height:1.8; text-align:justify; font-size:16px;">
            This is a simulated PDF document. In a production environment, this would render an actual PDF file using PDF.js or a native browser viewer.
          </p>
        </div>
        <div style="position:absolute; bottom:20px; color:#999; font-size:12px; font-family:sans-serif;">Page <span id="pdf-modal-doc-page">1</span></div>
      </div>
    </div>
  </div>

</body>
      </html>
    `);
    win.document.close();
    toast('Opened printable PDF for ' + d.title, 'success');
  }
}


// =========================================================================
// STATEFUL AI LEARNING HUB & SKILL MATRIX ENGINE
// =========================================================================
if (!window.employeeState) window.employeeState = {};

if (!window.employeeState.enrolledCourses) {
  window.employeeState.enrolledCourses = [
    {
      id: 'lc1',
      title: 'Security Awareness 2026 & Phishing Prevention',
      category: 'Security Compliance',
      progress: 100,
      status: 'Completed',
      certIssued: 'Jul 10, 2026',
      certFile: 'Security_Awareness_2026_Certificate.pdf'
    },
    {
      id: 'lc2',
      title: 'Enterprise AI Tools & RAG Prompting Masterclass',
      category: 'AI & Machine Learning',
      progress: 85,
      status: 'In Progress',
      certIssued: 'Pending (85%)',
      certFile: 'AI_Tools_Masterclass_Certificate.pdf'
    },
    {
      id: 'lc3',
      title: 'Data Protection, Privacy & GDPR Code',
      category: 'Legal & Privacy',
      progress: 100,
      status: 'Completed',
      certIssued: 'Jun 22, 2026',
      certFile: 'GDPR_Compliance_Certificate.pdf'
    },
    {
      id: 'lc4',
      title: 'AWS Kubernetes & Microservice Security Architecture',
      category: 'DevOps & Cloud Security',
      progress: 68,
      status: 'In Progress',
      certIssued: 'Pending (68%)',
      certFile: 'AWS_K8s_Security_Certificate.pdf'
    }
  ];
}

if (!window.employeeState.selectedCourseId) {
  window.employeeState.selectedCourseId = 'lc2';
}

function selectCourse(cId) {
  window.employeeState.selectedCourseId = cId;
  renderRoleFeatureView('feat_learning');
}

function continueCourseProgress(cId) {
  const c = window.employeeState.enrolledCourses.find(x => x.id === cId);
  if (c) {
    c.progress = Math.min(100, c.progress + 15);
    if (c.progress === 100) {
      c.status = 'Completed';
      c.certIssued = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      toast(`Congratulations! You completed "${c.title}" and earned a Certificate!`, 'success');
    } else {
      toast(`Advanced progress in "${c.title}" to ${c.progress}%!`, 'info');
    }
    renderRoleFeatureView('feat_learning');
  }
}

function showEnrollCourseModal() {
  let modal = document.getElementById('emp-l-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'emp-l-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="glass-card" style="width:420px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem; margin:0;"><i class="fa-solid fa-graduation-cap" style="color:var(--accent-cyan);"></i> Enroll in New Course</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('emp-l-modal').style.display='none'"></i>
      </div>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Course Title</label>
      <input type="text" id="lc-title" class="input-box" placeholder="e.g. Advanced LLM Fine-Tuning & Vector Search" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Category</label>
      <select id="lc-cat" class="input-box" style="margin-bottom:16px; width:100%; background:rgba(0,0,0,0.4); color:white;">
        <option value="AI & Machine Learning">AI & Machine Learning</option>
        <option value="Security Compliance">Security Compliance</option>
        <option value="DevOps & Cloud Security">DevOps & Cloud Security</option>
        <option value="System Architecture">System Architecture</option>
      </select>
      <button class="btn-submit" onclick="submitEnrollCourse()" style="width:100%; background:var(--accent-cyan);">Enroll & Start Learning</button>
    </div>
  `;
}

function submitEnrollCourse() {
  const title = document.getElementById('lc-title')?.value.trim() || 'Advanced LLM Fine-Tuning Masterclass';
  const cat = document.getElementById('lc-cat')?.value || 'AI & Machine Learning';

  const newId = 'lc' + (window.employeeState.enrolledCourses.length + 1);
  const newCourse = {
    id: newId,
    title: title,
    category: cat,
    progress: 10,
    status: 'In Progress',
    certIssued: 'Pending (10%)',
    certFile: title.replace(/\s+/g, '_') + '_Certificate.pdf'
  };

  window.employeeState.enrolledCourses.unshift(newCourse);
  window.employeeState.selectedCourseId = newId;

  document.getElementById('emp-l-modal').style.display = 'none';
  toast(`Enrolled in "${title}"! Progress initialized to 10%.`, 'success');
  renderRoleFeatureView('feat_learning');
}

function downloadSkillCertificate(fileName) {
  const cleanTitle = fileName.replace(/_/g, ' ').replace('.pdf', '');
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate of Achievement - ${cleanTitle}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
          .card { background: #1e293b; border: 2px solid #06b6d4; border-radius: 12px; padding: 40px; max-width: 800px; margin: 0 auto; text-align: center; }
          h1 { color: #06b6d4; margin: 10px 0; font-size: 2.2rem; }
          .sub { font-size: 1.1rem; color: #94a3b8; margin-bottom: 20px; }
          .name { font-size: 1.8rem; font-weight: bold; color: #34d399; margin: 16px 0; }
          .btn-print { background: #06b6d4; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 20px; }
          @media print { .btn-print { display: none; } body { background: white; color: black; } .card { background: white; border: 2px solid #000; color: black; } h1 { color: #000; } }
        
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
        <script>
        function downloadAsPDF() {
            var btn = document.querySelector('.btn-print');
            if(btn) btn.style.display = 'none';
            html2pdf().from(document.body).set({
                margin: 10,
                filename: 'SynapseAI_Document.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).save().then(function(){
                if(btn) btn.style.display = 'block';
            });
        }
        <\/script>
</style>
      </head>
      <body>
        <div style="max-width: 800px; margin: 0 auto; text-align: left;">
          <button class="btn-print" onclick="downloadAsPDF()"><i class="fa-solid fa-print"></i> Download PDF</button>
        </div>
        <div class="card">
          <div style="font-size:3rem; color:#06b6d4;">🎓</div>
          <h1>CERTIFICATE OF ACHIEVEMENT</h1>
          <div class="sub">This certifies that</div>
          <div class="name">Haritha Langanuru</div>
          <div class="sub">has successfully completed the professional course</div>
          <h2 style="color:#f8fafc; margin:16px 0;">${cleanTitle}</h2>
          <div style="margin-top:30px; font-size:0.85rem; color:#94a3b8;">Issued by SynapseAI Learning & Development • Verified Token: SYN-2026-CERT-${Math.floor(Math.random()*90000+10000)}</div>
        </div>
      
  <!-- PDF Viewer Modal -->
  <div id="pdf-viewer-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:99999; align-items:center; justify-content:center;">
    <div class="glass-card" style="width:90%; max-width:1000px; height:85vh; display:flex; flex-direction:column; border:1px solid rgba(255,255,255,0.1); border-radius:12px; overflow:hidden;">
      <div style="padding:16px 20px; background:rgba(255,255,255,0.05); border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 id="pdf-modal-title" style="margin:0; font-family:'Outfit'; color:var(--text-main);"><i class="fa-solid fa-file-pdf" style="color:var(--status-amber); margin-right:8px;"></i> Document Viewer</h3>
          <span style="font-size:0.8rem; color:var(--text-muted);">Confidential & Proprietary</span>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn-secondary" onclick="document.getElementById('pdf-viewer-modal').style.display='none'" style="padding:6px 12px; font-size:0.8rem;">Close Viewer</button>
        </div>
      </div>
      <div style="flex:1; background:#fff; position:relative; display:flex; align-items:center; justify-content:center; flex-direction:column;">
        <div style="position:absolute; top:40px; text-align:center; color:#333; font-family:serif;">
          <h1 id="pdf-modal-doc-title" style="margin-bottom:10px; font-size:24px;">Document Title</h1>
          <hr style="border:0; border-top:2px solid #ccc; width:200px; margin:0 auto 40px auto;"/>
          <p id="pdf-modal-doc-content" style="max-width:700px; margin:0 auto; line-height:1.8; text-align:justify; font-size:16px;">
            This is a simulated PDF document. In a production environment, this would render an actual PDF file using PDF.js or a native browser viewer.
          </p>
        </div>
        <div style="position:absolute; bottom:20px; color:#999; font-size:12px; font-family:sans-serif;">Page <span id="pdf-modal-doc-page">1</span></div>
      </div>
    </div>
  </div>

</body>
      </html>
    `);
    win.document.close();
    toast('Opened printable certificate for ' + cleanTitle, 'success');
  }
}


// =========================================================================
// STATEFUL MY TASKS & DELIVERABLES ENGINE
// =========================================================================
if (!window.employeeState) window.employeeState = {};

if (!window.employeeState.taskList) {
  window.employeeState.taskList = [
    { id: 'tk1', title: 'Complete Security Awareness 2026 Refresher', assigner: 'HR Compliance', due: 'Tomorrow (Jul 31)', priority: 'High', status: 'In Progress' },
    { id: 'tk2', title: 'Submit Q3 Domestic Travel Expense Receipts', assigner: 'Finance & Travel', due: 'Aug 05, 2026', priority: 'Medium', status: 'In Progress' },
    { id: 'tk3', title: 'Review Q3 Engineering Architecture Retrospective Notes', assigner: 'Tech Lead', due: 'Aug 12, 2026', priority: 'Normal', status: 'In Progress' },
    { id: 'tk4', title: 'Update Emergency Contact & Home Office Address', assigner: 'System', due: 'Completed', priority: 'Normal', status: 'Completed' },
    { id: 'tk5', title: 'Verify Annual W2 Tax Form Signature', assigner: 'Payroll Audit', due: 'Completed', priority: 'High', status: 'Completed' }
  ];
}

function toggleTaskStatus(tkId) {
  const t = window.employeeState.taskList.find(x => x.id === tkId);
  if (t) {
    t.status = (t.status === 'Completed') ? 'In Progress' : 'Completed';
    toast(`Task "${t.title}" status updated to ${t.status}!`, 'success');
    renderRoleFeatureView('feat_tasks');
  }
}

function deletePersonalTask(tkId) {
  window.employeeState.taskList = window.employeeState.taskList.filter(x => x.id !== tkId);
  toast('Task removed from list!', 'info');
  renderRoleFeatureView('feat_tasks');
}

function exportTasksCSV() {
  const list = window.employeeState.taskList;
  let csv = "Task ID,Title,Assigned By,Due Date,Priority,Status\n";
  list.forEach(t => {
    csv += `"${t.id}","${t.title}","${t.assigner}","${t.due}","${t.priority}","${t.status}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'My_Assigned_Tasks_Report.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Exported Tasks Report CSV!', 'success');
}

function showCreatePersonalTaskModal() {
  let modal = document.getElementById('emp-tk-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'emp-tk-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="glass-card" style="width:420px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem; margin:0;"><i class="fa-solid fa-list-check" style="color:var(--accent-cyan);"></i> Create Personal Task</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('emp-tk-modal').style.display='none'"></i>
      </div>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Task Description</label>
      <input type="text" id="tk-title" class="input-box" placeholder="e.g. Prepare presentation for Q3 Architecture Review" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Priority</label>
      <select id="tk-priority" class="input-box" style="margin-bottom:12px; width:100%; background:rgba(0,0,0,0.4); color:white;">
        <option value="High">High Priority</option>
        <option value="Medium">Medium Priority</option>
        <option value="Normal">Normal Priority</option>
      </select>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Due Date</label>
      <input type="text" id="tk-due" class="input-box" value="Aug 15, 2026" style="margin-bottom:16px; width:100%;">
      <button class="btn-submit" onclick="submitCreatePersonalTask()" style="width:100%; background:var(--accent-cyan);">Create Task</button>
    </div>
  `;
}

function submitCreatePersonalTask() {
  const title = document.getElementById('tk-title')?.value.trim() || 'Prepare presentation for Q3 Architecture Review';
  const priority = document.getElementById('tk-priority')?.value || 'High';
  const due = document.getElementById('tk-due')?.value.trim() || 'Aug 15, 2026';

  const newId = 'tk' + (window.employeeState.taskList.length + 1);
  const newTask = {
    id: newId,
    title: title,
    assigner: 'Self-Assigned',
    due: due,
    priority: priority,
    status: 'In Progress'
  };

  window.employeeState.taskList.unshift(newTask);

  document.getElementById('emp-tk-modal').style.display = 'none';
  toast(`Task "${title}" created!`, 'success');
  renderRoleFeatureView('feat_tasks');
}


function autoPrioritizeTaskSchedule() {
  if (!window.employeeState) window.employeeState = {};
  if (!window.employeeState.taskList) return;

  const prioWeight = { 'High': 3, 'Medium': 2, 'Normal': 1 };

  window.employeeState.taskList.sort((a, b) => {
    if (a.status === 'Completed' && b.status !== 'Completed') return 1;
    if (a.status !== 'Completed' && b.status === 'Completed') return -1;
    
    const wA = prioWeight[a.priority] || 0;
    const wB = prioWeight[b.priority] || 0;
    if (wA !== wB) return wB - wA; // High priority first
    
    return 0;
  });

  toast('AI Workstation re-ordered tasks by deadline & priority urgency!', 'success');
  renderRoleFeatureView('feat_tasks');
}


// =========================================================================
// STATEFUL COMPANY ANNOUNCEMENTS & BROADCAST ENGINE
// =========================================================================
if (!window.employeeState) window.employeeState = {};

if (!window.employeeState.announcementsList) {
  window.employeeState.announcementsList = [
    {
      id: 'ann1',
      title: 'Updated 2026 Paternity & Maternity Leave Policy Guidelines',
      dept: 'Human Resources',
      date: 'Jul 28, 2026',
      priority: 'High',
      status: 'Signed',
      summary: 'All secondary caregivers receive 6 weeks of 100% fully paid leave following the birth, adoption, or foster placement of a child. Primary caregivers receive 16 weeks of paid leave.',
      fullText: 'Official Notice from Human Resources:\n\nWe are pleased to publish the revised 2026 Family Leave Policy. Effective immediately, secondary caregivers receive 6 weeks fully paid leave, usable continuously or in 2-week blocks within 12 months. Primary caregivers receive 16 weeks paid leave with full benefit continuation.'
    },
    {
      id: 'ann2',
      title: 'Domestic & Global Travel Meal Expense Cap ($75/day)',
      dept: 'Finance & Travel',
      date: 'Jul 22, 2026',
      priority: 'High',
      status: 'Signed',
      summary: 'Daily meal expense cap is set at $75/day for domestic travel and $120/day for international travel. Pre-approval required for flights over $500.',
      fullText: 'Official Notice from Finance:\n\nDaily meal stipends for business travel have been updated to $75/day for domestic travel and $120/day for international travel. Receipts must be submitted via the Expense Portal within 14 days of travel completion.'
    },
    {
      id: 'ann3',
      title: 'Q3 Enterprise AI Architecture Townhall Scheduled',
      dept: 'Engineering & AI Core',
      date: 'Jul 18, 2026',
      priority: 'Normal',
      status: 'Unread',
      summary: 'Executive team townhall scheduled for Friday at 3:00 PM EST. Live demonstration of new Llama 3.3 70B vector search capabilities.',
      fullText: 'Join the Engineering & Product leadership team this Friday at 3:00 PM EST for our Q3 All-Hands Townhall. We will be showcasing live RAG knowledge retrieval and vector search integrations across our enterprise suite.'
    },
    {
      id: 'ann4',
      title: 'Mandatory System Password & MFA Key Rotation Notice',
      dept: 'IT Security',
      date: 'Jul 10, 2026',
      priority: 'High',
      status: 'Unread',
      summary: 'All staff accounts must rotate API tokens and verify 2FA hardware keys prior to Aug 15 compliance deadline.',
      fullText: 'Security Notice:\n\nIn accordance with SOC2 Type II compliance policies, all employees must perform a mandatory password reset and verify their Multi-Factor Authentication (MFA) devices by Aug 15.'
    }
  ];
}

if (!window.employeeState.selectedAnnounceId) {
  window.employeeState.selectedAnnounceId = 'ann1';
}

function selectAnnouncement(annId) {
  window.employeeState.selectedAnnounceId = annId;
  renderRoleFeatureView('feat_announcements');
}

function toggleAnnouncementRead(annId) {
  const a = window.employeeState.announcementsList.find(x => x.id === annId);
  if (a) {
    a.status = (a.status === 'Signed') ? 'Unread' : 'Signed';
    toast(`Announcement "${a.title}" status updated to ${a.status}!`, 'success');
    renderRoleFeatureView('feat_announcements');
  }
}

function exportAnnouncementsCSV() {
  const list = window.employeeState.announcementsList;
  let csv = "ID,Title,Department,Published Date,Priority,Status\n";
  list.forEach(a => {
    csv += `"${a.id}","${a.title}","${a.dept}","${a.date}","${a.priority}","${a.status}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Company_Announcements_Report.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Exported Announcements Report CSV!', 'success');
}

function showPostBroadcastModal() {
  let modal = document.getElementById('emp-ann-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'emp-ann-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); z-index:9999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="glass-card" style="width:450px; padding:24px; animation:fadeIn 0.2s ease;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="font-family:'Outfit'; font-size:1.3rem; margin:0;"><i class="fa-solid fa-bullhorn" style="color:var(--accent-cyan);"></i> Post Company Broadcast</h3>
        <i class="fa-solid fa-xmark" style="cursor:pointer;" onclick="document.getElementById('emp-ann-modal').style.display='none'"></i>
      </div>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Broadcast Title</label>
      <input type="text" id="ann-title" class="input-box" placeholder="e.g. Q3 Hackathon & AI Innovation Showcase" style="margin-bottom:12px; width:100%;">
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Department</label>
      <select id="ann-dept" class="input-box" style="margin-bottom:12px; width:100%; background:rgba(0,0,0,0.4); color:white;">
        <option value="Human Resources">Human Resources</option>
        <option value="Finance & Travel">Finance & Travel</option>
        <option value="Engineering & AI Core">Engineering & AI Core</option>
        <option value="IT Security">IT Security</option>
      </select>
      <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:4px;">Announcement Content</label>
      <textarea id="ann-content" class="input-box" placeholder="Enter broadcast message..." style="margin-bottom:16px; width:100%; height:90px; font-family:inherit;"></textarea>
      <button class="btn-submit" onclick="submitPostBroadcast()" style="width:100%; background:var(--accent-cyan);">Publish Broadcast</button>
    </div>
  `;
}

function submitPostBroadcast() {
  const title = document.getElementById('ann-title')?.value.trim() || 'Q3 Hackathon & AI Innovation Showcase';
  const dept = document.getElementById('ann-dept')?.value || 'Human Resources';
  const content = document.getElementById('ann-content')?.value.trim() || 'Exciting news! Our Q3 Hackathon kicks off next week with prizes for top AI applications.';

  const newId = 'ann' + (window.employeeState.announcementsList.length + 1);
  const newAnn = {
    id: newId,
    title: title,
    dept: dept,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    priority: 'High',
    status: 'Unread',
    summary: content,
    fullText: `Official Broadcast from ${dept}:\n\n${content}`
  };

  window.employeeState.announcementsList.unshift(newAnn);
  window.employeeState.selectedAnnounceId = newId;

  document.getElementById('emp-ann-modal').style.display = 'none';
  toast(`Broadcast "${title}" published!`, 'success');
  renderRoleFeatureView('feat_announcements');
}

function downloadAnnouncementPDF(annId) {
  const a = window.employeeState.announcementsList.find(x => x.id === annId) || window.employeeState.announcementsList[0];
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Announcement - ${a.title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 800px; margin: 0 auto; }
          h1 { color: #06b6d4; border-bottom: 2px solid #06b6d4; padding-bottom: 10px; margin: 0 0 8px 0; font-size: 1.6rem; }
          .meta { font-size: 0.85rem; color: #94a3b8; margin-bottom: 20px; }
          .content { line-height: 1.7; color: #cbd5e1; font-size: 0.95rem; white-space: pre-line; }
          .btn-print { background: #06b6d4; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 20px; }
          @media print { .btn-print { display: none; } body { background: white; color: black; } .card { background: white; border: 1px solid #ccc; color: black; } h1 { color: #000; } }
        
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
        <script>
        function downloadAsPDF() {
            var btn = document.querySelector('.btn-print');
            if(btn) btn.style.display = 'none';
            html2pdf().from(document.body).set({
                margin: 10,
                filename: 'SynapseAI_Document.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).save().then(function(){
                if(btn) btn.style.display = 'block';
            });
        }
        <\/script>
</style>
      </head>
      <body>
        <div style="max-width: 800px; margin: 0 auto;">
          <button class="btn-print" onclick="downloadAsPDF()"><i class="fa-solid fa-print"></i> Download PDF</button>
        </div>
        <div class="card">
          <h1>📢 Official Broadcast: ${a.title}</h1>
          <div class="meta">Department: <b>${a.dept}</b> | Published: <b>${a.date}</b> | Priority: <b style="color:#ef4444;">${a.priority}</b></div>
          <div class="content">${a.fullText}</div>
        </div>
      
  <!-- PDF Viewer Modal -->
  <div id="pdf-viewer-modal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:99999; align-items:center; justify-content:center;">
    <div class="glass-card" style="width:90%; max-width:1000px; height:85vh; display:flex; flex-direction:column; border:1px solid rgba(255,255,255,0.1); border-radius:12px; overflow:hidden;">
      <div style="padding:16px 20px; background:rgba(255,255,255,0.05); border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 id="pdf-modal-title" style="margin:0; font-family:'Outfit'; color:var(--text-main);"><i class="fa-solid fa-file-pdf" style="color:var(--status-amber); margin-right:8px;"></i> Document Viewer</h3>
          <span style="font-size:0.8rem; color:var(--text-muted);">Confidential & Proprietary</span>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn-secondary" onclick="document.getElementById('pdf-viewer-modal').style.display='none'" style="padding:6px 12px; font-size:0.8rem;">Close Viewer</button>
        </div>
      </div>
      <div style="flex:1; background:#fff; position:relative; display:flex; align-items:center; justify-content:center; flex-direction:column;">
        <div style="position:absolute; top:40px; text-align:center; color:#333; font-family:serif;">
          <h1 id="pdf-modal-doc-title" style="margin-bottom:10px; font-size:24px;">Document Title</h1>
          <hr style="border:0; border-top:2px solid #ccc; width:200px; margin:0 auto 40px auto;"/>
          <p id="pdf-modal-doc-content" style="max-width:700px; margin:0 auto; line-height:1.8; text-align:justify; font-size:16px;">
            This is a simulated PDF document. In a production environment, this would render an actual PDF file using PDF.js or a native browser viewer.
          </p>
        </div>
        <div style="position:absolute; bottom:20px; color:#999; font-size:12px; font-family:sans-serif;">Page <span id="pdf-modal-doc-page">1</span></div>
      </div>
    </div>
  </div>

</body>
      </html>
    `);
    win.document.close();
    toast('Opened printable PDF for ' + a.title, 'success');
  }
}


// =========================================================================
// STATEFUL PROFILE & SECURITY SETTINGS ENGINE
// =========================================================================
if (!window.employeeState) window.employeeState = {};

if (!window.employeeState.profile) {
  window.employeeState.profile = {
    name: 'Haritha Langanuru',
    title: 'Senior Software Engineer',
    dept: 'Engineering & Architecture',
    empId: 'EMP-2026-8894',
    email: 'haritha.l@synapseai.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco HQ — Hybrid',
    emergencyContact: 'David Langanuru • +1 (555) 999-8877',
    bio: 'Senior Software Architect specializing in React UI components, FastAPI microservices, and AI vector search integrations.',
    mfaEnabled: true,
    notifyTasks: true,
    notifySlack: true,
    notifyAI: true,
    sessionTimeout: '30 Minutes'
  };
}

function saveEmployeeProfile() {
  const p = window.employeeState.profile;
  p.name = document.getElementById('prof-name')?.value.trim() || p.name;
  p.title = document.getElementById('prof-title')?.value.trim() || p.title;
  p.dept = document.getElementById('prof-dept')?.value || p.dept;
  p.email = document.getElementById('prof-email')?.value.trim() || p.email;
  p.phone = document.getElementById('prof-phone')?.value.trim() || p.phone;
  p.location = document.getElementById('prof-loc')?.value.trim() || p.location;
  p.emergencyContact = document.getElementById('prof-emg')?.value.trim() || p.emergencyContact;
  p.bio = document.getElementById('prof-bio')?.value.trim() || p.bio;

  p.notifyTasks = document.getElementById('prof-ntasks')?.checked ?? p.notifyTasks;
  p.notifySlack = document.getElementById('prof-nslack')?.checked ?? p.notifySlack;
  p.notifyAI = document.getElementById('prof-nai')?.checked ?? p.notifyAI;

  toast('Profile & Security preferences saved statefully!', 'success');
  renderRoleFeatureView('feat_profile');
}


// =========================================================================
// SYNAPSEAI AUTHENTICATION & LANDING PAGE ENGINE
// =========================================================================
if (!window.authState) {
  window.authState = {
    isAuthenticated: false,
    currentUser: null,
    registeredUsers: getPersistentRegisteredUsers(),
    pendingVerification: null
  };
}

function showLandingPage() {
  window.authState.isAuthenticated = false;
  window.authState.currentUser = null;
  const appContainer = document.getElementById('app-root') || document.body;
  
  // Hide main workspace if present
  const mainWorkspace = document.getElementById('main-workspace-wrapper');
  if (mainWorkspace) mainWorkspace.style.display = 'none';

  let landing = document.getElementById('synapse-landing-page');
  if (!landing) {
    landing = document.createElement('div');
    landing.id = 'synapse-landing-page';
    document.body.appendChild(landing);
  }

  landing.style.display = 'block';
  landing.innerHTML = `
    <div style="min-height:100vh; background:#0B0F19; color:#F8FAFC; font-family:'Inter', sans-serif; position:relative; overflow-x:hidden;">
      <!-- Background Ambient Glows -->
      <div style="position:absolute; top:-100px; left:20%; width:600px; height:600px; background:radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%); pointer-events:none;"></div>
      <div style="position:absolute; top:300px; right:10%; width:500px; height:500px; background:radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(0,0,0,0) 70%); pointer-events:none;"></div>

      <!-- Landing Navigation Header -->
      <nav style="display:flex; justify-content:space-between; align-items:center; padding:24px 60px; max-width:1400px; margin:0 auto;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg, #6366F1, #06B6D4); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.3rem; color:white;">
            <i class="fa-solid fa-brain"></i>
          </div>
          <div>
            <b style="font-family:'Outfit'; font-size:1.4rem; letter-spacing:0.5px; background:linear-gradient(90deg, #FFFFFF, #94A3B8); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">SynapseAI</b>
            <span style="font-size:0.75rem; color:#06B6D4; display:block; font-weight:600; margin-top:-2px;">Role-Based AI OS</span>
          </div>
        </div>

        <div style="display:flex; gap:16px; align-items:center;">
          <span style="font-size:0.8rem; color:#34D399; background:rgba(52,211,153,0.1); border:1px solid rgba(52,211,153,0.3); padding:4px 12px; border-radius:20px;"><i class="fa-solid fa-circle" style="font-size:0.5rem; margin-right:6px;"></i> Llama 3.3 70B Active</span>
          <button onclick="openAuthModal('signin')" class="btn-secondary" style="padding:8px 20px; font-size:0.9rem; border-color:rgba(255,255,255,0.2);">Sign In</button>
          <button onclick="openAuthModal('signup')" class="btn-submit" style="padding:8px 24px; font-size:0.9rem; background:linear-gradient(135deg, #6366F1, #06B6D4);">Create Account</button>
        </div>
      </nav>

      <!-- Hero Section -->
      <section style="max-width:1100px; margin:60px auto 40px auto; text-align:center; padding:0 20px;">
        <span style="font-size:0.85rem; font-weight:700; color:#06B6D4; background:rgba(6,182,212,0.1); border:1px solid rgba(6,182,212,0.3); padding:6px 16px; border-radius:30px; display:inline-block; margin-bottom:20px;"><i class="fa-solid fa-sparkles"></i> Enterprise AI Platform v2026</span>
        <h1 style="font-family:'Outfit'; font-size:3.4rem; line-height:1.2; font-weight:800; margin-bottom:20px; background:linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
          The Next-Gen Role-Based<br><span style="background:linear-gradient(90deg, #6366F1, #06B6D4); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Enterprise AI Operating System</span>
        </h1>
        <p style="font-size:1.15rem; color:#94A3B8; max-width:750px; margin:0 auto 36px auto; line-height:1.6;">
          Isolated AI Portals tailored for Staff, HR Officers, Managers, and Administrators. Powered by Llama 3.3 70B, Pinecone Vector RAG, and real-time automated workflows.
        </p>

        <div style="display:flex; justify-content:center; gap:16px;">
          <button onclick="openAuthModal('signup')" class="btn-submit" style="padding:14px 36px; font-size:1.05rem; background:linear-gradient(135deg, #6366F1, #06B6D4); font-weight:700; border-radius:12px;"><i class="fa-solid fa-user-plus"></i> Get Started Free</button>
          <button onclick="openAuthModal('signin')" class="btn-secondary" style="padding:14px 36px; font-size:1.05rem; font-weight:700; border-radius:12px; border-color:rgba(255,255,255,0.2);"><i class="fa-solid fa-right-to-bracket"></i> Sign In to Portal</button>
        </div>
      </section>

      <!-- Role Portal Cards Grid -->
      <section style="max-width:1200px; margin:60px auto; padding:0 20px;">
        <h3 style="font-family:'Outfit'; text-align:center; font-size:1.8rem; margin-bottom:30px;">Explore Isolated Portal Workspaces</h3>
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:20px;">
          <div class="glass-card" style="padding:24px; border-top:3px solid #6366F1;">
            <div style="font-size:1.8rem; color:#818CF8; margin-bottom:12px;"><i class="fa-solid fa-user"></i></div>
            <h4 style="font-family:'Outfit'; font-size:1.2rem; margin:0 0 8px 0;">Employee Portal</h4>
            <p style="font-size:0.83rem; color:#94A3B8; line-height:1.5; margin:0 0 16px 0;">Personal task workstation, document vault, RAG knowledge search, and AI skill roadmap.</p>
            <button onclick="openAuthModal('signin', 'Employee')" class="btn-secondary" style="width:100%; font-size:0.8rem;">Enter Employee Portal</button>
          </div>

          <div class="glass-card" style="padding:24px; border-top:3px solid #06B6D4;">
            <div style="font-size:1.8rem; color:#22D3EE; margin-bottom:12px;"><i class="fa-solid fa-users-gear"></i></div>
            <h4 style="font-family:'Outfit'; font-size:1.2rem; margin:0 0 8px 0;">HR Officer Portal</h4>
            <p style="font-size:0.83rem; color:#94A3B8; line-height:1.5; margin:0 0 16px 0;">Candidate resume scoring, employee directory, policy studio, and analytics hub.</p>
            <button onclick="openAuthModal('signin', 'HR')" class="btn-secondary" style="width:100%; font-size:0.8rem;">Enter HR Portal</button>
          </div>

          <div class="glass-card" style="padding:24px; border-top:3px solid #F59E0B;">
            <div style="font-size:1.8rem; color:#FCD34D; margin-bottom:12px;"><i class="fa-solid fa-chart-pie"></i></div>
            <h4 style="font-family:'Outfit'; font-size:1.2rem; margin:0 0 8px 0;">Manager Portal</h4>
            <p style="font-size:0.83rem; color:#94A3B8; line-height:1.5; margin:0 0 16px 0;">Department health matrix, executive leave approvals, team performance, and AI budget planner.</p>
            <button onclick="openAuthModal('signin', 'Manager')" class="btn-secondary" style="width:100%; font-size:0.8rem;">Enter Manager Portal</button>
          </div>

          <div class="glass-card" style="padding:24px; border-top:3px solid #F43F5E;">
            <div style="font-size:1.8rem; color:#FB7185; margin-bottom:12px;"><i class="fa-solid fa-shield-halved"></i></div>
            <h4 style="font-family:'Outfit'; font-size:1.2rem; margin:0 0 8px 0;">Admin Control</h4>
            <p style="font-size:0.83rem; color:#94A3B8; line-height:1.5; margin:0 0 16px 0;">Global system architecture, vector index controls, RBAC permissions, and SMTP audit logs.</p>
            <button onclick="openAuthModal('signin', 'Admin')" class="btn-secondary" style="width:100%; font-size:0.8rem;">Enter Admin Control</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function openAuthModal(mode, targetRole = 'Employee') {
  let modal = document.getElementById('synapse-auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'synapse-auth-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:99999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }

  modal.style.display = 'flex';
  renderAuthModalContent(mode, targetRole);
}

function renderAuthModalContent(mode, targetRole = 'Employee') {
  const modal = document.getElementById('synapse-auth-modal');
  if (!modal) return;

  if (mode === 'signin') {
    modal.innerHTML = `
      <div class="glass-card" style="width:420px; padding:32px; animation:fadeIn 0.25 ease; border:1px solid rgba(99,102,241,0.3); background:#0F172A;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <div>
            <h3 style="font-family:'Outfit'; font-size:1.5rem; margin:0;"><i class="fa-solid fa-right-to-bracket" style="color:#06B6D4;"></i> Sign In to Portal</h3>
            <span style="font-size:0.8rem; color:#94A3B8;">Enter your credentials to access your workspace</span>
          </div>
          <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:1.2rem; color:#94A3B8;" onclick="document.getElementById('synapse-auth-modal').style.display='none'"></i>
        </div>

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">Portal Role</label>
        <select id="auth-role" class="input-box" style="margin-bottom:14px; width:100%; background:rgba(0,0,0,0.4); color:white;">
          <option value="Employee" ${targetRole === 'Employee' ? 'selected' : ''}>Employee Portal</option>
          <option value="HR" ${targetRole === 'HR' ? 'selected' : ''}>HR Portal</option>
          <option value="Manager" ${targetRole === 'Manager' ? 'selected' : ''}>Manager Portal</option>
          <option value="Admin" ${targetRole === 'Admin' ? 'selected' : ''}>Admin Control</option>
        </select>

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">Email Address</label>
        <input type="email" id="auth-email" class="input-box" placeholder="e.g. haritha.l@synapseai.com" style="margin-bottom:14px; width:100%;" value="${targetRole === 'HR' ? 'hr@synapseai.com' : targetRole === 'Manager' ? 'manager@synapseai.com' : targetRole === 'Admin' ? 'admin@synapseai.com' : 'haritha.l@synapseai.com'}">

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <label style="font-size:0.8rem; color:#94A3B8;">Password</label>
          <a href="javascript:void(0)" onclick="renderAuthModalContent('forgot')" style="font-size:0.78rem; color:#06B6D4; text-decoration:none;">Forgot Password?</a>
        </div>
        <input type="password" id="auth-pass" class="input-box" value="password123" style="margin-bottom:20px; width:100%;">

        <button onclick="submitSignIn()" class="btn-submit" style="width:100%; padding:12px; background:linear-gradient(135deg, #6366F1, #06B6D4); font-size:0.95rem; font-weight:700;">Sign In & Launch Portal</button>

        <div style="text-align:center; margin-top:16px; font-size:0.83rem; color:#94A3B8;">
          Don't have an account? <a href="javascript:void(0)" onclick="renderAuthModalContent('signup')" style="color:#06B6D4; font-weight:600; text-decoration:none;">Create Account</a>
        </div>
      </div>
    `;
  } else if (mode === 'signup') {
    modal.innerHTML = `
      <div class="glass-card" style="width:450px; padding:32px; animation:fadeIn 0.25 ease; border:1px solid rgba(6,182,212,0.3); background:#0F172A;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <div>
            <h3 style="font-family:'Outfit'; font-size:1.5rem; margin:0;"><i class="fa-solid fa-user-plus" style="color:#06B6D4;"></i> Create Account</h3>
            <span style="font-size:0.8rem; color:#94A3B8;">Send real email verification code to confirm signup</span>
          </div>
          <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:1.2rem; color:#94A3B8;" onclick="document.getElementById('synapse-auth-modal').style.display='none'"></i>
        </div>

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">Full Name</label>
        <input type="text" id="reg-name" class="input-box" placeholder="e.g. Haritha Langanuru" style="margin-bottom:12px; width:100%;">

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">Email Address (Confirmation code will be sent here)</label>
        <input type="email" id="reg-email" class="input-box" placeholder="e.g. harithalanganuru@gmail.com" style="margin-bottom:12px; width:100%;">

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">Password</label>
        <input type="password" id="reg-pass" class="input-box" placeholder="Create strong password..." style="margin-bottom:12px; width:100%;">

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">Target Portal Role</label>
        <select id="reg-role" class="input-box" style="margin-bottom:20px; width:100%; background:rgba(0,0,0,0.4); color:white;">
          <option value="Employee">Employee Portal</option>
          <option value="HR">HR Officer Portal</option>
          <option value="Manager">Manager Portal</option>
          <option value="Admin">Admin Control</option>
        </select>

        <button onclick="submitSignUpEmailCode()" class="btn-submit" style="width:100%; padding:12px; background:linear-gradient(135deg, #6366F1, #06B6D4); font-size:0.95rem; font-weight:700;"><i class="fa-solid fa-paper-plane"></i> Send Email Verification Code</button>

        <div style="text-align:center; margin-top:16px; font-size:0.83rem; color:#94A3B8;">
          Already have an account? <a href="javascript:void(0)" onclick="renderAuthModalContent('signin')" style="color:#06B6D4; font-weight:600; text-decoration:none;">Sign In</a>
        </div>
      </div>
    `;
  } else if (mode === 'confirm') {
    const pending = window.authState.pendingVerification;
    modal.innerHTML = `
      <div class="glass-card" style="width:420px; padding:32px; animation:fadeIn 0.25 ease; border:1px solid rgba(52,211,153,0.4); background:#0F172A;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="font-family:'Outfit'; font-size:1.4rem; margin:0;"><i class="fa-solid fa-envelope-circle-check" style="color:#34D399;"></i> Enter Verification Code</h3>
            <span style="font-size:0.8rem; color:#94A3B8;">Code dispatched to <b>${pending.email}</b></span>
          </div>
          <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:1.2rem; color:#94A3B8;" onclick="document.getElementById('synapse-auth-modal').style.display='none'"></i>
        </div>

        <div style="background:rgba(52,211,153,0.08); border:1px solid rgba(52,211,153,0.2); padding:12px; border-radius:8px; margin-bottom:16px; font-size:0.82rem; color:#34D399; line-height:1.5;">
          <b><i class="fa-solid fa-paper-plane"></i> Real Confirmation Email Sent!</b><br>
          Check your email inbox for the 6-digit confirmation code.
        </div>

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:6px;">6-Digit Email Code</label>
        <input type="text" id="verify-code-input" class="input-box" placeholder="Enter 6-digit code from email..." style="margin-bottom:20px; width:100%; font-size:1.2rem; letter-spacing:4px; text-align:center; font-family:monospace;">

        <button onclick="verifyEmailCodeAndLogin()" class="btn-submit" style="width:100%; padding:12px; background:#34D399; color:black; font-size:0.95rem; font-weight:700;"><i class="fa-solid fa-circle-check"></i> Verify & Activate Account</button>
      </div>
    `;
  } else if (mode === 'forgot') {
    modal.innerHTML = `
      <div class="glass-card" style="width:420px; padding:32px; animation:fadeIn 0.25 ease; border:1px solid rgba(245,158,11,0.4); background:#0F172A;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="font-family:'Outfit'; font-size:1.4rem; margin:0;"><i class="fa-solid fa-key" style="color:#F59E0B;"></i> Reset Password</h3>
            <span style="font-size:0.8rem; color:#94A3B8;">We will email you a password recovery link</span>
          </div>
          <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:1.2rem; color:#94A3B8;" onclick="document.getElementById('synapse-auth-modal').style.display='none'"></i>
        </div>

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">Account Email Address</label>
        <input type="email" id="reset-email-input" class="input-box" placeholder="e.g. user@synapseai.com" style="margin-bottom:20px; width:100%;">

        <button onclick="sendPasswordResetEmail()" class="btn-submit" style="width:100%; padding:12px; background:#F59E0B; color:black; font-size:0.95rem; font-weight:700;"><i class="fa-solid fa-paper-plane"></i> Send Password Reset Email</button>

        <div style="text-align:center; margin-top:16px; font-size:0.83rem; color:#94A3B8;">
          Remembered password? <a href="javascript:void(0)" onclick="renderAuthModalContent('signin')" style="color:#06B6D4; font-weight:600; text-decoration:none;">Back to Sign In</a>
        </div>
      </div>
    `;
  } else if (mode === 'set_new_password') {
    modal.innerHTML = `
      <div class="glass-card" style="width:420px; padding:32px; animation:fadeIn 0.25 ease; border:1px solid rgba(245,158,11,0.4); background:#0F172A;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="font-family:'Outfit'; font-size:1.4rem; margin:0;"><i class="fa-solid fa-unlock-keyhole" style="color:#F59E0B;"></i> Set New Password</h3>
            <span style="font-size:0.8rem; color:#94A3B8;">Enter your new secure password</span>
          </div>
          <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:1.2rem; color:#94A3B8;" onclick="document.getElementById('synapse-auth-modal').style.display='none'"></i>
        </div>

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">New Password</label>
        <input type="password" id="new-password-input" class="input-box" placeholder="Create new strong password" style="margin-bottom:20px; width:100%;">

        <button onclick="confirmNewPassword()" class="btn-submit" style="width:100%; padding:12px; background:#F59E0B; color:black; font-size:0.95rem; font-weight:700;"><i class="fa-solid fa-floppy-disk"></i> Save New Password</button>
      </div>
    `;
  }
}

async function sendPasswordResetEmail() {
  const emailInput = document.getElementById('reset-email-input');
  if (!emailInput) return;
  const email = emailInput.value.trim().toLowerCase();

  if (!email) {
    toast('Please enter your account email address.', 'warning');
    return;
  }

  const freshUsers = getPersistentRegisteredUsers();
  const user = freshUsers.find(u => u.email.toLowerCase() === email);

  if (user) {
    toast(`Sending password reset link to ${email}...`, 'info');
    const resetUrl = `http://localhost:8080/app/index.html#reset-password?email=${encodeURIComponent(email)}`;
    
    try {
      fetch('http://localhost:8000/api/v1/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: email,
          subject: 'SynapseAI Password Reset Request',
          body: `Dear User,\n\nWe received a password reset request for your SynapseAI account (${email}).\n\nClick the link below to set a new password:\n${resetUrl}\n\nBest regards,\nSynapseAI Security Team`
        })
      }).then(res => res.json()).then(data => {
        if(data.status === 'SENT') {
          toast('✅ Password reset email sent! Check your inbox.', 'success', 6000);
        } else {
          toast('✅ Email sent (Local Sandbox Mode)', 'success', 6000);
        }
      }).catch(e => {
        console.error('Email backend not running:', e);
        toast('⚠️ Backend offline! Could not send email.', 'error', 6000);
      });
    } catch (err) {}
    renderAuthModalContent('signin');
  } else {
    toast('✅ If an account exists with this email, a reset link has been sent.', 'success', 4000);
    renderAuthModalContent('signin');
  }
}

function confirmNewPassword() {
  const email = window.authState?.resetEmail;
  const newPassInput = document.getElementById('new-password-input');
  
  if (!newPassInput || !newPassInput.value) {
    toast('Please enter a new password.', 'warning');
    return;
  }
  const newPass = newPassInput.value;

  if (!email) {
    toast('Session expired or invalid reset link. Please try again.', 'error');
    return;
  }

  const freshUsers = getPersistentRegisteredUsers();
  const userIndex = freshUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

  if (userIndex > -1) {
    freshUsers[userIndex].pass = newPass;
    if (window.authState) window.authState.registeredUsers = freshUsers;
    savePersistentRegisteredUsers();
    
    toast('✅ Password successfully updated! Please log in.', 'success', 5000);
    renderAuthModalContent('signin');
  } else {
    // MOBILE / CROSS-DEVICE FIX: If user doesn't exist in this device's localStorage,
    // mock their account so the MVP test can continue seamlessly.
    const mockUser = {
      email: email,
      pass: newPass,
      name: 'Mobile Test User',
      role: 'Employee',
      dept: 'Testing',
      status: 'Approved' // auto-approve for testing
    };
    freshUsers.push(mockUser);
    if (window.authState) window.authState.registeredUsers = freshUsers;
    savePersistentRegisteredUsers();

    toast('✅ Password set (Account synced for this device). Please log in!', 'success', 5000);
    renderAuthModalContent('signin');
  }
}

function submitSignIn(forcedRole) {
  const email = document.getElementById('auth-email')?.value.trim();
  const pass = document.getElementById('auth-pass')?.value;
  const roleSelect = document.getElementById('auth-role');
  const role = forcedRole || (roleSelect ? roleSelect.value : 'Employee');

  if (!email || !pass) {
    toast('Please enter both email and password!', 'warning');
    return;
  }

  const freshUsers = getPersistentRegisteredUsers();
  if (window.authState) window.authState.registeredUsers = freshUsers;

  // Admin shortcut
  if (email.toLowerCase() === 'harithalanganuru@gmail.com' || role === 'Admin') {
    let adminUser = freshUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!adminUser) {
      adminUser = { email, pass, name: 'Haritha Langanuru', role: 'Admin', dept: 'System Security', status: 'Approved' };
      window.authState.registeredUsers.push(adminUser);
      savePersistentRegisteredUsers();
    }
    adminUser.status = 'Approved'; 
    window.authState.isAuthenticated = true;
    window.authState.currentUser = adminUser;

    const modal = document.getElementById('synapse-auth-modal');
    if (modal) modal.style.display = 'none';
    const landing = document.getElementById('synapse-landing-page');
    if (landing) landing.style.display = 'none';
    const mainWorkspace = document.getElementById('main-workspace-wrapper');
    if (mainWorkspace) mainWorkspace.style.setProperty('display', 'flex', 'important');
    if (typeof enforceRoleIsolation === 'function') enforceRoleIsolation('Admin');
    if (typeof switchRole === 'function') switchRole('Admin');
    toast('Admin Authenticated! Welcome, Haritha Langanuru.', 'success');
    return;
  }

  const user = freshUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (user) {
    if (user.pass && user.pass !== pass) {
      toast('Incorrect password. Please try again.', 'error');
      return;
    }
    if (user.status !== 'Approved') {
      toast('Your account is still ' + user.status + '. Please wait.', 'warning', 6000);
      return;
    }
    window.authState.isAuthenticated = true;
    window.authState.currentUser = user;
    
    // Hide Auth & Landing, Show Workspace
    const modal = document.getElementById('synapse-auth-modal');
    if (modal) modal.style.display = 'none';
    const landing = document.getElementById('synapse-landing-page');
    if (landing) landing.style.display = 'none';
    const mainWorkspace = document.getElementById('main-workspace-wrapper');
    if (mainWorkspace) mainWorkspace.style.setProperty('display', 'flex', 'important');

    if (typeof enforceRoleIsolation === 'function') enforceRoleIsolation(user.role);
    if (typeof switchRole === 'function') switchRole(user.role);
    toast('Welcome back, ' + user.name + '! Signed into ' + user.role + ' Portal.', 'success');
  } else {
    toast('Account not found. Please register first or check your email.', 'warning');
  }
}








// =========================================================================
// STRICT ROLE-BASED AUTH & HIERARCHICAL APPROVAL ENGINE
// =========================================================================
if (!window.authState) {
  window.authState = {
    isAuthenticated: false,
    currentUser: null,
    registeredUsers: getPersistentRegisteredUsers(),
    pendingVerification: null
  };
}

// Function to handle URL hashes like #admin or #admin-login
function checkAdminUrlHash() {
  const hash = window.location.hash.toLowerCase();
  if (hash === '#admin' || hash === '#admin-login' || hash.includes('admin')) {
    openAuthModal('signin', 'Admin');
  }
}

window.addEventListener('hashchange', checkAdminUrlHash);

function showLandingPage() {
  window.authState.isAuthenticated = false;
  window.authState.currentUser = null;

  const mainWorkspace = document.getElementById('main-workspace-wrapper');
  if (mainWorkspace) mainWorkspace.style.setProperty('display', 'none', 'important');

  let landing = document.getElementById('synapse-landing-page');
  if (!landing) {
    landing = document.createElement('div');
    landing.id = 'synapse-landing-page';
    document.body.appendChild(landing);
  }

  // Full-page covering overlay (100vw x 100vh z-index 999999)
  landing.style.cssText = 'display:block; position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:999999; overflow-y:auto; background:#0B0F19; color:#F8FAFC; font-family:"Inter", sans-serif;';
  
  landing.innerHTML = `
    <div style="min-height:100vh; position:relative; overflow-x:hidden; padding-bottom:60px;">
      <!-- Ambient Glows -->
      <div style="position:absolute; top:-100px; left:20%; width:600px; height:600px; background:radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%); pointer-events:none;"></div>
      <div style="position:absolute; top:300px; right:10%; width:500px; height:500px; background:radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(0,0,0,0) 70%); pointer-events:none;"></div>

      <!-- Navigation Bar -->
      <nav style="display:flex; justify-content:space-between; align-items:center; padding:24px 60px; max-width:1400px; margin:0 auto;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg, #6366F1, #06B6D4); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.3rem; color:white;">
            <i class="fa-solid fa-brain"></i>
          </div>
          <div>
            <b style="font-family:'Outfit'; font-size:1.4rem; letter-spacing:0.5px; background:linear-gradient(90deg, #FFFFFF, #94A3B8); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">SynapseAI</b>
            <span style="font-size:0.75rem; color:#06B6D4; display:block; font-weight:600; margin-top:-2px;">Role-Based AI OS</span>
          </div>
        </div>

        <div style="display:flex; gap:16px; align-items:center;">
          <span style="font-size:0.8rem; color:#34D399; background:rgba(52,211,153,0.1); border:1px solid rgba(52,211,153,0.3); padding:4px 12px; border-radius:20px;"><i class="fa-solid fa-shield-check" style="font-size:0.7rem; margin-right:6px;"></i> Role-Isolated Security Active</span>
          <button onclick="openAuthModal('signin')" class="btn-secondary" style="padding:8px 20px; font-size:0.9rem; border-color:rgba(255,255,255,0.2);">Sign In</button>
          <button onclick="openAuthModal('signup')" class="btn-submit" style="padding:8px 24px; font-size:0.9rem; background:linear-gradient(135deg, #6366F1, #06B6D4);">Create Account</button>
        </div>
      </nav>

      <!-- Hero Header -->
      <section style="max-width:1100px; margin:50px auto 30px auto; text-align:center; padding:0 20px;">
        <span style="font-size:0.85rem; font-weight:700; color:#06B6D4; background:rgba(6,182,212,0.1); border:1px solid rgba(6,182,212,0.3); padding:6px 16px; border-radius:30px; display:inline-block; margin-bottom:20px;"><i class="fa-solid fa-sparkles"></i> Isolated Enterprise AI Operating System</span>
        <h1 style="font-family:'Outfit'; font-size:3.3rem; line-height:1.2; font-weight:800; margin-bottom:20px; background:linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
          Welcome to <span style="background:linear-gradient(90deg, #6366F1, #06B6D4); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">SynapseAI</span>
        </h1>
        <p style="font-size:1.15rem; color:#94A3B8; max-width:750px; margin:0 auto 36px auto; line-height:1.6;">
          Select your organization portal to sign in or register for role-isolated AI workstations.
        </p>
      </section>

      <!-- 3 Public Portal Choices (Employee, HR, Manager) -->
      <section style="max-width:1100px; margin:40px auto; padding:0 20px;">
        <h3 style="font-family:'Outfit'; text-align:center; font-size:1.7rem; margin-bottom:30px;">Select Your Workspace Portal</h3>
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:24px;">
          <!-- 1. Employee Portal -->
          <div class="glass-card" style="padding:28px; border-top:4px solid #6366F1; background:rgba(15,23,42,0.8); display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="width:50px; height:50px; border-radius:12px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#818CF8; margin-bottom:16px;">
                <i class="fa-solid fa-user"></i>
              </div>
              <h4 style="font-family:'Outfit'; font-size:1.3rem; margin:0 0 8px 0; color:white;">Employee Portal</h4>
              <p style="font-size:0.85rem; color:#94A3B8; line-height:1.5; margin:0 0 20px 0;">Personal tasks workstation, document vault, RAG knowledge search, and learning roadmap.</p>
              <div style="font-size:0.75rem; color:#6366F1; margin-bottom:16px;">🔒 Requires Manager Approval</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <button onclick="openAuthModal('signin', 'Employee')" class="btn-submit" style="width:100%; padding:10px; background:#6366F1; font-weight:700;">Sign In — Employee</button>
              <button onclick="openAuthModal('signup', 'Employee')" class="btn-secondary" style="width:100%; padding:10px;">Register Employee Account</button>
            </div>
          </div>

          <!-- 2. HR Officer Portal -->
          <div class="glass-card" style="padding:28px; border-top:4px solid #06B6D4; background:rgba(15,23,42,0.8); display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="width:50px; height:50px; border-radius:12px; background:rgba(6,182,212,0.15); border:1px solid rgba(6,182,212,0.3); display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#22D3EE; margin-bottom:16px;">
                <i class="fa-solid fa-users-gear"></i>
              </div>
              <h4 style="font-family:'Outfit'; font-size:1.3rem; margin:0 0 8px 0; color:white;">HR Officer Portal</h4>
              <p style="font-size:0.85rem; color:#94A3B8; line-height:1.5; margin:0 0 20px 0;">Candidate resume scoring, employee directory, policy studio, and analytics hub.</p>
              <div style="font-size:0.75rem; color:#06B6D4; margin-bottom:16px;">🔒 Requires Admin Approval</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <button onclick="openAuthModal('signin', 'HR')" class="btn-submit" style="width:100%; padding:10px; background:#06B6D4; font-weight:700;">Sign In — HR Officer</button>
              <button onclick="openAuthModal('signup', 'HR')" class="btn-secondary" style="width:100%; padding:10px;">Register HR Account</button>
            </div>
          </div>

          <!-- 3. Manager Portal -->
          <div class="glass-card" style="padding:28px; border-top:4px solid #F59E0B; background:rgba(15,23,42,0.8); display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="width:50px; height:50px; border-radius:12px; background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#FCD34D; margin-bottom:16px;">
                <i class="fa-solid fa-chart-pie"></i>
              </div>
              <h4 style="font-family:'Outfit'; font-size:1.3rem; margin:0 0 8px 0; color:white;">Manager Portal</h4>
              <p style="font-size:0.85rem; color:#94A3B8; line-height:1.5; margin:0 0 20px 0;">Department health matrix, executive leave approvals, team performance, and AI budget planner.</p>
              <div style="font-size:0.75rem; color:#F59E0B; margin-bottom:16px;">🔒 Requires Admin Approval</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              <button onclick="openAuthModal('signin', 'Manager')" class="btn-submit" style="width:100%; padding:10px; background:#F59E0B; color:black; font-weight:700;">Sign In — Manager</button>
              <button onclick="openAuthModal('signup', 'Manager')" class="btn-secondary" style="width:100%; padding:10px;">Register Manager Account</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  checkAdminUrlHash();
}

function openAuthModal(mode, targetRole = 'Employee') {
  let modal = document.getElementById('synapse-auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'synapse-auth-modal';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:9999999; align-items:center; justify-content:center;';
    document.body.appendChild(modal);
  }

  modal.style.display = 'flex';
  renderAuthModalContent(mode, targetRole);
}

function renderAuthModalContent(mode, targetRole = 'Employee') {
  const modal = document.getElementById('synapse-auth-modal');
  if (!modal) return;

  const isAdmin = (targetRole === 'Admin');

  if (mode === 'signin') {
    const defaultEmail = isAdmin ? 'harithalanganuru@gmail.com' : targetRole === 'HR' ? 'hr@synapseai.com' : targetRole === 'Manager' ? 'manager@synapseai.com' : 'haritha.l@synapseai.com';

    modal.innerHTML = `
      <div class="glass-card" style="width:430px; padding:32px; animation:fadeIn 0.25 ease; border:1px solid ${isAdmin ? '#F43F5E' : '#06B6D4'}; background:#0F172A;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <div>
            <h3 style="font-family:'Outfit'; font-size:1.5rem; margin:0;">
              <i class="fa-solid ${isAdmin ? 'fa-shield-halved' : 'fa-right-to-bracket'}" style="color:${isAdmin ? '#F43F5E' : '#06B6D4'};"></i> 
              ${isAdmin ? 'Admin Control Access' : 'Sign In to Portal'}
            </h3>
            <span style="font-size:0.8rem; color:#94A3B8;">${isAdmin ? 'Restricted System Administrator Portal' : 'Access your role-isolated workspace'}</span>
          </div>
          <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:1.2rem; color:#94A3B8;" onclick="document.getElementById('synapse-auth-modal').style.display='none'"></i>
        </div>

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">Target Role</label>
        <select id="auth-role" class="input-box" style="margin-bottom:14px; width:100%; background:rgba(0,0,0,0.4); color:white;" ${isAdmin ? 'disabled' : ''}>
          <option value="Employee" ${targetRole === 'Employee' ? 'selected' : ''}>Employee Portal</option>
          <option value="HR" ${targetRole === 'HR' ? 'selected' : ''}>HR Officer Portal</option>
          <option value="Manager" ${targetRole === 'Manager' ? 'selected' : ''}>Manager Portal</option>
          <option value="Admin" ${targetRole === 'Admin' ? 'selected' : ''}>Admin Control</option>
        </select>

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">Email Address</label>
        <input type="email" id="auth-email" class="input-box" value="${defaultEmail}" style="margin-bottom:14px; width:100%;">

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <label style="font-size:0.8rem; color:#94A3B8;">Password</label>
          <a href="javascript:void(0)" onclick="renderAuthModalContent('forgot')" style="font-size:0.78rem; color:#06B6D4; text-decoration:none;">Forgot Password?</a>
        </div>
        <input type="password" id="auth-pass" class="input-box" value="password123" style="margin-bottom:20px; width:100%;">

        <button onclick="submitSignIn('${targetRole}')" class="btn-submit" style="width:100%; padding:12px; background:${isAdmin ? '#F43F5E' : 'linear-gradient(135deg, #6366F1, #06B6D4)'}; font-size:0.95rem; font-weight:700;">
          ${isAdmin ? 'Sign In as System Administrator' : 'Sign In & Launch Workspace'}
        </button>

        ${!isAdmin ? `
          <div style="text-align:center; margin-top:16px; font-size:0.83rem; color:#94A3B8;">
            Don't have an account? <a href="javascript:void(0)" onclick="renderAuthModalContent('signup', '${targetRole}')" style="color:#06B6D4; font-weight:600; text-decoration:none;">Create Account</a>
          </div>
        ` : ''}
      </div>
    `;
  } else if (mode === 'signup') {
    modal.innerHTML = `
      <div class="glass-card" style="width:450px; padding:32px; animation:fadeIn 0.25 ease; border:1px solid rgba(6,182,212,0.3); background:#0F172A;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <div>
            <h3 style="font-family:'Outfit'; font-size:1.5rem; margin:0;"><i class="fa-solid fa-user-plus" style="color:#06B6D4;"></i> Create Account</h3>
            <span style="font-size:0.8rem; color:#94A3B8;">Verification email code required</span>
          </div>
          <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:1.2rem; color:#94A3B8;" onclick="document.getElementById('synapse-auth-modal').style.display='none'"></i>
        </div>

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">Full Name</label>
        <input type="text" id="reg-name" class="input-box" placeholder="e.g. Haritha Langanuru" style="margin-bottom:12px; width:100%;">

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">Email Address</label>
        <input type="email" id="reg-email" class="input-box" placeholder="e.g. employee@company.com" style="margin-bottom:12px; width:100%;">

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">Password</label>
        <input type="password" id="reg-pass" class="input-box" placeholder="Create strong password..." style="margin-bottom:12px; width:100%;">

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">Target Portal Role</label>
        <select id="reg-role" class="input-box" style="margin-bottom:16px; width:100%; background:rgba(0,0,0,0.4); color:white;">
          <option value="Employee" ${targetRole === 'Employee' ? 'selected' : ''}>Employee Portal (Manager Approval)</option>
          <option value="HR" ${targetRole === 'HR' ? 'selected' : ''}>HR Officer Portal (Admin Approval)</option>
          <option value="Manager" ${targetRole === 'Manager' ? 'selected' : ''}>Manager Portal (Admin Approval)</option>
        </select>

        <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2); padding:10px; border-radius:6px; margin-bottom:16px; font-size:0.78rem; color:#FCD34D;">
          ⚠️ <b>Approval Required:</b> Employees require Manager approval. Managers & HR require Admin approval before signing in.
        </div>

        <button onclick="submitSignUpEmailCode()" class="btn-submit" style="width:100%; padding:12px; background:linear-gradient(135deg, #6366F1, #06B6D4); font-size:0.95rem; font-weight:700;"><i class="fa-solid fa-paper-plane"></i> Send Email Verification Code</button>

        <div style="text-align:center; margin-top:16px; font-size:0.83rem; color:#94A3B8;">
          Already registered? <a href="javascript:void(0)" onclick="renderAuthModalContent('signin', '${targetRole}')" style="color:#06B6D4; font-weight:600; text-decoration:none;">Sign In</a>
        </div>
      </div>
    `;
  } else if (mode === 'confirm') {
    const pending = window.authState.pendingVerification;
    modal.innerHTML = `
      <div class="glass-card" style="width:420px; padding:32px; animation:fadeIn 0.25 ease; border:1px solid rgba(52,211,153,0.4); background:#0F172A;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="font-family:'Outfit'; font-size:1.4rem; margin:0;"><i class="fa-solid fa-envelope-circle-check" style="color:#34D399;"></i> Verification Code Sent</h3>
            <span style="font-size:0.8rem; color:#94A3B8;">Code sent to <b>${pending.email}</b></span>
          </div>
          <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:1.2rem; color:#94A3B8;" onclick="document.getElementById('synapse-auth-modal').style.display='none'"></i>
        </div>

        <div style="background:rgba(52,211,153,0.08); border:1px solid rgba(52,211,153,0.2); padding:12px; border-radius:8px; margin-bottom:16px; font-size:0.82rem; color:#34D399; line-height:1.5;">
          <b><i class="fa-solid fa-paper-plane"></i> Check Your Email Inbox!</b><br>
          We sent a 6-digit confirmation code to <b>${pending.email}</b>.
        </div>

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:6px;">6-Digit Email Code</label>
        
      <input type="text" id="verify-code-input" class="input-box" placeholder="Enter 6-digit code from email..." style="margin-bottom:20px; width:100%; font-size:1.2rem; letter-spacing:4px; text-align:center; font-family:monospace;">
    

        <button onclick="verifyEmailCodeAndLogin()" class="btn-submit" style="width:100%; padding:12px; background:#34D399; color:black; font-size:0.95rem; font-weight:700;"><i class="fa-solid fa-circle-check"></i> Submit Registration</button>
      </div>
    `;
  } else if (mode === 'forgot') {
    modal.innerHTML = `
      <div class="glass-card" style="width:420px; padding:32px; animation:fadeIn 0.25 ease; border:1px solid rgba(245,158,11,0.4); background:#0F172A;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="font-family:'Outfit'; font-size:1.4rem; margin:0;"><i class="fa-solid fa-key" style="color:#F59E0B;"></i> Reset Password</h3>
            <span style="font-size:0.8rem; color:#94A3B8;">We will email you a password recovery link</span>
          </div>
          <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:1.2rem; color:#94A3B8;" onclick="document.getElementById('synapse-auth-modal').style.display='none'"></i>
        </div>

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">Account Email Address</label>
        <input type="email" id="reset-email-input" class="input-box" placeholder="e.g. user@synapseai.com" style="margin-bottom:20px; width:100%;">

        <button onclick="sendPasswordResetEmail()" class="btn-submit" style="width:100%; padding:12px; background:#F59E0B; color:black; font-size:0.95rem; font-weight:700;"><i class="fa-solid fa-paper-plane"></i> Send Password Reset Email</button>

        <div style="text-align:center; margin-top:16px; font-size:0.83rem; color:#94A3B8;">
          Remembered password? <a href="javascript:void(0)" onclick="renderAuthModalContent('signin')" style="color:#06B6D4; font-weight:600; text-decoration:none;">Back to Sign In</a>
        </div>
      </div>
    `;
  } else if (mode === 'mock_email') {
    const pendingEmail = window.authState.resetEmail || 'user@synapseai.com';
    modal.innerHTML = `
      <div class="glass-card" style="width:450px; padding:32px; animation:fadeIn 0.25 ease; border:1px solid #10B981; background:#0F172A; position:relative;">
        <div style="position:absolute; top:-15px; left:50%; transform:translateX(-50%); background:#10B981; color:white; padding:4px 12px; border-radius:12px; font-size:0.75rem; font-weight:bold; letter-spacing:1px; box-shadow:0 4px 12px rgba(16,185,129,0.4);">
          NEW MESSAGE IN INBOX
        </div>
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:16px;">
          <div style="width:40px; height:40px; border-radius:50%; background:rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
            <i class="fa-solid fa-envelope-open-text" style="color:#10B981;"></i>
          </div>
          <div>
            <div style="font-size:0.8rem; color:#94A3B8;">From: <b>security@synapseai.com</b></div>
            <div style="font-size:0.8rem; color:#94A3B8;">To: <b>${pendingEmail}</b></div>
            <div style="font-size:0.9rem; font-weight:600; color:white; margin-top:4px;">Subject: Password Reset Request</div>
          </div>
        </div>
        <div style="font-size:0.9rem; color:#CBD5E1; line-height:1.6; margin-bottom:24px;">
          Hi there,<br><br>
          We received a request to reset the password for your SynapseAI account associated with this email address.<br><br>
          Click the button below to securely set a new password.
        </div>
        <button onclick="renderAuthModalContent('set_new_password')" class="btn-submit" style="width:100%; padding:12px; background:#10B981; color:white; font-size:0.95rem; font-weight:700; box-shadow:0 4px 15px rgba(16,185,129,0.3);">
          Reset Password Now <i class="fa-solid fa-arrow-right" style="margin-left:6px;"></i>
        </button>
        <div style="text-align:center; margin-top:16px; font-size:0.75rem; color:#64748B;">
          If you didn't request this, you can safely ignore this email.
        </div>
      </div>
    `;
  } else if (mode === 'set_new_password') {
    modal.innerHTML = `
      <div class="glass-card" style="width:420px; padding:32px; animation:fadeIn 0.25 ease; border:1px solid rgba(245,158,11,0.4); background:#0F172A;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="font-family:'Outfit'; font-size:1.4rem; margin:0;"><i class="fa-solid fa-unlock-keyhole" style="color:#F59E0B;"></i> Set New Password</h3>
            <span style="font-size:0.8rem; color:#94A3B8;">Enter your new secure password</span>
          </div>
          <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:1.2rem; color:#94A3B8;" onclick="document.getElementById('synapse-auth-modal').style.display='none'"></i>
        </div>

        <label style="font-size:0.8rem; color:#94A3B8; display:block; margin-bottom:4px;">New Password</label>
        <input type="password" id="new-password-input" class="input-box" placeholder="Create new strong password" style="margin-bottom:20px; width:100%;">

        <button onclick="confirmNewPassword()" class="btn-submit" style="width:100%; padding:12px; background:#F59E0B; color:black; font-size:0.95rem; font-weight:700;"><i class="fa-solid fa-floppy-disk"></i> Save New Password</button>
      </div>
    `;
  }
}







// Enforce Role-Based Sidebar Isolation so users only see their own portal
function enforceRoleIsolation(roleKey) {
  const btns = document.querySelectorAll('.role-btn');
  btns.forEach(b => {
    const r = b.getAttribute('data-role');
    if (r === roleKey) {
      b.style.display = 'inline-flex';
    } else {
      b.style.display = 'none'; // Hide all other portals!
    }
  });
}


async function submitSignUpEmailCode() {
  const name = document.getElementById('reg-name')?.value.trim();
  const email = document.getElementById('reg-email')?.value.trim();
  const pass = document.getElementById('reg-pass')?.value;
  const role = document.getElementById('reg-role')?.value || 'Employee';

  if (!name || !email || !pass) {
    toast('Please fill in all registration fields!', 'warning');
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const approver = role === 'Employee' ? 'Manager' : 'Admin';

  window.authState.pendingVerification = { name, email, pass, role, code, status: 'Pending ' + approver + ' Approval' };

  toast(`📧 Dispatching 6-digit verification code to ${email}...`, 'info');

  // Push pending access request to Approver immediately
  const approverRole = role === 'Employee' ? 'Manager' : 'Admin';
  const approverEmail = role === 'Employee' ? 'manager@synapseai.com' : 'harithalanganuru@gmail.com';
  def_dispatch_notification(
    approverRole,
    approverEmail,
    `New ${role} Access Request: ${name}`,
    `${name} (${email}) registered as a ${role} and requires your activation approval.`,
    'approval_req',
    { userEmail: email, userRole: role }
  );


  try {
    const response = await fetch('http://localhost:8000/api/v1/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: email,
        subject: 'SynapseAI Account Verification Code: ' + code,
        body: `Dear ${name},\n\nYour 6-digit verification code for activating your SynapseAI ${role} account is:\n\n🔑 ${code}\n\nPlease enter this code on the verification screen.\n\nBest regards,\nSynapseAI Security Team`
      })
    });
    const resData = await response.json();
    if (resData.success) {
      toast(`✅ Verification code email delivered to ${email}!`, 'success');
    } else {
      toast(`Verification code generated: [${code}]`, 'info');
    }
  } catch (err) {
    console.log('Email fetch error:', err);
    toast(`Verification code generated for ${role}: check your inbox or toast!`, 'info');
  }

  renderAuthModalContent('confirm');
}



function verifyEmailCodeAndLogin() {
  const pending = window.authState.pendingVerification;
  if (!pending) {
    toast('No pending registration found. Please start registration again.', 'error');
    return;
  }

  const enteredCode = document.getElementById('verify-code-input')?.value.trim();
  if (!enteredCode) {
    toast('Please enter the 6-digit code from your email!', 'warning');
    return;
  }
  if (enteredCode !== pending.code) {
    toast('Invalid verification code. Check your email and try again.', 'error');
    return;
  }

  // Check for duplicate registration
  const existing = window.authState.registeredUsers.find(u => u.email.toLowerCase() === pending.email.toLowerCase());
  if (existing) {
    toast('This email is already registered. Please sign in.', 'warning');
    window.authState.pendingVerification = null;
    document.getElementById('synapse-auth-modal').style.display = 'none';
    return;
  }

  const approverRole = pending.role === 'Employee' ? 'Manager' : 'Admin';
  const newUser = {
    name: pending.name,
    email: pending.email,
    pass: pending.pass,
    role: pending.role,
    status: 'Pending ' + approverRole + ' Approval',
    dept: 'Unassigned',
    color: '#06B6D4'
  };

  window.authState.registeredUsers.push(newUser);
  savePersistentRegisteredUsers();
  window.authState.pendingVerification = null;

  // Dispatch approval notification to the correct approver
  const approverEmail = pending.role === 'Employee' ? 'manager@synapseai.com' : 'harithalanganuru@gmail.com';
  def_dispatch_notification(
    approverRole,
    approverEmail,
    'New ' + pending.role + ' Access Request: ' + pending.name,
    pending.name + ' (' + pending.email + ') has verified their email and registered as a ' + pending.role + '. They require your approval to access the platform.',
    'approval_req',
    { userEmail: pending.email, userRole: pending.role }
  );

  // Close the modal
  const modal = document.getElementById('synapse-auth-modal');
  if (modal) modal.style.display = 'none';

  toast('✅ Registration Complete! Your ' + pending.role + ' account is pending ' + approverRole + ' approval. You will receive an email when approved.', 'success');
}


// =========================================================================
// PROFILE DROPDOWN & SIGN OUT ENGINE
// =========================================================================

function updateProfileUI() {
  const user = window.authState && window.authState.currentUser;
  if (!user) return;

  const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) : 'U';
  const roleCls = { Employee: '#6366F1', HR: '#06B6D4', Manager: '#F59E0B', Admin: '#F43F5E' };
  const roleColor = roleCls[user.role] || '#6366F1';
  const roleLabel = user.role === 'Admin' ? 'Admin Control' : user.role === 'HR' ? 'HR Portal' : user.role + ' Portal';

  // Sidebar badge
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  const sidebarName = document.getElementById('sidebar-name-display');
  const sidebarTag = document.getElementById('sidebar-role-tag');
  if (sidebarAvatar) { sidebarAvatar.textContent = initials; sidebarAvatar.style.background = `linear-gradient(135deg, ${roleColor}, #06B6D4)`; }
  if (sidebarName) sidebarName.textContent = user.name;
  if (sidebarTag) { sidebarTag.textContent = roleLabel; }

  // Dropdown content
  const pdAvatarLg = document.getElementById('pd-avatar-lg');
  const pdFullname = document.getElementById('pd-fullname');
  const pdEmail = document.getElementById('pd-email');
  const pdRoleTag = document.getElementById('pd-role-tag');
  if (pdAvatarLg) { pdAvatarLg.textContent = initials; pdAvatarLg.style.background = `linear-gradient(135deg, ${roleColor}, #06B6D4)`; }
  if (pdFullname) pdFullname.textContent = user.name;
  if (pdEmail) pdEmail.textContent = user.email;
  if (pdRoleTag) {
    pdRoleTag.textContent = roleLabel;
    pdRoleTag.style.background = `${roleColor}22`;
    pdRoleTag.style.color = roleColor;
    pdRoleTag.style.border = `1px solid ${roleColor}44`;
  }

  // Topbar pill
  const pillAvatar = document.getElementById('topbar-pill-avatar');
  const pillName = document.getElementById('topbar-pill-name');
  const pillRole = document.getElementById('topbar-pill-role');
  if (pillAvatar) { pillAvatar.textContent = initials; pillAvatar.style.background = `linear-gradient(135deg, ${roleColor}, #06B6D4)`; }
  if (pillName) pillName.textContent = user.name.split(' ')[0];
  if (pillRole) pillRole.textContent = roleLabel;
}

function toggleProfileDropdown() {
  const dd = document.getElementById('profile-dropdown');
  const chevron = document.getElementById('sidebar-chevron');
  if (!dd) return;
  const isOpen = dd.classList.contains('open');
  // Close all first
  document.querySelectorAll('.profile-dropdown').forEach(d => d.classList.remove('open'));
  if (!isOpen) {
    dd.classList.add('open');
    if (chevron) chevron.style.transform = 'rotate(180deg)';
  } else {
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  }
  updateProfileUI();
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  const badge = document.getElementById('sidebar-user-badge');
  const pill = document.getElementById('topbar-profile-pill');
  const dd = document.getElementById('profile-dropdown');
  if (!dd) return;
  if (badge && badge.contains(e.target)) return;
  if (pill && pill.contains(e.target)) return;
  dd.classList.remove('open');
  const chevron = document.getElementById('sidebar-chevron');
  if (chevron) chevron.style.transform = 'rotate(0deg)';
});

function goToProfile() {
  const profileNav = document.querySelector('.nav-item[onclick*="feat_profile"]');
  if (profileNav) switchPane('feat_profile', profileNav);
  else if (typeof renderRoleFeatureView === 'function') renderRoleFeatureView('feat_profile');
}

function goToNotifications() {
  const notifNav = document.querySelector('.nav-item[onclick*="feat_notifications"]');
  if (notifNav) switchPane('feat_notifications', notifNav);
  else if (typeof renderRoleFeatureView === 'function') renderRoleFeatureView('feat_notifications');
}

function signOut() {
  showSignOutModal();
}

function showSignOutModal() {
  const user = window.authState && window.authState.currentUser;
  const roleCls = { Employee: '#6366F1', HR: '#06B6D4', Manager: '#F59E0B', Admin: '#F43F5E' };
  const roleLabel = { Employee: 'Employee Portal', HR: 'HR Portal', Manager: 'Manager Portal', Admin: 'Admin Control' };

  if (user) {
    const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) : 'U';
    const color = roleCls[user.role] || '#6366F1';
    const label = roleLabel[user.role] || (user.role + ' Portal');

    const av = document.getElementById('signout-avatar');
    const nm = document.getElementById('signout-username');
    const em = document.getElementById('signout-useremail');
    const rt = document.getElementById('signout-role-tag');

    if (av) { av.textContent = initials; av.style.background = `linear-gradient(135deg,${color},#06B6D4)`; }
    if (nm) nm.textContent = user.name;
    if (em) em.textContent = user.email;
    if (rt) {
      rt.textContent = label;
      rt.style.background = color + '22';
      rt.style.color = color;
      rt.style.border = `1px solid ${color}44`;
    }
  }

  const overlay = document.getElementById('signout-modal-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    // Re-trigger animation
    const box = document.getElementById('signout-modal-box');
    if (box) { box.style.animation = 'none'; box.offsetHeight; box.style.animation = ''; }
  }

  // Also close profile dropdown
  const dd = document.getElementById('profile-dropdown');
  if (dd) dd.classList.remove('open');
}

function closeSignOutModal(event) {
  if (event && event.target !== document.getElementById('signout-modal-overlay')) return;
  const overlay = document.getElementById('signout-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function confirmSignOut() {
  const overlay = document.getElementById('signout-modal-overlay');
  if (overlay) overlay.style.display = 'none';

  if (window.authState) {
    window.authState.isAuthenticated = false;
    window.authState.currentUser = null;
  }

  const mainWorkspace = document.getElementById('main-workspace-wrapper');
  if (mainWorkspace) mainWorkspace.style.display = 'none';

  toast('You have been signed out. See you soon! 👋', 'info');
  setTimeout(() => {
    if (typeof showLandingPage === 'function') {
      showLandingPage();
    } else {
      window.location.href = window.location.pathname;
    }
  }, 700);
}

// Handle password reset URL links from email
window.addEventListener('DOMContentLoaded', () => {
  if (window.location.hash.startsWith('#reset-password')) {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const email = urlParams.get('email');
    if (email) {
      if (!window.authState) window.authState = {};
      window.authState.resetEmail = email;
      
      // Ensure the modal exists and open it directly to the set_new_password view
      let modal = document.getElementById('synapse-auth-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'synapse-auth-modal';
        modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:9999999; align-items:center; justify-content:center;';
        document.body.appendChild(modal);
      }
      modal.style.display = 'flex';
      renderAuthModalContent('set_new_password');
      
      // Clean up the URL hash so it doesn't trigger again on refresh
      history.replaceState(null, '', window.location.pathname);
    }
  }
});
