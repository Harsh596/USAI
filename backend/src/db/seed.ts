import { db } from './database';
import { ingestionService } from '../services/ingestion.service';
import { CanonicalEvent } from '../models/types';
import crypto from 'crypto';

export function seedInitialEvents() {
  const count = db.prepare('SELECT count(*) as count FROM events').get() as any;
  if (count && count.count > 0) {
    console.log(`[Seed] Database already contains ${count.count} events.`);
    return;
  }

  console.log('[Seed] Seeding initial canonical event records...');
  const now = new Date();

  const sampleEvents: CanonicalEvent[] = [
    {
      event_id: 'devpost-mlh-bengaluru-2026',
      canonical_title: 'Hack Days in Bengaluru: MLH & Google Gemini Sprint',
      description: 'Hack Days in Bengaluru is an in-person build sprint powered by Major League Hacking (MLH) and Google Gemini. Build AI-powered apps that push the boundaries of what is possible with Gemini and Gemma models. 24 hours of hacking, lightning workshops, mentorship, and rapid prototyping.',
      short_summary: '24-hour in-person hackathon in Bengaluru focused on building next-gen AI applications with Google Gemini API & MLH.',
      organizer_name: 'Major League Hacking & Google DeepMind',
      source_platform: 'Devpost',
      source_url: 'https://hack-days-in-bengaluru.devpost.com/',
      registration_url: 'https://events.mlh.io/events/13285-hack-days-in-bengaluru',
      event_type: 'HACKATHON',
      categories: ['Hackathon', 'Artificial Intelligence', 'Open Source'],
      tags: ['AI', 'Gemini', 'LLM', 'Agents', 'Python', 'TypeScript'],
      technologies: ['Google Gemini API', 'Python', 'TypeScript', 'LangChain', 'Next.js'],
      themes: ['Generative AI', 'Agentic Workflows', 'Developer Tooling'],
      start_datetime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      end_datetime: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString(),
      timezone: 'Asia/Kolkata',
      registration_open_datetime: now.toISOString(),
      registration_deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      location_name: 'Koramangala, Bengaluru, Karnataka',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.9352,
      longitude: 77.6245,
      online_or_in_person: 'IN_PERSON',
      attendance_format: 'IN_PERSON',
      price: 0,
      currency: 'INR',
      prize_pool: '₹5,00,000 Cash + Google Cloud Credits',
      prize_pool_numeric: 500000,
      eligibility: ['College Students', 'Working Professionals', 'Open to All'],
      target_audience: ['Software Engineers', 'AI Researchers', 'Product Designers'],
      student_only: false,
      experience_level: 'ALL',
      team_size_min: 2,
      team_size_max: 4,
      required_skills: ['AI/ML', 'Full-Stack Development', 'API Integration'],
      deliverables: ['Working Prototype', 'Public GitHub Repo', 'Pitch Deck / Demo Video'],
      submission_requirements: ['Devpost project submission link', '3-minute demo video', 'Architecture diagram'],
      event_schedule: [
        { time: 'Day 1 09:00 AM', activity: 'Registration & Keynote' },
        { time: 'Day 1 11:00 AM', activity: 'Hacking Kickoff' },
        { time: 'Day 2 12:00 PM', activity: 'Project Submissions' },
        { time: 'Day 2 03:00 PM', activity: 'Demos & Winner Announcements' }
      ],
      sponsors: ['Google Cloud', 'GitHub', 'Major League Hacking'],
      organizer_information: 'Official partnership between Major League Hacking and Google Gemini developer relations.',
      registration_status: 'OPEN',
      event_status: 'SCHEDULED',
      last_verified_at: now.toISOString(),
      last_changed_at: now.toISOString(),
      content_hash: crypto.createHash('sha256').update('mlh-gemini-2026').digest('hex'),
      extraction_confidence: 0.96,
      field_verification_status: {
        title: true, dates: true, deadline: true, prize_pool: true, location: true, organizer: true
      },
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    },
    {
      event_id: 'luma-bengaluru-ai-agents-meetup',
      canonical_title: 'Bengaluru Autonomous AI Agents & MCP Summit',
      description: 'Join top AI engineers and researchers across India building autonomous agent systems with Model Context Protocol (MCP), LangGraph, and multi-agent coordination. Hands-on lightning demos, panel discussions, and hack breakout sessions.',
      short_summary: 'In-person summit on Model Context Protocol, autonomous agents, and tool calling architectures in Indiranagar, Bengaluru.',
      organizer_name: 'Bengaluru AI Collective & TinyFish',
      source_platform: 'Luma',
      source_url: 'https://lu.ma/blr-ai-agents-2026',
      registration_url: 'https://lu.ma/blr-ai-agents-2026',
      event_type: 'CONFERENCE',
      categories: ['Conference', 'Artificial Intelligence', 'Meetup'],
      tags: ['Agents', 'MCP', 'TinyFish', 'LLMs', 'Automation'],
      technologies: ['TinyFish', 'Model Context Protocol', 'LangGraph', 'Python', 'FastAPI'],
      themes: ['Autonomous Agents', 'Browser Automation', 'MCP Servers'],
      start_datetime: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      end_datetime: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      timezone: 'Asia/Kolkata',
      registration_open_datetime: now.toISOString(),
      registration_deadline: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000).toISOString(),
      location_name: 'Indiranagar, Bengaluru, Karnataka',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.9784,
      longitude: 77.6408,
      online_or_in_person: 'IN_PERSON',
      attendance_format: 'IN_PERSON',
      price: 0,
      currency: 'INR',
      prize_pool: '₹1,50,000 Hack Bounties',
      prize_pool_numeric: 150000,
      eligibility: ['Open to All AI Builders', 'Students', 'Founders'],
      target_audience: ['Engineers', 'AI Practitioners', 'CTOs'],
      student_only: false,
      experience_level: 'INTERMEDIATE',
      team_size_min: 1,
      team_size_max: 3,
      required_skills: ['AI/Agent Development', 'API Protocols'],
      deliverables: ['Live Agent Demo', 'GitHub Repository'],
      submission_requirements: ['Demo repository link', 'Agent architecture overview'],
      event_schedule: [
        { time: '02:00 PM', activity: 'Doors Open & Networking' },
        { time: '03:00 PM', activity: 'Technical Talks: MCP in Production' },
        { time: '04:30 PM', activity: 'Agent Demo Pitches' },
        { time: '06:30 PM', activity: 'Dinner & Awards' }
      ],
      sponsors: ['TinyFish', 'Anthropic', 'AWS'],
      organizer_information: 'Organized by the Bengaluru AI Collective community.',
      registration_status: 'OPEN',
      event_status: 'SCHEDULED',
      last_verified_at: now.toISOString(),
      last_changed_at: now.toISOString(),
      content_hash: crypto.createHash('sha256').update('luma-ai-summit').digest('hex'),
      extraction_confidence: 0.94,
      field_verification_status: {
        title: true, dates: true, deadline: true, prize_pool: true, location: true, organizer: true
      },
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    },
    {
      event_id: 'unstop-national-codesprint-2026',
      canonical_title: 'Unstop All-India Student Innovation Challenge & Hackathon',
      description: 'The largest inter-college competition for engineering students across India. Build scalable software solutions for Healthcare, Smart Mobility, and Financial Inclusion.',
      short_summary: 'National online hackathon & coding competition open exclusively to undergraduate and postgraduate college students.',
      organizer_name: 'Unstop & Tech Mahindra',
      source_platform: 'Unstop',
      source_url: 'https://unstop.com/competitions/national-codesprint-2026',
      registration_url: 'https://unstop.com/competitions/national-codesprint-2026',
      event_type: 'HACKATHON',
      categories: ['Hackathon', 'Competition', 'Students'],
      tags: ['College', 'Coding', 'FinTech', 'HealthTech', 'Innovation'],
      technologies: ['React', 'Node.js', 'Python', 'Flutter', 'PostgreSQL'],
      themes: ['Smart Cities', 'Financial Inclusion', 'Healthcare Access'],
      start_datetime: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString(),
      end_datetime: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      timezone: 'Asia/Kolkata',
      registration_open_datetime: now.toISOString(),
      registration_deadline: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      location_name: 'Online (National)',
      city: 'Online',
      state: 'Online',
      country: 'India',
      latitude: null,
      longitude: null,
      online_or_in_person: 'ONLINE',
      attendance_format: 'ONLINE',
      price: 0,
      currency: 'INR',
      prize_pool: '₹10,00,000 Cash Pool + PPO Opportunities',
      prize_pool_numeric: 1000000,
      eligibility: ['College Students Only (UG/PG)', 'Must have valid Student ID'],
      target_audience: ['Engineering Students', 'MCA Students'],
      student_only: true,
      experience_level: 'ALL',
      team_size_min: 2,
      team_size_max: 4,
      required_skills: ['Programming', 'System Design', 'Problem Solving'],
      deliverables: ['Working Software Prototype', 'Presentation Deck', 'Code Repository'],
      submission_requirements: ['GitHub repository', 'PPTX submission', 'Recorded walkthrough video'],
      event_schedule: [
        { time: 'Phase 1', activity: 'Online MCQ & Coding Round' },
        { time: 'Phase 2', activity: '48-hour Virtual Hackathon' },
        { time: 'Phase 3', activity: 'National Grand Finale & Jury Presentations' }
      ],
      sponsors: ['Tech Mahindra', 'Infosys', 'AWS Educate'],
      organizer_information: 'Hosted on Unstop competition portal.',
      registration_status: 'OPEN',
      event_status: 'SCHEDULED',
      last_verified_at: now.toISOString(),
      last_changed_at: now.toISOString(),
      content_hash: crypto.createHash('sha256').update('unstop-national-2026').digest('hex'),
      extraction_confidence: 0.98,
      field_verification_status: {
        title: true, dates: true, deadline: true, prize_pool: true, location: true, organizer: true
      },
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    },
    {
      event_id: 'qualcomm-edge-ai-bengaluru-2026',
      canonical_title: 'Qualcomm Edge AI Developer Hackathon Bengaluru',
      description: 'Dedicated to pushing the boundaries of on-device AI and neural processing. Build lightweight neural networks and agent models optimized for Snapdragon platforms and edge hardware.',
      short_summary: 'Elite in-person hardware and edge AI hackathon in Bengaluru with ₹7.5 Lakh in prizes.',
      organizer_name: 'Qualcomm Developer Network',
      source_platform: 'Qualcomm',
      source_url: 'https://www.qualcomm.com/developer/events/edge-ai-developer-hackathon/bengaluru-india',
      registration_url: 'https://www.qualcomm.com/developer/events/edge-ai-developer-hackathon/bengaluru-india',
      event_type: 'HACKATHON',
      categories: ['Hackathon', 'Hardware', 'Artificial Intelligence'],
      tags: ['Edge AI', 'Snapdragon', 'NPU', 'Computer Vision', 'PyTorch'],
      technologies: ['Qualcomm Neural Processing SDK', 'PyTorch', 'ONNX', 'C++', 'Python'],
      themes: ['On-Device Intelligence', 'Autonomous Systems', 'Edge Computing'],
      start_datetime: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      end_datetime: new Date(now.getTime() + 27 * 24 * 60 * 60 * 1000).toISOString(),
      timezone: 'Asia/Kolkata',
      registration_open_datetime: now.toISOString(),
      registration_deadline: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      location_name: 'Whitefield, Bengaluru, Karnataka',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.9698,
      longitude: 77.7500,
      online_or_in_person: 'IN_PERSON',
      attendance_format: 'IN_PERSON',
      price: 0,
      currency: 'INR',
      prize_pool: '₹7,50,000 + Snapdragon Hardware Kits',
      prize_pool_numeric: 750000,
      eligibility: ['Residents of Republic of India', 'Students & Professionals'],
      target_audience: ['Embedded Engineers', 'AI Researchers', 'Hardware Enthusiasts'],
      student_only: false,
      experience_level: 'ADVANCED',
      team_size_min: 2,
      team_size_max: 3,
      required_skills: ['Edge AI', 'C++', 'Python', 'Model Quantization'],
      deliverables: ['Working Model On Snapdragon Kit', 'Performance Benchmark Report'],
      submission_requirements: ['Model checkpoints', 'Edge performance report', 'Code repository'],
      event_schedule: [
        { time: 'Day 1 08:30 AM', activity: 'Hardware Kit Distribution' },
        { time: 'Day 1 10:00 AM', activity: 'Hacking Starts' },
        { time: 'Day 2 04:00 PM', activity: 'Jury Evaluation & Benchmarking' }
      ],
      sponsors: ['Qualcomm', 'Arrow Electronics'],
      organizer_information: 'Qualcomm Developer Relations India.',
      registration_status: 'OPEN',
      event_status: 'SCHEDULED',
      last_verified_at: now.toISOString(),
      last_changed_at: now.toISOString(),
      content_hash: crypto.createHash('sha256').update('qualcomm-edge-2026').digest('hex'),
      extraction_confidence: 0.95,
      field_verification_status: {
        title: true, dates: true, deadline: true, prize_pool: true, location: true, organizer: true
      },
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    }
  ];

  for (const ev of sampleEvents) {
    ingestionService.saveEvent(ev);
  }

  console.log(`[Seed] Seeded ${sampleEvents.length} canonical events successfully.`);
}

// Run seed if executed directly
if (require.main === module) {
  seedInitialEvents();
}

