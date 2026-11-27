/* =====================================================================
   Vincenink — Trợ lý AI (Vercel Serverless Function)
   Khoá API chỉ nằm ở máy chủ (biến môi trường), không bao giờ gửi xuống trình duyệt.
   Tự chọn nhà cung cấp theo khoá có sẵn (ưu tiên từ trên xuống):

     GEMINI_API_KEY    — Google Gemini, có gói MIỄN PHÍ (aistudio.google.com/apikey)
       GEMINI_MODEL      tuỳ chọn, mặc định "gemini-3.6-flash"
     GROQ_API_KEY      — Groq, có gói MIỄN PHÍ (console.groq.com/keys)
       GROQ_MODEL        tuỳ chọn, mặc định "llama-3.3-70b-versatile"
     ANTHROPIC_API_KEY — Claude (trả phí theo lượt dùng)
       ANTHROPIC_MODEL   tuỳ chọn, mặc định "claude-haiku-5-5"

     VINCENINK_ACCESS_CODE  tuỳ chọn — nếu đặt, chỉ ai nhập đúng mã này
                            (trong Cài đặt của trang) mới dùng được trợ lý
   ===================================================================== */
'use strict';

const env = process.env;
function provider() {
  if (env.GEMINI_API_KEY) return 'gemini';
  if (env.GROQ_API_KEY) return 'groq';
  if (env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

/* Gọi từng nhà cung cấp, trả về văn bản */
async function callGemini(system, messages, maxTokens, temperature) {
  const models = [env.GEMINI_MODEL || 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
  let last;
  for (const model of [...new Set(models)]) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { temperature, maxOutputTokens: maxTokens + 1500 },
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      return parts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
    }
    last = { status: r.status, message: data.error && data.error.message };
    if (r.status !== 404 && r.status !== 400) break; // chỉ thử mô hình khác khi không tìm thấy mô hình
  }
  throw Object.assign(new Error('upstream'), last || {});
}
async function callGroq(system, messages, maxTokens, temperature) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.GROQ_API_KEY },
    body: JSON.stringify({ model: env.GROQ_MODEL || 'llama-3.3-70b-versatile', max_tokens: maxTokens, temperature, messages: [{ role: 'system', content: system }, ...messages] }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error('upstream'), { status: r.status, message: data.error && data.error.message });
  return ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
}
async function callAnthropic(system, messages, maxTokens, temperature) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: maxTokens, temperature, system, messages }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error('upstream'), { status: r.status, message: data.error && data.error.message });
  return (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
}

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

function systemPrompt(mode, lang, ctx, tone) {
  const vi = lang !== 'en';
  const ctxText = JSON.stringify(ctx || {}, null, 0).slice(0, 6000);
  const base = vi
    ? `Bạn là "Vincenink" — trợ lý AI thân thiện (biểu tượng là một chú chó nhỏ) trong một ứng dụng bảng trắng dạy học dành cho giáo viên và gia sư Việt Nam. Luôn trả lời bằng tiếng Việt tự nhiên, xưng "mình" và gọi người dùng là "thầy/cô" (hoặc theo tên nếu biết). Không bịa đặt thông tin về học sinh hay lịch học ngoài dữ liệu được cung cấp.`
    : `You are "Vincenink", a friendly AI assistant (a small dog mascot) inside a whiteboard app for teachers and tutors. Always answer in natural English. Never invent facts about students or the schedule beyond the data provided.`;
  const data = (vi ? '\n\nDữ liệu hiện tại của giáo viên (JSON):\n' : '\n\nTeacher context (JSON):\n') + ctxText;
  if (mode === 'daily') {
    return base + data + (vi
      ? `\n\nNhiệm vụ: viết LỜI CHÀO khi người dạy vừa mở ứng dụng. Trong lời chào này hãy nói chuyện thật gần gũi như bạn thân hoặc người yêu đang nhắn tin: xưng "tớ", gọi "cậu" (hoặc gọi tên riêng nếu có), KHÔNG gọi "thầy/cô", không khách sáo. Quan tâm thật lòng, có thể trêu nhẹ, tình cảm nhưng tinh tế, không sến, không suồng sã quá đà. Giọng văn lần này: ${tone || 'ấm áp, thân thiết'}.
Định dạng BẮT BUỘC:
Dòng 1: "MOOD: <1 emoji> <2–5 từ>" — đoán tâm trạng hôm nay của người dạy dựa trên số tiết trong "todayLessons", thứ trong tuần, "dayPart", thời tiết "weather" (gợi ý tham khảo: "moodHint").
Dòng 2: lời chào 2–3 câu, tối đa 60 từ. Đúng thời điểm "dayPart" (morning = sáng, noon = trưa, afternoon = chiều, evening = tối, night = khuya: dỗ đi ngủ). Nếu có "weather", nhắc thời tiết một cách tự nhiên kèm lời dặn (mưa thì mang ô, nóng thì uống nước, lạnh thì mặc ấm). Nếu có buổi học, nhắc số buổi và buổi sắp tới (giờ, học sinh); nếu không, rủ thong thả nghỉ ngơi. Kết bằng một câu cổ vũ ngọt ngào. Mỗi lần mở đầu một kiểu khác. Tối đa 2 emoji. Không tiêu đề, không markdown.`
      : `\n\nTask: write a GREETING for the teacher who just opened the app. Talk like a close best friend or a loving partner texting them: intimate, caring, a little teasing, tender but not cheesy; use their first name if known. Tone this time: ${tone || 'warm and close'}.
REQUIRED format:
Line 1: "MOOD: <1 emoji> <2–5 words>" — guess the teacher's mood today from the number of "todayLessons", weekday, "dayPart" and "weather" (hint: "moodHint").
Line 2: the greeting, 2–3 sentences, at most 60 words. Match "dayPart" (night = coax them to sleep). If "weather" is given, mention it naturally with caring advice (umbrella, water, warm clothes). Mention lessons count and the next one if any; otherwise invite them to relax. End with a sweet word of encouragement. Vary the opening. At most 2 emoji. No title, no markdown.`);
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
  const prov = provider(), configured = !!prov;
  const needCode = !!process.env.VINCENINK_ACCESS_CODE;

  if (req.method === 'GET') return res.status(200).json({ ok: true, configured, provider: prov, needCode });
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

  const system = systemPrompt(mode, lang, body.context, clip(body.tone, 160));
  const maxTokens = mode === 'chat' ? 1200 : 300, temperature = mode === 'chat' ? 0.6 : 1;
  try {
    const call = prov === 'gemini' ? callGemini : prov === 'groq' ? callGroq : callAnthropic;
    const text = await call(system, messages, maxTokens, temperature);
    return res.status(200).json({ text, provider: prov });
  } catch (err) {
    console.error('AI error', prov, err.status, err.message);
    if (err.status === 429) return res.status(429).json({ error: 'rate_limited' });
    return res.status(502).json({ error: 'upstream', status: err.status, detail: err.message });
  }
};
