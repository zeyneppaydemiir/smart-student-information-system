import { useState, useEffect } from "react";
import api from "../api";
import { logout, getUser } from "../auth";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, FileText,
  Calendar, GraduationCap, Search, Clock,
  AlertCircle, CheckCircle, XCircle, Info,
  PauseCircle, RefreshCw, ArrowRightLeft, BookMarked,
  ClipboardList, ChevronRight, X, Activity, PlusCircle, Library, User, Megaphone, Sparkles,
} from "lucide-react";
import "../styles/Forms.css";
import ChatWidget from "../components/ChatWidget";
import TopbarPanels from "../components/TopbarPanels";
import { useLanguage } from "../context/LanguageContext";

const ICON_BY_ID = {
  1: PauseCircle, 2: Calendar, 3: ArrowRightLeft,
  4: BookMarked, 5: ClipboardList, 6: GraduationCap, 7: BookOpen, 8: User,
};

function enrichForm(f) {
  return { ...f, icon: ICON_BY_ID[f.id] ?? FileText };
}

const STATUS_CSS = {
  open:      { cls: "badge-open",      icon: Info },
  submitted: { cls: "badge-submitted", icon: Clock },
  approved:  { cls: "badge-approved",  icon: CheckCircle },
  rejected:  { cls: "badge-rejected",  icon: XCircle },
  closed:    { cls: "badge-closed",    icon: AlertCircle },
};

/* ── Modal ── */
function FormModal({ form, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [values, setValues] = useState({});

  const handleChange = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
  };

  const handleSubmit = () => {
    onSubmit(form.id, values);
    onClose();
  };

  const isViewOnly = form.status !== "open";

  const viewOnlyMsg = {
    closed:    t("forms.viewOnly.closed"),
    approved:  t("forms.viewOnly.approved"),
    rejected:  t("forms.viewOnly.rejected"),
    submitted: t("forms.viewOnly.submitted"),
  }[form.status];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className={`modal-header-icon form-item-icon ${form.iconColor}`}>
              <form.icon size={18} />
            </div>
            <div>
              <p className="modal-title">{form.title}</p>
              <p className="modal-subtitle">{form.description}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">
          {form.info && (
            <div className="modal-info-box">
              <Info size={14} />
              {form.info}
            </div>
          )}

          {isViewOnly ? (
            <div style={{ textAlign: "center", padding: "16px 0", color: "#7c8591", fontSize: 13 }}>
              {viewOnlyMsg}
            </div>
          ) : (
            (form.fields ?? []).map((field) => (
              <div className="modal-field" key={field.name}>
                <label>{field.label}</label>
                {field.type === "textarea" ? (
                  <textarea
                    placeholder={field.placeholder}
                    value={values[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  />
                ) : field.type === "select" ? (
                  <select
                    value={values[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  >
                    <option value="">{t("forms.selectOption")}</option>
                    {field.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    placeholder={field.placeholder || ""}
                    value={values[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  />
                )}
              </div>
            ))
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            {isViewOnly ? t("common.close") : t("common.cancel")}
          </button>
          {!isViewOnly && (
            <button className="btn-submit" onClick={handleSubmit}>
              {t("forms.submitApplication")}
            </button>
          )}
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}

/* ── Main page ── */
export default function Forms() {
  const navigate = useNavigate();
  const user = getUser();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeModal, setActiveModal] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [toast, setToast] = useState(null);
  const [formsData, setFormsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/forms"),
      api.get("/forms/submissions/all"),
    ])
      .then(([formsRes, subsRes]) => {
        const enriched = formsRes.data.map(enrichForm);
        setFormsData(enriched);
        const statusMap = {};
        subsRes.data.forEach((sub) => {
          statusMap[sub.formId] = sub.status === "pending" ? "submitted" : sub.status;
        });
        setStatuses(statusMap);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "ST";

  const handleLogout = () => { logout(); navigate("/"); };

  const getStatus = (form) => statuses[form.id] || form.status;

  const handleSubmit = async (formId, values) => {
    try {
      await api.post(`/forms/${formId}/submit`, { values });
      setStatuses((s) => ({ ...s, [formId]: "submitted" }));
      const form = formsData.find((f) => f.id === formId);
      setToast(`"${form.title}" submitted successfully.`);
    } catch (err) {
      const msg = err.response?.data?.message ?? "Submission failed.";
      setToast(msg);
    }
    setTimeout(() => setToast(null), 3500);
  };

  const filtered = formsData.filter((f) => {
    const st = getStatus(f);
    const matchSearch = f.title.toLowerCase().includes(search.toLowerCase()) ||
      (f.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || st === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    total: formsData.length,
    open: formsData.filter((f) => getStatus(f) === "open").length,
    submitted: formsData.filter((f) => getStatus(f) === "submitted").length,
    approved: formsData.filter((f) => getStatus(f) === "approved").length,
  };

  const STATUS_META = {
    open:      { label: t("forms.status.open"),      cls: "badge-open" },
    submitted: { label: t("forms.status.submitted"), cls: "badge-submitted" },
    approved:  { label: t("forms.status.approved"),  cls: "badge-approved" },
    rejected:  { label: t("forms.status.rejected"),  cls: "badge-rejected" },
    closed:    { label: t("forms.status.closed"),    cls: "badge-closed" },
  };

  const FILTER_OPTIONS = [
    { value: "all",       label: t("forms.allForms") },
    { value: "open",      label: t("forms.open") },
    { value: "submitted", label: t("forms.submitted") },
    { value: "approved",  label: t("forms.approved") },
    { value: "rejected",  label: t("forms.rejected") },
    { value: "closed",    label: t("forms.closed") },
  ];

  const openForm = formsData.find((f) => f.id === activeModal);

  return (
    <div className="layout">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
            </svg>
          </div>
          <span className="sidebar-brand-name">SIS</span>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-section-label">{t("nav.mainMenu")}</p>
          <ul className="sidebar-nav">
            <li onClick={() => navigate("/dashboard")}><LayoutDashboard size={16} /> {t("nav.dashboard")}</li>
            <li onClick={() => navigate("/courses")}><BookOpen size={16} /> {t("nav.courses")}</li>
            <li onClick={() => navigate("/course-selection")}><PlusCircle size={16} /> {t("nav.courseSelection")}</li>
            <li onClick={() => navigate("/curriculum")}><Library size={16} /> {t("nav.curriculum")}</li>
            <li className="active"><FileText size={16} /> {t("nav.forms")}</li>
            <li onClick={() => navigate("/schedule")}><Calendar size={16} /> {t("nav.schedule")}</li>
            <li onClick={() => navigate("/transcript")}><GraduationCap size={16} /> {t("nav.transcript")}</li>
            <li onClick={() => navigate("/attendance")}><Activity size={16} /> {t("nav.attendance")}</li>
            <li onClick={() => navigate("/announcements")}><Megaphone size={16} /> {t("nav.announcements")}</li>
            <li onClick={() => navigate("/course-recommendation")}><Sparkles size={16} /> {t("nav.courseRecommendation")}</li>
          </ul>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{user?.name ?? "Student"}</p>
              <p className="sidebar-user-role">{t("sidebar.undergraduate")}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <h1>{t("forms.title")}</h1>
            <p>{t("semester.springFull")}</p>
          </div>
          <div className="topbar-right">
            <TopbarPanels />
          </div>
        </div>

        <div className="content">
          {/* Summary */}
          <div className="summary-strip">
            <div className="summary-card blue">
              <div className="summary-card-icon"><FileText size={16} /></div>
              <div><p className="summary-card-value">{counts.total}</p><p className="summary-card-label">{t("forms.totalForms")}</p></div>
            </div>
            <div className="summary-card green">
              <div className="summary-card-icon"><CheckCircle size={16} /></div>
              <div><p className="summary-card-value">{counts.open}</p><p className="summary-card-label">{t("forms.openForApply")}</p></div>
            </div>
            <div className="summary-card amber">
              <div className="summary-card-icon"><Clock size={16} /></div>
              <div><p className="summary-card-value">{counts.submitted}</p><p className="summary-card-label">{t("forms.underReview")}</p></div>
            </div>
            <div className="summary-card red">
              <div className="summary-card-icon"><CheckCircle size={16} /></div>
              <div><p className="summary-card-value">{counts.approved}</p><p className="summary-card-label">{t("forms.approved")}</p></div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="forms-toolbar">
            <div className="forms-toolbar-left">
              <div className="search-wrapper">
                <Search size={15} className="search-icon" />
                <input
                  className="search-input"
                  type="text"
                  placeholder={t("forms.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="filter-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Forms list */}
          <div className="forms-list">
            {loading ? (
              <p style={{ color: "#7c8591", fontSize: 14, padding: 8 }}>{t("forms.loading")}</p>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <Search size={36} />
                <p>{t("forms.noMatch")}</p>
              </div>
            ) : (
              filtered.map((form) => {
                const st = getStatus(form);
                const meta = STATUS_META[st] ?? STATUS_META.open;
                const isOpen = st === "open";

                return (
                  <div className="form-item" key={form.id} onClick={() => setActiveModal(form.id)}>
                    <div className={`form-item-icon ${form.iconColor}`}>
                      <form.icon size={20} />
                    </div>

                    <div className="form-item-body">
                      <p className="form-item-title">{form.title}</p>
                      <p className="form-item-desc">{form.description}</p>
                    </div>

                    <div className="form-item-meta">
                      <span className={`form-status-badge ${meta.cls}`}>
                        {meta.label}
                      </span>
                      {form.deadline && (
                        <span className={`form-deadline ${form.urgent ? "urgent" : ""}`}>
                          <Clock size={11} />
                          {t("forms.due")} {form.deadline}
                        </span>
                      )}
                    </div>

                    <button
                      className={`form-action-btn ${isOpen ? "primary" : ""} ${st === "closed" ? "disabled" : ""}`}
                      onClick={(e) => { e.stopPropagation(); setActiveModal(form.id); }}
                    >
                      {isOpen ? t("common.apply") : t("common.view")}
                      <ChevronRight size={13} style={{ marginLeft: 4, verticalAlign: "middle" }} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL ── */}
      {activeModal && openForm && (
        <FormModal
          form={{ ...openForm, status: getStatus(openForm) }}
          onClose={() => setActiveModal(null)}
          onSubmit={handleSubmit}
        />
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className="toast">
          <CheckCircle size={15} />
          {toast}
        </div>
      )}
      <ChatWidget />
    </div>
  );
}
