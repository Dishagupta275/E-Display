import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

import Layout from "../components/Layout";
export default function NoticeBoards() {
  const nav = useNavigate();
  const { currentUser, logout } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    target_type: 'all',
    display_mode: 'carousel',
    carousel_time: 10,
  });
  const [creating, setCreating] = useState(false);

  const fetchBoards = async () => {
    try {
      const res = await api.get('/api/notice-boards');
      setBoards(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoards(); }, []);

  const handleCreate = async () => {
    if (!form.name) return alert('Board name is required');
    setCreating(true);
    try {
      await api.post('/api/notice-boards', form);
      setShowForm(false);
      setForm({ name: '', target_type: 'all', display_mode: 'carousel', carousel_time: 10 });
      fetchBoards();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this board?')) return;
    try {
      await api.delete(`/api/notice-boards/${id}`);
      fetchBoards();
    } catch (e) {
      alert('Failed to delete');
    }
  };

  return (
    <Layout pageTitle="📢 Notifications">
      <div style={s.container}>
      

      <div style={s.content}>
        {/* Page title + create button */}
        <div style={s.topRow}>
          <h2 style={s.pageTitle}>📋 Notice Boards</h2>
          <button onClick={() => setShowForm(!showForm)} style={s.createBtn}>
            + Create New Board
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div style={s.formCard}>
            <h3 style={s.formTitle}>Create New Notice Board</h3>
            <div style={s.formGrid}>
              <div style={s.formGroup}>
                <label style={s.label}>Board Name *</label>
                <input
                  style={s.input}
                  placeholder="e.g. CSE Department Board"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {currentUser?.role === 'principal' && (
                <div style={s.formGroup}>
                  <label style={s.label}>Visible To</label>
                  <select
                    style={s.input}
                    value={form.target_type}
                    onChange={e => setForm({ ...form, target_type: e.target.value })}
                  >
                    <option value="all">Entire College</option>
                    <option value="department">My Department Only</option>
                  </select>
                </div>
              )}

              <div style={s.formGroup}>
                <label style={s.label}>Display Mode</label>
                <select
                  style={s.input}
                  value={form.display_mode}
                  onChange={e => setForm({ ...form, display_mode: e.target.value })}
                >
                  <option value="carousel">Carousel (one by one)</option>
                  <option value="grid">Grid (all at once, max 4)</option>
                </select>
              </div>

              {form.display_mode === 'carousel' && (
                <div style={s.formGroup}>
                  <label style={s.label}>Time per Notice (minutes)</label>
                  <select
                    style={s.input}
                    value={form.carousel_time}
                    onChange={e => setForm({ ...form, carousel_time: parseInt(e.target.value) })}
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
              )}
            </div>

            <div style={s.formActions}>
              <button onClick={handleCreate} disabled={creating} style={s.submitBtn}>
                {creating ? 'Creating...' : 'Create Board'}
              </button>
              <button onClick={() => setShowForm(false)} style={s.cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Boards Grid */}
        {loading ? (
          <div style={s.loading}>Loading boards...</div>
        ) : boards.length === 0 ? (
          <div style={s.empty}>No notice boards yet. Create your first one!</div>
        ) : (
          <div style={s.boardsGrid}>
            {boards.map(board => (
              <div key={board.id} style={s.boardCard}>
                <div style={s.boardTop}>
                  <div style={s.boardIcon}>📋</div>
                  <div style={s.boardBadge}>
                    {board.target_type === 'all' ? '🌐 College' : '🏢 Department'}
                  </div>
                </div>
                <h3 style={s.boardName}>{board.name}</h3>
                <div style={s.boardMeta}>
                  <span>{board.notice_count} notices</span>
                  <span>•</span>
                  <span>{board.display_mode === 'carousel' ? `⏱ ${board.carousel_time}min` : '⊞ Grid'}</span>
                </div>
                <div style={s.boardActions}>
                  <button
                    onClick={() => nav(`/notice-boards/${board.id}`)}
                    style={s.openBtn}
                  >
                    Open Board
                  </button>
                  <button
                    onClick={() => handleDelete(board.id)}
                    style={s.deleteBtn}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
      </Layout>
      );
    }

const s = {
  container: { minHeight: '100vh', background: '#f0f4f8', fontFamily: 'sans-serif' },
  content: { padding: '24px 32px' },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 20, fontWeight: 700, color: '#1a237e', margin: 0 },
  createBtn: { padding: '10px 20px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  formCard: { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  formTitle: { fontSize: 16, fontWeight: 700, color: '#1a237e', marginBottom: 20 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#333' },
  input: { padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 14, outline: 'none' },
  formActions: { display: 'flex', gap: 12 },
  submitBtn: { padding: '10px 24px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { padding: '10px 24px', background: '#f0f4f8', color: '#444', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' },
  loading: { textAlign: 'center', padding: 60, color: '#666' },
  empty: { textAlign: 'center', padding: 60, color: '#666', background: '#fff', borderRadius: 12 },
  boardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  boardCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e0e0e0' },
  boardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  boardIcon: { fontSize: 28 },
  boardBadge: { fontSize: 11, fontWeight: 600, background: '#e3f2fd', color: '#0d47a1', padding: '3px 10px', borderRadius: 10 },
  boardName: { fontSize: 16, fontWeight: 700, color: '#1a237e', margin: '0 0 8px' },
  boardMeta: { display: 'flex', gap: 8, fontSize: 12, color: '#666', marginBottom: 16 },
  boardActions: { display: 'flex', gap: 8 },
  openBtn: { flex: 1, padding: '8px 0', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  deleteBtn: { padding: '8px 12px', background: '#fff0f0', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
};