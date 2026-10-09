/**
 * Expressway Milepost Topology & Corridor Geography
 * Mumbai–Pune Expressway (NH 48)
 */

const EXPRESSWAY_NODES = {
  "Pune": 0.0,
  "Pune (Kiwale)": 0.0,
  "Kiwale": 0.0,
  "Talegaon": 21.0,
  "Lonavala": 58.0,
  "Khandala": 63.0,
  "Khalapur": 88.0,
  "Khalapur Toll": 88.0,
  "Panvel": 100.0,
  "Navi Mumbai": 128.0,
  "Navi Mumbai/Vashi": 128.0,
  "Vashi": 128.0,
  "Mumbai": 150.0,
  "Pen": 89.0,
  "Pen/NH 66 Exit": 89.0
};

const EXPRESSWAY_COORDINATES = {
  "Pune": [18.6508, 73.7438],
  "Pune (Kiwale)": [18.6508, 73.7438],
  "Kiwale": [18.6508, 73.7438],
  "Talegaon": [18.7303, 73.6766],
  "Lonavala": [18.7557, 73.4091],
  "Khandala": [18.7618, 73.3718],
  "Khalapur": [18.7951, 73.2798],
  "Khalapur Toll": [18.7951, 73.2798],
  "Panvel": [19.0188, 73.1098],
  "Navi Mumbai": [19.0745, 72.9978],
  "Navi Mumbai/Vashi": [19.0745, 72.9978],
  "Vashi": [19.0745, 72.9978],
  "Mumbai": [19.0178, 72.8478],
  "Pen": [18.7375, 73.0988],
  "Pen/NH 66 Exit": [18.7375, 73.0988]
};

const CORRIDOR_MILESTONES = [
  { name: "Pune (Kiwale)", km: 0.0, is_mainline: true, lat: 18.6508, lng: 73.7438 },
  { name: "Talegaon", km: 21.0, is_mainline: true, lat: 18.7303, lng: 73.6766 },
  { name: "Lonavala", km: 58.0, is_mainline: true, lat: 18.7557, lng: 73.4091 },
  { name: "Khandala", km: 63.0, is_mainline: true, lat: 18.7618, lng: 73.3718 },
  { name: "Khalapur Toll", km: 88.0, is_mainline: true, lat: 18.7951, lng: 73.2798 },
  { name: "Pen/NH 66 Exit", km: 89.0, is_mainline: false, lat: 18.7375, lng: 73.0988 },
  { name: "Panvel", km: 100.0, is_mainline: true, lat: 19.0188, lng: 73.1098 },
  { name: "Navi Mumbai/Vashi", km: 128.0, is_mainline: true, lat: 19.0745, lng: 72.9978 },
  { name: "Mumbai", km: 150.0, is_mainline: true, lat: 19.0178, lng: 72.8478 }
];

function normalizeNode(nodeName) {
  if (!nodeName || typeof nodeName !== 'string') {
    throw new Error(`Invalid node name: ${nodeName}`);
  }
  const clean = nodeName.trim();
  if (clean in EXPRESSWAY_NODES) return clean;
  
  const lower = clean.toLowerCase();
  for (const k of Object.keys(EXPRESSWAY_NODES)) {
    if (k.toLowerCase() === lower) return k;
  }
  for (const k of Object.keys(EXPRESSWAY_NODES)) {
    if (lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)) {
      return k;
    }
  }
  throw new Error(`Unknown expressway node '${nodeName}'. Valid: ${Object.keys(EXPRESSWAY_NODES).join(', ')}`);
}

function getNodeKm(nodeName) {
  const canon = normalizeNode(nodeName);
  return EXPRESSWAY_NODES[canon];
}

function getNodeCoords(nodeName) {
  const canon = normalizeNode(nodeName);
  return EXPRESSWAY_COORDINATES[canon] || [18.6508, 73.7438];
}

function getDirectDistance(nodeA, nodeB) {
  return Math.abs(getNodeKm(nodeB) - getNodeKm(nodeA));
}

// Great-circle Haversine formula for arbitrary GPS points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371; // Earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = {
  EXPRESSWAY_NODES,
  EXPRESSWAY_COORDINATES,
  CORRIDOR_MILESTONES,
  normalizeNode,
  getNodeKm,
  getNodeCoords,
  getDirectDistance,
  haversineDistance
};
