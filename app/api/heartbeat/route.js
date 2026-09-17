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

  const { data: rows } = await supabase
    .from('room_status')
    .select('id')
    .limit(1);

  if (!rows || rows.length === 0) {
    return Response.json({ error: '데이터 없음' }, { status: 404 });
  }

  const { error } = await supabase
    .from('room_status')
    .update({ last_ping_at: getKoreaTimeString() })
    .eq('id', rows[0].id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}