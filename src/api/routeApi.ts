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
