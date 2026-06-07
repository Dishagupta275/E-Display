
import React from "react";

export default function ClassCard({ cls, onOpen, onDayEdit }) {
  return (
    <div style={{ padding: 12, border: "1px solid #e6e6e6", borderRadius: 8 }}>
      <div style={{ fontWeight: 700 }}>{cls}</div>
      <div style={{ marginTop: 8 }}>
        <button onClick={() => onOpen(cls)} style={{ marginRight: 8, padding: "6px 10px", borderRadius: 6, background: "#06b6d4", color: "#fff", border: "none" }}>Open</button>
        <button onClick={() => onDayEdit(cls)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" }}>Day Edit</button>
      </div>
    </div>
  );
}
