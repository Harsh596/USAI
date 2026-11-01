import { db, initDatabase } from './database';

export function seedLocationsAndTaxonomy() {
  initDatabase();

  const now = new Date().toISOString();

  // 1. Seed Country
  const insertCountry = db.prepare(`
    INSERT OR IGNORE INTO countries (country_id, name, code, created_at)
    VALUES (?, ?, ?, ?)
  `);
  insertCountry.run('country-in', 'India', 'IN', now);

  // 2. Seed States
  const states = [
    { id: 'state-ka', name: 'Karnataka', code: 'KA' },
    { id: 'state-mh', name: 'Maharashtra', code: 'MH' },
    { id: 'state-dl', name: 'Delhi NCR', code: 'DL' },
    { id: 'state-ts', name: 'Telangana', code: 'TS' },
    { id: 'state-tn', name: 'Tamil Nadu', code: 'TN' },
    { id: 'state-up', name: 'Uttar Pradesh', code: 'UP' },
    { id: 'state-hr', name: 'Haryana', code: 'HR' },
    { id: 'state-wb', name: 'West Bengal', code: 'WB' },
    { id: 'state-gj', name: 'Gujarat', code: 'GJ' },
    { id: 'state-kl', name: 'Kerala', code: 'KL' },
  ];

  const insertState = db.prepare(`
    INSERT OR IGNORE INTO states (state_id, country_id, name, code, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const s of states) {
    insertState.run(s.id, 'country-in', s.name, s.code, now);
  }

  // 3. Seed Canonical Cities with Aliases
  const cities = [
    {
      id: 'city-blr',
      stateId: 'state-ka',
      name: 'Bengaluru',
      canonicalName: 'Bengaluru',
      aliases: ['bengaluru', 'bangalore', 'blr', 'bengalooru', 'electronic city', 'koramangala', 'whitefield', 'indiranagar'],
      lat: 12.9716,
      lng: 77.5946
    },
    {
      id: 'city-mum',
      stateId: 'state-mh',
      name: 'Mumbai',
      canonicalName: 'Mumbai',
      aliases: ['mumbai', 'bombay', 'navi mumbai', 'thane', 'bandra', 'andheri'],
      lat: 19.0760,
      lng: 72.8777
    },
    {
      id: 'city-pun',
      stateId: 'state-mh',
      name: 'Pune',
      canonicalName: 'Pune',
      aliases: ['pune', 'poona', 'hinjewadi', 'viman nagar', 'wakad'],
      lat: 18.5204,
      lng: 73.8567
    },
    {
      id: 'city-del',
      stateId: 'state-dl',
      name: 'Delhi',
      canonicalName: 'Delhi',
      aliases: ['delhi', 'new delhi', 'ncr', 'central delhi', 'south delhi', 'dwarka', 'connaught place'],
      lat: 28.6139,
      lng: 77.2090
    },
    {
      id: 'city-noi',
      stateId: 'state-up',
      name: 'Noida',
      canonicalName: 'Noida',
      aliases: ['noida', 'greater noida', 'noida sector', 'expressway noida'],
      lat: 28.5355,
      lng: 77.3910
    },
    {
      id: 'city-ggn',
      stateId: 'state-hr',
      name: 'Gurugram',
      canonicalName: 'Gurugram',
      aliases: ['gurugram', 'gurgaon', 'cyber city', 'dlf cyber hub'],
      lat: 28.4595,
      lng: 77.0266
    },
    {
      id: 'city-hyd',
      stateId: 'state-ts',
      name: 'Hyderabad',
      canonicalName: 'Hyderabad',
      aliases: ['hyderabad', 'secunderabad', 'hyd', 'hitech city', 'gachibowli', 'madhapur'],
      lat: 17.3850,
      lng: 78.4867
    },
    {
      id: 'city-chn',
      stateId: 'state-tn',
      name: 'Chennai',
      canonicalName: 'Chennai',
      aliases: ['chennai', 'madras', 'omr', 'guindy', 'velachery'],
      lat: 13.0827,
      lng: 80.2707
    },
    {
      id: 'city-kol',
      stateId: 'state-wb',
      name: 'Kolkata',
      canonicalName: 'Kolkata',
      aliases: ['kolkata', 'calcutta', 'salt lake', 'new town kolkata'],
      lat: 22.5726,
      lng: 88.3639
    },
    {
      id: 'city-ahm',
      stateId: 'state-gj',
      name: 'Ahmedabad',
      canonicalName: 'Ahmedabad',
      aliases: ['ahmedabad', 'amdavad', 'gandhinagar', 'gift city'],
      lat: 23.0225,
      lng: 72.5714
    },
    {
      id: 'city-koc',
      stateId: 'state-kl',
      name: 'Kochi',
      canonicalName: 'Kochi',
      aliases: ['kochi', 'cochin', 'ernakulam', 'kakkanad', 'infopark kochi'],
      lat: 9.9312,
      lng: 76.2673
    }
  ];

  const insertCity = db.prepare(`
    INSERT OR REPLACE INTO cities (city_id, state_id, country_id, name, canonical_name, aliases, latitude, longitude, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const c of cities) {
    insertCity.run(c.id, c.stateId, 'country-in', c.name, c.canonicalName, JSON.stringify(c.aliases), c.lat, c.lng, now);
  }

  // 4. Seed Categories
  const categories = [
    {
      id: 'ai-research',
      name: 'AI Research',
      slug: 'ai-research',
      description: 'Novel architectures, scientific benchmarks, model training, paper reproduction, loss functions, agentic reasoning, arXiv preprints',
      keywords: ['arxiv', 'loss function', 'paper reproduction', 'transformer architecture', 'state of the art benchmark', 'novel model', 'ablation study', 'gradient descent', 'finetuning framework', 'embedding evaluation', 'neural architecture'],
      order: 1
    },
    {
      id: 'cp-hackathon',
      name: 'CP Hackathon',
      slug: 'cp-hackathon',
      description: 'Competitive programming, algorithmic contests, ICPC style, data structures, dynamic programming, time-complexity constraints',
      keywords: ['competitive programming', 'algorithmic', 'icpc', 'dsa', 'data structures', 'dynamic programming', 'graph algorithms', 'codeforces', 'leetcode style', 'time complexity', 'math puzzles'],
      order: 2
    },
    {
      id: 'ctf-cybersecurity',
      name: 'CTF Hackathon',
      slug: 'ctf-cybersecurity',
      description: 'Capture The Flag, ethical hacking, red team / blue team defense, binary exploitation, cryptography, web security, reverse engineering',
      keywords: ['ctf', 'capture the flag', 'cybersecurity', 'infosec', 'penetration testing', 'reverse engineering', 'binary exploitation', 'cryptography', 'web security', 'pwn', 'forensics', 'red team', 'vulnerability assessment'],
      order: 3
    },
    {
      id: 'engineer-hackathon',
      name: 'Engineer Hackathon',
      slug: 'engineer-hackathon',
      description: 'Product and software engineering, full stack, production architectures, mobile apps, distributed systems, developer tooling',
      keywords: ['full stack', 'software engineering', 'web application', 'mobile app', 'api development', 'developer tools', 'microservices', 'cloud native', 'system design', 'build an app', 'mvp production'],
      order: 4
    },
    {
      id: 'robot-hackathon',
      name: 'Robot Hackathon',
      slug: 'robot-hackathon',
      description: 'Robotics, physical hardware, ROS/ROS2, mechatronics, embedded systems, microcontrollers, sensor integration, robotic arms, AGVs',
      keywords: ['robot', 'robotics', 'ros', 'ros2', 'mechatronics', 'arduino', 'raspberry pi', 'servos', 'actuators', 'lidar', 'hardware hackathon', 'embedded systems', 'microcontroller', 'kinematics'],
      order: 5
    },
    {
      id: 'drone-uav-hackathon',
      name: 'Drone Hackathon',
      slug: 'drone-uav-hackathon',
      description: 'Drone & UAV systems, autonomous aerial navigation, flight controllers, PX4, ArduPilot, computer vision for aerial inspection, obstacle avoidance',
      keywords: ['drone', 'drones', 'uav', 'unmanned aerial vehicle', 'quadcopter', 'px4', 'ardupilot', 'flight controller', 'aerial navigation', 'airspace', 'fpv', 'waypoint navigation', 'drone payload'],
      order: 6
    },
    {
      id: 'web3-blockchain',
      name: 'Web3 & Blockchain',
      slug: 'web3-blockchain',
      description: 'Decentralized applications, smart contracts, DeFi, zero-knowledge proofs, layer 2 protocols, tokenomics',
      keywords: ['web3', 'blockchain', 'solidity', 'smart contract', 'ethereum', 'solana', 'defi', 'zk-proof', 'dao', 'crypto', 'nft', 'polygon'],
      order: 7
    },
    {
      id: 'fintech',
      name: 'Fintech & Payments',
      slug: 'fintech',
      description: 'Financial engineering, payments, UPI, banking APIs, fraud detection, algorithmic trading, wealthtech',
      keywords: ['fintech', 'payments', 'banking', 'upi', 'fraud detection', 'algorithmic trading', 'lending', 'neobank', 'financial tech'],
      order: 8
    },
    {
      id: 'healthtech',
      name: 'Healthtech & MedTech',
      slug: 'healthtech',
      description: 'Medical devices, healthcare software, clinical data analysis, diagnostics, patient monitoring',
      keywords: ['healthtech', 'healthcare', 'medical device', 'clinical diagnostics', 'biomedical', 'telemedicine', 'patient monitoring'],
      order: 9
    },
    {
      id: 'open-source',
      name: 'Open Source',
      slug: 'open-source',
      description: 'FOSS contributions, open source tool building, community maintenance, bug bounty in public repos',
      keywords: ['open source', 'foss', 'github pull request', 'public repo', 'contribute to oss', 'community driven'],
      order: 10
    }
  ];

  const insertCategory = db.prepare(`
    INSERT OR REPLACE INTO categories (category_id, name, slug, description, keywords, display_order, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `);
  for (const cat of categories) {
    insertCategory.run(cat.id, cat.name, cat.slug, cat.description, JSON.stringify(cat.keywords), cat.order, now);
  }

  // 5. Seed Category Aliases for Search & Normalization
  const aliases: Array<{ alias: string; categoryId: string; confidence: number }> = [
    // AI Research
    { alias: 'ai research', categoryId: 'ai-research', confidence: 1.0 },
    { alias: 'artificial intelligence research', categoryId: 'ai-research', confidence: 1.0 },
    { alias: 'ml research', categoryId: 'ai-research', confidence: 1.0 },
    { alias: 'machine learning research', categoryId: 'ai-research', confidence: 1.0 },
    { alias: 'deep learning research', categoryId: 'ai-research', confidence: 1.0 },
    { alias: 'arxiv papers', categoryId: 'ai-research', confidence: 0.9 },
    // CP
    { alias: 'competitive programming', categoryId: 'cp-hackathon', confidence: 1.0 },
    { alias: 'cp hackathon', categoryId: 'cp-hackathon', confidence: 1.0 },
    { alias: 'cp', categoryId: 'cp-hackathon', confidence: 0.9 },
    { alias: 'algorithmic coding', categoryId: 'cp-hackathon', confidence: 1.0 },
    { alias: 'dsa competition', categoryId: 'cp-hackathon', confidence: 0.95 },
    { alias: 'icpc', categoryId: 'cp-hackathon', confidence: 1.0 },
    { alias: 'codeforces', categoryId: 'cp-hackathon', confidence: 0.95 },
    // CTF & Cybersecurity
    { alias: 'ctf', categoryId: 'ctf-cybersecurity', confidence: 1.0 },
    { alias: 'ctf hackathon', categoryId: 'ctf-cybersecurity', confidence: 1.0 },
    { alias: 'capture the flag', categoryId: 'ctf-cybersecurity', confidence: 1.0 },
    { alias: 'cybersecurity', categoryId: 'ctf-cybersecurity', confidence: 1.0 },
    { alias: 'cyber security', categoryId: 'ctf-cybersecurity', confidence: 1.0 },
    { alias: 'cybersecurity hackathon', categoryId: 'ctf-cybersecurity', confidence: 1.0 },
    { alias: 'infosec', categoryId: 'ctf-cybersecurity', confidence: 0.95 },
    { alias: 'ethical hacking', categoryId: 'ctf-cybersecurity', confidence: 0.95 },
    { alias: 'penetration testing', categoryId: 'ctf-cybersecurity', confidence: 0.9 },
    // Engineer Hackathon
    { alias: 'engineer hackathon', categoryId: 'engineer-hackathon', confidence: 1.0 },
    { alias: 'engineering hackathon', categoryId: 'engineer-hackathon', confidence: 1.0 },
    { alias: 'software engineering', categoryId: 'engineer-hackathon', confidence: 1.0 },
    { alias: 'full stack hackathon', categoryId: 'engineer-hackathon', confidence: 1.0 },
    { alias: 'devops hackathon', categoryId: 'engineer-hackathon', confidence: 0.95 },
    { alias: 'cloud hackathon', categoryId: 'engineer-hackathon', confidence: 0.9 },
    // Robot Hackathon
    { alias: 'robot hackathon', categoryId: 'robot-hackathon', confidence: 1.0 },
    { alias: 'robotics hackathon', categoryId: 'robot-hackathon', confidence: 1.0 },
    { alias: 'robotics', categoryId: 'robot-hackathon', confidence: 1.0 },
    { alias: 'hardware robotics', categoryId: 'robot-hackathon', confidence: 1.0 },
    { alias: 'mechatronics hackathon', categoryId: 'robot-hackathon', confidence: 0.95 },
    { alias: 'ros contest', categoryId: 'robot-hackathon', confidence: 0.9 },
    // Drone / UAV Hackathon
    { alias: 'drone hackathon', categoryId: 'drone-uav-hackathon', confidence: 1.0 },
    { alias: 'drone', categoryId: 'drone-uav-hackathon', confidence: 0.95 },
    { alias: 'drones', categoryId: 'drone-uav-hackathon', confidence: 0.95 },
    { alias: 'uav hackathon', categoryId: 'drone-uav-hackathon', confidence: 1.0 },
    { alias: 'uav', categoryId: 'drone-uav-hackathon', confidence: 0.95 },
    { alias: 'quadcopter challenge', categoryId: 'drone-uav-hackathon', confidence: 0.95 },
    { alias: 'autonomous drones', categoryId: 'drone-uav-hackathon', confidence: 1.0 },
    // Web3
    { alias: 'web3', categoryId: 'web3-blockchain', confidence: 1.0 },
    { alias: 'blockchain', categoryId: 'web3-blockchain', confidence: 1.0 },
    { alias: 'crypto hackathon', categoryId: 'web3-blockchain', confidence: 1.0 },
    // Fintech
    { alias: 'fintech', categoryId: 'fintech', confidence: 1.0 },
    { alias: 'financial tech', categoryId: 'fintech', confidence: 0.95 },
    // Healthtech
    { alias: 'healthtech', categoryId: 'healthtech', confidence: 1.0 },
    { alias: 'medtech', categoryId: 'healthtech', confidence: 0.95 }
  ];

  const insertAlias = db.prepare(`
    INSERT OR REPLACE INTO category_aliases (id, alias, category_id, confidence)
    VALUES (?, ?, ?, ?)
  `);
  for (let i = 0; i < aliases.length; i++) {
    const a = aliases[i];
    insertAlias.run(`alias-${i + 1}`, a.alias.toLowerCase(), a.categoryId, a.confidence);
  }

  console.log('Seeded locations and taxonomy successfully.');
}

if (require.main === module) {
  seedLocationsAndTaxonomy();
}

