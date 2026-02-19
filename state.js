'use strict';

// category → department mapping
const DEPT_MAP = {
  Infrastructure: { name: 'Public Works', color: '#f59e0b', emoji: '🏗️' },
  Sanitation: { name: 'Health Dept', color: '#10b981', emoji: '🗑️' },
  Safety: { name: 'Police/Fire', color: '#ef4444', emoji: '🛡️' },
  Water: { name: 'Water Authority', color: '#3b82f6', emoji: '💧' },
  Electricity: { name: 'Power Dept', color: '#a855f7', emoji: '⚡' }
};

const HIGH_URGENCY_WORDS = [
  'fire', 'electrocution', 'electric shock', 'accident', 'injured', 'injury',
  'bleeding', 'emergency', 'danger', 'dangerous', 'flood', 'leaking', 'burst',
  'exposed wire', 'sparks', 'gas leak', 'collapse', 'fallen', 'blocked road'
];

const MEDIUM_URGENCY_WORDS = [
  'pothole', 'broken', 'damaged', 'overflow', 'smell', 'odor',
  'noise', 'crack', 'leak', 'vandalism', 'graffiti'
];

const CATEGORY_WORDS = {
  Safety: ['fire','accident','crime','assault','danger','unsafe','risk','electrocution','explosion','gas','fallen','collapse','sparks'],
  Water: ['water','flood','leak','pipe','hydrant','drain','sewage','burst','flooding'],
  Electricity: ['electricity','electric','power','outage','wire','light','streetlight','pole','transformer'],
  Infrastructure: ['road','pothole','bridge','sidewalk','pavement','street','traffic','sign','construction','building'],
  Sanitation: ['garbage','trash','waste','sanitation','smell','odor','rats','pest','dump','sewage','filth']
};

// single source of truth for all runtime state
const appState = {
  currentUser: null,
  selectedRole: 'citizen',
  citizenTab: 'active',
  citizenFilters: { cat: 'All', dept: 'All', status: 'All', urg: 'All', search: '' },
  staffView: 'mine',
  adminFilters: { cat: 'All', urg: 'All', search: '' },
  isEmergency: false,
  isRecording: false,
  selectedCat: null,
  selectedUrg: null,
  aiDetected: false,
  openComplaintId: null,
  currentDetailTab: 'details',
  complaints: [
    {
      id: 'CP-DEMO001',
      title: 'Fire hydrant leaking heavily',
      description: 'A fire hydrant on Elm Street is leaking water continuously, flooding the sidewalk and road.',
      category: 'Water',
      urgency: 'High',
      status: 'Received',
      address: '456 Elm Street',
      citizenName: 'Priya Sharma',
      citizenEmail: 'priya@example.com',
      phone: '+91 98765-43210',
      timestamp: Date.now() - 3600000,
      updates: [],
      notes: [],
      reports: 1,
      isEmergency: true,
      dept: 'Water Authority'
    },
    {
      id: 'CP-DEMO002',
      title: 'Street light electrocution risk',
      description: 'Exposed wires on a fallen street light pole. Very dangerous, sparks visible at night.',
      category: 'Electricity',
      urgency: 'High',
      status: 'In Progress',
      address: '789 Pine Road',
      citizenName: 'Rahul Mehta',
      citizenEmail: 'rahul@example.com',
      phone: '+91 87654-32109',
      timestamp: Date.now() - 43200000,
      updates: [{ text: 'Team dispatched to location', author: 'Power Dept', ts: Date.now() - 21600000 }],
      notes: ['Requires immediate pole replacement'],
      reports: 2,
      isEmergency: true,
      dept: 'Power Dept'
    },
    {
      id: 'CP-DEMO003',
      title: 'Large pothole on Main Street',
      description: 'There is a dangerous pothole on Main Street near the intersection with Oak Ave. Several cars have been damaged.',
      category: 'Infrastructure',
      urgency: 'Medium',
      status: 'In Progress',
      address: '123 Main Street, Downtown',
      citizenName: 'Anjali Desai',
      citizenEmail: 'anjali@example.com',
      phone: '+91 76543-21098',
      timestamp: Date.now() - 172800000,
      updates: [{ text: 'Materials ordered, repair scheduled for next week', author: 'Public Works', ts: Date.now() - 86400000 }],
      notes: [],
      reports: 3,
      isEmergency: false,
      dept: 'Public Works'
    },
    {
      id: 'CP-DEMO004',
      title: 'Garbage pile not collected',
      description: 'Garbage has been piling up on Gandhi Nagar Road for 5 days. Strong smell and attracting stray animals.',
      category: 'Sanitation',
      urgency: 'Medium',
      status: 'Received',
      address: 'Gandhi Nagar Road',
      citizenName: 'Suresh Kumar',
      citizenEmail: 'suresh@example.com',
      phone: '+91 65432-10987',
      timestamp: Date.now() - 432000000,
      updates: [],
      notes: [],
      reports: 1,
      isEmergency: false,
      dept: 'Health Dept'
    }
  ]
};

// hits the local python backend for AI category prediction
async function detectAI(text) {
  try {
    const res = await fetch('http://127.0.0.1:8000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    return data.category;
  } catch (err) {
    console.error('AI predict failed:', err);
    return null;
  }
}
