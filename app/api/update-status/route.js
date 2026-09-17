import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

function getKoreaTimeString() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = new Date(now.getTime() + kstOffset);
  return kstTime.toISOString().replace('Z', '');
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  const expected = `Bearer ${process.env.DOOR_SENSOR_SECRET}`;

  if (authHeader !== expected) {
    return Response.json({ error: '인증 실패' }, { status: 401 });
  }

  const { is_occupied } = await request.json();

  const { data: rows } = await supabase
    .from('room_status')
    .select('id, changed_at')
    .limit(1);

  if (!rows || rows.length === 0) {
    return Response.json({ error: '데이터 없음' }, { status: 404 });
  }

  const existingRow = rows[0];
  const kstNow = getKoreaTimeString();

  // 1) 현재 상태 갱신 (room_status)
  const { error: updateError } = await supabase
    .from('room_status')
    .update({
      is_occupied,
      previous_changed_at: existingRow.changed_at,
      changed_at: kstNow,
    })
    .eq('id', existingRow.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  // 2) 이력 테이블에 기록 추가 (room_status_log) — 누적됨
  const { error: logError } = await supabase
    .from('room_status_log')
    .insert({ is_occupied, changed_at: kstNow });

  if (logError) {
    return Response.json({ error: logError.message }, { status: 500 });
  }

  return Response.json({ success: true });
}