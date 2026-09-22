"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const MENU_ITEMS = [
  {
    label: "앱 설정법",
    icon: "📲",
    children: [
      { label: "갤럭시(안드로이드)", href: "/guide/android" },
      { label: "아이폰(iOS)", href: "/guide/ios" },
    ],
  },
];

export default function SidebarLayout({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [isOccupied, setIsOccupied] = useState(null); // null = 로딩 중

  function closeSidebar() {
    setIsOpen(false);
  }

  function toggleExpanded(label) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") closeSidebar();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // 사이드바 "홈" 옆 상태 점 전용 — 메인 화면(page.js)의 구독 로직과는 별개.
  useEffect(() => {
    let isMounted = true;

    async function fetchStatus() {
      const { data, error } = await supabase
        .from("room_status")
        .select("is_occupied")
        .limit(1)
        .single();
      if (isMounted && !error) setIsOccupied(data.is_occupied);
    }

    fetchStatus();

    const channel = supabase
      .channel("sidebar_room_status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "room_status" },
        (payload) => {
          if (isMounted) setIsOccupied(payload.new.is_occupied);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const statusDotColor =
    isOccupied === null
      ? "bg-zinc-300 dark:bg-zinc-600"
      : isOccupied
      ? "bg-rose-500"
      : "bg-emerald-500";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={isOpen}
        className="fixed left-5 top-[calc(env(safe-area-inset-top,0px)+1.5rem)] z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl text-zinc-700 shadow-md transition-transform hover:scale-105 active:scale-95 dark:bg-zinc-900 dark:text-zinc-200"
      >
        ☰
      </button>

      <div
        onClick={closeSidebar}
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] transform flex-col bg-zinc-50 shadow-2xl transition-transform duration-300 ease-in-out dark:bg-zinc-950 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-3 pt-[env(safe-area-inset-top,0px)] dark:border-zinc-800">
          <Link
            href="/"
            onClick={closeSidebar}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-white dark:hover:bg-zinc-900"
          >
            <span className="text-lg" aria-hidden>
              🏠
            </span>
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              홈
            </span>
            <span
              className={`h-2 w-2 rounded-full transition-colors duration-500 ${statusDotColor}`}
              aria-hidden
            />
          </Link>
          <button
            type="button"
            onClick={closeSidebar}
            aria-label="메뉴 닫기"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          <p className="px-2 pt-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
            이용 가이드
          </p>

          {MENU_ITEMS.map((item) => (
            <div
              key={item.label}
              className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-zinc-900"
            >
              <button
                type="button"
                onClick={() => toggleExpanded(item.label)}
                aria-expanded={!!expanded[item.label]}
                className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-emerald-50 dark:text-zinc-200 dark:hover:bg-emerald-950/40"
              >
                <span className="text-base" aria-hidden>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                <span
                  className={`text-xs text-emerald-500 transition-transform duration-200 ${
                    expanded[item.label] ? "rotate-180" : ""
                  }`}
                  aria-hidden
                >
                  ▾
                </span>
              </button>

              <div
                className={`grid transition-all duration-200 ${
                  expanded[item.label] ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="flex flex-col gap-0.5 overflow-hidden px-2 pb-2">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={closeSidebar}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                    >
                      <span
                        className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-600"
                        aria-hidden
                      />
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {children}
    </>
  );
}
