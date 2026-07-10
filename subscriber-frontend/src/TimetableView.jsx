const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const LABEL_CLASS = {
  Break: "tt-break",
  Lunch: "tt-lunch",
  Library: "tt-library",
};

export default function TimetableView({ timings, timetable, currentDay, currentIdx }) {
  if (!timings || timings.length === 0) {
    return <div className="tt-loading">Loading timetable...</div>;
  }

  return (
    <div className="tt-container">
      <table className="tt-table">
        <thead>
          <tr>
            <th className="tt-head tt-corner">TIME / DAY</th>
            {timings.map((timing, i) => (
              <th key={i} className="tt-head">
                {timing.start_time}–{timing.end_time}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {DAYS.map((day) => (
            <tr key={day}>
              <td className={`tt-day ${day === currentDay ? "tt-day-current" : ""}`}>
                {day}
                {day === currentDay && <div className="tt-today-tag">TODAY</div>}
              </td>

              {timings.map((timing, idx) => {
                const daySlots = timetable[day] || [];
                const slot = daySlots.find((s) => s.period_number === timing.period_number);
                const label = timing.label; // "Break" | "Lunch" | "Library" | undefined
                const isCurrent = day === currentDay && idx === currentIdx;
                const isLab = slot?.subject_name?.toUpperCase().includes("LAB");

                let cellClass = "tt-cell";
                if (label && LABEL_CLASS[label]) cellClass += ` ${LABEL_CLASS[label]}`;
                else if (isLab) cellClass += " tt-lab";
                if (isCurrent) cellClass += " tt-current";

                return (
                  <td key={idx} className={cellClass}>
                    {label ? (
                      <div className="tt-label-text">{label}</div>
                    ) : (
                      <>
                        <div className="tt-subject">{slot?.subject_name || "—"}</div>
                        {slot?.faculty_name && (
                          <div className="tt-faculty">{slot.faculty_name}</div>
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