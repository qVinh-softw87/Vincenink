/* =====================================================================
   Vincenink — Bảng dạy học
   Toàn bộ dữ liệu lưu trong trình duyệt (IndexedDB). Không cần máy chủ.
   ===================================================================== */
'use strict';

/* ---------------- Tiện ích ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => dstr(new Date());
const parseD = ds => { const [y, m, d] = ds.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const weekStart = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() + 6) % 7)); };
const dow = d => (d.getDay() + 6) % 7; // 0 = Thứ 2
const shortDate = ds => { const [, m, d] = ds.split('-'); return `${d}/${m}`; };
const fmtTime = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtDT = ts => { const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
function fmtSize(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(0) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
const dataURLToBlob = async u => (await fetch(u)).blob();
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const scriptCache = {};
function loadScript(src) {
  if (!scriptCache[src]) scriptCache[src] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res;
    s.onerror = () => { delete scriptCache[src]; s.remove(); rej(new Error('load ' + src)); };
    document.head.append(s);
  });
  return scriptCache[src];
}
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const safeName = s => (s || 'bang').replace(/[\\/:*?"<>|]+/g, '-').trim();
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* */ } } };

/* =====================================================================
   Ngôn ngữ (Tiếng Việt / English)
   ===================================================================== */
let LANG = (() => {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'vi') return q;
  return ls.get('vincenink.lang', 'vi');
})();
const EN = {
  'Bảng dạy học': 'Teaching board',
  'Cài đặt & sao lưu': 'Settings & backup', 'Cài đặt &amp; sao lưu': 'Settings & backup',
  'Chế độ sáng / tối': 'Light / dark mode', 'Giới thiệu Vincenink': 'About Vincenink',
  'Ẩn/hiện thanh bên (F)': 'Show/hide sidebar (F)', 'Tên bảng': 'Board name', 'Ngày của bảng': 'Board date',
  'Nền bảng': 'Background', 'Tải bảng thành ảnh PNG': 'Download board as PNG', 'Tải bảng thành PDF (màu hoặc bản quét)': 'Download board as PDF (colour or scan)',
  'Toàn màn hình': 'Full screen', 'Thả ảnh hoặc PDF vào đây để đưa lên bảng': 'Drop an image or PDF here to put it on the board',
  'Trơn': 'Plain', 'Ô vuông': 'Grid', 'Ô li': 'Ô li (handwriting)', 'Dòng kẻ': 'Ruled', 'Chấm': 'Dots',
  'Kéo bảng (H) — hoặc giữ phím Space': 'Pan (H) — or hold Space', 'Bút viết (P)': 'Pen (P)', 'Bút dạ quang (M)': 'Highlighter (M)',
  'Tẩy (E)': 'Eraser (E)', 'Khoanh vùng (L) — chọn hoặc xoá': 'Lasso (L) — select or erase', 'Hình (S)': 'Shapes (S)', 'Chữ (T)': 'Text (T)',
  'Bút laser (K) — chỉ để trỏ, tự mờ': 'Laser pointer (K) — fades away',
  'Hoàn tác (Ctrl+Z)': 'Undo (Ctrl+Z)', 'Làm lại (Ctrl+Shift+Z)': 'Redo (Ctrl+Shift+Z)', 'Chèn ảnh / PDF / bản quét (I)': 'Insert image / PDF / scan (I)', 'Xoá sạch bảng': 'Clear board',
  'Thu nhỏ (−)': 'Zoom out (−)', 'Về 100% (0)': 'Reset to 100% (0)', 'Phóng to (+)': 'Zoom in (+)', 'Xem toàn bộ nội dung': 'Fit to content',
  'Thanh đậm': 'Calligraphic', 'Nét đều': 'Uniform', 'Tẩy từng phần': 'Erase part', 'Tẩy cả nét': 'Erase stroke',
  'Khoanh để chọn': 'Lasso select', 'Khoanh để xoá': 'Lasso erase', 'Vẽ vòng quanh phần muốn xoá': 'Draw around what you want to erase',
  'Khoanh rồi kéo để di chuyển · bấm vào ảnh để chọn': 'Lasso, then drag to move · click an image to select it',
  'Đường thẳng': 'Line', 'Mũi tên': 'Arrow', 'Hình chữ nhật': 'Rectangle', 'Hình tròn/elip': 'Circle/ellipse', 'Tam giác': 'Triangle',
  'Cỡ chữ': 'Font size', 'Bấm vào bảng để gõ · nhấp đúp chữ để sửa': 'Click the board to type · double-click text to edit',
  'Bút laser để chỉ cho học sinh — nét tự biến mất sau 1 giây': 'Point things out to students — the trail fades after 1 second',
  'Kéo để di chuyển bảng · Ctrl + cuộn (hoặc chụm 2 ngón) để phóng to': 'Drag to pan · Ctrl + scroll (or pinch) to zoom',
  'Độ dày ( [ và ] )': 'Thickness ( [ and ] )', 'Màu tuỳ chọn': 'Custom colour',
  'Xoá (Delete)': 'Delete (Del)', 'Nhân bản (Ctrl+D)': 'Duplicate (Ctrl+D)', 'Đổi sang màu đang chọn': 'Apply current colour', 'Đưa lên trên': 'Bring to front', 'Đưa xuống dưới': 'Send to back',
  'Không có nét nào trong vùng khoanh': 'Nothing inside the lasso',
  'Kéo để di chuyển · kéo ô vuông ở góc để phóng to/thu nhỏ': 'Drag to move · drag the corner square to resize',
  'Không đọc được ảnh này': 'Could not read this image', 'Đang mở PDF…': 'Opening PDF…', 'Chèn PDF lên bảng': 'Insert PDF',
  'Từ trang': 'From page', 'Đến trang (tổng {n} trang)': 'To page ({n} pages in total)', 'Chèn': 'Insert',
  'Mỗi trang sẽ thành một ảnh trên bảng, xếp từ trên xuống. Bạn có thể viết đè lên.': 'Each page becomes an image on the board, stacked top to bottom. You can write over them.',
  'Đang xử lý trang {i}/{n}…': 'Processing page {i}/{n}…', 'Không mở được tệp PDF này': 'Could not open this PDF',
  'Chỉ đưa được ảnh hoặc PDF lên bảng. Với Word/PowerPoint, hãy lưu sang PDF trước.': 'Only images and PDFs can go on the board. Save Word/PowerPoint files as PDF first.',
  'Bảng đang trống': 'The board is empty', 'Xoá sạch bảng?': 'Clear the board?',
  'Mọi nét vẽ, chữ và tài liệu trên bảng này sẽ bị xoá. Bạn vẫn có thể bấm Hoàn tác (Ctrl+Z) ngay sau đó.': 'All strokes, text and documents on this board will be removed. You can still press Undo (Ctrl+Z) right after.',
  'Xoá sạch': 'Clear', 'Đang lưu…': 'Saving…', 'Đã lưu': 'Saved', 'Không lưu được — bộ nhớ trình duyệt có thể đã đầy': 'Could not save — browser storage may be full',
  'Buổi học {d}': 'Lesson {d}', ' (bản sao)': ' (copy)', 'Đã nhân bản bảng': 'Board duplicated', 'Xoá bảng này?': 'Delete this board?',
  '“{t}” sẽ bị xoá vĩnh viễn và không thể khôi phục.': '“{t}” will be permanently deleted.', 'Xoá': 'Delete', 'Huỷ': 'Cancel', 'Lưu': 'Save',
  'Sửa thông tin bảng': 'Edit board', 'Ngày': 'Date', 'Thuộc về': 'Belongs to', 'Lớp chung': 'Whole class', 'Học sinh': 'Student',
  'Tên học sinh': 'Student name', 'VD: Nguyễn Minh An': 'e.g. Minh An Nguyen', 'Lớp / ghi chú ngắn (tuỳ chọn)': 'Class / short note (optional)',
  'VD: Lớp 5 · Toán, Tiếng Việt': 'e.g. Grade 5 · Maths, English', 'Màu nhận diện': 'Colour', 'Thêm học sinh': 'Add student', 'Sửa học sinh': 'Edit student',
  'Xoá học sinh': 'Delete student', 'Đã thêm {n} và tạo bảng đầu tiên': 'Added {n} and created their first board',
  'Xoá học sinh {n}?': 'Delete student {n}?', 'Sẽ xoá cả {b} bảng, {f} tài liệu và lịch học của học sinh này trên máy.': 'This also deletes their {b} boards, {f} files and schedule on this device.',
  'Học sinh · {n}': 'Students · {n}', 'Chưa có học sinh nào.': 'No students yet.',
  'Bấm + để thêm — mỗi em sẽ có bảng, tài liệu, lịch học và ghi chú riêng.': 'Click + to add one — each student gets their own boards, files, schedule and notes.',
  '{b} bảng · {f} tài liệu': '{b} boards · {f} files', 'Sửa thông tin học sinh': 'Edit student', 'Buổi tới: {x}': 'Next lesson: {x}',
  'Bảng': 'Boards', 'Tài liệu': 'Files', 'Lịch': 'Schedule', 'Ghi chú': 'Notes',
  'Bảng mới hôm nay': 'New board for today', 'Tìm bảng theo tên hoặc ngày…': 'Search boards by name or date…', 'Hôm nay · ': 'Today · ',
  'Sửa lúc {t}': 'Edited {t}', 'Tuỳ chọn': 'Options', 'Không tìm thấy bảng': 'No boards found', 'Chưa có bảng nào': 'No boards yet',
  'Thử từ khoá khác.': 'Try another keyword.', 'Bấm “Bảng mới hôm nay” để bắt đầu buổi học.': 'Click “New board for today” to start a lesson.',
  'Đổi tên, ngày, chủ sở hữu': 'Rename, change date or owner', 'Nhân bản (dùng làm mẫu)': 'Duplicate (use as template)', 'Xoá bảng': 'Delete board',
  'Tải tài liệu lên': 'Upload files', 'Kéo thả hoặc bấm để chọn tệp': 'Drag & drop or click to choose', 'Ảnh và PDF có thể đưa thẳng lên bảng': 'Images and PDFs can go straight onto the board',
  'Đưa lên bảng': 'Put on board', 'Đưa lên bảng (bản quét, làm rõ chữ)': 'Put on board as scan (sharpen text)', 'Mở xem': 'Open', 'Tải về máy': 'Download',
  'Đổi tên': 'Rename', 'Đổi tên tài liệu': 'Rename file', 'Tên': 'Name', 'Xoá khỏi máy': 'Delete from device', 'Xoá tài liệu?': 'Delete file?',
  '“{n}” sẽ bị xoá khỏi trình duyệt.': '“{n}” will be removed from this browser.', 'Chưa có tài liệu': 'No files yet',
  'Đề bài, phiếu bài tập, ảnh chụp vở… của {n} sẽ được lưu ở đây.': 'Worksheets, exercises and notebook photos for {n} will be kept here.',
  'Đã lưu {c} tài liệu cho {n}': 'Saved {c} file(s) for {n}', 'Không lưu được {n}': 'Could not save {n}',
  'Ghi chú về {n}: tiến độ, điểm cần lưu ý, bài tập về nhà…': 'Notes about {n}: progress, things to watch, homework…',
  'Ghi chú chung cho cả lớp: nội dung tuần này, nhắc nhở…': 'Notes for the whole class: this week’s content, reminders…', 'Ghi chú tự lưu khi bạn gõ.': 'Notes save automatically as you type.',
  'Tuần này': 'This week', 'Tuần trước': 'Previous week', 'Tuần sau': 'Next week', 'Trống': 'Free', 'Thêm buổi vào ngày này': 'Add a lesson on this day',
  'Ghi chú tuần này': 'Notes for this week', 'Nội dung dạy, bài về nhà, nhắc phụ huynh…': 'What to teach, homework, reminders for parents…',
  'Thêm buổi học': 'Add lesson', 'Lịch cố định hằng tuần': 'Weekly fixed schedule', 'Chưa có lịch cố định. Thêm một buổi “Cố định hằng tuần” để nó tự lặp lại mỗi tuần.': 'No fixed schedule yet. Add a “Every week” lesson and it repeats automatically.',
  'Cố định': 'Weekly', 'Một buổi': 'One-off', 'Đã nghỉ': 'Cancelled',
  'Sửa buổi học': 'Edit lesson', 'Loại lịch': 'Type', 'Cố định hằng tuần': 'Every week', 'Lặp lại vào cùng thứ, cùng giờ': 'Repeats on the same day and time',
  'Chỉ một buổi': 'One-off', 'Học bù, học thêm, đổi lịch…': 'Make-up, extra lesson, rescheduled…', 'Thứ': 'Day', 'Bắt đầu': 'Start', 'Kết thúc': 'End',
  'Môn / nội dung': 'Subject / topic', 'VD: Toán – phân số': 'e.g. Maths – fractions', 'Ghi chú (tuỳ chọn)': 'Note (optional)', 'Áp dụng cho': 'For',
  'Mở bảng cho buổi này': 'Open board for this lesson', 'Sửa': 'Edit', 'Nghỉ buổi này': 'Cancel this lesson', 'Học lại buổi này': 'Restore this lesson',
  'Xoá lịch cố định': 'Delete weekly lesson', 'Xoá buổi này': 'Delete lesson', 'Mở trang học sinh': 'Open student',
  'Xoá lịch cố định?': 'Delete weekly lesson?', 'Buổi “{s}” sẽ không còn lặp lại mỗi tuần.': '“{s}” will no longer repeat every week.',
  'Giờ kết thúc phải sau giờ bắt đầu': 'End time must be after start time', 'Buổi học': 'Lesson',
  'Hồ sơ của bạn': 'Your profile', 'Thêm thông tin cá nhân': 'Add your profile', 'Giáo viên': 'Teacher', 'Đổi ảnh': 'Change photo', 'Xoá ảnh': 'Remove photo', 'Chọn ảnh đại diện': 'Choose a photo',
  'Họ và tên': 'Full name', 'Vai trò': 'Role', 'VD: Giáo viên Toán, Gia sư Tiếng Anh': 'e.g. Maths teacher, English tutor', 'Trường / trung tâm': 'School / centre',
  'Email': 'Email', 'Số điện thoại': 'Phone', 'Giới thiệu ngắn': 'Short bio', 'Kinh nghiệm, phương pháp dạy, môn phụ trách…': 'Experience, teaching style, subjects…',
  'Thông tin chỉ lưu trên máy này và được dùng để ghi tên bạn lên tệp PDF xuất ra.': 'Stored only on this device and used to put your name on exported PDFs.', 'Đã lưu hồ sơ': 'Profile saved',
  'Giao diện': 'Appearance', 'Ngôn ngữ': 'Language', 'Chế độ màu': 'Colour mode', 'Sáng': 'Light', 'Tối': 'Dark', 'Theo máy': 'System',
  'Chỉ viết bằng bút cảm ứng': 'Stylus-only drawing',
  'Dành cho iPad/máy tính bảng: Apple Pencil để viết, ngón tay chỉ để kéo và phóng to — tránh lỡ tay chạm lòng bàn tay vào bảng.': 'For iPad/tablets: write with Apple Pencil, fingers only pan and zoom — no accidental palm marks.',
  'Sao lưu dữ liệu': 'Backup', 'Dữ liệu được lưu ngay trong trình duyệt trên máy này. Thỉnh thoảng hãy tải bản sao lưu để không mất bài giảng.': 'Your data lives in this browser on this device. Download a backup now and then so you never lose a lesson.',
  'Tải bản sao lưu': 'Download backup', 'Khôi phục từ tệp': 'Restore from file', 'Phím tắt': 'Keyboard shortcuts', 'Xong': 'Done', 'Mở trang giới thiệu': 'Open the welcome page',
  'Bút · Dạ quang · Tẩy': 'Pen · Highlighter · Eraser', 'Khoanh vùng · Hình · Chữ · Laser': 'Lasso · Shapes · Text · Laser', 'Di chuyển bảng': 'Pan the board',
  'Phóng to / thu nhỏ': 'Zoom in / out', 'Giảm / tăng độ dày': 'Thinner / thicker', 'Chọn nhanh màu': 'Quick colour', 'Hoàn tác / Làm lại': 'Undo / Redo',
  'Xoá / nhân bản vùng chọn': 'Delete / duplicate selection', 'Ẩn/hiện thanh bên': 'Show/hide sidebar', 'Chèn ảnh / PDF': 'Insert image / PDF',
  'Đang tạo bản sao lưu…': 'Creating backup…', 'Tệp không phải bản sao lưu Vincenink': 'This is not a Vincenink backup file', 'Khôi phục bản sao lưu?': 'Restore backup?',
  'Dữ liệu hiện tại trên máy sẽ được <b>thay thế</b> bằng bản sao lưu ngày {d} ({s} học sinh, {b} bảng, {f} tài liệu).': 'Current data on this device will be <b>replaced</b> by the backup from {d} ({s} students, {b} boards, {f} files).',
  'Khôi phục': 'Restore', 'Không khôi phục được: {m}': 'Restore failed: {m}',
  'Ảnh hoặc PDF': 'Image or PDF', 'Chèn nguyên bản, giữ màu': 'Insert as is, keep colours', 'Bản quét (làm rõ chữ)': 'Scan (sharpen text)',
  'Làm trắng nền giấy, chữ đen rõ — hợp ảnh chụp, PDF scan': 'Whitens paper, darkens text — for photos and scanned PDFs', 'Chụp tài liệu bằng camera': 'Capture with camera',
  'Điện thoại / iPad: chụp phiếu bài tập rồi tự làm rõ': 'Phone / iPad: snap a worksheet, auto-sharpened',
  'Tải PDF': 'Download PDF', 'Kiểu PDF': 'PDF style', 'Màu': 'Colour', 'Giữ nguyên màu như trên bảng': 'Exactly as on the board', 'Bản quét': 'Scan',
  'Đen trắng, nền trắng — nhẹ, in rõ': 'Black & white on white — small and print-friendly', 'Khổ giấy': 'Page size', 'A4 dọc': 'A4 portrait', 'A4 ngang': 'A4 landscape', 'Tự động': 'Auto',
  'Chia trang': 'Layout', 'Chia thành nhiều trang A4': 'Split into A4 pages', 'Gộp vừa 1 trang': 'Fit on one page', 'In kèm nền ô/kẻ': 'Include background lines',
  'Thêm tiêu đề (tên bảng, học sinh, ngày, giáo viên)': 'Add a header (board, student, date, teacher)', 'Đang tạo PDF…': 'Creating PDF…', 'Đã tải PDF ({n} trang)': 'PDF downloaded ({n} pages)',
  'Tạo PDF': 'Create PDF', 'Giáo viên: {n}': 'Teacher: {n}',
  'Chưa có lịch.': 'Nothing scheduled.',
  '✏️ Bài giảng đang chờ bạn…': '✏️ Your lesson is waiting…', 'Bảng trắng dạy học trực tuyến': 'Online teaching whiteboard',
  'Trình duyệt không cho lưu dữ liệu (IndexedDB). Hãy mở bằng Chrome/Safari bản mới.': 'This browser cannot store data (IndexedDB). Please use a recent Chrome or Safari.',
  'Vincenink vừa được cập nhật ở tab khác — hãy tải lại trang này.': 'Vincenink was updated in another tab — please reload this page.',
  'Đang chờ tab Vincenink cũ đóng lại… Hãy đóng các tab Vincenink khác rồi tải lại trang.': 'Waiting for an older Vincenink tab to close… Close other Vincenink tabs, then reload.',
  'Không khởi động được Vincenink: {m}. Hãy tải lại trang.': 'Vincenink could not start: {m}. Please reload the page.',
  'Theo hệ thống': 'System',
  'Sáng (be)': 'Light (beige)',
  'Bảng phấn xanh': 'Green chalkboard',
  'Hôm nay': 'Today',
  'Đổi lịch tuần này': 'Changed this week',
  'Bấm để sửa, đổi lịch tuần này, mở bảng…': 'Click to edit, change this week, open board…',
  'từ {d}': 'from {d}',
  'Ghi lịch học': 'Add to schedule',
  'Đổi tuần này': 'This week only',
  'Nghỉ': 'Cancelled',
  'Về tuần này': 'Back to this week',
  'Thêm': 'Add',
  'ghi lịch cho ngày này': 'add a lesson this day',
  'Chú thích tuần này': 'Notes for this week',
  'Lịch cố định của từng học sinh nằm trong trang của học sinh đó; tuần ở trên đã gộp lịch của cả lớp.': 'Each student’s weekly schedule lives on their page; the week above combines the whole class.',
  'Sửa lịch cố định (mọi tuần)': 'Edit weekly schedule (all weeks)',
  'Chưa có lịch cố định. Bấm “Ghi lịch học” và chọn “Cố định hằng tuần” để buổi học tự lặp lại mỗi tuần.': 'No weekly schedule yet. Click “Add to schedule” and choose “Every week” so the lesson repeats automatically.',
  'Sửa buổi này': 'Edit this lesson',
  'Sửa thay đổi của tuần này': 'Edit this week’s change',
  'Đổi giờ / ngày chỉ tuần này': 'Change time / day for this week only',
  'Các tuần khác vẫn giữ lịch cố định': 'Other weeks keep the weekly schedule',
  'Trả về lịch cố định': 'Restore weekly schedule',
  'Nghỉ buổi này (chỉ tuần này)': 'Cancel this lesson (this week only)',
  'Lịch cố định: {x}': 'Weekly schedule: {x}',
  'Thay đổi dưới đây <b>chỉ áp dụng tuần {a} – {b}</b>. Các tuần khác vẫn học như lịch cố định.': 'The change below <b>only applies to the week {a} – {b}</b>. Other weeks follow the weekly schedule.',
  'Học vào ngày': 'Day',
  'Chú thích': 'Note',
  'VD: Dời lịch vì học sinh đi thi': 'e.g. Moved because of an exam',
  'Đổi lịch chỉ tuần này': 'Change this week only',
  'Lưu cho tuần này': 'Save for this week',
  'Đã đổi lịch cho riêng tuần này': 'Changed for this week only',
  'Lịch của': 'Schedule for',
  'Bạn đang sửa <b>lịch cố định</b>: thay đổi áp dụng cho mọi tuần. Muốn đổi riêng một tuần, hãy bấm vào buổi học trong tuần đó và chọn “Đổi giờ / ngày chỉ tuần này”.': 'You are editing the <b>weekly schedule</b>: changes apply to every week. To change a single week, click the lesson in that week and choose “Change time / day for this week only”.',
  'Kiểu lịch': 'Type',
  'Luôn lặp lại cùng thứ, cùng giờ. Tuần nào cần đổi thì đổi riêng tuần đó.': 'Always repeats on the same day and time. Need a change? Change just that week.',
  'Học bù, học thêm, buổi kiểm tra…': 'Make-up, extra lesson, test…',
  'VD: Mang vở ô li, ôn bài 5': 'e.g. Bring notebook, review unit 5',
  'Sửa lịch cố định': 'Edit weekly lesson',
  'Hồ sơ của bạn · đổi ảnh đại diện': 'Your profile · change photo',
  'Hồ sơ': 'Profile',
  'Thêm ảnh đại diện và thông tin cá nhân': 'Add a photo and your details',
  'Đổi ảnh đại diện': 'Change photo',
  'Tải ảnh đại diện': 'Upload a photo',
  'Giao diện': 'Appearance',
  'Cài đặt': 'Settings',
  'Kéo để đổi độ rộng · nhấp đúp để về mặc định': 'Drag to resize · double-click to reset',
  'Mở trang của {n}': 'Open {n}',
  'Tự đổi sáng/tối theo máy': 'Follows your device',
  'Nền be dịu mắt': 'Soft beige paper',
  'Đỡ chói buổi tối': 'Easy on the eyes at night',
  'Như bảng lớp học': 'Like a classroom board',
  'Giấy trơn, không kẻ': 'Blank paper',
  'Vẽ hình, làm toán': 'Drawing and maths',
  'Luyện chữ như vở ô li': 'Handwriting practice (Vietnamese ô li)',
  'Viết đoạn văn, chính tả': 'Paragraphs and dictation',
  'Vẽ đồ thị, sơ đồ': 'Graphs and diagrams',
  'Lịch hôm nay': 'Today',
  'Hôm nay không có buổi học nào.': 'No lessons today.',
  'Ghi lịch': 'Add lesson',
  'Đã nghỉ hôm nay': 'Cancelled today',
  'Đang học': 'Now',
  '{b} bảng': '{b} boards',
  'Cố định hằng tuần hoặc một buổi': 'Weekly or one-off',
  'Xem lịch học': 'View schedule',
  'Về Vincenink': 'About Vincenink',
  '45 phút': '45 min',
  '1 giờ': '1 hour',
  '1,5 giờ': '1.5 hours',
  '2 giờ': '2 hours',
  'Lặp lại mỗi tuần, đổi riêng tuần nào cũng được': 'Repeats every week; any single week can be changed',
  'Học bù, học thêm, kiểm tra': 'Make-up, extra lesson, test',
  'Học vào thứ': 'Day of the week',
  'Ngày học': 'Date',
  'Thời gian': 'Time',
  '(tuỳ chọn)': '(optional)',
  'Lưu lịch': 'Save',
  'Đã ghi lịch cho {n}': 'Scheduled for {n}',
  'Giờ': 'Hour',
  'Phút': 'Minute',
};
const WD = { vi: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'], en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] };
const WDS = { vi: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
function t(s, vars) {
  let r = LANG === 'en' && EN[s] !== undefined ? EN[s] : s;
  if (vars) for (const k in vars) r = r.split('{' + k + '}').join(vars[k]);
  return r;
}
const locale = () => LANG === 'en' ? 'en-GB' : 'vi-VN';
function fmtDateLong(ds) {
  const s = parseD(ds).toLocaleDateString(locale(), { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function applyStaticI18n() {
  document.documentElement.lang = LANG;
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle.replace('&amp;', '&')); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('#langSeg button').forEach(b => b.classList.toggle('active', b.dataset.lang === LANG));
}
function setLang(l) {
  if (l === LANG) return; LANG = l; ls.set('vincenink.lang', l);
  applyStaticI18n(); renderToolbar(); renderProps(); renderSidebar(); renderPanel(); renderTopbar(); renderProfileCard(); renderThemeUI(); updateTitle();
  renderBgUI();
}

/* ---------------- Biểu tượng ---------------- */
const ICONS = {
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  marker: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  lasso: '<path d="M7 22a5 5 0 0 1-2-4"/><path d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1"/><path d="M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>',
  shapes: '<path d="M8.3 10a.7.7 0 0 1-.63-1.08L11.4 3a.7.7 0 0 1 1.2-.04L16.3 8.9a.7.7 0 0 1-.57 1.1Z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
  text: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
  laser: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  pdf: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 12v6M9 15l3 3 3-3"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  wipe: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  sidebar: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  note: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/>',
  board: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  fit: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  up: '<path d="m5 12 7-7 7 7M12 19V5"/>',
  down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  edit: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.4 2.6a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4Z"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  toBoard: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M12 7v7M9 11l3 3 3-3"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.6-1.7h2c3.1 0 5.6-2.5 5.6-5.6C22 6 17.5 2 12 2z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  s_line: '<path d="M5 19 19 5"/>', s_arrow: '<path d="M5 19 19 5M9 5h10v10"/>', s_rect: '<rect x="4" y="6" width="16" height="12" rx="1"/>',
  s_ellipse: '<ellipse cx="12" cy="12" rx="9" ry="7"/>', s_triangle: '<path d="M12 4 21 20H3Z"/>',
};
const ic = (n, s = 20) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------------- Hằng số & giao diện màu ---------------- */
const COLORS = ['#2F2A25', '#1F4E8C', '#C0392B', '#2E7D4F', '#D98E04', '#7B4FA0', '#D6668A', '#5B8DB8'];
const MARKERS = ['#FFD54A', '#9BE27A', '#FF9EC4', '#8FD3FF', '#FFB067'];
const STUDENT_COLORS = ['#C98B5A', '#7FA37A', '#6F93B8', '#B9798F', '#C9A64B', '#8E7CB0', '#5FA3A0', '#B5674D'];
const BGS = [['plain', 'Trơn'], ['grid', 'Ô vuông'], ['oli', 'Ô li'], ['lines', 'Dòng kẻ'], ['dots', 'Chấm']];
const SIZE_RANGE = { pen: [1, 30], marker: [6, 60], eraser: [8, 120], shape: [1, 20], text: [12, 96] };
const TOOLS = [
  ['hand', 'hand', 'Kéo bảng (H) — hoặc giữ phím Space'], ['pen', 'pen', 'Bút viết (P)'], ['marker', 'marker', 'Bút dạ quang (M)'],
  ['eraser', 'eraser', 'Tẩy (E)'], ['lasso', 'lasso', 'Khoanh vùng (L) — chọn hoặc xoá'], ['shape', 'shapes', 'Hình (S)'],
  ['text', 'text', 'Chữ (T)'], ['laser', 'laser', 'Bút laser (K) — chỉ để trỏ, tự mờ'],
];
const THEMES = {
  light: { paper: '#FFFCF6', line: 'rgba(140,105,60,0.13)', strong: 'rgba(140,105,60,0.27)', dot: 'rgba(140,105,60,0.38)', margin: 'rgba(196,92,80,0.28)', ph: '#EFE6D8', sel: '#A86B3C', dark: false },
  dark: { paper: '#1F1C18', line: 'rgba(230,205,170,0.08)', strong: 'rgba(230,205,170,0.17)', dot: 'rgba(230,205,170,0.24)', margin: 'rgba(230,120,100,0.3)', ph: '#2E2923', sel: '#D79A63', dark: true },
  chalk: { paper: '#233B31', line: 'rgba(235,245,230,0.09)', strong: 'rgba(235,245,230,0.19)', dot: 'rgba(235,245,230,0.26)', margin: 'rgba(250,150,130,0.35)', ph: '#2D473C', sel: '#E8C07A', dark: true },
};
const THEME_OPTS = [['system', 'Theo hệ thống'], ['light', 'Sáng (be)'], ['dark', 'Tối'], ['chalk', 'Bảng phấn xanh']];
// Màu mực tối được làm sáng khi hiển thị trên nền tối (dữ liệu gốc giữ nguyên để in/xuất)
const DARK_INK = { '#2F2A25': '#EEE6D9', '#1F4E8C': '#79A7E6', '#7B4FA0': '#B88CDD', '#2E7D4F': '#62C08A', '#C0392B': '#F0705F', '#5B8DB8': '#8FB9E0' };
let RT = THEMES.light;
const inkColor = c => (RT.dark && DARK_INK[c]) || c;
let themePref = 'system'; // luôn theo hệ thống khi vào trang; đổi trong phiên thì giữ đến khi tải lại
const mq = matchMedia('(prefers-color-scheme: dark)');
const resolvedTheme = () => THEMES[themePref] ? themePref : (mq.matches ? 'dark' : 'light');

/* ---------------- Cơ sở dữ liệu (IndexedDB) ---------------- */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('vincenink', 2);
      r.onupgradeneeded = () => {
        const d = r.result;
        ['students', 'boards', 'boardData', 'files', 'settings', 'schedule'].forEach(s => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); });
      };
      r.onsuccess = () => {
        this.db = r.result;
        // Khi có bản mới cần nâng cấp dữ liệu ở tab khác: tự đóng để không chặn tab mới
        this.db.onversionchange = () => { this.db.close(); toast(t('Vincenink vừa được cập nhật ở tab khác — hãy tải lại trang này.'), true); };
        res();
      };
      r.onerror = () => rej(r.error);
      r.onblocked = () => toast(t('Đang chờ tab Vincenink cũ đóng lại… Hãy đóng các tab Vincenink khác rồi tải lại trang.'), true);
    });
  },
  req(store, mode, fn) {
    return new Promise((res, rej) => {
      const tx = this.db.transaction(store, mode); const q = fn(tx.objectStore(store));
      tx.oncomplete = () => res(q ? q.result : undefined); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
    });
  },
  all(s) { return this.req(s, 'readonly', st => st.getAll()); },
  get(s, id) { return this.req(s, 'readonly', st => st.get(id)); },
  put(s, v) { return this.req(s, 'readwrite', st => st.put(v)); },
  del(s, id) { return this.req(s, 'readwrite', st => st.delete(id)); },
  clear(s) { return this.req(s, 'readwrite', st => st.clear()); },
};

/* ---------------- Trạng thái ---------------- */
const S = {
  students: [], boards: [], files: [], sched: new Map(),
  settings: { id: 'main', penOnly: false, classNote: '', lastStudent: 'all', lastBoard: null, profile: {} },
  studentId: 'all', boardId: null, tab: 'boards', search: '', week: weekStart(new Date()),
};
const E = {
  items: [], bg: 'grid', view: { x: 0, y: 0, s: 1 },
  tool: 'pen', color: COLORS[0], markerColor: MARKERS[0], penStyle: 'even', eraserMode: 'part', lassoMode: 'select', shape: 'rect',
  sizes: { pen: 4, marker: 18, eraser: 30, shape: 3, text: 28 },
  undo: [], redo: [], sel: new Set(), cur: null, drag: null, laser: [], hover: null, editing: null,
};
const PREF_KEYS = ['tool', 'color', 'markerColor', 'penStyle', 'eraserMode', 'lassoMode', 'shape', 'sizes'];
function loadPrefs() {
  try {
    const p = JSON.parse(ls.get('vincenink.prefs', '{}'));
    if (ls.get('vincenink.prefsv', '') !== '3') { // bản mới: về mặc định bút nét đều, cỡ vừa, mực đen (tối thì trắng)
      delete p.penStyle; delete p.color; if (p.sizes) delete p.sizes.pen; ls.set('vincenink.prefsv', '3');
    }
    PREF_KEYS.forEach(k => { if (p[k] !== undefined) E[k] = k === 'sizes' ? { ...E.sizes, ...p[k] } : p[k]; });
  } catch (e) { /* */ }
  if (E.tool === 'laser' || E.tool === 'hand') E.tool = 'pen';
}
function savePrefs() { const p = {}; PREF_KEYS.forEach(k => p[k] = E[k]); ls.set('vincenink.prefs', JSON.stringify(p)); }
const saveSettings = () => DB.put('settings', S.settings).catch(() => {});
const studentById = id => S.students.find(s => s.id === id);
const ownerName = id => id === 'all' ? t('Lớp chung') : (studentById(id)?.name || t('Học sinh'));
const ownerColor = id => id === 'all' ? null : (studentById(id)?.color || STUDENT_COLORS[0]);
const avatarHTML = (id, cls = '') => id === 'all'
  ? `<span class="avatar class ${cls}">${ic('book', cls.includes('lg') ? 20 : 16)}</span>`
  : `<span class="avatar ${cls}" style="background:${ownerColor(id)}">${esc((ownerName(id).trim()[0] || '?').toUpperCase())}</span>`;

/* =====================================================================
   BỘ VẼ (canvas)
   ===================================================================== */
const wrap = $('#canvasWrap');
const cv = $('#board');
const ctx = cv.getContext('2d');
const base = document.createElement('canvas');
const bctx = base.getContext('2d');
const mctx = document.createElement('canvas').getContext('2d');
let W = 0, H = 0, DPR = 1, rect = { left: 0, top: 0 };
let baseDirty = true, rafId = 0;
let bbCache = new WeakMap();
const imgCache = new Map();

function resize() {
  const r = wrap.getBoundingClientRect();
  rect = r; W = r.width; H = r.height; DPR = window.devicePixelRatio || 1;
  for (const c of [cv, base]) { c.width = Math.max(1, Math.round(W * DPR)); c.height = Math.max(1, Math.round(H * DPR)); }
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  requestRender(true);
}
const pos = e => ({ x: e.clientX - rect.left, y: e.clientY - rect.top });
const toWorld = p => ({ x: (p.x - E.view.x) / E.view.s, y: (p.y - E.view.y) / E.view.s });
const toScreen = (x, y) => ({ x: x * E.view.s + E.view.x, y: y * E.view.s + E.view.y });
function requestRender(dirty) { if (dirty) baseDirty = true; if (!rafId) rafId = requestAnimationFrame(frame); }

const fontStr = fs => `${fs}px "Be Vietnam Pro", system-ui, sans-serif`;
function textMetrics(it) {
  mctx.font = fontStr(it.fs);
  const lines = it.text.split('\n'); let w = 0;
  for (const l of lines) w = Math.max(w, mctx.measureText(l || ' ').width);
  return { w: w + 2, h: lines.length * it.fs * 1.3 };
}
const arrowHead = it => Math.max(it.size * 3.5, 12);
function bbox(it) {
  let b = bbCache.get(it); if (b) return b;
  if (it.type === 'stroke') {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of it.pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    const h = it.size / 2 + 1; b = { x: x0 - h, y: y0 - h, w: x1 - x0 + 2 * h, h: y1 - y0 + 2 * h };
  } else if (it.type === 'shape') {
    const h = it.size / 2 + (it.kind === 'arrow' ? arrowHead(it) : 0) + 1;
    b = { x: Math.min(it.x1, it.x2) - h, y: Math.min(it.y1, it.y2) - h, w: Math.abs(it.x2 - it.x1) + 2 * h, h: Math.abs(it.y2 - it.y1) + 2 * h };
  } else if (it.type === 'text') { const m = textMetrics(it); b = { x: it.x, y: it.y, w: m.w, h: m.h }; }
  else b = { x: it.x, y: it.y, w: it.w, h: it.h };
  bbCache.set(it, b); return b;
}
function unionBounds(list) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const it of list) { const b = bbox(it); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
  return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function getImg(src) {
  let im = imgCache.get(src);
  if (!im) { im = new Image(); im.onload = () => requestRender(true); im.src = src; imgCache.set(src, im); }
  return im.complete && im.naturalWidth ? im : null;
}

/* ---- Vẽ từng đối tượng ---- */
function tracePath(c, pts, cont) {
  if (cont) c.lineTo(pts[0][0], pts[0][1]); else c.moveTo(pts[0][0], pts[0][1]);
  const n = pts.length;
  if (n < 3) { for (let i = 1; i < n; i++) c.lineTo(pts[i][0], pts[i][1]); return; }
  for (let i = 1; i < n - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  c.lineTo(pts[n - 1][0], pts[n - 1][1]);
}
function inkWidths(it) {
  const P = it.pts, n = P.length, raw = new Array(n);
  for (let i = 0; i < n; i++) raw[i] = it.size * (0.12 + 1.1 * P[i][2]) / 2;
  const w = raw.slice();
  for (let i = 1; i < n - 1; i++) w[i] = (raw[i - 1] + raw[i] * 2 + raw[i + 1]) / 4;
  const T = Math.min(6, Math.floor(n / 3));
  for (let i = 0; i < T; i++) { w[i] *= 0.4 + 0.6 * (i / T); w[n - 1 - i] *= 0.5 + 0.5 * (i / T); }
  return w;
}
function drawInk(c, it) {
  const P = it.pts, n = P.length, ws = inkWidths(it);
  c.fillStyle = inkColor(it.color); c.beginPath();
  if (n < 2) { c.arc(P[0][0], P[0][1], Math.max(0.6, it.size * 0.4), 0, Math.PI * 2); c.fill(); return; }
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, w = Math.max(0.3, ws[i]);
    L.push([P[i][0] + nx * w, P[i][1] + ny * w]); R.push([P[i][0] - nx * w, P[i][1] - ny * w]);
  }
  tracePath(c, L, false);
  const e = P[n - 1], ae = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]);
  c.arc(e[0], e[1], Math.max(0.3, ws[n - 1]), ae, ae - Math.PI, true);
  tracePath(c, R.reverse(), true);
  const s = P[0], as = Math.atan2(R[n - 1][1] - s[1], R[n - 1][0] - s[0]);
  c.arc(s[0], s[1], Math.max(0.3, ws[0]), as, as - Math.PI, true);
  c.closePath(); c.fill();
}
function drawStroke(c, it) {
  const P = it.pts; if (!P.length) return;
  c.save();
  if (it.tool === 'marker') { c.globalAlpha = RT.dark ? 0.34 : 0.42; if (!RT.dark) c.globalCompositeOperation = 'multiply'; }
  if (it.style === 'even' || it.tool === 'marker') {
    c.strokeStyle = it.tool === 'marker' ? it.color : inkColor(it.color); c.lineWidth = it.size; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); tracePath(c, P, false); if (P.length === 1) c.lineTo(P[0][0] + 0.01, P[0][1]); c.stroke();
  } else drawInk(c, it);
  c.restore();
}
function shapePath(c, it) {
  const { x1, y1, x2, y2 } = it; const x0 = Math.min(x1, x2), y0 = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
  c.beginPath();
  switch (it.kind) {
    case 'line': c.moveTo(x1, y1); c.lineTo(x2, y2); break;
    case 'arrow': {
      c.moveTo(x1, y1); c.lineTo(x2, y2);
      const a = Math.atan2(y2 - y1, x2 - x1), hl = arrowHead(it);
      c.moveTo(x2 - hl * Math.cos(a - 0.45), y2 - hl * Math.sin(a - 0.45)); c.lineTo(x2, y2);
      c.lineTo(x2 - hl * Math.cos(a + 0.45), y2 - hl * Math.sin(a + 0.45)); break;
    }
    case 'rect': c.rect(x0, y0, w, h); break;
    case 'ellipse': c.ellipse(x0 + w / 2, y0 + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); break;
    case 'triangle': c.moveTo(x0 + w / 2, y0); c.lineTo(x0 + w, y0 + h); c.lineTo(x0, y0 + h); c.closePath(); break;
  }
}
function drawShape(c, it) { c.save(); c.strokeStyle = inkColor(it.color); c.lineWidth = it.size; c.lineCap = 'round'; c.lineJoin = 'round'; shapePath(c, it); c.stroke(); c.restore(); }
function drawText(c, it) {
  c.save(); c.fillStyle = inkColor(it.color); c.font = fontStr(it.fs); c.textBaseline = 'top';
  it.text.split('\n').forEach((l, i) => c.fillText(l, it.x, it.y + i * it.fs * 1.3 + it.fs * 0.08));
  c.restore();
}
function drawImageItem(c, it) {
  const im = getImg(it.src);
  if (im) c.drawImage(im, it.x, it.y, it.w, it.h); else { c.fillStyle = RT.ph; c.fillRect(it.x, it.y, it.w, it.h); }
}
function drawItem(c, it) {
  if (it === E.editing) return;
  if (it.type === 'stroke') drawStroke(c, it);
  else if (it.type === 'shape') drawShape(c, it);
  else if (it.type === 'text') drawText(c, it);
  else if (it.type === 'image') drawImageItem(c, it);
}

/* ---- Nền bảng ---- */
function drawBg(c, w, h, view, type) {
  if (type === 'plain') return;
  const s = view.s, mod = (a, b) => ((a % b) + b) % b;
  c.save(); c.lineWidth = 1;
  const hl = (st, col, off) => { c.strokeStyle = col; c.beginPath(); for (let y = mod(off, st); y < h; y += st) { const yy = Math.round(y) + 0.5; c.moveTo(0, yy); c.lineTo(w, yy); } c.stroke(); };
  const vl = (st, col, off) => { c.strokeStyle = col; c.beginPath(); for (let x = mod(off, st); x < w; x += st) { const xx = Math.round(x) + 0.5; c.moveTo(xx, 0); c.lineTo(xx, h); } c.stroke(); };
  if (type === 'grid') { let st = 32 * s; while (st < 10) st *= 2; hl(st, RT.line, view.y); vl(st, RT.line, view.x); }
  else if (type === 'lines') {
    let st = 36 * s; while (st < 10) st *= 2; hl(st, RT.line, view.y);
    const mx = view.x + 64 * s; if (mx > 0 && mx < w) { c.strokeStyle = RT.margin; c.beginPath(); c.moveTo(mx, 0); c.lineTo(mx, h); c.stroke(); }
  } else if (type === 'dots') {
    let st = 28 * s; while (st < 10) st *= 2; const r = clamp(1.4 * s, 0.9, 2);
    c.fillStyle = RT.dot; c.beginPath();
    for (let x = mod(view.x, st); x < w; x += st) for (let y = mod(view.y, st); y < h; y += st) c.rect(x - r / 2, y - r / 2, r, r);
    c.fill();
  } else if (type === 'oli') {
    const big = 48 * s;
    if (big >= 6) { if (big / 4 >= 4) hl(big / 4, RT.line, view.y); hl(big, RT.strong, view.y); vl(big, RT.strong, view.x); }
  }
  c.restore();
}

/* ---- Vẽ cả cảnh ---- */
function drawScene(c, w, h, view, k, opts = {}) {
  const prev = RT; RT = THEMES[opts.theme || resolvedTheme()];
  c.setTransform(k, 0, 0, k, 0, 0);
  c.fillStyle = RT.paper; c.fillRect(0, 0, w, h);
  if (opts.bg !== false) drawBg(c, w, h, view, typeof opts.bg === 'string' ? opts.bg : E.bg);
  c.setTransform(k * view.s, 0, 0, k * view.s, k * view.x, k * view.y);
  const vx = -view.x / view.s, vy = -view.y / view.s, vw = w / view.s, vh = h / view.s;
  // Ảnh/PDF luôn nằm dưới, nét viết và chữ luôn nằm trên để viết đè lên tài liệu
  const list = opts.items || E.items;
  for (const pass of [true, false]) for (const it of list) {
    if ((it.type === 'image') !== pass) continue;
    const b = bbox(it);
    if (b.x > vx + vw || b.y > vy + vh || b.x + b.w < vx || b.y + b.h < vy) continue;
    drawItem(c, it);
  }
  RT = prev;
}

function frame() {
  rafId = 0; RT = THEMES[resolvedTheme()];
  if (baseDirty) { drawScene(bctx, W, H, E.view, DPR); baseDirty = false; }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(base, 0, 0);
  const s = E.view.s;
  ctx.setTransform(DPR * s, 0, 0, DPR * s, DPR * E.view.x, DPR * E.view.y);
  if (E.cur) drawItem(ctx, E.cur);
  if (E.sel.size) {
    const b = selBounds(), pd = 6 / s;
    ctx.save(); ctx.strokeStyle = RT.sel; ctx.lineWidth = 1.5 / s; ctx.setLineDash([6 / s, 4 / s]);
    ctx.strokeRect(b.x - pd, b.y - pd, b.w + 2 * pd, b.h + 2 * pd); ctx.setLineDash([]);
    const hs = 12 / s; ctx.fillStyle = RT.paper; ctx.lineWidth = 2 / s;
    ctx.fillRect(b.x + b.w + pd - hs / 2, b.y + b.h + pd - hs / 2, hs, hs); ctx.strokeRect(b.x + b.w + pd - hs / 2, b.y + b.h + pd - hs / 2, hs, hs);
    ctx.restore();
  }
  if (E.drag && E.drag.mode === 'lasso' && E.drag.pts.length > 1) {
    const erase = E.lassoMode === 'erase';
    ctx.save(); ctx.beginPath(); E.drag.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    ctx.fillStyle = erase ? 'rgba(200,80,60,0.09)' : 'rgba(168,107,60,0.08)'; ctx.fill();
    ctx.strokeStyle = erase ? '#C9503F' : RT.sel; ctx.lineWidth = 1.5 / s; ctx.setLineDash([5 / s, 4 / s]); ctx.stroke(); ctx.restore();
  }
  const now = performance.now();
  E.laser = E.laser.filter(p => now - p.t < 900);
  if (E.laser.length) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < E.laser.length; i++) {
      const a = E.laser[i - 1], b = E.laser[i]; if (b.t - a.t > 120) continue;
      const life = 1 - (now - b.t) / 900;
      ctx.strokeStyle = `rgba(232,62,48,${0.85 * life})`; ctx.lineWidth = (3 + 4 * life) / s;
      ctx.shadowColor = 'rgba(255,80,60,0.8)'; ctx.shadowBlur = 10 * life;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (E.hover && !(E.drag && E.drag.mode === 'pan')) {
    if (E.tool === 'eraser') {
      ctx.beginPath(); ctx.arc(E.hover.x, E.hover.y, E.sizes.eraser / 2, 0, Math.PI * 2);
      ctx.fillStyle = RT.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)'; ctx.fill();
      ctx.strokeStyle = RT.dark ? 'rgba(240,225,200,0.7)' : 'rgba(90,70,50,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
    } else if (E.tool === 'laser') {
      ctx.beginPath(); ctx.arc(E.hover.x, E.hover.y, 5, 0, Math.PI * 2); ctx.fillStyle = '#E83E30';
      ctx.shadowColor = 'rgba(255,60,40,.9)'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
    }
  }
  updateSelBar();
  if (E.laser.length) requestRender();
}

/* ---- Hình học ---- */
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let k = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; k = clamp(k, 0, 1);
  return Math.hypot(px - (ax + k * dx), py - (ay + k * dy));
}
function polyHit(pts, x, y, r) {
  if (pts.length === 1) return Math.hypot(pts[0][0] - x, pts[0][1] - y) <= r;
  for (let i = 0; i < pts.length - 1; i++) if (distSeg(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= r) return true;
  return false;
}
function shapeOutline(it) {
  const { x1, y1, x2, y2 } = it; const x0 = Math.min(x1, x2), y0 = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
  switch (it.kind) {
    case 'line': case 'arrow': return [[x1, y1], [x2, y2]];
    case 'rect': return [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0]];
    case 'triangle': return [[x0 + w / 2, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0 + w / 2, y0]];
    default: { const o = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; o.push([x0 + w / 2 + Math.cos(a) * w / 2, y0 + h / 2 + Math.sin(a) * h / 2]); } return o; }
  }
}
function hitItem(it, x, y, tol) {
  const b = bbox(it);
  if (x < b.x - tol || x > b.x + b.w + tol || y < b.y - tol || y > b.y + b.h + tol) return false;
  if (it.type === 'stroke') return polyHit(it.pts, x, y, tol + it.size / 2);
  if (it.type === 'shape') return polyHit(shapeOutline(it), x, y, tol + it.size / 2);
  return true;
}
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function densify(pts, step) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(d / step);
    for (let k = 1; k <= n; k++) { const f = k / (n + 1); out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]); }
    out.push(b);
  }
  return out;
}
function splitRuns(pts, removeFn) {
  const runs = []; let run = [];
  for (const q of pts) { if (removeFn(q)) { if (run.length) runs.push(run); run = []; } else run.push(q); }
  if (run.length) runs.push(run);
  return runs.filter(r => r.length >= 2);
}
function translateItem(it, dx, dy) {
  switch (it.type) {
    case 'stroke': return { ...it, pts: it.pts.map(p => [p[0] + dx, p[1] + dy, p[2]]) };
    case 'shape': return { ...it, x1: it.x1 + dx, y1: it.y1 + dy, x2: it.x2 + dx, y2: it.y2 + dy };
    default: return { ...it, x: it.x + dx, y: it.y + dy };
  }
}
function scaleItem(it, ax, ay, k) {
  const fx = x => ax + (x - ax) * k, fy = y => ay + (y - ay) * k;
  switch (it.type) {
    case 'stroke': return { ...it, size: it.size * k, pts: it.pts.map(p => [fx(p[0]), fy(p[1]), p[2]]) };
    case 'shape': return { ...it, size: it.size * k, x1: fx(it.x1), y1: fy(it.y1), x2: fx(it.x2), y2: fy(it.y2) };
    case 'text': return { ...it, x: fx(it.x), y: fy(it.y), fs: it.fs * k };
    default: return { ...it, x: fx(it.x), y: fy(it.y), w: it.w * k, h: it.h * k };
  }
}
const selBounds = () => unionBounds([...E.sel]);

/* ---- Hoàn tác ---- */
function pushUndo(prev = E.items) { E.undo.push(prev); if (E.undo.length > 150) E.undo.shift(); E.redo = []; updateUndoBtns(); }
function setItems(arr) { E.items = arr; requestRender(true); scheduleSave(true); }
function commitItems(arr) { pushUndo(); setItems(arr); }
function undo() { commitTextEdit(); if (!E.undo.length) return; E.redo.push(E.items); E.items = E.undo.pop(); E.sel.clear(); requestRender(true); scheduleSave(true); updateUndoBtns(); }
function redo() { if (!E.redo.length) return; E.undo.push(E.items); E.items = E.redo.pop(); E.sel.clear(); requestRender(true); scheduleSave(true); updateUndoBtns(); }
function updateUndoBtns() {
  const u = $('#toolbar [data-act=undo]'), r = $('#toolbar [data-act=redo]');
  if (u) u.disabled = !E.undo.length; if (r) r.disabled = !E.redo.length;
}

/* ---- Thu phóng ---- */
function zoomAt(px, py, factor) {
  const s0 = E.view.s, s1 = clamp(s0 * factor, 0.1, 8);
  E.view.x = px - (px - E.view.x) * (s1 / s0); E.view.y = py - (py - E.view.y) * (s1 / s0); E.view.s = s1;
  requestRender(true); updateZoomLabel(); scheduleSave(false);
}
function fitView(b, w, h, margin, maxS = 2) {
  const s = Math.min((w - 2 * margin) / Math.max(b.w, 1), (h - 2 * margin) / Math.max(b.h, 1), maxS);
  return { s, x: w / 2 - (b.x + b.w / 2) * s, y: h / 2 - (b.y + b.h / 2) * s };
}
function fitContent() {
  const b = unionBounds(E.items);
  E.view = b ? fitView(b, W, H - 80, 60, 1.5) : { x: 0, y: 0, s: 1 };
  requestRender(true); updateZoomLabel(); scheduleSave(false);
}
function updateZoomLabel() { const z = $('#zoombar .zl'); if (z) z.textContent = Math.round(E.view.s * 100) + '%'; }

/* ---- Con trỏ hình bút ---- */
function cursorSVG(kind, color) {
  const c = encodeURIComponent(color);
  if (kind === 'marker') {
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cg stroke='white' stroke-width='1.6' stroke-linejoin='round'%3E%3Cpath d='M9.5 14.5 20 4l4 4-10.5 10.5z' fill='%235E5347'/%3E%3Cpath d='M9.5 14.5l4 4-2.5 2.5-4-4z' fill='${c}'/%3E%3Cpath d='M7 17l4 4-3 3H3v-2z' fill='${c}'/%3E%3C/g%3E%3C/svg%3E") 3 25, crosshair`;
  }
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cg stroke='white' stroke-width='1.6' stroke-linejoin='round'%3E%3Cpath d='M8 21 20.5 8.5a2.5 2.5 0 0 0-3.5-3.5L4.5 17.5z' fill='%233B332B'/%3E%3Cpath d='M4.5 17.5 8 21l-5 2z' fill='${c}'/%3E%3C/g%3E%3C/svg%3E") 3 24, crosshair`;
}
function updateCursor() {
  if (E.drag && E.drag.mode === 'pan') return;
  if (spaceDown) { cv.style.cursor = 'grab'; return; }
  if (E.tool === 'pen') cv.style.cursor = cursorSVG('pen', inkColor(E.color));
  else if (E.tool === 'marker') cv.style.cursor = cursorSVG('marker', E.markerColor);
  else if (E.tool === 'shape') cv.style.cursor = 'crosshair';
  else cv.style.cursor = '';
}

/* =====================================================================
   Tương tác con trỏ / bút / cảm ứng
   ===================================================================== */
const touches = new Map();
let pinch = null, spaceDown = false;
const curSizeWorld = kind => E.sizes[kind] / E.view.s;

cv.addEventListener('pointerdown', e => {
  if (E.editing || textEl) { commitTextEdit(); if (E.tool === 'text') return; }
  closeMenu();
  if (innerWidth <= 900 && !$('#app').classList.contains('focus')) { $('#app').classList.add('focus'); return; }
  cv.setPointerCapture(e.pointerId);
  const p = pos(e);
  if (e.pointerType === 'touch') {
    touches.set(e.pointerId, p);
    if (touches.size === 2) { cancelDrag(); startPinch(); return; }
    if (touches.size > 2 || pinch) return;
    if (S.settings.penOnly) { E.drag = { mode: 'pan', id: e.pointerId, last: p }; return; }
  }
  if (E.drag) return;
  if (e.button === 1 || e.button === 2 || spaceDown || E.tool === 'hand') {
    E.drag = { mode: 'pan', id: e.pointerId, last: p }; cv.classList.add('panning'); cv.style.cursor = ''; return;
  }
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const w = toWorld(p);
  switch (E.tool) {
    case 'pen': case 'marker': startStroke(e, p); break;
    case 'eraser': E.drag = { mode: 'erase', id: e.pointerId, last: w, before: E.items, changed: false }; eraseAt(w); requestRender(true); break;
    case 'lasso': lassoDown(e, p, w); break;
    case 'shape':
      E.cur = { type: 'shape', kind: E.shape, color: E.color, size: curSizeWorld('shape'), x1: r1(w.x), y1: r1(w.y), x2: r1(w.x), y2: r1(w.y) };
      E.drag = { mode: 'shape', id: e.pointerId }; break;
    case 'text': startTextEdit(null, w); break;
    case 'laser': E.drag = { mode: 'laser', id: e.pointerId }; E.laser.push({ ...w, t: performance.now() }); requestRender(); break;
  }
});
cv.addEventListener('pointermove', e => {
  const p = pos(e);
  E.hover = e.pointerType === 'touch' ? null : p;
  if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
    touches.set(e.pointerId, p);
    if (pinch) { if (!pinch.ended) updatePinch(); return; }
  }
  const d = E.drag;
  if (!d) { if (E.tool === 'eraser' || E.tool === 'laser') requestRender(); updateHoverCursor(p); return; }
  if (d.id !== e.pointerId) return;
  switch (d.mode) {
    case 'pan': E.view.x += p.x - d.last.x; E.view.y += p.y - d.last.y; d.last = p; requestRender(true); break;
    case 'stroke': { const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []; (evs.length ? evs : [e]).forEach(addPoint); requestRender(); break; }
    case 'erase': { const w = toWorld(p); eraseSeg(d.last, w); d.last = w; requestRender(true); break; }
    case 'lasso': { const w = toWorld(p); d.pts.push([w.x, w.y]); requestRender(); break; }
    case 'move': {
      const w = toWorld(p), dx = w.x - d.start.x, dy = w.y - d.start.y; d.moved = d.moved || Math.hypot(dx, dy) * E.view.s > 2;
      d.idx.forEach((i, j) => { E.items[i] = translateItem(d.orig[j], dx, dy); });
      E.sel = new Set(d.idx.map(i => E.items[i])); requestRender(true); break;
    }
    case 'scale': {
      const w = toWorld(p), b = d.box, k = Math.max(0.05, ((w.x - b.x) + (w.y - b.y)) / (b.w + b.h)); d.moved = true;
      d.idx.forEach((i, j) => { E.items[i] = scaleItem(d.orig[j], b.x, b.y, k); });
      E.sel = new Set(d.idx.map(i => E.items[i])); requestRender(true); break;
    }
    case 'shape': {
      const w = toWorld(p), c = E.cur; let x2 = w.x, y2 = w.y;
      if (e.shiftKey) {
        const dx = x2 - c.x1, dy = y2 - c.y1;
        if (c.kind === 'line' || c.kind === 'arrow') { const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), l = Math.hypot(dx, dy); x2 = c.x1 + Math.cos(a) * l; y2 = c.y1 + Math.sin(a) * l; }
        else { const m = Math.max(Math.abs(dx), Math.abs(dy)); x2 = c.x1 + Math.sign(dx || 1) * m; y2 = c.y1 + Math.sign(dy || 1) * m; }
      }
      c.x2 = r1(x2); c.y2 = r1(y2); requestRender(); break;
    }
    case 'laser': E.laser.push({ ...toWorld(p), t: performance.now() }); requestRender(); break;
  }
});
function endPointer(e) {
  if (e.pointerType === 'touch') {
    touches.delete(e.pointerId);
    if (pinch) { pinch.ended = true; if (!touches.size) { pinch = null; scheduleSave(false); } return; }
  }
  const d = E.drag; if (!d || d.id !== e.pointerId) return;
  E.drag = null; cv.classList.remove('panning');
  switch (d.mode) {
    case 'pan': scheduleSave(false); updateCursor(); break;
    case 'stroke':
      if (E.cur && E.cur.pts.length) {
        const w = toWorld(pos(e)), l = E.cur.pts[E.cur.pts.length - 1];
        if (Math.hypot(w.x - l[0], w.y - l[1]) * E.view.s > 1) E.cur.pts.push([r1(w.x), r1(w.y), l[2]]);
        commitItems([...E.items, E.cur]);
      }
      E.cur = null; break;
    case 'erase': if (d.changed) { pushUndo(d.before); scheduleSave(true); } break;
    case 'lasso': lassoUp(d); break;
    case 'move': case 'scale':
      if (!d.moved) { E.items = E.undo.pop(); E.sel = new Set(d.idx.map(i => E.items[i])); updateUndoBtns(); } else scheduleSave(true);
      requestRender(true); break;
    case 'shape': {
      const c = E.cur; E.cur = null;
      if (Math.hypot(c.x2 - c.x1, c.y2 - c.y1) * E.view.s > 3) commitItems([...E.items, c]); else requestRender();
      break;
    }
  }
  requestRender();
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('pointerleave', () => { E.hover = null; requestRender(); });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('mousedown', e => e.preventDefault()); // giữ con trỏ trong ô chữ đang gõ
cv.addEventListener('wheel', e => {
  e.preventDefault(); const p = pos(e);
  if (e.ctrlKey || e.metaKey) zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.01)));
  else { E.view.x -= e.deltaX; E.view.y -= e.deltaY; requestRender(true); scheduleSave(false); }
}, { passive: false });
cv.addEventListener('dblclick', e => {
  const w = toWorld(pos(e));
  const hit = [...E.items].reverse().find(it => it.type === 'text' && hitItem(it, w.x, w.y, 4 / E.view.s));
  if (hit) startTextEdit(hit);
});
function startPinch() {
  const [a, b] = [...touches.values()];
  pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v: { ...E.view } };
}
function updatePinch() {
  const [a, b] = [...touches.values()]; if (!b) return;
  const d = Math.hypot(a.x - b.x, a.y - b.y), c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const s1 = clamp(pinch.v.s * d / pinch.d, 0.1, 8), k = s1 / pinch.v.s;
  E.view = { s: s1, x: c.x - (pinch.c.x - pinch.v.x) * k, y: c.y - (pinch.c.y - pinch.v.y) * k };
  requestRender(true); updateZoomLabel();
}
function cancelDrag() {
  const d = E.drag; if (!d) return;
  if (d.mode === 'stroke' || d.mode === 'shape') E.cur = null;
  else if (d.mode === 'erase' && d.changed) E.items = d.before;
  else if (d.mode === 'move' || d.mode === 'scale') { E.items = E.undo.pop(); E.sel.clear(); updateUndoBtns(); }
  E.drag = null; requestRender(true);
}
function updateHoverCursor(p) {
  if (E.tool !== 'lasso') return;
  if (!E.sel.size) { cv.style.cursor = ''; return; }
  const b = selBounds(), pd = 6 / E.view.s, w = toWorld(p), hs = toScreen(b.x + b.w + pd, b.y + b.h + pd);
  if (Math.hypot(p.x - hs.x, p.y - hs.y) < 14) cv.style.cursor = 'nwse-resize';
  else if (w.x >= b.x - pd && w.x <= b.x + b.w + pd && w.y >= b.y - pd && w.y <= b.y + b.h + pd) cv.style.cursor = 'move';
  else cv.style.cursor = '';
}

/* ---- Bút ---- */
function startStroke(e, p) {
  const marker = E.tool === 'marker';
  E.cur = { type: 'stroke', tool: E.tool, style: marker ? 'even' : E.penStyle, color: marker ? E.markerColor : E.color, size: curSizeWorld(marker ? 'marker' : 'pen'), pts: [] };
  E.drag = { mode: 'stroke', id: e.pointerId, lastP: p, lastT: e.timeStamp, pv: 0.7, pen: e.pointerType === 'pen' };
  addPoint(e);
}
function addPoint(ev) {
  const d = E.drag, p = pos(ev), w = toWorld(p), P = E.cur.pts;
  let pr;
  if (d.pen && ev.pressure > 0) pr = ev.pressure;
  else {
    const dist = Math.hypot(p.x - d.lastP.x, p.y - d.lastP.y), dt = Math.max(1, ev.timeStamp - d.lastT);
    const target = clamp(1.2 - (dist / dt) * 0.55, 0.15, 1);
    d.pv = P.length ? d.pv * 0.7 + target * 0.3 : 0.75; pr = d.pv;
  }
  if (P.length) {
    const l = P[P.length - 1];
    if (Math.hypot(w.x - l[0], w.y - l[1]) * E.view.s < 1.2) return;
    const k = d.pen ? 0.75 : 0.55; w.x = l[0] + (w.x - l[0]) * k; w.y = l[1] + (w.y - l[1]) * k;
  }
  P.push([r1(w.x), r1(w.y), Math.round(pr * 100) / 100]);
  d.lastP = p; d.lastT = ev.timeStamp;
}

/* ---- Tẩy ---- */
function eraseSeg(a, b) {
  const r = curSizeWorld('eraser') / 2, dist = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(dist / (r * 0.5)));
  for (let i = 1; i <= n; i++) eraseAt({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n });
}
function eraseAt(pt) {
  const r = curSizeWorld('eraser') / 2; let changed = false; const out = [];
  for (const it of E.items) {
    const bb = bbox(it);
    if (pt.x < bb.x - r || pt.x > bb.x + bb.w + r || pt.y < bb.y - r || pt.y > bb.y + bb.h + r || it.type === 'image') { out.push(it); continue; }
    if (it.type === 'stroke') {
      const rr = r + it.size * 0.35;
      if (!polyHit(it.pts, pt.x, pt.y, rr)) { out.push(it); continue; }
      changed = true;
      if (E.eraserMode === 'stroke') continue;
      splitRuns(densify(it.pts, Math.max(0.5, r / 3)), q => Math.hypot(q[0] - pt.x, q[1] - pt.y) <= rr).forEach(run => out.push({ ...it, pts: run }));
    } else if (hitItem(it, pt.x, pt.y, r)) changed = true;
    else out.push(it);
  }
  if (changed) { E.items = out; E.drag.changed = true; }
}

/* ---- Khoanh vùng ---- */
function lassoDown(e, p, w) {
  if (E.sel.size) {
    const b = selBounds(), pd = 6 / E.view.s, hs = toScreen(b.x + b.w + pd, b.y + b.h + pd);
    const inside = w.x >= b.x - pd && w.x <= b.x + b.w + pd && w.y >= b.y - pd && w.y <= b.y + b.h + pd;
    const onHandle = Math.hypot(p.x - hs.x, p.y - hs.y) < 14;
    if (onHandle || inside) {
      pushUndo(); E.items = E.items.slice();
      const idx = []; E.items.forEach((it, i) => { if (E.sel.has(it)) idx.push(i); });
      E.drag = { mode: onHandle ? 'scale' : 'move', id: e.pointerId, start: w, idx, orig: idx.map(i => E.items[i]), box: b, moved: false };
      return;
    }
  }
  E.sel.clear();
  E.drag = { mode: 'lasso', id: e.pointerId, pts: [[w.x, w.y]] };
  requestRender();
}
function lassoUp(d) {
  const poly = d.pts, b = unionBounds([{ type: 'stroke', size: 0, pts: poly.map(q => [q[0], q[1], 0]) }]);
  if (!b || (b.w * E.view.s < 6 && b.h * E.view.s < 6)) {
    const [x, y] = poly[0];
    const rev = [...E.items].reverse(), tol = 6 / E.view.s;
    const hit = rev.find(it => it.type !== 'image' && hitItem(it, x, y, tol)) || rev.find(it => it.type === 'image' && hitItem(it, x, y, tol));
    if (hit) E.sel = new Set([hit]);
    requestRender(); return;
  }
  if (E.lassoMode === 'select') {
    const inside = it => {
      if (it.type === 'stroke') { let c = 0; for (const q of it.pts) if (pointInPoly(q[0], q[1], poly)) c++; return c >= it.pts.length * 0.5; }
      const bb = bbox(it); return pointInPoly(bb.x + bb.w / 2, bb.y + bb.h / 2, poly);
    };
    E.sel = new Set(E.items.filter(inside));
    if (!E.sel.size) toast(t('Không có nét nào trong vùng khoanh'));
  } else {
    let changed = false; const out = [];
    for (const it of E.items) {
      const bb = bbox(it);
      if (bb.x + bb.w < b.x || bb.x > b.x + b.w || bb.y + bb.h < b.y || bb.y > b.y + b.h) { out.push(it); continue; }
      if (it.type === 'stroke') {
        const dense = densify(it.pts, Math.max(0.5, 2 / E.view.s));
        const runs = splitRuns(dense, q => pointInPoly(q[0], q[1], poly));
        if (runs.reduce((a, r) => a + r.length, 0) === dense.length) { out.push(it); continue; }
        changed = true; runs.forEach(run => out.push({ ...it, pts: run }));
      } else if (pointInPoly(bb.x + bb.w / 2, bb.y + bb.h / 2, poly)) changed = true;
      else out.push(it);
    }
    if (changed) commitItems(out);
  }
  requestRender(true);
}

/* ---- Vùng chọn ---- */
function deleteSelection() { if (!E.sel.size) return; commitItems(E.items.filter(i => !E.sel.has(i))); E.sel.clear(); }
function duplicateSelection() {
  if (!E.sel.size) return; const off = 24 / E.view.s;
  const copies = E.items.filter(i => E.sel.has(i)).map(i => translateItem(i, off, off));
  commitItems([...E.items, ...copies]); E.sel = new Set(copies);
}
function recolorSelection() {
  if (!E.sel.size) return; const next = [];
  const items = E.items.map(it => {
    if (!E.sel.has(it)) return it;
    if (it.type === 'image') { next.push(it); return it; }
    const n = { ...it, color: it.tool === 'marker' ? E.markerColor : E.color }; next.push(n); return n;
  });
  commitItems(items); E.sel = new Set(next);
}
function reorderSelection(front) {
  if (!E.sel.size) return; const sel = E.items.filter(i => E.sel.has(i)), rest = E.items.filter(i => !E.sel.has(i));
  commitItems(front ? [...rest, ...sel] : [...sel, ...rest]);
}
function selectAll() { setTool('lasso'); E.sel = new Set(E.items); requestRender(); }
const selbar = $('#selbar');
function renderSelbar() {
  selbar.innerHTML = `
    <button class="icon-btn danger" data-s="del" title="${t('Xoá (Delete)')}">${ic('trash', 18)}</button>
    <button class="icon-btn" data-s="dup" title="${t('Nhân bản (Ctrl+D)')}">${ic('copy', 18)}</button>
    <button class="icon-btn" data-s="color" title="${t('Đổi sang màu đang chọn')}"><span class="cdot" style="background:${inkColor(E.color)}"></span></button>
    <button class="icon-btn" data-s="front" title="${t('Đưa lên trên')}">${ic('up', 18)}</button>
    <button class="icon-btn" data-s="back" title="${t('Đưa xuống dưới')}">${ic('down', 18)}</button>`;
}
selbar.addEventListener('click', e => {
  const b = e.target.closest('[data-s]'); if (!b) return;
  ({ del: deleteSelection, dup: duplicateSelection, color: recolorSelection, front: () => reorderSelection(true), back: () => reorderSelection(false) })[b.dataset.s]();
});
function updateSelBar() {
  if (!E.sel.size || E.drag) { selbar.classList.add('hidden'); return; }
  const b = selBounds(); if (!b) { selbar.classList.add('hidden'); return; }
  selbar.classList.remove('hidden');
  const tl = toScreen(b.x, b.y), br = toScreen(b.x + b.w, b.y + b.h), w = selbar.offsetWidth || 180;
  let top = tl.y - 58; if (top < 8) top = Math.min(br.y + 16, H - 60);
  selbar.style.left = clamp((tl.x + br.x) / 2 - w / 2, 8, W - w - 8) + 'px'; selbar.style.top = top + 'px';
}

/* ---- Chữ ---- */
let textEl = null;
function startTextEdit(item, w) {
  commitTextEdit();
  const fs = item ? item.fs : curSizeWorld('text');
  const x = item ? item.x : w.x, y = item ? item.y : w.y - fs * 0.6, color = item ? item.color : E.color;
  E.editing = item; requestRender(true);
  const ta = document.createElement('textarea'); ta.className = 'text-editor';
  ta.value = item ? item.text : ''; ta.style.color = inkColor(color); ta.spellcheck = false;
  const place = () => {
    const sp = toScreen(x, y), px = fs * E.view.s;
    ta.style.left = sp.x - 3 + 'px'; ta.style.top = sp.y - 3 + 'px'; ta.style.fontSize = px + 'px'; ta.style.padding = '2px';
    ta.style.height = 'auto'; ta.style.width = 'auto';
    ta.style.height = ta.scrollHeight + 4 + 'px'; ta.style.width = Math.max(60, ta.scrollWidth + px) + 'px';
  };
  ta.addEventListener('input', place);
  ta.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Escape' || (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey))) { ev.preventDefault(); commitTextEdit(); } });
  ta.addEventListener('blur', () => setTimeout(commitTextEdit, 0));
  wrap.append(ta); textEl = { ta, item, x, y, fs, color }; place();
  const focus = () => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); };
  focus(); setTimeout(focus, 0);
}
function commitTextEdit() {
  if (!textEl) return; const { ta, item, x, y, fs, color } = textEl; textEl = null;
  const text = ta.value.replace(/\s+$/, ''); ta.remove(); E.editing = null;
  if (item) {
    if (!text) commitItems(E.items.filter(i => i !== item));
    else if (text !== item.text) commitItems(E.items.map(i => i === item ? { ...item, text } : i));
  } else if (text) commitItems([...E.items, { type: 'text', x: r1(x), y: r1(y), fs, color, text }]);
  requestRender(true);
}

/* =====================================================================
   Chèn ảnh / PDF / bản quét
   ===================================================================== */
// Làm rõ như bản quét: chuyển xám, kéo giãn độ tương phản, làm trắng nền giấy
function scanEnhance(canvas) {
  const g = canvas.getContext('2d'), { width: w, height: h } = canvas;
  const img = g.getImageData(0, 0, w, h), d = img.data, n = w * h;
  const L = new Uint8ClampedArray(n), hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < n; i++, j += 4) { const v = (d[j] * 0.299 + d[j + 1] * 0.587 + d[j + 2] * 0.114) | 0; L[i] = v; hist[v]++; }
  const pct = p => { let acc = 0; const target = n * p; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= target) return v; } return 255; };
  const lo = pct(0.01), hi = Math.max(lo + 30, pct(0.55));
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) { let x = (v - lo) / (hi - lo); x = clamp(x, 0, 1); x = Math.pow(x, 1.6); lut[v] = x > 0.93 ? 255 : Math.round(x * 255); }
  for (let i = 0, j = 0; i < n; i++, j += 4) { const v = lut[L[i]]; d[j] = d[j + 1] = d[j + 2] = v; d[j + 3] = 255; }
  g.putImageData(img, 0, 0);
  return canvas;
}
// Bản quét cho bảng xuất PDF: giữ chữ sạch, nền trắng tinh
function scanFlatten(canvas) {
  const g = canvas.getContext('2d'), img = g.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
  for (let j = 0; j < d.length; j += 4) {
    const v = d[j] * 0.299 + d[j + 1] * 0.587 + d[j + 2] * 0.114;
    let x = clamp((v - 35) / (215 - 35), 0, 1); x = Math.pow(x, 1.25);
    const o = x > 0.9 ? 255 : Math.round(x * 255); d[j] = d[j + 1] = d[j + 2] = o;
  }
  g.putImageData(img, 0, 0); return canvas;
}
async function prepareImageSrc(blob, scan) {
  const src = await blobToDataURL(blob), img = await loadImg(src);
  const max = scan ? 2000 : 2400, big = Math.max(img.naturalWidth, img.naturalHeight);
  if (!scan && big <= max && blob.size < 2.5e6) return { src, w: img.naturalWidth, h: img.naturalHeight };
  const k = Math.min(1, max / big), c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const g = c.getContext('2d'), png = blob.type === 'image/png' && !scan;
  if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
  g.drawImage(img, 0, 0, c.width, c.height);
  if (scan) scanEnhance(c);
  return { src: c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.88), w: c.width, h: c.height };
}
const viewportWorld = () => ({ x: -E.view.x / E.view.s, y: -E.view.y / E.view.s, w: W / E.view.s, h: H / E.view.s });
function placeItems(items) {
  commitItems([...E.items, ...items]); setTool('lasso'); E.sel = new Set(items); requestRender(true);
  toast(t('Kéo để di chuyển · kéo ô vuông ở góc để phóng to/thu nhỏ'));
}
async function insertImageBlob(blob, scan) {
  try {
    const { src, w, h } = await prepareImageSrc(blob, scan), v = viewportWorld();
    const k = Math.min((v.w * 0.6) / w, (v.h * 0.7) / h, 1.5 / E.view.s), iw = w * k, ih = h * k;
    placeItems([{ type: 'image', x: r1(v.x + (v.w - iw) / 2), y: r1(v.y + (v.h - ih) / 2), w: r1(iw), h: r1(ih), src }]);
  } catch (err) { toast(t('Không đọc được ảnh này'), true); }
}
async function loadPdfJs() {
  if (window.pdfjsLib) return;
  let dir = 'vendor/';
  try { await loadScript(dir + 'pdf.min.js'); } catch (e) { dir = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/'; await loadScript(dir + 'pdf.min.js'); }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = dir + 'pdf.worker.min.js';
}
async function insertPdfBlob(blob, scan) {
  try {
    toast(t('Đang mở PDF…'));
    await loadPdfJs();
    const pdf = await window.pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
    let from = 1, to = pdf.numPages;
    if (pdf.numPages > 1) {
      const r = await formBox(t('Chèn PDF lên bảng'), [
        { name: 'from', label: t('Từ trang'), type: 'number', value: 1, min: 1, max: pdf.numPages },
        { name: 'to', label: t('Đến trang (tổng {n} trang)', { n: pdf.numPages }), type: 'number', value: Math.min(pdf.numPages, 20), min: 1, max: pdf.numPages },
      ], t('Chèn'), `<p class="muted">${t('Mỗi trang sẽ thành một ảnh trên bảng, xếp từ trên xuống. Bạn có thể viết đè lên.')}</p>`, true);
      if (!r) return;
      from = clamp(parseInt(r.from) || 1, 1, pdf.numPages); to = clamp(parseInt(r.to) || from, from, pdf.numPages);
    }
    const v = viewportWorld(), pageW = Math.min(900, W * 0.72) / E.view.s;
    let y = v.y + 40 / E.view.s; const x = v.x + (v.w - pageW) / 2, items = [];
    for (let i = from; i <= to; i++) {
      const page = await pdf.getPage(i), vp1 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min(2.4, 1700 / vp1.width) });
      const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: g, viewport: vp }).promise;
      if (scan) scanEnhance(c);
      const h = pageW * vp1.height / vp1.width;
      items.push({ type: 'image', x: r1(x), y: r1(y), w: r1(pageW), h: r1(h), src: c.toDataURL('image/jpeg', scan ? 0.8 : 0.86) });
      y += h + 28 / E.view.s;
      if (to - from > 2) toast(t('Đang xử lý trang {i}/{n}…', { i, n: to }));
    }
    placeItems(items);
  } catch (err) { console.error(err); toast(t('Không mở được tệp PDF này'), true); }
}
async function insertBlob(blob, name = '', scan = false) {
  const ty = blob.type || '';
  if (ty.startsWith('image/')) return insertImageBlob(blob, scan);
  if (ty === 'application/pdf' || /\.pdf$/i.test(name)) return insertPdfBlob(blob, scan);
  toast(t('Chỉ đưa được ảnh hoặc PDF lên bảng. Với Word/PowerPoint, hãy lưu sang PDF trước.'), true);
}
function insertMenu(anchor) {
  popMenu(anchor, [
    { icon: 'image', label: t('Ảnh hoặc PDF'), sub: t('Chèn nguyên bản, giữ màu'), onClick: () => $('#fileInsert').click() },
    { icon: 'scan', label: t('Bản quét (làm rõ chữ)'), sub: t('Làm trắng nền giấy, chữ đen rõ — hợp ảnh chụp, PDF scan'), onClick: () => $('#fileScan').click() },
    { icon: 'camera', label: t('Chụp tài liệu bằng camera'), sub: t('Điện thoại / iPad: chụp phiếu bài tập rồi tự làm rõ'), onClick: () => $('#fileCamera').click() },
  ]);
}

/* =====================================================================
   Xuất PNG / PDF
   ===================================================================== */
function makeThumb() {
  const b = unionBounds(E.items); if (!b) return null;
  const c = document.createElement('canvas'); c.width = 192; c.height = 132;
  drawScene(c.getContext('2d'), 192, 132, fitView(b, 192, 132, 8, 1), 1, { theme: 'light' });
  return c.toDataURL('image/jpeg', 0.72);
}
function renderBoardPNG() {
  const b = unionBounds(E.items); if (!b) return null;
  const m = 40, w = b.w + 2 * m, h = b.h + 2 * m, k = Math.min(2, 8000 / w, 8000 / h);
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  drawScene(c.getContext('2d'), w, h, { s: 1, x: -b.x + m, y: -b.y + m }, k, { theme: 'light' });
  return new Promise(res => c.toBlob(res, 'image/png'));
}
// Trình tạo PDF tối giản: mỗi trang là một ảnh JPEG
function buildPDF(pages) {
  const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
  const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (id, ...chunks) => { offs[id] = len; push(`${id} 0 obj\n`); chunks.forEach(push); push('\nendobj\n'); };
  push('%PDF-1.4\n%âãÏÓ\n');
  const n = pages.length, kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
  pages.forEach((p, i) => {
    const pid = 3 + i * 3, cid = pid + 1, iid = pid + 2;
    const content = `q ${p.dw.toFixed(2)} 0 0 ${p.dh.toFixed(2)} ${p.dx.toFixed(2)} ${p.dy.toFixed(2)} cm /Im0 Do Q`;
    obj(pid, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.pw} ${p.ph}] /Resources << /XObject << /Im0 ${iid} 0 R >> >> /Contents ${cid} 0 R >>`);
    obj(cid, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    obj(iid, `<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`, p.jpeg, '\nendstream');
  });
  const count = 3 + n * 3, xref = len;
  let x = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let i = 1; i < count; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
  push(x + `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}
const canvasJPEG = (c, q) => new Promise(res => c.toBlob(async b => res(new Uint8Array(await b.arrayBuffer())), 'image/jpeg', q));
async function exportPdfDialog() {
  if (!unionBounds(E.items)) return toast(t('Bảng đang trống'));
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field"><label>${t('Kiểu PDF')}</label><div class="radio-cards">
      <label><input type="radio" name="mode" value="color" checked><b>${t('Màu')}</b><span>${t('Giữ nguyên màu như trên bảng')}</span></label>
      <label><input type="radio" name="mode" value="scan"><b>${t('Bản quét')}</b><span>${t('Đen trắng, nền trắng — nhẹ, in rõ')}</span></label>
    </div></div>
    <div class="row2">
      <div class="field"><label>${t('Khổ giấy')}</label><select name="orient"><option value="auto">${t('Tự động')}</option><option value="p">${t('A4 dọc')}</option><option value="l">${t('A4 ngang')}</option></select></div>
      <div class="field"><label>${t('Chia trang')}</label><select name="layout"><option value="fit" selected>${t('Gộp vừa 1 trang')}</option><option value="split">${t('Chia thành nhiều trang A4')}</option></select></div>
    </div>
    <label class="check"><input type="checkbox" name="bg"> ${t('In kèm nền ô/kẻ')}</label>
    <label class="check"><input type="checkbox" name="header" checked> ${t('Thêm tiêu đề (tên bảng, học sinh, ngày, giáo viên)')}</label>`;
  openModal({
    title: t('Tải PDF'), body, width: 480, actions: [{ label: t('Huỷ') }, {
      label: t('Tạo PDF'), kind: 'primary', onClick: () => {
        const o = { mode: $('[name=mode]:checked', body).value, orient: $('[name=orient]', body).value, layout: $('[name=layout]', body).value, bg: $('[name=bg]', body).checked, header: $('[name=header]', body).checked };
        setTimeout(() => exportPdf(o), 50);
      }
    }]
  });
}
async function exportPdf(o) {
  const b0 = unionBounds(E.items); if (!b0) return;
  toast(t('Đang tạo PDF…'));
  const board = S.boards.find(x => x.id === S.boardId), m = 24;
  const b = { x: b0.x - m, y: b0.y - m, w: b0.w + 2 * m, h: b0.h + 2 * m };
  const land = o.orient === 'l' || (o.orient === 'auto' && b.w > b.h * 1.15);
  const PW = land ? 842 : 595, PH = land ? 595 : 842, M = 28, cw = PW - 2 * M, chPage = PH - 2 * M;
  const headH = o.header ? b.w * 0.075 : 0; // chiều cao tiêu đề (đơn vị thế giới)
  const totalH = headH + b.h;
  const pxW = 1650 * (cw / 535);
  const k = Math.min(pxW / b.w, 16000 / totalH);
  const full = document.createElement('canvas'); full.width = Math.round(b.w * k); full.height = Math.round(totalH * k);
  const g = full.getContext('2d');
  drawScene(g, b.w, totalH, { s: 1, x: -b.x, y: -b.y + headH }, k, { theme: 'light', bg: o.bg ? E.bg : false });
  if (o.header) {
    g.setTransform(k, 0, 0, k, 0, 0); g.fillStyle = THEMES.light.paper; g.fillRect(0, 0, b.w, headH);
    const fs = headH * 0.36, prof = S.settings.profile || {};
    g.fillStyle = '#3B332B'; g.font = `600 ${fs}px "Be Vietnam Pro", system-ui, sans-serif`; g.textBaseline = 'top';
    g.fillText(board ? board.title : 'Vincenink', m, headH * 0.12);
    const sub = [ownerName(board?.studentId || 'all'), board ? fmtDateLong(board.date) : '', prof.name ? t('Giáo viên: {n}', { n: prof.name }) : ''].filter(Boolean).join('  ·  ');
    g.fillStyle = '#8A7D6D'; g.font = `${fs * 0.62}px "Be Vietnam Pro", system-ui, sans-serif`; g.fillText(sub, m, headH * 0.58);
    g.strokeStyle = '#E2D6C3'; g.lineWidth = Math.max(1, headH * 0.02); g.beginPath(); g.moveTo(m, headH * 0.97); g.lineTo(b.w - m, headH * 0.97); g.stroke();
  }
  if (o.mode === 'scan') scanFlatten(full);
  const pages = [];
  if (o.layout === 'fit') {
    const s = Math.min(cw / full.width, chPage / full.height), dw = full.width * s, dh = full.height * s;
    pages.push({ jpeg: await canvasJPEG(full, o.mode === 'scan' ? 0.82 : 0.9), w: full.width, h: full.height, pw: PW, ph: PH, dw, dh, dx: (PW - dw) / 2, dy: PH - M - dh });
  } else {
    const sliceH = Math.floor(full.width * chPage / cw);
    for (let y = 0; y < full.height; y += sliceH) {
      const h = Math.min(sliceH, full.height - y); if (h < 4) break;
      const c = document.createElement('canvas'); c.width = full.width; c.height = h;
      c.getContext('2d').drawImage(full, 0, y, full.width, h, 0, 0, full.width, h);
      const s = cw / full.width, dh = h * s;
      pages.push({ jpeg: await canvasJPEG(c, o.mode === 'scan' ? 0.82 : 0.9), w: c.width, h, pw: PW, ph: PH, dw: cw, dh, dx: M, dy: PH - M - dh });
    }
  }
  download(buildPDF(pages), safeName(board ? `${board.date} - ${board.title}` : 'vincenink') + (o.mode === 'scan' ? ' (scan)' : '') + '.pdf');
  toast(t('Đã tải PDF ({n} trang)', { n: pages.length }));
}

/* =====================================================================
   Thanh công cụ & thuộc tính
   ===================================================================== */
function renderToolbar() {
  $('#toolbar').innerHTML = TOOLS.map(([id, icon, label]) => `<button class="tool ${E.tool === id ? 'active' : ''}" data-tool="${id}" title="${t(label)}" aria-label="${t(label)}">${ic(icon, 21)}${id === 'pen' || id === 'marker' ? '<span class="swatch-mini"></span>' : ''}</button>`).join('')
    + `<span class="tsep"></span>
       <button class="tool" data-act="undo" title="${t('Hoàn tác (Ctrl+Z)')}">${ic('undo', 21)}</button>
       <button class="tool" data-act="redo" title="${t('Làm lại (Ctrl+Shift+Z)')}">${ic('redo', 21)}</button>
       <span class="tsep"></span>
       <button class="tool" data-act="insert" title="${t('Chèn ảnh / PDF / bản quét (I)')}">${ic('image', 21)}</button>
       <button class="tool" data-act="clear" title="${t('Xoá sạch bảng')}">${ic('wipe', 21)}</button>`;
  $('#zoombar').innerHTML = `
    <button class="icon-btn sm" data-z="out" title="${t('Thu nhỏ (−)')}">${ic('minus', 17)}</button>
    <button class="zl" data-z="reset" title="${t('Về 100% (0)')}">${Math.round(E.view.s * 100)}%</button>
    <button class="icon-btn sm" data-z="in" title="${t('Phóng to (+)')}">${ic('plus', 17)}</button>
    <button class="icon-btn sm" data-z="fit" title="${t('Xem toàn bộ nội dung')}">${ic('fit', 17)}</button>`;
  updateUndoBtns(); paintMiniSwatches();
}
$('#toolbar').addEventListener('click', e => {
  const tb = e.target.closest('[data-tool]'); if (tb) return setTool(tb.dataset.tool);
  const a = e.target.closest('[data-act]'); if (!a) return;
  ({ undo, redo, insert: () => insertMenu(a), clear: clearBoard })[a.dataset.act]();
});
$('#zoombar').addEventListener('click', e => {
  const z = e.target.closest('[data-z]')?.dataset.z; if (!z) return;
  if (z === 'in') zoomAt(W / 2, H / 2, 1.25); else if (z === 'out') zoomAt(W / 2, H / 2, 0.8);
  else if (z === 'reset') zoomAt(W / 2, H / 2, 1 / E.view.s); else fitContent();
});
async function clearBoard() {
  if (!E.items.length) return;
  if (await confirmBox(t('Xoá sạch bảng?'), t('Mọi nét vẽ, chữ và tài liệu trên bảng này sẽ bị xoá. Bạn vẫn có thể bấm Hoàn tác (Ctrl+Z) ngay sau đó.'), t('Xoá sạch'))) { commitItems([]); E.sel.clear(); }
}
function setTool(tool) {
  commitTextEdit();
  if (tool !== 'lasso') E.sel.clear();
  E.tool = tool; savePrefs();
  $$('#toolbar [data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  cv.className = 't-' + tool; updateCursor(); renderProps(); requestRender();
}
function paintMiniSwatches() { $$('.tool .swatch-mini').forEach(s => { s.style.background = s.parentElement.dataset.tool === 'marker' ? E.markerColor : inkColor(E.color); }); }
function swatchesHTML(list, cur, key) {
  const custom = !list.includes(cur), show = c => key === 'color' ? inkColor(c) : c;
  return `<div class="swatches">${list.map(c => `<button class="sw ${c === cur ? 'active' : ''}" style="background:${show(c)}" data-color="${c}" data-key="${key}" aria-label="${c}"></button>`).join('')}
    <label class="sw custom ${custom ? 'active' : ''}" title="${t('Màu tuỳ chọn')}" ${custom ? `style="background:${cur}"` : ''}><input type="color" value="${cur}" data-key="${key}"></label></div>`;
}
function sizeHTML(kind) {
  const [mn, mx] = SIZE_RANGE[kind], v = E.sizes[kind], d = clamp(v, 2, 28);
  const col = kind === 'eraser' ? 'var(--line-strong)' : (kind === 'marker' ? E.markerColor : inkColor(E.color));
  return `<div class="size-ctl" title="${t('Độ dày ( [ và ] )')}">
    ${kind === 'text' ? `<span class="prop-hint">${t('Cỡ chữ')}</span>` : `<span class="prev"><span style="width:${d}px;height:${d}px;background:${col}"></span></span>`}
    <input type="range" min="${mn}" max="${mx}" value="${v}" data-size="${kind}"><span class="val">${v}</span></div>`;
}
const segHTML = (key, opts, cur, icons) => `<div class="seg ${icons ? 'icons' : ''}">${opts.map(([v, l, i]) => `<button data-seg="${key}" data-v="${v}" class="${v === cur ? 'active' : ''}" title="${t(l)}">${i ? ic(i, 18) : ''}${icons ? '' : t(l)}</button>`).join('')}</div>`;
function renderProps() {
  const sep = '<span class="psep"></span>'; let h = '';
  switch (E.tool) {
    case 'pen': h = swatchesHTML(COLORS, E.color, 'color') + sep + sizeHTML('pen') + sep + segHTML('penStyle', [['ink', 'Thanh đậm'], ['even', 'Nét đều']], E.penStyle); break;
    case 'marker': h = swatchesHTML(MARKERS, E.markerColor, 'markerColor') + sep + sizeHTML('marker'); break;
    case 'eraser': h = segHTML('eraserMode', [['part', 'Tẩy từng phần'], ['stroke', 'Tẩy cả nét']], E.eraserMode) + sep + sizeHTML('eraser'); break;
    case 'lasso': h = segHTML('lassoMode', [['select', 'Khoanh để chọn'], ['erase', 'Khoanh để xoá']], E.lassoMode) + `<span class="prop-hint">${t(E.lassoMode === 'erase' ? 'Vẽ vòng quanh phần muốn xoá' : 'Khoanh rồi kéo để di chuyển · bấm vào ảnh để chọn')}</span>`; break;
    case 'shape': h = segHTML('shape', [['line', 'Đường thẳng', 's_line'], ['arrow', 'Mũi tên', 's_arrow'], ['rect', 'Hình chữ nhật', 's_rect'], ['ellipse', 'Hình tròn/elip', 's_ellipse'], ['triangle', 'Tam giác', 's_triangle']], E.shape, true) + sep + swatchesHTML(COLORS, E.color, 'color') + sep + sizeHTML('shape'); break;
    case 'text': h = swatchesHTML(COLORS, E.color, 'color') + sep + sizeHTML('text') + `<span class="prop-hint">${t('Bấm vào bảng để gõ · nhấp đúp chữ để sửa')}</span>`; break;
    case 'laser': h = `<span class="prop-hint">${t('Bút laser để chỉ cho học sinh — nét tự biến mất sau 1 giây')}</span>`; break;
    case 'hand': h = `<span class="prop-hint">${t('Kéo để di chuyển bảng · Ctrl + cuộn (hoặc chụm 2 ngón) để phóng to')}</span>`; break;
  }
  $('#props').innerHTML = h; paintMiniSwatches(); renderSelbar(); updateCursor();
}
$('#props').addEventListener('click', e => {
  const sw = e.target.closest('[data-color]'); if (sw) { E[sw.dataset.key] = sw.dataset.color; savePrefs(); renderProps(); return; }
  const sg = e.target.closest('[data-seg]'); if (sg) { E[sg.dataset.seg] = sg.dataset.v; savePrefs(); renderProps(); }
});
$('#props').addEventListener('input', e => {
  const el = e.target; if (!el.dataset.size) return;
  E.sizes[el.dataset.size] = +el.value; el.nextElementSibling.textContent = el.value;
  const pv = el.parentElement.querySelector('.prev span'); if (pv) { const d = clamp(+el.value, 2, 28); pv.style.width = pv.style.height = d + 'px'; }
  savePrefs(); requestRender();
});
$('#props').addEventListener('change', e => { const el = e.target; if (el.type === 'color') { E[el.dataset.key] = el.value; savePrefs(); renderProps(); } });

/* =====================================================================
   Lưu tự động
   ===================================================================== */
let saveTimer = null, contentDirty = false, viewDirty = false;
function scheduleSave(content) {
  if (!S.boardId) return;
  if (content) { contentDirty = true; setStatus(true); } else viewDirty = true;
  clearTimeout(saveTimer); saveTimer = setTimeout(doSave, content ? 700 : 1200);
}
async function doSave() {
  clearTimeout(saveTimer);
  if (!S.boardId || (!contentDirty && !viewDirty)) return;
  const id = S.boardId, content = contentDirty; contentDirty = viewDirty = false;
  try {
    await DB.put('boardData', { id, items: E.items, bg: E.bg, view: E.view });
    if (content) {
      const b = S.boards.find(x => x.id === id);
      if (b) {
        b.updatedAt = Date.now(); b.thumb = makeThumb(); await DB.put('boards', b);
        const card = $(`.board-card[data-board="${id}"]`);
        if (card) { $('.thumb', card).innerHTML = b.thumb ? `<img src="${b.thumb}" alt="">` : ''; $('.s', card).textContent = t('Sửa lúc {t}', { t: fmtTime(b.updatedAt) }); }
      }
    }
    setStatus(false);
  } catch (err) { console.error(err); toast(t('Không lưu được — bộ nhớ trình duyệt có thể đã đầy'), true); }
}
let saving = false;
function setStatus(sv) {
  saving = sv; const s = $('#saveStatus'); s.classList.toggle('saving', sv);
  s.innerHTML = `<span class="d"></span><span class="txt">${t(sv ? 'Đang lưu…' : 'Đã lưu')}</span>`;
}
document.addEventListener('visibilitychange', () => { if (document.hidden) doSave(); updateTitle(); });
window.addEventListener('beforeunload', () => { doSave(); });

/* =====================================================================
   Tiêu đề tab trình duyệt
   ===================================================================== */
function updateTitle() {
  if (document.hidden) { document.title = t('✏️ Bài giảng đang chờ bạn…') + ' | Vincenink'; return; }
  if (!$('#welcome').classList.contains('hidden')) { document.title = `Vincenink – ${t('Bảng trắng dạy học trực tuyến')}`; return; }
  const b = S.boards.find(x => x.id === S.boardId);
  document.title = b ? `${b.title} · ${ownerName(b.studentId)} | Vincenink` : `Vincenink – ${t('Bảng trắng dạy học trực tuyến')}`;
}

/* =====================================================================
   Học sinh & bảng
   ===================================================================== */
async function createBoard(studentId, open = true, date = todayStr(), title) {
  const n = S.boards.filter(b => b.studentId === studentId && b.date === date).length;
  const b = { id: uid(), studentId, title: title || (t('Buổi học {d}', { d: shortDate(date) }) + (n ? ` (${n + 1})` : '')), date, createdAt: Date.now(), updatedAt: Date.now(), thumb: null };
  await DB.put('boards', b); await DB.put('boardData', { id: b.id, items: [], bg: E.bg || 'grid', view: { x: 0, y: 0, s: 1 } });
  S.boards.push(b);
  if (open) await openBoard(b.id);
  renderSidebar(); renderPanel();
  return b;
}
async function openBoard(id) {
  commitTextEdit(); await doSave();
  const b = S.boards.find(x => x.id === id); if (!b) return;
  const data = (await DB.get('boardData', id)) || { items: [], bg: 'grid', view: { x: 0, y: 0, s: 1 } };
  S.boardId = id; E.items = data.items || []; E.bg = data.bg || 'grid'; E.view = data.view || { x: 0, y: 0, s: 1 };
  E.undo = []; E.redo = []; E.sel.clear(); E.cur = null; E.drag = null; bbCache = new WeakMap();
  S.settings.lastBoard = id; S.settings.lastStudent = S.studentId; saveSettings();
  renderTopbar(); updateUndoBtns(); updateZoomLabel(); setStatus(false); requestRender(true);
  $$('.board-card').forEach(c => c.classList.toggle('active', c.dataset.board === id));
}
async function duplicateBoard(id) {
  await doSave();
  const src = S.boards.find(b => b.id === id), data = await DB.get('boardData', id);
  const b = { ...src, id: uid(), title: src.title + t(' (bản sao)'), date: todayStr(), createdAt: Date.now(), updatedAt: Date.now() };
  await DB.put('boards', b); await DB.put('boardData', { ...data, id: b.id });
  S.boards.push(b); await openBoard(b.id); renderPanel(); renderSidebar(); toast(t('Đã nhân bản bảng'));
}
async function deleteBoard(id) {
  const b = S.boards.find(x => x.id === id);
  if (!await confirmBox(t('Xoá bảng này?'), t('“{t}” sẽ bị xoá vĩnh viễn và không thể khôi phục.', { t: esc(b.title) }), t('Xoá'))) return;
  await DB.del('boards', id); await DB.del('boardData', id);
  S.boards = S.boards.filter(x => x.id !== id);
  if (S.boardId === id) {
    S.boardId = null; contentDirty = viewDirty = false;
    const next = boardsOf(S.studentId)[0] || await createBoard(S.studentId, false);
    await openBoard(next.id);
  }
  renderPanel(); renderSidebar();
}
async function editBoardMeta(id) {
  const b = S.boards.find(x => x.id === id);
  const r = await formBox(t('Sửa thông tin bảng'), [
    { name: 'title', label: t('Tên bảng'), value: b.title },
    { name: 'date', label: t('Ngày'), type: 'date', value: b.date },
    { name: 'owner', label: t('Thuộc về'), type: 'select', value: b.studentId, options: [['all', t('Lớp chung')], ...S.students.map(s => [s.id, s.name])] },
  ], t('Lưu'));
  if (!r) return;
  b.title = r.title.trim() || b.title; b.date = r.date || b.date; b.studentId = r.owner;
  await DB.put('boards', b);
  if (S.boardId === id && b.studentId !== S.studentId) S.studentId = b.studentId;
  renderTopbar(); renderPanel(); renderSidebar();
}
const boardsOf = sid => S.boards.filter(b => b.studentId === sid).sort((a, b) => (b.date.localeCompare(a.date)) || (b.updatedAt - a.updatedAt));
const filesOf = sid => S.files.filter(f => f.studentId === sid).sort((a, b) => b.createdAt - a.createdAt);

async function selectStudent(id) {
  S.studentId = id; S.settings.lastStudent = id; saveSettings();
  renderSidebar(); renderPanel();
  const cur = S.boards.find(b => b.id === S.boardId);
  if (!cur || cur.studentId !== id) { const first = boardsOf(id)[0]; if (first) await openBoard(first.id); }
}
function studentModal(st) {
  let color = st?.color || STUDENT_COLORS[S.students.length % STUDENT_COLORS.length];
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field"><label>${t('Tên học sinh')}</label><input type="text" name="name" value="${esc(st?.name || '')}" placeholder="${t('VD: Nguyễn Minh An')}"></div>
    <div class="field"><label>${t('Lớp / ghi chú ngắn (tuỳ chọn)')}</label><input type="text" name="grade" value="${esc(st?.grade || '')}" placeholder="${t('VD: Lớp 5 · Toán, Tiếng Việt')}"></div>
    <div class="field"><label>${t('Màu nhận diện')}</label><div class="color-pick">${STUDENT_COLORS.map(c => `<button type="button" data-c="${c}" class="${c === color ? 'active' : ''}" style="background:${c}"></button>`).join('')}</div></div>`;
  $('.color-pick', body).addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return; color = b.dataset.c;
    $$('.color-pick button', body).forEach(x => x.classList.toggle('active', x === b));
  });
  const actions = [{ label: t('Huỷ') }, {
    label: st ? t('Lưu') : t('Thêm học sinh'), kind: 'primary', onClick: async () => {
      const name = $('[name=name]', body).value.trim(); if (!name) { $('[name=name]', body).focus(); return false; }
      const grade = $('[name=grade]', body).value.trim();
      if (st) { Object.assign(st, { name, grade, color }); await DB.put('students', st); renderSidebar(); renderPanel(); renderTopbar(); }
      else {
        const ns = { id: uid(), name, grade, color, note: '', createdAt: Date.now() };
        await DB.put('students', ns); S.students.push(ns);
        await selectStudent(ns.id); await createBoard(ns.id, true);
        toast(t('Đã thêm {n} và tạo bảng đầu tiên', { n: name }));
      }
    }
  }];
  if (st) actions.unshift({ label: t('Xoá học sinh'), kind: 'danger-text', onClick: () => deleteStudent(st) });
  openModal({ title: st ? t('Sửa học sinh') : t('Thêm học sinh'), body, actions });
}
async function deleteStudent(st) {
  const nb = S.boards.filter(b => b.studentId === st.id).length, nf = S.files.filter(f => f.studentId === st.id).length;
  if (!await confirmBox(t('Xoá học sinh {n}?', { n: esc(st.name) }), t('Sẽ xoá cả {b} bảng, {f} tài liệu và lịch học của học sinh này trên máy.', { b: nb, f: nf }), t('Xoá'))) return false;
  for (const b of S.boards.filter(b => b.studentId === st.id)) { await DB.del('boards', b.id); await DB.del('boardData', b.id); }
  for (const f of S.files.filter(f => f.studentId === st.id)) await DB.del('files', f.id);
  await DB.del('students', st.id); await DB.del('schedule', st.id); S.sched.delete(st.id);
  S.boards = S.boards.filter(b => b.studentId !== st.id); S.files = S.files.filter(f => f.studentId !== st.id); S.students = S.students.filter(s => s.id !== st.id);
  if (!S.boards.find(b => b.id === S.boardId)) { S.boardId = null; contentDirty = viewDirty = false; }
  S.studentId = 'all';
  const next = boardsOf('all')[0] || await createBoard('all', false);
  if (!S.boardId) await openBoard(next.id);
  renderSidebar(); renderPanel(); renderTopbar();
}

/* ---- Thanh bên ---- */
/* ---- Thẻ "Lịch hôm nay" ở thanh bên ---- */
function renderTodayCard() {
  const el = $('#todayCard'); if (!el) return;
  const now = new Date(), ds = dstr(now), hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const day = weekOccurrences('all', weekStart(now)).find(d => d.date === ds);
  const list = day ? day.list : [];
  const label = now.toLocaleDateString(locale(), { weekday: 'long', day: '2-digit', month: '2-digit' });
  el.innerHTML = `
    <div class="tc-h"><span class="tc-ic">${ic('calendar', 15)}</span><div><b>${t('Lịch hôm nay')}</b><small>${esc(label.charAt(0).toUpperCase() + label.slice(1))}</small></div>
      <button class="icon-btn sm" id="tcAdd" title="${t('Ghi lịch học')}">${ic('plus', 16)}</button></div>
    ${list.length ? `<div class="tc-list">${list.map(o => {
      const st = o.off ? 'off' : (hm >= o.start && hm < o.end ? 'now' : (hm >= o.end ? 'done' : ''));
      return `<button class="tc-item ${st}" data-owner="${o.owner}" style="--c:${o.owner === 'all' ? 'var(--accent)' : ownerColor(o.owner)}">
        <span class="tc-time">${o.start}<small>${o.end}</small></span>
        <span class="tc-body"><b>${esc(o.owner === 'all' ? t('Lớp chung') : ownerName(o.owner))}</b><small>${esc(o.subject || t('Buổi học'))}</small></span>
        ${st === 'now' ? `<span class="tc-badge">${t('Đang học')}</span>` : st === 'off' ? `<span class="tc-badge off">${t('Nghỉ')}</span>` : ''}
      </button>`; }).join('')}</div>`
      : `<div class="tc-empty"><svg viewBox="0 0 120 64" aria-hidden="true"><rect x="10" y="8" width="70" height="48" rx="6" fill="var(--paper)" stroke="var(--line-strong)"/><path d="M10 20h70M22 8v48M10 32h70M10 44h70" stroke="var(--line)" /><path d="M30 38c6-10 12-10 16-2s10 6 16-4" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/><g transform="rotate(35 96 26)"><rect x="90" y="4" width="10" height="40" rx="3" fill="var(--accent)"/><path d="M90 44l5 9 5-9z" fill="var(--accent-ink)"/></g></svg>
        <span>${t('Hôm nay không có buổi học nào.')}</span></div>`}`;
  el.onclick = e => {
    if (e.target.closest('#tcAdd')) return sessionModal(S.studentId, null, ds, true);
    const it = e.target.closest('.tc-item'); if (it) { S.tab = 'sched'; S.week = weekStart(now); selectStudent(it.dataset.owner); }
  };
}
setInterval(() => renderTodayCard(), 60000);
function renderSidebar() {
  renderTodayCard();
  const cnt = id => S.boards.filter(b => b.studentId === id).length;
  const students = [...S.students].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  $('#studentNav').innerHTML = `
    <button class="nav-item ${S.studentId === 'all' ? 'active' : ''}" data-student="all" title="${t('Lớp chung')}">${avatarHTML('all')}<span class="name">${t('Lớp chung')}</span></button>
    <div class="side-label"><span>${t('Học sinh · {n}', { n: students.length })}</span><button id="btnAddStudent" class="add-pill" title="${t('Thêm học sinh')}" aria-label="${t('Thêm học sinh')}">${ic('plus', 14)}<em>${t('Thêm')}</em></button></div>
    ${students.map(s => `<button class="nav-item two ${S.studentId === s.id ? 'active' : ''}" data-student="${s.id}" title="${esc(s.name)}">${avatarHTML(s.id)}<span class="name"><span>${esc(s.name)}</span><small>${esc(s.grade || t('{b} bảng', { b: cnt(s.id) }))}</small></span><span class="nav-more" data-smenu="${s.id}" role="button" tabindex="0" title="${t('Tuỳ chọn')}" aria-label="${t('Tuỳ chọn')}">${ic('more', 16)}</span></button>`).join('')
    || `<div class="side-empty">${t('Chưa có học sinh nào.')}<br>${t('Bấm + để thêm — mỗi em sẽ có bảng, tài liệu, lịch học và ghi chú riêng.')}</div>`}`;
}
$('#studentNav').addEventListener('click', e => {
  if (e.target.closest('#btnAddStudent')) return studentModal(null);
  const sm = e.target.closest('[data-smenu]');
  if (sm) { e.stopPropagation(); return studentMenu(sm, sm.dataset.smenu); }
  const it = e.target.closest('[data-student]'); if (it) selectStudent(it.dataset.student);
});

function studentMenu(anchor, id) {
  const st = studentById(id); if (!st) return;
  const openSched = () => { S.tab = 'sched'; S.week = weekStart(new Date()); selectStudent(id); };
  popMenu(anchor, [
    { icon: 'calendar', label: t('Ghi lịch học'), sub: t('Cố định hằng tuần hoặc một buổi'), onClick: async () => { await selectStudent(id); S.tab = 'sched'; renderPanel(); sessionModal(id, null, null); } },
    { icon: 'clock', label: t('Xem lịch học'), onClick: openSched },
    { icon: 'plus', label: t('Bảng mới hôm nay'), onClick: async () => { S.studentId = id; await createBoard(id, true); S.tab = 'boards'; renderPanel(); } },
    { icon: 'edit', label: t('Sửa thông tin học sinh'), onClick: () => studentModal(st) },
    '-',
    { icon: 'trash', label: t('Xoá học sinh'), danger: true, onClick: () => deleteStudent(st) },
  ]);  if (menuAnchor === anchor) anchor.closest('.nav-item').classList.add('menu-open');
}

/* ---- Cột học sinh ---- */
function renderPanel() {
  const sid = S.studentId, st = studentById(sid);
  const nb = S.boards.filter(b => b.studentId === sid).length, nf = S.files.filter(f => f.studentId === sid).length;
  const next = nextLesson(sid);
  $('#panel').innerHTML = `
    <div class="panel-head">${avatarHTML(sid, 'lg')}
      <div class="ttl"><h2>${esc(ownerName(sid))}</h2><div class="sub">${st?.grade ? esc(st.grade) + ' · ' : ''}${t('{b} bảng · {f} tài liệu', { b: nb, f: nf })}</div></div>
      ${st ? `<button class="icon-btn" id="btnEditStudent" title="${t('Sửa thông tin học sinh')}">${ic('edit', 18)}</button>` : ''}
    </div>
    ${next ? `<div class="next-lesson">${ic('clock', 15)}${t('Buổi tới: {x}', { x: esc(next) })}</div>` : ''}
    <div class="tabs" role="tablist">
      ${[['boards', 'board', 'Bảng'], ['files', 'file', 'Tài liệu'], ['sched', 'calendar', 'Lịch'], ['notes', 'note', 'Ghi chú']].map(([k, i, l]) => `<button class="tab ${S.tab === k ? 'active' : ''}" data-tab="${k}" role="tab">${ic(i, 15)}${t(l)}</button>`).join('')}
    </div>
    <div class="panel-body" id="panelBody"></div>
    <div class="resizer" data-resize="panel" title="${t('Kéo để đổi độ rộng · nhấp đúp để về mặc định')}"></div>`;
  const body = $('#panelBody');
  ({ boards: renderBoardsTab, files: renderFilesTab, sched: renderSchedTab, notes: renderNotesTab })[S.tab](body);
}
$('#panel').addEventListener('click', e => {
  const tb = e.target.closest('[data-tab]'); if (tb) { S.tab = tb.dataset.tab; renderPanel(); return; }
  if (e.target.closest('#btnEditStudent')) studentModal(studentById(S.studentId));
});

function renderBoardsTab(body) {
  const q = S.search.trim().toLowerCase();
  const list = boardsOf(S.studentId).filter(b => !q || b.title.toLowerCase().includes(q) || shortDate(b.date).includes(q));
  const groups = {}; list.forEach(b => (groups[b.date] = groups[b.date] || []).push(b));
  const today = todayStr();
  body.innerHTML = `
    <button class="btn primary block" id="btnNewBoard">${ic('plus', 17)}${t('Bảng mới hôm nay')}</button>
    <div class="search" style="margin-top:10px">${ic('search', 16)}<input id="boardSearch" placeholder="${t('Tìm bảng theo tên hoặc ngày…')}" value="${esc(S.search)}"></div>
    ${Object.keys(groups).sort().reverse().map(d => `
      <div class="group-label ${d === today ? 'today' : ''}"><span class="dot"></span>${d === today ? t('Hôm nay · ') : ''}${fmtDateLong(d)}</div>
      ${groups[d].map(b => `
        <div class="board-card ${b.id === S.boardId ? 'active' : ''}" data-board="${b.id}">
          <div class="thumb">${b.thumb ? `<img src="${b.thumb}" alt="">` : ''}</div>
          <div class="meta"><div class="t">${esc(b.title)}</div><div class="s">${t('Sửa lúc {t}', { t: fmtTime(b.updatedAt) })}</div></div>
          <button class="icon-btn sm more" data-bmenu="${b.id}" title="${t('Tuỳ chọn')}">${ic('more', 18)}</button>
        </div>`).join('')}`).join('')
    || `<div class="empty"><div class="big">${t(q ? 'Không tìm thấy bảng' : 'Chưa có bảng nào')}</div>${t(q ? 'Thử từ khoá khác.' : 'Bấm “Bảng mới hôm nay” để bắt đầu buổi học.')}</div>`}`;
  $('#btnNewBoard', body).onclick = () => createBoard(S.studentId, true);
  const si = $('#boardSearch', body);
  si.oninput = () => { S.search = si.value; const p = si.selectionStart; renderBoardsTab(body); const n = $('#boardSearch', body); n.focus(); n.setSelectionRange(p, p); };
  body.onclick = e => {
    const m = e.target.closest('[data-bmenu]');
    if (m) {
      e.stopPropagation(); const id = m.dataset.bmenu;
      popMenu(m, [{ icon: 'edit', label: t('Đổi tên, ngày, chủ sở hữu'), onClick: () => editBoardMeta(id) },
        { icon: 'copy', label: t('Nhân bản (dùng làm mẫu)'), onClick: () => duplicateBoard(id) },
        '-', { icon: 'trash', label: t('Xoá bảng'), danger: true, onClick: () => deleteBoard(id) }]);
      return;
    }
    const c = e.target.closest('[data-board]'); if (!c) return;
    if (c.dataset.board !== S.boardId) openBoard(c.dataset.board);
    if (innerWidth <= 900) $('#app').classList.add('focus');
  };
}

/* ---- Tài liệu ---- */
const FILE_COLORS = { pdf: '#C0574A', img: '#6F93B8', doc: '#4F78B0', xls: '#5E8B5A', ppt: '#C9824B', vid: '#8E7CB0', aud: '#5FA3A0', other: '#A39684' };
function fileKind(f) {
  const ty = f.type || '', n = f.name.toLowerCase();
  if (ty === 'application/pdf' || n.endsWith('.pdf')) return ['pdf', 'PDF'];
  if (ty.startsWith('image/')) return ['img', (n.split('.').pop() || 'IMG').slice(0, 4).toUpperCase()];
  if (/\.(docx?|odt|rtf|txt)$/.test(n)) return ['doc', 'DOC'];
  if (/\.(xlsx?|ods|csv)$/.test(n)) return ['xls', 'XLS'];
  if (/\.(pptx?|odp|key)$/.test(n)) return ['ppt', 'PPT'];
  if (ty.startsWith('video/')) return ['vid', 'VID'];
  if (ty.startsWith('audio/')) return ['aud', 'MP3'];
  return ['other', (n.split('.').pop() || 'FILE').slice(0, 4).toUpperCase()];
}
const canBoard = f => ['pdf', 'img'].includes(fileKind(f)[0]);
function renderFilesTab(body) {
  const list = filesOf(S.studentId);
  body.innerHTML = `
    <label class="dropzone" id="dropzone">${ic('upload', 24)}<b>${t('Tải tài liệu lên')}</b><br>${t('Kéo thả hoặc bấm để chọn tệp')}<br><span style="font-size:12px">${t('Ảnh và PDF có thể đưa thẳng lên bảng')}</span></label>
    ${list.map(f => { const [k, lbl] = fileKind(f); return `
      <div class="file-row" data-file="${f.id}">
        <div class="ficon" style="background:${FILE_COLORS[k]}">${lbl}</div>
        <div class="fmeta"><div class="fname" title="${esc(f.name)}">${esc(f.name)}</div><div class="fsub">${fmtSize(f.size)} · ${fmtDT(f.createdAt)}</div></div>
        <div class="factions">
          ${canBoard(f) ? `<button class="icon-btn sm" data-fact="board" title="${t('Đưa lên bảng')}">${ic('toBoard', 17)}</button>` : ''}
          <button class="icon-btn sm" data-fact="menu" title="${t('Tuỳ chọn')}">${ic('more', 17)}</button>
        </div>
      </div>`; }).join('')
    || `<div class="empty"><div class="big">${t('Chưa có tài liệu')}</div>${t('Đề bài, phiếu bài tập, ảnh chụp vở… của {n} sẽ được lưu ở đây.', { n: esc(ownerName(S.studentId)) })}</div>`}`;
  const dz = $('#dropzone', body);
  dz.onclick = e => { e.preventDefault(); $('#fileUpload').click(); };
  dz.ondragover = e => { e.preventDefault(); e.stopPropagation(); dz.classList.add('over'); };
  dz.ondragleave = () => dz.classList.remove('over');
  dz.ondrop = e => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('over'); addFiles([...e.dataTransfer.files]); };
  body.onclick = e => {
    const row = e.target.closest('[data-file]'), a = e.target.closest('[data-fact]'); if (!row || !a) return;
    const f = S.files.find(x => x.id === row.dataset.file);
    if (a.dataset.fact === 'board') return insertBlob(f.blob, f.name);
    popMenu(a, [
      ...(canBoard(f) ? [{ icon: 'toBoard', label: t('Đưa lên bảng'), onClick: () => insertBlob(f.blob, f.name) },
        { icon: 'scan', label: t('Đưa lên bảng (bản quét, làm rõ chữ)'), onClick: () => insertBlob(f.blob, f.name, true) }] : []),
      { icon: 'eye', label: t('Mở xem'), onClick: () => { const u = URL.createObjectURL(f.blob); window.open(u, '_blank'); setTimeout(() => URL.revokeObjectURL(u), 60000); } },
      { icon: 'download', label: t('Tải về máy'), onClick: () => download(f.blob, f.name) },
      { icon: 'edit', label: t('Đổi tên'), onClick: async () => { const r = await formBox(t('Đổi tên tài liệu'), [{ name: 'n', label: t('Tên'), value: f.name }], t('Lưu')); if (r && r.n.trim()) { f.name = r.n.trim(); await DB.put('files', f); renderPanel(); } } },
      '-', { icon: 'trash', label: t('Xoá khỏi máy'), danger: true, onClick: async () => {
        if (!await confirmBox(t('Xoá tài liệu?'), t('“{n}” sẽ bị xoá khỏi trình duyệt.', { n: esc(f.name) }), t('Xoá'))) return;
        await DB.del('files', f.id); S.files = S.files.filter(x => x.id !== f.id); renderPanel(); } },
    ]);
  };
}
async function addFiles(files, studentId = S.studentId) {
  let n = 0;
  for (const file of files) {
    const f = { id: uid(), studentId, name: file.name || 'tai-lieu', type: file.type || '', size: file.size, blob: file, createdAt: Date.now() };
    try { await DB.put('files', f); S.files.push(f); n++; } catch (err) { toast(t('Không lưu được {n}', { n: f.name }), true); }
  }
  if (n) { S.tab = 'files'; renderPanel(); toast(t('Đã lưu {c} tài liệu cho {n}', { c: n, n: ownerName(studentId) })); }
}

/* ---- Ghi chú ---- */
function renderNotesTab(body) {
  const st = studentById(S.studentId);
  body.innerHTML = `<textarea class="note-area" id="noteArea" placeholder="${st ? t('Ghi chú về {n}: tiến độ, điểm cần lưu ý, bài tập về nhà…', { n: esc(st.name) }) : t('Ghi chú chung cho cả lớp: nội dung tuần này, nhắc nhở…')}">${esc(st ? st.note || '' : S.settings.classNote || '')}</textarea>
    <div class="hint">${t('Ghi chú tự lưu khi bạn gõ.')}</div>`;
  let tm; $('#noteArea', body).oninput = e => {
    clearTimeout(tm); const v = e.target.value;
    tm = setTimeout(() => { if (st) { st.note = v; DB.put('students', st); } else { S.settings.classNote = v; saveSettings(); } }, 500);
  };
}

/* =====================================================================
   Lịch học
   - Cố định hằng tuần: luôn lặp lại.
   - Đổi lịch chỉ tuần này: ghi đè một buổi cố định trong đúng 1 tuần.
   - Một buổi: học bù / học thêm.
   ===================================================================== */
function sched(sid) {
  let s = S.sched.get(sid);
  if (!s) { s = { id: sid, fixed: [], sessions: [], skips: [], weekNotes: {}, overrides: {} }; S.sched.set(sid, s); }
  if (!s.overrides) s.overrides = {};
  return s;
}
const saveSched = sid => { setTimeout(renderTodayCard, 0); return DB.put('schedule', sched(sid)).catch(() => {}); };
const fixedLabel = f => `${WD[LANG][f.dow]} ${f.start}–${f.end}`;
function weekOccurrences(sid, ws) {
  const owners = sid === 'all' ? ['all', ...S.students.map(s => s.id)] : [sid];
  const days = []; for (let i = 0; i < 7; i++) { const d = addDays(ws, i); days.push({ date: dstr(d), d, list: [] }); }
  const byDate = Object.fromEntries(days.map(x => [x.date, x]));
  for (const o of owners) {
    const sc = S.sched.get(o); if (!sc) continue;
    const ov = sc.overrides || {};
    for (const day of days) {
      for (const f of sc.fixed.filter(f => f.dow === dow(day.d) && (!f.from || f.from <= day.date))) {
        const key = f.id + '@' + day.date;
        if (sc.skips.includes(key)) { day.list.push({ kind: 'fixed', owner: o, ref: f, date: day.date, orig: day.date, start: f.start, end: f.end, subject: f.subject, note: f.note, off: true }); continue; }
        const m = ov[key];
        if (m) { const target = byDate[m.date] || day; target.list.push({ kind: 'moved', owner: o, ref: f, date: target.date, orig: day.date, start: m.start, end: m.end, subject: m.subject, note: m.note, off: false }); }
        else day.list.push({ kind: 'fixed', owner: o, ref: f, date: day.date, orig: day.date, start: f.start, end: f.end, subject: f.subject, note: f.note, off: false });
      }
      sc.sessions.filter(x => x.date === day.date).forEach(x => day.list.push({ kind: 'once', owner: o, ref: x, date: day.date, orig: day.date, start: x.start, end: x.end, subject: x.subject, note: x.note, off: false }));
    }
  }
  days.forEach(d => d.list.sort((a, b) => a.start.localeCompare(b.start)));
  return days;
}
function nextLesson(sid) {
  const now = new Date(), nowS = dstr(now), hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  for (let w = 0; w < 3; w++) {
    for (const day of weekOccurrences(sid, addDays(weekStart(now), w * 7))) {
      if (day.date < nowS) continue;
      const o = day.list.find(x => !x.off && (day.date > nowS || x.end > hm));
      if (o) {
        const who = sid === 'all' && o.owner !== 'all' ? ` · ${ownerName(o.owner)}` : '';
        const when = day.date === nowS ? t('Hôm nay') : `${WD[LANG][dow(day.d)]} ${shortDate(day.date)}`;
        return `${when}, ${o.start}${o.subject ? ' – ' + o.subject : ''}${who}`;
      }
    }
  }
  return '';
}
const KIND_TAG = {
  fixed: () => ic('repeat', 11) + t('Cố định'),
  moved: () => ic('edit', 11) + t('Đổi lịch tuần này'),
  once: () => ic('calendar', 11) + t('Một buổi'),
  off: () => ic('ban', 11) + t('Đã nghỉ'),
};
function renderSchedTab(body) {
  const sid = S.studentId, ws = S.week, we = addDays(ws, 6), today = todayStr();
  const isThis = dstr(ws) === dstr(weekStart(new Date()));
  const sc = sched(sid), wk = dstr(ws), days = weekOccurrences(sid, ws);
  const sessHTML = o => `
    <div class="sess ${o.off ? 'off' : ''} ${o.kind === 'moved' ? 'moved' : ''}" data-owner="${o.owner}" data-kind="${o.kind}" data-ref="${o.ref.id}" data-orig="${o.orig}" style="border-left-color:${o.owner === 'all' ? 'var(--accent)' : ownerColor(o.owner)}" title="${t('Bấm để sửa, đổi lịch tuần này, mở bảng…')}">
      ${sid === 'all' && o.owner !== 'all' ? avatarHTML(o.owner) : ''}
      <div class="st">${o.start}<br><span class="muted" style="font-weight:500">${o.end}</span></div>
      <div class="sm"><div class="sj">${esc(o.subject || t('Buổi học'))}${sid === 'all' && o.owner !== 'all' ? ` · ${esc(ownerName(o.owner))}` : ''}</div>
        ${o.note ? `<div class="sn">${esc(o.note)}</div>` : ''}
        <span class="tag ${o.kind === 'moved' ? 'warn' : ''}">${KIND_TAG[o.off ? 'off' : o.kind]()}${o.kind === 'moved' && o.orig !== o.date ? ' · ' + t('từ {d}', { d: `${WDS[LANG][dow(parseD(o.orig))]} ${shortDate(o.orig)}` }) : ''}</span></div>
      ${ic('more', 16)}
    </div>`;
  body.innerHTML = `
    <button class="btn primary block" id="btnAddSess">${ic('calendar', 17)}${t('Ghi lịch học')}</button>
    <div class="legend"><span>${ic('repeat', 12)}${t('Cố định')}</span><span class="warn">${ic('edit', 12)}${t('Đổi tuần này')}</span><span>${ic('calendar', 12)}${t('Một buổi')}</span><span>${ic('ban', 12)}${t('Nghỉ')}</span></div>
    <div class="week-nav">
      <button class="icon-btn sm" data-w="-1" title="${t('Tuần trước')}">${ic('left', 18)}</button>
      <div class="wl">${shortDate(dstr(ws))} – ${shortDate(dstr(we))}/${we.getFullYear()}<small>${isThis ? t('Tuần này') : `<a href="#" data-w="0">${t('Về tuần này')}</a>`}</small></div>
      <button class="icon-btn sm" data-w="1" title="${t('Tuần sau')}">${ic('right', 18)}</button>
    </div>
    ${days.map(day => `
      <div class="day ${day.date === today ? 'today' : ''}">
        <div class="day-h"><span>${WD[LANG][dow(day.d)]} · ${shortDate(day.date)}${day.date === today ? ` · ${t('Hôm nay')}` : ''}</span>
          ${day.list.length ? `<button class="add-link" data-addday="${day.date}">${ic('plus', 13)}${t('Thêm')}</button>` : ''}</div>
        ${day.list.map(sessHTML).join('') || `<button class="day-empty" data-addday="${day.date}">${t('Trống')} · <u>${t('ghi lịch cho ngày này')}</u></button>`}
      </div>`).join('')}
    <div class="sec-h">${ic('note', 15)}${t('Chú thích tuần này')}</div>
    <textarea class="week-note" id="weekNote" placeholder="${t('Nội dung dạy, bài về nhà, nhắc phụ huynh…')}">${esc(sc.weekNotes[wk] || '')}</textarea>
    <div class="sec-h">${ic('repeat', 15)}${t('Lịch cố định hằng tuần')}</div>
    ${sid === 'all' && !sc.fixed.length ? `<div class="hint">${t('Lịch cố định của từng học sinh nằm trong trang của học sinh đó; tuần ở trên đã gộp lịch của cả lớp.')}</div>` : ''}
    ${sc.fixed.length ? [...sc.fixed].sort((a, b) => a.dow - b.dow || a.start.localeCompare(b.start)).map(f => `
      <div class="fixed-row"><span class="fd">${WD[LANG][f.dow]}</span><span class="ft">${f.start}–${f.end}</span><span class="fj">${esc(f.subject || '')}</span>
        <button class="icon-btn sm" data-fedit="${f.id}" title="${t('Sửa lịch cố định (mọi tuần)')}">${ic('edit', 15)}</button></div>`).join('')
      : (sid === 'all' ? '' : `<div class="hint">${t('Chưa có lịch cố định. Bấm “Ghi lịch học” và chọn “Cố định hằng tuần” để buổi học tự lặp lại mỗi tuần.')}</div>`)}`;
  body.onclick = e => {
    const w = e.target.closest('[data-w]');
    if (w) { e.preventDefault(); const v = +w.dataset.w; S.week = v === 0 ? weekStart(new Date()) : addDays(S.week, v * 7); renderSchedTab(body); return; }
    const ad = e.target.closest('[data-addday]'); if (ad) return sessionModal(sid, null, ad.dataset.addday);
    if (e.target.closest('#btnAddSess')) return sessionModal(sid, null, null);
    const fe = e.target.closest('[data-fedit]'); if (fe) return sessionModal(sid, { kind: 'fixed', ref: sc.fixed.find(f => f.id === fe.dataset.fedit) });
    const se = e.target.closest('.sess'); if (se) sessionMenu(se);
  };
  let tm; $('#weekNote', body).oninput = e => {
    clearTimeout(tm); const v = e.target.value;
    tm = setTimeout(() => { if (v) sc.weekNotes[wk] = v; else delete sc.weekNotes[wk]; saveSched(sid); }, 500);
  };
}
function sessionMenu(el) {
  const owner = el.dataset.owner, kind = el.dataset.kind, orig = el.dataset.orig, sc = sched(owner);
  const ref = kind === 'once' ? sc.sessions.find(x => x.id === el.dataset.ref) : sc.fixed.find(f => f.id === el.dataset.ref);
  if (!ref) return;
  const key = ref.id + '@' + orig, off = sc.skips.includes(key), moved = !!sc.overrides[key];
  const shownDate = moved ? sc.overrides[key].date : orig;
  const after = () => { saveSched(owner); renderPanel(); };
  const items = [{ icon: 'board', label: t('Mở bảng cho buổi này'), onClick: () => openLessonBoard(owner, shownDate, moved ? sc.overrides[key].subject : ref.subject) }];
  if (S.studentId === 'all' && owner !== 'all') items.push({ icon: 'user', label: t('Mở trang học sinh'), onClick: () => { S.tab = 'sched'; selectStudent(owner); } });
  if (kind === 'once') {
    items.push({ icon: 'edit', label: t('Sửa buổi này'), onClick: () => sessionModal(owner, { kind, ref }) }, '-',
      { icon: 'trash', label: t('Xoá buổi này'), danger: true, onClick: () => { sc.sessions = sc.sessions.filter(x => x !== ref); after(); } });
  } else {
    if (!off) items.push({ icon: 'clock', label: t(moved ? 'Sửa thay đổi của tuần này' : 'Đổi giờ / ngày chỉ tuần này'), sub: t('Các tuần khác vẫn giữ lịch cố định'), onClick: () => overrideModal(owner, ref, orig) });
    if (moved) items.push({ icon: 'repeat', label: t('Trả về lịch cố định'), onClick: () => { delete sc.overrides[key]; after(); } });
    items.push({ icon: off ? 'repeat' : 'ban', label: t(off ? 'Học lại buổi này' : 'Nghỉ buổi này (chỉ tuần này)'), onClick: () => { if (off) sc.skips = sc.skips.filter(k => k !== key); else { sc.skips.push(key); delete sc.overrides[key]; } after(); } });
    items.push({ icon: 'edit', label: t('Sửa lịch cố định (mọi tuần)'), onClick: () => sessionModal(owner, { kind: 'fixed', ref }) }, '-',
      { icon: 'trash', label: t('Xoá lịch cố định'), danger: true, onClick: async () => {
        if (!await confirmBox(t('Xoá lịch cố định?'), t('Buổi “{s}” sẽ không còn lặp lại mỗi tuần.', { s: esc(`${fixedLabel(ref)} ${ref.subject || ''}`.trim()) }), t('Xoá'))) return;
        sc.fixed = sc.fixed.filter(f => f !== ref); sc.skips = sc.skips.filter(k => !k.startsWith(ref.id + '@'));
        Object.keys(sc.overrides).forEach(k => { if (k.startsWith(ref.id + '@')) delete sc.overrides[k]; }); after(); } });
  }
  popMenu(el, items);
}
async function openLessonBoard(owner, date, subject) {
  const ex = S.boards.find(b => b.studentId === owner && b.date === date);
  if (S.studentId !== owner) { S.studentId = owner; renderSidebar(); }
  if (ex) await openBoard(ex.id);
  else await createBoard(owner, true, date, subject ? `${subject} · ${shortDate(date)}` : undefined);
  S.tab = 'boards'; renderPanel();
}
// Đổi một buổi cố định chỉ trong tuần chứa ngày gốc
function overrideModal(owner, f, orig) {
  const sc = sched(owner), key = f.id + '@' + orig, cur = sc.overrides[key] || { date: orig, start: f.start, end: f.end, subject: f.subject, note: f.note };
  const ws = weekStart(parseD(orig)), body = document.createElement('div');
  body.className = 'sess-form'; bindTimeFields(body);
  body.innerHTML = `
    <div class="info-box">${ic('repeat', 15)}<div>${t('Lịch cố định: {x}', { x: `<b>${fixedLabel(f)}</b>${f.subject ? ' · ' + esc(f.subject) : ''}` })}<br>
      ${t('Thay đổi dưới đây <b>chỉ áp dụng tuần {a} – {b}</b>. Các tuần khác vẫn học như lịch cố định.', { a: shortDate(dstr(ws)), b: shortDate(dstr(addDays(ws, 6))) })}</div></div>
    <div class="field"><label>${t('Học vào ngày')}</label><select name="date">${[0, 1, 2, 3, 4, 5, 6].map(i => { const d = dstr(addDays(ws, i)); return `<option value="${d}" ${d === cur.date ? 'selected' : ''}>${WD[LANG][i]} · ${shortDate(d)}</option>`; }).join('')}</select></div>
    <div class="field"><label>${t('Thời gian')}</label><div class="time-row">${timeField('start', cur.start, t('Bắt đầu'), true)}<span class="time-arrow">→</span>${timeField('end', cur.end, t('Kết thúc'), false)}</div></div>
    <div class="field"><label>${t('Môn / nội dung')}</label><input type="text" name="subject" value="${esc(cur.subject || '')}"></div>
    <div class="field"><label>${t('Chú thích')}</label><input type="text" name="note" value="${esc(cur.note || '')}" placeholder="${t('VD: Dời lịch vì học sinh đi thi')}"></div>`;
  openModal({
    title: t('Đổi lịch chỉ tuần này'), body, width: 470,
    actions: [{ label: t('Huỷ') }, {
      label: t('Lưu cho tuần này'), kind: 'primary', onClick: () => {
        const v = n => $(`[name=${n}]`, body).value;
        if (!v('start') || !v('end') || v('end') <= v('start')) { toast(t('Giờ kết thúc phải sau giờ bắt đầu'), true); return false; }
        const m = { date: v('date'), start: v('start'), end: v('end'), subject: v('subject').trim(), note: v('note').trim() };
        const same = m.date === orig && m.start === f.start && m.end === f.end && m.subject === (f.subject || '') && m.note === (f.note || '');
        if (same) delete sc.overrides[key]; else sc.overrides[key] = m;
        saveSched(owner); renderPanel(); toast(t('Đã đổi lịch cho riêng tuần này'));
      }
    }]
  });
}
/* ---- Bộ chọn giờ riêng (thay cho bộ chọn mặc định của trình duyệt) ---- */
const timeField = (name, value, label, icon) => `<button type="button" class="time-box time-btn" data-tp="${name}" aria-label="${esc(label)}">${icon ? ic('clock', 15) : ''}<span class="tv">${value}</span><input type="hidden" name="${name}" value="${value}"><span class="chev">${ic('chev', 12)}</span></button>`;
function setTimeField(root, name, value) {
  const b = $(`[data-tp="${name}"]`, root); if (!b) return;
  $('input', b).value = value; $('.tv', b).textContent = value;
  b.dispatchEvent(new Event('input', { bubbles: true }));
}
function bindTimeFields(root) {
  root.addEventListener('click', e => { const b = e.target.closest('[data-tp]'); if (b) timePopover(b, root); });
}
function timePopover(btn, root) {
  if (toggleMenu(btn)) return; btn.classList.add('menu-open');
  const name = btn.dataset.tp, [h0, m0] = $('input', btn).value.split(':').map(Number);
  const mins = [...new Set([...Array.from({ length: 12 }, (_, i) => i * 5), m0])].sort((a, b) => a - b);
  let h = h0, m = m0;
  const m_ = document.createElement('div'); m_.className = 'popmenu time-pop';
  const draw = () => {
    m_.innerHTML = `
      <div class="tp-head"><span class="tp-big">${pad(h)}<em>:</em>${pad(m)}</span><small>${esc(btn.getAttribute('aria-label') || '')}</small></div>
      <div class="tp-cols">
        <div class="tp-col"><div class="tp-lbl">${t('Giờ')}</div><div class="tp-scroll" data-col="h">${Array.from({ length: 24 }, (_, i) => `<button type="button" data-h="${i}" class="${i === h ? 'on' : ''} ${i < 6 || i > 22 ? 'dim' : ''}">${pad(i)}</button>`).join('')}</div></div>
        <div class="tp-col"><div class="tp-lbl">${t('Phút')}</div><div class="tp-scroll" data-col="m">${mins.map(i => `<button type="button" data-m="${i}" class="${i === m ? 'on' : ''}">${pad(i)}</button>`).join('')}</div></div>
      </div>
      <div class="tp-foot"><button type="button" class="btn primary sm block" data-ok>${t('Xong')}</button></div>`;
    $$('.tp-scroll', m_).forEach(c => { const on = $('.on', c); if (on) c.scrollTop = on.offsetTop - c.clientHeight / 2 + on.offsetHeight / 2; });
  };
  const apply = () => setTimeField(root, name, `${pad(h)}:${pad(m)}`);
  m_.addEventListener('click', e => {
    const hb = e.target.closest('[data-h]'), mb = e.target.closest('[data-m]');
    if (hb) { h = +hb.dataset.h; apply(); const st = [...$$('.tp-scroll', m_)].map(c => c.scrollTop); draw(); $$('.tp-scroll', m_).forEach((c, i) => c.scrollTop = st[i]); }
    else if (mb) { m = +mb.dataset.m; apply(); closeMenu(); }
    else if (e.target.closest('[data-ok]')) closeMenu();
  });
  document.body.append(m_); menuEl = m_; draw();
  const r = btn.getBoundingClientRect(), mw = m_.offsetWidth, mh = m_.offsetHeight;
  m_.style.left = clamp(r.left, 8, innerWidth - mw - 8) + 'px';
  m_.style.top = (r.bottom + mh + 8 > innerHeight ? Math.max(8, r.top - mh - 6) : r.bottom + 6) + 'px';
  setTimeout(() => document.addEventListener('pointerdown', outsideMenu, true), 0);
}
function sessionModal(owner, existing, presetDate, pickOwner) {
  const isEdit = !!existing, ref = existing?.ref || {};
  let kind = existing?.kind || 'fixed';
  const pd = presetDate ? parseD(presetDate) : null, body = document.createElement('div');
  body.className = 'sess-form';
  const ownerOpts = [['all', t('Lớp chung')], ...S.students.map(s => [s.id, s.name])];
  const curDow = ref.dow ?? dow(pd || new Date());
  const DUR = [[45, t('45 phút')], [60, t('1 giờ')], [90, t('1,5 giờ')], [120, t('2 giờ')]];
  body.innerHTML = `
    ${!isEdit && (pickOwner || owner === 'all') && S.students.length ? `
    <div class="field"><label>${t('Học sinh')}</label>
      <div class="owner-pick">${ownerOpts.map(([v, l]) => `
        <label class="op-item"><input type="radio" name="owner" value="${v}" ${v === owner ? 'checked' : ''}>${avatarHTML(v)}<span>${esc(l)}</span><i class="op-check">${ic('check', 11)}</i></label>`).join('')}
      </div></div>` : ''}
    ${isEdit ? (kind === 'fixed' ? `<div class="info-box">${ic('repeat', 15)}<div>${t('Bạn đang sửa <b>lịch cố định</b>: thay đổi áp dụng cho mọi tuần. Muốn đổi riêng một tuần, hãy bấm vào buổi học trong tuần đó và chọn “Đổi giờ / ngày chỉ tuần này”.')}</div></div>` : '')
    : `<div class="field"><label>${t('Kiểu lịch')}</label><div class="kind-cards">
      <label><input type="radio" name="kind" value="fixed" ${kind === 'fixed' ? 'checked' : ''}><span class="kc-ic">${ic('repeat', 17)}</span><span class="kc-t"><b>${t('Cố định hằng tuần')}</b><small>${t('Lặp lại mỗi tuần, đổi riêng tuần nào cũng được')}</small></span></label>
      <label><input type="radio" name="kind" value="once" ${kind === 'once' ? 'checked' : ''}><span class="kc-ic">${ic('calendar', 17)}</span><span class="kc-t"><b>${t('Chỉ một buổi')}</b><small>${t('Học bù, học thêm, kiểm tra')}</small></span></label></div></div>`}
    <div class="field f-dow"><label>${t('Học vào thứ')}</label>
      <div class="day-pills">${WDS[LANG].map((d, i) => `<label class="dp ${i >= 5 ? 'we' : ''}"><input type="radio" name="dow" value="${i}" ${curDow === i ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div></div>
    <div class="field f-date"><label>${t('Ngày học')}</label><input type="date" name="date" value="${ref.date || presetDate || todayStr()}"></div>
    <div class="field"><label>${t('Thời gian')}</label>
      <div class="time-row">
        ${timeField('start', ref.start || '18:00', t('Bắt đầu'), true)}
        <span class="time-arrow">→</span>
        ${timeField('end', ref.end || '19:30', t('Kết thúc'), false)}
      </div>
      <div class="dur-chips">${DUR.map(([m, l]) => `<button type="button" data-dur="${m}">${l}</button>`).join('')}</div>
    </div>
    <div class="field"><label>${t('Môn / nội dung')}</label><span class="in-ic">${ic('book', 15)}<input type="text" name="subject" value="${esc(ref.subject || '')}" placeholder="${t('VD: Toán – phân số')}"></span></div>
    <div class="field"><label>${t('Chú thích')} <em class="opt">${t('(tuỳ chọn)')}</em></label><span class="in-ic">${ic('note', 15)}<input type="text" name="note" value="${esc(ref.note || '')}" placeholder="${t('VD: Mang vở ô li, ôn bài 5')}"></span></div>`;
  const toMin = x => { const [h, m] = (x || '0:0').split(':').map(Number); return h * 60 + m; };
  const fromMin = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  const syncDur = () => { const d = toMin($('[name=end]', body).value) - toMin($('[name=start]', body).value); $$('[data-dur]', body).forEach(b => b.classList.toggle('active', +b.dataset.dur === d)); };
  const sync = () => { $('.f-dow', body).classList.toggle('hidden', kind !== 'fixed'); $('.f-date', body).classList.toggle('hidden', kind !== 'once'); };
  body.addEventListener('change', e => { if (e.target.name === 'kind') { kind = e.target.value; sync(); } });
  body.addEventListener('input', () => syncDur());
  bindTimeFields(body);
  body.addEventListener('click', e => {
    const d = e.target.closest('[data-dur]'); if (!d) return;
    const st = $('[name=start]', body).value || '18:00';
    setTimeField(body, 'end', fromMin(Math.min(toMin(st) + +d.dataset.dur, 23 * 60 + 55)));
  });
  sync(); syncDur();
  openModal({
    title: isEdit ? t(kind === 'fixed' ? 'Sửa lịch cố định' : 'Sửa buổi học') : t('Ghi lịch học'), body, width: 500,
    actions: [{ label: t('Huỷ') }, {
      label: t(isEdit ? 'Lưu' : 'Lưu lịch'), kind: 'primary', onClick: () => {
        const v = n => $(`[name=${n}]`, body)?.value;
        const start = v('start'), end = v('end');
        if (!start || !end || end <= start) { toast(t('Giờ kết thúc phải sau giờ bắt đầu'), true); return false; }
        const own = $('[name=owner]:checked', body)?.value || owner, sc = sched(own);
        const dw = +($('[name=dow]:checked', body)?.value ?? curDow);
        const data = { start, end, subject: v('subject').trim(), note: v('note').trim() };
        if (isEdit) Object.assign(ref, data, kind === 'fixed' ? { dow: dw } : { date: v('date') });
        else if (kind === 'fixed') sc.fixed.push({ id: uid(), dow: dw, ...data });
        else { sc.sessions.push({ id: uid(), date: v('date'), ...data }); S.week = weekStart(parseD(v('date'))); }
        saveSched(own); renderPanel();
        if (!isEdit) toast(t('Đã ghi lịch cho {n}', { n: ownerName(own) }));
      }
    }]
  });
}

/* =====================================================================
   Hồ sơ giáo viên
   ===================================================================== */
const profile = () => S.settings.profile || (S.settings.profile = {});
function profileAvatarHTML(cls = '') {
  const p = profile();
  return p.avatar ? `<span class="avatar ${cls}"><img src="${p.avatar}" alt=""></span>` : `<span class="avatar ${cls}">${p.name ? esc(p.name.trim().split(/\s+/).pop()[0].toUpperCase()) : ic('user', 18)}</span>`;
}
function renderProfileCard() {
  const p = profile();
  const first = p.name ? p.name.trim().split(/\s+/).pop() : '';
  $('#topProfile').innerHTML = `${profileAvatarHTML('round')}<span class="tp-name">${esc(first || t('Hồ sơ'))}</span><span class="chev">${ic('chev', 12)}</span>`;
  $('#topProfile').title = p.name ? `${p.name}${p.role ? ' · ' + p.role : ''}` : t('Hồ sơ của bạn');
}
function profileMenu() {
  const p = profile();
  setTimeout(() => { if (menuAnchor === $('#topProfile')) $('#topProfile').classList.add('menu-open'); }, 0);
  popMenu($('#topProfile'), [
    { icon: 'user', label: p.name || t('Hồ sơ của bạn'), sub: p.role || p.school || t('Thêm ảnh đại diện và thông tin cá nhân'), onClick: profileModal },
    { icon: 'camera', label: t(p.avatar ? 'Đổi ảnh đại diện' : 'Tải ảnh đại diện'), onClick: profileModal },
    '-',
    { icon: 'settings', label: t('Cài đặt & sao lưu'), onClick: settingsModal },
    { icon: 'info', label: t('Giới thiệu Vincenink'), onClick: () => showWelcome(true) },
  ]);
}
async function resizeAvatar(file) {
  const img = await loadImg(await blobToDataURL(file)), s = Math.min(img.naturalWidth, img.naturalHeight);
  const c = document.createElement('canvas'); c.width = c.height = 256;
  c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 256, 256);
  return c.toDataURL('image/jpeg', 0.88);
}
function profileModal() {
  const p = { ...profile() }, body = document.createElement('div');
  const f = (n, l, ph = '', type = 'text') => `<div class="field"><label>${t(l)}</label><input type="${type}" name="${n}" value="${esc(p[n] || '')}" placeholder="${ph ? t(ph) : ''}"></div>`;
  body.innerHTML = `
    <div class="avatar-edit">
      <div class="big-av" id="bigAv" title="${t('Chọn ảnh đại diện')}"></div>
      <div class="av-actions"><button class="btn outline sm" id="avPick">${ic('camera', 16)}${t('Đổi ảnh')}</button><button class="btn ghost sm" id="avDel">${t('Xoá ảnh')}</button></div>
    </div>
    ${f('name', 'Họ và tên')}
    ${f('role', 'Vai trò', 'VD: Giáo viên Toán, Gia sư Tiếng Anh')}
    ${f('school', 'Trường / trung tâm')}
    <div class="row2">${f('email', 'Email', '', 'email')}${f('phone', 'Số điện thoại', '', 'tel')}</div>
    <div class="field"><label>${t('Giới thiệu ngắn')}</label><textarea name="bio" placeholder="${t('Kinh nghiệm, phương pháp dạy, môn phụ trách…')}">${esc(p.bio || '')}</textarea></div>
    <div class="hint">${t('Thông tin chỉ lưu trên máy này và được dùng để ghi tên bạn lên tệp PDF xuất ra.')}</div>`;
  const paint = () => { const name = $('[name=name]', body).value.trim(); $('#bigAv', body).innerHTML = p.avatar ? `<img src="${p.avatar}" alt="">` : (name ? esc(name.split(/\s+/).pop()[0].toUpperCase()) : ic('user', 34)); $('#avDel', body).classList.toggle('hidden', !p.avatar); };
  const pick = () => { const inp = $('#fileAvatar'); inp.onchange = async () => { const file = inp.files[0]; inp.value = ''; if (!file) return; try { p.avatar = await resizeAvatar(file); paint(); } catch (e) { toast(t('Không đọc được ảnh này'), true); } }; inp.click(); };
  $('#bigAv', body).onclick = pick; $('#avPick', body).onclick = pick;
  $('#avDel', body).onclick = () => { delete p.avatar; paint(); };
  $('[name=name]', body).oninput = paint; paint();
  openModal({
    title: t('Hồ sơ của bạn'), body, width: 500, actions: [{ label: t('Huỷ') }, {
      label: t('Lưu'), kind: 'primary', onClick: () => {
        ['name', 'role', 'school', 'email', 'phone', 'bio'].forEach(k => { p[k] = $(`[name=${k}]`, body).value.trim(); });
        S.settings.profile = p; saveSettings(); renderProfileCard(); toast(t('Đã lưu hồ sơ'));
      }
    }]
  });
}

/* =====================================================================
   Sáng / tối
   ===================================================================== */
/* ---- Bộ chọn chế độ màu: thẻ xem trước ---- */
const THEME_LOOK = {
  light: { paper: '#FFFCF6', line: 'rgba(140,105,60,.16)', ink: '#2F2A25', ui: '#F3ECE0' },
  dark: { paper: '#1F1C18', line: 'rgba(230,205,170,.12)', ink: '#EEE6D9', ui: '#1A1714' },
  chalk: { paper: '#233B31', line: 'rgba(235,245,230,.14)', ink: '#EEF2E8', ui: '#17251F' },
};
function themePreview(v) {
  const sq = c => `<svg viewBox="0 0 40 20" preserveAspectRatio="none" aria-hidden="true"><path d="M5 13c4-8 8-8 10-2s6 6 9-1 7-6 11 1" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  if (v === 'system') {
    const L = THEME_LOOK.light, D = THEME_LOOK.dark;
    return `<span class="tp-prev tp-split"><span style="--p:${L.paper};--l:${L.line}">${sq(L.ink)}</span><span style="--p:${D.paper};--l:${D.line}">${sq(D.ink)}</span></span>`;
  }
  const k = THEME_LOOK[v];
  return `<span class="tp-prev" style="--p:${k.paper};--l:${k.line}">${sq(k.ink)}</span>`;
}
const themeNow = () => THEME_OPTS.some(o => o[0] === themePref) ? themePref : 'system';
function renderThemeUI() {
  const cur = themeNow(), label = t(THEME_OPTS.find(o => o[0] === cur)[1]);
  $('#sideTheme').innerHTML = `
    <div class="tbx-h"><span>${ic('palette', 14)}${t('Giao diện')}</span><b>${esc(label)}</b></div>
    <div class="tbx-row">${THEME_OPTS.map(([v, l]) => `<button class="tbx-chip ${v === cur ? 'active' : ''}" data-theme-v="${v}" title="${t(l)}" aria-label="${t(l)}">${themePreview(v)}</button>`).join('')}</div>`;
  $('#btnThemePick').innerHTML = `${themePreview(cur)}<span>${esc(label)}</span><span class="chev">${ic('chev', 12)}</span>`;
}
function themePopover(anchor) {
  if (toggleMenu(anchor)) return; anchor.classList.add('menu-open'); const cur = themeNow();
  const m = document.createElement('div'); m.className = 'popmenu theme-pop'; m.setAttribute('role', 'menu');
  m.innerHTML = `<div class="tpop-h">${t('Chế độ màu')}</div><div class="tpop-grid">${THEME_OPTS.map(([v, l]) => `
    <button class="tpop-card ${v === cur ? 'active' : ''}" data-theme-v="${v}">${themePreview(v)}<span class="tpop-l">${t(l)}${v === cur ? ic('check', 14) : ''}</span>
    <small>${t({ system: 'Tự đổi sáng/tối theo máy', light: 'Nền be dịu mắt', dark: 'Đỡ chói buổi tối', chalk: 'Như bảng lớp học' }[v])}</small></button>`).join('')}</div>`;
  m.addEventListener('click', e => { const b = e.target.closest('[data-theme-v]'); if (b) { setTheme(b.dataset.themeV); closeMenu(); } });
  document.body.append(m); menuEl = m;
  const r = anchor.getBoundingClientRect(), mw = m.offsetWidth;
  m.style.left = clamp(r.right - mw, 8, innerWidth - mw - 8) + 'px'; m.style.top = r.bottom + 6 + 'px';
  setTimeout(() => document.addEventListener('pointerdown', outsideMenu, true), 0);
}
/* ---- Bộ chọn nền bảng: thẻ xem trước ---- */
const BG_DESC = { plain: 'Giấy trơn, không kẻ', grid: 'Vẽ hình, làm toán', oli: 'Luyện chữ như vở ô li', lines: 'Viết đoạn văn, chính tả', dots: 'Vẽ đồ thị, sơ đồ' };
function renderBgUI() {
  const b = $('#btnBgPick'); if (!b) return;
  const name = t((BGS.find(x => x[0] === E.bg) || BGS[1])[1]);
  b.innerHTML = `<span class="bgp bgp-${E.bg}"></span><span class="bg-name">${esc(name)}</span><span class="chev">${ic('chev', 12)}</span>`;
}
function bgPopover(anchor) {
  if (toggleMenu(anchor)) return; anchor.classList.add('menu-open');
  const m = document.createElement('div'); m.className = 'popmenu bg-pop'; m.setAttribute('role', 'menu');
  m.innerHTML = `<div class="tpop-h">${t('Nền bảng')}</div>${BGS.map(([v, n]) => `
    <button class="bgp-row ${v === E.bg ? 'active' : ''}" data-bg="${v}" role="menuitemradio" aria-checked="${v === E.bg}">
      <span class="bgp bgp-${v}"></span>
      <span class="bgp-t"><b>${t(n)}</b><small>${t(BG_DESC[v])}</small></span>
      ${v === E.bg ? ic('check', 16) : ''}
    </button>`).join('')}`;
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-bg]'); if (!b) return;
    E.bg = b.dataset.bg; renderBgUI(); requestRender(true); scheduleSave(true); closeMenu();
  });
  document.body.append(m); menuEl = m;
  const r = anchor.getBoundingClientRect(), mw = m.offsetWidth;
  m.style.left = clamp(r.left, 8, innerWidth - mw - 8) + 'px'; m.style.top = r.bottom + 6 + 'px';
  setTimeout(() => document.addEventListener('pointerdown', outsideMenu, true), 0);
}
function applyTheme() {
  const th = resolvedTheme(); document.documentElement.dataset.theme = th;
  renderThemeUI();
  RT = THEMES[th]; renderProps(); paintMiniSwatches(); requestRender(true);
}
function setTheme(v) { themePref = v; applyTheme(); }
mq.addEventListener?.('change', () => { if (themePref === 'system') applyTheme(); });

/* =====================================================================
   Thanh trên
   ===================================================================== */
function renderTopbar() {
  const b = S.boards.find(x => x.id === S.boardId); if (!b) return;
  $('#ownerChip').innerHTML = `${avatarHTML(b.studentId)}<span>${esc(ownerName(b.studentId))}</span>`;
  $('#ownerChip').title = t('Mở trang của {n}', { n: ownerName(b.studentId) });
  $('#boardTitle').value = b.title; $('#boardDate').value = b.date; renderBgUI();
  updateTitle();
}
function bindTopbar() {
  $('#btnBgPick').onclick = e => bgPopover(e.currentTarget);
  const title = $('#boardTitle');
  title.onchange = async () => { const b = S.boards.find(x => x.id === S.boardId); if (!b) return; b.title = title.value.trim() || b.title; title.value = b.title; await DB.put('boards', b); renderPanel(); renderTopbar(); };
  title.onkeydown = e => { if (e.key === 'Enter' || e.key === 'Escape') title.blur(); };
  $('#boardDate').onchange = async e => { const b = S.boards.find(x => x.id === S.boardId); if (!b || !e.target.value) return; b.date = e.target.value; await DB.put('boards', b); renderPanel(); };
  $('#ownerChip').onclick = () => { const b = S.boards.find(x => x.id === S.boardId); if (b) { $('#app').classList.remove('focus'); setTimeout(resize, 0); selectStudent(b.studentId); } };
  $('#btnFocus').onclick = toggleFocus;
  $('#btnFull').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
  $('#btnExport').onclick = async () => { const blob = await renderBoardPNG(); if (!blob) return toast(t('Bảng đang trống')); download(blob, safeName($('#boardTitle').value) + '.png'); };
  $('#btnPdf').onclick = exportPdfDialog;
  $('#btnSettings').onclick = settingsModal;
  $('#btnThemePick').onclick = e => themePopover(e.currentTarget);
  $('#sideTheme').onclick = e => { const b = e.target.closest('[data-theme-v]'); if (b) setTheme(b.dataset.themeV); };
  $('#topProfile').onclick = profileMenu;
  $('#btnAbout').onclick = () => showWelcome(true);
  $('#langSeg').onclick = e => { const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); };
  $('#btnStart').onclick = () => showWelcome(false);
}
/* ---- Kéo đổi độ rộng thanh bên & cột học sinh ---- */
const SIZES = { sidebar: { def: 232, min: 190, max: 360, rail: 76 }, panel: { def: 304, min: 250, max: 560 } };
function applyWidths() {
  const app = $('#app'), sb = +ls.get('vincenink.w.sidebar', SIZES.sidebar.def), pn = +ls.get('vincenink.w.panel', SIZES.panel.def);
  // Màn hình vừa (≤1180px): tự thu thanh bên thành dải biểu tượng để bảng đủ rộng
  const rail = sb <= SIZES.sidebar.rail || (innerWidth <= 1180 && innerWidth > 900);
  app.classList.toggle('rail', rail);
  app.style.setProperty('--sbw', (rail ? SIZES.sidebar.rail : clamp(sb, SIZES.sidebar.min, SIZES.sidebar.max)) + 'px');
  app.style.setProperty('--pw', clamp(pn, SIZES.panel.min, SIZES.panel.max) + 'px');
}
function initResizers() {
  applyWidths();
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(applyWidths, 80); });
  document.addEventListener('pointerdown', e => {
    const h = e.target.closest('.resizer'); if (!h || e.button !== 0) return;
    e.preventDefault(); const which = h.dataset.resize, el = which === 'sidebar' ? $('#sidebar') : $('#panel');
    const left = el.getBoundingClientRect().left; document.body.classList.add('resizing'); h.classList.add('drag');
    const move = ev => {
      let w = ev.clientX - left; const cfg = SIZES[which];
      if (which === 'sidebar' && w < (cfg.min + cfg.rail) / 2) w = cfg.rail; else w = clamp(w, cfg.min, cfg.max);
      ls.set('vincenink.w.' + which, String(Math.round(w))); applyWidths();
    };
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.body.classList.remove('resizing'); h.classList.remove('drag'); resize(); };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  });
  document.addEventListener('dblclick', e => {
    const h = e.target.closest('.resizer'); if (!h) return;
    ls.set('vincenink.w.' + h.dataset.resize, String(SIZES[h.dataset.resize].def)); applyWidths(); resize();
  });
}
function toggleFocus() { $('#app').classList.toggle('focus'); setTimeout(resize, 0); }
function showWelcome(on) {
  $('#welcome').classList.toggle('hidden', !on);
  if (!on) ls.set('vincenink.seen', '1');
  updateTitle();
}
$('#welcome').addEventListener('pointerdown', e => { if (e.target.id === 'welcome') showWelcome(false); });

/* =====================================================================
   Sao lưu / khôi phục
   ===================================================================== */
async function buildBackup() {
  await doSave();
  const boardData = await DB.all('boardData'), files = [];
  for (const f of S.files) { const { blob, ...rest } = f; files.push({ ...rest, data: await blobToDataURL(blob) }); }
  return new Blob([JSON.stringify({ app: 'vincenink', version: 2, exportedAt: Date.now(), students: S.students, boards: S.boards, boardData, files, schedule: [...S.sched.values()], classNote: S.settings.classNote, profile: S.settings.profile })], { type: 'application/json' });
}
async function exportBackup() { toast(t('Đang tạo bản sao lưu…')); download(await buildBackup(), `vincenink-saoluu-${todayStr()}.json`); }
async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'vincenink') throw new Error(t('Tệp không phải bản sao lưu Vincenink'));
    if (!await confirmBox(t('Khôi phục bản sao lưu?'), t('Dữ liệu hiện tại trên máy sẽ được <b>thay thế</b> bằng bản sao lưu ngày {d} ({s} học sinh, {b} bảng, {f} tài liệu).', { d: fmtDT(data.exportedAt), s: data.students.length, b: data.boards.length, f: data.files.length }), t('Khôi phục'), false)) return;
    for (const s of ['students', 'boards', 'boardData', 'files', 'schedule']) await DB.clear(s);
    for (const s of data.students) await DB.put('students', s);
    for (const b of data.boards) await DB.put('boards', b);
    for (const d of data.boardData) await DB.put('boardData', d);
    for (const s of data.schedule || []) await DB.put('schedule', s);
    for (const f of data.files) { const { data: u, driveId, driveLink, ...rest } = f; await DB.put('files', { ...rest, blob: await dataURLToBlob(u) }); }
    S.settings.classNote = data.classNote || ''; if (data.profile) S.settings.profile = data.profile;
    S.settings.lastBoard = null; S.settings.lastStudent = 'all'; await saveSettings();
    contentDirty = viewDirty = false; location.reload();
  } catch (err) { toast(t('Không khôi phục được: {m}', { m: err.message }), true); }
}

/* =====================================================================
   Cài đặt
   ===================================================================== */
function settingsModal() {
  const s = S.settings, body = document.createElement('div');
  const seg = (name, opts, cur) => `<div class="seg" data-segname="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${v === cur ? 'active' : ''}">${t(l)}</button>`).join('')}</div>`;
  body.innerHTML = `
    <h4 style="margin:0 0 10px">${t('Giao diện')}</h4>
    <div class="set-row"><span>${t('Ngôn ngữ')}</span>${seg('lang', [['vi', 'Tiếng Việt'], ['en', 'English']], LANG)}</div>
    <div class="set-row"><span>${t('Chế độ màu')}</span><select class="set-select" id="setTheme">${THEME_OPTS.map(([v, l]) => `<option value="${v}" ${v === themePref ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></div>
    <label class="switch"><input type="checkbox" id="setPen" ${s.penOnly ? 'checked' : ''}><span class="knob"></span>
      <span class="lbl">${t('Chỉ viết bằng bút cảm ứng')}<small>${t('Dành cho iPad/máy tính bảng: Apple Pencil để viết, ngón tay chỉ để kéo và phóng to — tránh lỡ tay chạm lòng bàn tay vào bảng.')}</small></span></label>
    <div class="set-section">
      <h4>${t('Sao lưu dữ liệu')}</h4>
      <p class="muted" style="font-size:13px">${t('Dữ liệu được lưu ngay trong trình duyệt trên máy này. Thỉnh thoảng hãy tải bản sao lưu để không mất bài giảng.')}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn outline sm" id="setExport">${ic('download', 16)}${t('Tải bản sao lưu')}</button>
        <button class="btn outline sm" id="setImport">${ic('upload', 16)}${t('Khôi phục từ tệp')}</button>
        <button class="btn ghost sm" id="setAbout">${ic('info', 16)}${t('Mở trang giới thiệu')}</button>
      </div>
    </div>
    <div class="set-section">
      <h4>${t('Phím tắt')}</h4>
      <div class="kbd-grid">
        <span><kbd>P</kbd> <kbd>M</kbd> <kbd>E</kbd></span><span>${t('Bút · Dạ quang · Tẩy')}</span>
        <span><kbd>L</kbd> <kbd>S</kbd> <kbd>T</kbd> <kbd>K</kbd></span><span>${t('Khoanh vùng · Hình · Chữ · Laser')}</span>
        <span><kbd>Space</kbd> + ↔</span><span>${t('Di chuyển bảng')}</span>
        <span><kbd>Ctrl</kbd> + ⇅</span><span>${t('Phóng to / thu nhỏ')}</span>
        <span><kbd>[</kbd> <kbd>]</kbd></span><span>${t('Giảm / tăng độ dày')}</span>
        <span><kbd>1</kbd> … <kbd>8</kbd></span><span>${t('Chọn nhanh màu')}</span>
        <span><kbd>Ctrl</kbd> <kbd>Z</kbd> / <kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>Z</kbd></span><span>${t('Hoàn tác / Làm lại')}</span>
        <span><kbd>Delete</kbd> · <kbd>Ctrl</kbd> <kbd>D</kbd></span><span>${t('Xoá / nhân bản vùng chọn')}</span>
        <span><kbd>I</kbd></span><span>${t('Chèn ảnh / PDF')}</span>
        <span><kbd>F</kbd></span><span>${t('Ẩn/hiện thanh bên')}</span>
      </div>
    </div>`;
  body.addEventListener('click', e => {
    const b = e.target.closest('[data-segname] button'); if (!b) return;
    const name = b.parentElement.dataset.segname;
    $$('button', b.parentElement).forEach(x => x.classList.toggle('active', x === b));
    if (name === 'lang') { setLang(b.dataset.v); m.close(); settingsModal(); } else setTheme(b.dataset.v);
  });
  $('#setPen', body).onchange = e => { s.penOnly = e.target.checked; saveSettings(); };
  $('#setTheme', body).onchange = e => setTheme(e.target.value);
  $('#setExport', body).onclick = exportBackup;
  $('#setImport', body).onclick = () => $('#fileImport').click();
  const m = openModal({ title: t('Cài đặt & sao lưu'), body, width: 540, actions: [{ label: t('Xong'), kind: 'primary' }] });
  $('#setAbout', body).onclick = () => { m.close(); showWelcome(true); };
}

/* =====================================================================
   Hộp thoại, menu, thông báo
   ===================================================================== */
function openModal({ title, body, actions = [], width = 440, onClose }) {
  const back = document.createElement('div'); back.className = 'modal-back';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" style="width:min(${width}px,calc(100vw - 32px))"><div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn sm" data-close aria-label="Close">${ic('x', 18)}</button></div><div class="modal-body"></div><div class="modal-foot"></div></div>`;
  const bodyEl = $('.modal-body', back); if (typeof body === 'string') bodyEl.innerHTML = body; else bodyEl.append(body);
  const foot = $('.modal-foot', back); let closed = false;
  const close = () => { if (closed) return; closed = true; back.remove(); document.removeEventListener('keydown', onKey, true); onClose && onClose(); };
  actions.forEach(a => {
    const b = document.createElement('button'); b.className = 'btn ' + (a.kind || 'ghost'); b.textContent = a.label;
    b.onclick = async () => { const r = a.onClick ? await a.onClick(back) : undefined; if (r !== false) close(); };
    foot.append(b);
  });
  if (!actions.length) foot.remove();
  back.addEventListener('pointerdown', e => { if (e.target === back) close(); });
  $('[data-close]', back).onclick = close;
  const onKey = e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    else if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !['checkbox', 'radio'].includes(e.target.type)) { e.preventDefault(); foot.querySelector('.btn.primary, .btn.danger')?.click(); }
  };
  document.addEventListener('keydown', onKey, true);
  $('#modalRoot').append(back);
  setTimeout(() => back.querySelector('.modal-body input[type=text], .modal-body input[type=number]')?.focus(), 30);
  return { el: back, close };
}
function confirmBox(title, msg, ok, danger = true) {
  return new Promise(res => {
    let done = false;
    openModal({ title, body: `<p class="muted">${msg}</p>`, actions: [{ label: t('Huỷ') }, { label: ok || t('Xoá'), kind: danger ? 'danger' : 'primary', onClick: () => { done = true; res(true); } }], onClose: () => { if (!done) res(false); } });
  });
}
function formBox(title, fields, ok, intro = '', row = false) {
  return new Promise(res => {
    let done = false; const body = document.createElement('div');
    const fh = f => `<div class="field"><label>${esc(f.label)}</label>${f.type === 'select'
      ? `<select name="${f.name}">${f.options.map(([v, l]) => `<option value="${esc(v)}" ${v === f.value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`
      : `<input type="${f.type || 'text'}" name="${f.name}" value="${esc(f.value ?? '')}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}>`}</div>`;
    body.innerHTML = intro + (row ? `<div class="row2">${fields.map(fh).join('')}</div>` : fields.map(fh).join(''));
    openModal({ title, body, actions: [{ label: t('Huỷ') }, { label: ok || t('Lưu'), kind: 'primary', onClick: () => { const o = {}; fields.forEach(f => o[f.name] = $(`[name="${f.name}"]`, body).value); done = true; res(o); } }], onClose: () => { if (!done) res(null); } });
  });
}
let menuEl = null;
let menuAnchor = null;
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; document.removeEventListener('pointerdown', outsideMenu, true); } menuAnchor = null; $$('.menu-open').forEach(x => x.classList.remove('menu-open')); }
// Bấm ra ngoài thì đóng; bấm lại vào chính nút đã mở thì để nút tự đóng (bật/tắt)
function outsideMenu(e) { if (!menuEl || menuEl.contains(e.target) || (menuAnchor && menuAnchor.contains(e.target))) return; closeMenu(); }
// Gọi đầu mỗi hàm mở bảng chọn: nếu bảng của nút này đang mở thì đóng lại và trả về true
function toggleMenu(anchor) { if (menuEl && menuAnchor === anchor) { closeMenu(); return true; } closeMenu(); menuAnchor = anchor; return false; }
function popMenu(anchor, items) {
  if (toggleMenu(anchor)) return; const m = document.createElement('div'); m.className = 'popmenu'; m.setAttribute('role', 'menu');
  items.forEach(it => {
    if (it === '-') { m.insertAdjacentHTML('beforeend', '<div class="sep"></div>'); return; }
    const b = document.createElement('button'); if (it.danger) b.className = 'danger';
    b.innerHTML = ic(it.icon, 17) + `<span>${esc(it.label)}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>`;
    b.onclick = () => { closeMenu(); it.onClick(); }; m.append(b);
  });
  if (items.some(i => i.sub)) m.style.maxWidth = '320px';
  document.body.append(m); menuEl = m;
  const r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
  m.style.left = clamp(r.right - mw, 8, innerWidth - mw - 8) + 'px';
  m.style.top = (r.bottom + mh + 8 > innerHeight ? Math.max(8, r.top - mh - 4) : r.bottom + 4) + 'px';
  setTimeout(() => document.addEventListener('pointerdown', outsideMenu, true), 0);
}
function toast(msg, err) {
  const el = document.createElement('div'); el.className = 'toast' + (err ? ' err' : ''); el.textContent = msg;
  const box = $('#toasts'); while (box.children.length > 2) box.firstChild.remove();
  box.append(el); setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = 0; setTimeout(() => el.remove(), 300); }, err ? 5000 : 2600);
}

/* =====================================================================
   Bàn phím, dán, kéo thả
   ===================================================================== */
const isTyping = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); };
const blocked = () => $('#modalRoot').children.length || !$('#welcome').classList.contains('hidden') || isTyping();
document.addEventListener('keydown', e => {
  if (blocked()) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (e.code === 'Space') { if (!spaceDown) { spaceDown = true; updateCursor(); } e.preventDefault(); return; }
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); redo(); return; }
  if (mod && k === 'a') { e.preventDefault(); selectAll(); return; }
  if (mod && k === 'd') { e.preventDefault(); duplicateSelection(); return; }
  if (mod && (k === '=' || k === '+')) { e.preventDefault(); zoomAt(W / 2, H / 2, 1.25); return; }
  if (mod && k === '-') { e.preventDefault(); zoomAt(W / 2, H / 2, 0.8); return; }
  if (mod) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && E.sel.size) { e.preventDefault(); deleteSelection(); return; }
  if (e.key === 'Escape') { E.sel.clear(); closeMenu(); requestRender(); return; }
  const map = { h: 'hand', p: 'pen', m: 'marker', e: 'eraser', l: 'lasso', s: 'shape', t: 'text', k: 'laser' };
  if (map[k]) { setTool(map[k]); return; }
  if (k === 'i') { insertMenu($('#toolbar [data-act=insert]')); return; }
  if (k === 'f') { toggleFocus(); return; }
  if (k === '0') { zoomAt(W / 2, H / 2, 1 / E.view.s); return; }
  if (k === '+' || k === '=') { zoomAt(W / 2, H / 2, 1.25); return; }
  if (k === '-') { zoomAt(W / 2, H / 2, 0.8); return; }
  if (k === '[' || k === ']') {
    const kind = { pen: 'pen', marker: 'marker', eraser: 'eraser', shape: 'shape', text: 'text' }[E.tool]; if (!kind) return;
    const [mn, mx] = SIZE_RANGE[kind], step = Math.max(1, Math.round(E.sizes[kind] * 0.15));
    E.sizes[kind] = clamp(E.sizes[kind] + (k === ']' ? step : -step), mn, mx); savePrefs(); renderProps(); requestRender(); return;
  }
  if (/^[1-8]$/.test(k)) {
    if (E.tool === 'marker') { const c = MARKERS[+k - 1]; if (c) E.markerColor = c; }
    else { E.color = COLORS[+k - 1]; if (!['pen', 'shape', 'text'].includes(E.tool)) setTool('pen'); }
    savePrefs(); renderProps();
  }
});
document.addEventListener('keyup', e => { if (e.code === 'Space') { spaceDown = false; updateCursor(); } });
window.addEventListener('blur', () => { spaceDown = false; });
document.addEventListener('paste', e => {
  if (blocked()) return;
  const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith('image/') || x.type === 'application/pdf');
  if (f) { e.preventDefault(); insertBlob(f, f.name); }
});
let dragDepth = 0;
wrap.addEventListener('dragenter', e => { if ([...e.dataTransfer.types].includes('Files')) { dragDepth++; wrap.classList.add('dragover'); } });
wrap.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) wrap.classList.remove('dragover'); });
wrap.addEventListener('dragover', e => e.preventDefault());
wrap.addEventListener('drop', async e => {
  e.preventDefault(); dragDepth = 0; wrap.classList.remove('dragover');
  for (const f of [...e.dataTransfer.files]) await insertBlob(f, f.name);
});
const onFiles = (id, fn) => { $(id).onchange = async e => { const files = [...e.target.files]; e.target.value = ''; for (const f of files) await fn(f); }; };
onFiles('#fileInsert', f => insertBlob(f, f.name));
onFiles('#fileScan', f => insertBlob(f, f.name, true));
onFiles('#fileCamera', f => insertBlob(f, f.name, true));
$('#fileUpload').onchange = async e => { const files = [...e.target.files]; e.target.value = ''; await addFiles(files); };
$('#fileImport').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) { $$('.modal-back').forEach(m => m.remove()); importBackup(f); } };

/* =====================================================================
   Khởi động
   ===================================================================== */
async function init() {
  $$('[data-icon]').forEach(el => el.insertAdjacentHTML('afterbegin', ic(el.dataset.icon, el.classList.contains('icon-btn') ? 19 : 16)));
  loadPrefs(); applyStaticI18n();
  try { await DB.open(); } catch (err) { toast(t('Trình duyệt không cho lưu dữ liệu (IndexedDB). Hãy mở bằng Chrome/Safari bản mới.'), true); return; }
  const [st, bo, fi, sc, se] = await Promise.all([DB.all('students'), DB.all('boards'), DB.all('files'), DB.all('schedule'), DB.get('settings', 'main')]);
  S.students = st; S.boards = bo; S.files = fi; sc.forEach(x => S.sched.set(x.id, x));
  if (se) { delete se.clientId; delete se.apiKey; S.settings = { ...S.settings, ...se }; }
  S.studentId = (S.settings.lastStudent === 'all' || studentById(S.settings.lastStudent)) ? S.settings.lastStudent : 'all';
  renderToolbar(); bindTopbar(); applyTheme(); setTool(E.tool); initResizers();
  renderSidebar(); renderPanel(); renderProfileCard();
  new ResizeObserver(resize).observe(wrap); resize();
  let b = S.boards.find(x => x.id === S.settings.lastBoard) || boardsOf(S.studentId)[0];
  if (!b) b = await createBoard(S.studentId, false);
  if (b.studentId !== S.studentId) { S.studentId = b.studentId; renderSidebar(); }
  await openBoard(b.id); renderPanel();
  if (innerWidth <= 900) $('#app').classList.add('focus');
  showWelcome(true); // luôn giới thiệu khi vào trang
  document.fonts && document.fonts.ready.then(() => { bbCache = new WeakMap(); requestRender(true); });
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
init().catch(err => {
  console.error(err);
  toast(t('Không khởi động được Vincenink: {m}. Hãy tải lại trang.', { m: err && err.message || err }), true);
});
