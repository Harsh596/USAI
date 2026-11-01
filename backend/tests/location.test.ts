import request from 'supertest';
import app from '../src/server';
import { LocationService } from '../src/services/location.service';
import { db } from '../src/db/database';

describe('Accurate Location Filtering and Normalization Tests', () => {
  beforeAll(() => {
    LocationService.normalizeAllEvents();
  });

  test('Alias resolution maps variants to canonical city and state', () => {
    const res1 = LocationService.resolveLocation('Bangalore');
    expect(res1.cityId).toBe('city-blr');
    expect(res1.cityName).toBe('Bengaluru');
    expect(res1.stateName).toBe('Karnataka');

    const res2 = LocationService.resolveLocation('Bengaluru, Electronic City');
    expect(res2.cityId).toBe('city-blr');

    const res3 = LocationService.resolveLocation('Bombay, Maharashtra');
    expect(res3.cityId).toBe('city-mum');
    expect(res3.cityName).toBe('Mumbai');
    expect(res3.stateName).toBe('Maharashtra');

    const res4 = LocationService.resolveLocation('New Delhi');
    expect(res4.cityId).toBe('city-del');
    expect(res4.cityName).toBe('Delhi');
  });

  test('State resolution handles standalone states without confusing with cities', () => {
    const res = LocationService.resolveLocation('Karnataka, India');
    expect(res.cityId).toBeNull();
    expect(res.stateId).toBe('state-ka');
    expect(res.stateName).toBe('Karnataka');
  });

  test('Online events are strictly decoupled from physical city records', () => {
    const res = LocationService.resolveLocation('Virtual event on Zoom and Discord', true);
    expect(res.isOnline).toBe(true);
    expect(res.cityId).toBeNull();
    expect(res.cityName).toBeNull();
  });

  test('GET /api/v1/locations/states returns canonical state list with city & event counts', async () => {
    const res = await request(app).get('/api/v1/locations/states');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.states)).toBe(true);

    const karnataka = res.body.states.find((s: any) => s.code === 'KA');
    expect(karnataka).toBeDefined();
    expect(karnataka.city_count).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/v1/locations/cities filters by state_id and supports query autocomplete', async () => {
    // 1. Filter by Karnataka
    const kaCities = await request(app).get('/api/v1/locations/cities?state_id=state-ka');
    expect(kaCities.status).toBe(200);
    expect(kaCities.body.cities.some((c: any) => c.canonical_name === 'Bengaluru')).toBe(true);

    // 2. Autocomplete search with alias "Bangalore"
    const autoRes = await request(app).get('/api/v1/locations/cities?query=bangalore');
    expect(autoRes.status).toBe(200);
    expect(autoRes.body.cities[0].canonical_name).toBe('Bengaluru');
  });

  test('Multi-city filtering and dedicated online filtering via /api/v1/events', async () => {
    // 1. Filter by specific city ID
    const blrRes = await request(app).get('/api/v1/events?city_ids=city-blr');
    expect(blrRes.status).toBe(200);
    for (const ev of blrRes.body.events) {
      expect(ev.city_id).toBe('city-blr');
    }

    // 2. Only online filter
    const onlineRes = await request(app).get('/api/v1/events?only_online=true');
    expect(onlineRes.status).toBe(200);
    expect(onlineRes.body.events.length).toBeGreaterThan(0);
    for (const ev of onlineRes.body.events) {
      expect(ev.attendance_format === 'ONLINE' || ev.online_or_in_person === 'ONLINE').toBe(true);
    }
  });
});

