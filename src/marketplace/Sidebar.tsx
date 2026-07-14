import { useM } from './context'
import { MASCOT_URL } from '../brand'
import { useLang } from '../i18n'

export default function Sidebar() {
  const { state, goHome, openRequests, openPeople, openAdmin, openGuide, openSell, toggleSavedView, toggleFreeView } = useM()
  const { t } = useLang()
  const s = state
  const counts = s.categoryCounts
  const totalCount = Object.values(counts).reduce((a, n) => a + n, 0)

  return (
    <aside
      className="lok-sidebar"
      style={{ width: 236, flex: 'none', background: '#F5F5F3', borderRight: '1px solid #D8D8D4', padding: '20px 15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      <div>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', padding: '0 11px 9px', letterSpacing: '.1em' }}>{t('COMMUNITY')}</div>
        <button
          onClick={goHome}
          className="lok-navi"
          style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, fontSize: 14, padding: '10px 12px', borderRadius: 0, background: s.view === 'browse' && !s.freeOnly && !s.savedOnly ? '#E8F2F7' : 'transparent', color: s.view === 'browse' && !s.freeOnly && !s.savedOnly ? '#2F6B85' : '#3A3B3E', marginBottom: 2 }}
        >
          <span style={{ width: 26, height: 26, borderRadius: 0, background: '#F0EEE6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flex: 'none' }}>🏠</span>
          <span style={{ flex: 1 }}>{t('Home')}</span>
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, color: '#ABABA6', fontWeight: 500 }}>{t('BROWSE')}</span>
        </button>
        <button
          onClick={openRequests}
          className="lok-navi"
          style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, fontSize: 14, padding: '10px 12px', borderRadius: 0, background: s.view === 'requests' ? '#E8F2F7' : 'transparent', color: s.view === 'requests' ? '#2F6B85' : '#3A3B3E', marginBottom: 2 }}
        >
          <span style={{ width: 26, height: 26, borderRadius: 0, background: '#E7EEF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flex: 'none' }}>🙋</span>
          <span style={{ flex: 1 }}>{t('Requests')}</span>
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, color: '#ABABA6', fontWeight: 500 }}>{t('WANTED')}</span>
        </button>
        {!s.guest && (
          <button
            onClick={openPeople}
            className="lok-navi"
            style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, fontSize: 14, padding: '10px 12px', borderRadius: 0, background: s.view === 'people' ? '#E8F2F7' : 'transparent', color: s.view === 'people' ? '#2F6B85' : '#3A3B3E', marginBottom: 2 }}
          >
            <span style={{ width: 26, height: 26, borderRadius: 0, background: '#E7F1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flex: 'none' }}>👋</span>
            <span style={{ flex: 1 }}>{t('People')}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#1E9E5A', fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3DBB6E' }} />
              {s.onlineIds.length}
            </span>
          </button>
        )}
        <button
          onClick={toggleFreeView}
          className="lok-navi"
          style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, fontSize: 14, padding: '10px 12px', borderRadius: 0, background: s.freeOnly && s.view === 'browse' ? '#E8F2F7' : 'transparent', color: s.freeOnly && s.view === 'browse' ? '#2F6B85' : '#3A3B3E', marginBottom: 2 }}
        >
          <span style={{ width: 26, height: 26, borderRadius: 0, background: '#EAF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flex: 'none' }}>💝</span>
          <span style={{ flex: 1 }}>{t('Free & Donations')}</span>
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, color: '#ABABA6', fontWeight: 500 }}>{t('SHARE')}</span>
        </button>
        <button
          onClick={openGuide}
          className="lok-navi"
          style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, fontSize: 14, padding: '10px 12px', borderRadius: 0, background: s.view === 'guide' ? '#E8F2F7' : 'transparent', color: s.view === 'guide' ? '#2F6B85' : '#3A3B3E', marginBottom: 2 }}
        >
          <span style={{ width: 26, height: 26, borderRadius: 0, background: '#EDF5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flex: 'none' }}>📖</span>
          <span style={{ flex: 1 }}>{t('Guide')}</span>
          <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, color: '#ABABA6', fontWeight: 500 }}>{t('HOW-TO')}</span>
        </button>
        {/* only rendered for role='admin' — RLS guards the data either way */}
        {!s.guest && s.profile.role === 'admin' && (
          <button
            onClick={openAdmin}
            className="lok-navi"
            style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, fontSize: 14, padding: '10px 12px', borderRadius: 0, background: s.view === 'admin' ? '#E8F2F7' : 'transparent', color: s.view === 'admin' ? '#2F6B85' : '#3A3B3E', marginBottom: 2 }}
          >
            <span style={{ width: 26, height: 26, borderRadius: 0, background: '#F1E4E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flex: 'none' }}>🛡️</span>
            <span style={{ flex: 1 }}>{t('Admin')}</span>
            {s.openReports > 0 ? (
              <span title={`${s.openReports} ${s.openReports > 1 ? t('open reports') : t('open report')}`} style={{ minWidth: 19, height: 19, borderRadius: 0, background: '#D4562F', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, fontWeight: 700, padding: '0 5px' }}>{s.openReports}</span>
            ) : (
              <span style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 9, color: '#ABABA6', fontWeight: 500 }}>{t('STAFF')}</span>
            )}
          </button>
        )}
      </div>

      {/* categories live as chips above the grid — this rail carries actions + live stats */}
      <div>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', padding: '0 11px 9px', letterSpacing: '.1em' }}>{t('QUICK ACTIONS')}</div>
        <button
          onClick={openSell}
          className="lok-btn"
          style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontWeight: 800, fontSize: 14, padding: '12px 12px', borderRadius: 0, background: '#000000', color: '#FFFFFF', marginBottom: 8 }}
        >
          <span style={{ color: '#519BB8', fontSize: 16, lineHeight: 1 }}>＋</span> {t('Sell an item')}
        </button>
        {!s.guest && (
          <button
            onClick={toggleSavedView}
            className="lok-navi"
            style={{ width: '100%', border: '1px solid #D8D8D4', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontWeight: 700, fontSize: 13.5, padding: '11px 12px', borderRadius: 0, background: s.savedOnly ? '#E8F2F7' : '#FFFFFF', color: s.savedOnly ? '#2F6B85' : '#3A3B3E' }}
          >
            ★ {t('Saved items')}{Object.keys(s.saved).length > 0 ? ` (${Object.keys(s.saved).length})` : ''}
          </button>
        )}
      </div>

      <div>
        <div style={{ fontFamily: "'Spline Sans Mono',monospace", fontSize: 10, color: '#9A9A94', padding: '0 11px 9px', letterSpacing: '.1em' }}>{t('MARKET PULSE')}</div>
        <div style={{ background: '#FFFFFF', border: '1px solid #D8D8D4', padding: '4px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #ECECEA' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#3A3B3E' }}>{t('Live listings')}</span>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#000000' }}>{totalCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #ECECEA' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#3A3B3E' }}>{t('Neighbours online')}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1E9E5A' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3DBB6E' }} />
              {s.guest ? '—' : s.onlineIds.length}
            </span>
          </div>
          {/* credibility counter — total completed escrow trades, live */}
          {s.marketStats != null && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#3A3B3E' }}>{t('Trades completed')} ✅</span>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#000000' }}>{s.marketStats}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 'auto', background: 'var(--accent,#000000)', borderRadius: 0, padding: 17, color: '#EAF3EE', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }} />
        {/* mascot tucked into the corner, small — the text keeps clear of it */}
        {MASCOT_URL && <img src={MASCOT_URL} alt="" aria-hidden className="lok-mascot" style={{ position: 'absolute', right: -6, bottom: -8, width: 52, opacity: 0.9, transform: 'rotate(6deg)' }} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 800, marginBottom: 7, color: '#fff', position: 'relative' }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="#fff"><path d="M12 2l2.4 1.8 3-.2 1 2.8 2.6 1.5-.7 2.9L23 12l-1.7 2.4.7 2.9-2.6 1.5-1 2.8-3-.2L12 22l-2.4-1.8-3 .2-1-2.8L2.7 16.3l.7-2.9L1 12l1.7-2.4L2 6.7l2.6-1.5 1-2.8 3 .2z" /></svg>
          {t('Dorm-Verified trading')}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.55, color: '#C6DDD2', position: 'relative', paddingRight: 44 }}>{t('Every seller is a checked-in student. Pay in-app, pick up at the Security Post — no risky meetups.')}</div>
      </div>
    </aside>
  )
}
