import React, { useState } from "react";
import { useParams } from "react-router-dom";

export default function CreateTimings() {
  const { classname } = useParams();

  const [breakTime, setBreakTime] = useState({ start: "", end: "" });
  const [lunchTime, setLunchTime] = useState({ start: "", end: "" });

  const save = async () => {
    if (!breakTime.start || !lunchTime.start) {
      alert("Fill all timing fields");
      return;
    }

  
    await fetch(`https://e-dispy.onrender.com/api/timings/${classname}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        break: breakTime,
        lunch: lunchTime
      })
    });

    alert("Timings saved");
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <h2> Timings for {classname}</h2>

      <h4>Break</h4>
      <input type="time" onChange={e => setBreakTime({ ...breakTime, start: e.target.value })} />
      <input type="time" onChange={e => setBreakTime({ ...breakTime, end: e.target.value })} />

      <h4 style={{ marginTop: 20 }}>Lunch</h4>
      <input type="time" onChange={e => setLunchTime({ ...lunchTime, start: e.target.value })} />
      <input type="time" onChange={e => setLunchTime({ ...lunchTime, end: e.target.value })} />

      <br /><br />
      <button onClick={save} style={{ padding: "8px 14px" }}>
        Save Timings
      </button>
    </div>
  );
}
