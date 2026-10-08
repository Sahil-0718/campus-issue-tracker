// Rule-based department routing and priority logic.

export const STATUSES = ['Submitted', 'Assigned', 'In Progress', 'Resolved'];
export const PRIORITIES = ['Low', 'Medium', 'High'];

// category -> responsible department (Only AIML, IT, and CSE)
export const CATEGORIES = {
  'Wi-Fi / Network': 'IT',
  'Computer / Lab Equipment': 'CSE',
  'AI / ML Models & Datasets': 'AIML',
  'GPU / Model Training Servers': 'AIML',
  'AI Lab Workstations': 'AIML',
  'Software / Development Tools': 'CSE',
  'Projector / Smart Board': 'IT',
  'Electrical (Light / Socket)': 'IT',
  'AC / Fan': 'IT',
  'Classroom & Lab Infrastructure': 'CSE',
  'Cleanliness & General Maintenance': 'IT',
  'Other': 'IT',
};

export function departmentFor(category) {
  return CATEGORIES[category] ?? null;
}

// Words that indicate a safety hazard: such issues are always escalated to High.
const HAZARD = /\b(spark(s|ing)?|short[- ]?circuit|shock|fire|smoke|burning|burnt|flood(ed|ing)?|gas leak|exposed wire|live wire|sewage|collapse[d]?|outage|major leak)\b/i;

export function resolvePriority(requested, description = '') {
  const base = PRIORITIES.includes(requested) ? requested : 'Medium';
  return HAZARD.test(description) ? 'High' : base;
}

// A status may only move forward in the workflow.
export function isForwardMove(from, to) {
  return STATUSES.indexOf(to) > STATUSES.indexOf(from);
}

// AI-based issue classifier: analyzes free-text descriptions to suggest categories & detect hazards
const KEYWORD_MAP = {
  'AI / ML Models & Datasets': ['aiml', 'ai', 'ml', 'machine learning', 'deep learning', 'model', 'dataset', 'pytorch', 'tensorflow', 'cuda', 'training', 'neural'],
  'GPU / Model Training Servers': ['gpu', 'cuda', 'vram', 'rtx', 'a100', 'server', 'compute', 'cluster'],
  'AI Lab Workstations': ['ai lab', 'workstation', 'jupyter', 'anaconda', 'notebook'],
  'Wi-Fi / Network': ['wifi', 'wi-fi', 'internet', 'network', 'lan', 'ethernet', 'router', 'connection', 'offline', 'broadband', 'signal'],
  'Computer / Lab Equipment': ['computer', 'pc', 'monitor', 'keyboard', 'mouse', 'cpu', 'boot', 'ram', 'desktop', 'screen', 'software', 'hang'],
  'Software / Development Tools': ['compiler', 'ide', 'vscode', 'linux', 'ubuntu', 'windows', 'c++', 'java', 'python', 'git', 'github'],
  'Projector / Smart Board': ['projector', 'hdmi', 'vga', 'projection', 'blurry', 'flicker', 'display bulb', 'smart board'],
  'Electrical (Light / Socket)': ['light', 'tube', 'socket', 'switch', 'spark', 'bulb', 'plug', 'power', 'wiring', 'fuse', 'breaker', 'electricity'],
  'AC / Fan': ['fan', 'ac', 'air conditioner', 'cooling', 'capacitor', 'ventilation', 'remote', 'hot', 'warm'],
  'Classroom & Lab Infrastructure': ['chair', 'desk', 'bench', 'table', 'whiteboard', 'blackboard', 'door', 'window', 'podium', 'furniture'],
  'Cleanliness & General Maintenance': ['clean', 'garbage', 'dustbin', 'trash', 'dirty', 'water', 'leak', 'toilet', 'washroom', 'hygiene', 'maintenance'],
};

export function aiClassify(text = '') {
  const lower = String(text).toLowerCase();
  let matchedCategory = null;
  let highestScore = 0;

  for (const [cat, words] of Object.entries(KEYWORD_MAP)) {
    let score = 0;
    for (const w of words) {
      if (lower.includes(w)) score += 1;
    }
    if (score > highestScore) {
      highestScore = score;
      matchedCategory = cat;
    }
  }

  const isHazard = HAZARD.test(text);
  const department = matchedCategory ? departmentFor(matchedCategory) : (isHazard ? 'IT' : 'CSE');
  const priority = isHazard ? 'High' : (highestScore > 0 ? 'Medium' : 'Low');

  return {
    category: matchedCategory,
    department,
    priority,
    hazardDetected: isHazard,
    confidence: highestScore >= 2 ? 'High' : (highestScore === 1 ? 'Medium' : 'None'),
  };
}
