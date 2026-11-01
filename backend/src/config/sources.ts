export interface SourceConfig {
  id: string;
  name: string;
  domain: string;
  enabled: boolean;
  rateLimitPerMinute: number;
  robotsCompliant: boolean;
  priority: number; // 1 = highest
  searchQueryTemplates: string[];
}

export const SOURCE_REGISTRY: Record<string, SourceConfig> = {
  luma: {
    id: 'luma',
    name: 'Luma',
    domain: 'lu.ma',
    enabled: true,
    rateLimitPerMinute: 30,
    robotsCompliant: true,
    priority: 1,
    searchQueryTemplates: [
      'site:lu.ma hackathon {location}',
      'site:lu.ma tech conference {location}',
      'site:lu.ma ai builder meetup {location}'
    ]
  },
  unstop: {
    id: 'unstop',
    name: 'Unstop',
    domain: 'unstop.com',
    enabled: true,
    rateLimitPerMinute: 30,
    robotsCompliant: true,
    priority: 1,
    searchQueryTemplates: [
      'site:unstop.com hackathons {location}',
      'site:unstop.com competitions college students {location}',
      'site:unstop.com coding challenges'
    ]
  },
  devfolio: {
    id: 'devfolio',
    name: 'Devfolio',
    domain: 'devfolio.co',
    enabled: true,
    rateLimitPerMinute: 30,
    robotsCompliant: true,
    priority: 1,
    searchQueryTemplates: [
      'site:devfolio.co hackathons {location}',
      'site:devfolio.co hackathons 2026'
    ]
  },
  devpost: {
    id: 'devpost',
    name: 'Devpost',
    domain: 'devpost.com',
    enabled: true,
    rateLimitPerMinute: 30,
    robotsCompliant: true,
    priority: 2,
    searchQueryTemplates: [
      'site:devpost.com hackathon {location}',
      'site:devpost.com online ai hackathon'
    ]
  },
  mlh: {
    id: 'mlh',
    name: 'Major League Hacking (MLH)',
    domain: 'mlh.io',
    enabled: true,
    rateLimitPerMinute: 20,
    robotsCompliant: true,
    priority: 2,
    searchQueryTemplates: [
      'site:mlh.io season 2026 hackathons',
      'site:events.mlh.io events'
    ]
  },
  eventbrite: {
    id: 'eventbrite',
    name: 'Eventbrite',
    domain: 'eventbrite.com',
    enabled: true,
    rateLimitPerMinute: 20,
    robotsCompliant: true,
    priority: 3,
    searchQueryTemplates: [
      'site:eventbrite.com hackathon {location}',
      'site:eventbrite.com developer workshop {location}'
    ]
  },
  dorahacks: {
    id: 'dorahacks',
    name: 'DoraHacks',
    domain: 'dorahacks.io',
    enabled: true,
    rateLimitPerMinute: 20,
    robotsCompliant: true,
    priority: 3,
    searchQueryTemplates: [
      'site:dorahacks.io hackathons',
      'site:dorahacks.io global grant'
    ]
  }
};

