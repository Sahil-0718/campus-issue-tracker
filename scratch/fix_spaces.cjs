const fs = require('fs');
let code = fs.readFileSync('public/app.js', 'utf8');

// Buttons and text (removing leading spaces from the text nodes because gap handles it)
code = code.replace(/, ' Edit Notice']/g, ", 'Edit Notice']");
code = code.replace(/, ' Scan Classroom QR']/g, ", 'Scan Classroom QR']");
code = code.replace(/, ' Snap Photo']/g, ", 'Snap Photo']");
code = code.replace(/, ' Retake']/g, ", 'Retake']");
code = code.replace(/, ' Use Photo']/g, ", 'Use Photo']");
code = code.replace(/, ' Take Photo \(Camera\)']/g, ", 'Take Photo (Camera)']");
code = code.replace(/, ' Upload File']/g, ", 'Upload File']");
code = code.replace(/, ' Export CSV']/g, ", 'Export CSV']");
code = code.replace(/, ' Add New User \/ Staff']/g, ", 'Add New User / Staff']");
code = code.replace(/, ' Remove']/g, ", 'Remove']");

// AI stuff
code = code.replace(/, ' AI Smart Assist: ']/g, ", 'AI Smart Assist: ']");
code = code.replace(/, ' Apply Suggestion']/g, ", 'Apply Suggestion']");

// Topbar brand and details
code = code.replace(/, ' ' \+ issue\.location]/g, ", issue.location]");
code = code.replace(/, ' ' \+ issue\.department_name]/g, ", issue.department_name]");
code = code.replace(/, ' ' \+ issue\.reporter_name]/g, ", issue.reporter_name]");
code = code.replace(/, ' ' \+ fmt\(issue\.created_at\)]/g, ", fmt(issue.created_at)]");

fs.writeFileSync('public/app.js', code);
console.log('Fixed spaces');
