import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getInstructor, logoutInstructor, loginInstructor, getInstructorToken } from "../instructorAuth";
import instructorApi from "../instructorApi";
import {
  LayoutDashboard, BookOpen, LogOut, ChevronLeft,
  Plus, X, UserMinus, Save, Users, Camera, Megaphone, Search, CheckCircle,
} from "lucide-react";
import "../styles/InstructorLayout.css";
import InstructorChatWidget from "../components/InstructorChatWidget";
import ThemeToggle from "../components/ThemeToggle";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from "../context/LanguageContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const GRADES = ["AA", "BA", "BB", "CB", "CC", "DC", "DD", "FD", "FF"];
const today = new Date().toISOString().slice(0, 10);

export default function OfferingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [instructor, setInstructor] = useState(getInstructor());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const picUrl = instructor?.profilePicture ? `${API_URL}${instructor.profilePicture}` : null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("photo", file);
    try {
      const token = getInstructorToken();
      const res = await fetch(`${API_URL}/api/upload/profile-picture-instructor`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const updated = { ...instructor, profilePicture: data.profilePicture };
      loginInstructor(token, updated);
      setInstructor(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const [offering, setOffering] = useState(null);
  const [students, setStudents] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [tab, setTab] = useState("students");
  const [loadingOff, setLoadingOff] = useState(true);
  const [toast, setToast] = useState(null);
  const [respondingId, setRespondingId] = useState(null);

  // ── Student picker modal ────────────────────────────────────────────────────
  const [showPicker, setShowPicker]       = useState(false);
  const [allStudents, setAllStudents]     = useState([]);
  const [pickerLoaded, setPickerLoaded]   = useState(false);
  const [pickerSearch, setPickerSearch]   = useState("");
  const [selectedIds, setSelectedIds]     = useState(new Set());
  const [addingAll, setAddingAll]         = useState(false);

  const [gradeEdits, setGradeEdits] = useState({});
  const [gradeSaving, setGradeSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const [attDate, setAttDate] = useState(today);
  const [attMap, setAttMap] = useState({});
  const [attSaving, setAttSaving] = useState(false);
  const [attHistModal, setAttHistModal] = useState(null);
  const [attHistLoading, setAttHistLoading] = useState(false);

  const initials = instructor?.fullName
    ? instructor.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "HO";

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const handleLogout = () => { logoutInstructor(); navigate("/instructor/login"); };

  const loadPending = useCallback(async () => {
    try {
      const res = await instructorApi.get(`/offerings/${id}/pending`);
      setPendingRequests(res.data);
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => {
    async function load() {
      // Offering is critical — if this fails, show the error state.
      let offData;
      try {
        const offRes = await instructorApi.get(`/offerings/${id}`);
        offData = offRes.data;
        setOffering(offData);
      } catch (err) {
        console.error("Failed to load offering:", err);
        setLoadingOff(false);
        return;
      }

      // Students and pending are non-critical — fall back to empty arrays.
      const [stuRes, pendRes] = await Promise.allSettled([
        instructorApi.get(`/offerings/${id}/students`),
        instructorApi.get(`/offerings/${id}/pending`),
      ]);

      const stuData = stuRes.status === "fulfilled" ? stuRes.value.data : [];
      const pendData = pendRes.status === "fulfilled" ? pendRes.value.data : [];

      if (stuRes.status === "rejected") console.error("Failed to load students:", stuRes.reason);
      if (pendRes.status === "rejected") console.error("Failed to load pending:", pendRes.reason);

      setStudents(stuData);
      setPendingRequests(pendData);
      const gMap = {};
      stuData.forEach((e) => { gMap[e.student.id] = e.grade || ""; });
      setGradeEdits(gMap);

      setLoadingOff(false);
    }
    load();
  }, [id]);

  const loadAttendance = useCallback(async (date) => {
    try {
      const res = await instructorApi.get(`/offerings/${id}/attendance?date=${date}`);
      const map = {};
      res.data.forEach((r) => { map[r.studentId] = r.status; });
      setAttMap(map);
    } catch { /* no records = empty map */ }
  }, [id]);

  useEffect(() => { if (tab === "attendance") loadAttendance(attDate); }, [tab, attDate, loadAttendance]);

  const openPicker = async () => {
    setShowPicker(true);
    setPickerSearch("");
    setSelectedIds(new Set());
    if (!pickerLoaded) {
      try {
        const res = await instructorApi.get("/students/all");
        setAllStudents(res.data);
        setPickerLoaded(true);
      } catch (err) {
        showToast(err.response?.data?.message || t("common.error"));
        setShowPicker(false);
      }
    }
  };

  const toggleSelect = (studentId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId); else next.add(studentId);
      return next;
    });
  };

  const handlePickerAdd = async () => {
    if (selectedIds.size === 0) return;
    setAddingAll(true);
    const toAdd = allStudents.filter((s) => selectedIds.has(s.id));
    let added = 0;
    for (const student of toAdd) {
      try {
        const res = await instructorApi.post(`/offerings/${id}/students`, { studentNumber: student.studentNumber });
        setStudents((prev) => {
          const exists = prev.find((e) => e.id === res.data.id);
          return exists ? prev.map((e) => e.id === res.data.id ? res.data : e) : [...prev, res.data];
        });
        setGradeEdits((g) => ({ ...g, [res.data.student.id]: res.data.grade || "" }));
        added++;
      } catch { /* individual failures are silent — student may already be enrolled */ }
    }
    setAddingAll(false);
    setShowPicker(false);
    if (added > 0) showToast(`${added} ${t("offeringDetail.students.addedCount")}`);
  };

  const handleRemove = async (studentId) => {
    if (!window.confirm(t("offeringDetail.students.remove") + "?")) return;
    try {
      await instructorApi.delete(`/offerings/${id}/students/${studentId}`);
      setStudents((prev) => prev.map((e) => e.student.id === studentId ? { ...e, status: "dropped" } : e));
      showToast(t("offeringDetail.students.remove"));
    } catch (err) {
      showToast(err.response?.data?.message || t("common.error"));
    }
  };

  const handleSaveGrades = async () => {
    setGradeSaving(true);
    try {
      const grades = Object.entries(gradeEdits)
        .map(([studentId, grade]) => ({ studentId: parseInt(studentId), grade: grade || null }));
      const res = await instructorApi.put(`/offerings/${id}/grades/bulk`, { grades });
      const updated = await instructorApi.get(`/offerings/${id}/students`);
      setStudents(updated.data);
      showToast(`${res.data.updated} — ${t("offeringDetail.grades.saveAll")}`);
    } catch (err) {
      showToast(err.response?.data?.message || t("common.error"));
    } finally {
      setGradeSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm(t("offeringDetail.grades.finalizeConfirm"))) return;
    setFinalizing(true);
    try {
      const res = await instructorApi.post(`/offerings/${id}/finalize`);
      const updated = await instructorApi.get(`/offerings/${id}/students`);
      setStudents(updated.data);
      showToast(t("offeringDetail.grades.finalized").replace("{n}", res.data.finalized));
    } catch (err) {
      showToast(err.response?.data?.message || t("common.error"));
    } finally {
      setFinalizing(false);
    }
  };

  const handleSaveAttendance = async () => {
    setAttSaving(true);
    try {
      const activeStudents = students.filter((e) => e.status !== "dropped");
      const records = activeStudents.map((e) => ({
        studentId: e.student.id,
        status: attMap[e.student.id] || "present",
      }));
      const res = await instructorApi.post(`/offerings/${id}/attendance`, { date: attDate, records });
      showToast(`${res.data.saved} — ${t("offeringDetail.attendance.save")}`);
    } catch (err) {
      showToast(err.response?.data?.message || t("common.error"));
    } finally {
      setAttSaving(false);
    }
  };

  const handleRespond = async (enrollmentId, status) => {
    setRespondingId(enrollmentId);
    try {
      await instructorApi.put(`/enrollment-requests/${enrollmentId}/respond`, { status });
      setPendingRequests((prev) => prev.filter((r) => r.id !== enrollmentId));
      if (status === "active") {
        const stuRes = await instructorApi.get(`/offerings/${id}/students`);
        setStudents(stuRes.data);
        setOffering((prev) => prev ? { ...prev, enrolledCount: (prev.enrolledCount || 0) + 1 } : prev);
      }
      showToast(status === "active" ? t("offeringDetail.pending.accept") : t("offeringDetail.pending.reject"));
    } catch (err) {
      showToast(err.response?.data?.message || t("common.error"));
    } finally {
      setRespondingId(null);
    }
  };

  const handleShowHistory = async (enrollment) => {
    setAttHistLoading(true);
    setAttHistModal({ student: enrollment.student, records: [] });
    try {
      const res = await instructorApi.get(`/offerings/${id}/attendance?studentId=${enrollment.student.id}`);
      setAttHistModal({ student: enrollment.student, records: res.data });
    } catch { setAttHistModal(null); }
    finally { setAttHistLoading(false); }
  };

  const activeStudents = students.filter((e) => e.status !== "dropped");

  if (loadingOff) return <div style={{ padding: 40, color: "#7c8591" }}>{t("common.loading")}</div>;
  if (!offering) return <div style={{ padding: 40, color: "#e24b4a" }}>{t("common.noData")}</div>;

  const translateDay = (day) => {
    if (language !== "en" || !day) return day;
    const map = {
      "Pazartesi": "Monday", "Salı": "Tuesday", "Çarşamba": "Wednesday",
      "Perşembe": "Thursday", "Cuma": "Friday", "Cumartesi": "Saturday",
      "Pazar": "Sunday",
    };
    return map[day] || day;
  };

  const translateTerm = (term) => {
    if (language !== "en" || !term) return term;
    return term
      .replace("Bahar", "Spring")
      .replace("Güz", "Fall")
      .replace("Yaz", "Summer")
      .replace("Dönemi", "Semester");
  };

  const studentStatusLabel = (status) => ({
    active:    t("offeringDetail.students.status.active"),
    graded:    t("offeringDetail.students.status.graded"),
    dropped:   t("offeringDetail.students.status.dropped"),
    completed: t("offeringDetail.students.status.completed"),
    pending:   t("offeringDetail.students.status.pending"),
    rejected:  t("offeringDetail.students.status.rejected"),
  }[status] ?? status);

  return (
    <div className="inst-layout">
      {/* Sidebar */}
      <aside className="inst-sidebar">
        <div className="inst-sidebar-brand">
          <div className="inst-sidebar-brand-icon">
            <svg viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" /></svg>
          </div>
          <span className="inst-sidebar-brand-name">SIS</span>
        </div>
        <div className="inst-sidebar-section">
          <p className="inst-sidebar-section-label">{t("sidebar.panel")}</p>
          <ul className="inst-sidebar-nav">
            <li onClick={() => navigate("/instructor/dashboard")}><LayoutDashboard size={15} /> {t("instructorDashboard.title")}</li>
            <li className="active"><BookOpen size={15} /> {t("myOfferings.title")}</li>
            <li onClick={() => navigate("/instructor/announcements")}><Megaphone size={15} /> {t("announcements.title")}</li>
          </ul>
        </div>
        <div className="inst-sidebar-footer">
          <div className="inst-sidebar-user">
            <div style={{ position: "relative", cursor: "pointer", flexShrink: 0 }} onClick={() => fileInputRef.current?.click()}>
              {picUrl ? (
                <img src={picUrl} alt="avatar" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.2)" }} />
              ) : (
                <div className="inst-sidebar-avatar">{initials}</div>
              )}
              <div style={{ position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#4f7aff", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #1a5c3a" }}>
                {uploading ? <div style={{ width: 8, height: 8, border: "1.5px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : <Camera size={9} color="#fff" />}
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            <div>
              <p className="inst-sidebar-user-name">{instructor?.fullName ?? "Instructor"}</p>
              <p className="inst-sidebar-user-role">{instructor?.title ?? "Faculty"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="inst-main">
        <div className="inst-topbar">
          <div className="inst-topbar-left">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => navigate("/instructor/offerings")} style={{ background: "#f0f2f5", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#7c8591" }}>
                <ChevronLeft size={14} /> {t("common.back")}
              </button>
              <div>
                <h1>{offering.curriculum.courseCode} — {language === "en" ? (offering.curriculum.courseNameEn || offering.curriculum.courseName) : offering.curriculum.courseName}</h1>
                <p>{translateTerm(offering.academicTerm)}{offering.day ? ` · ${translateDay(offering.day)} ${offering.startTime}–${offering.endTime}` : ""}{offering.room ? ` · ${offering.room}` : ""}</p>
              </div>
            </div>
          </div>
          <div className="inst-topbar-right">
            <ThemeToggle variant="instructor" />
            <LanguageToggle variant="instructor" />
            <span style={{ fontSize: 13, background: "#eff4ff", color: "#4f7aff", padding: "5px 12px", borderRadius: 20, fontWeight: 600 }}>
              <Users size={12} style={{ display: "inline", marginRight: 4 }} />
              {offering.enrolledCount} {t("offeringDetail.students.active")}
            </span>
            {pendingRequests.length > 0 && (
              <span
                style={{ fontSize: 13, background: "#fef3c7", color: "#d97706", padding: "5px 12px", borderRadius: 20, fontWeight: 600, cursor: "pointer" }}
                onClick={() => setTab("pending")}
              >
                {pendingRequests.length} {t("myOfferings.pendingRequests")}
              </span>
            )}
            <button className="inst-logout-btn" onClick={handleLogout}><LogOut size={14} /> {t("common.logout")}</button>
          </div>
        </div>

        <div className="inst-content">
          {/* Tabs */}
          <div className="inst-tabs">
            <button className={`inst-tab ${tab === "students" ? "active" : ""}`} onClick={() => setTab("students")}>
              {t("offeringDetail.tab.students")}
            </button>
            <button className={`inst-tab ${tab === "grades" ? "active" : ""}`} onClick={() => setTab("grades")}>
              {t("offeringDetail.tab.grades")}
            </button>
            <button className={`inst-tab ${tab === "attendance" ? "active" : ""}`} onClick={() => setTab("attendance")}>
              {t("offeringDetail.tab.attendance")}
            </button>
            <button className={`inst-tab ${tab === "pending" ? "active" : ""}`} onClick={() => setTab("pending")} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {t("offeringDetail.tab.pending")}
              {pendingRequests.length > 0 && (
                <span style={{ background: "#e24b4a", color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "1px 7px", minWidth: 20, textAlign: "center" }}>
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>

          {/* ── TAB 1: Students ── */}
          {tab === "students" && (
            <div className="inst-section-card">
              <div className="inst-section-header">
                <div>
                  <p className="inst-section-title">{t("offeringDetail.students.title")}</p>
                  <p className="inst-section-sub">{activeStudents.length} {t("offeringDetail.students.active")}</p>
                </div>
                <button className="inst-btn-primary" onClick={openPicker}>
                  <Plus size={13} /> {t("offeringDetail.students.add")}
                </button>
              </div>
              {students.length === 0 ? (
                <div className="inst-empty"><Users size={36} /><p>{t("offeringDetail.students.noStudents")}</p></div>
              ) : (
                <table className="inst-table">
                  <thead>
                    <tr>
                      <th>{t("offeringDetail.students.col.no")}</th>
                      <th>{t("offeringDetail.students.col.studentNo")}</th>
                      <th>{t("offeringDetail.students.col.name")}</th>
                      <th>{t("offeringDetail.students.col.email")}</th>
                      <th>{t("offeringDetail.students.col.grade")}</th>
                      <th>{t("offeringDetail.students.col.status")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((e, i) => (
                      <tr key={e.id} style={{ opacity: e.status === "dropped" ? 0.45 : 1 }}>
                        <td style={{ color: "#b0b8c1" }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{e.student.studentNumber}</td>
                        <td>{e.student.fullName}</td>
                        <td style={{ color: "#7c8591", fontSize: 12 }}>{e.student.email}</td>
                        <td>{e.grade ? <span style={{ fontWeight: 700, color: "#1a1f2e" }}>{e.grade}</span> : <span style={{ color: "#b0b8c1" }}>—</span>}</td>
                        <td><span className={`inst-badge ${e.status}`}>{studentStatusLabel(e.status)}</span></td>
                        <td>
                          {(e.status === "active" || e.status === "graded") && (
                            <button className="inst-btn-danger" onClick={() => handleRemove(e.student.id)}>
                              <UserMinus size={12} /> {t("offeringDetail.students.remove")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── TAB 2: Grades ── */}
          {tab === "grades" && (
            <div className="inst-section-card">
              <div className="inst-section-header">
                <div>
                  <p className="inst-section-title">{t("offeringDetail.grades.title")}</p>
                  <p className="inst-section-sub">{activeStudents.length} {t("offeringDetail.students.count")}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="inst-btn-primary" onClick={handleSaveGrades} disabled={gradeSaving}>
                    <Save size={13} /> {gradeSaving ? t("offeringDetail.grades.saving") : t("offeringDetail.grades.saveAll")}
                  </button>
                  <button
                    className="inst-btn-primary"
                    onClick={handleFinalize}
                    disabled={finalizing || !activeStudents.some((e) => e.status === "graded")}
                    style={{ background: "#16a34a", borderColor: "#16a34a" }}
                  >
                    {finalizing ? t("offeringDetail.grades.finalizing") : t("offeringDetail.grades.finalize")}
                  </button>
                </div>
              </div>
              {activeStudents.length === 0 ? (
                <div className="inst-empty"><Users size={36} /><p>{t("offeringDetail.grades.noStudents")}</p></div>
              ) : (
                <table className="inst-table">
                  <thead>
                    <tr>
                      <th>{t("offeringDetail.grades.col.no")}</th>
                      <th>{t("offeringDetail.grades.col.studentNo")}</th>
                      <th>{t("offeringDetail.grades.col.name")}</th>
                      <th>{t("offeringDetail.grades.col.grade")}</th>
                      <th>{t("offeringDetail.grades.col.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStudents.map((e, i) => (
                      <tr key={e.id}>
                        <td style={{ color: "#b0b8c1" }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{e.student.studentNumber}</td>
                        <td>{e.student.fullName}</td>
                        <td>
                          <select
                            className="grade-select"
                            value={gradeEdits[e.student.id] ?? ""}
                            onChange={(ev) => setGradeEdits((g) => ({ ...g, [e.student.id]: ev.target.value }))}
                          >
                            <option value="">{t("offeringDetail.grades.notEntered")}</option>
                            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </td>
                        <td><span className={`inst-badge ${e.status}`}>{studentStatusLabel(e.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── TAB 3: Attendance ── */}
          {tab === "attendance" && (
            <div className="inst-section-card">
              <div className="inst-section-header">
                <div>
                  <p className="inst-section-title">{t("offeringDetail.attendance.title")}</p>
                  <p className="inst-section-sub">{t("offeringDetail.attendance.subtitle")}</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="date" value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    style={{ padding: "8px 12px", fontSize: 13, border: "1.5px solid #e4e7eb", borderRadius: 8, outline: "none" }}
                  />
                  <button className="inst-btn-primary" onClick={handleSaveAttendance} disabled={attSaving}>
                    <Save size={13} /> {attSaving ? t("offeringDetail.attendance.saving") : t("offeringDetail.attendance.save")}
                  </button>
                </div>
              </div>
              {activeStudents.length === 0 ? (
                <div className="inst-empty"><Users size={36} /><p>{t("offeringDetail.attendance.noStudents")}</p></div>
              ) : (
                <table className="inst-table">
                  <thead>
                    <tr>
                      <th>{t("offeringDetail.attendance.col.no")}</th>
                      <th>{t("offeringDetail.attendance.col.studentNo")}</th>
                      <th>{t("offeringDetail.attendance.col.name")}</th>
                      <th>{t("offeringDetail.attendance.col.status")}</th>
                      <th>{t("offeringDetail.attendance.col.history")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStudents.map((e, i) => {
                      const cur = attMap[e.student.id] || "present";
                      return (
                        <tr key={e.id}>
                          <td style={{ color: "#b0b8c1" }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{e.student.studentNumber}</td>
                          <td>{e.student.fullName}</td>
                          <td>
                            <div className="att-radio-group">
                              {[
                                { val: "present", label: t("offeringDetail.attendance.present") },
                                { val: "absent",  label: t("offeringDetail.attendance.absent") },
                                { val: "late",    label: t("offeringDetail.attendance.late") },
                              ].map(({ val, label }) => (
                                <button
                                  key={val}
                                  className={`att-radio-btn ${cur === val ? val : ""}`}
                                  onClick={() => setAttMap((m) => ({ ...m, [e.student.id]: val }))}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td>
                            <button className="inst-btn-secondary" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => handleShowHistory(e)}>
                              {t("offeringDetail.attendance.history")}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {/* ── TAB 4: Pending Requests ── */}
          {tab === "pending" && (
            <div className="inst-section-card">
              <div className="inst-section-header">
                <div>
                  <p className="inst-section-title">{t("offeringDetail.pending.title")}</p>
                  <p className="inst-section-sub">{pendingRequests.length} {t("offeringDetail.students.count")}</p>
                </div>
              </div>
              {pendingRequests.length === 0 ? (
                <div className="inst-empty"><Users size={36} /><p>{t("offeringDetail.pending.noPending")}</p></div>
              ) : (
                <table className="inst-table">
                  <thead>
                    <tr>
                      <th>{t("offeringDetail.pending.col.no")}</th>
                      <th>{t("offeringDetail.students.col.studentNo")}</th>
                      <th>{t("offeringDetail.pending.col.student")}</th>
                      <th>{t("offeringDetail.students.col.email")}</th>
                      <th>{t("offeringDetail.pending.col.requestedAt")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ color: "#b0b8c1" }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{r.student.studentNumber}</td>
                        <td>{r.student.fullName}</td>
                        <td style={{ color: "#7c8591", fontSize: 12 }}>{r.student.email}</td>
                        <td style={{ fontSize: 12, color: "#7c8591" }}>
                          {new Date(r.enrolledAt).toLocaleDateString(language === "en" ? "en-US" : "tr-TR")}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="inst-btn-primary"
                              style={{ fontSize: 12, padding: "5px 12px", background: "#16a34a", borderColor: "#16a34a" }}
                              onClick={() => handleRespond(r.id, "active")}
                              disabled={respondingId === r.id}
                            >
                              {t("offeringDetail.pending.accept")}
                            </button>
                            <button
                              className="inst-btn-danger"
                              style={{ fontSize: 12, padding: "5px 12px" }}
                              onClick={() => handleRespond(r.id, "rejected")}
                              disabled={respondingId === r.id}
                            >
                              {t("offeringDetail.pending.reject")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Student Picker Modal ── */}
      {showPicker && (() => {
        const enrolledIds = new Set(
          students.filter((e) => !["dropped","rejected"].includes(e.status)).map((e) => e.student.id)
        );
        const q = pickerSearch.toLowerCase();
        const filtered = allStudents.filter((s) =>
          !q || s.fullName.toLowerCase().includes(q) || s.studentNumber.includes(q)
        );
        return (
          <div className="inst-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPicker(false)}>
            <div className="inst-modal" style={{ maxWidth: 560, display: "flex", flexDirection: "column", maxHeight: "80vh" }}>
              <div className="inst-modal-header">
                <p className="inst-modal-title">{t("offeringDetail.students.pickerTitle")}</p>
                <button className="inst-modal-close" onClick={() => setShowPicker(false)}><X size={14} /></button>
              </div>

              {/* Search */}
              <div style={{ padding: "12px 20px 8px", borderBottom: "1px solid #f0f2f5", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8f9fa", border: "1.5px solid #e4e7eb", borderRadius: 8, padding: "7px 12px" }}>
                  <Search size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
                  <input
                    autoFocus
                    style={{ border: "none", background: "none", outline: "none", fontSize: 13, flex: 1, color: "#1a1f2e" }}
                    placeholder={t("offeringDetail.students.pickerSearch")}
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                  />
                  {pickerSearch && <button style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, lineHeight: 1 }} onClick={() => setPickerSearch("")}><X size={13} /></button>}
                </div>
              </div>

              {/* List */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                {filtered.length === 0 ? (
                  <p style={{ padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{t("common.noData")}</p>
                ) : filtered.map((s) => {
                  const enrolled  = enrolledIds.has(s.id);
                  const selected  = selectedIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => !enrolled && toggleSelect(s.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "11px 20px", borderBottom: "1px solid #f8f9fa",
                        cursor: enrolled ? "default" : "pointer",
                        background: selected ? "#f0fdf4" : "transparent",
                        opacity: enrolled ? 0.5 : 1,
                        transition: "background 0.1s",
                      }}
                    >
                      {/* Selection indicator */}
                      <div style={{ width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {enrolled ? null : selected
                          ? <CheckCircle size={16} style={{ color: "#10b981" }} />
                          : <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid #d1d9e0" }} />}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1f2e", marginBottom: 2 }}>{s.fullName}</p>
                        <p style={{ fontSize: 11, color: "#7c8591" }}>{s.studentNumber} · {s.department} · {s.year}. sınıf</p>
                      </div>

                      {enrolled && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#f1f5f9", color: "#64748b" }}>
                          {t("offeringDetail.students.pickerEnrolled")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="inst-modal-footer" style={{ borderTop: "1px solid #f0f2f5", flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: "#7c8591", flex: 1 }}>
                  {selectedIds.size > 0 && `${selectedIds.size} ${t("offeringDetail.students.pickerSelected")}`}
                </span>
                <button className="inst-btn-secondary" onClick={() => setShowPicker(false)}>{t("myOfferings.modal.cancel")}</button>
                <button className="inst-btn-primary" onClick={handlePickerAdd} disabled={selectedIds.size === 0 || addingAll}>
                  {addingAll ? t("offeringDetail.students.adding") : <><Plus size={13} /> {t("offeringDetail.students.pickerAdd")}</>}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Attendance History Modal */}
      {attHistModal && (
        <div className="inst-modal-overlay" onClick={(e) => e.target === e.currentTarget && setAttHistModal(null)}>
          <div className="inst-modal" style={{ maxWidth: 560 }}>
            <div className="inst-modal-header">
              <p className="inst-modal-title">{attHistModal.student.fullName} — {t("offeringDetail.attendance.historyTitle")}</p>
              <button className="inst-modal-close" onClick={() => setAttHistModal(null)}><X size={14} /></button>
            </div>
            <div style={{ padding: "0 0 4px" }}>
              {attHistLoading ? (
                <p style={{ padding: 24, color: "#7c8591", fontSize: 13 }}>{t("offeringDetail.attendance.loading")}</p>
              ) : attHistModal.records.length === 0 ? (
                <p style={{ padding: 24, color: "#7c8591", fontSize: 13, textAlign: "center" }}>{t("offeringDetail.attendance.noRecords")}</p>
              ) : (
                <table className="inst-table">
                  <thead>
                    <tr>
                      <th>{t("offeringDetail.attendance.col.date")}</th>
                      <th>{t("offeringDetail.attendance.col.statusH")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attHistModal.records.map((r) => (
                      <tr key={r.id}>
                        <td>{new Date(r.date).toLocaleDateString(language === "en" ? "en-US" : "tr-TR")}</td>
                        <td>
                          <span className="inst-badge" style={
                            r.status === "present" ? { background: "#f0fdf4", color: "#16a34a" } :
                            r.status === "absent"  ? { background: "#fef2f2", color: "#e24b4a" } :
                                                     { background: "#fffbeb", color: "#d97706" }
                          }>
                            {r.status === "present"
                              ? t("offeringDetail.attendance.present2")
                              : r.status === "absent"
                              ? t("offeringDetail.attendance.absent2")
                              : t("offeringDetail.attendance.late2")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="inst-toast">{toast}</div>}
      <InstructorChatWidget />
    </div>
  );
}
