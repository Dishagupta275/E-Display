import React from "react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function TimetableView({
  periods,
  week,
  currentDay,
  currentIdx,
}) {
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
              {/* DAY HEADER */}
              <td className="tt-day dark">{day}</td>

              {/* SUBJECT SLOTS */}
              {(week[day] || []).map((slot, idx) => {
                let subject = "";
                let professor = "";

                // 🔥 HANDLE ALL POSSIBLE SLOT TYPES
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

                if (subject.includes("LAB")) cellClass += " lab";
                else if (
                  subject.includes("BREAK") ||
                  subject.includes("LUNCH")
                )
                  cellClass += " break";
                else if (
                  subject.includes("SPORTS") ||
                  subject.includes("LIBRARY")
                )
                  cellClass += " sports";

                if (day === currentDay && idx === currentIdx) {
                  cellClass += " current";
                }

                return (
                  <td key={idx} className={cellClass}>
                    <div className="subject-text">{subject || " "}</div>
                    {professor && (
                      <div className="faculty-text">{professor}</div>
                    )}
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
