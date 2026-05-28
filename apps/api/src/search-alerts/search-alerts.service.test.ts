import { describe, it, expect } from 'vitest';

// ─── Filter matching logic (mirrors sendAlerts cron) ─────────────────────────

type Alert = {
  city: string | null;
  propertyType: string | null;
  amenities: string[] | null;
};

type Property = {
  city: string | null;
  propertyType: string | null;
};

function alertMatchesProperty(alert: Alert, property: Property): boolean {
  if (alert.city && property.city?.toLowerCase() !== alert.city.toLowerCase()) return false;
  if (alert.propertyType && property.propertyType !== alert.propertyType) return false;
  return true;
}

describe('search alert matching', () => {
  it('alert with no filters matches any property', () => {
    const alert: Alert = { city: null, propertyType: null, amenities: null };
    expect(alertMatchesProperty(alert, { city: 'El Nido', propertyType: 'hostel' })).toBe(true);
    expect(alertMatchesProperty(alert, { city: null, propertyType: null })).toBe(true);
  });

  it('city filter is case-insensitive', () => {
    const alert: Alert = { city: 'el nido', propertyType: null, amenities: null };
    expect(alertMatchesProperty(alert, { city: 'El Nido', propertyType: 'hostel' })).toBe(true);
    expect(alertMatchesProperty(alert, { city: 'EL NIDO', propertyType: 'hostel' })).toBe(true);
  });

  it('city filter excludes non-matching cities', () => {
    const alert: Alert = { city: 'El Nido', propertyType: null, amenities: null };
    expect(alertMatchesProperty(alert, { city: 'Palawan', propertyType: 'hostel' })).toBe(false);
  });

  it('propertyType filter matches exactly', () => {
    const alert: Alert = { city: null, propertyType: 'hostel', amenities: null };
    expect(alertMatchesProperty(alert, { city: 'Cebu', propertyType: 'hostel' })).toBe(true);
    expect(alertMatchesProperty(alert, { city: 'Cebu', propertyType: 'hotel' })).toBe(false);
  });

  it('both city and type must match when both set', () => {
    const alert: Alert = { city: 'Cebu', propertyType: 'hostel', amenities: null };
    expect(alertMatchesProperty(alert, { city: 'Cebu', propertyType: 'hostel' })).toBe(true);
    expect(alertMatchesProperty(alert, { city: 'Cebu', propertyType: 'hotel' })).toBe(false);
    expect(alertMatchesProperty(alert, { city: 'Manila', propertyType: 'hostel' })).toBe(false);
  });

  it('property with null city does not match city alert', () => {
    const alert: Alert = { city: 'El Nido', propertyType: null, amenities: null };
    expect(alertMatchesProperty(alert, { city: null, propertyType: 'hostel' })).toBe(false);
  });
});

// ─── Multiple alerts receiving the same new property ─────────────────────────

describe('search alert batch', () => {
  const newProperty: Property = { city: 'El Nido', propertyType: 'hostel' };

  const alerts: Alert[] = [
    { city: 'El Nido', propertyType: null, amenities: null },
    { city: 'El Nido', propertyType: 'hostel', amenities: null },
    { city: 'Manila', propertyType: null, amenities: null },
    { city: null, propertyType: 'hotel', amenities: null },
    { city: null, propertyType: null, amenities: null },
  ];

  it('correctly identifies which alerts should be notified', () => {
    const matching = alerts.filter((a) => alertMatchesProperty(a, newProperty));
    // El Nido (any type) + El Nido hostel + any city/type = 3 matches
    expect(matching).toHaveLength(3);
  });
});
