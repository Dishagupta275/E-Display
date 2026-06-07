import React from "react";

/**
 * Lightweight reusable grid (not used heavily in pages above but available if needed)
 * Props:
 *  - periods: array of period labels
 *  - week: { Monday: [...], ... }
 *  - onChange(day, idx, value)
 */
export default function TimetableGrid({ periods, week, onChange }) {
  if (!week || !periods) return null;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ padding: 8 }}>Period</th>
            {Object.keys(week).map((d) => <th key={d} style={{ padding: 8 }}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {periods.map((p, i) => (
            <tr key={i}>
              <td style={{ padding: 8 }}>{p}</td>
              {Object.keys(week).map((d) => (
                <td key={d} style={{ padding: 8 }}>
                  <input value={week[d][i] || ""} onChange={(e) => onChange(d, i, e.target.value)} style={{ width: "100%", padding: 6, borderRadius: 6 }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
