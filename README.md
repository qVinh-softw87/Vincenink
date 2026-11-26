# Vincenink — Bảng dạy học

Bảng trắng trực tuyến tông màu be dịu mắt dành cho giáo viên. Có bút thanh đậm, nhiều màu, tẩy, khoanh vùng để xoá, chèn ảnh/PDF, lưu tài liệu lên Google Drive, nhiều bảng theo ngày và mục riêng cho từng học sinh.

Chạy hoàn toàn trên trình duyệt: không cần cài đặt, không cần máy chủ, không cần build.

## Tính năng

- **Bút thanh đậm**: viết chậm thì nét đậm, viết nhanh thì nét thanh; với Apple Pencil/bút cảm ứng thì theo lực nhấn. Có thể chuyển sang chế độ nét đều.
- **Nhiều màu**: 8 màu có sẵn và bảng chọn màu tuỳ ý. Có thêm bút dạ quang trong suốt.
- **Tẩy**: tẩy từng phần (cắt đúng chỗ đi qua) hoặc tẩy cả nét. Tẩy không xoá ảnh/PDF.
- **Khoanh vùng**:
  - *Khoanh để chọn*: di chuyển, phóng to/thu nhỏ, nhân bản, đổi màu, đổi thứ tự lớp.
  - *Khoanh để xoá*: xoá mọi thứ nằm trong vòng khoanh.
- **Hình, chữ, bút laser**: đường thẳng, mũi tên, chữ nhật, elip, tam giác; gõ chữ; laser để chỉ, tự mờ sau 1 giây.
- **Chèn tài liệu**: ảnh và PDF (mỗi trang thành một ảnh để viết đè lên). Chèn bằng nút, kéo thả hoặc dán Ctrl+V.
- **Nền bảng**: Trơn, Ô vuông, Ô li (như vở học sinh), Dòng kẻ, Chấm.
- **Bảng theo ngày**: mỗi học sinh hoặc *Lớp chung* có danh sách bảng nhóm theo ngày, có tìm kiếm, nhân bản bảng để làm mẫu, đổi ngày, chuyển bảng sang học sinh khác.
- **Mục riêng từng học sinh**: 3 thẻ **Bảng**, **Tài liệu** và **Ghi chú**.
- **Google Drive** (tuỳ chọn): lưu tài liệu, lấy tệp từ Drive (Google Docs/Slides tự đổi sang PDF), lưu ảnh bảng, sao lưu toàn bộ dữ liệu.
- **Khác**: tự động lưu, hoàn tác/làm lại, thu phóng và kéo bảng vô hạn, chụm 2 ngón trên màn cảm ứng, chế độ *chỉ viết bằng bút* cho iPad, xuất PNG, sao lưu/khôi phục bằng tệp JSON.

## Chạy trên máy

```bash
git clone https://github.com/qVinh-softw87/Vincenink.git
cd Vincenink
python3 -m http.server 8080
# mở http://localhost:8080
```

Trên macOS có thể nhấp đúp `Mo-Vincenink.command` để làm hai bước trên.
Mở trực tiếp `index.html` cũng được, nhưng khi đó Google Drive không hoạt động.

> Dữ liệu được lưu trong **IndexedDB** của trình duyệt, gắn với từng địa chỉ (origin).
> Hãy dùng cố định một địa chỉ và sao lưu định kỳ trong **Cài đặt & sao lưu**.

## Kết nối Google Drive

1. Tạo dự án trên [Google Cloud Console](https://console.cloud.google.com/).
2. Bật **Google Drive API** và **Google Picker API**.
3. Cấu hình **OAuth consent screen** (External) và thêm email của bạn vào *Test users*.
4. Tạo **OAuth client ID** loại *Web application*. Thêm địa chỉ trang (ví dụ `http://localhost:8080` hoặc địa chỉ GitHub Pages) vào *Authorized JavaScript origins*.
5. Tạo một **API key**.
6. Mở trang, vào **Cài đặt & sao lưu**, dán Client ID và API key, rồi bấm **Lưu & thử kết nối**.

Ứng dụng chỉ dùng quyền `drive.file`: chỉ truy cập tệp do chính nó tạo hoặc tệp bạn tự chọn qua trình chọn của Drive.
Tệp được xếp vào `Vincenink / <tên học sinh> / Tài liệu`, `… / Bảng` và `Vincenink / Sao lưu`.

## Đưa lên mạng (để dạy trên iPad)

Vì là trang tĩnh, bạn có thể bật **GitHub Pages**: *Settings → Pages → Deploy from a branch → `main` / root*.
Sau đó thêm địa chỉ `https://qvinh-softw87.github.io` vào *Authorized JavaScript origins* nếu dùng Drive.

## Phím tắt

| Phím | Chức năng |
|---|---|
| `P` `M` `E` | Bút · Dạ quang · Tẩy |
| `L` `S` `T` `K` `H` | Khoanh vùng · Hình · Chữ · Laser · Kéo bảng |
| `Space` + kéo | Di chuyển bảng |
| `Ctrl` + cuộn | Phóng to / thu nhỏ |
| `[` `]` | Giảm / tăng độ dày |
| `1` … `8` | Chọn nhanh màu |
| `Ctrl Z` / `Ctrl Shift Z` | Hoàn tác / Làm lại |
| `Delete` · `Ctrl D` | Xoá / nhân bản vùng chọn |
| `I` | Chèn ảnh / PDF |
| `F` | Ẩn / hiện thanh bên |

## Cấu trúc

```
index.html              giao diện
styles.css              màu sắc và bố cục
app.js                  toàn bộ chức năng (canvas, IndexedDB, Google Drive)
vendor/                 pdf.js 3.11.174 (Apache-2.0) để đọc PDF không cần mạng
Mo-Vincenink.command    mở nhanh trên macOS
HUONG-DAN.md            hướng dẫn sử dụng chi tiết
```

## Công nghệ

HTML, CSS và JavaScript thuần, không dùng framework. Vẽ bằng Canvas 2D, lưu bằng IndexedDB, đọc PDF bằng [pdf.js](https://github.com/mozilla/pdf.js), kết nối Drive qua Google Identity Services, Drive API v3 và Google Picker.
