const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimetableView({ timings, timetable, currentDay, currentIdx }) {
  if (!timings || timings.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
        Loading timetable...
      </div>
    );
  }

  return (
    <div className="tt-container">
      <table className="tt-table">
        <thead>
          <tr>
            <th className="tt-head dark">DAY / PERIOD</th>
            {timings.map((timing, i) => (
              <th key={i} className="tt-head dark">
                <div>P{timing.period_number}</div>
                <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 400 }}>
                  {timing.start_time}–{timing.end_time}
                </div>
                {timing.label && (
                  <div style={{ fontSize: 10, color: "#ffcc80" }}>{timing.label}</div>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {DAYS.map((day) => (
            <tr key={day}>
              {/* Day label */}
              <td className={`tt-day dark ${day === currentDay ? "current-day" : ""}`}>
                {day}
                {day === currentDay && (
                  <div style={{ fontSize: 10, color: "#ffcc80", marginTop: 2 }}>TODAY</div>
                )}
              </td>

              {/* Slots */}
              {timings.map((timing, idx) => {
                const daySlots = timetable[day] || [];
                const slot = daySlots.find(s => s.period_number === timing.period_number);

                const isBreak = timing.label === "Break" || timing.label === "Lunch";
                const isCurrent = day === currentDay && idx === currentIdx;
                const hasSubject = slot?.subject_name;

                let cellClass = "tt-cell";
                if (isBreak) cellClass += " break";
                else if (hasSubject && hasSubject.includes("LAB")) cellClass += " lab";
                if (isCurrent && !isBreak) cellClass += " current";

                return (
                  <td key={idx} className={cellClass}>
                    {isBreak ? (
                      <div className="subject-text" style={{ color: "#888", fontStyle: "italic" }}>
                        {timing.label}
                      </div>
                    ) : (
                      <>
                        <div className="subject-text">
                          {slot?.subject_name || "—"}
                        </div>
                        {slot?.faculty_name && (
                          <div className="faculty-text">{slot.faculty_name}</div>
                        )}
                      </>
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