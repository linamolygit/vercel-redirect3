const fs = require('fs');
const files = ['pages/pricing.tsx', 'pages/terms.tsx', 'pages/privacy.tsx', 'pages/contact.tsx'];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove background glows
  content = content.replace(/<div className="background-glows">[\s\S]*?<\/div>\s*<\/div>/g, '');
  
  // Remove JSX styles
  content = content.replace(/<style jsx>{`[\s\S]*?`}<\/style>/g, '');
  
  // Update classes
  content = content.replace(/className="pricing-card"/g, 'className="glass-panel" style={{ padding: "40px", flex: 1, minWidth: "300px" }}');
  content = content.replace(/className="pricing-card featured"/g, 'className="glass-panel" style={{ padding: "40px", flex: 1, minWidth: "300px", border: "2px solid var(--primary)" }}');
  content = content.replace(/className="contact-card"/g, 'className="glass-panel" style={{ padding: "40px" }}');
  
  content = content.replace(/className="container"/g, 'className="studio-layout" style={{ flexDirection: "column", padding: "40px 20px" }}');
  
  content = content.replace(/className="wrapper"/g, 'style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}');

  fs.writeFileSync(file, content, 'utf8');
}
console.log('Static pages refactored.');
