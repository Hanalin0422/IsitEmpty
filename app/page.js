"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// DB에는 KST 벽시계 시각이 timezone 정보 없이 저장돼 있음 (예: "2026-09-17T10:32:15.123").
// 브라우저가 이걸 로컬 시간으로 오해하지 않도록 +09:00을 붙여서 절대 시각으로 파싱한다.
function parseKstTimestamp(value) {
  if (!value) return null;
  return new Date(`${value}+09:00`);
}

function formatElapsed(from, now) {
  if (!from) return null;
  const diffMs = now - from;
  if (diffMs < 0) return "방금 전";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 바뀜";
  if (minutes < 60) return `${minutes}분째`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return `${hours}시간 ${remainMinutes}분째`;
}

function formatClock(date) {
  if (!date) return "-";
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Home() {
  const [status, setStatus] = useState(null); // room_status 행
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [realtimeStatus, setRealtimeStatus] = useState("CONNECTING");

  useEffect(() => {
    let isMounted = true;

    async function fetchInitialStatus() {
      try {
        const { data, error: fetchError } = await supabase
          .from("room_status")
          .select("is_occupied, changed_at")
          .limit(1)
          .single();

        if (!isMounted) return;

        if (fetchError) {
          console.error("room_status 조회 실패:", fetchError);
          setError(fetchError.message);
        } else {
          setStatus(data);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("room_status 조회 중 예외 발생:", err);
        setError(err.message ?? String(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchInitialStatus();

    const channel = supabase
      .channel("room_status_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "room_status" },
        (payload) => {
          console.log("[realtime] room_status UPDATE 수신:", payload.new);
          if (isMounted) setStatus(payload.new);
        }
      )
      .subscribe((subStatus, err) => {
        console.log("[realtime] 채널 상태:", subStatus, err ?? "");
        if (isMounted) setRealtimeStatus(subStatus);
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isOccupied = status?.is_occupied ?? false;
  const changedAt = parseKstTimestamp(status?.changed_at);

  const statusLabel = isOccupied ? "사용 중" : "비어있음";
  const statusColor = isOccupied
    ? "bg-rose-500 dark:bg-rose-600"
    : "bg-emerald-500 dark:bg-emerald-600";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-12 dark:bg-black">
      <p className="text-sm font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
        6층 여자 휴게실
      </p>

      <span
        className={`text-xs font-medium ${
          realtimeStatus === "SUBSCRIBED"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-amber-600 dark:text-amber-400"
        }`}
      >
        {realtimeStatus === "SUBSCRIBED"
          ? "● 실시간 연결됨"
          : `● 실시간 연결 안 됨 (${realtimeStatus})`}
      </span>

      {loading ? (
        <div className="flex h-64 w-64 items-center justify-center rounded-3xl bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          불러오는 중...
        </div>
      ) : error ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-3xl bg-zinc-200 p-8 text-center dark:bg-zinc-800">
          <p className="font-semibold text-zinc-700 dark:text-zinc-200">
            상태를 불러오지 못했습니다
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
        </div>
      ) : (
        <div
          className={`flex h-64 w-64 flex-col items-center justify-center gap-2 rounded-3xl text-white shadow-lg transition-colors duration-500 ${statusColor}`}
        >
          <span className="text-5xl" aria-hidden>
            {isOccupied ? "🔒" : "🚪"}
          </span>
          <span className="text-3xl font-bold">{statusLabel}</span>
          {changedAt && (
            <span className="text-sm font-medium text-white/80">
              {formatElapsed(changedAt, now)}
            </span>
          )}
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <span>마지막 변경: {formatClock(changedAt)}</span>
        </div>
      )}
    </div>
  );
}
