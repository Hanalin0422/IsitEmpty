# 휴게실 상태 모니터링 프로젝트 계획서

> 6층 휴게실 문의 개폐 상태를 IoT 센서로 감지하여, 4/5/6/7층 사용자가 실시간으로 휴게실 사용 가능 여부를 확인할 수 있는 웹 애플리케이션

---

## 0. 현재 진행 상황 (최신 업데이트)

**완료됨** ✅
- 하드웨어 조립 (ESP32 + BL0303 자석스위치, 브레드보드 배선)
- 10초 디바운싱 로직 검증 (Serial Monitor로 확인 완료)
- ESP32 WiFi 연결 성공 (회사 WiFi, IP 정상 발급)
- HTTP POST 전송 검증 (webhook.site로 실제 인터넷 전송 확인, 응답 코드 200)
- Supabase 신규 프로젝트 생성 (프로젝트명: IsitEmpty, Seoul 리전)
- Supabase 스키마 최종 확정 및 테이블 생성 완료 (`room_status`, `room_status_log` — 5번 항목 참고)
- Supabase Realtime 활성화 (Publications → supabase_realtime에서 room_status 켬)
- Supabase API 키 확보 (Publishable key, Secret key — 예전 이름으로는 anon key/service_role key)
- Supabase RLS(Row Level Security) 정책 설정 — `room_status`, `room_status_log` 둘 다 SELECT(읽기)만 public 허용, INSERT/UPDATE/DELETE는 차단 (프론트엔드는 읽기 전용, 쓰기는 백엔드 Secret key로만 가능)
- Next.js 프로젝트 생성 (WSL + VS Code Remote-WSL 환경, TypeScript 미사용, Tailwind 사용, App Router 사용)
- `.env.local` 환경변수 파일 작성 (SUPABASE_URL, SUPABASE_SECRET_KEY, DOOR_SENSOR_SECRET)
- `/api/update-status` API 라우트 작성 및 Postman으로 로컬 테스트 성공 — 현재 상태 갱신 + 이력 기록(room_status_log 적재) 둘 다 동작 확인
- `/api/heartbeat` API 라우트 작성 및 테스트 성공 — `last_ping_at`만 갱신
- DB 시각 저장을 한국시간(KST) 기준으로 통일 (timestamptz → timestamp 타입 변경 + 코드에서 +9시간 계산 후 저장)
- 프론트엔드 메인 화면 구현 완료 (Claude Code 활용) — 6층 여자 휴게실 상태를 큰 색상 카드(초록=비어있음/빨강=사용 중)로 표시, "N분째" 경과 시간 표시, "마지막 변경" 시각 표시, Supabase Realtime 구독으로 새로고침 없이 실시간 갱신 확인 완료
- WSL 환경에서 ESP32(같은 회사 WiFi) → Windows 로컬 서버로 접근 가능하도록 포트 포워딩 설정 (`netsh interface portproxy` + 방화벽 규칙 추가) — ESP32에서 실제 상태 변경 → DB 반영 → 화면 실시간 갱신까지 전체 파이프라인 end-to-end 확인 완료
- 잘못된 토큰 요청 차단(401) 테스트 완료 — 정상 동작 확인
- 센서 연결 상태 표시 UI 구현 완료 — `last_ping_at` 기준으로 "실시간 연결됨" / "실시간 연결 안됨" 형태로 표시 (당초 계획했던 "N분 전 응답", "센서 응답 없음" 문구 대신 이 방식으로 확정)

**진행 중** 🔧
- 없음 (다음 단계인 Vercel 배포 착수 예정)

**미해결 이슈** ⚠️
- **설치 위치에 콘센트 없음** — 최종 설치 전 해결 필요 (아래 9번 리스크 항목 참고)

**참고: Supabase API 키 이름 변경**
Supabase가 최근 키 이름 체계를 바꿔서, 기존 문서의 `anon key`/`service_role key`는 새 대시보드에서 각각 **Publishable key**(프론트엔드용, 공개 가능) / **Secret key**(백엔드 전용, 절대 노출 금지)로 표시됨. 역할은 동일함.

**트러블슈팅 기록** (참고용)
- GPIO4 값이 계속 HIGH로 고정되는 문제 발생 → 원인은 ADC2/WiFi 충돌이 아니라 **ESP32 보드 자체가 브레드보드에 제대로 꽂혀있지 않았던 것**(접촉 불량)이었음. 보드를 다시 확실히 꽂은 후 정상화됨
- Arduino IDE에서 디버그(🐛) 버튼과 업로드(→) 버튼을 헷갈려 `openocd` 에러 발생 → 업로드 버튼 사용으로 해결
- `WiFi.h` 대신 `esp_wifi.h`를 include하여 컴파일 에러 발생 → `WiFi.h`(Arduino 표준 라이브러리)로 수정하여 해결
- Supabase 메뉴 개편으로 "Database → Replication"이 다른 기능(외부 전송)으로 바뀜 → Realtime 켜는 기능은 **"Database → Publications"**로 이동했음
- API 라우트 파일명을 `route.js`가 아닌 `rout.js`(오타)로 생성하여 404 발생 → 파일명 수정 후 정상 동작
- Supabase `timestamptz` 타입은 UTC로 저장되어 Table Editor에 한국시간보다 9시간 느리게 표시됨 → `timestamp`(타임존 없는 타입)로 변경하고, 서버 코드에서 KST(+9시간)를 직접 계산해 문자열로 저장하는 방식으로 해결
- 이력 데이터(언제 얼마나 사용했는지 통계용) 필요 여부를 임의로 "나중에 필요하면 추가"로 축소 판단했던 것 → 사용자 요청으로 즉시 `room_status_log` 테이블을 만들어 매 상태 변경마다 이력이 누적되도록 수정함
- ESP32에서 컴퓨터의 `localhost:3000`으로 접근 시도 → 실패 (ESP32 입장에서 localhost는 "자기 자신"을 가리켜 접근 불가능). Windows 실제 Wi-Fi IP로 교체 필요
- 그마저도 처음엔 `-1`(연결 실패) 에러 → 원인은 Next.js 서버가 WSL 내부에서 실행 중이라 Windows가 받은 요청이 WSL로 전달되지 않는 문제. `netsh interface portproxy`로 포트 포워딩 설정 + 방화벽 규칙 추가하여 해결
- Serial Monitor에 한글 로그 출력 시 `????` 형태로 깨지는 현상 발생 → WiFi 통신 타이밍과 한글(멀티바이트) 시리얼 출력이 겹치며 발생하는 ESP32 특유의 현상. 디버그 로그를 전부 영어로 변경하여 해결 (일부 누락된 한글 줄 재발 → 전수 확인 후 완전 해결)
- ESP32 코드에서 `unsigned long lastHeartbeatAt = 0` 세미콜론 누락으로 컴파일 에러 → 세미콜론 추가로 해결
- 하트비트 요청이 `-5`(타임아웃) 에러 → `sendHeartbeat()`에 `Content-Type` 헤더 누락이 원인으로 추정, 헤더 추가 및 빈 body(`""`) 대신 `"{}"`로 수정하여 해결

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 목적 | 휴게실 문 개폐 상태를 실시간으로 감지하여, 사용자가 방문 전 미리 확인 가능하게 함 |
| 대상 사용자 | 4, 5, 6, 7층 근무자 |
| 핵심 로직 | 문이 **열려있으면 비어있음**, **닫혀있으면 사용 중** |
| 완성 형태 | 웹앱(PWA) — 홈 화면에 아이콘 추가, 실시간 상태 표시 |

---

## 2. 전체 시스템 구조

```
[리드 스위치 + 자석 (문에 부착)]
        ↓ (개폐 신호)
[ESP32 (WiFi 내장 마이크로컨트롤러)]
        ↓ HTTP POST + 비밀 토큰 (/api/update-status: 상태 변경 시 / /api/heartbeat: 5분마다)
[Next.js API 라우트 (서버)]
        ↓ Secret key (구 service role key)
[Supabase (DB + Realtime, RLS로 프론트는 읽기 전용)]
        ↓ 실시간 push
[Next.js PWA (4/5/6/7층 사용자 앱)]
```

- ESP32는 DB에 직접 쓰지 않고 **API 라우트를 경유** → 보안 강화 (인증키가 디바이스에 노출되지 않음)
- 상태 변경은 **폴링이 아닌 Supabase Realtime**으로 push → 배터리/서버 부담 감소
- ESP32는 상태 변경 신호와 별개로 **5분마다 하트비트**를 보내 `last_ping_at`을 갱신 → 센서 생존 여부 확인용

---

## 3. 최종 구매 목록 (하드웨어) — 실제 결제 완료

| 부품 | 제품명 | 개수 | 실 구매가 |
|---|---|---|---|
| 메인보드 | ESP32 DevKitC WROOM-32D V4 CP2102 [CMODULE-40] | 1 | 9,900원 |
| 브레드보드 | Voltly 830핀 흰색 [VLT-BB016] | 1 | 2,200원 |
| 점퍼케이블 M/M | CH254 소켓 점퍼 케이블 40P (칼라) 20cm | 1 | 935원 |
| 점퍼케이블 F/F | CH254 소켓 점퍼 케이블 40P (칼라) 20cm | 1 | 935원 |
| USB 케이블 | CableMate USB-A to Micro 5핀 충전케이블 [CM1743] | 1 | 1,100원 |
| 센서 | BL0303 / NO (DC) 자석스위치 / CAP | 1 | 2,860원 |
| **상품 합계** | | | **17,930원** |
| 배송비 | | | 5,700원 |
| **총 결제 금액** | | | **23,630원** |

### 설치 단계 추가 구매 (선택, 아직 미구매)

- 미니 십자드라이버 (BL0303 나사 단자용, 보유 시 불필요)
- 테프론선(단선) — 최종 설치 거리가 점퍼선보다 길 경우
- 강력 양면테이프 또는 나사 — 문/문틀 부착용
- 글루건 또는 케이블타이 — 배선 고정용
- ESP32 소형 케이스 — 먼지/충격 보호 (선택)

---

## 4. 소프트웨어 스택

| 영역 | 선택 |
|---|---|
| 펌웨어 | Arduino IDE (C/C++) |
| 프론트엔드 | Next.js (React) |
| 백엔드 | Next.js API Routes |
| 데이터베이스 | Supabase (PostgreSQL) |
| 실시간 통신 | Supabase Realtime |
| 배포 | Vercel (Next.js) |
| 앱 형태 | PWA (next-pwa) |

---

## 5. 데이터베이스 스키마 (최종 확정, 구현 완료)

room_name은 휴게실이 1개뿐이라 불필요하여 제외. 시간 컬럼은 모두 **`timestamp`(타임존 없는 타입)**로 통일하고, 서버 코드에서 한국시간(KST, UTC+9)을 직접 계산해 저장 — Supabase의 `timestamptz`는 UTC로 저장/표시되어 Table Editor에서 볼 때 9시간 차이가 나는 문제가 있었기 때문.

**RLS(Row Level Security)**: 두 테이블 모두 RLS 활성화 후 `SELECT`만 `public` 역할에 허용하는 정책을 생성함. INSERT/UPDATE/DELETE 정책은 만들지 않아 기본적으로 차단됨 — 프론트엔드(Publishable/anon key)는 읽기만 가능하고, 실제 데이터 변경은 백엔드(Secret key, RLS 영향 받지 않음)를 통해서만 가능한 구조.

### `room_status` 테이블 — 단일 행으로 현재 상태만 관리

컬럼 순서: `id, is_occupied, previous_changed_at, changed_at, last_ping_at`

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | 고유 ID |
| is_occupied | boolean | true = 사용 중(닫힘), false = 비어있음(열림) |
| previous_changed_at | timestamp | **바로 이전** 상태로 바뀌었던 시각 — `changed_at - previous_changed_at`으로 "직전 상태가 얼마나 유지됐는지" 계산 가능 |
| changed_at | timestamp | **현재** 상태로 바뀐 시각(한국시간) — 하트비트로는 안 바뀜, "현재 상태 몇 분째 유지" 계산용 |
| last_ping_at | timestamp | ESP32가 5분마다 하트비트를 보낼 때마다 갱신 — 화면에서 이 값을 기준으로 "실시간 연결됨"/"실시간 연결 안됨" 표시 (구현 완료) |

```sql
create table room_status (
  id uuid primary key default gen_random_uuid(),
  is_occupied boolean not null default false,
  previous_changed_at timestamp,
  changed_at timestamp not null default now(),
  last_ping_at timestamp
);

insert into room_status (is_occupied) values (false);
```

### `room_status_log` 테이블 — 모든 상태 변경 이력 누적 (통계용, 구현 완료)

상태가 바뀔 때마다 새 행이 계속 쌓임 (지우지 않음). 나중에 "시간대별 혼잡도", "하루 평균 사용 시간" 등 통계 산출에 사용.

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | 고유 ID |
| is_occupied | boolean | 그 시점의 상태 |
| changed_at | timestamp | 변경된 시각(한국시간) |

```sql
create table room_status_log (
  id uuid primary key default gen_random_uuid(),
  is_occupied boolean not null,
  changed_at timestamp not null
);
```

> API 구현: `/api/update-status`에서 상태 변경 요청이 오면 (1) `room_status`를 갱신하면서 기존 `changed_at`을 `previous_changed_at`으로 옮기고, (2) 동시에 `room_status_log`에 새 행을 insert하여 이력을 누적함. `/api/heartbeat`는 `last_ping_at`만 갱신 (구현 완료).

---

## 6. 개발 로드맵 (Phase별 진행)

### Phase 1. 하드웨어 준비 및 단자 테스트 (1~2일) ✅ 완료
- [x] 부품 구매 및 수령
- [x] Arduino IDE 설치, ESP32 보드 매니저 등록
- [x] 브레드보드에 ESP32 + BL0303 연결
- [x] `INPUT_PULLUP` 방식으로 문 개폐 시 GPIO 값(HIGH/LOW) 확인
- [x] 시리얼 모니터로 값 변화 확인 (디버깅) — 배선 접촉 불량 이슈 해결 완료

### Phase 2. WiFi 연결 및 기본 통신 (1일) ✅ 완료
- [x] ESP32에 회사 WiFi 연결 코드 작성
- [x] 임시 서버(webhook.site)로 HTTP POST 테스트 — 응답 코드 200 확인
- [x] 상태 변경 시에만 전송하도록 디바운싱 로직 추가 (10초 확정 방식으로 구현)
- [x] 주기적 하트비트(heartbeat) 전송 로직 추가 (5분마다 `/api/heartbeat` 호출, `last_ping_at` 갱신 확인 완료)

### Phase 3. Supabase 설정 (0.5일) ✅ 완료
- [x] Supabase 프로젝트 생성 (프로젝트명: IsitEmpty, Seoul 리전)
- [x] `room_status` 테이블 생성 (최종 스키마: id, is_occupied, previous_changed_at, changed_at, last_ping_at) + `room_status_log` 이력 테이블 생성
- [x] Realtime 기능 활성화 (Database → Publications)
- [x] Publishable key / Secret key(구 anon key/service_role key) 확보 및 보관
- [x] RLS 정책 설정 (room_status, room_status_log 모두 SELECT만 public 허용)

### Phase 4. Next.js 백엔드 (API 라우트) 개발 (1~2일) ✅ 대부분 완료
- [x] Next.js 프로젝트 생성 (WSL 환경, TypeScript 미사용, Tailwind/App Router 사용)
- [x] `/api/update-status` 라우트 작성 — 비밀 토큰 검증 후 Supabase 업데이트 + 이력 기록
- [x] `/api/heartbeat` 라우트 작성 — `last_ping_at`만 갱신
- [x] 로컬 환경에서 Postman + 실제 ESP32(WSL 포트포워딩 경유)로 테스트 성공
- [x] 잘못된 토큰 요청 차단 확인 (보안 테스트) — 401 정상 응답 확인 완료
- [x] ESP32의 `SERVER_URL`/`HEARTBEAT_URL`을 로컬 IP → Vercel 배포 주소로 교체 후 전송 테스트 (Vercel 배포 후 진행 예정)

### Phase 5. 프론트엔드 개발 (2~3일) ✅ 완료
- [x] 메인 화면: 휴게실 상태(비어있음/사용중) 큰 아이콘/색상으로 표시 (Claude Code로 구현)
- [x] Supabase Realtime 구독 연결 → 상태 변경 시 새로고침 없이 즉시 갱신 확인 완료
- [x] "N분째" 경과 시간 표시, "마지막 변경" 시각 표시
- [x] 센서 연결 상태 표시 — "실시간 연결됨"/"실시간 연결 안됨" 배지로 구현 (당초 계획한 "센서 응답 없음" 문구에서 변경)
- [x] 반응형 디자인 최종 점검 

### Phase 6. PWA 전환 및 배포 (1일)
- [x] `next-pwa` 적용, manifest.json / 아이콘 설정
- [x] Vercel에 배포

### Phase 7. 실제 설치 및 최종 테스트 (0.5~1일)
- [ ] ESP32-BL0303 간 실제 배선 거리 측정 후 전선 정리
- [ ] 문틀/문짝에 BL0303 부착 (자석-스위치 정렬 확인)
- [ ] ESP32 벽 부착 및 상시전원 연결
- [ ] 4/5/6/7층에서 실제 접속 테스트
- [ ] 문을 여러 번 여닫으며 오작동 여부 확인 (최소 하루 이상 모니터링)

---

## 7. 예상 전체 일정

| 단계 | 소요 기간 |
|---|---|
| Phase 1~2 (하드웨어+통신) | 2~3일 |
| Phase 3~4 (DB+백엔드) | 1.5~2.5일 |
| Phase 5~6 (프론트+배포) | 3~4일 |
| Phase 7 (설치+테스트) | 1일 |
| **총 예상 기간** | **약 1.5~2주** (하루 1~2시간 작업 기준) |

---

## 8. 예산 요약

| 항목 | 금액 |
|---|---|
| 하드웨어 부품 (실 구매 완료) | 17,930원 |
| 배송비 | 5,700원 |
| **하드웨어 실 결제 총액** | **23,630원** |
| Supabase | 무료 티어로 충분 (소규모 프로젝트) |
| Vercel | 무료 티어로 충분 |
| 설치 단계 추가 구매 (드라이버, 양면테이프, 콘센트 관련 등) | 별도, 미확정 |

---

## 9. 리스크 및 주의사항

- **⚠️ [신규/미해결] 설치 위치에 콘센트 없음**: 6층 휴게실 문 근처에 상시전원용 콘센트가 없는 것으로 확인됨. 검토 중인 대안:
  1. 가까운 콘센트에서 멀티탭/연장선으로 끌어오기 (가장 간단, 케이블 정리 필요)
  2. 보조배터리(파워뱅크)로 임시 운영 (관리 부담 있음, 저전력 자동꺼짐 기능 여부 확인 필요)
  3. 시설관리팀에 콘센트 증설 요청 (근본적 해결책, 시간 소요 가능)
  - 최종 설치 전까지 결정 필요, 그 전까지는 책상 위 프로토타입 개발은 계속 진행 가능
- **회사 WiFi 정책**: IoT 기기 등록이 필요할 수 있음 → 사내 IT팀 사전 협의 필요
- **문 재질**: 금속문일 경우 자석 부착 방식 재검토 필요 (양면테이프 등으로 대체)
- **오탐지**: 문이 완전히 닫히지 않고 살짝 걸쳐진 경우 → 디바운싱 및 자석 간격 조정으로 보완
- **보안**: ESP32 → API 라우트 통신 시 반드시 비밀 토큰 검증, DB 인증키는 서버에만 보관
- **배선 접촉 불량**: 브레드보드/나사단자 연결이 헐거우면 센서 값이 고정되는 오작동 발생 가능 → 최종 설치 시 납땜 또는 글루건으로 확실히 고정 권장

---

## 10. 향후 확장 아이디어

- **이력 데이터 적재(`room_status_log`)는 구현 완료**, 통계를 보여주는 화면(대시보드)은 아직 미구현
- 다른 층/다른 회의실로 확장 적용
- [ ] 웹 푸시 알림 기능 추가 (선택 — "휴게실이 비었습니다" 알림)
