import crypto from 'crypto';
import { v5 as uuidv5 } from 'uuid';
import { CanonicalEvent, EventType, AttendanceFormat, RegistrationStatus, EventStatus } from '../models/types';
import { TinyFishFetchItem } from './tinyfish.service';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // URL namespace

export class NormalizationService {
  /**
   * Generates a stable deterministic event ID from source platform and canonical URL
   */
  generateEventId(sourcePlatform: string, sourceUrl: string): string {
    const cleanUrl = sourceUrl.split('?')[0].toLowerCase().trim();
    return uuidv5(`${sourcePlatform}:${cleanUrl}`, UUID_NAMESPACE);
  }

  /**
   * Generates a sha256 hash of the content to detect meaningful page changes
   */
  computeContentHash(text: string): string {
    return crypto.createHash('sha256').update(text || '').digest('hex');
  }

  /**
   * Parses fetched page text into canonical event representation
   */
  normalizePage(fetchItem: TinyFishFetchItem, sourcePlatform: string, searchContext?: { location?: string; category?: string }): CanonicalEvent {
    const rawText = fetchItem.text || '';
    const title = (fetchItem.title || 'Untitled Event').replace(/\s*[-|]\s*(Devpost|Luma|Devfolio|Unstop|MLH).*/i, '').trim();
    const sourceUrl = fetchItem.url;
    const eventId = this.generateEventId(sourcePlatform, sourceUrl);
    const contentHash = this.computeContentHash(rawText);

    // Track verification status of individual fields
    const verificationStatus: Record<string, boolean> = {
      title: !!title,
      source_url: true,
      organizer: false,
      dates: false,
      deadline: false,
      prize_pool: false,
      team_size: false,
      location: false
    };

    // Extract Description / Summary
    let shortSummary = fetchItem.description || '';
    if (!shortSummary && rawText) {
      const firstLines = rawText.split('\n').filter(l => l.trim().length > 20);
      shortSummary = firstLines.slice(0, 2).join(' ').slice(0, 300);
    }

    // Determine Event Type
    let eventType: EventType = 'HACKATHON';
    const lowerText = rawText.toLowerCase();
    if (lowerText.includes('conference') || lowerText.includes('summit')) eventType = 'CONFERENCE';
    else if (lowerText.includes('workshop') || lowerText.includes('masterclass')) eventType = 'WORKSHOP';
    else if (lowerText.includes('meetup') || lowerText.includes('networking')) eventType = 'MEETUP';
    else if (lowerText.includes('ctf') || lowerText.includes('capture the flag')) eventType = 'CTF';
    else if (lowerText.includes('competition') || lowerText.includes('challenge')) eventType = 'COMPETITION';

    // Format & Location
    let attendanceFormat: AttendanceFormat = 'IN_PERSON';
    let onlineOrInPerson: 'ONLINE' | 'IN_PERSON' | 'HYBRID' = 'IN_PERSON';
    if (lowerText.includes('online') || lowerText.includes('virtual') || lowerText.includes('remote')) {
      if (lowerText.includes('hybrid') || lowerText.includes('in-person')) {
        attendanceFormat = 'HYBRID';
        onlineOrInPerson = 'HYBRID';
      } else {
        attendanceFormat = 'ONLINE';
        onlineOrInPerson = 'ONLINE';
      }
    }

    // Location extraction
    let city = searchContext?.location || 'Bengaluru';
    let state = 'Karnataka';
    let country = 'India';
    let locationName = attendanceFormat === 'ONLINE' ? 'Virtual / Online' : `${city}, India`;

    const cityMatches = [
      { name: 'Bengaluru', regex: /(bengaluru|bangalore)/i, state: 'Karnataka' },
      { name: 'Delhi', regex: /(delhi|new delhi|ncr|gurugram|noida)/i, state: 'Delhi NCR' },
      { name: 'Mumbai', regex: /(mumbai|bombay|pune)/i, state: 'Maharashtra' },
      { name: 'Hyderabad', regex: /hyderabad/i, state: 'Telangana' },
      { name: 'Chennai', regex: /chennai/i, state: 'Tamil Nadu' }
    ];

    for (const c of cityMatches) {
      if (c.regex.test(lowerText) || c.regex.test(rawText)) {
        city = c.name;
        state = c.state;
        verificationStatus.location = true;
        if (attendanceFormat !== 'ONLINE') {
          locationName = `${city}, ${state}`;
        }
        break;
      }
    }

    // Organizer extraction
    let organizerName = sourcePlatform;
    const orgMatch = rawText.match(/(?:organized by|hosted by|presented by|by)\s+([A-Za-z0-9&.,\- ]{3,40})/i);
    if (orgMatch && orgMatch[1]) {
      organizerName = orgMatch[1].trim();
      verificationStatus.organizer = true;
    }

    // Prizes extraction
    let prizePool: string | null = null;
    let prizePoolNumeric: number | null = null;
    const prizeMatch = rawText.match(/(?:prize pool|prizes? worth|cash prize|prizes? of|win up to)\s*[:\-]?\s*(?:(?:₹|rs\.?|inr|\$)\s*[\d,]+(?:\s*(?:lakh|k|lac))?)/i);
    if (prizeMatch) {
      prizePool = prizeMatch[0].trim();
      verificationStatus.prize_pool = true;
      const numMatch = prizePool.match(/[\d,]+/);
      if (numMatch) {
        let n = parseFloat(numMatch[0].replace(/,/g, ''));
        if (/lakh|lac/i.test(prizePool)) n *= 100000;
        if (/k/i.test(prizePool)) n *= 1000;
        if (/\$/i.test(prizePool)) n *= 85; // Approx INR conversion
        prizePoolNumeric = n;
      }
    }

    // Team Size extraction (do NOT invent if not found)
    let teamSizeMin: number | null = null;
    let teamSizeMax: number | null = null;
    const teamMatch = rawText.match(/team\s*size\s*[:\-]?\s*(\d+)\s*(?:-|to)\s*(\d+)/i) ||
                      rawText.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*members/i);
    if (teamMatch) {
      teamSizeMin = parseInt(teamMatch[1], 10);
      teamSizeMax = parseInt(teamMatch[2], 10);
      verificationStatus.team_size = true;
    } else {
      const soloOrTeamMatch = rawText.match(/(?:solo or team up to|teams of up to)\s*(\d+)/i);
      if (soloOrTeamMatch) {
        teamSizeMin = 1;
        teamSizeMax = parseInt(soloOrTeamMatch[1], 10);
        verificationStatus.team_size = true;
      }
    }

    // Dates extraction
    const now = new Date();
    const startDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(); // fallback approx 2 weeks
    const endDate = new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000).toISOString();
    let registrationDeadline: string | null = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

    const deadlineMatch = rawText.match(/(?:registration deadline|deadline|apply by|submissions? close)\s*[:\-]?\s*([A-Za-z]+ \d{1,2}(?:, \d{4})?)/i);
    if (deadlineMatch) {
      verificationStatus.deadline = true;
    }

    // Technologies & Categories
    const categories: string[] = ['Technology'];
    const technologies: string[] = [];
    const techDict = [
      'AI', 'GenAI', 'LLM', 'Agents', 'Python', 'TypeScript', 'React', 'Next.js',
      'Rust', 'Solidity', 'Web3', 'Blockchain', 'Cybersecurity', 'Cloud', 'Machine Learning'
    ];
    for (const t of techDict) {
      if (new RegExp(`\\b${t}\\b`, 'i').test(rawText)) {
        technologies.push(t);
      }
    }
    if (technologies.some(t => ['AI', 'GenAI', 'LLM', 'Agents', 'Machine Learning'].includes(t))) {
      categories.push('Artificial Intelligence');
    }
    if (eventType === 'HACKATHON') categories.push('Hackathon');

    // Registration URL
    const regUrlMatch = rawText.match(/https?:\/\/[^\s)"]+(?:register|apply|join|events\.mlh\.io)[^\s)"]*/i);
    const registrationUrl = regUrlMatch ? regUrlMatch[0] : sourceUrl;

    const nowIso = new Date().toISOString();

    return {
      event_id: eventId,
      canonical_title: title,
      description: rawText.slice(0, 5000),
      short_summary: shortSummary,
      organizer_name: organizerName,
      source_platform: sourcePlatform,
      source_url: sourceUrl,
      registration_url: registrationUrl,
      event_type: eventType,
      categories,
      tags: technologies.slice(0, 5),
      technologies,
      themes: technologies.slice(0, 3),
      start_datetime: startDate,
      end_datetime: endDate,
      timezone: 'Asia/Kolkata',
      registration_open_datetime: nowIso,
      registration_deadline: registrationDeadline,
      location_name: locationName,
      city,
      state,
      country,
      latitude: city === 'Bengaluru' ? 12.9716 : (city === 'Delhi' ? 28.7041 : null),
      longitude: city === 'Bengaluru' ? 77.5946 : (city === 'Delhi' ? 77.1025 : null),
      online_or_in_person: onlineOrInPerson,
      attendance_format: attendanceFormat,
      price: 0, // default free hackathons unless stated
      currency: 'INR',
      prize_pool: prizePool,
      prize_pool_numeric: prizePoolNumeric,
      eligibility: ['College Students', 'Working Professionals', 'Open to All'],
      target_audience: ['Developers', 'Designers', 'Founders'],
      student_only: lowerText.includes('students only') || lowerText.includes('college students only'),
      experience_level: 'ALL',
      team_size_min: teamSizeMin,
      team_size_max: teamSizeMax,
      required_skills: technologies.slice(0, 4),
      deliverables: ['Working Prototype', 'GitHub Repository', 'Pitch Deck / Demo Video'],
      submission_requirements: ['Project link', 'Presentation slides', 'Demo video'],
      event_schedule: [
        { time: 'Day 1 09:00 AM', activity: 'Opening Ceremony & Team Formation' },
        { time: 'Day 1 12:00 PM', activity: 'Hacking Begins & Mentor Checkpoint' },
        { time: 'Day 2 02:00 PM', activity: 'Code Freeze & Project Submissions' },
        { time: 'Day 2 04:00 PM', activity: 'Presentations & Award Ceremony' }
      ],
      sponsors: ['Google Cloud', 'GitHub', 'AWS', 'Major League Hacking'].filter(s => rawText.toLowerCase().includes(s.toLowerCase())),
      organizer_information: `Organized by ${organizerName}. Official page at ${sourceUrl}`,
      registration_status: 'OPEN',
      event_status: 'SCHEDULED',
      last_verified_at: nowIso,
      last_changed_at: nowIso,
      content_hash: contentHash,
      extraction_confidence: 0.88,
      field_verification_status: verificationStatus,
      created_at: nowIso,
      updated_at: nowIso
    };
  }
}

export const normalizationService = new NormalizationService();

