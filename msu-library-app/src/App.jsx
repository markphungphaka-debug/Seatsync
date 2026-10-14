import { useState, useRef, useLayoutEffect } from "react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap');`;

/* ---------- Real date/time helpers (no hardcoded dates) ---------- */

const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const thaiWeekdaysShort = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

function formatThaiDateFull(date) {
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getUpcomingDays(n = 7) {
  const today = startOfToday();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSlotPast(slot, date) {
  const now = new Date();
  if (!isSameDay(date, now)) return false;
  const [startPart] = slot.split(" - ");
  const [h, m] = startPart.split(":").map(Number);
  const slotStart = new Date(date);
  slotStart.setHours(h, m, 0, 0);
  return slotStart.getTime() < now.getTime();
}

function getCheckinDeadline(slot) {
  if (!slot) return "";
  const [startPart] = slot.split(" - ");
  const [h, m] = startPart.split(":").map(Number);
  const total = h * 60 + m + 15;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} น.`;
}

/* ---------- Real zones, taken from the ชั้น 2 / ชั้น 3 directory signs ---------- */
/* Only actual individual-seating zones are bookable here; service counters, */
/* offices and book-shelf sections from the signs are not seat-booking areas. */

// Seat counts were traced from the marked dots in the two floor-plan photos.
// Each zone also carries the real room outline (diamond for floor 2, triangle for
// floor 3) so the seat grid renders inside the actual room shape, neatly arranged
// in rows/columns with a visible seat number on every seat.
const MAP_VIEWBOX = "0 0 380 400";
const DIAMOND_OUTLINE = "190,20 340,140 280,320 100,320 40,140";
const TRIANGLE_OUTLINE = "190,20 350,260 290,300 90,300 30,260";

const floorZones = [
  {
    id: "f2-reading", plan: "f2", snap: true, points: [[726,662],[746,680],[470,692],[500,692],[530,692],[620,692],[650,692],[680,692],[440,722],[470,722],[500,722],[530,722],[620,722],[650,722],[680,722],[470,752],[500,752],[530,752],[620,752],[650,752],[680,752],[500,782],[530,782],[620,782],[650,782],[680,782],[500,812],[530,812],[620,812],[650,812]], floor: "ชั้น 2", zone: "พื้นที่นั่งอ่าน", zoneEn: "Reading Zone", prefix: "A",
    count: 30, bookedIdx: [2, 9, 20, 27],
    viewBox: MAP_VIEWBOX, outline: DIAMOND_OUTLINE,
    split: true, cols: 3,
    leftRect: { x0: 55, y0: 150, w: 120, h: 150 },
    rightRect: { x0: 205, y0: 150, w: 120, h: 150 },
  },
  {
    id: "f3-pavilion", plan: "f3", snap: true, points: [[624,832],[611,833],[546,834],[558,834],[572,834],[585,834],[598,834],[520,835],[532,835],[454,836],[467,836],[480,836],[493,836],[506,836],[585,846],[598,846],[612,846],[624,846],[638,846],[572,847],[506,848],[520,848],[533,848],[546,848],[559,848],[480,849],[494,849],[454,850],[468,850],[546,860],[560,860],[572,860],[586,860],[598,860],[533,861],[468,862],[480,862],[494,862],[507,862],[520,862],[454,863]], floor: "ชั้น 3", zone: "Pavilion Zone", zoneEn: "พื้นที่นั่งอ่าน", prefix: "P",
    count: 41, bookedIdx: [5, 14, 22, 31],
    viewBox: MAP_VIEWBOX, outline: TRIANGLE_OUTLINE,
    cols: 6,
    area: { x0: 55, y0: 110, w: 270, h: 175 },
  },
  {
    id: "f3-nook", plan: "f3", points: [[534,481],[558,481],[508,506],[534,506],[558,506],[584,506],[350,584],[486,588],[340,594],[360,594],[625,594],[474,601],[330,604],[350,604],[370,604],[642,612],[320,614],[340,614],[360,614],[380,614],[462,614],[310,624],[330,624],[350,624],[370,624],[389,624],[451,626],[660,631],[320,634],[340,634],[360,634],[379,634],[440,638],[310,643],[330,644],[350,644],[369,644],[428,651],[320,653],[340,654],[359,654],[330,663],[416,663],[350,664],[340,673],[404,676]], floor: "ชั้น 3", zone: "มุมอ่านริมชั้นหนังสือ", zoneEn: "Reading Nook", prefix: "N",
    count: 46, bookedIdx: [6, 18, 29, 40],
    viewBox: MAP_VIEWBOX, outline: TRIANGLE_OUTLINE,
    cols: 7,
    area: { x0: 55, y0: 110, w: 270, h: 175 },
  },
];

function zoneLabel(zoneDef) {
  return `${zoneDef.floor} · ${zoneDef.zone}`;
}

function buildZoneSeats(zoneDef) {
  return Array.from({ length: zoneDef.count }, (_, i) => ({
    id: `${zoneDef.prefix}${String(i + 1).padStart(2, "0")}`,
    booked: zoneDef.bookedIdx.includes(i),
  }));
}

function gridPoints(count, cols, rect, pad = 4) {
  const rows = Math.ceil(count / cols);
  const cellW = rect.w / cols;
  const cellH = rect.h / rows;
  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      cx: rect.x0 + cellW * (col + 0.5),
      cy: rect.y0 + cellH * (row + 0.5),
      w: cellW - pad,
      h: cellH - pad,
    };
  });
}



// Wall lines traced from the floor-plan signs (same pixel space as the seat dots),
// so every seat is drawn at its real spot inside the real room.
const FLOOR_PLANS = {
  f2: {
    walls: [
      [[548,375],[605,375],[920,700],[692,932],[692,998],[463,998],[463,932],[231,700],[548,375]],
    ],
    lines: [
      [[421,688],[548,555],[604,555],[656,610]],
      [[500,654],[512,634],[642,634],[660,654],[642,674],[512,674],[500,654]],
      [[377,555],[462,645]],
      [[320,617],[405,705]],
      [[322,792],[382,730],[465,822]],
      [[352,820],[392,780],[452,835]],
      [[410,880],[452,835]],
      [[684,640],[830,787]],
      [[775,735],[860,645]],
      [[717,792],[765,745]],
      [[650,860],[700,812],[745,877]],
      [[463,932],[525,932],[525,998]],
      [[631,998],[631,932],[692,932]],
    ],
    labels: [
      { x: 576, y: 470, t: "ศูนย์สารนิเทศอีสานฯ" },
      { x: 400, y: 612, t: "สำนักงาน" },
      { x: 300, y: 700, t: "ห้องประชุม 2" },
      { x: 768, y: 832, t: "สอบถาม" },
      { x: 682, y: 893, t: "ยืม-คืน" },
      { x: 360, y: 790, t: "ห้องน้ำ" },
      { x: 800, y: 760, t: "ห้องน้ำ" },
      { x: 580, y: 656, t: "บันได" },
      { x: 494, y: 968, t: "ลิฟต์" },
      { x: 578, y: 968, t: "▲ ทางเข้า-ออก", strong: true },
    ],
  },
  f3: {
    walls: [
      [[519,374],[577,372],[909,725],[910,747],[882,777],[862,777],[862,822],[819,822],[819,801],[630,801],[630,825],[475,827],[475,805],[292,806],[291,829],[250,829],[250,785],[232,785],[204,757],[204,735],[519,374]],
    ],
    lines: [
      [[507,577],[595,577],[605,590],[703,695],[677,724],[428,727],[402,700],[502,590],[507,577]],
      [[515,580],[587,580],[587,604],[515,604],[515,580]],
      [[502,400],[550,447]],
      [[550,447],[452,550]],
      [[550,447],[747,655]],
      [[410,500],[452,550]],
      [[352,570],[402,610]],
      [[260,675],[337,730],[292,770]],
      [[745,695],[800,632]],
      [[780,740],[850,662]],
      [[475,782],[680,780]],
      [[745,780],[860,778]],
    ],
    labels: [
      { x: 657, y: 522, t: "หนังสือภาษาไทย" },
      { x: 470, y: 462, t: "หนังสือต่างประเทศ" },
      { x: 405, y: 535, t: "นวนิยาย" },
      { x: 852, y: 735, t: "อ้างอิง 900" },
      { x: 350, y: 778, t: "สารสนเทศ" },
      { x: 553, y: 760, t: "Pavilion Zone", strong: true },
      { x: 712, y: 770, t: "พื้นที่พักผ่อน" },
      { x: 300, y: 690, t: "ห้องน้ำ" },
      { x: 803, y: 690, t: "ห้องน้ำ" },
      { x: 551, y: 594, t: "บันได" },
      { x: 495, y: 795, t: "ลิฟต์" },
    ],
  },
};

// Seats are placed at the REAL positions of the red dots marked on the floor-plan
// photos. Points are scaled so the closest two seats still have a comfortable
// gap, numbered row by row, and the map can be zoomed for easy tapping.
const SEAT_SIZE = 30;
const layoutCache = {};
function minSpacing(pts) {
  let m = Infinity;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++)
      m = Math.min(m, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
  return m;
}
function layoutZone(zoneDef) {
  if (layoutCache[zoneDef.id]) return layoutCache[zoneDef.id];
  const plan = FLOOR_PLANS[zoneDef.plan];
  const pts = zoneDef.points;
  const minNN = minSpacing(pts);
  const k = SEAT_SIZE / (minNN * 0.8);
  const all = [...pts, ...plan.walls.flat()];
  const x0 = Math.min(...all.map((p) => p[0]));
  const y0 = Math.min(...all.map((p) => p[1]));
  const x1 = Math.max(...all.map((p) => p[0]));
  const y1 = Math.max(...all.map((p) => p[1]));
  const pad = 30;
  const tx = (x) => (x - x0) * k + pad;
  const ty = (y) => (y - y0) * k + pad;

  // group dots into rows and number them left -> right, top -> bottom
  const sorted = pts.map((p) => ({ x: p[0], y: p[1] })).sort((a, b) => a.y - b.y);
  const rows = [];
  sorted.forEach((p) => {
    const last = rows[rows.length - 1];
    if (last && p.y - last[0].y < minNN * 0.6) last.push(p);
    else rows.push([p]);
  });
  const positions = rows
    .flatMap((row) => {
      const my = row.reduce((a, p) => a + p.y, 0) / row.length;
      return row.sort((a, b) => a.x - b.x).map((p) => ({ x: p.x, y: zoneDef.snap ? my : p.y }));
    })
    .map((p) => ({ cx: tx(p.x), cy: ty(p.y) }));

  const toPts = (poly) => poly.map(([x, y]) => `${tx(x).toFixed(1)},${ty(y).toFixed(1)}`).join(" ");
  const others = floorZones
    .filter((z) => z.plan === zoneDef.plan && z.id !== zoneDef.id)
    .flatMap((z) => z.points.map(([x, y]) => ({ cx: tx(x), cy: ty(y) })));
  const cxs = positions.map((p) => p.cx), cys = positions.map((p) => p.cy);
  const res = {
    k, positions, others,
    walls: plan.walls.map(toPts),
    lines: plan.lines.map(toPts),
    labels: plan.labels.map((l) => ({ ...l, x: tx(l.x), y: ty(l.y) })),
    width: (x1 - x0) * k + pad * 2,
    height: (y1 - y0) * k + pad * 2,
    focus: { x: (Math.min(...cxs) + Math.max(...cxs)) / 2, y: (Math.min(...cys) + Math.max(...cys)) / 2 },
  };
  layoutCache[zoneDef.id] = res;
  return res;
}

function buildInitialSeatsByZone() {
  const map = {};
  floorZones.forEach((z) => { map[z.id] = buildZoneSeats(z); });
  return map;
}

const timeSlots = ["08:00 - 10:00", "10:00 - 12:00", "13:00 - 15:00", "15:00 - 17:00", "17:00 - 19:00", "19:00 - 21:00"];

const seedBookingDate = new Date();
seedBookingDate.setDate(seedBookingDate.getDate() + 1);

const myBookingsSeed = [
  {
    id: "BK-2049",
    seat: `A03 ${zoneLabel(floorZones[0])}`,
    date: formatThaiDateFull(seedBookingDate),
    slot: "13:00 - 15:00 น.",
    checkinDeadline: "13:15 น.",
    status: "กำลังจะถึง",
  },
];

function getFloorOverview(seatsByZone) {
  return floorZones.map((z) => {
    const seats = seatsByZone[z.id];
    const free = seats.filter((s) => !s.booked).length;
    return { id: z.id, label: zoneLabel(z), free, total: seats.length };
  });
}

const notifications = [
  { title: "ใกล้ถึงเวลาจอง", body: "อย่าลืมเช็กอินที่โต๊ะ A03 ภายใน 13:15 น.", time: "5 นาทีที่แล้ว" },
  { title: "จองสำเร็จ", body: `คุณจองโต๊ะ A03 ${zoneLabel(floorZones[0])} เรียบร้อยแล้ว`, time: "เมื่อวาน" },
  { title: "ยกเลิกอัตโนมัติ", body: "การจองโต๊ะ P08 ถูกยกเลิกเนื่องจากไม่เช็กอินตามเวลา", time: "3 วันที่แล้ว" },
];

export default function App() {
  const [screen, setScreen] = useState("login");
  const [tab, setTab] = useState("home");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [seatsByZone, setSeatsByZone] = useState(buildInitialSeatsByZone);
  const [activeZoneId, setActiveZoneId] = useState(floorZones[0].id);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => startOfToday());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookings, setBookings] = useState(myBookingsSeed);
  const [activeBooking, setActiveBooking] = useState(null);
  const upcomingDates = getUpcomingDays(7);

  const activeZone = floorZones.find((z) => z.id === activeZoneId);
  const seats = seatsByZone[activeZoneId];

  const allSeatsFlat = Object.values(seatsByZone).flat();
  const availableCount = allSeatsFlat.filter((s) => !s.booked).length;
  const bookedCount = allSeatsFlat.filter((s) => s.booked).length;

  const changeZone = (zoneId) => {
    setActiveZoneId(zoneId);
    setSelectedSeat(null);
  };

  const login = () => {
    setUser({ name: studentId ? "เมย์" : "นิสิต", studentId: studentId || "65010123456" });
    setScreen("app");
    setTab("home");
  };

  const goSeatmap = () => {
    setScreen("app");
    setTab("home");
    setSelectedSeat(null);
    setView("seatmap");
  };

  const [view, setView] = useState("home"); // home | seatmap | time | confirm | checkin
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem("seatsync_seen_guide"); } catch (e) { return true; }
  });
  const closeWelcome = () => {
    try { localStorage.setItem("seatsync_seen_guide", "1"); } catch (e) {}
    setShowWelcome(false);
  };

  const pickSeat = (seat) => {
    if (seat.booked) return;
    setSelectedSeat(seat);
  };

  const confirmSeatChoice = () => {
    if (!selectedSeat) return;
    setSelectedDate(startOfToday());
    setSelectedSlot(null);
    setView("time");
  };

  const openScanTable = () => setView("scanTable");
  const openScanOverview = () => setView("scanOverview");

  const handleTableScanned = () => {
    const candidates = [];
    floorZones.forEach((z) => {
      seatsByZone[z.id].forEach((s) => {
        if (!s.booked) candidates.push({ zoneId: z.id, seat: s });
      });
    });
    if (candidates.length === 0) return;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    setActiveZoneId(picked.zoneId);
    setSelectedSeat(picked.seat);
    setSelectedDate(startOfToday());
    setSelectedSlot(null);
    setView("time");
  };

  const confirmBooking = () => {
    const booking = {
      id: "BK-" + Math.floor(1000 + Math.random() * 9000),
      seat: `${selectedSeat.id} ${zoneLabel(activeZone)}`,
      date: formatThaiDateFull(selectedDate),
      slot: `${selectedSlot} น.`,
      checkinDeadline: getCheckinDeadline(selectedSlot),
      status: "กำลังจะถึง",
    };
    setBookings((prev) => [booking, ...prev]);
    setActiveBooking(booking);
    setSeatsByZone((prev) => ({
      ...prev,
      [activeZoneId]: prev[activeZoneId].map((s) => (s.id === selectedSeat.id ? { ...s, booked: true } : s)),
    }));
    setView("confirm");
  };

  const logout = () => {
    setUser(null);
    setScreen("login");
    setStudentId("");
    setPassword("");
  };

  return (
    <div style={styles.appFrame}>
      <style>{FONT_IMPORT}</style>
      <div style={styles.phone}>
        {showWelcome && (
          <div style={styles.welcomeOverlay} onClick={closeWelcome}>
            <div style={styles.welcomeCard} onClick={(e) => e.stopPropagation()}>
              <div style={styles.welcomeIcon}>📖</div>
              <div style={styles.welcomeTitle}>ยินดีต้อนรับสู่ SeatSync</div>
              <div style={styles.welcomeText}>
                ใช้งานครั้งแรกใช่ไหม? ดูวิธีจองที่นั่งและวิธีสแกน QR สำหรับ Walk-in ได้ในไม่กี่นาที
              </div>
              <a
                href="/guide.html"
                target="_blank"
                rel="noopener"
                onClick={closeWelcome}
                style={styles.welcomePrimary}
              >
                ดูวิธีการใช้งาน
              </a>
              <button style={styles.welcomeSkip} onClick={closeWelcome}>ข้าม เริ่มใช้งานเลย</button>
            </div>
          </div>
        )}
        {screen === "login" ? (
          <LoginScreen
            studentId={studentId}
            setStudentId={setStudentId}
            password={password}
            setPassword={setPassword}
            onLogin={login}
          />
        ) : (
          <div style={styles.appBody}>
            <div style={styles.screenArea}>
              {tab === "home" && view === "home" && (
                <HomeScreen
                  user={user}
                  availableCount={availableCount}
                  bookedCount={bookedCount}
                  bookings={bookings}
                  onSeatmap={() => setView("seatmap")}
                  onScanTable={openScanTable}
                  onScanOverview={openScanOverview}
                  onOpenBooking={(b) => {
                    setActiveBooking(b);
                    setView("checkin");
                  }}
                />
              )}

              {tab === "home" && view === "scanTable" && (
                <ScanTableScreen onBack={() => setView("home")} onScanned={handleTableScanned} />
              )}

              {tab === "home" && view === "scanOverview" && (
                <ScanOverviewScreen
                  floors={getFloorOverview(seatsByZone)}
                  onBack={() => setView("home")}
                  onGoSeatmap={(zoneId) => { changeZone(zoneId); setView("seatmap"); }}
                />
              )}

              {tab === "home" && view === "seatmap" && (
                <SeatMapScreen
                  seats={seats}
                  zones={floorZones}
                  activeZone={activeZone}
                  activeZoneId={activeZoneId}
                  onChangeZone={changeZone}
                  selectedSeat={selectedSeat}
                  onPick={pickSeat}
                  onBack={() => setView("home")}
                  onNext={confirmSeatChoice}
                />
              )}

              {tab === "home" && view === "time" && (
                <TimeScreen
                  seat={selectedSeat}
                  zoneLabelText={zoneLabel(activeZone)}
                  dates={upcomingDates}
                  selectedDate={selectedDate}
                  onSelectDate={(d) => { setSelectedDate(d); setSelectedSlot(null); }}
                  selectedSlot={selectedSlot}
                  setSelectedSlot={setSelectedSlot}
                  onBack={() => setView("seatmap")}
                  onNext={confirmBooking}
                />
              )}

              {tab === "home" && view === "confirm" && (
                <ConfirmScreen
                  booking={activeBooking}
                  onShowQr={() => setView("checkin")}
                  onMyBookings={() => {
                    setTab("bookings");
                    setView("home");
                  }}
                />
              )}

              {tab === "home" && view === "checkin" && (
                <CheckinScreen booking={activeBooking} onBack={() => { setView("home"); setTab("home"); }} />
              )}

              {tab === "bookings" && (
                <BookingsScreen
                  bookings={bookings}
                  onOpen={(b) => {
                    setActiveBooking(b);
                    setTab("home");
                    setView("checkin");
                  }}
                  onCancel={(id) => setBookings((prev) => prev.filter((b) => b.id !== id))}
                />
              )}

              {tab === "alerts" && <AlertsScreen />}

              {tab === "profile" && <ProfileScreen user={user} onLogout={logout} />}
            </div>

            <BottomNav tab={tab} setTab={(t) => { setTab(t); setView("home"); }} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Screens ---------- */

function LoginScreen({ studentId, setStudentId, password, setPassword, onLogin }) {
  return (
    <div style={{ ...styles.screen, justifyContent: "center", padding: "0 28px" }}>
      <div style={styles.brandBlock}>
        <div style={styles.logoMark}>S</div>
        <p style={styles.brandName}>SeatSync</p>
        <p style={styles.brandSub}>หอสมุด มหาวิทยาลัยมหาสารคาม</p>
      </div>

      <p style={styles.loginHint}>เข้าสู่ระบบด้วยบัญชีนิสิต</p>

      <label style={styles.label}>
        รหัสนิสิต
        <input
          style={styles.input}
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="เช่น 65010123456"
        />
      </label>
      <label style={styles.label}>
        รหัสผ่าน
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </label>

      <button style={styles.btnPrimaryBlock} onClick={onLogin}>เข้าสู่ระบบ</button>
      <div style={styles.dividerRow}>
        <span style={styles.dividerLine} />
        <span style={styles.dividerText}>หรือ</span>
        <span style={styles.dividerLine} />
      </div>
      <button style={styles.btnGhostBlock} onClick={onLogin}>เข้าสู่ระบบด้วย SSO มหาวิทยาลัย</button>
      <p style={styles.signupText}>ยังไม่มีบัญชี? <span style={styles.linkText}>สมัครสมาชิก</span></p>

      <a href="/guide.html" target="_blank" rel="noopener" style={styles.guideLinkLogin}>
        📘 ดูวิธีใช้งานระบบก่อนเข้าสู่ระบบ
      </a>
    </div>
  );
}

function HomeScreen({ user, availableCount, bookedCount, bookings, onSeatmap, onScanTable, onScanOverview, onOpenBooking }) {
  return (
    <div style={styles.screen}>
      <div style={styles.topRow}>
        <div>
          <p style={styles.greetSmall}>สวัสดี,</p>
          <p style={styles.greetName}>{user?.name} 👋</p>
        </div>
        <div style={styles.bellDot}>🔔</div>
      </div>

      <p style={styles.h2}>ภาพรวมวันนี้</p>
      <div style={styles.statRow}>
        <div style={{ ...styles.statCard, background: "#EAF1FF" }}>
          <p style={{ ...styles.statNum, color: primary }}>{availableCount}</p>
          <p style={styles.statLabel}>ที่ว่าง</p>
        </div>
        <div style={{ ...styles.statCard, background: "#FDEDED" }}>
          <p style={{ ...styles.statNum, color: "#D64545" }}>{bookedCount}</p>
          <p style={styles.statLabel}>ถูกจองแล้ว</p>
        </div>
      </div>

      <button style={styles.btnPrimaryBlock} onClick={onSeatmap}>ดูแผนผังโต๊ะ</button>

      <p style={{ ...styles.h2, marginTop: 22 }}>สำหรับคนที่เดินมาถึงแล้ว (Walk-in)</p>
      <div style={styles.scanRow}>
        <button style={styles.scanCard} onClick={onScanTable}>
          <span style={styles.scanCardIcon}>📷</span>
          <span style={styles.scanCardTitle}>สแกน QR ที่โต๊ะ</span>
          <span style={styles.scanCardSub}>จองโต๊ะที่เห็นว่างได้ทันที</span>
        </button>
        <button style={styles.scanCard} onClick={onScanOverview}>
          <span style={styles.scanCardIcon}>🗺️</span>
          <span style={styles.scanCardTitle}>สแกน QR หน้าทางเข้า</span>
          <span style={styles.scanCardSub}>ดูภาพรวมที่ว่างทุกชั้น</span>
        </button>
      </div>

      <p style={{ ...styles.h2, marginTop: 26 }}>การจองของฉัน</p>
      {bookings.length === 0 ? (
        <p style={styles.emptyText}>ยังไม่มีการจอง</p>
      ) : (
        bookings.map((b) => (
          <button key={b.id} style={styles.bookingCard} onClick={() => onOpenBooking(b)}>
            <div>
              <p style={styles.bookingSeat}>{b.seat}</p>
              <p style={styles.bookingMeta}>{b.date} · {b.slot}</p>
            </div>
            <span style={styles.statusChip}>{b.status}</span>
          </button>
        ))
      )}
    </div>
  );
}

function SeatMapScreen({ seats, zones, activeZone, activeZoneId, onChangeZone, selectedSeat, onPick, onBack, onNext }) {
  return (
    <div style={styles.screen}>
      <ScreenHeader title="แผนผังที่นั่ง" onBack={onBack} />

      <div style={styles.zoneRow}>
        {zones.map((z) => (
          <button
            key={z.id}
            onClick={() => onChangeZone(z.id)}
            style={{ ...styles.zoneChip, ...(z.id === activeZoneId ? styles.zoneChipActive : {}) }}
          >
            {z.floor} · {z.zone}
          </button>
        ))}
      </div>

      <div style={styles.legendRow}>
        <span style={styles.legendItem}><i style={{ ...styles.legendDot, background: "#EAF1FF", border: "1.5px solid #C9D2E3" }} />ว่าง</span>
        <span style={styles.legendItem}><i style={{ ...styles.legendDot, background: primary }} />เลือกอยู่</span>
        <span style={styles.legendItem}><i style={{ ...styles.legendDot, background: "#F3B4B4" }} />ถูกจอง</span>
      </div>

      <ZoomableMap key={activeZoneId} zone={activeZone} seats={seats} selectedSeat={selectedSeat} onPick={onPick} />

      <p style={styles.caption}>
        {selectedSeat ? `เลือกอยู่: โต๊ะ ${selectedSeat.id}` : "แตะโต๊ะที่ว่างบนผังเพื่อเลือก"} · จองล่วงหน้าได้สูงสุด 7 วัน
      </p>

      <button style={{ ...styles.btnPrimaryBlock, opacity: selectedSeat ? 1 : 0.4 }} disabled={!selectedSeat} onClick={onNext}>
        ดำเนินการต่อ
      </button>
    </div>
  );
}

function ZoomableMap({ zone, seats, selectedSeat, onPick }) {
  const L = layoutZone(zone);
  const boxRef = useRef(null);
  const pending = useRef(null);
  const fitScale = 340 / L.width;
  const maxScale = 1.6;
  const [scale, setScale] = useState(() => Math.max(fitScale, Math.min(maxScale, 0.85)));

  // keep the point under the centre of the box in place while zooming
  const centreOf = (sc) => {
    const el = boxRef.current;
    if (!el) return L.focus;
    return { x: (el.scrollLeft + el.clientWidth / 2) / sc, y: (el.scrollTop + el.clientHeight / 2) / sc };
  };
  const zoomTo = (next) => {
    const n = Math.max(fitScale, Math.min(maxScale, next));
    pending.current = centreOf(scale);
    setScale(n);
  };
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const c = pending.current || L.focus;
    el.scrollLeft = c.x * scale - el.clientWidth / 2;
    el.scrollTop = c.y * scale - el.clientHeight / 2;
    pending.current = null;
  }, [scale]);

  const labelSize = 12 / Math.max(scale, 0.35);
  const fontFam = { fontFamily: "'Noto Sans Thai', sans-serif" };

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={styles.zoomBar}>
        <span style={styles.zoomHint}>ซูม / เลื่อนดูตำแหน่งโต๊ะในชั้น</span>
        <button style={styles.zoomBtn} onClick={() => zoomTo(fitScale)} aria-label="ดูทั้งชั้น" title="ดูทั้งชั้น">⤢</button>
        <button style={styles.zoomBtn} onClick={() => zoomTo(scale / 1.4)} aria-label="ซูมออก">−</button>
        <button style={styles.zoomBtn} onClick={() => zoomTo(scale * 1.4)} aria-label="ซูมเข้า">+</button>
      </div>
      <div ref={boxRef} style={styles.mapScroll}>
        <svg
          viewBox={`0 0 ${L.width} ${L.height}`}
          width={L.width * scale}
          height={L.height * scale}
          style={{ display: "block" }}
        >
          {L.walls.map((w, i) => (
            <polygon key={"w" + i} points={w} fill="#fff" stroke="#B8A066" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          ))}
          {L.lines.map((w, i) => (
            <polyline key={"l" + i} points={w} fill="none" stroke="#CDBF97" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          ))}
          {L.labels.map((l, i) => (
            <text key={"t" + i} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="central"
              fontSize={l.strong ? labelSize * 1.1 : labelSize} fontWeight={l.strong ? 700 : 500}
              fill={l.strong ? primary : "#9AA3B5"} style={{ ...fontFam, pointerEvents: "none" }}>
              {l.t}
            </text>
          ))}
          {L.others.map((p, i) => (
            <circle key={"o" + i} cx={p.cx} cy={p.cy} r={SEAT_SIZE * 0.22} fill="#D5DBE7" />
          ))}
          {seats.map((s, i) => {
            const p = L.positions[i];
            if (!p) return null;
            const isSel = selectedSeat?.id === s.id;
            const fill = s.booked ? "#F3B4B4" : isSel ? primary : "#EAF1FF";
            const stroke = s.booked ? "#D64545" : isSel ? primary : "#7E95C9";
            const textColor = s.booked ? "#D64545" : isSel ? "#fff" : ink;
            return (
              <g key={s.id} onClick={() => onPick(s)} style={{ cursor: s.booked ? "not-allowed" : "pointer" }}>
                <rect x={p.cx - SEAT_SIZE / 2} y={p.cy - SEAT_SIZE / 2} width={SEAT_SIZE} height={SEAT_SIZE} rx="7" fill={fill} stroke={stroke} strokeWidth="1.8" />
                <text x={p.cx} y={p.cy} textAnchor="middle" dominantBaseline="central" fontSize="11.5" fontWeight="700" fill={textColor}
                  style={{ ...fontFam, pointerEvents: "none" }}>
                  {s.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ScanTableScreen({ onBack, onScanned }) {
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      onScanned();
    }, 900);
  };

  return (
    <div style={styles.screen}>
      <ScreenHeader title="สแกน QR ที่โต๊ะ" onBack={onBack} />
      <p style={styles.caption}>สำหรับโต๊ะที่เห็นว่างตรงหน้า สแกน QR ที่ติดบนโต๊ะเพื่อจองทันที ไม่ต้องเปิดผังหาเอง</p>

      <div style={styles.viewfinderBox}>
        <span style={{ ...styles.viewfinderCorner, top: 10, left: 10, borderRight: "none", borderBottom: "none" }} />
        <span style={{ ...styles.viewfinderCorner, top: 10, right: 10, borderLeft: "none", borderBottom: "none" }} />
        <span style={{ ...styles.viewfinderCorner, bottom: 10, left: 10, borderRight: "none", borderTop: "none" }} />
        <span style={{ ...styles.viewfinderCorner, bottom: 10, right: 10, borderLeft: "none", borderTop: "none" }} />
        <span style={styles.viewfinderIcon}>{scanning ? "🔎" : "📷"}</span>
      </div>

      <p style={styles.scanStatusText}>{scanning ? "กำลังอ่าน QR Code..." : "เล็งกล้องไปที่ QR บนโต๊ะ"}</p>

      <button style={styles.btnPrimaryBlock} onClick={handleScan} disabled={scanning}>
        {scanning ? "กำลังสแกน..." : "จำลองสแกนสำเร็จ"}
      </button>
      <p style={styles.demoNote}>* ต้นแบบนี้จำลองการสแกนด้วยปุ่ม แทนการเปิดกล้องจริง</p>
    </div>
  );
}

function ScanOverviewScreen({ floors, onBack, onGoSeatmap }) {
  return (
    <div style={styles.screen}>
      <ScreenHeader title="ภาพรวมที่ว่างทุกชั้น" onBack={onBack} />
      <p style={styles.caption}>สแกนจากป้าย QR หน้าทางเข้า เพื่อดูก่อนว่าชั้นไหนมีที่ว่าง ไม่ต้องเดินขึ้นไปสำรวจเอง</p>

      {floors.map((f) => {
        const pct = Math.round((f.free / f.total) * 100);
        return (
          <div key={f.id} style={styles.floorCard}>
            <div style={styles.floorCardTop}>
              <p style={styles.floorLabel}>{f.label}</p>
              <p style={styles.floorCount}>{f.free}/{f.total} ว่าง</p>
            </div>
            <div style={styles.floorBarTrack}>
              <div style={{ ...styles.floorBarFill, width: `${pct}%` }} />
            </div>
            <button style={styles.floorGoBtn} onClick={() => onGoSeatmap(f.id)}>ดูผังที่นั่ง →</button>
          </div>
        );
      })}
    </div>
  );
}

function TimeScreen({ seat, zoneLabelText, dates, selectedDate, onSelectDate, selectedSlot, setSelectedSlot, onBack, onNext }) {
  const today = new Date();
  const slotsForDate = timeSlots.map((s) => ({ slot: s, past: isSlotPast(s, selectedDate) }));
  const allPast = slotsForDate.every((s) => s.past);

  return (
    <div style={styles.screen}>
      <ScreenHeader title="เลือกวันและเวลา" onBack={onBack} />

      <div style={styles.seatInfoCard}>
        <div style={styles.seatIconBox}>🪑</div>
        <div>
          <p style={styles.seatInfoTitle}>โต๊ะ {seat?.id}</p>
          <p style={styles.seatInfoSub}>{zoneLabelText}</p>
        </div>
      </div>

      <p style={styles.fieldLabel}>เลือกวันที่</p>
      <div style={styles.dateRow}>
        {dates.map((d) => {
          const active = isSameDay(d, selectedDate);
          const isToday = isSameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onSelectDate(d)}
              style={{ ...styles.dateChip, ...(active ? styles.dateChipActive : {}) }}
            >
              <span style={{ ...styles.dateChipDay, color: active ? "rgba(255,255,255,.8)" : muted }}>
                {isToday ? "วันนี้" : thaiWeekdaysShort[d.getDay()]}
              </span>
              <span style={styles.dateChipNum}>{d.getDate()}</span>
            </button>
          );
        })}
      </div>
      <p style={styles.dateFull}>📅 {formatThaiDateFull(selectedDate)}</p>

      <p style={{ ...styles.fieldLabel, marginTop: 18 }}>เลือกช่วงเวลา</p>
      <div style={styles.slotGrid}>
        {slotsForDate.map(({ slot: s, past }) => (
          <button
            key={s}
            disabled={past}
            onClick={() => setSelectedSlot(s)}
            style={{
              ...styles.slot,
              ...(selectedSlot === s ? styles.slotActive : {}),
              ...(past ? styles.slotPast : {}),
            }}
          >
            {s}
          </button>
        ))}
      </div>
      {allPast ? (
        <p style={{ ...styles.caption, color: "#D64545" }}>⚠️ ไม่มีช่วงเวลาว่างสำหรับวันนี้แล้ว กรุณาเลือกวันอื่น</p>
      ) : (
        <p style={styles.caption}>⏰ กรุณาเช็กอินภายใน 15 นาทีหลังเวลาเริ่มต้น · ช่วงเวลาที่ผ่านไปแล้วจะถูกปิดอัตโนมัติ</p>
      )}

      <button style={{ ...styles.btnPrimaryBlock, opacity: selectedSlot ? 1 : 0.4 }} disabled={!selectedSlot} onClick={onNext}>
        ยืนยันการจอง
      </button>
    </div>
  );
}

function ConfirmScreen({ booking, onShowQr, onMyBookings }) {
  return (
    <div style={{ ...styles.screen, alignItems: "center", textAlign: "center", paddingTop: 50 }}>
      <div style={styles.successCircle}>✓</div>
      <p style={styles.confirmTitle}>จองสำเร็จ!</p>
      <p style={styles.confirmSeat}>{booking?.seat}</p>

      <div style={styles.confirmCard}>
        <div style={styles.confirmRow}><span>วันที่</span><span>{booking?.date}</span></div>
        <div style={styles.confirmRow}><span>เวลา</span><span>{booking?.slot}</span></div>
        <div style={styles.confirmRow}><span>กรุณาเช็กอินก่อน</span><span style={{ color: "#D64545", fontWeight: 600 }}>{booking?.checkinDeadline}</span></div>
      </div>

      <button style={styles.btnPrimaryBlock} onClick={onShowQr}>แสดง QR Code</button>
      <button style={styles.btnGhostBlock} onClick={onMyBookings}>ดูการจองของฉัน</button>
    </div>
  );
}

function CheckinScreen({ booking, onBack }) {
  return (
    <div style={styles.screen}>
      <ScreenHeader title="เช็กอิน" onBack={onBack} />

      <div style={styles.checkinBanner}>กรุณาเช็กอินภายใน {booking?.checkinDeadline}</div>

      <p style={{ ...styles.h2, textAlign: "center", marginTop: 22 }}>QR Code เช็กอิน</p>
      <div style={styles.qrBox}>
        <RealQrCode value={`SEATSYNC-CHECKIN:${booking?.id}`} />
      </div>
      <p style={styles.qrCodeText}>รหัสเช็กอิน: {booking?.id}</p>

      <p style={styles.confirmSeat}>{booking?.seat}</p>
      <p style={styles.bookingMeta}>{booking?.date} · {booking?.slot}</p>

      <p style={styles.caption}>หากไม่เช็กอินภายในเวลา ระบบจะยกเลิกการจองอัตโนมัติ</p>
    </div>
  );
}

function BookingsScreen({ bookings, onOpen, onCancel }) {
  return (
    <div style={styles.screen}>
      <p style={styles.h1}>การจองของฉัน</p>
      {bookings.length === 0 && <p style={styles.emptyText}>ยังไม่มีการจอง</p>}
      {bookings.map((b) => (
        <div key={b.id} style={styles.bookingListCard}>
          <button style={{ all: "unset", cursor: "pointer", flex: 1 }} onClick={() => onOpen(b)}>
            <p style={styles.bookingSeat}>{b.seat}</p>
            <p style={styles.bookingMeta}>{b.date} · {b.slot}</p>
            <span style={styles.statusChip}>{b.status}</span>
          </button>
          <button style={styles.cancelLink} onClick={() => onCancel(b.id)}>ยกเลิก</button>
        </div>
      ))}
    </div>
  );
}

function AlertsScreen() {
  return (
    <div style={styles.screen}>
      <p style={styles.h1}>แจ้งเตือน</p>
      {notifications.map((n, i) => (
        <div key={i} style={styles.alertCard}>
          <p style={styles.bookingSeat}>{n.title}</p>
          <p style={styles.bookingMeta}>{n.body}</p>
          <p style={styles.alertTime}>{n.time}</p>
        </div>
      ))}
    </div>
  );
}

function ProfileScreen({ user, onLogout }) {
  return (
    <div style={styles.screen}>
      <p style={styles.h1}>โปรไฟล์</p>
      <div style={styles.profileCard}>
        <div style={styles.profileAvatar}>{user?.name?.[0] || "น"}</div>
        <div>
          <p style={styles.bookingSeat}>{user?.name}</p>
          <p style={styles.bookingMeta}>รหัสนิสิต {user?.studentId}</p>
        </div>
      </div>
      <a href="/guide.html" target="_blank" rel="noopener" style={styles.guideLink}>
        📘 คู่มือการใช้งานระบบ
      </a>

      <button style={styles.btnGhostBlock} onClick={onLogout}>ออกจากระบบ</button>
    </div>
  );
}

/* ---------- Shared bits ---------- */

function ScreenHeader({ title, onBack }) {
  return (
    <div style={styles.header}>
      <button style={styles.backBtn} onClick={onBack}>←</button>
      <p style={styles.headerTitle}>{title}</p>
      <span style={{ width: 28 }} />
    </div>
  );
}

/* ---------- Built-in QR code generator (no internet needed) ---------- */
// Byte mode, error-correction level M, versions 1-10 (up to ~200 bytes).
const QR_ECC_M = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const QR_BLOCKS_M = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

function qrGfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
function qrRsDivisor(degree) {
  const r = new Array(degree).fill(0);
  r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = qrGfMul(r[j], root);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    root = qrGfMul(root, 0x02);
  }
  return r;
}
function qrRsRemainder(data, divisor) {
  const r = divisor.map(() => 0);
  for (const b of data) {
    const f = b ^ r.shift();
    r.push(0);
    divisor.forEach((c, i) => { r[i] ^= qrGfMul(c, f); });
  }
  return r;
}
function qrRawModules(ver) {
  let n = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const na = Math.floor(ver / 7) + 2;
    n -= (25 * na - 10) * na - 55;
    if (ver >= 7) n -= 36;
  }
  return n;
}
function qrAlignPositions(ver, size) {
  if (ver === 1) return [];
  const na = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2;
  const res = [6];
  for (let pos = size - 7; res.length < na; pos -= step) res.splice(1, 0, pos);
  return res;
}

function makeQrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  let ver = 1, dataCap = 0;
  for (; ver <= 10; ver++) {
    dataCap = Math.floor(qrRawModules(ver) / 8) - QR_ECC_M[ver] * QR_BLOCKS_M[ver];
    if (4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= dataCap * 8) break;
  }
  if (ver > 10) throw new Error("QR text too long");

  // data bits
  const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4);
  put(bytes.length, ver < 10 ? 8 : 16);
  bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, dataCap * 8 - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let pad = 0xec; data.length < dataCap; pad ^= 0xec ^ 0x11) data.push(pad);

  // error correction + interleave
  const numBlocks = QR_BLOCKS_M[ver], eccLen = QR_ECC_M[ver];
  const raw = Math.floor(qrRawModules(ver) / 8);
  const numShort = numBlocks - (raw % numBlocks);
  const shortLen = Math.floor(raw / numBlocks);
  const div = qrRsDivisor(eccLen);
  const blocks = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1));
    k += dat.length;
    const ecc = qrRsRemainder(dat, div);
    if (i < numShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const codewords = [];
  for (let i = 0; i < blocks[0].length; i++)
    blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= numShort) codewords.push(b[i]); });

  // matrix + function patterns
  const size = ver * 4 + 17;
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const setF = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
  [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) setF(x, y, d !== 2 && d !== 4);
    }
  });
  const ap = qrAlignPositions(ver, size);
  ap.forEach((ax, i) => ap.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
      setF(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const drawFormat = (mask) => {
    const d = (0 << 3) | mask; // level M = 0
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const b = ((d << 10) | rem) ^ 0x5412;
    const bit = (i) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) setF(8, i, bit(i));
    setF(8, 7, bit(6)); setF(8, 8, bit(7)); setF(7, 8, bit(8));
    for (let i = 9; i < 15; i++) setF(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) setF(8, size - 15 + i, bit(i));
    setF(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const b = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((b >>> i) & 1) === 1, a = size - 11 + (i % 3), c = Math.floor(i / 3);
      setF(a, c, dark); setF(c, a, dark);
    }
  }

  // place data (zig-zag)
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
      if (!fn[y][x] && i < codewords.length * 8) {
        mod[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
        i++;
      }
    }
  }

  // choose the mask with the lowest penalty
  const maskFn = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const applyMask = (m) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
      if (!fn[y][x] && maskFn[m](x, y)) mod[y][x] = !mod[y][x];
  };
  const penalty = () => {
    let p = 0, dark = 0;
    for (let a = 0; a < size; a++) {
      let rr = 1, rc = 1;
      for (let b = 1; b < size; b++) {
        if (mod[a][b] === mod[a][b - 1]) { rr++; if (rr === 5) p += 3; else if (rr > 5) p++; } else rr = 1;
        if (mod[b][a] === mod[b - 1][a]) { rc++; if (rc === 5) p += 3; else if (rc > 5) p++; } else rc = 1;
      }
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (mod[y][x]) dark++;
      if (x < size - 1 && y < size - 1 && mod[y][x] === mod[y][x + 1] && mod[y][x] === mod[y + 1][x] && mod[y][x] === mod[y + 1][x + 1]) p += 3;
    }
    const total = size * size;
    p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return p;
  };
  let best = 0, bestP = Infinity;
  for (let m = 0; m < 8; m++) {
    applyMask(m); drawFormat(m);
    const pen = penalty();
    if (pen < bestP) { bestP = pen; best = m; }
    applyMask(m);
  }
  applyMask(best); drawFormat(best);
  return mod;
}

function qrSvgPath(mod) {
  let d = "";
  mod.forEach((row, y) => row.forEach((dark, x) => { if (dark) d += `M${x + 4} ${y + 4}h1v1h-1z`; }));
  return d;
}

function RealQrCode({ value }) {
  const mod = makeQrMatrix(value);
  const n = mod.length + 8;
  return (
    <svg viewBox={`0 0 ${n} ${n}`} style={styles.qrImg} role="img" aria-label="QR Code เช็กอิน" shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#fff" />
      <path d={qrSvgPath(mod)} fill="#000" />
    </svg>
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    { key: "home", label: "หน้าแรก", icon: "🏠" },
    { key: "bookings", label: "การจอง", icon: "📖" },
    { key: "alerts", label: "แจ้งเตือน", icon: "🔔" },
    { key: "profile", label: "โปรไฟล์", icon: "👤" },
  ];
  return (
    <div style={styles.bottomNav}>
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => setTab(it.key)}
          style={{ ...styles.navItem, color: tab === it.key ? primary : "#9AA3B5" }}
        >
          <span style={{ fontSize: 18 }}>{it.icon}</span>
          <span style={styles.navLabel}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- Styles ---------- */

const primary = "#2454E0";
const bg = "#F4F6FB";
const ink = "#1E2433";
const muted = "#7C8598";
const line = "#E4E8F1";

const styles = {
  appFrame: {
    minHeight: "100vh",
    background: "#DCE3F0",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Noto Sans Thai', sans-serif",
    padding: 20,
  },
  phone: {
    width: 390,
    maxWidth: "100%",
    height: 780,
    background: "#fff",
    borderRadius: 28,
    overflow: "hidden",
    boxShadow: "0 20px 50px rgba(20,30,60,.25)",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  appBody: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0 },
  screenArea: { flex: 1, overflowY: "auto", background: bg },
  screen: { display: "flex", flexDirection: "column", padding: "26px 20px 20px", minHeight: "100%" },

  brandBlock: { textAlign: "center", marginBottom: 30, marginTop: 10 },
  logoMark: {
    width: 56, height: 56, borderRadius: 16, background: primary, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 26, fontWeight: 700, margin: "0 auto 10px",
  },
  brandName: { fontSize: 22, fontWeight: 700, color: ink, margin: 0 },
  brandSub: { fontSize: 13, color: muted, margin: "2px 0 0" },
  loginHint: { fontSize: 14, color: muted, marginBottom: 16 },

  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: muted, marginBottom: 14 },
  input: { border: `1px solid ${line}`, borderRadius: 10, padding: "13px 14px", fontSize: 14.5, color: ink, background: "#fff" },

  btnPrimaryBlock: {
    width: "100%", border: "none", background: primary, color: "#fff",
    borderRadius: 12, padding: "14px 0", fontSize: 15, fontWeight: 600,
    cursor: "pointer", marginTop: 8, fontFamily: "'Noto Sans Thai', sans-serif",
  },
  btnGhostBlock: {
    width: "100%", border: `1px solid ${line}`, background: "#fff", color: ink,
    borderRadius: 12, padding: "14px 0", fontSize: 14.5, fontWeight: 500,
    cursor: "pointer", marginTop: 10, fontFamily: "'Noto Sans Thai', sans-serif",
  },
  dividerRow: { display: "flex", alignItems: "center", gap: 10, margin: "16px 0" },
  dividerLine: { flex: 1, height: 1, background: line },
  dividerText: { fontSize: 12.5, color: muted },
  signupText: { textAlign: "center", fontSize: 13, color: muted, marginTop: 16 },
  linkText: { color: primary, fontWeight: 600 },

  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greetSmall: { margin: 0, fontSize: 13, color: muted },
  greetName: { margin: 0, fontSize: 19, fontWeight: 700, color: ink },
  bellDot: { fontSize: 18, background: "#fff", width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,.06)" },

  h1: { fontSize: 19, fontWeight: 700, color: ink, margin: "0 0 16px" },
  h2: { fontSize: 14.5, fontWeight: 600, color: ink, margin: "0 0 10px" },

  statRow: { display: "flex", gap: 12, marginBottom: 18 },
  statCard: { flex: 1, borderRadius: 14, padding: "16px 14px" },
  statNum: { fontSize: 26, fontWeight: 700, margin: 0 },
  statLabel: { fontSize: 12.5, color: muted, margin: "2px 0 0" },

  scanRow: { display: "flex", gap: 10, marginBottom: 6 },
  scanCard: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
    background: "#fff", border: `1px solid ${line}`, borderRadius: 14, padding: "14px 14px",
    cursor: "pointer", textAlign: "left", fontFamily: "'Noto Sans Thai', sans-serif",
  },
  scanCardIcon: { fontSize: 20 },
  scanCardTitle: { fontSize: 13.5, fontWeight: 700, color: ink },
  scanCardSub: { fontSize: 11.5, color: muted, lineHeight: 1.4 },

  viewfinderBox: {
    position: "relative", width: "100%", aspectRatio: "1.1", maxWidth: 240, margin: "18px auto 14px",
    background: "#1E2433", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center",
  },
  viewfinderCorner: { position: "absolute", width: 28, height: 28, border: "3px solid #fff", borderRadius: 4 },
  viewfinderIcon: { fontSize: 44 },
  scanStatusText: { textAlign: "center", fontSize: 13.5, color: muted, marginBottom: 16 },
  demoNote: { textAlign: "center", fontSize: 11.5, color: "#B3BACB", marginTop: 10 },

  floorCard: { background: "#fff", border: `1px solid ${line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 12 },
  floorCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  floorLabel: { margin: 0, fontSize: 14, fontWeight: 700, color: ink, display: "flex", alignItems: "center", gap: 6 },
  floorCount: { margin: 0, fontSize: 13, color: muted },
  floorBarTrack: { height: 8, background: "#EEF1F7", borderRadius: 20, overflow: "hidden", marginBottom: 10 },
  floorBarFill: { height: "100%", background: primary, borderRadius: 20 },
  floorGoBtn: { border: "none", background: "transparent", color: primary, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 },

  emptyText: { fontSize: 13.5, color: muted },
  bookingCard: {
    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#fff", border: `1px solid ${line}`, borderRadius: 14, padding: "14px 16px",
    marginBottom: 10, cursor: "pointer", textAlign: "left", fontFamily: "'Noto Sans Thai', sans-serif",
  },
  bookingSeat: { margin: 0, fontSize: 14.5, fontWeight: 600, color: ink },
  bookingMeta: { margin: "3px 0 0", fontSize: 12.5, color: muted },
  statusChip: { fontSize: 11.5, background: "#EAF1FF", color: primary, padding: "5px 10px", borderRadius: 20, fontWeight: 600 },

  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backBtn: { border: "none", background: "#fff", width: 34, height: 34, borderRadius: 10, fontSize: 15, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,.06)" },
  headerTitle: { fontSize: 15.5, fontWeight: 700, color: ink, margin: 0 },

  zoneRow: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 },
  zoneChip: {
    flexShrink: 0, border: `1px solid ${line}`, background: "#fff", color: ink,
    borderRadius: 20, padding: "8px 14px", fontSize: 12.5, fontWeight: 600,
    cursor: "pointer", fontFamily: "'Noto Sans Thai', sans-serif", whiteSpace: "nowrap",
  },
  zoneChipActive: { background: primary, borderColor: primary, color: "#fff" },

  legendRow: { display: "flex", gap: 16, marginBottom: 16, fontSize: 12.5, color: muted },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3, display: "inline-block" },

  zoomBar: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  zoomHint: { flex: 1, fontSize: 12, color: muted, fontFamily: "'Noto Sans Thai', sans-serif" },
  zoomBtn: { width: 36, height: 36, borderRadius: 10, border: `1px solid ${line}`, background: "#fff", color: primary, fontSize: 22, fontWeight: 700, cursor: "pointer", lineHeight: 1 },
  mapScroll: { background: "#F4F6FB", border: `1px solid ${line}`, borderRadius: 16, padding: 0, overflow: "auto", height: 400, WebkitOverflowScrolling: "touch" },
  floorSvgWrap: { background: "#F4F6FB", border: `1px solid ${line}`, borderRadius: 16, padding: 8, marginBottom: 10 },
  floorSvg: { width: "100%", height: "auto", display: "block" },

  caption: { fontSize: 12, color: muted, marginBottom: 16, lineHeight: 1.5 },

  seatInfoCard: { display: "flex", alignItems: "center", gap: 12, background: "#fff", border: `1px solid ${line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 },
  seatIconBox: { width: 44, height: 44, borderRadius: 12, background: "#EAF1FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 },
  seatInfoTitle: { margin: 0, fontSize: 15, fontWeight: 700, color: ink },
  seatInfoSub: { margin: "2px 0 0", fontSize: 12.5, color: muted },

  fieldLabel: { fontSize: 13, fontWeight: 600, color: ink, margin: "0 0 8px" },
  dateBox: { background: "#fff", border: `1px solid ${line}`, borderRadius: 10, padding: "13px 14px", fontSize: 14, color: ink },

  dateRow: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 10 },
  dateChip: {
    minWidth: 52, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    border: `1px solid ${line}`, background: "#fff", borderRadius: 12, padding: "10px 6px",
    cursor: "pointer", fontFamily: "'Noto Sans Thai', sans-serif", flexShrink: 0,
  },
  dateChipActive: { background: primary, borderColor: primary, color: "#fff" },
  dateChipDay: { fontSize: 11.5 },
  dateChipNum: { fontSize: 16, fontWeight: 700 },
  dateFull: { fontSize: 13, color: muted, margin: "0 0 4px" },

  slotGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 },
  slot: { border: `1px solid ${line}`, background: "#fff", borderRadius: 10, padding: "12px 8px", fontSize: 13.5, color: ink, cursor: "pointer" },
  slotActive: { background: primary, borderColor: primary, color: "#fff" },
  slotPast: { background: "#F1F2F6", color: "#B3BACB", cursor: "not-allowed", textDecoration: "line-through" },

  successCircle: {
    width: 72, height: 72, borderRadius: "50%", background: "#22B573", color: "#fff",
    fontSize: 32, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
  },
  confirmTitle: { fontSize: 20, fontWeight: 700, color: ink, margin: "0 0 4px" },
  confirmSeat: { fontSize: 15, color: muted, margin: "0 0 20px" },
  confirmCard: { width: "100%", background: "#fff", border: `1px solid ${line}`, borderRadius: 14, padding: "16px 18px", marginBottom: 22 },
  confirmRow: { display: "flex", justifyContent: "space-between", fontSize: 13.5, color: ink, padding: "6px 0" },

  checkinBanner: { background: "#E7F3EA", color: "#1F8A4C", textAlign: "center", padding: "12px 0", borderRadius: 12, fontWeight: 600, fontSize: 14 },
  qrBox: { background: "#fff", border: `1px solid ${line}`, borderRadius: 16, padding: 20, margin: "14px auto 10px", width: 200, display: "flex", justifyContent: "center" },
  qrImg: { width: "100%", height: "auto", display: "block" },
  qrCodeText: { fontSize: 12, color: muted, letterSpacing: 0.3, marginBottom: 16 },

  bookingListCard: { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 },
  cancelLink: { border: "none", background: "transparent", color: "#D64545", fontSize: 13, fontWeight: 600, cursor: "pointer" },

  alertCard: { background: "#fff", border: `1px solid ${line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 },
  alertTime: { fontSize: 11.5, color: "#B3BACB", margin: "6px 0 0" },

  profileCard: { display: "flex", alignItems: "center", gap: 14, background: "#fff", border: `1px solid ${line}`, borderRadius: 14, padding: "16px 18px", marginBottom: 20 },
  profileAvatar: { width: 48, height: 48, borderRadius: "50%", background: primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 },
  guideLink: {
    display: "block", textAlign: "center", textDecoration: "none", color: primary,
    background: "#EAF1FF", border: `1px solid ${line}`, borderRadius: 12, padding: "13px 0",
    fontSize: 14, fontWeight: 600, marginBottom: 12, fontFamily: "'Noto Sans Thai', sans-serif",
  },
  guideLinkLogin: {
    display: "block", textAlign: "center", textDecoration: "none", color: primary,
    fontSize: 13, fontWeight: 600, marginTop: 18, fontFamily: "'Noto Sans Thai', sans-serif",
  },

  welcomeOverlay: {
    position: "absolute", inset: 0, zIndex: 50, background: "rgba(20,30,60,.55)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
  },
  welcomeCard: {
    background: "#fff", borderRadius: 20, padding: "26px 22px 18px", width: "100%",
    textAlign: "center", boxShadow: "0 16px 40px rgba(0,0,0,.3)", fontFamily: "'Noto Sans Thai', sans-serif",
  },
  welcomeIcon: { fontSize: 38, marginBottom: 6 },
  welcomeTitle: { fontSize: 18, fontWeight: 700, color: ink, marginBottom: 8 },
  welcomeText: { fontSize: 13.5, color: muted, lineHeight: 1.6, marginBottom: 18 },
  welcomePrimary: {
    display: "block", textDecoration: "none", background: primary, color: "#fff",
    borderRadius: 12, padding: "13px 0", fontSize: 15, fontWeight: 600, marginBottom: 8,
  },
  welcomeSkip: {
    border: "none", background: "transparent", color: muted, fontSize: 13.5, cursor: "pointer",
    padding: "8px 0", fontFamily: "'Noto Sans Thai', sans-serif",
  },

  bottomNav: { display: "flex", borderTop: `1px solid ${line}`, background: "#fff", padding: "8px 0 10px" },
  navItem: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, border: "none", background: "transparent", cursor: "pointer", fontFamily: "'Noto Sans Thai', sans-serif" },
  navLabel: { fontSize: 10.5, fontWeight: 500 },
};
