# Vincenink — Bảng dạy học

Bảng trắng (tông be dịu mắt) để dạy học: viết vẽ, chèn tài liệu, quản lý bảng theo ngày và theo từng học sinh.

## Mở trang

- **Cách khuyên dùng (Mac):** nhấp đúp tệp `Mo-Vincenink.command`. Trang sẽ mở ở `http://localhost:8080`.
  Lần đầu macOS có thể chặn tệp này. Khi đó bấm chuột phải vào tệp → **Open** → **Open**.
  Cần mở bằng cách này thì mới dùng được Google Drive.
- **Cách nhanh:** nhấp đúp `index.html`. Mọi thứ đều chạy, trừ Google Drive.

> Dữ liệu (bảng, học sinh, tài liệu) được lưu **trong trình duyệt** trên máy này.
> Mở bằng `localhost:8080` và mở bằng tệp `index.html` là **hai kho dữ liệu riêng**, nên hãy luôn dùng một cách.
> Thỉnh thoảng vào **Cài đặt & sao lưu → Tải bản sao lưu** (hoặc Sao lưu lên Drive) để giữ an toàn.

## Tính năng

| Mục | Cách dùng |
|---|---|
| **Bút thanh đậm** | Bút (P). Chế độ *Thanh đậm*: viết chậm thì nét đậm, viết nhanh thì nét thanh; với Apple Pencil/bút cảm ứng thì theo lực nhấn. Muốn nét đều nhau thì chọn *Nét đều*. |
| **Nhiều màu** | 8 màu có sẵn, cộng ô cầu vồng để chọn màu bất kỳ. Phím 1–8 để chọn nhanh. |
| **Bút dạ quang** | (M) Tô nổi bật, trong suốt, không che chữ bên dưới. |
| **Tẩy** | (E) *Tẩy từng phần* xoá đúng chỗ đi qua. *Tẩy cả nét* xoá cả nét chạm vào. Tẩy không xoá ảnh/PDF, nên không sợ lỡ tay. |
| **Khoanh vùng** | (L) *Khoanh để chọn*: khoanh rồi kéo để di chuyển, kéo ô vuông ở góc để phóng to/thu nhỏ, hoặc xoá/nhân bản/đổi màu. *Khoanh để xoá*: phần nào trong vòng khoanh sẽ bị xoá (cả ảnh, PDF). |
| **Hình, chữ, laser** | Đường thẳng, mũi tên, chữ nhật, tròn, tam giác (giữ Shift để vẽ thẳng/vuông). Chữ (T). Bút laser (K) để chỉ, tự mờ sau 1 giây. |
| **Chèn ảnh/PDF** | Nút ảnh trên thanh công cụ, kéo thả vào bảng, hoặc dán bằng Ctrl+V. PDF được tách thành từng trang để viết đè lên. |
| **Nền bảng** | Trơn, Ô vuông, **Ô li** (như vở học sinh), Dòng kẻ, Chấm. |
| **Nhiều bảng theo ngày** | Mỗi học sinh hoặc *Lớp chung* có danh sách bảng, nhóm theo ngày. Có *Bảng mới hôm nay*, nhân bản bảng để làm mẫu, đổi ngày, chuyển bảng sang học sinh khác. |
| **Mục riêng từng học sinh** | Mỗi em có 3 thẻ: **Bảng**, **Tài liệu** (tải tệp lên, đưa thẳng lên bảng, lưu lên Drive) và **Ghi chú** (tiến độ, bài về nhà). |
| **Google Drive** | Lưu tài liệu lên Drive, lấy tệp từ Drive (Google Docs/Slides tự đổi sang PDF), lưu ảnh bảng và sao lưu toàn bộ lên Drive. Tệp được xếp vào `Vincenink / <tên học sinh> / Tài liệu` và `/ Bảng`. |
| **Khác** | Hoàn tác/làm lại, thu phóng, kéo bảng vô hạn, toàn màn hình, ẩn thanh bên (F), xuất PNG. Bảng tự lưu. |

## Kết nối Google Drive (làm một lần)

1. Vào https://console.cloud.google.com/ và tạo một dự án mới.
2. **APIs & Services → Library**: bật **Google Drive API** và **Google Picker API**.
3. **OAuth consent screen**: chọn *External*, điền tên ứng dụng, thêm email của bạn vào *Test users*.
4. **Credentials → Create credentials → OAuth client ID** → loại *Web application*.
   Ở *Authorized JavaScript origins* thêm: `http://localhost:8080`
5. **Credentials → Create credentials → API key**.
6. Mở Vincenink → **Cài đặt & sao lưu**, dán *Client ID* và *API key*, rồi bấm **Lưu & thử kết nối**.

Ứng dụng chỉ xin quyền `drive.file`. Nghĩa là nó chỉ thấy tệp do chính nó tạo ra, hoặc tệp bạn tự chọn qua trình chọn của Drive. Nó không đọc được phần còn lại trong Drive của bạn.

## Gợi ý khi dạy trên iPad

Bật **Cài đặt → Chỉ viết bằng bút cảm ứng**. Khi đó Apple Pencil để viết, còn ngón tay chỉ để kéo và chụm phóng to, nên đặt lòng bàn tay lên màn hình cũng không bị vẽ bậy.
Để dùng trên iPad, bạn cần đưa thư mục này lên một trang web tĩnh (ví dụ GitHub Pages hoặc Netlify), rồi thêm địa chỉ đó vào *Authorized JavaScript origins* nếu muốn dùng Drive.

## Cấu trúc thư mục

```
index.html        giao diện
styles.css        màu sắc, bố cục (tông be)
app.js            toàn bộ chức năng
vendor/           bộ đọc PDF (pdf.js), chạy không cần mạng
Mo-Vincenink.command   mở nhanh trên Mac
```
