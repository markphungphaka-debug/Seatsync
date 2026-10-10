import { useState } from "react";

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
    id: "f2-reading", floor: "ชั้น 2", zone: "พื้นที่นั่งอ่าน", zoneEn: "Reading Zone", prefix: "A",
    count: 30, bookedIdx: [2, 9, 20, 27],
    viewBox: MAP_VIEWBOX, outline: DIAMOND_OUTLINE,
    split: true, cols: 3,
    leftRect: { x0: 55, y0: 150, w: 120, h: 150 },
    rightRect: { x0: 205, y0: 150, w: 120, h: 150 },
  },
  {
    id: "f3-pavilion", floor: "ชั้น 3", zone: "Pavilion Zone", zoneEn: "พื้นที่นั่งอ่าน", prefix: "P",
    count: 39, bookedIdx: [5, 14, 22, 31],
    viewBox: MAP_VIEWBOX, outline: TRIANGLE_OUTLINE,
    cols: 6,
    area: { x0: 55, y0: 110, w: 270, h: 175 },
  },
  {
    id: "f3-nook", floor: "ชั้น 3", zone: "มุมอ่านริมชั้นหนังสือ", zoneEn: "Reading Nook", prefix: "N",
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
  let positions;
  let aisleX = null;

  if (activeZone.split) {
    const half = Math.ceil(seats.length / 2);
    const left = gridPoints(half, activeZone.cols, activeZone.leftRect);
    const right = gridPoints(seats.length - half, activeZone.cols, activeZone.rightRect);
    positions = [...left, ...right];
    aisleX = activeZone.leftRect.x0 + activeZone.leftRect.w + (activeZone.rightRect.x0 - (activeZone.leftRect.x0 + activeZone.leftRect.w)) / 2;
  } else {
    positions = gridPoints(seats.length, activeZone.cols, activeZone.area);
  }

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
        <span style={styles.legendItem}><i style={{ ...styles.legendDot, background: "#fff", border: "1.5px solid #C9D2E3" }} />ว่าง</span>
        <span style={styles.legendItem}><i style={{ ...styles.legendDot, background: primary }} />เลือกอยู่</span>
        <span style={styles.legendItem}><i style={{ ...styles.legendDot, background: "#F3B4B4" }} />ถูกจอง</span>
      </div>

      <div style={styles.floorSvgWrap}>
        <svg viewBox={activeZone.viewBox} style={styles.floorSvg}>
          <polygon points={activeZone.outline} fill="#fff" stroke={line} strokeWidth="2.5" />
          {aisleX !== null && (
            <line
              x1={aisleX} y1={activeZone.leftRect.y0 - 14}
              x2={aisleX} y2={activeZone.leftRect.y0 + activeZone.leftRect.h + 14}
              stroke="#C9D2E3" strokeWidth="2" strokeDasharray="5 5"
            />
          )}
          {seats.map((s, i) => {
            const p = positions[i];
            const isSel = selectedSeat?.id === s.id;
            const fill = s.booked ? "#F3B4B4" : isSel ? primary : "#EAF1FF";
            const stroke = s.booked ? "#D64545" : isSel ? primary : "#C9D2E3";
            const textColor = s.booked ? "#D64545" : isSel ? "#fff" : ink;
            const fontSize = Math.max(9, Math.min(p.w, p.h) * 0.46);
            return (
              <g
                key={s.id}
                onClick={() => onPick(s)}
                style={{ cursor: s.booked ? "not-allowed" : "pointer" }}
              >
                <rect x={p.cx - p.w / 2} y={p.cy - p.h / 2} width={p.w} height={p.h} rx="6" fill={fill} stroke={stroke} strokeWidth="1.6" />
                <text
                  x={p.cx} y={p.cy} textAnchor="middle" dominantBaseline="central"
                  fontSize={fontSize} fontWeight="700" fill={textColor}
                  style={{ fontFamily: "'Noto Sans Thai', sans-serif", pointerEvents: "none" }}
                >
                  {s.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p style={styles.caption}>
        {selectedSeat ? `เลือกอยู่: โต๊ะ ${selectedSeat.id}` : "แตะโต๊ะที่ว่างบนผังเพื่อเลือก"} · จองล่วงหน้าได้สูงสุด 7 วัน
      </p>

      <button style={{ ...styles.btnPrimaryBlock, opacity: selectedSeat ? 1 : 0.4 }} disabled={!selectedSeat} onClick={onNext}>
        ดำเนินการต่อ
      </button>
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

function RealQrCode({ value }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=0&data=${encodeURIComponent(value)}`;
  return <img src={src} alt="QR Code เช็กอิน" style={styles.qrImg} />;
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

  bottomNav: { display: "flex", borderTop: `1px solid ${line}`, background: "#fff", padding: "8px 0 10px" },
  navItem: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, border: "none", background: "transparent", cursor: "pointer", fontFamily: "'Noto Sans Thai', sans-serif" },
  navLabel: { fontSize: 10.5, fontWeight: 500 },
};
