import { API } from './config';
import { storage } from '../utils/storage';

export interface RouteRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  originName: string;
  destinationName: string;
  mode: 'BALANCED' | 'FASTEST' | 'SHORTEST';
}

export interface SignalCheckpoint {
  nodeId: number;
  lat: number;
  lng: number;
  etaFromStartSeconds: number;
  signalState: 'GREEN' | 'RED';
  recommendedPace: 'NORMAL' | 'SPEED_UP' | 'SLOW_DOWN';
}

export interface RouteResponse {
  polyline: string;
  totalTimeSeconds: number;
  totalDistanceMeters: number;
  signalCheckpoints: SignalCheckpoint[];
}

export const PACE_SPEED_MAP: Record<string, number> = {
  SLOW_DOWN: 3.5,
  NORMAL: 4.8,
  SPEED_UP: 6.0,
};

export async function searchRoute(payload: RouteRequest): Promise<RouteResponse> {
  const token = await storage.getToken();
  const res = await fetch(API.routes.search, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `서버 오류: ${res.status}`);
  }

  return res.json();
}

export function formatRemainingTime(seconds: number): { value: string; unit: string } {
  if (seconds < 3600) {
    return { value: String(Math.ceil(seconds / 60)), unit: '분' };
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  return { value: `${h}시간 ${m}`, unit: '분' };
}

export function formatArrivalTime(seconds: number): string {
  const arrival = new Date(Date.now() + seconds * 1000);
  const h = arrival.getHours();
  const m = arrival.getMinutes().toString().padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 || 12;
  return `${ampm} ${h12}:${m} 도착 예정`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function getNextSignal(checkpoints: SignalCheckpoint[]): SignalCheckpoint | null {
  return checkpoints.length > 0 ? checkpoints[0] : null;
}

export interface NavStep {
  instruction: string;
  streetName: string;
  distance: number;
  icon: string;
  location: [number, number]; // [lng, lat]
}

export function parseOsrmSteps(steps: any[]): NavStep[] {
  return steps
    .filter((s: any) => s.maneuver?.type !== 'depart' || s.distance > 0)
    .map((s: any) => {
      const type: string = s.maneuver?.type ?? '';
      const modifier: string = s.maneuver?.modifier ?? '';
      const name: string = s.name ?? '';

      let direction = '직진';
      let icon = 'arrow-up';

      if (type === 'arrive') {
        direction = '목적지 도착';
        icon = 'location';
      } else if (type === 'depart') {
        direction = '출발';
        icon = 'navigate-outline';
      } else if (modifier === 'right' || modifier === 'sharp right') {
        direction = '우회전';
        icon = 'arrow-forward';
      } else if (modifier === 'left' || modifier === 'sharp left') {
        direction = '좌회전';
        icon = 'arrow-back';
      } else if (modifier === 'slight right') {
        direction = '오른쪽으로';
        icon = 'arrow-forward-outline';
      } else if (modifier === 'slight left') {
        direction = '왼쪽으로';
        icon = 'arrow-back-outline';
      } else if (modifier === 'uturn') {
        direction = '유턴';
        icon = 'return-up-back';
      }

      return {
        instruction: direction,
        streetName: name,
        distance: Math.round(s.distance),
        icon,
        location: s.maneuver?.location ?? [0, 0],
      };
    });
}
