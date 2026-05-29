'use client';

import { useEffect, useRef } from 'react';
import type { Map, Marker } from 'leaflet';

type Property = {
  id: string;
  slug: string;
  name: string;
  city: string;
  region: string;
  latitude?: number | null;
  longitude?: number | null;
  priceFrom?: number | null;
  propertyType: string;
};

const TYPE_COLORS: Record<string, string> = {
  hostel: '#059669', // emerald-600
  guesthouse: '#0284c7', // sky-600
  hotel: '#4f46e5', // indigo-600
  resort: '#d97706', // amber-600
  apartment: '#7c3aed', // violet-600
};

function pinColor(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] ?? '#52525b';
}

function makePinIcon(L: typeof import('leaflet'), property: Property, hovered: boolean) {
  const color = pinColor(property.propertyType);
  const price =
    property.priceFrom != null
      ? `₱${(property.priceFrom / 100).toLocaleString('en-PH')}`
      : property.city;
  const scale = hovered ? 1.25 : 1;
  const shadow = hovered
    ? `box-shadow:0 4px 16px rgba(0,0,0,.35);`
    : `box-shadow:0 2px 6px rgba(0,0,0,.22);`;
  const html = `
    <div style="
      background:${color};
      color:#fff;
      padding:4px 8px;
      border-radius:20px;
      font:600 12px/1.3 sans-serif;
      white-space:nowrap;
      transform:scale(${scale});
      transform-origin:bottom center;
      transition:transform .15s ease;
      ${shadow}
    ">${price}</div>
    <div style="
      width:0;height:0;
      border-left:6px solid transparent;
      border-right:6px solid transparent;
      border-top:8px solid ${color};
      margin:0 auto;
      transition:border-top-color .15s;
    "></div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconAnchor: [30, 28],
    iconSize: [60, 36],
    popupAnchor: [0, -32],
  });
}

export function PropertiesMap({
  properties,
  locale,
  hoveredId,
}: {
  properties: Property[];
  locale: string;
  hoveredId: string | null;
}) {
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new globalThis.Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const mapped = properties.filter((p) => p.latitude && p.longitude);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (mapped.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');
    // Fix default icon image path in Next.js builds
    // @ts-expect-error – _getIconUrl is not in types
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl: '/leaflet/marker-icon.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    });

    // Fit bounds to all properties
    const lats = mapped.map((p) => p.latitude!);
    const lngs = mapped.map((p) => p.longitude!);
    const bounds = L.latLngBounds(
      [Math.min(...lats) - 0.02, Math.min(...lngs) - 0.02],
      [Math.max(...lats) + 0.02, Math.max(...lngs) + 0.02],
    );

    const map = L.map(containerRef.current, { zoomControl: true }).fitBounds(bounds);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    mapped.forEach((p) => {
      const marker = L.marker([p.latitude!, p.longitude!], {
        icon: makePinIcon(L, p, false),
        title: p.name,
      }).addTo(map);

      marker.bindPopup(`
        <div style="min-width:160px;font-family:sans-serif">
          <p style="font-weight:700;font-size:14px;margin:0 0 2px">${p.name}</p>
          <p style="font-size:12px;color:#71717a;margin:0 0 6px">${p.city}, ${p.region}</p>
          ${p.priceFrom != null ? `<p style="font-weight:600;font-size:13px;margin:0">From ₱${(p.priceFrom / 100).toLocaleString('en-PH')}/night</p>` : ''}
          <a href="/${locale}/properties/${p.slug}" style="display:inline-block;margin-top:8px;font-size:12px;font-weight:600;color:#059669;text-decoration:none">View property →</a>
        </div>
      `);

      markersRef.current.set(p.id, marker);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update pin styles on hover change
  useEffect(() => {
    if (!mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');
    mapped.forEach((p) => {
      const marker = markersRef.current.get(p.id);
      if (!marker) return;
      const isHovered = p.id === hoveredId;
      marker.setIcon(makePinIcon(L, p, isHovered));
      if (isHovered) {
        marker.setZIndexOffset(1000);
        marker.openPopup();
      } else {
        marker.setZIndexOffset(0);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredId]);

  if (mapped.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
        <p className="text-sm text-zinc-500">No properties with map coordinates yet.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700"
      style={{ height: 420 }}
    />
  );
}
