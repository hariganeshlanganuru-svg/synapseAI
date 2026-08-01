import re

def main():
    with open('app/index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # The new manager portal views block
    new_manager_views = """      // MANAGER PORTAL VIEWS
      } else if (featureId === 'feat_projects') {
        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">Projects & Smart Health Predictor</h2>
            <button class="btn-submit" onclick="showNewProjectModal()"><i class="fa-solid fa-plus"></i> New Project</button>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Total Active Projects</div><div class="stat-number" id="kpi-total-projects">27</div></div>
            <div class="glass-card" style="padding:16px;"><div>On Track</div><div class="stat-number" style="color:var(--status-emerald);">20</div></div>
            <div class="glass-card" style="padding:16px;"><div>At Risk</div><div class="stat-number" style="color:var(--status-amber);">5</div></div>
            <div class="glass-card" style="padding:16px;"><div>Blocked</div><div class="stat-number" style="color:var(--status-rose);">2</div></div>
          </div>
          <div class="glass-card" style="padding:0; overflow:hidden;">
            <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between;">
              <b style="font-size:1.1rem;">Project Portfolio</b>
              <input type="text" class="input-box" placeholder="Search projects..." style="width:250px; padding:6px 12px; font-size:0.85rem;" oninput="filterTable(this, 'projects-table')">
            </div>
            <table class="org-table" id="projects-table">
              <thead><tr><th>Project Name</th><th>Lead</th><th>Progress</th><th>Health</th><th>Actions</th></tr></thead>
              <tbody id="projects-tbody">
                <tr>
                  <td><b>SynapseAI Core OS</b><div style="font-size:0.75rem; color:var(--text-dim);">INFRA-902</div></td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;">H</div> Haritha L.</div></td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>96%</span><span>Q3 Delivery</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div style="width:96%; height:100%; background:var(--status-emerald); border-radius:3px;"></div></div>
                  </td>
                  <td><span class="role-badge-inline rb-employee">Healthy</span></td>
                  <td><button class="btn-act" style="padding:4px 8px; font-size:0.75rem;"><i class="fa-solid fa-ellipsis"></i></button></td>
                </tr>
                <tr>
                  <td><b>RAG Pipeline v2 Expansion</b><div style="font-size:0.75rem; color:var(--text-dim);">AI-105</div></td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;">R</div> Rahul K.</div></td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>65%</span><span>Delay Risk</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div style="width:65%; height:100%; background:var(--status-amber); border-radius:3px;"></div></div>
                  </td>
                  <td><span class="role-badge-inline rb-manager">At Risk</span></td>
                  <td><button class="btn-act" style="padding:4px 8px; font-size:0.75rem;"><i class="fa-solid fa-ellipsis"></i></button></td>
                </tr>
                <tr>
                  <td><b>Cloud Migration EU</b><div style="font-size:0.75rem; color:var(--text-dim);">OPS-404</div></td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;">S</div> Sarah J.</div></td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>42%</span><span>Blocked</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div style="width:42%; height:100%; background:var(--status-rose); border-radius:3px;"></div></div>
                  </td>
                  <td><span class="role-badge-inline rb-hr" style="color:var(--status-rose); border-color:var(--status-rose);">Blocked</span></td>
                  <td><button class="btn-act" style="padding:4px 8px; font-size:0.75rem;"><i class="fa-solid fa-ellipsis"></i></button></td>
                </tr>
                <tr>
                  <td><b>Mobile App Re-architecture</b><div style="font-size:0.75rem; color:var(--text-dim);">MOB-120</div></td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;background:#F59E0B;">M</div> Mark T.</div></td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>15%</span><span>Q4 Delivery</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div style="width:15%; height:100%; background:var(--status-emerald); border-radius:3px;"></div></div>
                  </td>
                  <td><span class="role-badge-inline rb-employee">Healthy</span></td>
                  <td><button class="btn-act" style="padding:4px 8px; font-size:0.75rem;"><i class="fa-solid fa-ellipsis"></i></button></td>
                </tr>
                <tr>
                  <td><b>Database Sharding Phase 1</b><div style="font-size:0.75rem; color:var(--text-dim);">DB-55</div></td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;background:#8B5CF6;">J</div> Jessica W.</div></td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>88%</span><span>Under Review</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div style="width:88%; height:100%; background:var(--status-amber); border-radius:3px;"></div></div>
                  </td>
                  <td><span class="role-badge-inline rb-manager">At Risk</span></td>
                  <td><button class="btn-act" style="padding:4px 8px; font-size:0.75rem;"><i class="fa-solid fa-ellipsis"></i></button></td>
                </tr>
                <tr>
                  <td><b>SOC2 Compliance Audit</b><div style="font-size:0.75rem; color:var(--text-dim);">SEC-99</div></td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;background:#06B6D4;">A</div> Alex R.</div></td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>100%</span><span>Complete</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div style="width:100%; height:100%; background:var(--status-emerald); border-radius:3px;"></div></div>
                  </td>
                  <td><span class="role-badge-inline rb-employee" style="background:rgba(16,185,129,0.2);color:#A7F3D0;">Completed</span></td>
                  <td><button class="btn-act" style="padding:4px 8px; font-size:0.75rem;"><i class="fa-solid fa-ellipsis"></i></button></td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- New Project Modal (Hidden by default) -->
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
          </div>
          `;
      } else if (featureId === 'feat_team') {
        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">Team Workload & Capacity</h2>
            <div style="display:flex; gap:8px;">
              <button class="btn-secondary" style="padding:8px 16px;"><i class="fa-solid fa-filter"></i> Filter</button>
              <button class="btn-submit" onclick="autoBalanceTeam()"><i class="fa-solid fa-scale-balanced"></i> Auto-Balance</button>
            </div>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Avg Utilization</div><div class="stat-number" id="kpi-avg-util">82%</div></div>
            <div class="glass-card" style="padding:16px;"><div>Overallocated</div><div class="stat-number" id="kpi-overalloc" style="color:var(--status-amber);">2</div></div>
            <div class="glass-card" style="padding:16px;"><div>Available Capacity</div><div class="stat-number" id="kpi-capacity" style="color:var(--status-emerald);">145 hrs</div></div>
          </div>
          <div class="glass-card" style="padding:0; overflow:hidden;">
            <div style="padding:16px; border-bottom:1px solid var(--border-glass);">
              <b style="font-size:1.1rem;">Resource Allocation Heatmap</b>
            </div>
            <table class="org-table" id="team-table">
              <thead><tr><th>Team Member</th><th>Role</th><th>Open Tasks</th><th>Capacity</th><th>Action</th></tr></thead>
              <tbody>
                <tr id="team-row-haritha">
                  <td><div style="display:flex;align-items:center;gap:12px;"><div class="avatar" style="width:32px;height:32px;">H</div> <b>Haritha L.</b></div></td>
                  <td>Senior Dev</td>
                  <td class="task-count"><b>12</b> Tasks</td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span class="util-text">110% Utilized</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div class="util-bar" style="width:100%; height:100%; background:var(--status-rose); border-radius:3px; transition:all 0.5s;"></div></div>
                  </td>
                  <td><button class="btn-submit reallocate-btn" onclick="reallocateTask(this, 'team-row-haritha')" style="padding:4px 12px; font-size:0.75rem;">Reallocate</button></td>
                </tr>
                <tr id="team-row-rahul">
                  <td><div style="display:flex;align-items:center;gap:12px;"><div class="avatar" style="width:32px;height:32px;">R</div> <b>Rahul K.</b></div></td>
                  <td>Backend Dev</td>
                  <td class="task-count"><b>4</b> Tasks</td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span class="util-text">65% Utilized</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div class="util-bar" style="width:65%; height:100%; background:var(--status-emerald); border-radius:3px; transition:all 0.5s;"></div></div>
                  </td>
                  <td><button class="btn-secondary" style="padding:4px 12px; font-size:0.75rem;">Assign Task</button></td>
                </tr>
                <tr id="team-row-emily">
                  <td><div style="display:flex;align-items:center;gap:12px;"><div class="avatar" style="width:32px;height:32px;">E</div> <b>Emily Z.</b></div></td>
                  <td>UX Designer</td>
                  <td class="task-count"><b>7</b> Tasks</td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span class="util-text">85% Utilized</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div class="util-bar" style="width:85%; height:100%; background:var(--status-amber); border-radius:3px; transition:all 0.5s;"></div></div>
                  </td>
                  <td><button class="btn-act" style="padding:4px 12px; font-size:0.75rem;">View Board</button></td>
                </tr>
                <tr id="team-row-mark">
                  <td><div style="display:flex;align-items:center;gap:12px;"><div class="avatar" style="width:32px;height:32px;background:#F59E0B;">M</div> <b>Mark T.</b></div></td>
                  <td>Frontend Dev</td>
                  <td class="task-count"><b>14</b> Tasks</td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span class="util-text">120% Utilized</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div class="util-bar" style="width:100%; height:100%; background:var(--status-rose); border-radius:3px; transition:all 0.5s;"></div></div>
                  </td>
                  <td><button class="btn-submit reallocate-btn" onclick="reallocateTask(this, 'team-row-mark')" style="padding:4px 12px; font-size:0.75rem;">Reallocate</button></td>
                </tr>
                <tr id="team-row-jessica">
                  <td><div style="display:flex;align-items:center;gap:12px;"><div class="avatar" style="width:32px;height:32px;background:#8B5CF6;">J</div> <b>Jessica W.</b></div></td>
                  <td>QA Engineer</td>
                  <td class="task-count"><b>3</b> Tasks</td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span class="util-text">40% Utilized</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div class="util-bar" style="width:40%; height:100%; background:var(--status-emerald); border-radius:3px; transition:all 0.5s;"></div></div>
                  </td>
                  <td><button class="btn-secondary" style="padding:4px 12px; font-size:0.75rem;">Assign Task</button></td>
                </tr>
                <tr id="team-row-alex">
                  <td><div style="display:flex;align-items:center;gap:12px;"><div class="avatar" style="width:32px;height:32px;background:#06B6D4;">A</div> <b>Alex R.</b></div></td>
                  <td>DevOps Lead</td>
                  <td class="task-count"><b>6</b> Tasks</td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span class="util-text">70% Utilized</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div class="util-bar" style="width:70%; height:100%; background:var(--status-emerald); border-radius:3px; transition:all 0.5s;"></div></div>
                  </td>
                  <td><button class="btn-act" style="padding:4px 12px; font-size:0.75rem;">View Board</button></td>
                </tr>
              </tbody>
            </table>
          </div>`;
      } else if (featureId === 'feat_approvals') {
        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">Approvals Center</h2>
            <div style="display:flex; gap:8px;">
              <button class="btn-secondary" style="padding:8px 16px;">Bulk Actions</button>
            </div>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Pending Review</div><div class="stat-number" id="kpi-pending-approvals">7</div></div>
            <div class="glass-card" style="padding:16px;"><div>Approved (Week)</div><div class="stat-number" id="kpi-approved-week" style="color:var(--status-emerald);">45</div></div>
            <div class="glass-card" style="padding:16px;"><div>Avg Resolution</div><div class="stat-number">1.4 Days</div></div>
          </div>
          <div class="glass-card" style="padding:0; overflow:hidden;">
            <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; gap:16px;">
                <b style="font-size:1.1rem; border-bottom:2px solid var(--accent-primary); padding-bottom:8px;">Requires Action</b>
                <b style="font-size:1.1rem; color:var(--text-muted); padding-bottom:8px; cursor:pointer;">Recently Processed</b>
              </div>
              <input type="text" class="input-box" placeholder="Search requests..." style="width:200px; padding:6px 12px; font-size:0.85rem;" oninput="filterTable(this, 'approvals-table')">
            </div>
            <table class="org-table" id="approvals-table">
              <thead><tr><th>Req ID</th><th>Submitter</th><th>Type / Details</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                <tr>
                  <td>REQ-992</td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;">H</div> Haritha L.</div></td>
                  <td><b>3-Day Leave Request</b><div style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-check" style="color:var(--status-emerald)"></i> No deadline conflicts</div></td>
                  <td>Today, 09:15 AM</td>
                  <td>
                    <button class="btn-submit" onclick="approveRequest(this)" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-check"></i></button>
                    <button class="btn-secondary" onclick="denyRequest(this)" style="padding:4px 10px; font-size:0.75rem; border-color:var(--status-rose); color:var(--status-rose);"><i class="fa-solid fa-xmark"></i></button>
                  </td>
                </tr>
                <tr>
                  <td>EXP-401</td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;">D</div> David M.</div></td>
                  <td><b>Software License Expense</b><div style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-triangle-exclamation" style="color:var(--status-amber)"></i> $1,200 (Requires VP signoff)</div></td>
                  <td>Yesterday, 14:30</td>
                  <td>
                    <button class="btn-submit" onclick="approveRequest(this)" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-check"></i></button>
                    <button class="btn-secondary" onclick="denyRequest(this)" style="padding:4px 10px; font-size:0.75rem; border-color:var(--status-rose); color:var(--status-rose);"><i class="fa-solid fa-xmark"></i></button>
                  </td>
                </tr>
                <tr>
                  <td>REQ-988</td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;">P</div> Priya S.</div></td>
                  <td><b>Remote Work Setup</b><div style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-check" style="color:var(--status-emerald)"></i> Within policy limit</div></td>
                  <td>Mon, 11:00 AM</td>
                  <td>
                    <button class="btn-submit" onclick="approveRequest(this)" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-check"></i></button>
                    <button class="btn-secondary" onclick="denyRequest(this)" style="padding:4px 10px; font-size:0.75rem; border-color:var(--status-rose); color:var(--status-rose);"><i class="fa-solid fa-xmark"></i></button>
                  </td>
                </tr>
                <tr>
                  <td>EXP-415</td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;background:#F59E0B">M</div> Mark T.</div></td>
                  <td><b>Client Dinner Expense</b><div style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-triangle-exclamation" style="color:var(--status-amber)"></i> $340 (Missing receipt)</div></td>
                  <td>Fri, 18:45</td>
                  <td>
                    <button class="btn-submit" onclick="approveRequest(this)" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-check"></i></button>
                    <button class="btn-secondary" onclick="denyRequest(this)" style="padding:4px 10px; font-size:0.75rem; border-color:var(--status-rose); color:var(--status-rose);"><i class="fa-solid fa-xmark"></i></button>
                  </td>
                </tr>
                <tr>
                  <td>REQ-981</td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;background:#8B5CF6">J</div> Jessica W.</div></td>
                  <td><b>Hardware Upgrade</b><div style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-check" style="color:var(--status-emerald)"></i> Device older than 3 years</div></td>
                  <td>Wed, 09:12 AM</td>
                  <td>
                    <button class="btn-submit" onclick="approveRequest(this)" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-check"></i></button>
                    <button class="btn-secondary" onclick="denyRequest(this)" style="padding:4px 10px; font-size:0.75rem; border-color:var(--status-rose); color:var(--status-rose);"><i class="fa-solid fa-xmark"></i></button>
                  </td>
                </tr>
                <tr>
                  <td>ACC-112</td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;background:#06B6D4">A</div> Alex R.</div></td>
                  <td><b>AWS Prod Access</b><div style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-triangle-exclamation" style="color:var(--status-amber)"></i> Requires security clearance</div></td>
                  <td>Tue, 16:20</td>
                  <td>
                    <button class="btn-submit" onclick="approveRequest(this)" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-check"></i></button>
                    <button class="btn-secondary" onclick="denyRequest(this)" style="padding:4px 10px; font-size:0.75rem; border-color:var(--status-rose); color:var(--status-rose);"><i class="fa-solid fa-xmark"></i></button>
                  </td>
                </tr>
                <tr>
                  <td>REQ-975</td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;background:#EC4899">E</div> Emily Z.</div></td>
                  <td><b>Design Software Sub</b><div style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-check" style="color:var(--status-emerald)"></i> Approved vendor</div></td>
                  <td>Mon, 10:05 AM</td>
                  <td>
                    <button class="btn-submit" onclick="approveRequest(this)" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-check"></i></button>
                    <button class="btn-secondary" onclick="denyRequest(this)" style="padding:4px 10px; font-size:0.75rem; border-color:var(--status-rose); color:var(--status-rose);"><i class="fa-solid fa-xmark"></i></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>`;
      } else if (featureId === 'feat_reports') {
        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">Weekly Team Status Reports</h2>
            <button class="btn-submit" onclick="toast('New Report Template Created', 'success')"><i class="fa-solid fa-file-circle-plus"></i> New Report</button>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Reports Generated</div><div class="stat-number" id="kpi-reports">131</div></div>
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
                  <tr>
                    <td><b>Q3 Engineering Summary</b></td>
                    <td>AI Engine</td>
                    <td><span class="role-badge-pill" style="background:#F43F5E;color:white;">PDF</span></td>
                    <td>Jul 30, 2026</td>
                    <td><button class="btn-secondary" onclick="downloadFile(this, 'Q3_Engineering_Summary.pdf')" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-download"></i></button></td>
                  </tr>
                  <tr>
                    <td><b>Weekly Sprint Velocity</b></td>
                    <td>System Cron</td>
                    <td><span class="role-badge-pill" style="background:#10B981;color:white;">XLSX</span></td>
                    <td>Jul 28, 2026</td>
                    <td><button class="btn-secondary" onclick="downloadFile(this, 'Weekly_Sprint_Velocity.xlsx')" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-download"></i></button></td>
                  </tr>
                  <tr>
                    <td><b>Monthly Budget Burn</b></td>
                    <td>David M.</td>
                    <td><span class="role-badge-pill" style="background:#F43F5E;color:white;">PDF</span></td>
                    <td>Jul 01, 2026</td>
                    <td><button class="btn-secondary" onclick="downloadFile(this, 'Monthly_Budget_Burn.pdf')" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-download"></i></button></td>
                  </tr>
                  <tr>
                    <td><b>Q2 Retrospective Analysis</b></td>
                    <td>AI Engine</td>
                    <td><span class="role-badge-pill" style="background:#F59E0B;color:white;">PPTX</span></td>
                    <td>Jun 30, 2026</td>
                    <td><button class="btn-secondary" onclick="downloadFile(this, 'Q2_Retrospective.pptx')" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-download"></i></button></td>
                  </tr>
                  <tr>
                    <td><b>Q3 Hiring Pipeline</b></td>
                    <td>HR Connect</td>
                    <td><span class="role-badge-pill" style="background:#10B981;color:white;">CSV</span></td>
                    <td>Jun 25, 2026</td>
                    <td><button class="btn-secondary" onclick="downloadFile(this, 'Q3_Hiring.csv')" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-download"></i></button></td>
                  </tr>
                  <tr>
                    <td><b>Infrastructure Audit H1</b></td>
                    <td>System Cron</td>
                    <td><span class="role-badge-pill" style="background:#F43F5E;color:white;">PDF</span></td>
                    <td>Jun 15, 2026</td>
                    <td><button class="btn-secondary" onclick="downloadFile(this, 'Infra_Audit_H1.pdf')" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-download"></i></button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="glass-card" style="flex:1;">
              <b style="font-size:1.1rem; margin-bottom:16px; display:block;">Configure Automation</b>
              <div style="display:flex; flex-direction:column; gap:12px;">
                <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" checked style="accent-color:var(--accent-primary);"> Include Velocity Metrics</label>
                <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" checked style="accent-color:var(--accent-primary);"> Include Budget Burn</label>
                <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" style="accent-color:var(--accent-primary);"> Append Timesheet Data</label>
                <label style="display:flex; align-items:center; gap:8px;"><input type="checkbox" checked style="accent-color:var(--accent-primary);"> Send to Slack/Teams</label>
                <hr style="border:none; border-top:1px solid var(--border-glass); margin:8px 0;">
                <button class="btn-submit" onclick="toast('Config Saved. Reports will run on Sunday 23:00', 'success')">Save Configuration</button>
              </div>
            </div>
          </div>`;
      } else if (featureId === 'feat_meetings') {
        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">Meetings & Calendar</h2>
            <button class="btn-submit" onclick="toast('Meeting Scheduled', 'success')"><i class="fa-solid fa-video"></i> Schedule Meeting</button>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Hours in Meetings (Week)</div><div class="stat-number">14.5</div></div>
            <div class="glass-card" style="padding:16px;"><div>Focus Time Available</div><div class="stat-number" style="color:var(--status-emerald);">22 hrs</div></div>
            <div class="glass-card" style="padding:16px;"><div>Meeting Acceptance</div><div class="stat-number" style="color:var(--status-amber);">89%</div></div>
          </div>
          <div class="glass-card" style="padding:0; overflow:hidden;">
            <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between;">
              <b style="font-size:1.1rem;">Upcoming Schedule</b>
              <div style="font-size:0.85rem; color:var(--text-muted);"><i class="fa-regular fa-calendar"></i> Today</div>
            </div>
            <table class="org-table">
              <thead><tr><th>Time</th><th>Meeting Title</th><th>Organizer</th><th>Attendees</th><th>Action</th></tr></thead>
              <tbody>
                <tr>
                  <td><b>10:00 AM</b><div style="font-size:0.75rem; color:var(--text-muted);">45 mins</div></td>
                  <td><b>Engineering Sync</b><div style="font-size:0.75rem; color:var(--text-dim);">Weekly status update</div></td>
                  <td>David M.</td>
                  <td><div style="display:flex;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;margin-left:-8px;z-index:3;">H</div><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;margin-left:-8px;z-index:2;background:#8B5CF6;">J</div><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;margin-left:-8px;z-index:1;background:#F59E0B;">M</div></div></td>
                  <td><button class="btn-submit" onclick="joinMeeting(this)" style="padding:4px 12px; font-size:0.75rem; background:var(--accent-primary);">Join Teams</button></td>
                </tr>
                <tr>
                  <td><b>1:30 PM</b><div style="font-size:0.75rem; color:var(--text-muted);">30 mins</div></td>
                  <td><b>1:1 with Haritha</b><div style="font-size:0.75rem; color:var(--text-dim);">Performance check-in</div></td>
                  <td>David M.</td>
                  <td><div style="display:flex;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;margin-left:-8px;z-index:3;">H</div></div></td>
                  <td><button class="btn-act" onclick="joinMeeting(this)" style="padding:4px 12px; font-size:0.75rem;">Join Zoom</button></td>
                </tr>
                <tr>
                  <td><b>3:00 PM</b><div style="font-size:0.75rem; color:var(--text-muted);">60 mins</div></td>
                  <td><b>Q3 Planning Workshop</b><div style="font-size:0.75rem; color:var(--text-dim);">Cross-functional alignment</div></td>
                  <td>Sarah J.</td>
                  <td><div style="font-size:0.8rem;color:var(--text-muted);">+ 12 others</div></td>
                  <td><button class="btn-act" onclick="joinMeeting(this)" style="padding:4px 12px; font-size:0.75rem;">Join Teams</button></td>
                </tr>
              </tbody>
            </table>
          </div>`;
      } else if (featureId === 'feat_decision') {
        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">AI Decision Center</h2>
            <button class="btn-secondary" onclick="toast('Audit Log Exported', 'success')"><i class="fa-solid fa-file-export"></i> Export Audit</button>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Decisions Automated</div><div class="stat-number" id="kpi-decisions">3,492</div></div>
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
                  <tr>
                    <td><b>Budget Reallocation</b></td>
                    <td>Q3 Marketing</td>
                    <td>
                      <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>97%</span></div>
                      <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px;"><div style="width:97%; height:100%; background:var(--status-emerald); border-radius:2px;"></div></div>
                    </td>
                    <td class="decision-status"><span class="role-badge-inline rb-manager" style="border-color:var(--status-emerald); color:var(--status-emerald);">Recommended</span></td>
                    <td><button class="btn-submit exec-decision-btn" onclick="executeDecision(this)" style="padding:4px 8px; font-size:0.75rem;">Execute</button></td>
                  </tr>
                  <tr>
                    <td><b>Security Policy Exemption</b></td>
                    <td>IT Infrastructure</td>
                    <td>
                      <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>62%</span></div>
                      <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px;"><div style="width:62%; height:100%; background:var(--status-amber); border-radius:2px;"></div></div>
                    </td>
                    <td class="decision-status"><span class="role-badge-inline rb-hr" style="border-color:var(--status-amber); color:var(--status-amber);">Escalated</span></td>
                    <td><button class="btn-act" onclick="toast('Escalation opened for review.', 'info')" style="padding:4px 8px; font-size:0.75rem;">Review</button></td>
                  </tr>
                  <tr>
                    <td><b>Leave Approval</b></td>
                    <td>Engineering</td>
                    <td>
                      <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>99%</span></div>
                      <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px;"><div style="width:99%; height:100%; background:var(--status-emerald); border-radius:2px;"></div></div>
                    </td>
                    <td class="decision-status"><span class="role-badge-inline rb-manager" style="border-color:var(--status-emerald); color:var(--status-emerald);">Auto-Executed</span></td>
                    <td><button class="btn-act" onclick="toast('Showing execution details...', 'info')" style="padding:4px 8px; font-size:0.75rem;">Details</button></td>
                  </tr>
                  <tr>
                    <td><b>Vendor Contract Renewal</b></td>
                    <td>Operations</td>
                    <td>
                      <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>91%</span></div>
                      <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px;"><div style="width:91%; height:100%; background:var(--status-emerald); border-radius:2px;"></div></div>
                    </td>
                    <td class="decision-status"><span class="role-badge-inline rb-manager" style="border-color:var(--status-emerald); color:var(--status-emerald);">Recommended</span></td>
                    <td><button class="btn-submit exec-decision-btn" onclick="executeDecision(this)" style="padding:4px 8px; font-size:0.75rem;">Execute</button></td>
                  </tr>
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
                <button class="btn-secondary" style="width:100%; font-size:0.85rem;">View Full Trace</button>
              </div>
            </div>
          </div>`;"""

    # Extra javascript logic for the interactivity to append before </script>
    interactive_js = """
    // --- Added Manager Portal Interactivity JS ---
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
      
      const tbody = document.getElementById('projects-tbody');
      if (tbody) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><b>${name}</b><div style="font-size:0.75rem; color:var(--text-dim);">PRJ-NEW</div></td>
          <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;background:var(--accent-primary)">N</div> ${lead}</div></td>
          <td>
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>0%</span><span>Planning</span></div>
            <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div style="width:0%; height:100%; background:var(--status-emerald); border-radius:3px;"></div></div>
          </td>
          <td><span class="role-badge-inline rb-employee">Started</span></td>
          <td><button class="btn-act" style="padding:4px 8px; font-size:0.75rem;"><i class="fa-solid fa-ellipsis"></i></button></td>
        `;
        tbody.prepend(tr);
        
        let kpi = document.getElementById('kpi-total-projects');
        if (kpi) kpi.innerText = parseInt(kpi.innerText) + 1;
      }
      
      document.getElementById('new-project-modal').style.display = 'none';
      toast('Project "' + name + '" created successfully!', 'success');
    }

    function approveRequest(btn) {
      let row = btn.closest('tr');
      row.style.transition = 'all 0.3s ease';
      row.style.opacity = '0';
      row.style.transform = 'translateX(-20px)';
      
      setTimeout(() => {
        row.remove();
        let pending = document.getElementById('kpi-pending-approvals');
        if (pending) pending.innerText = Math.max(0, parseInt(pending.innerText) - 1);
        let approved = document.getElementById('kpi-approved-week');
        if (approved) approved.innerText = parseInt(approved.innerText) + 1;
        toast('Request Approved and Processed', 'success');
      }, 300);
    }

    function denyRequest(btn) {
      let row = btn.closest('tr');
      row.style.transition = 'all 0.3s ease';
      row.style.opacity = '0';
      row.style.transform = 'translateX(20px)';
      
      setTimeout(() => {
        row.remove();
        let pending = document.getElementById('kpi-pending-approvals');
        if (pending) pending.innerText = Math.max(0, parseInt(pending.innerText) - 1);
        toast('Request Denied', 'error');
      }, 300);
    }

    function autoBalanceTeam() {
      toast('AI Auto-balancing workload across team...', 'info');
      setTimeout(() => {
        document.querySelectorAll('.util-bar').forEach(bar => {
          bar.style.width = '80%';
          bar.style.background = 'var(--status-emerald)';
        });
        document.querySelectorAll('.util-text').forEach(txt => {
          txt.innerText = '80% Utilized';
        });
        document.querySelectorAll('.task-count').forEach(tc => {
          tc.innerHTML = '<b>8</b> Tasks';
        });
        
        let overalloc = document.getElementById('kpi-overalloc');
        if (overalloc) { overalloc.innerText = '0'; overalloc.style.color = 'var(--status-emerald)'; }
        
        toast('Workload successfully balanced!', 'success');
      }, 1000);
    }
    
    function reallocateTask(btn, rowId) {
      toast('Reallocating tasks to available members...', 'info');
      setTimeout(() => {
        let row = document.getElementById(rowId);
        if(row) {
          row.querySelector('.util-bar').style.width = '85%';
          row.querySelector('.util-bar').style.background = 'var(--status-amber)';
          row.querySelector('.util-text').innerText = '85% Utilized';
          row.querySelector('.task-count').innerHTML = '<b>9</b> Tasks';
        }
        btn.innerText = 'Assign Task';
        btn.className = 'btn-secondary';
        
        let overalloc = document.getElementById('kpi-overalloc');
        if (overalloc) { 
           let val = parseInt(overalloc.innerText) - 1;
           overalloc.innerText = Math.max(0, val);
           if (val <= 0) overalloc.style.color = 'var(--status-emerald)';
        }
        toast('Tasks reallocated successfully.', 'success');
      }, 600);
    }

    function downloadFile(btn, filename) {
      let originalHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        toast('Downloaded ' + filename, 'success');
      }, 800);
    }

    function executeDecision(btn) {
      let row = btn.closest('tr');
      let statusCell = row.querySelector('.decision-status');
      
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      setTimeout(() => {
        btn.innerHTML = 'Details';
        btn.className = 'btn-act';
        btn.onclick = () => toast('Showing details...', 'info');
        
        statusCell.innerHTML = '<span class="role-badge-inline rb-employee" style="background:rgba(16,185,129,0.2);color:#A7F3D0;">Executed</span>';
        
        let decKpi = document.getElementById('kpi-decisions');
        if (decKpi) { decKpi.innerText = (parseInt(decKpi.innerText.replace(',','')) + 1).toLocaleString(); }
        
        toast('AI Decision executed automatically!', 'success');
      }, 700);
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
    
    function joinMeeting(btn) {
      let iconHtml = btn.innerHTML.includes('Zoom') ? '<i class="fa-solid fa-video"></i>' : '<i class="fa-solid fa-users"></i>';
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Joining...';
      setTimeout(() => {
        btn.innerHTML = iconHtml + ' Connected';
        btn.style.background = 'var(--status-emerald)';
        toast('Connected to meeting audio/video.', 'success');
      }, 1000);
    }
    // ----------------------------------------------
"""

    pattern = re.compile(r'\s*// MANAGER PORTAL VIEWS\s*} else if \(featureId === \'feat_projects\'\) \{.*?(?=\s*} else \{\s*container\.innerHTML = `)', re.DOTALL)
    
    if pattern.search(html):
        html = pattern.sub('\n' + new_manager_views, html)
        
        # Append interactive JS right before the last closing script tag
        script_close_idx = html.rfind('</script>')
        if script_close_idx != -1:
            html = html[:script_close_idx] + interactive_js + "\n  " + html[script_close_idx:]
            
        with open('app/index.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("Successfully updated manager portal views with interactivity.")
    else:
        print("Pattern not found! Please check regex.")

if __name__ == '__main__':
    main()
