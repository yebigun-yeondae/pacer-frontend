import { useEffect, useMemo, useState } from "react";
import type { IntersectionSignal, SignalCheckpoint } from "../api/routeApi";

export type SignalLightStatus = "RED" | "GREEN" | "UNKNOWN";

export interface ComputedIntersectionSignal {
  order: number;
  itstId: number;
  name: string;
  lat: number;
  lng: number;
  signalDirection: string;
  status: SignalLightStatus;
  remainingSec: number | null;
}

/**
 * signalCheckpoints의 한 항목(건너는 방향, 초기 신호 상태/잔여시간)과
 * intersectionSignals의 신호 사이클 정보를 함께 이용해 elapsedSec(경로 안내
 * 시작 후 경과 초)에 해당하는 신호 상태와 다음 전환까지 남은 시간을 계산.
 *
 * - checkpoint.signalDirection에 해당하는 signalCycles[direction]이 없거나
 *   redMaxSec/greenMaxSec 중 하나라도 없으면 UNKNOWN(물음표) 처리.
 * - 최초 잔여시간(checkpoint.remainingSeconds, 단위: 1/10초)이 끝나면 상태를
 *   반전시키고 signalCycles의 redMaxSec/greenMaxSec를 번갈아 사용해 무한 반복.
 */
export function computeIntersectionSignal(
  sig: IntersectionSignal | null | undefined,
  checkpoint: SignalCheckpoint,
  elapsedSec: number,
): ComputedIntersectionSignal {
  const base = {
    order: checkpoint.order,
    itstId: checkpoint.intersectionId,
    name: sig?.name ?? "",
    lat: checkpoint.lat,
    lng: checkpoint.lng,
    signalDirection: checkpoint.signalDirection,
  };

  const cycle = sig?.signalCycles?.[checkpoint.signalDirection];
  if (!cycle || cycle.redMaxSec == null || cycle.greenMaxSec == null || checkpoint.remainingSeconds == null) {
    return { ...base, status: "UNKNOWN", remainingSec: null };
  }

  let status: "RED" | "GREEN" = checkpoint.signalState;
  // remainingSeconds는 데시초(1/10초) 단위로 내려옴
  let remaining = checkpoint.remainingSeconds / 10;
  let t = elapsedSec;

  while (t >= remaining) {
    t -= remaining;
    status = status === "RED" ? "GREEN" : "RED";
    remaining = status === "RED" ? cycle.redMaxSec! : cycle.greenMaxSec!;
  }
  remaining -= t;

  return { ...base, status, remainingSec: Math.max(0, Math.ceil(remaining)) };
}

/**
 * 경로 안내 동안 매초 갱신되는 교차로 신호 상태 목록을 반환.
 * signalCheckpoints의 각 항목을 intersectionSignals 중 intersectionId === itstId인
 * 항목과 매칭해 computeIntersectionSignal로 계산한다.
 * active === false 이면 타이머를 멈추고 elapsed를 0으로 초기화.
 */
export function useIntersectionSignals(
  intersectionSignals: IntersectionSignal[] | undefined | null,
  signalCheckpoints: SignalCheckpoint[] | undefined | null,
  active: boolean,
): { elapsed: number; signals: ComputedIntersectionSignal[] } {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  const computed = useMemo(() => {
    const checkpoints = signalCheckpoints ?? [];
    return checkpoints
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((checkpoint) => {
        const sig = (intersectionSignals ?? []).find(
          (s) => s.itstId === checkpoint.intersectionId,
        );
        return computeIntersectionSignal(sig, checkpoint, elapsed);
      });
  }, [intersectionSignals, signalCheckpoints, elapsed]);

  return { elapsed, signals: computed };
}
