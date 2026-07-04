import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import Layout from "../components/Layout";
export default function NoticeEditor() {
  const { boardId } = useParams();
  const nav = useNavigate();
  const { logout } = useAuth();
  const [board, setBoard] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const [image, setImage] = useState(null);
  const [adding, setAdding] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef();

  const fetchBoard = async () => {
    try {
      const res = await api.get(`/api/notice-boards/${boardId}/notices`);
      setBoard(res.data.board);
      setNotices(res.data.notices);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoard(); }, [boardId]);

  const handleAddNotice = async () => {
    if (!form.title) return alert('Title is required');
    setAdding(true);
    try {
      if (image) {
  const fd = new FormData();
  fd.append('title', form.title);
  fd.append('content', form.content);
  fd.append('image', image);
  await api.post(`/api/notice-boards/${boardId}/notices`, fd, {
    headers: { 
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
} else {
        await api.post(`/api/notice-boards/${boardId}/notices`, form);
      }
      setForm({ title: '', content: '' });
      setImage(null);
      setShowForm(false);
      fetchBoard();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to add notice');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (noticeId) => {
    if (!window.confirm('Delete this notice?')) return;
    try {
      await api.delete(`/api/notices/${noticeId}`);  // ✅ FIXED
      fetchBoard();
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await api.post(`/api/notice-boards/${boardId}/publish`);
      alert('Board published to display screens!');
    } catch (e) {
      alert('Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleModeChange = async (mode) => {
    try {
      await api.put(`/api/notice-boards/${boardId}`, { display_mode: mode });
      fetchBoard();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

   return (
      <Layout pageTitle="📢 Notifications">
        <div style={s.container}>
        
  
      {/* Header */}
      <div style={s.header}>
        
        <div style={s.headerRight}>
         <button onClick={() => nav('/notice-boards')} style={s.backBtn}>← Boards</button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            style={s.publishBtn}
          >
            {publishing ? 'Publishing...' : '📡 Publish to Display'}
          </button>
        </div>
      </div>

      <div style={s.content}>
        {/* Board info bar */}
        <div style={s.infoBar}>
          <div style={s.infoItem}>
            <span style={s.infoLabel}>Total Notices</span>
            <span style={s.infoValue}>{notices.length}</span>
          </div>
          <div style={s.infoItem}>
            <span style={s.infoLabel}>Visible To</span>
            <span style={s.infoValue}>
              {board?.target_type === 'all' ? '🌐 Entire College' : '🏢 Department'}
            </span>
          </div>
          <div style={s.infoItem}>
            <span style={s.infoLabel}>Display Mode</span>
            <div style={s.modeBtns}>
              <button
                onClick={() => handleModeChange('carousel')}
                style={{
                  ...s.modeBtn,
                  background: board?.display_mode === 'carousel' ? '#1a237e' : '#f0f4f8',
                  color: board?.display_mode === 'carousel' ? '#fff' : '#444',
                }}
              >
                ⏱ Carousel
              </button>
              <button
                onClick={() => handleModeChange('grid')}
                style={{
                  ...s.modeBtn,
                  background: board?.display_mode === 'grid' ? '#1a237e' : '#f0f4f8',
                  color: board?.display_mode === 'grid' ? '#fff' : '#444',
                }}
              >
                ⊞ Grid
              </button>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={s.addBtn}>
            + Add Notice
          </button>
        </div>

        {/* Add Notice Form */}
        {showForm && (
          <div style={s.formCard}>
            <h3 style={s.formTitle}>Add New Notice</h3>
            <div style={s.formGroup}>
              <label style={s.label}>Title *</label>
              <input
                style={s.input}
                placeholder="Notice title..."
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Content (optional if image provided)</label>
              <textarea
                style={{ ...s.input, height: 80, resize: 'vertical' }}
                placeholder="Notice content..."
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Image (optional)</label>
              <div style={s.uploadArea} onClick={() => fileRef.current.click()}>
                {image ? (
                  <div>
                    <img
                      src={URL.createObjectURL(image)}
                      alt="preview"
                      style={s.imagePreview}
                    />
                    <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>{image.name}</p>
                  </div>
                ) : (
                  <div>
                    <div style={s.uploadIcon}>📁</div>
                    <p style={s.uploadText}>Click to upload image</p>
                    <p style={s.uploadHint}>PNG, JPG up to 16MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => setImage(e.target.files[0])}
              />
            </div>
            <div style={s.formActions}>
              <button onClick={handleAddNotice} disabled={adding} style={s.submitBtn}>
                {adding ? 'Adding...' : 'Add Notice'}
              </button>
              <button onClick={() => { setShowForm(false); setImage(null); }} style={s.cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Notices Grid */}
        {notices.length === 0 ? (
          <div style={s.empty}>No notices yet. Add your first notice!</div>
        ) : (
          <div style={s.noticesGrid}>
            {notices.map((notice, idx) => (
              <div key={notice.id} style={s.noticeCard}>
                <div style={s.noticeTop}>
                  <span style={s.noticeOrder}>#{idx + 1}</span>
                  <button
                    onClick={() => handleDelete(notice.id)}
                    style={s.deleteBtn}
                  >
                    🗑 Delete
                  </button>
                </div>
                {notice.image_url && (
                  <img
                    src={`${import.meta.env.VITE_API_URL || "https://e-dispy.onrender.com"}/${notice.image_url.replace(/^\//, '')}`}
                    alt={notice.title}
                    style={s.noticeImg}
                  />
                )}
                <h3 style={s.noticeTitle}>{notice.title}</h3>
                {notice.content && (
                  <p style={s.noticeContent}>{notice.content}</p>
                )}
                <p style={s.noticeDate}>
                  {new Date(notice.created_at).toLocaleDateString('en-IN')}
                </p>
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
  header: { background: 'linear-gradient(135deg, #1a237e, #0d47a1)', color: '#fff', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: 2 },
  subtitle: { margin: '4px 0 0', fontSize: 13, opacity: 0.8 },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  backBtn: { padding: '8px 16px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  publishBtn: { padding: '8px 20px', background: '#fff', color: '#1a237e', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  logoutBtn: { padding: '8px 16px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  content: { padding: '24px 32px' },
  infoBar: { background: '#fff', borderRadius: 12, padding: '16px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  infoLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  infoValue: { fontSize: 15, fontWeight: 700, color: '#1a237e' },
  modeBtns: { display: 'flex', gap: 6 },
  modeBtn: { padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  addBtn: { marginLeft: 'auto', padding: '10px 20px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  formCard: { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  formTitle: { fontSize: 16, fontWeight: 700, color: '#1a237e', marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  uploadArea: { border: '2px dashed #e0e0e0', borderRadius: 8, padding: 24, textAlign: 'center', cursor: 'pointer', background: '#f9fafb' },
  uploadIcon: { fontSize: 32, marginBottom: 8 },
  uploadText: { fontSize: 14, fontWeight: 600, color: '#444', margin: '0 0 4px' },
  uploadHint: { fontSize: 12, color: '#888', margin: 0 },
  imagePreview: { maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' },
  formActions: { display: 'flex', gap: 12, marginTop: 16 },
  submitBtn: { padding: '10px 24px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { padding: '10px 24px', background: '#f0f4f8', color: '#444', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' },
  empty: { textAlign: 'center', padding: 60, color: '#666', background: '#fff', borderRadius: 12 },
  noticesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  noticeCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e0e0e0' },
  noticeTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  noticeOrder: { background: '#e3f2fd', color: '#0d47a1', padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 },
  deleteBtn: { padding: '4px 10px', background: '#fff0f0', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  noticeImg: { width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 12 },
  noticeTitle: { fontSize: 15, fontWeight: 700, color: '#1a237e', margin: '0 0 8px' },
  noticeContent: { fontSize: 13, color: '#444', lineHeight: 1.5, margin: '0 0 8px' },
  noticeDate: { fontSize: 11, color: '#888', margin: 0 },
};