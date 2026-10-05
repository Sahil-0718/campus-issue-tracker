// Rule-based department routing and priority logic.

export const STATUSES = ['Submitted', 'Assigned', 'In Progress', 'Resolved'];
export const PRIORITIES = ['Low', 'Medium', 'High'];

// category -> responsible department
export const CATEGORIES = {
  'Wi-Fi / Network': 'IT',
  'Computer / Lab Equipment': 'IT',
  'Projector': 'IT',
  'Electrical (Light / Socket)': 'Electrical',
  'AC / Fan': 'Electrical',
  'Furniture': 'Maintenance',
  'Door / Window': 'Maintenance',
  'Classroom Infrastructure': 'Maintenance',
  'Water Leakage': 'Plumbing',
  'Washroom': 'Housekeeping',
  'Cleanliness': 'Housekeeping',
  'Other': 'Administration',
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
  'Wi-Fi / Network': ['wifi', 'wi-fi', 'internet', 'network', 'lan', 'ethernet', 'router', 'connection', 'offline', 'broadband', 'signal'],
  'Computer / Lab Equipment': ['computer', 'pc', 'monitor', 'keyboard', 'mouse', 'cpu', 'boot', 'ram', 'desktop', 'screen', 'software', 'hang'],
  'Projector': ['projector', 'hdmi', 'vga', 'projection', 'blurry', 'flicker', 'display bulb'],
  'Electrical (Light / Socket)': ['light', 'tube', 'socket', 'switch', 'spark', 'bulb', 'plug', 'power', 'wiring', 'fuse', 'breaker', 'electricity'],
  'AC / Fan': ['fan', 'ac', 'air conditioner', 'cooling', 'capacitor', 'ventilation', 'remote', 'hot', 'warm'],
  'Furniture': ['chair', 'desk', 'bench', 'table', 'stool', 'cupboard', 'podium', 'seat', 'drawer'],
  'Door / Window': ['door', 'window', 'handle', 'lock', 'latch', 'hinge', 'glass', 'shut'],
  'Classroom Infrastructure': ['whiteboard', 'blackboard', 'marker', 'chalk', 'podium', 'board', 'curtain', 'bench', 'rostrum'],
  'Water Leakage': ['leak', 'leaking', 'water', 'pipe', 'ceiling', 'drip', 'drainage', 'seepage', 'flood', 'overflow', 'plumbing'],
  'Washroom': ['washroom', 'toilet', 'flush', 'tap', 'basin', 'restroom', 'sink', 'urinal'],
  'Cleanliness': ['clean', 'garbage', 'dustbin', 'trash', 'dirty', 'sweep', 'mop', 'waste', 'smell', 'litter', 'hygiene'],
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
  const department = matchedCategory ? departmentFor(matchedCategory) : (isHazard ? 'Electrical' : 'Administration');
  const priority = isHazard ? 'High' : (highestScore > 0 ? 'Medium' : 'Low');

  return {
    category: matchedCategory,
    department,
    priority,
    hazardDetected: isHazard,
    confidence: highestScore >= 2 ? 'High' : (highestScore === 1 ? 'Medium' : 'None'),
  };
}
