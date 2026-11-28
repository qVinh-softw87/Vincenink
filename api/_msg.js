// Vincenink: lời nhắn thông báo tự sinh, mỗi lần một kiểu (không rập khuôn).
// Dùng cho máy chủ (api/push-cron.js).
(function (root) {
  const pick = (a, r) => a[Math.floor(r() * a.length) % a.length];
  const WD_VI = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const WD_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dowOf = ds => { const [y, m, d] = ds.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
  const hh = s => +String(s || '0').split(':')[0];
  const leadTxt = (m, vi) => m >= 60 && m % 60 === 0 ? (vi ? `${m / 60} tiếng` : `${m / 60} hour${m > 60 ? 's' : ''}`) : (vi ? `${m} phút` : `${m} min`);
  const line = l => `${l.start}–${l.end} · ${l.who}${l.subject ? ' (' + l.subject + ')' : ''}`;

  const V = {
    mTitle: [
      (n, w) => `☀️ Hôm nay cậu có ${n} buổi dạy`,
      (n, w) => `🌤️ ${w} này cậu đứng lớp ${n} buổi`,
      (n, w) => `☕ Chào buổi sáng! ${n} buổi dạy đang chờ cậu`,
      (n, w) => `📚 Lịch dạy hôm nay: ${n} buổi`,
      (n, w) => `✨ ${n} buổi dạy cho một ${w.toLowerCase()} thật rực rỡ`,
      (n, w) => `🌻 Sẵn sàng chưa? Hôm nay có ${n} buổi`,
      (n, w) => `🎒 ${w}: ${n} buổi dạy, mình làm thật tốt nhé`,
      (n, w) => `🚀 Khởi động ngày mới với ${n} buổi dạy`,
    ],
    mEnd: [
      'Uống ly nước ấm rồi bắt đầu thôi!', 'Dạy vui, kiếm thật nhiều tiền nhé 💸', 'Nhớ ăn sáng đầy đủ nha.',
      'Cậu làm được mà 💪', 'Giữ giọng, uống đủ nước nhé.', 'Mỗi buổi dạy là thêm một bước tới mục tiêu lớn.',
      'Học trò đang chờ thầy/cô tuyệt nhất đó!', 'Hít thở sâu, mỉm cười, và toả sáng thôi ✨', 'Hôm nay chắc chắn sẽ là một ngày tốt.',
    ],
    mEmptyTitle: [
      w => '☀️ Hôm nay cậu không có buổi dạy nào', w => `🌿 Một ${w.toLowerCase()} trống lịch`, w => '🛋️ Hôm nay được nghỉ dạy nè',
      w => '🌈 Ngày tự do của cậu!', w => '☕ Không có tiết nào hôm nay', w => `🍃 ${w} thảnh thơi, không lịch dạy`,
    ],
    mEmptyBody: [
      'Ngủ thêm chút, đi dạo, gặp bạn bè… nạp năng lượng thật đầy nhé.', 'Soạn trước bài cho tuần sau cũng được, nhưng nhớ nghỉ ngơi đó!',
      'Đọc một cuốn sách, nấu một món ngon — cậu xứng đáng mà.', 'Sức khoẻ là vốn quý nhất, hôm nay chăm mình thật kỹ nhé.',
      'Tập thể dục nhẹ, phơi nắng một chút, tinh thần sẽ phơi phới.', 'Nghỉ ngơi cũng là một phần của làm việc giỏi đó 😌',
    ],
    eTitle: [
      n => `🌙 Ngày mai cậu có ${n} buổi`, n => `📅 Lịch ngày mai: ${n} buổi dạy`, n => `🌛 Chuẩn bị cho ngày mai nhé, ${n} buổi đang chờ`,
      n => `⭐ Mai cậu đứng lớp ${n} buổi`, n => `🗓️ Ngày mai bận rộn với ${n} buổi`, n => `🌜 Nhắc nhẹ: mai có ${n} buổi dạy`,
    ],
    eEnd: [
      'Soạn bài xong thì ngủ sớm nha.', 'Sạc pin, chuẩn bị bút, rồi đi ngủ thôi.', 'Ngủ đủ giấc để mai giảng thật hay nhé.',
      'Chúc cậu ngủ ngon, mơ đẹp 🌙', 'Tắt điện thoại sớm một chút cho mắt nghỉ nha.', 'Mai lại là một ngày tuyệt vời, nghỉ ngơi thôi.',
    ],
    eEmptyTitle: ['🌙 Ngày mai cậu được nghỉ', '🛌 Mai không có lịch dạy', '🌟 Ngày mai trống lịch', '🎈 Mai tự do nha', '😴 Ngày mai không có buổi nào'],
    eEmptyBody: [
      'Tối nay cứ thong thả, ngủ ngon nha!', 'Thức khuya một chút xem phim cũng được, nhưng đừng quá nhé 😉',
      'Lên kế hoạch đi chơi hoặc nghỉ ngơi thật đã cho ngày mai nào.', 'Tận hưởng buổi tối nhẹ nhàng nhé, cậu vất vả rồi.',
      'Ngày mai dành cho bản thân thôi 💛',
    ],
    lTitle: [
      (t, l) => `⏰ ${t} nữa: ${l.who}`, (t, l) => `📣 Sắp tới giờ dạy ${l.who}`, (t, l) => `🔔 ${l.who} lúc ${l.start}`,
      (t, l) => `🧑‍🏫 Còn ${t} là vào lớp ${l.who}`, (t, l) => `🕐 ${l.start} dạy ${l.who}, còn ${t}`,
    ],
    lTip: [
      'Mở sẵn bảng và tài liệu nhé.', 'Kiểm tra mic, mạng và bút vẽ trước nha.', 'Uống ngụm nước, hít thở sâu, vào lớp thôi!',
      'Xem lại bài cũ của lớp vài phút nhé.', 'Chuẩn bị một câu hỏi khởi động cho cả lớp nào.', 'Cậu dạy hay lắm, cứ tự tin nhé 💪',
    ],
  };
  const E = {
    mTitle: [
      (n, w) => `☀️ ${n} lesson${n > 1 ? 's' : ''} today`, (n, w) => `🌤️ Teaching ${n} lesson${n > 1 ? 's' : ''} this ${w}`,
      (n, w) => `☕ Good morning! ${n} lesson${n > 1 ? 's' : ''} ahead`, (n, w) => `📚 Today's plan: ${n} lesson${n > 1 ? 's' : ''}`,
      (n, w) => `🚀 Kick off ${w} with ${n} lesson${n > 1 ? 's' : ''}`,
    ],
    mEnd: ['Grab some water and let\'s go!', 'Have fun and earn big today 💸', 'Don\'t skip breakfast.', 'You\'ve got this 💪', 'Smile and shine ✨'],
    mEmptyTitle: [w => '☀️ No lessons today', w => `🌿 A free ${w}`, w => '🛋️ Day off from teaching', w => '🌈 Your free day!'],
    mEmptyBody: ['Sleep in, take a walk, see friends: recharge fully.', 'Read a book, cook something nice. You deserve it.', 'Rest is part of doing great work 😌', 'Take good care of yourself today.'],
    eTitle: [n => `🌙 ${n} lesson${n > 1 ? 's' : ''} tomorrow`, n => `📅 Tomorrow: ${n} lesson${n > 1 ? 's' : ''}`, n => `⭐ Teaching ${n} tomorrow`, n => `🌜 Heads-up: ${n} lesson${n > 1 ? 's' : ''} tomorrow`],
    eEnd: ['Prep, then get some sleep.', 'Charge your devices and rest up.', 'Sleep well and teach great tomorrow.', 'Good night 🌙'],
    eEmptyTitle: ['🌙 No lessons tomorrow', '🛌 Tomorrow is free', '🌟 Nothing scheduled tomorrow', '🎈 Day off tomorrow'],
    eEmptyBody: ['Take it easy tonight and sleep well!', 'Plan something fun for tomorrow.', 'Enjoy a calm evening, you earned it.', 'Tomorrow is all yours 💛'],
    lTitle: [(t, l) => `⏰ In ${t}: ${l.who}`, (t, l) => `📣 ${l.who} is coming up`, (t, l) => `🔔 ${l.who} at ${l.start}`, (t, l) => `🧑‍🏫 ${t} until ${l.who}`],
    lTip: ['Open your board and files.', 'Check mic, network and pen.', 'Sip some water, deep breath, let\'s go!', 'Review last lesson for a minute.', 'You teach brilliantly, go for it 💪'],
  };

  /* kind: 'morning' | 'evening' | 'lead'.  ctx: { date, list, lesson, lead }.  Trả { title, body } */
  function compose(kind, ctx, vi, rnd) {
    const r = rnd || Math.random, P = vi ? V : E, WD = vi ? WD_VI : WD_EN;
    if (kind === 'lead') {
      const l = ctx.lesson, tl = leadTxt(ctx.lead, vi);
      const body = `${l.start}–${l.end}${l.subject ? ' · ' + l.subject : ''}${l.note ? '\n' + l.note : ''}\n${pick(P.lTip, r)}`;
      return { title: pick(P.lTitle, r)(tl, l), body };
    }
    const list = ctx.list || [], n = list.length, w = WD[dowOf(ctx.date)];
    if (kind === 'morning') {
      if (!n) return { title: pick(P.mEmptyTitle, r)(w), body: pick(P.mEmptyBody, r) };
      const first = list[0];
      const hint = vi
        ? (hh(first.start) >= 10 ? `Buổi đầu lúc ${first.start}, vẫn kịp thong thả một ly cà phê.` : hh(first.start) < 8 ? `Buổi đầu ${first.start}, nhanh tay chuẩn bị nhé!` : '')
        : (hh(first.start) >= 10 ? `First one at ${first.start}, time for a coffee.` : '');
      const lines = list.slice(0, 4).map(line).join('\n') + (n > 4 ? (vi ? `\n… và ${n - 4} buổi nữa` : `\n… and ${n - 4} more`) : '');
      return { title: pick(P.mTitle, r)(n, w), body: [lines, hint, pick(P.mEnd, r)].filter(Boolean).join('\n') };
    }
    if (!n) return { title: pick(P.eEmptyTitle, r), body: pick(P.eEmptyBody, r) };
    const f = list[0];
    const intro = vi ? pick([`Buổi đầu ${f.start} với ${f.who}.`, `Mở màn lúc ${f.start} cùng ${f.who}.`, `Bắt đầu từ ${f.start}: ${f.who}.`], r) : `First at ${f.start} with ${f.who}.`;
    const early = hh(f.start) < 8 ? (vi ? ' Mai dạy sớm đó, đặt báo thức nhé ⏰' : ' Early start, set an alarm ⏰') : '';
    return { title: pick(P.eTitle, r)(n), body: `${intro}${early}\n${pick(P.eEnd, r)}` };
  }
  const api = { compose, line, leadTxt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VMsg = api;
})(typeof self !== 'undefined' ? self : this);
