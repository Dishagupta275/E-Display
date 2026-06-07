import React from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimetableView({ periods, week, currentDay, currentIdx }) {
  return (
    <div className="tt-container">
      <table className="tt-table">
        <thead>
          <tr>
            <th className="tt-head dark">TIME / DAY</th>
            {periods.map((time, i) => (
              <th key={i} className="tt-head dark">
                {time}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {DAYS.map((day) => (
            <tr key={day}>
              {/* DAY HEADER — highlight today */}
              <td
                className="tt-day dark"
                style={day === currentDay ? {
                  background: "#1a1a1a",
                  borderLeft: "4px solid #ff1a00",
                } : {}}
              >
                {day}
                {day === currentDay && (
                  <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2, color: "#ff6b6b" }}>
                    TODAY
                  </div>
                )}
              </td>

              {/* SUBJECT SLOTS */}
              {(week[day] || []).map((slot, idx) => {
                let subject = "";
                let professor = "";

                if (typeof slot === "string") {
                  subject = slot;
                } else if (Array.isArray(slot)) {
                  subject = slot[0] || "";
                  professor = slot[1] || "";
                } else if (slot && typeof slot === "object") {
                  subject = slot.subject || "";
                  professor = slot.professor || "";
                }

                let cellClass = "tt-cell";

                if (subject.toUpperCase().includes("LAB"))    cellClass += " lab";
                else if (subject.toUpperCase().includes("BREAK") || subject.toUpperCase().includes("LUNCH")) cellClass += " break";
                else if (subject.toUpperCase().includes("SPORTS") || subject.toUpperCase().includes("LIBRARY")) cellClass += " sports";

                // Red outline only on current period of today
                if (day === currentDay && idx === currentIdx) {
                  cellClass += " today";
                }

                return (
                  <td key={idx} className={cellClass}>
                    <div className="subject-text">{subject || " "}</div>
                    {professor && <div className="faculty-text">{professor}</div>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
