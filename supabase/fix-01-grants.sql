-- =====================================================================
-- Vincenink · bản vá 01 (chạy 1 lần trong Supabase → SQL Editor)
-- Dự án Supabase tạo từ 30/05/2026 KHÔNG còn tự mở bảng trong `public` cho Data API.
-- Không có các lệnh GRANT này, trình duyệt sẽ gặp lỗi "permission denied" khi đồng bộ,
-- còn máy chủ (khoá bí mật) không đọc được bảng để gửi nhắc lịch.
-- An toàn khi chạy lại nhiều lần. Không xoá / thay đổi dữ liệu.
-- =====================================================================

-- Người đã đăng nhập: chỉ thao tác được dòng của chính mình (RLS đã bật ở setup.sql)
grant select, insert, update, delete on public.user_state         to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant usage, select on sequence public.push_subscriptions_id_seq  to authenticated;

-- Khách chưa đăng nhập (anon): không có quyền gì
revoke all on public.user_state, public.push_subscriptions, public.push_log from anon;
revoke all on public.push_log from authenticated;

-- Máy chủ (khoá bí mật / service_role): đọc lịch, gửi nhắc, ghi nhật ký chống trùng
grant select, insert, update, delete on public.user_state, public.push_subscriptions, public.push_log to service_role;
grant usage, select on sequence public.push_subscriptions_id_seq to service_role;

-- Đảm bảo RLS đang bật (nếu lỡ tắt)
alter table public.user_state         enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_log           enable row level security;

-- Báo PostgREST nạp lại quyền ngay
notify pgrst, 'reload schema';
