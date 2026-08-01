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
            <button class="btn-submit" onclick="toast('New Project Initiated', 'success')"><i class="fa-solid fa-plus"></i> New Project</button>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Total Active Projects</div><div class="stat-number">24</div></div>
            <div class="glass-card" style="padding:16px;"><div>On Track</div><div class="stat-number" style="color:var(--status-emerald);">18</div></div>
            <div class="glass-card" style="padding:16px;"><div>At Risk</div><div class="stat-number" style="color:var(--status-amber);">4</div></div>
            <div class="glass-card" style="padding:16px;"><div>Blocked</div><div class="stat-number" style="color:var(--status-rose);">2</div></div>
          </div>
          <div class="glass-card" style="padding:0; overflow:hidden;">
            <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between;">
              <b style="font-size:1.1rem;">Project Portfolio</b>
              <input type="text" class="input-box" placeholder="Search projects..." style="width:250px; padding:6px 12px; font-size:0.85rem;">
            </div>
            <table class="org-table">
              <thead><tr><th>Project Name</th><th>Lead</th><th>Progress</th><th>Health</th><th>Actions</th></tr></thead>
              <tbody>
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
              </tbody>
            </table>
          </div>`;
      } else if (featureId === 'feat_team') {
        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">Team Workload & Capacity</h2>
            <div style="display:flex; gap:8px;">
              <button class="btn-secondary" style="padding:8px 16px;"><i class="fa-solid fa-filter"></i> Filter</button>
              <button class="btn-submit" onclick="toast('Workload Balanced', 'success')"><i class="fa-solid fa-scale-balanced"></i> Auto-Balance</button>
            </div>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Avg Utilization</div><div class="stat-number">82%</div></div>
            <div class="glass-card" style="padding:16px;"><div>Overallocated</div><div class="stat-number" style="color:var(--status-amber);">2</div></div>
            <div class="glass-card" style="padding:16px;"><div>Available Capacity</div><div class="stat-number" style="color:var(--status-emerald);">145 hrs</div></div>
          </div>
          <div class="glass-card" style="padding:0; overflow:hidden;">
            <div style="padding:16px; border-bottom:1px solid var(--border-glass);">
              <b style="font-size:1.1rem;">Resource Allocation Heatmap</b>
            </div>
            <table class="org-table">
              <thead><tr><th>Team Member</th><th>Role</th><th>Open Tasks</th><th>Capacity</th><th>Action</th></tr></thead>
              <tbody>
                <tr>
                  <td><div style="display:flex;align-items:center;gap:12px;"><div class="avatar" style="width:32px;height:32px;">H</div> <b>Haritha L.</b></div></td>
                  <td>Senior Dev</td>
                  <td><b>12</b> Tasks</td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>110% Utilized</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div style="width:100%; height:100%; background:var(--status-rose); border-radius:3px;"></div></div>
                  </td>
                  <td><button class="btn-submit" onclick="toast('2 tasks reallocated', 'success')" style="padding:4px 12px; font-size:0.75rem;">Reallocate</button></td>
                </tr>
                <tr>
                  <td><div style="display:flex;align-items:center;gap:12px;"><div class="avatar" style="width:32px;height:32px;">R</div> <b>Rahul K.</b></div></td>
                  <td>Backend Dev</td>
                  <td><b>4</b> Tasks</td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>65% Utilized</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div style="width:65%; height:100%; background:var(--status-emerald); border-radius:3px;"></div></div>
                  </td>
                  <td><button class="btn-secondary" style="padding:4px 12px; font-size:0.75rem;">Assign Task</button></td>
                </tr>
                <tr>
                  <td><div style="display:flex;align-items:center;gap:12px;"><div class="avatar" style="width:32px;height:32px;">E</div> <b>Emily Z.</b></div></td>
                  <td>UX Designer</td>
                  <td><b>7</b> Tasks</td>
                  <td>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>85% Utilized</span></div>
                    <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px;"><div style="width:85%; height:100%; background:var(--status-amber); border-radius:3px;"></div></div>
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
            <div class="glass-card" style="padding:16px;"><div>Pending Review</div><div class="stat-number">12</div></div>
            <div class="glass-card" style="padding:16px;"><div>Approved (Week)</div><div class="stat-number" style="color:var(--status-emerald);">45</div></div>
            <div class="glass-card" style="padding:16px;"><div>Avg Resolution</div><div class="stat-number">1.4 Days</div></div>
          </div>
          <div class="glass-card" style="padding:0; overflow:hidden;">
            <div style="padding:16px; border-bottom:1px solid var(--border-glass); display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; gap:16px;">
                <b style="font-size:1.1rem; border-bottom:2px solid var(--accent-primary); padding-bottom:8px;">Requires Action (12)</b>
                <b style="font-size:1.1rem; color:var(--text-muted); padding-bottom:8px;">Recently Processed</b>
              </div>
              <input type="text" class="input-box" placeholder="Search requests..." style="width:200px; padding:6px 12px; font-size:0.85rem;">
            </div>
            <table class="org-table">
              <thead><tr><th>Req ID</th><th>Submitter</th><th>Type / Details</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                <tr>
                  <td>REQ-992</td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;">H</div> Haritha L.</div></td>
                  <td><b>3-Day Leave Request</b><div style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-check" style="color:var(--status-emerald)"></i> No deadline conflicts</div></td>
                  <td>Today, 09:15 AM</td>
                  <td>
                    <button class="btn-submit" onclick="toast('Approved', 'success')" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-check"></i></button>
                    <button class="btn-secondary" onclick="toast('Denied', 'error')" style="padding:4px 10px; font-size:0.75rem; border-color:var(--status-rose); color:var(--status-rose);"><i class="fa-solid fa-xmark"></i></button>
                  </td>
                </tr>
                <tr>
                  <td>EXP-401</td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;">D</div> David M.</div></td>
                  <td><b>Software License Expense</b><div style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-triangle-exclamation" style="color:var(--status-amber)"></i> $1,200 (Requires VP signoff)</div></td>
                  <td>Yesterday, 14:30</td>
                  <td>
                    <button class="btn-submit" onclick="toast('Approved', 'success')" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-check"></i></button>
                    <button class="btn-secondary" onclick="toast('Denied', 'error')" style="padding:4px 10px; font-size:0.75rem; border-color:var(--status-rose); color:var(--status-rose);"><i class="fa-solid fa-xmark"></i></button>
                  </td>
                </tr>
                <tr>
                  <td>REQ-988</td>
                  <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:0.7rem;">P</div> Priya S.</div></td>
                  <td><b>Remote Work Setup</b><div style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-check" style="color:var(--status-emerald)"></i> Within policy limit</div></td>
                  <td>Mon, 11:00 AM</td>
                  <td>
                    <button class="btn-submit" onclick="toast('Approved', 'success')" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-check"></i></button>
                    <button class="btn-secondary" onclick="toast('Denied', 'error')" style="padding:4px 10px; font-size:0.75rem; border-color:var(--status-rose); color:var(--status-rose);"><i class="fa-solid fa-xmark"></i></button>
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
            <div class="glass-card" style="padding:16px;"><div>Reports Generated</div><div class="stat-number">128</div></div>
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
                    <td><button class="btn-secondary" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-download"></i></button></td>
                  </tr>
                  <tr>
                    <td><b>Weekly Sprint Velocity</b></td>
                    <td>System Cron</td>
                    <td><span class="role-badge-pill" style="background:#10B981;color:white;">XLSX</span></td>
                    <td>Jul 28, 2026</td>
                    <td><button class="btn-secondary" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-download"></i></button></td>
                  </tr>
                  <tr>
                    <td><b>Monthly Budget Burn</b></td>
                    <td>David M.</td>
                    <td><span class="role-badge-pill" style="background:#F43F5E;color:white;">PDF</span></td>
                    <td>Jul 01, 2026</td>
                    <td><button class="btn-secondary" style="padding:4px 10px; font-size:0.75rem;"><i class="fa-solid fa-download"></i></button></td>
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
                <hr style="border:none; border-top:1px solid var(--border-glass); margin:8px 0;">
                <button class="btn-submit" onclick="toast('Config Saved', 'success')">Save Configuration</button>
              </div>
            </div>
          </div>`;
      } else if (featureId === 'feat_decision') {
        container.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-family:'Outfit'; font-size:1.6rem;">AI Decision Center</h2>
            <button class="btn-secondary" onclick="toast('Audit Log Exported', 'success')"><i class="fa-solid fa-file-export"></i> Export Audit</button>
          </div>
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="glass-card" style="padding:16px;"><div>Decisions Automated</div><div class="stat-number">3,492</div></div>
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
                    <td><span class="role-badge-inline rb-manager" style="border-color:var(--status-emerald); color:var(--status-emerald);">Auto-Approved</span></td>
                    <td><button class="btn-act" style="padding:4px 8px; font-size:0.75rem;">Details</button></td>
                  </tr>
                  <tr>
                    <td><b>Security Policy Exemption</b></td>
                    <td>IT Infrastructure</td>
                    <td>
                      <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>62%</span></div>
                      <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px;"><div style="width:62%; height:100%; background:var(--status-amber); border-radius:2px;"></div></div>
                    </td>
                    <td><span class="role-badge-inline rb-hr" style="border-color:var(--status-amber); color:var(--status-amber);">Escalated</span></td>
                    <td><button class="btn-act" style="padding:4px 8px; font-size:0.75rem;">Review</button></td>
                  </tr>
                  <tr>
                    <td><b>Leave Approval</b></td>
                    <td>Engineering</td>
                    <td>
                      <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;"><span>99%</span></div>
                      <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px;"><div style="width:99%; height:100%; background:var(--status-emerald); border-radius:2px;"></div></div>
                    </td>
                    <td><span class="role-badge-inline rb-manager" style="border-color:var(--status-emerald); color:var(--status-emerald);">Auto-Approved</span></td>
                    <td><button class="btn-act" style="padding:4px 8px; font-size:0.75rem;">Details</button></td>
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

    # We need to replace the section in html starting with `      // MANAGER PORTAL VIEWS\n      } else if (featureId === 'feat_projects') {`
    # and ending right before `      } else {\n        container.innerHTML = `
    
    # We can use regex to find this block and replace it.
    pattern = re.compile(r'\s*// MANAGER PORTAL VIEWS\s*} else if \(featureId === \'feat_projects\'\) \{.*?(?=\s*} else \{\s*container\.innerHTML = `)', re.DOTALL)
    
    if pattern.search(html):
        new_html = pattern.sub('\n' + new_manager_views, html)
        with open('app/index.html', 'w', encoding='utf-8') as f:
            f.write(new_html)
        print("Successfully replaced manager portal views.")
    else:
        print("Pattern not found! Please check regex.")

if __name__ == '__main__':
    main()
