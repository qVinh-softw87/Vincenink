/* =====================================================================
   Vincenink — Trợ lý AI (Vercel Serverless Function)
   Gọi Claude qua Anthropic API. Khoá API chỉ nằm ở máy chủ (biến môi trường),
   không bao giờ gửi xuống trình duyệt.

   Biến môi trường trên Vercel (Settings → Environment Variables):
     ANTHROPIC_API_KEY       bắt buộc — khoá API Anthropic
     ANTHROPIC_MODEL         tuỳ chọn — mặc định "claude-haiku-5-5"
     VINCENINK_ACCESS_CODE   tuỳ chọn — nếu đặt, chỉ ai nhập đúng mã này
                             (trong Cài đặt của trang) mới dùng được trợ lý
   ===================================================================== */
'use strict';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

// Giới hạn tần suất đơn giản theo IP (trong bộ nhớ của từng phiên bản hàm)
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000, max = 40;
  const arr = (hits.get(ip) || []).filter(t => now - t < win);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}

const clip = (s, n) => String(s == null ? '' : s).slice(0, n);

function systemPrompt(mode, lang, ctx) {
  const vi = lang !== 'en';
  const ctxText = JSON.stringify(ctx || {}, null, 0).slice(0, 6000);
  const base = vi
    ? `Bạn là "Vincenink" — trợ lý AI thân thiện (biểu tượng là một chú chó nhỏ) trong một ứng dụng bảng trắng dạy học dành cho giáo viên và gia sư Việt Nam. Luôn trả lời bằng tiếng Việt tự nhiên, xưng "mình" và gọi người dùng là "thầy/cô" (hoặc theo tên nếu biết). Không bịa đặt thông tin về học sinh hay lịch học ngoài dữ liệu được cung cấp.`
    : `You are "Vincenink", a friendly AI assistant (a small dog mascot) inside a whiteboard app for teachers and tutors. Always answer in natural English. Never invent facts about students or the schedule beyond the data provided.`;
  const data = (vi ? '\n\nDữ liệu hiện tại của giáo viên (JSON):\n' : '\n\nTeacher context (JSON):\n') + ctxText;
  if (mode === 'daily') {
    return base + data + (vi
      ? `\n\nNhiệm vụ: viết LỜI CHÀO MỖI NGÀY cho giáo viên, 2–3 câu, tối đa 55 từ, ấm áp và tích cực, phù hợp thời điểm trong ngày (sáng/chiều/tối theo "time"). Nếu "todayLessons" có buổi học, nhắc ngắn gọn số buổi và buổi gần nhất (giờ, học sinh, môn); nếu không có, chúc một ngày nhẹ nhàng để chuẩn bị bài. Kết thúc bằng một lời chúc năng suất. Có thể dùng tối đa 1 emoji. Chỉ trả về đoạn văn, không tiêu đề, không markdown.`
      : `\n\nTask: write a DAILY GREETING for the teacher: 2–3 sentences, at most 55 words, warm and positive, matching the time of day in "time". If "todayLessons" has lessons, briefly mention how many and the next one (time, student, subject); otherwise wish them a calm prep day. End with a wish for a productive day. At most one emoji. Return only the paragraph, no title, no markdown.`);
  }
  if (mode === 'note') {
    return base + data + (vi
      ? `\n\nNhiệm vụ: viết MỘT GHI CHÚ NGẮN cho giáo viên hôm nay — một mẹo dạy học, phương pháp giúp học sinh tiến bộ, hoặc gợi ý liên quan tới môn/học sinh hôm nay (nếu có). Định dạng: dòng 1 là tiêu đề ngắn (tối đa 7 từ, không dấu chấm), dòng 2 trở đi là nội dung tối đa 45 từ. Không markdown, không emoji ở tiêu đề.`
      : `\n\nTask: write ONE SHORT NOTE for the teacher today — a teaching tip, a method that helps students improve, or a suggestion related to today's subjects/students (if any). Format: line 1 is a short title (max 7 words, no period); from line 2, the body in at most 45 words. No markdown, no emoji in the title.`);
  }
  return base + data + (vi
    ? `\n\nBạn giúp giáo viên: soạn bài tập và đáp án, giải thích khái niệm cho học sinh theo độ tuổi, gợi ý giáo án, viết nhận xét học sinh, sắp xếp lịch dạy, ý tưởng hoạt động trên lớp. Trả lời ngắn gọn, rõ ràng, dùng markdown đơn giản (tiêu đề nhỏ, gạch đầu dòng, **in đậm**). Với bài tập, để phần đáp án riêng ở cuối. Công thức toán viết dạng văn bản dễ đọc (vd: x^2 + 3x = 0), không dùng LaTeX.`
    : `\n\nYou help teachers: write exercises with answers, explain concepts at the right level, suggest lesson plans, write student feedback, organise schedules and class activities. Be concise and clear, using simple markdown (small headings, bullet points, **bold**). For exercises, put answers in a separate section at the end. Write maths as readable plain text (e.g. x^2 + 3x = 0), no LaTeX.`);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const configured = !!process.env.ANTHROPIC_API_KEY;
  const needCode = !!process.env.VINCENINK_ACCESS_CODE;

  if (req.method === 'GET') return res.status(200).json({ ok: true, configured, needCode });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!configured) return res.status(503).json({ error: 'not_configured' });
  if (needCode && req.headers['x-access-code'] !== process.env.VINCENINK_ACCESS_CODE) return res.status(401).json({ error: 'bad_code' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ error: 'rate_limited' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const mode = ['chat', 'daily', 'note'].includes(body.mode) ? body.mode : 'chat';
  const lang = body.lang === 'en' ? 'en' : 'vi';

  let messages;
  if (mode === 'chat') {
    const raw = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
    messages = raw
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .map(m => ({ role: m.role, content: clip(m.content, 4000) }));
    while (messages.length && messages[0].role !== 'user') messages.shift();
    if (!messages.length || messages[messages.length - 1].role !== 'user') return res.status(400).json({ error: 'bad_messages' });
  } else {
    const seed = clip(body.seed, 40);
    messages = [{ role: 'user', content: (lang === 'vi' ? 'Viết cho hôm nay. Mã ngẫu nhiên: ' : 'Write it for today. Random seed: ') + seed }];
  }

  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: mode === 'chat' ? 1200 : 300,
        temperature: mode === 'chat' ? 0.6 : 0.9,
        system: systemPrompt(mode, lang, body.context),
        messages,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('Anthropic error', r.status, data && data.error);
      return res.status(502).json({ error: 'upstream', status: r.status, detail: data && data.error && data.error.message });
    }
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    return res.status(200).json({ text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
};
