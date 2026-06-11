import { useState, useEffect, useCallback } from "react";
import { devicesAPI } from "../utils/api";

const STATUS_META = {
  online:  { label: "Online",  color: "#16a34a", bg: "#dcfce7", dot: "#16a34a" },
  offline: { label: "Offline", color: "#dc2626", bg: "#fee2e2", dot: "#dc2626" },
  unknown: { label: "Unknown", color: "#6b7280", bg: "#f3f4f6", dot: "#6b7280" },
};

const REFRESH_INTERVAL = 30;

export default function DeviceMonitor() {
  const [devices, setDevices]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [lastRefresh, setLastRefresh]   = useState(null);
  const [countdown, setCountdown]       = useState(REFRESH_INTERVAL);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDept, setFilterDept]     = useState("all");
  const [search, setSearch]             = useState("");

  const fetchDevices = useCallback(async () => {
    try {
      setError(null);
      const res = await devicesAPI.getStatus();
      setDevices(res.data || []);
      setLastRefresh(new Date());
      setCountdown(REFRESH_INTERVAL);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        "Could not reach the server. Check your connection."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { fetchDevices(); return REFRESH_INTERVAL; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [fetchDevices]);

  const departments = ["all", ...new Set(devices.map((d) => d.department || "Unknown"))];

  const filtered = devices.filter((d) => {
    const status      = d.is_online ? "online" : "offline";
    const matchStatus = filterStatus === "all" || status === filterStatus;
    const matchDept   = filterDept === "all" || (d.department || "Unknown") === filterDept;
    const matchSearch = !search ||
      d.room_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.class_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.ip_address?.includes(search);
    return matchStatus && matchDept && matchSearch;
  });

  const total   = devices.length;
  const online  = devices.filter((d) => d.is_online).length;
  const offline = total - online;

  const formatTime = (isoString) => {
    if (!isoString) return "Never";
    const diff = Math.floor((new Date() - new Date(isoString)) / 1000);
    if (diff < 60)    return `${diff}s ago`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(isoString).toLocaleDateString();
  };

  const formatLastSeen = (isoString) => {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={s.page}>

      {/* Page Title */}
      <h2 style={s.pageTitle}>🖥️ Device Monitor</h2>

      {/* Summary Cards */}
      <div style={s.summaryRow}>
        <SummaryCard label="Total Devices" value={total}   color="#1e3a8a" />
        <SummaryCard label="Online"         value={online}  color="#16a34a" />
        <SummaryCard label="Offline"        value={offline} color="#dc2626" alert={offline > 0} />
        <SummaryCard
          label="Uptime"
          value={total > 0 ? `${Math.round((online / total) * 100)}%` : "—"}
          color={online / total >= 0.9 ? "#16a34a" : "#d97706"}
        />
      </div>

      {/* Controls */}
      <div style={s.controlsCard}>
        <div style={s.controlsRow}>
          <input
            style={s.searchInput}
            placeholder="🔍  Search by room, class or IP…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select style={s.select} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
          <select style={s.select} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
            {departments.map((d) => (
              <option key={d} value={d}>{d === "all" ? "All Departments" : d}</option>
            ))}
          </select>
          <button style={s.refreshBtn} onClick={fetchDevices} disabled={loading}>
            ↻ Refresh
          </button>
        </div>
        {lastRefresh && (
          <p style={s.refreshNote}>
            Last updated {formatTime(lastRefresh)} · auto-refreshing in {countdown}s
          </p>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div style={s.errorBanner}>⚠️ {error}</div>
      )}

      {/* Content */}
      {loading ? (
        <div style={s.center}>
          <div style={s.spinner} />
          <p style={{ color: "#6b7280", marginTop: 16 }}>Fetching device status…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={s.center}>
          <p style={{ fontSize: 48 }}>📺</p>
          <p style={{ color: "#6b7280", marginTop: 8 }}>
            {devices.length === 0 ? "No devices registered yet." : "No devices match your filters."}
          </p>
        </div>
      ) : (
        <div style={s.grid}>
          {filtered.map((device) => (
            <DeviceCard key={device.id} device={device} formatLastSeen={formatLastSeen} />
          ))}
        </div>
      )}

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color, alert }) {
  return (
    <div style={{ ...s.summaryCard, borderColor: alert ? "#fca5a5" : "#e5e7eb" }}>
      <span style={{ ...s.summaryValue, color }}>{value}</span>
      <span style={s.summaryLabel}>{label}</span>
    </div>
  );
}

function DeviceCard({ device, formatLastSeen }) {
  const status = device.is_online ? "online" : "offline";
  const meta   = STATUS_META[status];
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={s.card} onClick={() => setExpanded((p) => !p)}>
      {/* Top row */}
      <div style={s.cardTop}>
        <div style={s.roomInfo}>
          <span style={s.roomName}>{device.room_name || "Unnamed Room"}</span>
          <span style={s.deptName}>{device.department || "—"}</span>
        </div>
        <span style={{ ...s.badge, background: meta.bg, color: meta.color }}>
          <span style={{ ...s.dot, background: meta.dot }} />
          {meta.label}
        </span>
      </div>

      {/* Class name */}
      {device.class_name && (
        <p style={s.className}>📋 {device.class_name}</p>
      )}

      {/* Quick meta */}
      <div style={s.metaRow}>
        <span style={s.metaItem}>🕐 {formatLastSeen(device.last_seen)}</span>
        {device.ip_address && (
          <span style={s.metaItem}>🌐 {device.ip_address}</span>
        )}
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={s.expanded}>
          <div style={s.divider} />
          <DetailRow label="IP Address" value={device.ip_address || "—"} />
          <DetailRow label="Device ID"  value={device.id} />
          <DetailRow label="Last Seen"  value={device.last_seen ? new Date(device.last_seen).toLocaleString() : "Never"} />
          <DetailRow label="Registered" value={device.created_at ? new Date(device.created_at).toLocaleDateString() : "—"} />
        </div>
      )}

      <div style={s.expandHint}>{expanded ? "▲ Less" : "▼ Details"}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={s.detailRow}>
      <span style={s.detailLabel}>{label}</span>
      <span style={s.detailValue}>{String(value)}</span>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: "100vh",
    background: "#f0f2f5",
    padding: "28px 32px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1e3a8a",
    marginBottom: 20,
  },

  // Summary
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 16,
    marginBottom: 20,
  },
  summaryCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "20px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  summaryValue: {
    fontSize: 34,
    fontWeight: 700,
    lineHeight: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  },

  // Controls
  controlsCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  controlsRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    minWidth: 220,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "9px 14px",
    fontSize: 14,
    color: "#111827",
    outline: "none",
    background: "#fff",
  },
  select: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "9px 14px",
    fontSize: 14,
    color: "#111827",
    background: "#fff",
    cursor: "pointer",
    outline: "none",
  },
  refreshBtn: {
    background: "#1e3a8a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  refreshNote: {
    fontSize: 12,
    color: "#9ca3af",
    margin: "10px 0 0",
  },

  // Error
  errorBanner: {
    background: "#fee2e2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 20,
    fontSize: 14,
  },

  // Center / loading
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 0",
  },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid #e5e7eb",
    borderTop: "3px solid #1e3a8a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },

  // Grid
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },

  // Device Card
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "18px 18px 10px",
    cursor: "pointer",
    userSelect: "none",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    transition: "box-shadow 0.15s",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  roomInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  roomName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1e3a8a",
  },
  deptName: {
    fontSize: 12,
    color: "#6b7280",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 20,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    display: "inline-block",
  },
  className: {
    fontSize: 13,
    color: "#374151",
    margin: "0 0 8px",
  },
  metaRow: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  metaItem: {
    fontSize: 12,
    color: "#6b7280",
  },
  expandHint: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "right",
    marginTop: 8,
  },
  expanded: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    background: "#f3f4f6",
    marginBottom: 10,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    fontSize: 13,
  },
  detailLabel: {
    color: "#6b7280",
  },
  detailValue: {
    color: "#111827",
    fontFamily: "monospace",
    fontSize: 12,
  },
};