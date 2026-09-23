"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";

const MIN_SAMPLE_SIZE = 5;
const BUSINESS_HOURS = { start: 9, end: 18 }; // 9시~18시 (양 끝 포함)
const MAX_VALID_DURATION_MINUTES = 240; // 4시간 이상은 이상치로 간주해 평균에서 제외
const GAUGE_REFERENCE_MINUTES = 60; // 원형 게이지가 100% 차 보이는 기준값(1시간)

// room_status_log.changed_at은 타임존 정보가 없는 "KST 벽시계" 문자열이다
// (예: "2026-09-22T10:32:15.123").
//
// - 요일/시각 같은 "달력 값"을 읽을 때는 문자열 끝에 Z를 붙여 그 값 자체를
//   UTC로 해석시킨 뒤 getUTC* 로만 읽는다. 이렇게 하면 이 코드를 실행하는
//   환경(브라우저/서버)의 로컬 타임존이 무엇이든 문자열에 적힌 값 그대로
//   나온다 — new Date(str).getHours()/getDay()처럼 로컬 타임존에 좌우되는
//   방식은 실행 환경이 KST가 아니면 시/요일이 어긋날 수 있어 사용하지 않는다.
// - 두 시각 사이의 "경과 시간(ms)"을 구할 때는 +09:00을 붙여 절대 시각으로
//   파싱한다. 두 값 모두 같은 오프셋을 쓰므로 뺄셈 결과(차이)는 어떤 오프셋을
//   고르든 항상 동일하다.
function calendarFields(changedAt) {
  const d = new Date(`${changedAt}Z`);
  return { weekday: d.getUTCDay(), hour: d.getUTCHours() }; // weekday: 0=일 ... 6=토
}

function toInstant(changedAt) {
  return new Date(`${changedAt}+09:00`);
}

function isWeekdayBusinessHour(changedAt) {
  const { weekday, hour } = calendarFields(changedAt);
  return (
    weekday >= 1 &&
    weekday <= 5 &&
    hour >= BUSINESS_HOURS.start &&
    hour <= BUSINESS_HOURS.end
  );
}

function buildHourlyUsage(rows) {
  const hours = Array.from(
    { length: BUSINESS_HOURS.end - BUSINESS_HOURS.start + 1 },
    (_, i) => BUSINESS_HOURS.start + i
  );
  const counts = new Map(hours.map((h) => [h, 0]));

  for (const row of rows) {
    if (row.is_occupied !== true) continue;
    if (!isWeekdayBusinessHour(row.changed_at)) continue;
    const { hour } = calendarFields(row.changed_at);
    counts.set(hour, counts.get(hour) + 1);
  }

  return hours.map((hour) => ({ hour, count: counts.get(hour) }));
}

// changed_at 오름차순으로 정렬된 로그에서 true -> false로 바로 이어지는 쌍만
// "한 번의 사용"으로 본다. 그 중에서도 true로 바뀐(=사용 시작) 시각이 평일
// 9~18시인 구간만 포함하고, 4시간(240분) 이상 걸린 구간은 문이 열린 채
// 방치됐거나 자정을 넘긴 이상치로 보고 평균에서 제외한다.
function buildAverageDuration(rows) {
  const sorted = [...rows].sort(
    (a, b) => toInstant(a.changed_at) - toInstant(b.changed_at)
  );

  let rawPairs = 0;
  let filteredPairs = 0;
  let outliers = 0;
  const durations = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (current.is_occupied !== true || next.is_occupied !== false) continue;
    rawPairs += 1;

    if (!isWeekdayBusinessHour(current.changed_at)) continue;
    filteredPairs += 1;

    const diffMinutes =
      (toInstant(next.changed_at) - toInstant(current.changed_at)) / 60000;
    if (diffMinutes < 0) continue; // 역전된 데이터 방어

    if (diffMinutes >= MAX_VALID_DURATION_MINUTES) {
      outliers += 1;
      continue;
    }

    durations.push(diffMinutes);
  }

  const averageMinutes =
    durations.length === 0
      ? null
      : Math.round(
          durations.reduce((sum, d) => sum + d, 0) / durations.length
        );

  return {
    averageMinutes,
    sampleSize: durations.length,
    debug: { rawPairs, filteredPairs, outliers },
  };
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  return remain === 0 ? `${hours}시간` : `${hours}시간 ${remain}분`;
}

// 앱 아이콘(오렌지 원)과 동일한 색(#FC6E1D)을 이 페이지의 포인트 컬러로 사용한다.
// 사용 빈도가 높을수록 옅은 오렌지 틴트 -> 포인트 컬러(#FC6E1D)로 진해지는 색.
// 가장 높은 막대는 ratio=1이 되어 자연스럽게 포인트 컬러로 강조된다.
function orangeShade(ratio) {
  const light = [255, 232, 214]; // 아주 옅은 오렌지 틴트
  const deep = [252, 110, 29]; // #FC6E1D
  const [r, g, b] = light.map((c, i) => Math.round(c + (deep[i] - c) * ratio));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function StatsPage() {
  const [rows, setRows] = useState(null); // null = 로딩 중
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchLogs() {
      const { data, error: fetchError } = await supabase
        .from("room_status_log")
        .select("is_occupied, changed_at")
        .order("changed_at", { ascending: true });

      if (!isMounted) return;

      if (fetchError) {
        console.error("room_status_log 조회 실패:", fetchError);
        setError(fetchError.message);
      } else {
        setRows(data ?? []);
      }
    }

    fetchLogs();
    return () => {
      isMounted = false;
    };
  }, []);

  const hourlyUsage = useMemo(
    () => (rows ? buildHourlyUsage(rows) : []),
    [rows]
  );
  const averageResult = useMemo(
    () =>
      rows
        ? buildAverageDuration(rows)
        : { averageMinutes: null, sampleSize: 0, debug: null },
    [rows]
  );

  // 요청하신 3가지 점검(평일 9~18시 필터, 4시간 이상 제외, 타임존 처리)을
  // 직접 눈으로 확인할 수 있도록 콘솔에 중간 집계를 찍는다.
  useEffect(() => {
    if (!rows) return;
    const hourlyTotal = hourlyUsage.reduce((sum, d) => sum + d.count, 0);
    console.log("[이용 통계] 필터링/이상치 검증 로그", {
      로그_전체_행수: rows.length,
      "① 평일 9~18시 true 건수 (막대그래프 합계)": hourlyTotal,
      "true→false 쌍 (필터 적용 전)": averageResult.debug?.rawPairs ?? 0,
      "① 평일 9~18시 시작 조건 통과 쌍": averageResult.debug?.filteredPairs ?? 0,
      "② 4시간(240분) 이상으로 제외된 이상치 쌍": averageResult.debug?.outliers ?? 0,
      "최종 평균 계산에 쓰인 표본 수": averageResult.sampleSize,
      "평균 사용 시간(분)": averageResult.averageMinutes,
    });
  }, [rows, hourlyUsage, averageResult]);

  const isLoading = rows === null && !error;
  const hourlyTotal = hourlyUsage.reduce((sum, d) => sum + d.count, 0);
  const hasChartData = hourlyTotal >= MIN_SAMPLE_SIZE;
  const hasAverageData = averageResult.sampleSize >= MIN_SAMPLE_SIZE;
  const maxCount = Math.max(1, ...hourlyUsage.map((d) => d.count));

  const gaugeRadius = 50;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeFraction =
    averageResult.averageMinutes === null
      ? 0
      : Math.min(averageResult.averageMinutes / GAUGE_REFERENCE_MINUTES, 1);
  const gaugeOffset = gaugeCircumference * (1 - gaugeFraction);

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
          이용 통계
        </p>
        <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
          6층 여자 휴게실 이용 패턴
        </h1>
      </div>

      {isLoading ? (
        <div className="flex h-40 w-full max-w-sm items-center justify-center rounded-3xl bg-white text-sm text-zinc-500 shadow-sm dark:bg-zinc-900 dark:text-zinc-400">
          불러오는 중...
        </div>
      ) : error ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-3xl bg-white p-8 text-center shadow-sm dark:bg-zinc-900">
          <p className="font-semibold text-zinc-700 dark:text-zinc-200">
            통계를 불러오지 못했습니다
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
        </div>
      ) : (
        <div className="flex w-full max-w-sm flex-col gap-5">
          <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-base dark:bg-orange-500/10"
                aria-hidden
              >
                📊
              </span>
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                시간대별 사용 빈도 (평일 9시~18시 기준)
              </h2>
            </div>

            {!hasChartData ? (
              <p className="flex h-56 items-center justify-center px-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                아직 통계를 내기엔 데이터가 부족합니다
              </p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyUsage} barCategoryGap="22%">
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(hour) => `${hour}시`}
                      interval={0}
                      tick={{ fontSize: 11, fill: "#a1a1aa" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(252, 110, 29, 0.06)" }}
                      formatter={(value) => [`${value}회`, "사용 횟수"]}
                      labelFormatter={(hour) => `${hour}시`}
                      contentStyle={{
                        borderRadius: 14,
                        border: "none",
                        boxShadow: "0 8px 24px rgba(24, 24, 27, 0.12)",
                        fontSize: 12,
                        color: "#27272a",
                      }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 8, 8]}>
                      {hourlyUsage.map((entry) => (
                        <Cell
                          key={entry.hour}
                          fill={orangeShade(entry.count / maxCount)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="flex flex-col items-center gap-1 rounded-3xl bg-white p-6 text-center shadow-[0_16px_40px_-20px_rgba(252,110,29,0.35)] dark:bg-zinc-900">
            <div className="mb-3 flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-base dark:bg-orange-500/10"
                aria-hidden
              >
                ⏰
              </span>
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                평균 사용 시간 (평일 업무시간 기준)
              </h2>
            </div>

            {!hasAverageData ? (
              <p className="py-8 text-sm text-zinc-500 dark:text-zinc-400">
                아직 통계를 내기엔 데이터가 부족합니다
              </p>
            ) : (
              <>
                <div className="relative flex h-32 w-32 items-center justify-center">
                  <svg viewBox="0 0 112 112" className="h-32 w-32 -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r={gaugeRadius}
                      fill="none"
                      strokeWidth="9"
                      className="stroke-zinc-100 dark:stroke-zinc-800"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r={gaugeRadius}
                      fill="none"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={gaugeCircumference}
                      strokeDashoffset={gaugeOffset}
                      className="stroke-[#FC6E1D] transition-all duration-700"
                    />
                  </svg>
                  <span className="absolute flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6 text-[#FC6E1D]"
                      aria-hidden
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  </span>
                </div>

                <p className="mt-3 text-4xl font-extrabold tracking-tight text-[#FC6E1D]">
                  {formatDuration(averageResult.averageMinutes)}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  최근 표본 {averageResult.sampleSize}건 기준
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
