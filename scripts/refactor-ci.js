const fs = require('fs');

let content = fs.readFileSync('pages/clickable-image.tsx', 'utf8');

// Update Layout wrappers
content = content.replace(/<div className="ci-body">/g, '<div className="studio-layout">');
content = content.replace(/<div className="ci-controls">/g, '<aside className="sidebar glass-panel">');
content = content.replace(/<div className="ci-main">/g, '<main className="workspace">');

// We have </div> closing tags that need to change to </aside> and </main>
// Looking at the file, the closing tags are located after the corresponding content.
// Since replacing closing tags based on position is tricky, let's just use <div> for layout but give them the proper class names.
// Wait, in my index.tsx I used <aside> and <main>. In clickable-image, I can just leave them as <div> and just change the className.

content = fs.readFileSync('pages/clickable-image.tsx', 'utf8');
content = content.replace(/<div className="ci-body">/g, '<div className="studio-layout">');
content = content.replace(/<div className="ci-controls">/g, '<div className="sidebar glass-panel">');
content = content.replace(/<div className="ci-main">/g, '<div className="workspace">');


// Now replace old variables with new Apple Glass variables
const varMap = {
  '--card-bg': '--glass-bg',
  '--card-border': '--glass-border',
  '--text': '--text-main',
  '--input-border': '--glass-border'
};

for (const [oldVar, newVar] of Object.entries(varMap)) {
  content = content.replace(new RegExp(`var\\(${oldVar}\\)`, 'g'), `var(${newVar})`);
}

// Remove the `ci-page` padding since `studio-layout` handles it, or keep it.
// Let's replace btn-download and btn-upload-imgbb to use btn-primary / btn-secondary logic or keep them if they are styled in the jsx.
// The embedded <style jsx> handles their styling. We just let it be.

// Apply some button mappings just in case
content = content.replace(/className="btn-convert"/g, 'className="btn-primary" style={{width:"100%", padding:"16px", fontSize:"16px"}}');

fs.writeFileSync('pages/clickable-image.tsx', content, 'utf8');
console.log('File updated successfully.');
