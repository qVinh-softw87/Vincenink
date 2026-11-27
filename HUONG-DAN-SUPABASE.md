# Bật tài khoản, đồng bộ và thông báo nhắc lịch (Supabase – miễn phí)

Làm một lần, khoảng 10–15 phút. Xong bước này, người dùng Vincenink có thể:

- **Đăng nhập / đăng ký** bằng email hoặc Google (không bắt buộc — không đăng nhập vẫn dùng như cũ).
- **Đồng bộ** lịch học, hồ sơ, tên các lớp và giờ nhắc giữa các máy.
- **Nhận thông báo nhắc lịch** kể cả khi đã đóng trang — chỉ cần bấm “Cho phép” một lần, không cần cài tiện ích.

> Học phí, bảng vẽ và tài liệu **không** được gửi lên máy chủ — vẫn chỉ nằm trên máy mỗi người.

---

## 1. Tạo dự án Supabase

1. Vào <https://supabase.com> → **Start your project** → đăng nhập (GitHub hoặc email).
2. **New project**: đặt tên `vincenink`, đặt mật khẩu cơ sở dữ liệu (lưu lại), chọn vùng **Southeast Asia (Singapore)** → **Create**.
3. Đợi khoảng 1–2 phút cho dự án khởi tạo xong.

## 2. Tạo bảng và hẹn giờ gửi thông báo

1. Trong dự án: **SQL Editor** → **New query**.
2. Mở tệp [`supabase/setup.sql`](supabase/setup.sql), copy toàn bộ và dán vào.
3. Sửa **2 chỗ** ở cuối tệp:
   - `https://vincenink.vercel.app/api/push-cron` → địa chỉ web của bạn (nếu khác).
   - `DOI-THANH-CRON-SECRET-CUA-BAN` → một chuỗi bí mật bất kỳ, ví dụ `vin-8f3k2p9x-2026`. **Ghi lại** — bước 4 sẽ dùng.
4. Bấm **Run**. Thấy “Success” là xong.

## 3. Cấu hình đăng nhập

**Authentication → URL Configuration**

- **Site URL**: `https://vincenink.vercel.app`
- **Redirect URLs** → Add: `https://vincenink.vercel.app/**`

**Đăng nhập bằng email** đã bật sẵn. Mặc định người dùng phải bấm link xác nhận trong email sau khi đăng ký (có thể tắt ở *Authentication → Sign In / Providers → Email → Confirm email*).

**Đăng nhập bằng Google** (tuỳ chọn):

1. Vào <https://console.cloud.google.com> → tạo dự án → **APIs & Services → OAuth consent screen**: chọn *External*, điền tên app “Vincenink”, email hỗ trợ → lưu.
2. **Credentials → Create credentials → OAuth client ID** → loại *Web application*.
   - **Authorized JavaScript origins**: `https://vincenink.vercel.app`
   - **Authorized redirect URIs**: `https://<MÃ-DỰ-ÁN>.supabase.co/auth/v1/callback` (copy đúng địa chỉ này ở Supabase → *Authentication → Sign In / Providers → Google*).
3. Copy **Client ID** và **Client secret** → dán vào Supabase → *Authentication → Sign In / Providers → Google* → bật **Enable** → **Save**.

## 4. Tạo khoá thông báo (VAPID) và điền vào Vercel

1. Trên máy (cần Node.js), mở Terminal và chạy:

   ```bash
   npx web-push generate-vapid-keys
   ```

   Sẽ in ra **Public Key** và **Private Key**.
2. Lấy khoá Supabase: *Project Settings → API* (hoặc *API Keys*):
   - **Project URL** (dạng `https://xxxx.supabase.co`)
   - **anon / publishable** key (công khai, dùng ở trình duyệt)
   - **service_role / secret** key (**bí mật** — chỉ đặt trên Vercel, không dán vào đâu khác)
3. Vào **Vercel → dự án Vincenink → Settings → Environment Variables**, thêm:

   | Tên | Giá trị |
   |---|---|
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |
   | `VAPID_PUBLIC_KEY` | Public Key ở bước 4.1 |
   | `VAPID_PRIVATE_KEY` | Private Key ở bước 4.1 |
   | `VAPID_SUBJECT` | `mailto:email-cua-ban@gmail.com` |
   | `CRON_SECRET` | chuỗi bí mật bạn đặt ở bước 2 |

4. **Deployments → Redeploy** (hoặc push code mới) để Vercel nhận biến.

## 5. Kiểm tra

1. Mở `https://vincenink.vercel.app` → **Hồ sơ → Đăng nhập / Đăng ký** → tạo tài khoản.
2. Trong cửa sổ tài khoản bấm **Bật thông báo** → chọn **Cho phép**.
3. Ghi một buổi học sau khoảng 20 phút → 15 phút trước giờ học sẽ có thông báo (kể cả khi đã đóng tab, miễn là Chrome/Safari/Edge vẫn đang chạy).
4. Xem máy chủ có chạy không: Supabase → SQL Editor:

   ```sql
   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
   ```

## Lưu ý về gói miễn phí

- Supabase miễn phí: 500 MB cơ sở dữ liệu, 50.000 người dùng hoạt động/tháng — dư sức cho Vincenink.
- Dự án miễn phí **tự tạm dừng nếu một tuần không có hoạt động**. Nếu bị dừng: vào Supabase bấm **Restore/Resume project**. Dùng web hằng tuần thì hầu như không gặp.
- Tiện ích Chrome cũ vẫn dùng được; khi đã bật thông báo qua tài khoản, tiện ích tự im lặng để không báo trùng.

---

## 6. Bản vá & kiểm tra sau khi cài (bắt buộc nếu dự án tạo từ 30/05/2026)

Supabase không còn tự mở bảng mới cho trình duyệt/máy chủ. Nếu bạn đã chạy `setup.sql` **bản cũ** (trước khi có lệnh GRANT):

1. **SQL Editor → New query** → dán toàn bộ [`supabase/fix-01-grants.sql`](supabase/fix-01-grants.sql) → **Run**. An toàn khi chạy lại nhiều lần, không đụng tới dữ liệu.
2. Dán [`supabase/verify.sql`](supabase/verify.sql) → **Run** từng khối, đối chiếu “mong đợi” ghi trong tệp:
   - khối 1: `authenticated_*` = true ở `user_state`, `push_subscriptions`; `anon_select` = false hết.
   - khối 5: `status_code = 200` và nội dung có `"ok":true`. Nếu **401** → chuỗi trong cron khác biến `CRON_SECRET` trên Vercel.
3. Mở `https://vincenink.vercel.app/api/diag?key=<CRON_SECRET>` → mong đợi `"ok": true`, `vapid: "ok"`, 3 bảng đều `ok`.
   (Trang này chỉ báo trạng thái, không in khoá. Đừng chia sẻ đường link có `key=`.)
4. Trên web: **Hồ sơ → Tài khoản → Gửi thử từ máy chủ** → phải hiện thông báo “Vincenink: thông báo thử”.

### Đổi lịch hẹn cron nếu đã đặt sai bí mật

```sql
select cron.unschedule('vincenink-push');
-- rồi chạy lại khối "5) Hẹn giờ" trong setup.sql với đúng CRON_SECRET
```

### Biến môi trường bị dính dấu xuống dòng

Máy chủ đã tự bỏ khoảng trắng / xuống dòng thừa, nhưng nên sửa lại cho gọn: Vercel → Settings → Environment Variables → sửa `VAPID_PUBLIC_KEY` (và các biến khác nếu có) → xoá dòng trống cuối → **Save** → **Redeploy**.
