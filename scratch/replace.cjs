const fs = require('fs');
let code = fs.readFileSync('public/app.js', 'utf8');

// Helper injection
code = code.replace(
  'const $ = (sel, el = document) => el.querySelector(sel);',
  "const $ = (sel, el = document) => el.querySelector(sel);\nconst icon = (name, cls = '') => h('i', { 'data-lucide': name, class: cls });"
);

// Call lucide.createIcons() globally
code = code.replace(
  'const state = {',
  "const state = {\n  runIcons: () => setTimeout(() => window.lucide && window.lucide.createIcons(), 0),"
);

// Run after render
code = code.replace(
  'app.replaceChildren(state.user ? Shell() : AuthView());',
  "app.replaceChildren(state.user ? Shell() : AuthView());\n  state.runIcons();"
);

code = code.replace(/toast\('📥 CSV report downloaded!'\);/g, "toast('CSV report downloaded!');");

// Replace select options
code = code.replace(/'🎓 Student'/g, "'Student'");
code = code.replace(/'👩‍🏫 Faculty'/g, "'Faculty'");
code = code.replace(/'🔧 Department Staff'/g, "'Department Staff'");
code = code.replace(/'🛡️ System Administrator'/g, "'System Administrator'");

// Auth headers
code = code.replace(/logoIcon = '🏫';/g, "logoIcon = 'school';");
code = code.replace(/logoIcon = '🛡️';/g, "logoIcon = 'shield';");
code = code.replace(/logoIcon = '👨‍🔧';/g, "logoIcon = 'user-cog';");
code = code.replace(/logoIcon = '🎓';/g, "logoIcon = 'graduation-cap';");

code = code.replace(/h\('div', \{ class: 'auth-brand-logo' \}, logoIcon\)/g, "h('div', { class: 'auth-brand-logo' }, icon(logoIcon))");
code = code.replace(/h\('div', \{ class: 'auth-brand-logo' \}, '🏫'\)/g, "h('div', { class: 'auth-brand-logo' }, icon('school'))");


code = code.replace(/'🛡️ System Administrator'/g, "'System Administrator'");
code = code.replace(/'🔧 Staff Member'/g, "'Staff Member'");
code = code.replace(/'🛡️ Admin'/g, "'Admin'");
code = code.replace(/'⚠️ Admin accounts receive full routing and user management access.'/g, "'Admin accounts receive full routing and user management access.'");

// Buttons and text
code = code.replace(/'✏️ Edit Notice'/g, "[icon('edit-2', 'icon-sm'), ' Edit Notice']");
code = code.replace(/'✏️ Edit Campus Maintenance Announcement'/g, "'Edit Campus Maintenance Announcement'");
code = code.replace(/'📷 Scan Classroom QR'/g, "[icon('qr-code', 'icon-sm'), ' Scan Classroom QR']");
code = code.replace(/'📸 Snap Photo'/g, "[icon('camera', 'icon-sm'), ' Snap Photo']");
code = code.replace(/'🔄 Retake'/g, "[icon('refresh-cw', 'icon-sm'), ' Retake']");
code = code.replace(/'✅ Use Photo'/g, "[icon('check', 'icon-sm'), ' Use Photo']");
code = code.replace(/'📸 Take Photo \(Camera\)'/g, "[icon('camera', 'icon-sm'), ' Take Photo (Camera)']");
code = code.replace(/'📁 Upload File'/g, "[icon('upload', 'icon-sm'), ' Upload File']");
code = code.replace(/'📥 Export CSV'/g, "[icon('download', 'icon-sm'), ' Export CSV']");
code = code.replace(/'➕ Add New User \/ Staff'/g, "[icon('user-plus', 'icon-sm'), ' Add New User / Staff']");
code = code.replace(/'🗑️ Remove'/g, "[icon('trash-2', 'icon-sm'), ' Remove']");
code = code.replace(/'🗑️ Yes, Remove'/g, "'Yes, Remove'");
code = code.replace(/'🗑️ Remove User'/g, "'Remove User'");

// Close buttons (can be tricky if they are just strings)
code = code.replace(/'✕'/g, "icon('x')");
code = code.replace(/'\\u2715'/g, "icon('x')");

// Status icons
code = code.replace(/const STAT_ICONS = \{ warn: '⚠️', ok: '✅', info: '📊', '': '📋' \};/, "const STAT_ICONS = { warn: 'alert-triangle', ok: 'check-circle', info: 'bar-chart', '': 'clipboard' };");
code = code.replace(/STAT_ICONS\[kind\] \|\| '📋'/g, "icon(STAT_ICONS[kind] || 'clipboard')");

// QR code stuff
code = code.replace(/'📷 Classroom QR Code Simulator'/g, "'Classroom QR Code Simulator'");
code = code.replace(/'✓ QR Verified: ' \+ r\.name/g, "'QR Verified: ' + r.name");
code = code.replace(/toast\(`📷 QR code scanned: \$\{r\.name\}`\)/g, "toast(`QR code scanned: ${r.name}`)");

// AI stuff
code = code.replace(/' · ⚠️ Safety hazard detected \(High Priority\)'/g, "' · Safety hazard detected (High Priority)'");
code = code.replace(/'✨ AI Smart Assist: '/g, "[icon('sparkles', 'icon-sm'), ' AI Smart Assist: ']");
code = code.replace(/'⚡ Apply Suggestion'/g, "[icon('zap', 'icon-sm'), ' Apply Suggestion']");
code = code.replace(/toast\('⚡ AI suggestion applied!'\);/g, "toast('AI suggestion applied!');");

// Camera modal
code = code.replace(/'📸 Live Camera Capture'/g, "'Live Camera Capture'");
code = code.replace(/toast\('📸 Photo captured successfully!'\);/g, "toast('Photo captured successfully!');");

// Search icons
code = code.replace(/'🔍 Search issues by #, room, keyword...'/g, "'Search issues by #, room, keyword...'");
code = code.replace(/'🔍'/g, "icon('search')");
code = code.replace(/'➕ Add New User or Staff Member'/g, "'Add New User or Staff Member'");

// Department hints
code = code.replace(/🏛️ /g, '');

// Topbar brand
code = code.replace(/'\\u\{1F3EB\}'/g, "icon('school')");
code = code.replace(/'\\u\{1F4CD\} ' \+ issue\.location/g, "[icon('map-pin', 'icon-sm'), ' ' + issue.location]");
code = code.replace(/'\\u\{1F3E2\} ' \+ issue\.department_name/g, "[icon('building', 'icon-sm'), ' ' + issue.department_name]");
code = code.replace(/'\\u\{1F464\} ' \+ issue\.reporter_name/g, "[icon('user', 'icon-sm'), ' ' + issue.reporter_name]");
code = code.replace(/'\\u\{1F552\} ' \+ fmt\(issue\.created_at\)/g, "[icon('clock', 'icon-sm'), ' ' + fmt(issue.created_at)]");
code = code.replace(/'\\u2713'/g, "icon('check', 'icon-sm')");

fs.writeFileSync('public/app.js', code);
console.log('Done');
