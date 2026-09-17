import { createClient } from "@supabase/supabase-js";

// 브라우저에서 쓰는 읽기 전용 클라이언트. Publishable key + RLS로 쓰기 차단됨.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
