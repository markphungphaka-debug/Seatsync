import { useState } from "react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap');`;

const seatData = Array.from({ length: 16 }, (_, i) => {
  const id = `A${String(i + 1).padStart(2, "0")}`;
  const booked = [5, 9, 14].includes(i);
  return { id, booked };
});

const timeSlots = ["08:00 - 10:00", "10:00 - 12:00", "13:00 - 15:00", "15:00 - 17:00", "17:00 - 19:00", "19:00 - 21:00"];

const myBookingsSeed = [
  { id: "BK-2049", seat: "A03 ชั้น 2 โซน A", date: "20 พฤษภาคม 2567", slot: "13:00 - 15:00 น.", status: "กำลังจะถึง" },
];

const notifications = [
  { title: "ใกล้ถึงเวลาจอง", body: "อย่าลืมเช็กอินที่โต๊ะ A03 ภายใน 13:15 น.", time: "5 นาทีที่แล้ว" },
  { title: "จองสำเร็จ", body: "คุณจองโต๊ะ A03 ชั้น 2 โซน A เรียบร้อยแล้ว", time: "เมื่อวาน" },
  { title: "ยกเลิกอัตโนมัติ", body: "การจองโต๊ะ B11 ถูกยกเลิกเนื่องจากไม่เช็กอินตามเวลา", time: "3 วันที่แล้ว" },
];

export default function App() {
  const [screen, setScreen] = useState("login");
  const [tab, setTab] = useState("home");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [seats, setSeats] = useState(seatData);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookings, setBookings] = useState(myBookingsSeed);
  const [activeBooking, setActiveBooking] = useState(null);

  const availableCount = seats.filter((s) => !s.booked).length;
  const bookedCount = seats.filter((s) => s.booked).length;

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
    setView("time");
  };

  const confirmBooking = () => {
    const booking = {
      id: "BK-" + Math.floor(1000 + Math.random() * 9000),
      seat: `${selectedSeat.id} ชั้น 2 โซน A`,
      date: "20 พฤษภาคม 2567",
      slot: `${selectedSlot} น.`,
      status: "กำลังจะถึง",
    };
    setBookings((prev) => [booking, ...prev]);
    setActiveBooking(booking);
    setSeats((prev) => prev.map((s) => (s.id === selectedSeat.id ? { ...s, booked: true } : s)));
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
                  onOpenBooking={(b) => {
                    setActiveBooking(b);
                    setView("checkin");
                  }}
                />
              )}

              {tab === "home" && view === "seatmap" && (
                <SeatMapScreen
                  seats={seats}
                  selectedSeat={selectedSeat}
                  onPick={pickSeat}
                  onBack={() => setView("home")}
                  onNext={confirmSeatChoice}
                />
              )}

              {tab === "home" && view === "time" && (
                <TimeScreen
                  seat={selectedSeat}
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
    </div>
  );
}

function HomeScreen({ user, availableCount, bookedCount, bookings, onSeatmap, onOpenBooking }) {
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

function SeatMapScreen({ seats, selectedSeat, onPick, onBack, onNext }) {
  return (
    <div style={styles.screen}>
      <ScreenHeader title="แผนผังชั้น 2 โซน A" onBack={onBack} />

      <div style={styles.legendRow}>
        <span style={styles.legendItem}><i style={{ ...styles.legendDot, background: "#fff", border: "1.5px solid #C9D2E3" }} />ว่าง</span>
        <span style={styles.legendItem}><i style={{ ...styles.legendDot, background: primary }} />เลือกอยู่</span>
        <span style={styles.legendItem}><i style={{ ...styles.legendDot, background: "#F3B4B4" }} />ถูกจอง</span>
      </div>

      <div style={styles.seatGrid}>
        {seats.map((s) => {
          const isSel = selectedSeat?.id === s.id;
          return (
            <button
              key={s.id}
              disabled={s.booked}
              onClick={() => onPick(s)}
              style={{
                ...styles.seat,
                ...(s.booked ? styles.seatBooked : {}),
                ...(isSel ? styles.seatSelected : {}),
              }}
            >
              {s.id}
            </button>
          );
        })}
      </div>

      <p style={styles.caption}>เลือกโต๊ะที่ว่างเพื่อดำเนินการต่อ · จองล่วงหน้าได้สูงสุด 3 วัน</p>

      <button style={{ ...styles.btnPrimaryBlock, opacity: selectedSeat ? 1 : 0.4 }} disabled={!selectedSeat} onClick={onNext}>
        ดำเนินการต่อ
      </button>
    </div>
  );
}

function TimeScreen({ seat, selectedSlot, setSelectedSlot, onBack, onNext }) {
  return (
    <div style={styles.screen}>
      <ScreenHeader title="เลือกวันและเวลา" onBack={onBack} />

      <div style={styles.seatInfoCard}>
        <div style={styles.seatIconBox}>🪑</div>
        <div>
          <p style={styles.seatInfoTitle}>โต๊ะ {seat?.id}</p>
          <p style={styles.seatInfoSub}>ชั้น 2 โซน A</p>
        </div>
      </div>

      <p style={styles.fieldLabel}>เลือกวันที่</p>
      <div style={styles.dateBox}>📅 20 พฤษภาคม 2567</div>

      <p style={{ ...styles.fieldLabel, marginTop: 18 }}>เลือกช่วงเวลา</p>
      <div style={styles.slotGrid}>
        {timeSlots.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedSlot(s)}
            style={{ ...styles.slot, ...(selectedSlot === s ? styles.slotActive : {}) }}
          >
            {s}
          </button>
        ))}
      </div>
      <p style={styles.caption}>⏰ กรุณาเช็กอินภายใน 15 นาทีหลังเวลาเริ่มต้น</p>

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
        <div style={styles.confirmRow}><span>กรุณาเช็กอินก่อน</span><span style={{ color: "#D64545", fontWeight: 600 }}>13:15 น.</span></div>
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

      <div style={styles.checkinBanner}>กรุณาเช็กอินภายใน 13:15 น.</div>

      <p style={{ ...styles.h2, textAlign: "center", marginTop: 22 }}>QR Code เช็กอิน</p>
      <div style={styles.qrBox}>
        <QrPlaceholder />
      </div>

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

function QrPlaceholder() {
  const cells = Array.from({ length: 49 }, (_, i) => (i * 37) % 5 === 0 || (i * 13) % 7 === 0);
  return (
    <div style={styles.qrGrid}>
      {cells.map((on, i) => (
        <div key={i} style={{ background: on ? "#1E2433" : "transparent" }} />
      ))}
    </div>
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

  legendRow: { display: "flex", gap: 16, marginBottom: 16, fontSize: 12.5, color: muted },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3, display: "inline-block" },

  seatGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 },
  seat: {
    aspectRatio: "1", border: `1.5px solid ${line}`, background: "#fff", borderRadius: 10,
    fontSize: 12.5, fontWeight: 600, color: ink, cursor: "pointer",
  },
  seatBooked: { background: "#FDEDED", borderColor: "#F3B4B4", color: "#D64545", cursor: "not-allowed" },
  seatSelected: { background: primary, borderColor: primary, color: "#fff" },

  caption: { fontSize: 12, color: muted, marginBottom: 16, lineHeight: 1.5 },

  seatInfoCard: { display: "flex", alignItems: "center", gap: 12, background: "#fff", border: `1px solid ${line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 },
  seatIconBox: { width: 44, height: 44, borderRadius: 12, background: "#EAF1FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 },
  seatInfoTitle: { margin: 0, fontSize: 15, fontWeight: 700, color: ink },
  seatInfoSub: { margin: "2px 0 0", fontSize: 12.5, color: muted },

  fieldLabel: { fontSize: 13, fontWeight: 600, color: ink, margin: "0 0 8px" },
  dateBox: { background: "#fff", border: `1px solid ${line}`, borderRadius: 10, padding: "13px 14px", fontSize: 14, color: ink },

  slotGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 },
  slot: { border: `1px solid ${line}`, background: "#fff", borderRadius: 10, padding: "12px 8px", fontSize: 13.5, color: ink, cursor: "pointer" },
  slotActive: { background: primary, borderColor: primary, color: "#fff" },

  successCircle: {
    width: 72, height: 72, borderRadius: "50%", background: "#22B573", color: "#fff",
    fontSize: 32, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
  },
  confirmTitle: { fontSize: 20, fontWeight: 700, color: ink, margin: "0 0 4px" },
  confirmSeat: { fontSize: 15, color: muted, margin: "0 0 20px" },
  confirmCard: { width: "100%", background: "#fff", border: `1px solid ${line}`, borderRadius: 14, padding: "16px 18px", marginBottom: 22 },
  confirmRow: { display: "flex", justifyContent: "space-between", fontSize: 13.5, color: ink, padding: "6px 0" },

  checkinBanner: { background: "#E7F3EA", color: "#1F8A4C", textAlign: "center", padding: "12px 0", borderRadius: 12, fontWeight: 600, fontSize: 14 },
  qrBox: { background: "#fff", border: `1px solid ${line}`, borderRadius: 16, padding: 24, margin: "14px auto 18px", width: 180 },
  qrGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, width: "100%", aspectRatio: "1" },

  bookingListCard: { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 },
  cancelLink: { border: "none", background: "transparent", color: "#D64545", fontSize: 13, fontWeight: 600, cursor: "pointer" },

  alertCard: { background: "#fff", border: `1px solid ${line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 },
  alertTime: { fontSize: 11.5, color: "#B3BACB", margin: "6px 0 0" },

  profileCard: { display: "flex", alignItems: "center", gap: 14, background: "#fff", border: `1px solid ${line}`, borderRadius: 14, padding: "16px 18px", marginBottom: 20 },
  profileAvatar: { width: 48, height: 48, borderRadius: "50%", background: primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 },

  bottomNav: { display: "flex", borderTop: `1px solid ${line}`, background: "#fff", padding: "8px 0 10px" },
  navItem: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, border: "none", background: "transparent", cursor: "pointer", fontFamily: "'Noto Sans Thai', sans-serif" },
  navLabel: { fontSize: 10.5, fontWeight: 500 },
};
