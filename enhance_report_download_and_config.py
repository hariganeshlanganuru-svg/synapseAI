import re

def main():
    with open('app/index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Update downloadFile function to output rich structured report content
    rich_download_func = """function downloadFile(btn, filename) {
  let originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  setTimeout(() => {
    btn.innerHTML = originalHtml;
    const cfg = window.managerState.reportConfig;
    const reportTitle = filename.replace(/\\.[^/.]+$/, "").replace(/_/g, " ");

    const content = `
================================================================================
                       SYNAPSE AI ENTERPRISE REPORT
================================================================================
REPORT TITLE:      ${reportTitle.toUpperCase()}
FILE NAME:         ${filename}
GENERATION DATE:   ${new Date().toLocaleString()}
SECURITY CLASS:    CONFIDENTIAL - MANAGER LEVEL 3 AUDITED
STATION ID:        SYNAPSE-PROD-SERVER-09

--------------------------------------------------------------------------------
1. EXECUTIVE SUMMARY & KEY METRICS
--------------------------------------------------------------------------------
This report summarizes operational metrics and engineering performance for 
Q3 2026. Overall department health stands at 86% across active initiatives.

- Total Active Projects: 27
- Healthy / On Track: 20
- At Risk (Bandwidth/Delay): 5
- Blocked (Security/Budget): 2
- Average Team Capacity Utilization: 78.4%
- Average Read Rate: 86%

--------------------------------------------------------------------------------
2. ACTIVE AUTOMATION CONFIGURATION
--------------------------------------------------------------------------------
Velocity Metrics Tracking:   ${cfg.velocity ? 'ENABLED [Active]' : 'DISABLED'}
Budget Burn Monitoring:      ${cfg.budget ? 'ENABLED [Active]' : 'DISABLED'}
Timesheet Audit Log:         ${cfg.timesheet ? 'ENABLED [Active]' : 'DISABLED'}
Slack / Teams Integration:   ${cfg.slack ? 'ENABLED [Active]' : 'DISABLED'}

--------------------------------------------------------------------------------
3. PROJECT HEALTH BREAKDOWN
--------------------------------------------------------------------------------
[PRJ-INFRA-902] SynapseAI Core OS    - 96% Progress - Lead: Haritha L. (Healthy)
[PRJ-AI-105]    RAG Pipeline v2      - 65% Progress - Lead: Rahul K.   (At Risk)
[PRJ-OPS-404]   Cloud Migration EU   - 42% Progress - Lead: Sarah J.   (Blocked)
[PRJ-MOB-120]   Mobile App Re-arch   - 15% Progress - Lead: Mark T.    (Healthy)
[PRJ-DB-55]     Database Sharding    - 88% Progress - Lead: Jessica W. (At Risk)
[PRJ-SEC-99]    SOC2 Audit           - 100% Progress- Lead: Alex R.    (Completed)

--------------------------------------------------------------------------------
4. AUTHORIZATION & AUDIT SIGNATURE
--------------------------------------------------------------------------------
DIGITAL SIGNATURE: 0x8F9A4C2B7E1D8801A9C
AUDIT STATUS: VERIFIED BY AI OS KERNEL (LLAMA 3.3 70B)
================================================================================
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Downloaded ' + filename + ' with full enterprise data!', 'success');
  }, 600);
}"""

    # Replace downloadFile implementation
    html = re.sub(r'function downloadFile\(btn, filename\)\s*\{.*?\}\n\}', rich_download_func, html, flags=re.DOTALL)

    # 2. Update saveReportConfiguration function to re-render feat_reports so user sees the live Active Policy Status!
    rich_save_cfg_func = """function saveReportConfiguration() {
  const vel = document.getElementById('cfg-vel') ? document.getElementById('cfg-vel').checked : true;
  const bud = document.getElementById('cfg-bud') ? document.getElementById('cfg-bud').checked : true;
  const ts = document.getElementById('cfg-ts') ? document.getElementById('cfg-ts').checked : false;
  const slack = document.getElementById('cfg-slack') ? document.getElementById('cfg-slack').checked : true;

  window.managerState.reportConfig = { velocity: vel, budget: bud, timesheet: ts, slack: slack };
  toast('Report Automation Configuration Saved!', 'success');
  renderRoleFeatureView('feat_reports');
}"""

    html = re.sub(r'function saveReportConfiguration\(\)\s*\{.*?\}', rich_save_cfg_func, html, flags=re.DOTALL)

    # 3. Add "Active Policy Status" badge under Configure Automation in feat_reports HTML template
    old_cfg_card_html = """                <button class="btn-submit" onclick="saveReportConfiguration()">Save Configuration</button>
              </div>
            </div>
          </div>`"""

    new_cfg_card_html = """                <button class="btn-submit" onclick="saveReportConfiguration()" style="width:100%;">Save Configuration</button>
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
          </div>`"""

    if old_cfg_card_html in html:
        html = html.replace(old_cfg_card_html, new_cfg_card_html)
        print("Successfully added Active Policy Status to feat_reports HTML!")
    else:
        print("Config card HTML pattern not found, performing regex replacement...")
        html = re.sub(
            r'<button class="btn-submit" onclick="saveReportConfiguration\(\)">Save Configuration</button>\s*</div>\s*</div>\s*</div>`',
            new_cfg_card_html,
            html
        )

    with open('app/index.html', 'w', encoding='utf-8') as f:
        f.write(html)

    print("Successfully enhanced report content & active configuration status!")

if __name__ == '__main__':
    main()
