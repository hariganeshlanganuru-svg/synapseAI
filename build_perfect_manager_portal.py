import re

def main():
    with open('app/index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. First, check if manager-exec-modules or manager dashboard container exists in HTML.
    # In index.html line 527: <div id="admin-exec-modules" ...>
    # We can add <div id="manager-exec-modules" style="display:none; flex-direction:column; gap:20px;">...</div> right below admin-exec-modules!

    manager_dashboard_html = """
          <!-- Business Operations Modules Container (Manager Only) -->
          <div id="manager-exec-modules" style="display:none; flex-direction:column; gap:20px;">
            <!-- Top Action Bar -->
            <div class="glass-card" style="padding:16px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; background:linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(99,102,241,0.08) 100%); border:1px solid rgba(245,158,11,0.2);">
              <div>
                <b style="font-size:1.1rem; color:var(--text-main);"><i class="fa-solid fa-bolt" style="color:var(--status-amber); margin-right:6px;"></i> Quick Manager Actions</b>
                <div style="font-size:0.8rem; color:var(--text-muted);">Common operations and operational shortcuts</div>
              </div>
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn-submit" onclick="switchPane('feat_approvals')" style="padding:8px 14px; font-size:0.82rem;"><i class="fa-solid fa-circle-check"></i> Pending Approvals (<span id="dash-pending-count">7</span>)</button>
                <button class="btn-secondary" onclick="switchPane('feat_projects'); setTimeout(showNewProjectModal, 100);" style="padding:8px 14px; font-size:0.82rem;"><i class="fa-solid fa-plus"></i> New Project</button>
                <button class="btn-secondary" onclick="switchPane('feat_team'); setTimeout(autoBalanceTeam, 100);" style="padding:8px 14px; font-size:0.82rem;"><i class="fa-solid fa-scale-balanced"></i> Rebalance Team</button>
                <button class="btn-secondary" onclick="switchPane('feat_meetings')" style="padding:8px 14px; font-size:0.82rem;"><i class="fa-solid fa-video"></i> Schedule Meeting</button>
              </div>
            </div>

            <!-- Two Column Dashboard Overview -->
            <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:20px;">
              <!-- Left: Project Health Summary & Recent Activity -->
              <div style="display:flex; flex-direction:column; gap:20px;">
                <div class="glass-card" style="padding:0; overflow:hidden;">
                  <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
                    <b style="font-size:1.05rem;"><i class="fa-solid fa-diagram-project" style="color:var(--accent-primary); margin-right:8px;"></i> Active Projects Snapshot</b>
                    <button class="btn-act" onclick="switchPane('feat_projects')" style="font-size:0.75rem; padding:4px 10px;">View All Projects</button>
                  </div>
                  <div id="dash-projects-list" style="padding:12px;">
                    <!-- Rendered dynamically -->
                  </div>
                </div>

                <div class="glass-card" style="padding:20px;">
                  <b style="font-size:1.05rem; display:block; margin-bottom:12px;"><i class="fa-solid fa-clock-rotate-left" style="color:var(--accent-cyan); margin-right:8px;"></i> Recent Department Activity</b>
                  <div id="dash-activity-feed" style="display:flex; flex-direction:column; gap:12px; font-size:0.85rem;">
                    <div style="display:flex; gap:12px; align-items:flex-start; background:rgba(255,255,255,0.02); padding:10px; border-radius:8px;">
                      <i class="fa-solid fa-circle-check" style="color:var(--status-emerald); margin-top:3px;"></i>
                      <div><b>Haritha L.</b> submitted Q3 Engineering Summary PDF <div style="font-size:0.75rem; color:var(--text-muted);">10 mins ago</div></div>
                    </div>
                    <div style="display:flex; gap:12px; align-items:flex-start; background:rgba(255,255,255,0.02); padding:10px; border-radius:8px;">
                      <i class="fa-solid fa-triangle-exclamation" style="color:var(--status-amber); margin-top:3px;"></i>
                      <div><b>AI Engine</b> flagged RAG Pipeline v2 as "At Risk" due to bandwidth constraints <div style="font-size:0.75rem; color:var(--text-muted);">45 mins ago</div></div>
                    </div>
                    <div style="display:flex; gap:12px; align-items:flex-start; background:rgba(255,255,255,0.02); padding:10px; border-radius:8px;">
                      <i class="fa-solid fa-user-plus" style="color:var(--accent-primary); margin-top:3px;"></i>
                      <div><b>Alex R.</b> requested AWS Prod Access clearance <div style="font-size:0.75rem; color:var(--text-muted);">2 hours ago</div></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right: Approvals Quick-View & Team Load -->
              <div style="display:flex; flex-direction:column; gap:20px;">
                <div class="glass-card" style="padding:20px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                    <b style="font-size:1.05rem;"><i class="fa-solid fa-list-check" style="color:var(--status-rose); margin-right:8px;"></i> Action Required</b>
                    <span class="role-badge-pill" style="background:var(--status-rose); color:white;" id="dash-approvals-pill">7 Pending</span>
                  </div>
                  <div id="dash-approvals-quicklist" style="display:flex; flex-direction:column; gap:10px;">
                    <!-- Rendered dynamically -->
                  </div>
                </div>

                <div class="glass-card" style="padding:20px;">
                  <b style="font-size:1.05rem; display:block; margin-bottom:12px;"><i class="fa-solid fa-users" style="color:var(--status-emerald); margin-right:8px;"></i> Workload Alerts</b>
                  <div id="dash-workload-alerts" style="display:flex; flex-direction:column; gap:10px;">
                    <!-- Rendered dynamically -->
                  </div>
                </div>
              </div>
            </div>
          </div>"""

    # Inject manager_dashboard_html right after admin-exec-modules close tag if not present
    if 'id="manager-exec-modules"' not in html:
        admin_close_idx = html.find('</div>\n        </div>\n\n        <!-- 2. ROLE FEATURE VIEW PANE -->')
        if admin_close_idx != -1:
            html = html[:admin_close_idx] + '</div>\n\n' + manager_dashboard_html + html[admin_close_idx + 6:]
        else:
            # Fallback search
            html = html.replace('<!-- Business Operations Modules Container (Admin Only) -->', '<!-- Business Operations Modules Container (Admin Only) -->\n' + manager_dashboard_html)

    # 2. Update switchRole in script to toggle manager-exec-modules and render Manager Dashboard UI
    # Search for const adminModules = document.getElementById('admin-exec-modules');
    role_toggle_code = """      const adminModules = document.getElementById('admin-exec-modules');
      if (adminModules) {
        adminModules.style.display = currentRole === 'Admin' ? 'flex' : 'none';
      }
      const managerModules = document.getElementById('manager-exec-modules');
      if (managerModules) {
        managerModules.style.display = currentRole === 'Manager' ? 'flex' : 'none';
      }
      if (currentRole === 'Manager') {
        renderManagerDashboardUI();
      }"""
    
    html = re.sub(
        r'const adminModules = document\.getElementById\(\'admin-exec-modules\'\);.*?adminModules\.style\.display = currentRole === \'Admin\' \? \'flex\' : \'none\';\s*\}',
        role_toggle_code,
        html,
        flags=re.DOTALL
    )

    # 3. Define complete window.managerState and state-based render functions
    state_system_js = """
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
    { id: 'm1', time: '10:00 AM', duration: '45 mins', title: 'Engineering Sync', sub: 'Weekly status update', organizer: 'David M.', platform: 'Teams', connected: false },
    { id: 'm2', time: '11:30 AM', duration: '30 mins', title: 'Architecture Review: RAG v2', sub: 'AI infrastructure scaling', organizer: 'Haritha L.', platform: 'Teams', connected: false },
    { id: 'm3', time: '1:30 PM', duration: '30 mins', title: '1:1 with Haritha', sub: 'Performance check-in', organizer: 'David M.', platform: 'Zoom', connected: false },
    { id: 'm4', time: '3:00 PM', duration: '60 mins', title: 'Q3 Planning Workshop', sub: 'Cross-functional alignment', organizer: 'Sarah J.', platform: 'Teams', connected: false },
    { id: 'm5', time: '4:30 PM', duration: '45 mins', title: 'Security Incident Post-Mortem', sub: 'Review audit findings', organizer: 'Alex R.', platform: 'Zoom', connected: false }
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
    toast(m.connected ? `Connected to ${m.title}` : `Disconnected from ${m.title}`, m.connected ? 'success' : 'info');
    renderRoleFeatureView('feat_meetings');
  }
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

function downloadFile(btn, filename) {
  let originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  setTimeout(() => {
    btn.innerHTML = originalHtml;
    toast('Downloaded ' + filename, 'success');
  }, 800);
}

function filterTable(input, tableId) {
  const filter = input.value.toUpperCase();
  const table = document.getElementById(tableId);
  if (!table) return;
  const tr = table.getElementsByTagName("tr");
  for (let i = 1; i < tr.length; i++) {
    let textContent = tr[i].textContent || tr[i].innerText;
    if (textContent.toUpperCase().indexOf(filter) > -1) {
      tr[i].style.display = "";
    } else {
      tr[i].style.display = "none";
    }
  }
}
"""

    # 4. Now rewrite `renderRoleFeatureView` for all manager features to use `window.managerState`!
    manager_features_render_js = """      // MANAGER PORTAL VIEWS (STATE-PERSISTED)
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
                    <td><button class="btn-act" style="padding:4px 8px; font-size:0.75rem;"><i class="fa-solid fa-ellipsis"></i></button></td>
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
              <button class="btn-secondary" style="padding:8px 16px;"><i class="fa-solid fa-filter"></i> Filter</button>
              <button class="btn-submit" onclick="autoBalanceTeam()"><i class="fa-solid fa-scale-balanced"></i> Auto-Balance</button>
            </div>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Avg Utilization</div><div class="stat-number">${avgUtil}%</div></div>
            <div class="glass-card" style="padding:16px;"><div>Overallocated</div><div class="stat-number" style="color:${overalloc > 0 ? 'var(--status-amber)' : 'var(--status-emerald)'}">${overalloc}</div></div>
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
                      <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div style="width:Math.min(100, ${t.util})%; height:100%; background:${t.barColor}; border-radius:3px; transition:all 0.5s;"></div></div>
                    </td>
                    <td>
                      ${t.overallocated 
                        ? `<button class="btn-submit" onclick="reallocateTask(this, 'team-row-${t.id}')" style="padding:4px 12px; font-size:0.75rem;">Reallocate</button>`
                        : `<button class="btn-secondary" style="padding:4px 12px; font-size:0.75rem;">Assign Task</button>`}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`;

      } else if (featureId === 'feat_approvals') {
        const state = window.managerState;

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">Approvals Center</h2>
            <div style="display:flex; gap:8px;">
              <button class="btn-secondary" style="padding:8px 16px;">Bulk Actions</button>
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
            <button class="btn-submit" onclick="toast('New Report Template Created', 'success')"><i class="fa-solid fa-file-circle-plus"></i> New Report</button>
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
                <button class="btn-submit" onclick="saveReportConfiguration()">Save Configuration</button>
              </div>
            </div>
          </div>`;

      } else if (featureId === 'feat_meetings') {
        const state = window.managerState;

        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">Meetings & AI Minutes Generator</h2>
            <button class="btn-submit" onclick="toast('Meeting Scheduled', 'success')"><i class="fa-solid fa-video"></i> Schedule Meeting</button>
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
                    <td><b>${m.time}</b><div style="font-size:0.75rem; color:var(--text-muted);">${m.duration}</div></td>
                    <td><b>${m.title}</b><div style="font-size:0.75rem; color:var(--text-dim);">${m.sub}</div></td>
                    <td>${m.organizer}</td>
                    <td><span class="role-badge-pill" style="background:rgba(255,255,255,0.08);">${m.platform}</span></td>
                    <td>
                      <button class="${m.connected ? 'btn-submit' : 'btn-act'}" onclick="toggleMeetingConnection('${m.id}')" style="padding:4px 12px; font-size:0.75rem; ${m.connected ? 'background:var(--status-emerald);' : ''}">
                        ${m.connected ? '<i class="fa-solid fa-check"></i> Connected' : 'Join Call'}
                      </button>
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
            <button class="btn-secondary" onclick="toast('Audit Log Exported', 'success')"><i class="fa-solid fa-file-export"></i> Export Audit</button>
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
                          ? `<button class="btn-act" onclick="toast('Showing execution trace...', 'info')" style="padding:4px 8px; font-size:0.75rem;">Details</button>`
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
                <button class="btn-secondary" onclick="toast('Trace details loaded.', 'info')" style="width:100%; font-size:0.85rem;">View Full Trace</button>
              </div>
            </div>
          </div>`;"""

    # Replace manager portal features in `renderRoleFeatureView`
    pattern = re.compile(r'\s*// MANAGER PORTAL VIEWS\s*} else if \(featureId === \'feat_projects\'\) \{.*?(?=\s*} else \{\s*container\.innerHTML = `)', re.DOTALL)
    if pattern.search(html):
        html = pattern.sub('\n' + manager_features_render_js, html)

    # Clean out any old Manager interactive JS and inject state_system_js
    if '// --- Added Manager Portal Interactivity JS ---' in html:
        old_js_pattern = re.compile(r'// --- Added Manager Portal Interactivity JS ---.*?(?=</script>)', re.DOTALL)
        html = old_js_pattern.sub(state_system_js, html)
    else:
        script_close_idx = html.rfind('</script>')
        if script_close_idx != -1:
            html = html[:script_close_idx] + state_system_js + "\n  " + html[script_close_idx:]

    with open('app/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Successfully built state-persisted Manager Portal!")

if __name__ == '__main__':
    main()
