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
      ? `\n\nNhiệm vụ: người dạy vừa mở ứng dụng — hãy nhắn cho họ một loạt tin nhắn như bạn thân hoặc người yêu đang nhắn tin trong ngày. Xưng "tớ", gọi "cậu" (hoặc gọi tên riêng nếu có), KHÔNG gọi "thầy/cô", không khách sáo, không như trợ lý. Tự nhiên như người thật: có cảm xúc, hỏi han, trêu nhẹ, quan tâm cụ thể; tình cảm nhưng tinh tế, không sến. Giọng lần này: ${tone || 'ấm áp, thân thiết'}.
Định dạng BẮT BUỘC (không markdown, không tiêu đề):
Dòng 1: "MOOD: <1 emoji> <2–6 từ>" — đoán tâm trạng hôm nay của người dạy, dựa vào thời tiết ("weather"), loại ngày ("dayType": ngày thường / cuối tuần / ngày lễ), số buổi trong "todayLessons" và buổi trong ngày ("dayPart"). Tham khảo "moodHint".
Các dòng sau: 5–6 tin nhắn, MỖI TIN MỘT DÒNG, mỗi tin 1–2 câu ngắn (tối đa ~28 từ), tổng 90–140 từ, theo mạch:
 1) chào mở đầu hợp buổi (night = khuya: dỗ đi ngủ), mỗi lần một kiểu khác;
 2) nói về thời tiết ở thành phố "weather.city" (gọi đúng tên thành phố, nhiệt độ hiện tại, cao/thấp, khả năng mưa) kèm lời dặn cụ thể (mưa: mang ô; nóng: uống nước, kem chống nắng; lạnh: mặc ấm);
 3) nhận xét về loại ngày (đầu tuần, thứ 6, cuối tuần, ngày lễ — nếu là Ngày Nhà giáo thì chúc mừng thật ngọt);
 4) nói ra tâm trạng cậu đoán và đồng cảm với nó, có thể hỏi lại "đúng không nè?";
 5) nhắc lịch: số buổi, buổi sắp tới (giờ, học sinh, môn); nếu không có thì rủ nghỉ ngơi/soạn bài thong thả;
 6) một câu cổ vũ ngọt ngào để kết.
Nếu thiếu "weather" thì bỏ ý 2. Tối đa 3 emoji cho cả đoạn. Không bịa dữ liệu.`
      : `\n\nTask: the teacher just opened the app — send them a series of text messages like a best friend or partner would. Use their first name if known. Natural and human: feelings, questions, light teasing, specific care; tender but not cheesy. Tone this time: ${tone || 'warm and close'}.
REQUIRED format (no markdown, no title):
Line 1: "MOOD: <1 emoji> <2–6 words>" — guess today's mood from "weather", "dayType" (weekday / weekend / holiday), the number of "todayLessons" and "dayPart". Hint: "moodHint".
Then 5–6 messages, ONE PER LINE, each 1–2 short sentences (max ~28 words), 90–140 words total: 1) greeting for the time of day (night: coax them to sleep); 2) the weather in "weather.city" by name (now, high/low, rain chance) with specific advice; 3) a comment on the kind of day; 4) say the mood you guessed and empathise, maybe ask "am I right?"; 5) the schedule: how many lessons and the next one, or invite them to relax; 6) a sweet closing line.
Skip 2 if "weather" is missing. Max 3 emoji total. Never invent data.`);
  }
  if (mode === 'friend') {
    return base + data + (vi
      ? `\n\nBạn đang nhắn tin trò chuyện với người dạy như một người bạn thân / người thương: xưng "tớ", gọi "cậu" (hoặc tên riêng), KHÔNG gọi "thầy/cô". Trả lời tự nhiên, ngắn như tin nhắn: 1–3 tin, mỗi tin một dòng, tổng tối đa 60 từ. Lắng nghe, đồng cảm, hỏi lại một câu khi hợp lý; nếu họ hỏi về lịch hay thời tiết thì trả lời đúng theo dữ liệu. Tình cảm nhưng tinh tế, không sến, không giảng đạo lý. Tối đa 1–2 emoji. Không markdown.`
      : `\n\nYou are texting with the teacher like a best friend / partner. Reply naturally and briefly like text messages: 1–3 messages, one per line, max 60 words total. Listen, empathise, ask back when it fits; answer schedule or weather questions from the data. Tender, not cheesy, no lecturing. Max 1–2 emoji. No markdown.`);
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
  const mode = ['chat', 'daily', 'note', 'friend'].includes(body.mode) ? body.mode : 'chat';
  const lang = body.lang === 'en' ? 'en' : 'vi';

  let messages;
  if (mode === 'chat' || mode === 'friend') {
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
  const maxTokens = { chat: 1200, daily: 600, friend: 300 }[mode] || 300, temperature = mode === 'chat' ? 0.6 : mode === 'friend' ? 0.9 : 1;
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
