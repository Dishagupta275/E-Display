import { useState, useEffect } from "react";
import api from "../utils/api";

export default function DeviceManager() {
  const [devices, setDevices]     = useState([]);
  const [classes, setClasses]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", assigned_class_id: "" });
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [devRes, clsRes] = await Promise.all([
        api.get("/api/devices"),
        api.get("/api/classes"),
      ]);
      const devData = devRes.data;
      setDevices(Array.isArray(devData) ? devData : devData?.devices ?? devData?.data ?? []);

      // /api/classes returns { "CSE": { "1": [...], "2": [...] }, ... }
      // Flatten into a single array of class objects
      const clsData = clsRes.data || {};
      const flat = [];
      Object.values(clsData).forEach(dept => {
        Object.values(dept).forEach(yearArr => {
          if (Array.isArray(yearArr)) yearArr.forEach(c => flat.push(c));
        });
      });
      setClasses(flat);
    } catch (e) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    try {
      if (editDevice) {
        await api.put(`/api/devices/${editDevice.id}`, {
          name: form.name,
          assigned_class_id: form.assigned_class_id || null,
        });
        setSuccess("Device updated successfully!");
      } else {
        await api.post("/api/devices", {
          name: form.name,
          email: form.email,
          password: form.password,
          assigned_class_id: form.assigned_class_id || null,
        });
        setSuccess("Device created! Set up the Raspberry Pi with these credentials.");
      }
      setShowForm(false);
      setEditDevice(null);
      setForm({ name: "", email: "", password: "", assigned_class_id: "" });
      fetchAll();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save device");
    }
  };

  const handleEdit = (device) => {
    setEditDevice(device);
    setForm({
      name: device.name,
      email: device.email,
      password: "",
      assigned_class_id: device.assigned_class_id || "",
    });
    setShowForm(true);
    setError(""); setSuccess("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this device?")) return;
    try {
      await api.delete(`/api/devices/${id}`);
      setSuccess("Device deactivated");
      fetchAll();
    } catch (e) {
      setError("Failed to deactivate device");
    }
  };

  const handleQuickAssign = async (deviceId, classId) => {
    try {
      await api.put(`/api/devices/${deviceId}`, { assigned_class_id: classId || null });
      setSuccess("Class assigned!");
      fetchAll();
      setTimeout(() => setSuccess(""), 2000);
    } catch (e) {
      setError("Failed to assign class");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading devices...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Device Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Manage Raspberry Pi display boards and their assigned classes</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditDevice(null); setForm({ name: "", email: "", password: "", assigned_class_id: "" }); setError(""); setSuccess(""); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          + Add Device
        </button>
      </div>

      {error   && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">{success}</div>}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            {editDevice ? "Edit Device" : "Add New Device"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Device Name (e.g. Room 301)</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Room 301"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            {!editDevice && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Login Email</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="room301@edisplay.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Password for this device"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Assign Class</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.assigned_class_id}
                onChange={e => setForm({ ...form, assigned_class_id: e.target.value })}
              >
                <option value="">-- No class assigned --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.display_name} — {c.department_name} Yr{c.year}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSubmit} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium">
              {editDevice ? "Update Device" : "Create Device"}
            </button>
            <button onClick={() => { setShowForm(false); setEditDevice(null); }} className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Device List */}
      {devices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🖥️</div>
          <p className="font-medium">No devices yet</p>
          <p className="text-sm mt-1">Add a device to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {devices.map(device => (
            <div key={device.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🖥️</span>
                  <span className="font-semibold text-gray-800 text-lg">{device.name}</span>
                </div>
                <p className="text-gray-500 text-sm mt-1">{device.email}</p>
                <p className="text-sm mt-1">
                  {device.assigned_class
                    ? <span className="text-green-600 font-medium">📚 {device.assigned_class.display_name} — {device.assigned_class.department_name} Yr{device.assigned_class.year}</span>
                    : <span className="text-orange-400">⚠️ No class assigned</span>
                  }
                </p>
              </div>

              {/* Quick assign dropdown */}
              <div className="flex items-center gap-2">
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={device.assigned_class_id || ""}
                  onChange={e => handleQuickAssign(device.id, e.target.value)}
                >
                  <option value="">-- Reassign class --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.display_name}</option>
                  ))}
                </select>
                <button onClick={() => handleEdit(device)} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium">
                  Rename
                </button>
                <button onClick={() => handleDelete(device.id)} className="bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 text-sm font-medium">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
