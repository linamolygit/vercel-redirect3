const fs = require('fs');

let content = fs.readFileSync('pages/analytics/[id].tsx', 'utf8');

// Update standard classes to Apple Glass
content = content.replace(/className="dashboard-layout"/g, 'className="studio-layout" style={{ display: "flex", flexDirection: "column", flex: 1, padding: "20px" }}');

// Replace stat card logic
content = content.replace(/className={\`stat-card stat-\${color}\`}/g, 'className="glass-panel" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px", flex: 1, minWidth: "220px", borderTop: `4px solid var(--${color} == "purple" ? "primary" : "border")` }}');

// Replace chart card logic
content = content.replace(/className="chart-card"/g, 'className="glass-panel" style={{ padding: "24px", flex: 1, minWidth: "300px" }}');
content = content.replace(/className="chart-card full"/g, 'className="glass-panel" style={{ padding: "24px", width: "100%" }}');

// Use btn-primary and btn-secondary
content = content.replace(/className="btn-back"/g, 'className="btn-secondary" style={{ padding: "10px 16px" }}');
content = content.replace(/className="btn-search"/g, 'className="btn-primary"');

// Fix the CSS Variables
const varMap = {
  '--card-bg, rgba(255,255,255,0.05)': '--glass-bg',
  '--card-border, rgba(255,255,255,0.1)': '--glass-border',
  '--card-bg, rgba(255,255,255,0.04)': '--glass-bg',
  '--card-border, rgba(255,255,255,0.08)': '--glass-border',
  '--text-muted, #9ca3af': '--text-muted',
  '--text': '--text-main',
  '--bg': '--bg-main'
};

for (const [oldVar, newVar] of Object.entries(varMap)) {
  content = content.replace(new RegExp(`var\\(${oldVar.replace(/,/g, ',?')}\\)`, 'g'), `var(${newVar})`);
}

// Write it back
fs.writeFileSync('pages/analytics/[id].tsx', content, 'utf8');
console.log('File updated successfully.');
