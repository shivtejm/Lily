import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, FileText, User, Mic, ChevronRight, Settings } from 'lucide-react'
import './App.css'

function App() {
  const [profile, setProfile] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    // Load user profile from Chrome storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('userInfo', (result) => {
        if (result.userInfo && result.userInfo.firstName) {
          setProfile(result.userInfo)
        }
      })
    }
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getInitials = () => {
    if (!profile) return '?'
    const f = profile.firstName?.[0] || ''
    const l = profile.lastName?.[0] || ''
    return (f + l).toUpperCase() || '?'
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleFillForm = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        await chrome.tabs.sendMessage(tab.id, { action: 'fillForm' })
        showToast('✨ Form fields filled!')
      }
    } catch {
      showToast('⚠ Open a page with a form first')
    }
  }

  const handleSpeak = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        await chrome.tabs.sendMessage(tab.id, { action: 'startListening' })
        showToast('🎙️ Listening...')
      }
    } catch {
      showToast('⚠ Open a page first')
    }
  }

  const handleOpenSidePanel = () => {
    if (typeof chrome !== 'undefined' && chrome.sidePanel) {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        chrome.sidePanel.open({ tabId: tab.id })
      })
    }
  }

  const actions = [
    {
      icon: <FileText size={20} />,
      color: 'purple',
      title: 'Fill Form Fields',
      subtitle: 'Auto-fill the current page',
      onClick: handleFillForm,
    },
    {
      icon: <Mic size={20} />,
      color: 'blue',
      title: 'Speak to Lily',
      subtitle: 'Use voice commands',
      onClick: handleSpeak,
    },
    {
      icon: <User size={20} />,
      color: 'green',
      title: 'Open Profile',
      subtitle: 'Edit your saved information',
      onClick: handleOpenSidePanel,
    },
  ]

  return (
    <div className="lily-app">
      {/* Header */}
      <header className="lily-header">
        <div className="lily-brand">
          <motion.div
            className="lily-logo"
            animate={{ boxShadow: ['0 0 16px rgba(192,132,252,0.3)', '0 0 24px rgba(192,132,252,0.5)', '0 0 16px rgba(192,132,252,0.3)'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Zap size={20} strokeWidth={2.5} />
          </motion.div>
          <h1>
            Lily
            <span>AI Job Assistant</span>
          </h1>
        </div>
        <div className="status-badge">
          <div className="status-dot" />
          Active
        </div>
      </header>

      {/* Greeting Card */}
      <motion.div
        className="greeting-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="greeting-text">
          <h2>
            {getGreeting()}! <span className="wave-emoji">🙏</span>
          </h2>
          <p>Namaste! I&apos;m ready to help you with your job applications today.</p>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="section-label">Quick Actions</div>
      <div className="quick-actions">
        {actions.map((action, i) => (
          <motion.button
            key={i}
            className="action-btn"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + i * 0.08 }}
            onClick={action.onClick}
            whileTap={{ scale: 0.98 }}
          >
            <div className={`action-icon ${action.color}`}>
              {action.icon}
            </div>
            <div className="action-info">
              <strong>{action.title}</strong>
              <span>{action.subtitle}</span>
            </div>
            <ChevronRight size={16} className="action-arrow" />
          </motion.button>
        ))}
      </div>

      {/* Profile Summary */}
      <motion.div
        className="profile-summary"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        {profile ? (
          <>
            <div className="profile-avatar">{getInitials()}</div>
            <div className="profile-info">
              <strong>{profile.firstName} {profile.lastName}</strong>
              <span>{profile.email || 'No email set'}</span>
            </div>
            <button className="profile-edit-btn" onClick={handleOpenSidePanel}>
              <Settings size={12} /> Edit
            </button>
          </>
        ) : (
          <>
            <div className="profile-avatar">?</div>
            <div className="no-profile">No profile set up yet</div>
            <button className="profile-edit-btn" onClick={handleOpenSidePanel}>
              Set Up
            </button>
          </>
        )}
      </motion.div>

      {/* Footer */}
      <footer className="lily-footer">
        <div className="footer-text">
          Powered by <span>Lily AI</span>
        </div>
        <div className="shortcut-hint">
          <kbd>Alt</kbd>+<kbd>L</kbd> to toggle
        </div>
      </footer>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="feedback-toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
