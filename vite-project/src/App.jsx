import { useCallback, useEffect, useState } from 'react'
import './App.css'

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  const text = await response.text()
  let data = {}

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      const fallbackMessage = text.slice(0, 220)
      if (!response.ok) {
        throw new Error(fallbackMessage || 'So‘rovni bajarib bo‘lmadi.')
      }
      throw new Error(`Server javobi JSON formatida emas: ${fallbackMessage}`)
    }
  }

  if (!response.ok) {
    if (response.status === 404 && /^\/subjects\/?$/i.test(path)) {
      throw new Error('Fan qo‘shish manzili topilmadi. Serverni qayta ishga tushirib ko‘ring.')
    }
    throw new Error(data.error || 'So‘rovni bajarib bo‘lmadi.')
  }
  return data
}

const roleNames = {
  admin: 'Administrator',
  teacher: 'O‘qituvchi',
  student: 'O‘quvchi',
}

const weekdays = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']

function weekdayForDate(date) {
  return date ? weekdays[new Date(`${date}T00:00:00Z`).getUTCDay()] : ''
}

function parseStudentSchedule(schedule = '') {
  const knownDays = [...weekdays.slice(1), weekdays[0]]
  const rows = []
  const legacyLines = []
  for (const line of schedule.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)) {
    const match = line.match(/^(Yakshanba|Dushanba|Seshanba|Chorshanba|Payshanba|Juma|Shanba)\s+((?:[01]\d|2[0-3]):[0-5]\d)(?:\s*[—–-]\s*(.*))?$/u)
    if (match && knownDays.includes(match[1])) {
      rows.push({ weekday: match[1], time: match[2].padStart(5, '0'), subject: match[3] || '' })
    } else {
      legacyLines.push(line)
    }
  }
  return { rows, legacyLines }
}

function serializeStudentSchedule(rows, legacyLines = []) {
  const entries = rows
    .filter((row) => row.weekday && row.time)
    .map((row) => `${row.weekday} ${row.time}${row.subject.trim() ? ` — ${row.subject.trim()}` : ''}`)
  return [...legacyLines, ...entries].join('\n')
}

function matchesAccountSearch(person, search) {
  const query = search.trim().toLocaleLowerCase('uz')
  if (!query) return true
  const searchable = [person.name, person.username, person.phone, person.groupName]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('uz')
  const phoneQuery = query.replace(/\D/g, '')
  const phone = (person.phone || '').replace(/\D/g, '')
  return searchable.includes(query) || Boolean(phoneQuery && phone.includes(phoneQuery))
}

function todayLabel() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tashkent',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(new Date())
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const weekdaysUz = {
    Monday: 'Dushanba',
    Tuesday: 'Seshanba',
    Wednesday: 'Chorshanba',
    Thursday: 'Payshanba',
    Friday: 'Juma',
    Saturday: 'Shanba',
    Sunday: 'Yakshanba',
  }
  const monthsUz = {
    January: 'yanvar',
    February: 'fevral',
    March: 'mart',
    April: 'aprel',
    May: 'may',
    June: 'iyun',
    July: 'iyul',
    August: 'avgust',
    September: 'sentabr',
    October: 'oktabr',
    November: 'noyabr',
    December: 'dekabr',
  }
  return `${weekdaysUz[dateParts.weekday]}, ${dateParts.day}-${monthsUz[dateParts.month]} ${dateParts.year}`
}

function formatTime(value) {
  return value ? value.slice(11, 16) : '—'
}

function formatCurrency(value) {
  return `${new Intl.NumberFormat('uz-UZ').format(value)} so‘m`
}

function formatPaymentDate(value) {
  if (!value) return 'Belgilanmagan'
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

function Notice({ notice, onClose }) {
  if (!notice) return null
  return (
    <div className={`notice ${notice.type || 'success'}`} role="status">
      <span>{notice.message}</span>
      <button type="button" onClick={onClose} aria-label="Xabarni yopish">×</button>
    </div>
  )
}

function externalUrl(value, kind) {
  if (!value) return ''
  if (value.startsWith('https://')) return value
  if (kind === 'telegram' && value.startsWith('@')) return `https://t.me/${value.slice(1)}`
  return `https://${kind === 'telegram' ? 't.me' : 'instagram.com'}/${value.replace(/^@/, '')}`
}

function centerInitials(name) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0].toLocaleUpperCase('uz'))
    .join('')

  return initials || 'M'
}

function CenterMark({ name, className = 'brand-mark' }) {
  return <span className={className} aria-hidden="true">{centerInitials(name)}</span>
}

function ContactPage({ settings }) {
  const brandName = settings.centerName || 'Markaz'
  const phoneNumber = settings.phone?.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')

  return (
    <main className="auth-page">
      <section className="auth-card contact-card" aria-labelledby="contact-title">
        <a className="brand auth-brand" href="/" aria-label={brandName}>
          <CenterMark name={brandName} />
          <span className="brand-name">{brandName}</span>
        </a>
        <div className="auth-eyebrow"><span /> Biz bilan bog‘laning</div>
        <h1 id="contact-title">{brandName}</h1>
        <section className="public-center-info contact-details" aria-label="O‘quv markazi ma’lumotlari">
          <p>{settings.description || settings.slogan || 'Bilim bilan kelajak sari.'}</p>
          {settings.address && <p><strong>Manzil:</strong> {settings.address}</p>}
          {phoneNumber && <p><strong>Telefon:</strong> <a href={`tel:${phoneNumber}`}>{settings.phone}</a></p>}
          {settings.courses && <p><strong>Yo‘nalishlar:</strong> {settings.courses}</p>}
          <div className="contact-links">
            {phoneNumber && <a className="contact-button" href={`tel:${phoneNumber}`}>Aloqaga chiqish <span aria-hidden="true">→</span></a>}
            {settings.telegram && <a className="contact-button contact-button-secondary" href={externalUrl(settings.telegram, 'telegram')} target="_blank" rel="noreferrer">Telegram</a>}
            {settings.instagram && <a className="contact-button contact-button-secondary" href={externalUrl(settings.instagram, 'instagram')} target="_blank" rel="noreferrer">Instagram</a>}
          </div>
        </section>
        <a className="contact-back-link" href="/">← Kirish sahifasiga qaytish</a>
      </section>
    </main>
  )
}

function Login({ setup, setupAvailable, setupKeyRequired, settings, onLogin, onSetup, busy, error }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [setupKey, setSetupKey] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const brandName = settings.centerName || 'Markaz'
  const visibleError = error || (setup && !setupAvailable
    ? 'Administrator sozlash kaliti hostingda sozlanmagan. Sayt egasiga murojaat qiling.'
    : '')

  async function submit(event) {
    event.preventDefault()
    if (setup) await onSetup({ name, username, password, setupKey })
    else await onLogin({ username, password })
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <a className="brand auth-brand" href="/" aria-label={brandName}>
          <CenterMark name={brandName} />
          <span className="brand-name">{brandName}</span>
        </a>
        <div className="auth-eyebrow"><span /> {settings.slogan || 'O‘quv markaz boshqaruv tizimi'}</div>
        <h1 id="auth-title">{setup ? 'Administratorni sozlang.' : 'Xush kelibsiz.'}</h1>
        <p className="auth-description">
          {setup
            ? 'Boshlash uchun markaz administratorining birinchi hisobini yarating.'
            : 'Shaxsiy kabinetingizga kirish uchun login va parolingizni kiriting.'}
        </p>
        <Notice notice={visibleError ? { type: 'error', message: visibleError } : null} />
        <form className="auth-form" onSubmit={submit}>
          {setup && (
            <label>
              Ism va familiya
              <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} placeholder="Masalan, Bekmurod" />
            </label>
          )}
          {setup && setupKeyRequired && (
            <label>
              Administrator sozlash kaliti
              <input type="password" autoComplete="off" value={setupKey} onChange={(event) => setSetupKey(event.target.value)} required maxLength={256} placeholder="Hosting egasidan oling" />
            </label>
          )}
          <label>
            Login
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              minLength={3}
              maxLength={32}
              placeholder="bekmurod"
            />
          </label>
          <label>
            Parol
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={setup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={setup ? 12 : 1}
                maxLength={128}
                placeholder={setup ? 'Kamida 12 ta belgi' : 'Parolingizni kiriting'}
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>
          {setup && <p className="password-hint">Parol kamida 12 ta belgidan iborat bo‘lishi kerak.</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={busy || (setup && !setupAvailable)}>
            {busy ? 'Tekshirilmoqda…' : setup ? 'Administrator hisobini yaratish' : 'Tizimga kirish'}
            {!busy && <span aria-hidden="true">→</span>}
          </button>
        </form>
        <div className="auth-security"><span aria-hidden="true">●</span> Himoyalangan shaxsiy kabinet</div>
        <a className="contact-button login-contact-button" href="/contact">Bog‘lanish <span aria-hidden="true">→</span></a>
      </section>
    </main>
  )
}

function Sidebar({ user, page, setPage, onLogout, centerName, lessonSection, theme, onToggleTheme, onOpenLessons, onSelectLessonSection, onOpenSettings }) {
  const links = user.role === 'admin'
    ? [['overview', 'Umumiy ko‘rinish', '⌂'], ['attendance', 'Davomat', '◷'], ['lessons', 'Darslar', '▦'], ['users', 'Hisoblar', '♙'], ['payments', 'To‘lovlar', '◎'], ['account-settings', 'Sozlamalar', '⚙'], ['settings', 'Markaz sozlamalari', '◇']]
    : user.role === 'teacher'
      ? [['overview', 'O‘quvchilarim', '♙'], ['lessons', 'Darslarim', '▦'], ['attendance', 'Davomat', '◷']]
      : [['overview', 'Bosh sahifa', '⌂'], ['schedule', 'Dars jadvalim', '▦'], ['attendance', 'Davomatim', '◷']]
  const resolvedCenterName = centerName || 'Markaz'

  return (
    <>
      <aside className="sidebar">
        <a className="brand sidebar-brand" href="/" aria-label={resolvedCenterName}>
          <CenterMark name={resolvedCenterName} />
          <span className="brand-name">{resolvedCenterName}</span>
        </a>
        <button
          className="theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Kunduzgi rejimga o‘tish' : 'Tungi rejimga o‘tish'}
          aria-pressed={theme === 'dark'}
        >
          <span className={`theme-toggle-icon${theme === 'dark' ? ' theme-toggle-sun' : ' theme-toggle-moon'}`} aria-hidden="true">
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3.5" />
                <path d="M12 2.5v2M12 19.5v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2.5 12h2m15 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.6 8.6 0 1 0 20.2 15.3Z" />
                <path d="m16.8 4.2.45 1.35 1.35.45-1.35.45-.45 1.35-.45-1.35L15 6l1.35-.45.45-1.35Z" />
              </svg>
            )}
          </span>
          <span>{theme === 'dark' ? 'Kunduzgi rejim' : 'Tungi rejim'}</span>
        </button>
        <div className="sidebar-label">MENYU</div>
        <nav className="sidebar-nav" aria-label="Boshqaruv paneli">
          {links.map(([id, title, icon]) => {
            const settingsOpen = ['student-settings', 'teacher-settings', 'admin-settings'].includes(page)
            const active = page === id || (id === 'account-settings' && settingsOpen)
            return (
              <button
                className={active ? 'sidebar-link active' : 'sidebar-link'}
                key={id}
                type="button"
                aria-expanded={id === 'lessons' && user.role === 'admin' ? page === 'lessons' : id === 'account-settings' ? settingsOpen : undefined}
                onClick={() => {
                  if (id === 'lessons' && user.role === 'admin') onOpenLessons()
                  else if (id === 'account-settings') onOpenSettings()
                  else setPage(id)
                }}
              >
                <span className="sidebar-icon" aria-hidden="true">{icon}</span>{title}
                {['lessons', 'account-settings'].includes(id) && user.role === 'admin' && <span className="sidebar-chevron" aria-hidden="true">›</span>}
              </button>
            )
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-user">
            <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            <span className="side-user-info"><strong>{user.name}</strong><small>{roleNames[user.role]}</small></span>
          </div>
          <button className="logout-button" type="button" onClick={onLogout}><span aria-hidden="true">↪</span> Chiqish</button>
        </div>
      </aside>
      {user.role === 'admin' && page === 'lessons' && (
        <aside className="lesson-sidebar">
          <div className="lesson-sidebar-title">DARS BO‘LIMLARI</div>
          <nav className="lesson-sidebar-nav" aria-label="Darslar bo‘limlari">
            <button className={lessonSection === 'teachers' ? 'lesson-sidebar-link active' : 'lesson-sidebar-link'} type="button" onClick={() => onSelectLessonSection('teachers')}>
              <span aria-hidden="true">♙</span>O‘qituvchilar
            </button>
            <button className={lessonSection === 'schedule' ? 'lesson-sidebar-link active' : 'lesson-sidebar-link'} type="button" onClick={() => onSelectLessonSection('schedule')}>
              <span aria-hidden="true">▦</span>Darslar
            </button>
            <button className={lessonSection === 'subjects' ? 'lesson-sidebar-link active' : 'lesson-sidebar-link'} type="button" onClick={() => onSelectLessonSection('subjects')}>
              <span aria-hidden="true">◈</span>Fanlar
            </button>
          </nav>
        </aside>
      )}
      {user.role === 'admin' && ['student-settings', 'teacher-settings', 'admin-settings'].includes(page) && (
        <aside className="lesson-sidebar settings-sidebar">
          <div className="lesson-sidebar-title">SOZLAMALAR</div>
          <nav className="lesson-sidebar-nav" aria-label="Hisob sozlamalari">
            <button className={page === 'student-settings' ? 'lesson-sidebar-link active' : 'lesson-sidebar-link'} type="button" onClick={() => setPage('student-settings')}>
              <span aria-hidden="true">♙</span>O‘quvchi sozlamalari
            </button>
            <button className={page === 'teacher-settings' ? 'lesson-sidebar-link active' : 'lesson-sidebar-link'} type="button" onClick={() => setPage('teacher-settings')}>
              <span aria-hidden="true">♧</span>O‘qituvchi sozlamalari
            </button>
            <button className={page === 'admin-settings' ? 'lesson-sidebar-link active' : 'lesson-sidebar-link'} type="button" onClick={() => setPage('admin-settings')}>
              <span aria-hidden="true">⚙</span>Admin sozlamalari
            </button>
          </nav>
        </aside>
      )}
    </>
  )
}

function CenterSettingsForm({ settings, onSave, busy }) {
  const [form, setForm] = useState(settings)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    const savedSettings = await onSave(form)
    if (savedSettings) setForm(savedSettings)
  }

  return (
    <form className="account-form" onSubmit={submit}>
      <div className="form-grid">
        <label>Markaz nomi<input value={form.centerName} onChange={(event) => update('centerName', event.target.value)} maxLength={100} required /></label>
        <label>Shior<input value={form.slogan} onChange={(event) => update('slogan', event.target.value)} maxLength={200} placeholder="Bilim bilan kelajak sari." /></label>
        <label>Telefon<input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} maxLength={32} placeholder="+998 90 123 45 67" /></label>
        <label>Manzil<input value={form.address} onChange={(event) => update('address', event.target.value)} maxLength={240} placeholder="Shahar, ko‘cha, bino" /></label>
        <label>Telegram username yoki havola<input value={form.telegram} onChange={(event) => update('telegram', event.target.value)} maxLength={120} placeholder="@futurestep yoki https://t.me/..." /></label>
        <label>Instagram username yoki havola<input value={form.instagram} onChange={(event) => update('instagram', event.target.value)} maxLength={120} placeholder="futurestep yoki instagram.com/..." /></label>
        <label className="form-wide">Markaz haqida<textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows={3} maxLength={1000} placeholder="Saytda o‘quvchilar ko‘radigan qisqa ma’lumot" /></label>
        <label className="form-wide">Kurslar va yo‘nalishlar<textarea value={form.courses} onChange={(event) => update('courses', event.target.value)} rows={3} maxLength={1000} placeholder="Ingliz tili, matematika, IT va boshqa kurslar" /></label>
      </div>
      <div className="form-footer"><span>Bu ma’lumotlar login sahifasida ommaga ko‘rinadi.</span><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Markaz ma’lumotlarini saqlash'}<span aria-hidden="true">✓</span></button></div>
    </form>
  )
}

function AdminSettingsForm({ user, centerName, centerSettings, onSave, busy }) {
  const [form, setForm] = useState({
    name: user.name,
    username: user.username,
    centerName,
    phone: centerSettings.phone || '',
    telegram: centerSettings.telegram || '',
    instagram: centerSettings.instagram || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [validationError, setValidationError] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setValidationError('')
    if (form.newPassword !== form.confirmPassword) {
      setValidationError('Yangi parol tasdig‘i mos kelmadi.')
      return
    }
    const saved = await onSave({
      name: form.name,
      username: form.username,
      centerName: form.centerName,
      phone: form.phone,
      telegram: form.telegram,
      instagram: form.instagram,
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    })
    if (saved) {
      setForm((current) => ({
        ...current,
        name: saved.name,
        username: saved.username,
        centerName: saved.centerName || current.centerName,
        phone: saved.phone || current.phone,
        telegram: saved.telegram || current.telegram,
        instagram: saved.instagram || current.instagram,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))
    }
  }

  return (
    <form className="account-form" onSubmit={submit}>
      <Notice notice={validationError ? { type: 'error', message: validationError } : null} />
      <div className="form-grid">
        <label>Admin ismi<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={100} required /></label>
        <label>Admin login<input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} minLength={3} maxLength={32} required /></label>
        <label>Sayt nomi<input value={form.centerName} onChange={(event) => setForm({ ...form, centerName: event.target.value })} maxLength={100} placeholder="Markaz nomi" required /></label>
        <label>Telefon raqami<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} maxLength={32} placeholder="+998 90 123 45 67" /></label>
        <label>Telegram username yoki havola<input value={form.telegram} onChange={(event) => setForm({ ...form, telegram: event.target.value })} maxLength={120} placeholder="@futurestep yoki https://t.me/..." /></label>
        <label>Instagram username yoki havola<input value={form.instagram} onChange={(event) => setForm({ ...form, instagram: event.target.value })} maxLength={120} placeholder="futurestep yoki instagram.com/..." /></label>
        <label className="form-wide">Joriy parol<div className="password-field"><input type={showCurrentPassword ? 'text' : 'password'} autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} required /><button type="button" className="password-toggle" onClick={() => setShowCurrentPassword((value) => !value)} aria-label={showCurrentPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}>{showCurrentPassword ? '🙈' : '👁️'}</button></div></label>
        <label>Yangi parol (ixtiyoriy)<div className="password-field"><input type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} minLength={12} maxLength={128} placeholder="Kamida 12 belgi" /><button type="button" className="password-toggle" onClick={() => setShowNewPassword((value) => !value)} aria-label={showNewPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}>{showNewPassword ? '🙈' : '👁️'}</button></div></label>
        <label>Yangi parol tasdig‘i<div className="password-field"><input type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} minLength={form.newPassword ? 12 : undefined} maxLength={128} /><button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}>{showConfirmPassword ? '🙈' : '👁️'}</button></div></label>
      </div>
      <div className="form-footer"><span>O‘zgarishlarni saqlash uchun joriy parol talab qilinadi.</span><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Admin sozlamalarini saqlash'}<span aria-hidden="true">✓</span></button></div>
    </form>
  )
}

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <div className="page-eyebrow"><span />{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}

function Schedule({ schedule }) {
  const lines = schedule.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) {
    return <div className="empty-state"><span>▦</span><strong>Dars jadvali hali kiritilmagan</strong><p>Jadvalingiz bo‘yicha ma’lumotni administrator orqali aniqlang.</p></div>
  }
  return (
    <div className="schedule-list">
      {lines.map((line, index) => {
        const day = weekdays.find((weekday) => line.toLocaleLowerCase('uz').includes(weekday.toLocaleLowerCase('uz')))
        return <div className="schedule-row" key={`${line}-${index}`}>
          <span className="schedule-day">{day || 'Dars'}</span>
          <span className="schedule-detail">{line}</span>
        </div>
      })}
    </div>
  )
}

function AttendanceTable({ rows, role, busyId, onMark, editable = true }) {
  if (!rows.length) return <div className="empty-state"><span>◷</span><strong>Hozircha ro‘yxat bo‘sh</strong><p>Hisoblar qo‘shilganda davomat shu yerda ko‘rinadi.</p></div>
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr><th>Ism</th><th>Guruh / turi</th><th>Kelgan vaqti</th><th>Ketgan vaqti</th>{role !== 'student' && <th>Amal</th>}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.userId || row.day}>
              <td><div className="table-person"><span className="table-avatar">{row.name.slice(0, 1).toUpperCase()}</span><span><strong>{row.name}</strong><small>{row.username}</small></span></div></td>
              <td>{row.groupName || roleNames[row.role] || '—'}</td>
              <td>{formatTime(row.checkIn)}</td>
              <td>{formatTime(row.checkOut)}</td>
              {role !== 'student' && <td>
                <div className="table-actions">
                  {!editable && <span>—</span>}
                  {editable && !row.checkIn && <button disabled={busyId === row.userId} onClick={() => onMark(row.userId, 'check-in')} type="button">Keldi</button>}
                  {editable && row.checkIn && !row.checkOut && <button disabled={busyId === row.userId} onClick={() => onMark(row.userId, 'check-out')} type="button">Ketdi</button>}
                  {editable && row.checkOut && <span className="status-done">Yakunlandi</span>}
                </div>
              </td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminAttendanceAlerts({ lessonAttendance, loading, error }) {
  const [selectedGroupName, setSelectedGroupName] = useState('')
  const groupsByName = new Map()

  for (const result of lessonAttendance) {
    for (const student of result.students) {
      if (student.status === 'present') continue
      const groupName = student.groupName?.trim() || 'Guruh belgilanmagan'
      const group = groupsByName.get(groupName) || new Map()
      const record = group.get(student.studentId) || { ...student, issues: [] }
      record.issues.push({
        subject: result.lesson.subject,
        weekday: result.lesson.weekday,
        startTime: result.lesson.startTime,
        status: student.status || 'unmarked',
      })
      group.set(student.studentId, record)
      groupsByName.set(groupName, group)
    }
  }

  const groups = [...groupsByName].map(([name, students]) => ({
    name,
    students: [...students.values()].sort((a, b) => a.name.localeCompare(b.name, 'uz')),
  })).sort((a, b) => a.name.localeCompare(b.name, 'uz'))
  const selectedGroup = groups.find((group) => group.name === selectedGroupName)

  return (
    <section className="content-card admin-attendance-alerts">
      <div className="card-heading">
        <div><span className="section-kicker">BUGUNGI DARS DAVOMATI</span><h2>Davomat e’tibor talab qiladigan guruhlar</h2></div>
        {groups.length > 0 && <span className="attendance-alert-count">{groups.length} ta guruh</span>}
      </div>
      {error ? <p className="attendance-error" role="alert">{error}</p> : loading ? (
        <div className="empty-state"><strong>Darslar davomati tekshirilmoqda…</strong></div>
      ) : selectedGroup ? (
        <>
          <button className="quiet-link teacher-groups-back" type="button" onClick={() => setSelectedGroupName('')}>← Barcha guruhlar</button>
          <h3 className="attendance-alert-group-title">{selectedGroup.name}</h3>
          <div className="attendance-alert-students">
            {selectedGroup.students.map((student) => (
              <article className="attendance-alert-student" key={student.studentId}>
                <div className="table-person">
                  <span className="table-avatar">{student.name.slice(0, 1).toUpperCase()}</span>
                  <span><strong>{student.name}</strong><small>{student.username}</small></span>
                </div>
                {student.phone && <span className="attendance-alert-phone">{student.phone}</span>}
                <ul>
                  {student.issues.map((issue, index) => (
                    <li key={`${issue.subject}-${issue.startTime}-${index}`}>
                      <span className={`attendance-status ${issue.status === 'unmarked' ? 'unmarked' : 'absent'}`}>
                        {issue.status === 'absent' ? 'Kelmagan' : 'Belgilanmagan'}
                      </span>
                      <span>{issue.weekday}, {issue.startTime} · {issue.subject}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </>
      ) : groups.length ? (
        <div className="attendance-alert-groups">
          {groups.map((group) => {
            const absentCount = group.students.filter((student) => student.issues.some((issue) => issue.status === 'absent')).length
            const unmarkedCount = group.students.filter((student) => student.issues.some((issue) => issue.status === 'unmarked')).length
            return <button
              className="attendance-alert-group"
              key={group.name}
              type="button"
              onClick={() => setSelectedGroupName(group.name)}
            >
              <span className="attendance-alert-group-icon" aria-hidden="true">!</span>
              <span className="attendance-alert-group-copy">
                <strong>{group.name}</strong>
                <small>{group.students.length} nafar o‘quvchi e’tiborda</small>
                <small>{absentCount > 0 ? `${absentCount} kelmagan` : ''}{absentCount > 0 && unmarkedCount > 0 ? ' · ' : ''}{unmarkedCount > 0 ? `${unmarkedCount} davomat belgilanmagan` : ''}</small>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          })}
        </div>
      ) : (
        <div className="empty-state"><span>✓</span><strong>Muammoli guruhlar yo‘q</strong><p>Bugun boshlangan darslarda kelmagan yoki davomat belgilanmagan o‘quvchi topilmadi.</p></div>
      )}
    </section>
  )
}

function StudentScheduleEditor({ rows, onChange, legacyLines = [], compact = false }) {
  function updateRow(index, field, value) {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row))
  }

  return (
    <div className={`student-schedule-editor${compact ? ' compact' : ''}`}>
      {legacyLines.length > 0 && (
        <div className="legacy-schedule-note">
          <strong>Avvalgi jadval yozuvi</strong>
          {legacyLines.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
          <small>Yangi kun va vaqtlarni pastdagi tanlovlardan kiriting.</small>
        </div>
      )}
      {rows.map((row, index) => (
        <div className="student-schedule-row" key={index}>
          <label>Hafta kuni
            <select required value={row.weekday} onChange={(event) => updateRow(index, 'weekday', event.target.value)}>
              <option value="" disabled>Kunni tanlang</option>
              {[...weekdays.slice(1), weekdays[0]].map((weekday) => <option key={weekday} value={weekday}>{weekday}</option>)}
            </select>
          </label>
          <label>Dars vaqti
            <input type="time" required value={row.time} onChange={(event) => updateRow(index, 'time', event.target.value)} />
          </label>
          <label className="student-schedule-subject">Fan / izoh <span>(ixtiyoriy)</span>
            <input maxLength={100} value={row.subject} onChange={(event) => updateRow(index, 'subject', event.target.value)} placeholder="Masalan, Ingliz tili" />
          </label>
          <button className="remove-schedule-row" type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} aria-label={`${index + 1}-jadvalni o‘chirish`}>×</button>
        </div>
      ))}
      <button className="add-schedule-row" type="button" onClick={() => onChange([...rows, { weekday: 'Dushanba', time: '09:00', subject: '' }])}>＋ Dars kuni va vaqtini qo‘shish</button>
    </div>
  )
}

function LessonAttendanceManager({ lessons, role, today }) {
  const [lessonId, setLessonId] = useState(() => lessons.find((lesson) => lesson.weekday === weekdayForDate(today))?.id || '')
  const [day, setDay] = useState(today)
  const [data, setData] = useState(null)
  const [draft, setDraft] = useState({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const isAdmin = role === 'admin'
  const availableLessons = lessons.filter((lesson) => lesson.weekday === weekdayForDate(day))
  const selectedLesson = availableLessons.find((lesson) => lesson.id === lessonId)
  const loading = Boolean(lessonId && day && !data && !error)

  useEffect(() => {
    if (!lessonId || !day) return undefined
    let active = true
    api(`/lessons/${lessonId}/attendance?day=${day}`)
      .then((result) => {
        if (active) setData(result)
      })
      .catch((requestError) => {
        if (active) {
          setData(null)
          setError(requestError.message)
        }
      })
    return () => {
      active = false
    }
  }, [day, lessonId])

  async function updateAttendance(studentId, status) {
    setBusyId(studentId)
    setError('')
    try {
      const result = await api(`/lessons/${lessonId}/attendance`, {
        method: 'POST',
        body: JSON.stringify({ day, studentId, status }),
      })
      setData(result)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId('')
    }
  }

  async function submitTeacherAttendance() {
    setBusyId('submit')
    setError('')
    try {
      const result = await api(`/lessons/${lessonId}/attendance`, {
        method: 'POST',
        body: JSON.stringify({
          day,
          students: data.students.map((student) => ({
            studentId: student.studentId,
            status: draft[student.studentId],
          })),
        }),
      })
      setData(result)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId('')
    }
  }

  const studentStatus = (student) => isAdmin
    ? student.status || 'unmarked'
    : draft[student.studentId] || student.status || 'unmarked'
  const filteredStudents = (data?.students || []).filter((student) => {
    const matchesSearch = matchesAccountSearch(student, search)
    const matchesStatus = statusFilter === 'all' || studentStatus(student) === statusFilter
    return matchesSearch && matchesStatus
  })
  const hasUnmarkedDraft = data?.students.some((student) => studentStatus(student) === 'unmarked')

  return (
    <section className="content-card lesson-attendance-manager">
      <div className="card-heading">
        <div><span className="section-kicker">DARS BO‘YICHA NAZORAT</span><h2>Kelgan va kelmaganlar</h2></div>
        {data && <span className="count-pill">{data.students.filter((student) => student.status === 'present').length} / {data.students.length} keldi</span>}
      </div>
      <div className="attendance-toolbar">
        <label>Dars
          <select value={lessonId} onChange={(event) => { setData(null); setDraft({}); setError(''); setLessonId(event.target.value) }} disabled={!availableLessons.length}>
            {availableLessons.length
              ? availableLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.subject} · {lesson.weekday} {lesson.startTime}</option>)
              : <option value="">Dars topilmadi</option>}
          </select>
        </label>
        {isAdmin && <label>Sana<input type="date" value={day} max={today} onChange={(event) => { const nextDay = event.target.value; setData(null); setDraft({}); setError(''); setLessonId(lessons.find((lesson) => lesson.weekday === weekdayForDate(nextDay))?.id || ''); setDay(nextDay) }} /></label>}
        <label className="attendance-search">Qidirish
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ism, login yoki telefon" />
        </label>
        <label>Holat
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Barchasi</option>
            <option value="present">Kelgan</option>
            <option value="absent">Kelmagan</option>
            <option value="unmarked">Belgilanmagan</option>
          </select>
        </label>
      </div>
      {selectedLesson && (
        <p className="attendance-lesson-note">
          {selectedLesson.teacherName ? `${selectedLesson.teacherName} · ` : ''}{selectedLesson.weekday}, {selectedLesson.startTime}–{selectedLesson.endTime}
          {!isAdmin && <> · Davomatni dars boshlangach bir marta yuboring; keyin faqat admin o‘zgartira oladi.</>}
        </p>
      )}
      {error && <p className="attendance-error" role="alert">{error}</p>}
      {loading ? <div className="empty-state"><strong>Davomat yuklanmoqda…</strong></div> : data?.students.length ? (
        <>
          <div className="table-scroll">
            <table className="lesson-attendance-table">
              <thead><tr><th>O‘quvchi</th><th>Telefon</th><th>Holat</th><th>Amal</th></tr></thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.studentId}>
                    <td><div className="table-person"><span className="table-avatar">{student.name.slice(0, 1).toUpperCase()}</span><span><strong>{student.name}</strong><small>{student.username}</small></span></div></td>
                    <td>{student.phone || '—'}</td>
                    <td><span className={`attendance-status ${studentStatus(student)}`}>{studentStatus(student) === 'present' ? 'Kelgan' : studentStatus(student) === 'absent' ? 'Kelmagan' : 'Belgilanmagan'}</span></td>
                    <td>
                      {isAdmin ? (
                        <div className="lesson-attendance-actions">
                          <button type="button" className={student.status === 'present' ? 'selected' : ''} disabled={busyId === student.studentId} onClick={() => updateAttendance(student.studentId, 'present')}>Keldi</button>
                          <button type="button" className={student.status === 'absent' ? 'selected absent' : ''} disabled={busyId === student.studentId} onClick={() => updateAttendance(student.studentId, 'absent')}>Kelmagan</button>
                        </div>
                      ) : data.locked ? (
                        <span className="attendance-locked">Yuborildi</span>
                      ) : (
                        <div className="lesson-attendance-actions">
                          <button type="button" className={draft[student.studentId] === 'present' ? 'selected' : ''} onClick={() => setDraft((current) => ({ ...current, [student.studentId]: 'present' }))}>Keldi</button>
                          <button type="button" className={draft[student.studentId] === 'absent' ? 'selected absent' : ''} onClick={() => setDraft((current) => ({ ...current, [student.studentId]: 'absent' }))}>Kelmagan</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!filteredStudents.length && <tr><td colSpan="4" className="table-empty">Tanlangan qidiruv yoki holatga mos o‘quvchi topilmadi.</td></tr>}
              </tbody>
            </table>
          </div>
          {!isAdmin && (
            <div className="attendance-submit-row">
              {data.locked
                ? <span>Davomat yuborilgan. O‘zgartirish uchun administratorga murojaat qiling.</span>
                : !data.canMark
                  ? <span>Davomat dars boshlanish vaqti yetgach ochiladi.</span>
                  : <span>{hasUnmarkedDraft ? 'Har bir o‘quvchini kelgan yoki kelmagan deb belgilang.' : 'Barcha o‘quvchilar belgilanib, yuborishga tayyor.'}</span>}
              {!data.locked && data.canMark && <button className="button button-primary" type="button" disabled={busyId === 'submit' || hasUnmarkedDraft} onClick={submitTeacherAttendance}>{busyId === 'submit' ? 'Yuborilmoqda…' : 'Davomatni yuborish'}</button>}
            </div>
          )}
        </>
      ) : (
        <div className="empty-state"><span>◷</span><strong>{data ? 'Bu darsga o‘quvchi biriktirilmagan' : availableLessons.length ? error ? 'Davomat yuklanmadi' : 'Dars tanlang' : 'Tanlangan kunda dars yo‘q'}</strong><p>{data ? 'Darsga o‘quvchilar qo‘shilgach, davomatni shu yerdan belgilang.' : availableLessons.length ? error ? 'Qayta urinib ko‘ring yoki administratorga xabar bering.' : 'Davomatni ko‘rish uchun dars tanlang.' : 'Davomat faqat haftalik jadvaldagi dars kunida ochiladi.'}</p></div>
      )}
    </section>
  )
}

function AccountForm({ onCreate, busy }) {
  const [form, setForm] = useState({ name: '', role: 'student', phone: '', groupName: '', schedule: '' })
  const [scheduleRows, setScheduleRows] = useState([])
  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }
  async function submit(event) {
    event.preventDefault()
    const created = await onCreate({ ...form, schedule: serializeStudentSchedule(scheduleRows) })
    if (created) {
      setForm({ name: '', role: form.role, phone: '', groupName: '', schedule: '' })
      setScheduleRows([])
    }
  }
  return (
    <form className="account-form" onSubmit={submit}>
      <div className="form-grid">
        <label>Ism va familiya<input value={form.name} onChange={(event) => update('name', event.target.value)} required maxLength={100} placeholder="O‘quvchi yoki o‘qituvchi ismi" /></label>
        <label>Hisob turi<select value={form.role} onChange={(event) => { update('role', event.target.value); if (event.target.value !== 'student') setScheduleRows([]) }}><option value="student">O‘quvchi</option><option value="teacher">O‘qituvchi</option></select></label>
        <label>Telefon raqami<input value={form.phone} onChange={(event) => update('phone', event.target.value)} maxLength={32} placeholder="+998 …" /></label>
        {form.role === 'student' && <label>Guruh<input value={form.groupName} onChange={(event) => update('groupName', event.target.value)} maxLength={80} placeholder="Masalan, Ingliz tili — A1" /></label>}
      </div>
      {form.role === 'student' && <fieldset className="schedule-editor-fieldset"><legend>O‘quvchining dars jadvali</legend><StudentScheduleEditor rows={scheduleRows} onChange={setScheduleRows} /></fieldset>}
      <div className="form-footer"><span>Login avtomatik yaratiladi, vaqtinchalik parol bir marta ko‘rsatiladi.</span><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Yaratilmoqda…' : 'Hisob yaratish'}<span aria-hidden="true">＋</span></button></div>
    </form>
  )
}

function UserList({ users, onSave, onReset, busyId, search }) {
  return (
    <div className="user-list">
      {users.map((person) => (
        <details className="user-item" key={person.id}>
          <summary>
            <div className="table-person"><span className="table-avatar">{person.name.slice(0, 1).toUpperCase()}</span><span><strong>{person.name}</strong><small>{person.username}</small></span></div>
            <span className={`role-badge ${person.role}`}>{roleNames[person.role]}</span>
            <span className="user-group">{person.groupName || person.phone || 'Ma’lumot kiritilmagan'}</span>
            <span className="user-chevron" aria-hidden="true">⌄</span>
          </summary>
          <UserEdit person={person} onSave={onSave} onReset={onReset} busy={busyId === person.id} />
        </details>
      ))}
      {!users.length && <div className="empty-state"><span>♙</span><strong>{search ? 'Mos hisob topilmadi' : 'Hisoblar hali qo‘shilmagan'}</strong><p>{search ? 'Ism, login yoki telefon raqami bo‘yicha qidiruvni o‘zgartirib ko‘ring.' : 'Yuqoridagi shakl yordamida yangi hisob yarating.'}</p></div>}
    </div>
  )
}

function UserEdit({ person, onSave, onReset, busy }) {
  const [credentials, setCredentials] = useState(null)
  const parsedSchedule = parseStudentSchedule(person.schedule || '')
  const [scheduleRows, setScheduleRows] = useState(parsedSchedule.rows)
  const [form, setForm] = useState({
    name: person.name,
    phone: person.phone,
    groupName: person.groupName,
  })
  async function submit(event) {
    event.preventDefault()
    await onSave(person.id, {
      ...form,
      ...(person.role === 'student' ? { schedule: serializeStudentSchedule(scheduleRows, parsedSchedule.legacyLines) } : {}),
    })
  }
  async function resetPassword() {
    const newCredentials = await onReset(person.id)
    if (newCredentials) setCredentials(newCredentials)
  }
  return (
    <form className="user-edit" onSubmit={submit}>
      <label>Ism<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={100} /></label>
      <label>Telefon<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} maxLength={32} /></label>
      {person.role === 'student' && <>
        <label>Guruh<input value={form.groupName} onChange={(event) => setForm({ ...form, groupName: event.target.value })} maxLength={80} /></label>
        <fieldset className="edit-schedule schedule-editor-fieldset"><legend>Dars kunlari va vaqtlari</legend><StudentScheduleEditor rows={scheduleRows} onChange={setScheduleRows} legacyLines={parsedSchedule.legacyLines} compact /></fieldset>
      </>}
      <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'O‘zgarishlarni saqlash'}</button>
      <button type="button" className="password-reset-button" disabled={busy} onClick={resetPassword}>Login va parolni yangilash</button>
      <Credentials credentials={credentials} onDismiss={() => setCredentials(null)} />
    </form>
  )
}

function Credentials({ credentials, onDismiss }) {
  if (!credentials) return null
  return (
    <div className="credentials-box" role="status">
      <button className="credentials-close" type="button" onClick={onDismiss} aria-label="Yopish">×</button>
      <strong>Kirish ma’lumotlarini hisob egasiga xavfsiz yetkazing:</strong>
      <div><span>Login</span><code>{credentials.username}</code></div>
      <div><span>Parol</span><code>{credentials.password}</code></div>
      <small>Parol qayta ko‘rsatilmaydi. Uni xavfsiz saqlab, egasiga yetkazing.</small>
    </div>
  )
}

function StudentOverview({ user, attendance, onOpenSchedule, today }) {
  const todayRecord = attendance.find((record) => record.day === today)
  return (
    <>
      <PageHeading eyebrow={todayLabel()} title={`Assalomu alaykum, ${user.name.split(' ')[0]}!`} description="O‘qish va dars jadvalingiz bo‘yicha ma’lumotlar." />
      <div className="metric-grid student-metrics">
        <article className="metric-card"><span className="metric-icon purple">▦</span><span className="metric-label">Guruh</span><strong>{user.groupName || 'Biriktirilmagan'}</strong><small>O‘quv guruhingiz</small></article>
        <article className="metric-card"><span className="metric-icon green">◷</span><span className="metric-label">Bugungi davomat</span><strong>{todayRecord?.checkIn ? 'Qayd etilgan' : 'Kutilmoqda'}</strong><small>{todayRecord?.checkIn ? `Kelish: ${formatTime(todayRecord.checkIn)}` : 'Davomatni o‘qituvchi belgilaydi'}</small></article>
      </div>
      <section className="content-card">
        <div className="card-heading"><div><span className="section-kicker">HAFTALIK REJA</span><h2>Dars jadvalim</h2></div><button className="quiet-link" type="button" onClick={onOpenSchedule}>To‘liq jadval →</button></div>
        <Schedule schedule={user.schedule || ''} />
      </section>
      <section className="content-card">
        <div className="card-heading"><div><span className="section-kicker">SHAXSIY MA’LUMOT</span><h2>Profilim</h2></div></div>
        <div className="profile-grid"><div><span>To‘liq ism</span><strong>{user.name}</strong></div><div><span>Login</span><strong>{user.username}</strong></div><div><span>Telefon</span><strong>{user.phone || 'Kiritilmagan'}</strong></div><div><span>Guruh</span><strong>{user.groupName || 'Biriktirilmagan'}</strong></div></div>
      </section>
    </>
  )
}

function StudentLessonFeedback({ data, busyId, onSave }) {
  async function submit(event, lessonId, comment) {
    event.preventDefault()
    await onSave(lessonId, comment)
  }

  return (
    <section className="content-card student-feedback">
      <div className="card-heading">
        <div><span className="section-kicker">DARSDAN KEYIN</span><h2>Dars haqida izoh</h2></div>
      </div>
      <p className="feedback-intro">Har bir dars tugagach, fikringizni ixtiyoriy ravishda yozib qoldirishingiz mumkin.</p>
      {data.lessons.length ? (
        <div className="student-feedback-list">
          {data.lessons.map((lesson) => (
            <article className="student-feedback-card" key={`${lesson.id}-${lesson.feedbackUpdatedAt || 'new'}`}>
              <div className="feedback-lesson-heading">
                <div><h3>{lesson.subject}</h3><p>{lesson.weekday}, {lesson.startTime}–{lesson.endTime} · {lesson.teacherName}</p></div>
                <span className="feedback-time">{lesson.startTime}–{lesson.endTime}</span>
              </div>
              {lesson.canComment ? (
                <form onSubmit={(event) => submit(event, lesson.id, event.currentTarget.elements.comment.value)}>
                  <label className="feedback-label" htmlFor={`lesson-feedback-${lesson.id}`}>Izohingiz <span>(ixtiyoriy)</span></label>
                  <textarea
                    className="student-feedback-input"
                    id={`lesson-feedback-${lesson.id}`}
                    name="comment"
                    defaultValue={lesson.comment || ''}
                    maxLength={1000}
                    rows={3}
                    placeholder="Bugungi dars haqida fikringizni yozing..."
                  />
                  <div className="feedback-form-footer">
                    <span>{lesson.comment ? 'Izoh saqlangan. Uni o‘zgartirishingiz mumkin.' : 'Izoh qoldirish majburiy emas.'}</span>
                    <button className="button button-primary" type="submit" disabled={busyId === lesson.id}>
                      {busyId === lesson.id ? 'Saqlanmoqda…' : lesson.comment ? 'Izohni yangilash' : 'Izohni saqlash'}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="feedback-locked">
                  {lesson.weekday === data.weekday
                    ? `Izoh dars ${lesson.endTime} da tugagach ochiladi.`
                    : `Izoh ${lesson.weekday} kungi dars tugagach ochiladi.`}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state"><span>▦</span><strong>Sizga dars biriktirilmagan</strong><p>Dars va izoh qismi administrator sizni darsga qo‘shganidan keyin ko‘rinadi.</p></div>
      )}
    </section>
  )
}

function StudentPaymentPanel({ payment, today }) {
  const configured = payment.monthlyAmount > 0
  const incomplete = configured && payment.remainingThisMonth > 0
  const overdue = incomplete && payment.nextDueDate && payment.nextDueDate < today

  return (
    <section className="content-card payment-card">
      <div className="card-heading">
        <div><span className="section-kicker">JORIY OY UCHUN</span><h2>To‘lov holati</h2></div>
        {configured && <span className={`payment-status ${incomplete ? overdue ? 'overdue' : 'partial' : 'paid'}`}>{incomplete ? overdue ? 'To‘lov muddati o‘tgan' : 'To‘lov to‘liq emas' : 'To‘liq to‘langan'}</span>}
      </div>
      {!configured ? (
        <StudentPaymentReminder payment={payment} today={today} />
      ) : (
        <>
          {incomplete && (
            <StudentPaymentReminder payment={payment} today={today} />
          )}
          <div className="payment-summary">
            <div><span>Oylik to‘lov</span><strong>{formatCurrency(payment.monthlyAmount)}</strong></div>
            <div><span>Shu oy to‘langan</span><strong>{formatCurrency(payment.paidThisMonth)}</strong></div>
            <div><span>Keyingi to‘lov sanasi</span><strong>{formatPaymentDate(payment.nextDueDate)}</strong></div>
          </div>
        </>
      )}
      <div className="card-heading payment-history-heading">
        <div><span className="section-kicker">TO‘LOVLAR TARIXI</span><h2>Amalga oshirilgan to‘lovlar</h2></div>
      </div>
      {payment.payments.length ? (
        <div className="table-scroll">
          <table>
            <thead><tr><th>To‘lov sanasi</th><th>Miqdori</th></tr></thead>
            <tbody>
              {payment.payments.map((record) => (
                <tr key={record.id}><td>{formatPaymentDate(record.paidAt)}</td><td>{formatCurrency(record.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="empty-state payment-empty"><strong>To‘lov qaydlari yo‘q</strong><p>To‘lov amalga oshirilgach, uning sanasi va miqdori shu yerda ko‘rinadi.</p></div>}
    </section>
  )
}

function StudentPaymentReminder({ payment, today }) {
  if (!payment.monthlyAmount) {
    return <p className="payment-reminder">Oylik to‘lov miqdori hali belgilanmagan. Ma’lumot uchun administratorga murojaat qiling.</p>
  }
  if (!payment.remainingThisMonth) return null

  const overdue = payment.nextDueDate && payment.nextDueDate < today
  return (
    <p className={`payment-reminder${overdue ? ' overdue' : ''}`}>
      {overdue ? 'To‘lov muddati o‘tgan.' : 'Oylik to‘lovingiz hali to‘liq emas.'}
      {' '}Qolgan summa: <strong>{formatCurrency(payment.remainingThisMonth)}</strong>
      {payment.nextDueDate && <>. Keyingi to‘lov sanasi: <strong>{formatPaymentDate(payment.nextDueDate)}</strong></>}.
    </p>
  )
}

function AdminPayments({ data, onSave, busy }) {
  const [studentId, setStudentId] = useState(data.students[0]?.id || '')
  const selectedStudent = data.students.find((student) => student.id === studentId)
  const [form, setForm] = useState({
    amount: '',
    paidAt: data.today,
    monthlyAmount: selectedStudent?.monthlyAmount || '',
    nextDueDate: selectedStudent?.nextDueDate || '',
  })

  function selectStudent(id) {
    const student = data.students.find((item) => item.id === id)
    setStudentId(id)
    setForm({
      amount: '',
      paidAt: data.today,
      monthlyAmount: student?.monthlyAmount || '',
      nextDueDate: student?.nextDueDate || '',
    })
  }

  async function submit(event) {
    event.preventDefault()
    const saved = await onSave({
      studentId,
      amount: form.amount ? Number(form.amount) : null,
      paidAt: form.paidAt,
      monthlyAmount: Number(form.monthlyAmount),
      nextDueDate: form.nextDueDate,
    })
    if (saved) setForm((current) => ({ ...current, amount: '' }))
  }

  return (
    <>
      <PageHeading eyebrow="O‘quvchilar to‘lovlari" title="To‘lovlar" description="To‘lov miqdori va sanasini qayd eting, oylik to‘lov muddatini belgilang." />
      <section className="content-card">
        <div className="card-heading"><div><span className="section-kicker">YANGI QAYD</span><h2>To‘lov kiritish</h2></div></div>
        {data.students.length ? (
          <form className="account-form" onSubmit={submit}>
            <div className="form-grid">
              <label>O‘quvchi<select value={studentId} onChange={(event) => selectStudent(event.target.value)} required>
                {data.students.map((student) => <option key={student.id} value={student.id}>{student.name}{student.groupName ? ` — ${student.groupName}` : ''}</option>)}
              </select></label>
              <label>To‘langan summa (so‘m, ixtiyoriy)<input type="number" inputMode="numeric" min="1" max="1000000000000" step="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label>
              <label>To‘lov sanasi<input type="date" value={form.paidAt} onChange={(event) => setForm({ ...form, paidAt: event.target.value })} required={Boolean(form.amount)} /></label>
              <label>Oylik to‘lov miqdori (so‘m)<input type="number" inputMode="numeric" min="1" max="1000000000000" step="1" value={form.monthlyAmount} onChange={(event) => setForm({ ...form, monthlyAmount: event.target.value })} required /></label>
              <label>Keyingi to‘lov sanasi<input type="date" value={form.nextDueDate} onChange={(event) => setForm({ ...form, nextDueDate: event.target.value })} required /></label>
            </div>
            <div className="form-footer"><span>To‘langan summa bo‘sh qolsa, faqat oylik reja saqlanadi.</span><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saqlanmoqda…' : form.amount ? 'To‘lovni saqlash' : 'To‘lov rejasini saqlash'}<span aria-hidden="true">✓</span></button></div>
          </form>
        ) : <div className="empty-state"><span>♙</span><strong>O‘quvchilar hali qo‘shilmagan</strong><p>To‘lov qayd etish uchun avval o‘quvchi hisobini yarating.</p></div>}
      </section>
      <section className="content-card">
        <div className="card-heading"><div><span className="section-kicker">SO‘NGGI TO‘LOVLAR BIRINCHI</span><h2>To‘lovlar tarixi</h2></div></div>
        {data.payments.length ? (
          <div className="table-scroll">
            <table>
              <thead><tr><th>O‘quvchi</th><th>Guruh</th><th>To‘lov sanasi</th><th>Miqdori</th></tr></thead>
              <tbody>
                {data.payments.map((record) => (
                  <tr key={record.id}>
                    <td><div className="table-person"><span className="table-avatar">{record.name.slice(0, 1).toUpperCase()}</span><span><strong>{record.name}</strong><small>{record.username}</small></span></div></td>
                    <td>{record.groupName || '—'}</td>
                    <td>{formatPaymentDate(record.paidAt)}</td>
                    <td><strong>{formatCurrency(record.amount)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-state"><strong>To‘lov qaydlari yo‘q</strong><p>Yangi to‘lovlar sana bo‘yicha eng yangisidan boshlab shu yerda ko‘rinadi.</p></div>}
      </section>
      <section className="content-card">
        <div className="card-heading"><div><span className="section-kicker">JORIY OY HISOBI</span><h2>O‘quvchilar to‘lov holati</h2></div></div>
        {data.students.length ? (
          <div className="table-scroll">
            <table>
              <thead><tr><th>O‘quvchi</th><th>Oylik to‘lov</th><th>Shu oy to‘langan</th><th>Qoldiq</th><th>Keyingi sana</th></tr></thead>
              <tbody>
                {data.students.map((student) => (
                  <tr key={student.id}>
                    <td><div className="table-person"><span className="table-avatar">{student.name.slice(0, 1).toUpperCase()}</span><span><strong>{student.name}</strong><small>{student.username}</small></span></div></td>
                    <td>{student.monthlyAmount ? formatCurrency(student.monthlyAmount) : 'Belgilanmagan'}</td>
                    <td>{formatCurrency(student.paidThisMonth)}</td>
                    <td>{student.monthlyAmount ? formatCurrency(student.remainingThisMonth) : '—'}</td>
                    <td>{formatPaymentDate(student.nextDueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-state"><strong>O‘quvchilar hali qo‘shilmagan</strong></div>}
      </section>
    </>
  )
}

function LessonCard({ lesson, students, busy, onAddStudent, onCreateAndAddStudent, isAdmin, showTeacher = true, showStudents = true }) {
  const [studentId, setStudentId] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addMode, setAddMode] = useState(lesson.students.length < students.length ? 'existing' : 'new')
  const [newStudent, setNewStudent] = useState({ name: '', phone: '', groupName: lesson.subject })
  const [credentials, setCredentials] = useState(null)
  const enrolledIds = new Set(lesson.students.map((student) => student.id))
  const availableStudents = students.filter((student) => !enrolledIds.has(student.id))

  async function submit(event) {
    event.preventDefault()
    if (addMode === 'new') {
      const createdCredentials = await onCreateAndAddStudent(lesson.id, newStudent)
      if (createdCredentials) {
        setCredentials(createdCredentials)
        setNewStudent({ name: '', phone: '', groupName: lesson.subject })
        setAddMode(availableStudents.length ? 'existing' : 'new')
      }
      return
    }
    if (!studentId) return
    const added = await onAddStudent(lesson.id, studentId)
    if (added) setStudentId('')
  }

  return (
    <article className="lesson-card">
      <div className="lesson-card-heading">
        <div><span className="section-kicker">{lesson.weekday} · {lesson.startTime}–{lesson.endTime}</span><h3>{lesson.subject}</h3></div>
        <span className="count-pill">{lesson.studentCount} nafar o‘quvchi</span>
      </div>
      {showTeacher && <p className="lesson-teacher">O‘qituvchi: <strong>{lesson.teacherName}</strong></p>}
      {showStudents && <div className="lesson-students">
        {lesson.students.length ? lesson.students.map((student) => (
          <span className="lesson-student" key={student.id}>{student.name}</span>
        )) : <span className="lesson-no-students">Hali o‘quvchi qo‘shilmagan.</span>}
      </div>}
      {(availableStudents.length > 0 || isAdmin) && (
        <>
          <button
            className="lesson-enrollment-toggle"
            type="button"
            aria-expanded={showAddForm}
            onClick={() => setShowAddForm((current) => !current)}
          >
            {showAddForm ? 'O‘quvchi qo‘shishni yopish' : 'O‘quvchi qo‘shish'} <span aria-hidden="true">{showAddForm ? '−' : '＋'}</span>
          </button>
          {showAddForm && (
            <>
              {isAdmin && (
                <div className="lesson-enrollment-modes" role="group" aria-label="O‘quvchini qo‘shish turi">
                  <button className={addMode === 'existing' ? 'active' : ''} type="button" disabled={!availableStudents.length} onClick={() => setAddMode('existing')}>Mavjud o‘quvchi</button>
                  <button className={addMode === 'new' ? 'active' : ''} type="button" onClick={() => setAddMode('new')}>Yangi o‘quvchi</button>
                </div>
              )}
              {addMode === 'new' && isAdmin ? (
                <form className="lesson-add-student-form" onSubmit={submit}>
                  <label>O‘quvchi ism-familiyasi<input value={newStudent.name} onChange={(event) => setNewStudent((current) => ({ ...current, name: event.target.value }))} maxLength={100} placeholder="Masalan, Dilnoza Karimova" required /></label>
                  <label>Telefon raqami<input type="tel" value={newStudent.phone} onChange={(event) => setNewStudent((current) => ({ ...current, phone: event.target.value }))} maxLength={32} placeholder="+998 90 123 45 67" /></label>
                  <label>Guruh nomi<input value={newStudent.groupName} onChange={(event) => setNewStudent((current) => ({ ...current, groupName: event.target.value }))} maxLength={80} required /></label>
                  <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Qo‘shilmoqda…' : 'Hisob yaratib guruhga qo‘shish'}<span aria-hidden="true">＋</span></button>
                </form>
              ) : availableStudents.length ? (
                <form className="lesson-add-student" onSubmit={submit}>
                  <select value={studentId} onChange={(event) => setStudentId(event.target.value)} aria-label={`${lesson.subject} darsiga o‘quvchi tanlash`} required>
                    <option value="">O‘quvchini tanlang</option>
                    {availableStudents.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.username}</option>)}
                  </select>
                  <button className="button button-primary" type="submit" disabled={busy || !studentId}>{busy ? 'Qo‘shilmoqda…' : 'Guruhga qo‘shish'}<span aria-hidden="true">＋</span></button>
                </form>
              ) : <p className="lesson-no-students">Barcha mavjud o‘quvchilar ushbu darsga qo‘shilgan.</p>}
              <Credentials credentials={credentials} onDismiss={() => setCredentials(null)} />
            </>
          )}
        </>
      )}
    </article>
  )
}

function TeacherCreateForm({ onCreate, busy }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [credentials, setCredentials] = useState(null)

  async function submit(event) {
    event.preventDefault()
    const createdCredentials = await onCreate({ name, phone, role: 'teacher' })
    if (createdCredentials) {
      setName('')
      setPhone('')
      setCredentials(createdCredentials)
    }
  }

  return (
    <>
      <form className="account-form teacher-create-form" onSubmit={submit}>
        <div className="form-grid">
          <label>O‘qituvchi ism-familiyasi<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} placeholder="Masalan, Dilnoza Karimova" /></label>
          <label>Telefon raqami<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={32} placeholder="+998 90 123 45 67" /></label>
        </div>
        <div className="form-footer">
          <span>Login avtomatik yaratiladi, vaqtinchalik parol bir marta ko‘rsatiladi.</span>
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Yaratilmoqda…' : 'O‘qituvchi qo‘shish'}<span aria-hidden="true">＋</span></button>
        </div>
      </form>
      <Credentials credentials={credentials} onDismiss={() => setCredentials(null)} />
    </>
  )
}

function LessonsPanel({ data, isAdmin, busy, accountBusy, section, onSectionChange, onCreateLesson, onAddStudent, onCreateAndAddStudent, onCreateSubject, onCreateTeacher }) {
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTeacherGroup, setSelectedTeacherGroup] = useState('')
  const [showSubjectForm, setShowSubjectForm] = useState(false)
  const [showTeacherForm, setShowTeacherForm] = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const [weekdayError, setWeekdayError] = useState('')
  const [form, setForm] = useState({
    subject: '',
    teacherId: data.teachers[0]?.id || '',
    weekdays: ['Dushanba'],
    startTime: '09:00',
    endTime: '10:00',
  })
  const subjects = [...new Set([...(data.subjects || []), ...data.lessons.map((lesson) => lesson.subject)])]
    .sort((a, b) => a.localeCompare(b, 'uz'))
  const visibleLessons = data.lessons.filter((lesson) => (
    (!selectedSubject || lesson.subject === selectedSubject) &&
    (section !== 'teachers' || !selectedTeacherId || lesson.teacherId === selectedTeacherId)
  ))
  const selectedTeacher = data.teachers.find((teacher) => teacher.id === selectedTeacherId)
  const weekdayOrder = [...weekdays.slice(1), weekdays[0]]
  const teacherLessons = [...data.lessons].sort((a, b) => (
    weekdayOrder.indexOf(a.weekday) - weekdayOrder.indexOf(b.weekday) ||
    a.startTime.localeCompare(b.startTime) ||
    a.subject.localeCompare(b.subject, 'uz')
  ))
  const teacherGroups = [...teacherLessons.reduce((groups, lesson) => {
    for (const student of lesson.students) {
      const groupName = student.groupName?.trim() || 'Guruh belgilanmagan'
      const group = groups.get(groupName) || new Map()
      group.set(student.id, student)
      groups.set(groupName, group)
    }
    return groups
  }, new Map())]
    .map(([name, students]) => ({ name, students: [...students.values()].sort((a, b) => a.name.localeCompare(b.name, 'uz')) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'uz'))
  const currentTeacherGroup = teacherGroups.find((group) => group.name === selectedTeacherGroup)

  async function submit(event) {
    event.preventDefault()
    if (!form.weekdays.length) {
      setWeekdayError('Kamida bitta hafta kunini tanlang.')
      return
    }
    const created = await onCreateLesson(form)
    if (created) setForm((current) => ({ ...current, subject: '' }))
  }

  function selectWeekday(day) {
    setWeekdayError('')
    setForm((current) => current.weekdays.includes(day)
      ? current
      : { ...current, weekdays: [...current.weekdays, day] })
  }

  function deselectWeekday(day) {
    setForm((current) => ({ ...current, weekdays: current.weekdays.filter((weekday) => weekday !== day) }))
  }

  async function submitSubject(event) {
    event.preventDefault()
    const created = await onCreateSubject(subjectName)
    if (created) {
      setSubjectName('')
      setShowSubjectForm(false)
    }
  }

  function openSubject(subject) {
    setSelectedSubject(subject)
    setSelectedTeacherId('')
    setForm((current) => ({ ...current, subject }))
    onSectionChange('schedule')
  }

  function openTeacher(teacherId) {
    setSelectedTeacherId(teacherId)
    setSelectedSubject('')
    onSectionChange('teachers')
  }

  return (
    <section className="lessons-section">
      <PageHeading
        eyebrow={isAdmin ? 'DARS JADVALI VA O‘QITUVCHILAR' : 'SIZGA BIRIKTIRILGAN DARSLAR'}
        title={isAdmin ? 'Darslar' : 'Darslarim'}
        description={isAdmin ? 'Fanlar, o‘qituvchilar va haftalik dars vaqtlarini boshqaring.' : 'Dars jadvalingizni ko‘ring va darslaringizga o‘quvchilar qo‘shing.'}
      />
      {!isAdmin && (
        <>
          <section className="content-card">
            <div className="card-heading"><div><span className="section-kicker">HAFTA KUNLARI VA VAQTLARI BO‘YICHA</span><h2>Dars jadvalim</h2></div></div>
            {teacherLessons.length ? <div className="lesson-list">
              {teacherLessons.map((lesson) => <LessonCard
                key={lesson.id}
                lesson={lesson}
                students={data.students}
                busy={busy === lesson.id}
                onAddStudent={onAddStudent}
                onCreateAndAddStudent={onCreateAndAddStudent}
                isAdmin={isAdmin}
                showTeacher={false}
                showStudents={false}
              />)}
            </div> : <div className="empty-state"><span>▦</span><strong>Dars jadvali hali tuzilmagan</strong><p>Dars jadvali bo‘yicha administratorga murojaat qiling.</p></div>}
          </section>
          <section className="content-card">
            <div className="card-heading"><div><span className="section-kicker">SIZGA BIRIKTIRILGAN O‘QUV GURUHLARI</span><h2>{currentTeacherGroup ? currentTeacherGroup.name : 'Guruhlarim'}</h2></div></div>
            {currentTeacherGroup ? (
              <>
                <button className="quiet-link teacher-groups-back" type="button" onClick={() => setSelectedTeacherGroup('')}>← Barcha guruhlar</button>
                <ul className="teacher-student-list">
                  {currentTeacherGroup.students.map((student) => <li key={student.id}>{student.name}</li>)}
                </ul>
              </>
            ) : teacherGroups.length ? (
              <div className="teacher-group-grid">
                {teacherGroups.map((group) => <button
                  className="teacher-group-card"
                  key={group.name}
                  type="button"
                  onClick={() => setSelectedTeacherGroup(group.name)}
                >
                  <strong>{group.name}</strong>
                  <span>{group.students.length} nafar o‘quvchi <span aria-hidden="true">→</span></span>
                </button>)}
              </div>
            ) : <div className="empty-state"><span>♙</span><strong>Biriktirilgan guruhlar yo‘q</strong><p>O‘qituvchiga dars va o‘quvchilar biriktirilgach guruhlar shu yerda ko‘rinadi.</p></div>}
          </section>
        </>
      )}
      {section === 'subjects' && (
        <section className="content-card">
          <div className="card-heading">
            <div><span className="section-kicker">O‘QITILAYOTGAN YO‘NALISHLAR</span><h2>Fanlar</h2></div>
            {isAdmin && <button className="icon-add-button" type="button" aria-label="Yangi fan qo‘shish" aria-expanded={showSubjectForm} onClick={() => setShowSubjectForm((current) => !current)}>＋</button>}
          </div>
          {isAdmin && showSubjectForm && <form className="subject-create-form" onSubmit={submitSubject}>
            <label>Yangi fan nomi<input autoFocus value={subjectName} onChange={(event) => setSubjectName(event.target.value)} maxLength={100} placeholder="Masalan, Matematika" required /></label>
            <button className="button button-primary" type="submit" disabled={busy === 'subject'}>{busy === 'subject' ? 'Qo‘shilmoqda…' : 'Fan qo‘shish'}<span aria-hidden="true">＋</span></button>
          </form>}
          {subjects.length ? <div className="subject-grid">
            {subjects.map((subject) => {
              const subjectLessons = data.lessons.filter((lesson) => lesson.subject === subject)
              const teachers = [...new Set(subjectLessons.map((lesson) => lesson.teacherName))]
              const studentCount = new Set(subjectLessons.flatMap((lesson) => lesson.students.map((student) => student.id))).size
              return <button className="subject-card" key={subject} type="button" onClick={() => openSubject(subject)}>
                <span className="metric-icon purple">▦</span><strong>{subject}</strong>
                <span>{teachers.join(', ') || 'Dars biriktirilmagan'}</span><small>{subjectLessons.length} ta dars · {studentCount} nafar o‘quvchi</small>
              </button>
            })}
          </div> : <div className="empty-state"><span>▦</span><strong>Fanlar hali kiritilmagan</strong><p>Dars jadvaliga birinchi darsni qo‘shganingizda fanlar shu yerda chiqadi.</p></div>}
        </section>
      )}

      {section === 'teachers' && isAdmin && (
        <section className="content-card">
          <div className="card-heading">
            <div><span className="section-kicker">FANI VA DARS JADVALI BILAN</span><h2>O‘qituvchilar</h2></div>
            {!showTeacherForm && <button className="icon-add-button" type="button" aria-label="Yangi o‘qituvchi qo‘shish" aria-expanded={showTeacherForm} onClick={() => setShowTeacherForm(true)}>＋</button>}
          </div>
          {showTeacherForm && <div className="teacher-create-panel">
            <div className="teacher-create-panel-heading"><strong>Yangi o‘qituvchi</strong><button className="quiet-link" type="button" onClick={() => setShowTeacherForm(false)}>Yopish ×</button></div>
            <TeacherCreateForm onCreate={onCreateTeacher} busy={accountBusy} />
          </div>}
          {selectedTeacher && <div className="lesson-breadcrumb"><button type="button" onClick={() => setSelectedTeacherId('')}>O‘qituvchilar</button><span>/</span><strong>{selectedTeacher.name}</strong></div>}
          {!selectedTeacher && data.teachers.length ? (
            <div className="teacher-grid">
              {data.teachers.map((teacher) => {
                const teacherLessons = data.lessons.filter((lesson) => lesson.teacherId === teacher.id)
                const teacherSubjects = [...new Set(teacherLessons.map((lesson) => lesson.subject))]
                const studentCount = new Set(teacherLessons.flatMap((lesson) => lesson.students.map((student) => student.id))).size
                return <button className="teacher-card" key={teacher.id} type="button" onClick={() => openTeacher(teacher.id)}>
                  <span className="teacher-avatar">{teacher.name.slice(0, 1).toUpperCase()}</span>
                  <span className="teacher-card-info"><strong>{teacher.name}</strong><small>{teacherSubjects.join(', ') || 'Fan biriktirilmagan'}</small><small>{teacherLessons.length} ta dars · {studentCount} nafar o‘quvchi</small></span>
                  <span aria-hidden="true">→</span>
                </button>
              })}
            </div>
          ) : !selectedTeacher ? <div className="empty-state"><span>♙</span><strong>O‘qituvchilar hali qo‘shilmagan</strong><p>Hisoblar bo‘limida o‘qituvchi hisobi yarating.</p></div> : (
            <div className="lesson-list">
              {visibleLessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} students={data.students} busy={busy === lesson.id} onAddStudent={onAddStudent} onCreateAndAddStudent={onCreateAndAddStudent} isAdmin={isAdmin} showTeacher={false} />)}
              {!visibleLessons.length && <div className="empty-state"><strong>{selectedTeacher.name}ga dars biriktirilmagan</strong><p>Dars jadvaliga dars qo‘shib, ushbu o‘qituvchini tanlang.</p></div>}
            </div>
          )}
        </section>
      )}

      {isAdmin && section === 'schedule' && (
        <>
          {selectedSubject && <div className="lesson-breadcrumb"><button type="button" onClick={() => setSelectedSubject('')}>Barcha darslar</button><span>/</span><strong>{selectedSubject}</strong></div>}
          {isAdmin && (!selectedSubject || !visibleLessons.length) && <section className="content-card">
            <div className="card-heading"><div><span className="section-kicker">YANGI DARS</span><h2>Dars jadvalini tuzish</h2></div></div>
            {data.teachers.length ? <form className="account-form" onSubmit={submit}>
              <div className="form-grid">
                <label>Fan<select value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required>
                  <option value="" disabled>Fanni tanlang</option>
                  {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select></label>
                <label>O‘qituvchi<select value={form.teacherId} onChange={(event) => setForm({ ...form, teacherId: event.target.value })} required>{data.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
                <div className="weekday-picker-field">
                  <span>Hafta kunlari</span>
                  <div className="weekday-picker" role="group" aria-label="Hafta kunlarini tanlang">
                    {[...weekdays.slice(1), weekdays[0]].map((day) => (
                      <button
                        className={form.weekdays.includes(day) ? 'weekday-option selected' : 'weekday-option'}
                        key={day}
                        type="button"
                        aria-pressed={form.weekdays.includes(day)}
                        aria-label={form.weekdays.includes(day) ? `${day}, tanlangan. Ikki marta bosib tanlovdan chiqaring.` : `${day}, tanlash`}
                        onClick={() => selectWeekday(day)}
                        onDoubleClick={() => deselectWeekday(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <span className="schedule-help">Bir nechta kunni tanlang. Belgilangan kunni olib tashlash uchun ikki marta bosing.</span>
                  {weekdayError && <span className="attendance-error" role="alert">{weekdayError}</span>}
                </div>
                <label>Boshlanish vaqti<input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} required /></label>
                <label>Tugash vaqti<input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} required /></label>
              </div>
              <div className="form-footer"><span>Dars haftalik jadvalga qo‘shilib, tanlangan o‘qituvchiga biriktiriladi.</span><button className="button button-primary" type="submit" disabled={busy}>{busy === 'create' ? 'Saqlanmoqda…' : 'Dars qo‘shish'}<span aria-hidden="true">＋</span></button></div>
            </form> : <div className="empty-state"><strong>Avval o‘qituvchi qo‘shing</strong><p>Yangi dars jadvalini tuzish uchun Hisoblar bo‘limida o‘qituvchi yarating.</p></div>}
            {!subjects.length && <p className="schedule-help">Dars jadvalini tuzishdan oldin Fanlar bo‘limidagi ＋ tugmasi orqali fan qo‘shing.</p>}
          </section>}
          <section className="content-card">
            <div className="card-heading"><div><span className="section-kicker">{selectedSubject ? 'USTOZ VA VAQT BO‘YICHA GURUHLAR' : 'HAFTA KUNLARI VA VAQTLARI BO‘YICHA'}</span><h2>{selectedSubject || (isAdmin ? 'Barcha darslar' : 'Dars jadvalim')}</h2></div></div>
            {selectedSubject && visibleLessons.length > 0 && <p className="schedule-help">O‘quvchini kerakli ustoz va vaqt guruhini tanlab, shu guruh kartasidan qo‘shing.</p>}
            {visibleLessons.length ? <div className="lesson-list">
              {visibleLessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} students={data.students} busy={busy === lesson.id} onAddStudent={onAddStudent} onCreateAndAddStudent={onCreateAndAddStudent} isAdmin={isAdmin} />)}
            </div> : <div className="empty-state"><span>▦</span><strong>{selectedSubject ? 'Bu fan bo‘yicha dars topilmadi' : 'Dars jadvali hali tuzilmagan'}</strong><p>{isAdmin ? 'Yuqoridagi shaklda fan, o‘qituvchi va dars vaqtini belgilang.' : 'Dars jadvali bo‘yicha administratorga murojaat qiling.'}</p></div>}
          </section>
        </>
      )}
    </section>
  )
}

function App() {
  const [theme, setTheme] = useState(() => window.localStorage.getItem('future-step-theme') === 'dark' ? 'dark' : 'light')
  const [user, setUser] = useState(null)
  const [setup, setSetup] = useState(false)
  const [setupAvailable, setSetupAvailable] = useState(true)
  const [setupKeyRequired, setSetupKeyRequired] = useState(false)
  const [booting, setBooting] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)
  const [page, setPage] = useState('overview')
  const [lessonSection, setLessonSection] = useState('schedule')
  const [users, setUsers] = useState([])
  const [overviewRosterRole, setOverviewRosterRole] = useState('student')
  const [lessonData, setLessonData] = useState({ lessons: [], teachers: [], subjects: [], students: [] })
  const [studentLessonData, setStudentLessonData] = useState({ today: '', weekday: '', lessons: [] })
  const [studentPayment, setStudentPayment] = useState(null)
  const [adminPaymentData, setAdminPaymentData] = useState({ today: '', students: [], payments: [] })
  const [attendance, setAttendance] = useState([])
  const [myAttendance, setMyAttendance] = useState([])
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [today, setToday] = useState('')
  const [attendanceDay, setAttendanceDay] = useState('')
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [search, setSearch] = useState('')
  const [settingsSearch, setSettingsSearch] = useState('')
  const [accountRoleFilter, setAccountRoleFilter] = useState('all')
  const [centerSettings, setCenterSettings] = useState({
    centerName: '',
    slogan: 'Bilim bilan kelajak sari.',
    description: '',
    phone: '',
    address: '',
    telegram: '',
    instagram: '',
    courses: '',
  })
  const [adminSettingsBusy, setAdminSettingsBusy] = useState(false)
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [lessonBusy, setLessonBusy] = useState('')
  const [overviewLessonAttendance, setOverviewLessonAttendance] = useState([])
  const [overviewLessonAttendanceLoading, setOverviewLessonAttendanceLoading] = useState(false)
  const [overviewLessonAttendanceError, setOverviewLessonAttendanceError] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('future-step-theme', theme)
  }, [theme])

  useEffect(() => {
    const siteName = centerSettings.centerName || 'Markaz'
    const title = `${siteName} — O‘quv markazi | Bilim bilan kelajak sari`
    document.title = title
    const description = centerSettings.description || `${siteName} o‘quv markazi — bilim va ko‘nikmalarni rivojlantirish sari qadam qo‘ying.`
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]']) {
      const meta = document.querySelector(selector)
      if (meta) meta.setAttribute('content', description)
    }
    const socialTitle = document.querySelector('meta[property="og:title"]')
    if (socialTitle) socialTitle.setAttribute('content', title)
    const socialName = document.querySelector('meta[property="og:site_name"]')
    if (socialName) socialName.setAttribute('content', siteName)
    const canonicalUrl = new URL('/', window.location.origin).href
    const canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) canonical.setAttribute('href', canonicalUrl)
    const socialUrl = document.querySelector('meta[property="og:url"]')
    if (socialUrl) socialUrl.setAttribute('content', canonicalUrl)
    const organizationSchema = document.querySelector('#organization-schema')
    if (organizationSchema) {
      organizationSchema.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'EducationalOrganization',
        name: siteName,
        description,
        url: canonicalUrl,
        ...(centerSettings.phone ? { telephone: centerSettings.phone } : {}),
        ...(centerSettings.address ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: centerSettings.address,
            addressCountry: 'UZ',
          },
        } : {}),
        inLanguage: 'uz',
      })
    }
  }, [centerSettings.address, centerSettings.centerName, centerSettings.description, centerSettings.phone])

  const load = useCallback(async () => {
    const data = await api('/me')
    setUser(data.user)
    setMyAttendance(data.attendance)
    setToday(data.today)
    setStudentPayment(data.payment)
    setAttendanceDay(data.today)
    if (['admin', 'teacher'].includes(data.user.role)) {
      const requests = [api('/users'), api(`/attendance?day=${data.today}`)]
      if (data.user.role === 'admin') requests.push(api('/payments'))
      requests.push(api('/lessons'))
      const results = await Promise.all(requests)
      const [accounts, day] = results
      setUsers(accounts.users)
      setAttendance(day.attendance)
      if (data.user.role === 'admin') setAdminPaymentData(results[2])
      setLessonData(results.at(-1))
    } else if (data.user.role === 'student') {
      setStudentLessonData(await api('/lessons'))
    }
    return data.user
  }, [])

  useEffect(() => {
    async function initialize() {
      try {
        const [status, publicInfo] = await Promise.all([
          api('/setup/status'),
          api('/public/settings'),
        ])
        setSetup(status.needsSetup)
        setSetupAvailable(status.setupAvailable)
        setSetupKeyRequired(status.setupKeyRequired)
        setCenterSettings(publicInfo.settings)
        if (!status.needsSetup) {
          const session = await api('/session')
          if (session.authenticated) await load()
        }
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setBooting(false)
      }
    }
    initialize()
  }, [load])

  useEffect(() => {
    if (user?.role !== 'student' || !['overview', 'schedule'].includes(page)) return undefined

    let active = true
    const refreshLessons = async () => {
      try {
        const data = await api('/lessons')
        if (active) setStudentLessonData(data)
      } catch (requestError) {
        if (active) setNotice({ type: 'error', message: requestError.message })
      }
    }
    const interval = window.setInterval(refreshLessons, 60_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [page, user?.role])

  useEffect(() => {
    if (user?.role !== 'admin' || page !== 'overview' || !today) return undefined

    let active = true
    const refreshLessonAttendance = async () => {
      const now = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Tashkent',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date())
      const lessonsToCheck = lessonData.lessons.filter((lesson) => (
        lesson.weekday === weekdayForDate(today) && lesson.startTime <= now
      ))

      if (!lessonsToCheck.length) {
        setOverviewLessonAttendance([])
        setOverviewLessonAttendanceLoading(false)
        setOverviewLessonAttendanceError('')
        return
      }

      setOverviewLessonAttendanceLoading(true)
      setOverviewLessonAttendanceError('')
      try {
        const results = await Promise.all(lessonsToCheck.map((lesson) => (
          api(`/lessons/${lesson.id}/attendance?day=${today}`)
        )))
        if (active) setOverviewLessonAttendance(results)
      } catch (requestError) {
        if (active) {
          setOverviewLessonAttendance([])
          setOverviewLessonAttendanceError(requestError.message)
        }
      } finally {
        if (active) setOverviewLessonAttendanceLoading(false)
      }
    }

    refreshLessonAttendance()
    const interval = window.setInterval(refreshLessonAttendance, 60_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [lessonData.lessons, page, today, user?.role])

  async function signIn(credentials) {
    setBusy(true)
    setError('')
    try {
      await api('/login', { method: 'POST', body: JSON.stringify(credentials) })
      await load()
      setPage('overview')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function createAdmin(credentials) {
    setBusy(true)
    setError('')
    try {
      await api('/setup', { method: 'POST', body: JSON.stringify(credentials) })
      setSetup(false)
      await load()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    try {
      await api('/logout', { method: 'POST' })
      setUser(null)
      setUsers([])
      setAttendance([])
      setMyAttendance([])
      setStudentPayment(null)
      setStudentLessonData({ today: '', weekday: '', lessons: [] })
      setAdminPaymentData({ today: '', students: [], payments: [] })
      setLessonData({ lessons: [], teachers: [], subjects: [], students: [] })
      setError('')
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.message })
    }
  }

  async function createUser(form, showCredentialsOnAccountsPage = true) {
    setBusy(true)
    try {
      const result = await api('/users', { method: 'POST', body: JSON.stringify(form) })
      setUsers((current) => [...current, result.user].sort((a, b) => a.name.localeCompare(b.name)))
      setLessonData((current) => ({
        ...current,
        teachers: result.user.role === 'teacher'
          ? [...current.teachers, result.user].sort((a, b) => a.name.localeCompare(b.name))
          : current.teachers,
        students: result.user.role === 'student'
          ? [...current.students, result.user].sort((a, b) => a.name.localeCompare(b.name))
          : current.students,
      }))
      if (showCredentialsOnAccountsPage) setCreatedCredentials(result.credentials)
      setNotice({ message: `${roleNames[form.role]} hisobi yaratildi.` })
      return result.credentials
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.message })
      return false
    } finally {
      setBusy(false)
    }
  }

  async function saveUser(id, form) {
    setBusy(true)
    try {
      const result = await api(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(form) })
      setUsers((current) => current.map((person) => person.id === id ? result.user : person))
      setLessonData((current) => ({
        ...current,
        teachers: current.teachers.map((teacher) => teacher.id === id ? { ...teacher, ...result.user } : teacher),
        students: current.students.map((student) => student.id === id ? { ...student, ...result.user } : student),
        lessons: current.lessons.map((lesson) => ({
          ...lesson,
          ...(lesson.teacherId === id ? { teacherName: result.user.name, teacherUsername: result.user.username } : {}),
          students: lesson.students.map((student) => student.id === id ? { ...student, name: result.user.name, username: result.user.username } : student),
        })),
      }))
      if (user.id === id) setUser(result.user)
      setNotice({ message: 'Ma’lumotlar saqlandi.' })
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.message })
    } finally {
      setBusy(false)
    }
  }

  async function saveCenterSettings(form) {
    setAdminSettingsBusy(true)
    try {
      const result = await api('/admin/settings', { method: 'PATCH', body: JSON.stringify(form) })
      setCenterSettings(result.settings)
      setNotice({ message: 'Markazning ommaviy ma’lumotlari saqlandi.' })
      return result.settings
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.message })
      return false
    } finally {
      setAdminSettingsBusy(false)
    }
  }

  async function saveAdminSettings(form) {
    setAdminSettingsBusy(true)
    try {
      const result = await api('/admin/profile', { method: 'PATCH', body: JSON.stringify(form) })
      setUser(result.user)
      if (result.settings) setCenterSettings((current) => ({ ...current, ...result.settings }))
      setNotice({ message: 'Admin sozlamalari saqlandi.' })
      return {
        ...result.user,
        centerName: result.settings?.centerName || form.centerName,
        phone: result.settings?.phone || form.phone,
        telegram: result.settings?.telegram || form.telegram,
        instagram: result.settings?.instagram || form.instagram,
      }
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.message })
      return false
    } finally {
      setAdminSettingsBusy(false)
    }
  }

  async function saveLessonFeedback(lessonId, comment) {
    setLessonBusy(lessonId)
    try {
      const result = await api(`/lessons/${lessonId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      })
      setStudentLessonData(result)
      setNotice({ message: 'Dars haqidagi izohingiz saqlandi.' })
      return true
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.message })
      return false
    } finally {
      setLessonBusy('')
    }
  }

  async function markAttendance(id, action) {
    setBusyId(id)
    try {
      await api(`/attendance/${id}/${action}`, { method: 'POST' })
      const day = await api(`/attendance?day=${attendanceDay}`)
      setAttendance(day.attendance)
      setNotice({ message: 'Davomat yangilandi.' })
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.message })
    } finally {
      setBusyId('')
    }
  }

  async function changeAttendanceDay(day) {
    if (!day) return
    setAttendanceDay(day)
    try {
      const result = await api(`/attendance?day=${day}`)
      setAttendance(result.attendance)
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.message })
    }
  }

  async function resetPassword(id) {
    setBusyId(id)
    try {
      const result = await api(`/users/${id}/reset-password`, { method: 'POST', body: '{}' })
      setUsers((current) => current.map((person) => person.id === id ? result.user : person))
      setLessonData((current) => ({
        ...current,
        teachers: current.teachers.map((person) => person.id === id ? { ...person, ...result.user } : person),
        students: current.students.map((person) => person.id === id ? { ...person, ...result.user } : person),
        lessons: current.lessons.map((lesson) => ({
          ...lesson,
          ...(lesson.teacherId === id ? { teacherName: result.user.name, teacherUsername: result.user.username } : {}),
          students: lesson.students.map((person) => person.id === id ? { ...person, name: result.user.name, username: result.user.username } : person),
        })),
      }))
      setNotice({ message: 'Yangi login va parol yaratildi. Hisob egasiga xavfsiz yetkazing.' })
      return result.credentials
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.message })
      return null
    } finally {
      setBusyId('')
    }
  }

  async function savePayment(form) {
    setPaymentBusy(true)
    try {
      const result = await api('/payments', { method: 'POST', body: JSON.stringify(form) })
      setAdminPaymentData(result)
      setNotice({ message: form.amount ? 'To‘lov va o‘quvchining oylik to‘lov rejasi saqlandi.' : 'O‘quvchining oylik to‘lov rejasi saqlandi.' })
      return true
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.message })
      return false
    } finally {
      setPaymentBusy(false)
    }
  }

  async function createLesson(form) {
    setLessonBusy('create')
    const { weekdays: selectedWeekdays, ...lesson } = form
    const createdWeekdays = []
    try {
      for (const weekday of selectedWeekdays) {
        const result = await api('/lessons', {
          method: 'POST',
          body: JSON.stringify({ ...lesson, weekday }),
        })
        setLessonData(result)
        createdWeekdays.push(weekday)
      }
      setNotice({ message: `Dars ${createdWeekdays.join(', ')} kunlariga jadvalga qo‘shildi.` })
      return true
    } catch (requestError) {
      const partialSuccess = createdWeekdays.length
        ? `${createdWeekdays.join(', ')} kunlariga dars qo‘shildi. Qolgan kunlar qo‘shilmadi. `
        : ''
      setNotice({ type: 'error', message: `${partialSuccess}${requestError.message}` })
      return false
    } finally {
      setLessonBusy('')
    }
  }

  async function createSubject(name) {
    setLessonBusy('subject')
    try {
      const result = await api('/subjects', { method: 'POST', body: JSON.stringify({ name }) })
      setLessonData(result)
      setNotice({ message: 'Fan qo‘shildi.' })
      return true
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.message })
      return false
    } finally {
      setLessonBusy('')
    }
  }

  async function addStudentToLesson(lessonId, studentId) {
    setLessonBusy(lessonId)
    try {
      const result = await api(`/lessons/${lessonId}/students`, {
        method: 'POST',
        body: JSON.stringify({ studentId }),
      })
      setLessonData(result)
      setNotice({ message: 'O‘quvchi darsga qo‘shildi.' })
      return true
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.message })
      return false
    } finally {
      setLessonBusy('')
    }
  }

  async function createAndAddStudentToLesson(lessonId, student) {
    setLessonBusy(lessonId)
    try {
      const result = await api(`/lessons/${lessonId}/students`, {
        method: 'POST',
        body: JSON.stringify({ newStudent: student }),
      })
      setUsers((current) => [...current, result.user].sort((a, b) => a.name.localeCompare(b.name)))
      setLessonData(result.lessonData)
      setNotice({ message: 'O‘quvchi hisobi yaratildi va guruhga qo‘shildi.' })
      return result.credentials
    } catch (requestError) {
      setNotice({ type: 'error', message: requestError.message })
      return false
    } finally {
      setLessonBusy('')
    }
  }

  function openLessons() {
    setLessonSection('schedule')
    setPage('lessons')
  }

  function openSettings() {
    setSettingsSearch('')
    setPage('student-settings')
  }

  function openLessonSection(section) {
    setLessonSection(section)
    setPage('lessons')
  }

  async function createTeacher(form) {
    return createUser(form, false)
  }

  const [busyId, setBusyId] = useState('')

  if (booting) return <main className="loading-page"><CenterMark name={centerSettings.centerName || 'Markaz'} className="loading-mark" /><p>{centerSettings.centerName || 'Markaz'} yuklanmoqda…</p></main>
  if (window.location.pathname === '/contact') return <ContactPage settings={centerSettings} />
  if (!user) return <Login setup={setup} setupAvailable={setupAvailable} setupKeyRequired={setupKeyRequired} settings={centerSettings} onLogin={signIn} onSetup={createAdmin} busy={busy} error={error} />

  const currentTitle = {
    overview: user.role === 'admin' ? 'Umumiy ko‘rinish' : user.role === 'teacher' ? 'O‘quvchilarim' : 'Shaxsiy kabinet',
    attendance: user.role === 'student' ? 'Davomatim' : 'Davomat nazorati',
    users: 'Hisoblar',
    lessons: user.role === 'admin' ? 'Darslar' : 'Darslarim',
    payments: 'To‘lovlar',
    schedule: 'Dars jadvalim',
    settings: 'Markaz sozlamalari',
    'student-settings': 'O‘quvchi sozlamalari',
    'teacher-settings': 'O‘qituvchi sozlamalari',
    'admin-settings': 'Admin sozlamalari',
  }[page]
  const dailyAttendanceRows = attendance.filter((person) => matchesAccountSearch(person, attendanceSearch))
  const checkedInStudentIds = new Set(attendance.filter((person) => person.role === 'student' && person.checkIn).map((person) => person.userId))
  const students = users.filter((person) => person.role === 'student')
  const absentStudents = students.filter((person) => !checkedInStudentIds.has(person.id))
  const presentStudents = students.length - absentStudents.length
  const overviewRoster = users.filter((person) => {
    const matchesRole = overviewRosterRole === 'absent'
      ? person.role === 'student' && !checkedInStudentIds.has(person.id)
      : person.role === overviewRosterRole
    return matchesRole && matchesAccountSearch(person, search)
  })

  return (
    <div className="dashboard">
      <Sidebar
        user={user}
        page={page}
        setPage={setPage}
        onLogout={logout}
        centerName={centerSettings.centerName}
        lessonSection={lessonSection}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
        onOpenLessons={openLessons}
        onSelectLessonSection={openLessonSection}
        onOpenSettings={openSettings}
      />
      <main className={`dashboard-main${user.role === 'admin' && page === 'lessons' ? ' dashboard-main-with-lessons' : ''}${user.role === 'admin' && ['student-settings', 'teacher-settings', 'admin-settings'].includes(page) ? ' dashboard-main-with-settings' : ''}`}>
        <header className="dashboard-topbar">
          <div className="breadcrumb">{centerSettings.centerName || 'Markaz'} <span>/</span> {currentTitle}</div>
          <div className="topbar-right"><span className="today-label">{todayLabel()}</span><span className="avatar top-avatar">{user.name.slice(0, 1).toUpperCase()}</span></div>
        </header>
        <div className="dashboard-content">
          <Notice notice={notice} onClose={() => setNotice(null)} />
          {user.role === 'student' && page !== 'overview' && studentPayment && (
            <StudentPaymentReminder payment={studentPayment} today={today} />
          )}
          {page === 'overview' && user.role === 'student' && (
            <>
              <StudentOverview user={user} attendance={myAttendance} onOpenSchedule={() => setPage('schedule')} today={today} />
              <StudentLessonFeedback data={studentLessonData} busyId={lessonBusy} onSave={saveLessonFeedback} />
              {studentPayment && <StudentPaymentPanel payment={studentPayment} today={today} />}
            </>
          )}
          {page === 'overview' && user.role === 'admin' && (
            <>
              <PageHeading eyebrow={todayLabel()} title="Umumiy ko‘rinish" description="Markazingizdagi bugungi holat va hisoblar." action={<button className="button button-primary" type="button" onClick={() => setPage('users')}>Hisob qo‘shish <span>＋</span></button>} />
              <div className="metric-grid admin-overview-metrics">
                <button className={`metric-card metric-card-action metric-card-alert${overviewRosterRole === 'absent' ? ' selected' : ''}`} type="button" aria-pressed={overviewRosterRole === 'absent'} onClick={() => { setOverviewRosterRole('absent'); setSearch('') }}><span className="metric-icon red">!</span><span className="metric-label">Kelmaganlar</span><strong>{absentStudents.length}</strong><small>Ro‘yxatni shu yerda ko‘rish →</small></button>
                <article className="metric-card"><span className="metric-icon orange">◷</span><span className="metric-label">Bugun kelgan</span><strong>{presentStudents}</strong><small>O‘quvchilar</small></article>
                <button className={`metric-card metric-card-action${overviewRosterRole === 'student' ? ' selected' : ''}`} type="button" aria-pressed={overviewRosterRole === 'student'} onClick={() => { setOverviewRosterRole('student'); setSearch('') }}><span className="metric-icon purple">♙</span><span className="metric-label">O‘quvchilar</span><strong>{students.length}</strong><small>Ro‘yxatni shu yerda ko‘rish →</small></button>
                <button className={`metric-card metric-card-action${overviewRosterRole === 'teacher' ? ' selected' : ''}`} type="button" aria-pressed={overviewRosterRole === 'teacher'} onClick={() => { setOverviewRosterRole('teacher'); setSearch('') }}><span className="metric-icon green">♧</span><span className="metric-label">O‘qituvchilar</span><strong>{users.filter((person) => person.role === 'teacher').length}</strong><small>Ro‘yxatni shu yerda ko‘rish →</small></button>
              </div>
              <section className="content-card">
                <div className="card-heading account-list-heading">
                  <div><span className="section-kicker">{overviewRosterRole === 'absent' ? 'BUGUNGI DAVOMAT' : 'MARKAZ JAMOASI'}</span><h2>{overviewRosterRole === 'absent' ? 'Kelmagan yoki davomat belgilanmagan o‘quvchilar' : overviewRosterRole === 'student' ? 'O‘quvchilar' : 'O‘qituvchilar'}</h2></div>
                  <input className="search-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ism, login yoki telefon orqali qidirish" aria-label="Hisoblarni ism, login yoki telefon bo‘yicha qidirish" />
                  <span className="count-pill">{overviewRoster.length} ta hisob</span>
                </div>
                <UserList users={overviewRoster} onSave={saveUser} onReset={resetPassword} busyId={busyId} search={search} />
              </section>
              <section className="content-card">
                <div className="card-heading"><div><span className="section-kicker">BUGUNGI NAZORAT</span><h2>Davomat holati</h2></div><button className="quiet-link" type="button" onClick={() => setPage('attendance')}>Barchasini ko‘rish →</button></div>
                <AttendanceTable rows={attendance.slice(0, 6)} role={user.role} busyId={busyId} onMark={markAttendance} />
              </section>
              <AdminAttendanceAlerts
                lessonAttendance={overviewLessonAttendance}
                loading={overviewLessonAttendanceLoading}
                error={overviewLessonAttendanceError}
              />
            </>
          )}
          {page === 'overview' && user.role === 'teacher' && (
            <>
              <PageHeading eyebrow={todayLabel()} title={`Xush kelibsiz, ${user.name.split(' ')[0]}!`} description="Guruhingiz va o‘quvchilaringiz davomatini shu yerdan boshqaring." action={<button className="button button-primary" type="button" onClick={() => setPage('attendance')}>Davomatni belgilash <span>→</span></button>} />
              <div className="metric-grid">
                <article className="metric-card"><span className="metric-icon purple">♙</span><span className="metric-label">O‘quvchilar</span><strong>{users.filter((person) => person.role === 'student').length}</strong><small>Biriktirilgan o‘quvchilar</small></article>
                <article className="metric-card"><span className="metric-icon green">◷</span><span className="metric-label">Bugun kelgan</span><strong>{attendance.filter((person) => person.checkIn).length}</strong><small>Davomat belgilangan</small></article>
              </div>
              <section className="content-card">
                <div className="card-heading"><div><span className="section-kicker">DARS BOSHLANGANDA</span><h2>Dars davomati</h2></div><button className="quiet-link" type="button" onClick={() => setPage('attendance')}>Davomatni ochish →</button></div>
                <p className="attendance-lesson-note">Dars boshlangach, darsdagi barcha o‘quvchilarni kelgan yoki kelmagan deb belgilang. Davomat yuborilgach, uni faqat administrator o‘zgartira oladi.</p>
              </section>
            </>
          )}
          {page === 'attendance' && user.role === 'student' && (
            <>
              <PageHeading eyebrow="Shaxsiy ma’lumot" title="Davomatim" description="O‘quv markazidagi kelish va ketish qaydlaringiz." />
              <section className="content-card"><div className="card-heading"><div><span className="section-kicker">SO‘NGGI 30 KUN</span><h2>Davomat tarixi</h2></div></div>
                <div className="table-scroll"><table><thead><tr><th>Sana</th><th>Kelgan vaqti</th><th>Ketgan vaqti</th><th>Holat</th></tr></thead><tbody>
                  {myAttendance.map((record) => <tr key={record.day}><td>{record.day}</td><td>{formatTime(record.checkIn)}</td><td>{formatTime(record.checkOut)}</td><td><span className={`role-badge ${record.checkIn ? 'teacher' : 'student'}`}>{record.checkOut ? 'Yakunlangan' : record.checkIn ? 'Keldi' : 'Belgilanmagan'}</span></td></tr>)}
                  {!myAttendance.length && <tr><td colSpan="4" className="table-empty">Hozircha davomat qaydi mavjud emas.</td></tr>}
                </tbody></table></div>
              </section>
            </>
          )}
          {page === 'attendance' && user.role !== 'student' && (
            <>
              <LessonAttendanceManager lessons={lessonData.lessons} role={user.role} today={today} />
              {user.role === 'admin' && <>
              <PageHeading
                eyebrow={todayLabel()}
                title="Davomat nazorati"
                description="Kunlik kelish-ketish qaydlari va dars bo‘yicha davomati."
                action={<label className="date-filter">Sana<input type="date" value={attendanceDay} max={today} onChange={(event) => changeAttendanceDay(event.target.value)} /></label>}
              />
              <section className="content-card">
                <div className="card-heading account-list-heading">
                  <div><span className="section-kicker">{attendanceDay === today ? 'BUGUNGI RO‘YXAT' : 'TANLANGAN SANA'}</span><h2>Kelish va ketish</h2></div>
                  <input className="search-input" type="search" value={attendanceSearch} onChange={(event) => setAttendanceSearch(event.target.value)} placeholder="Ism, login yoki telefon orqali qidirish" aria-label="Davomatni ism, login yoki telefon bo‘yicha qidirish" />
                  <span className="count-pill">{attendance.filter((person) => person.checkIn).length} / {attendance.length} keldi</span>
                </div>
                <AttendanceTable rows={dailyAttendanceRows} role={user.role} busyId={busyId} onMark={markAttendance} editable={attendanceDay === today} />
              </section>
              </>}
            </>
          )}
          {page === 'users' && user.role === 'admin' && (
            <>
              <PageHeading eyebrow="Hisoblarni boshqarish" title="Hisoblar" description="Yangi o‘quvchi yoki o‘qituvchi qo‘shing. Login avtomatik, parol esa bir martalik yaratiladi." />
              <section className="content-card"><div className="card-heading"><div><span className="section-kicker">YANGI HISOB</span><h2>O‘quvchi yoki o‘qituvchi qo‘shish</h2></div></div>
                <AccountForm onCreate={createUser} busy={busy} />
                <Credentials credentials={createdCredentials} onDismiss={() => setCreatedCredentials(null)} />
              </section>
              <section className="content-card"><div className="card-heading account-list-heading"><div><span className="section-kicker">MARKAZ HISOBLARI</span><h2>Hisoblar ro‘yxati</h2></div>
                <select className="account-role-filter" value={accountRoleFilter} onChange={(event) => setAccountRoleFilter(event.target.value)} aria-label="Hisob turini tanlang"><option value="all">Barcha hisoblar</option><option value="student">O‘quvchilar</option><option value="teacher">O‘qituvchilar</option></select>
                <input className="search-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ism, login yoki telefon orqali qidirish" aria-label="Hisoblarni ism, login yoki telefon bo‘yicha qidirish" /></div>
                <UserList users={users.filter((person) => person.role !== 'admin' && (accountRoleFilter === 'all' || person.role === accountRoleFilter) && matchesAccountSearch(person, search))} onSave={saveUser} onReset={resetPassword} busyId={busyId} search={search} />
              </section>
            </>
          )}
          {['student-settings', 'teacher-settings'].includes(page) && user.role === 'admin' && (
            <>
              <PageHeading
                eyebrow="Hisoblarni boshqarish"
                title={page === 'student-settings' ? 'O‘quvchi sozlamalari' : 'O‘qituvchi sozlamalari'}
                description={page === 'student-settings'
                  ? 'O‘quvchilar ma’lumotlarini tahrirlang yoki login va parolini yangilang.'
                  : 'O‘qituvchilar ma’lumotlarini tahrirlang yoki login va parolini yangilang.'}
              />
              <section className="content-card">
                <div className="card-heading account-list-heading">
                  <div><span className="section-kicker">{page === 'student-settings' ? 'O‘QUVCHILAR' : 'O‘QITUVCHILAR'}</span><h2>Hisoblar ro‘yxati</h2></div>
                  <input
                    className="search-input"
                    type="search"
                    value={settingsSearch}
                    onChange={(event) => setSettingsSearch(event.target.value)}
                    placeholder="Ism, login yoki telefon orqali qidirish"
                    aria-label="Hisoblarni ism, login yoki telefon bo‘yicha qidirish"
                  />
                </div>
                <UserList
                  users={users.filter((person) => person.role === (page === 'student-settings' ? 'student' : 'teacher') && matchesAccountSearch(person, settingsSearch))}
                  onSave={saveUser}
                  onReset={resetPassword}
                  busyId={busyId}
                  search={settingsSearch}
                />
              </section>
            </>
          )}
          {page === 'payments' && user.role === 'admin' && (
            <AdminPayments data={adminPaymentData} onSave={savePayment} busy={paymentBusy} />
          )}
          {page === 'lessons' && ['admin', 'teacher'].includes(user.role) && (
            <LessonsPanel
              data={lessonData}
              isAdmin={user.role === 'admin'}
              busy={lessonBusy}
              accountBusy={busy}
              section={lessonSection}
              onSectionChange={openLessonSection}
              onCreateLesson={createLesson}
              onCreateSubject={createSubject}
              onCreateTeacher={createTeacher}
              onAddStudent={addStudentToLesson}
              onCreateAndAddStudent={createAndAddStudentToLesson}
            />
          )}
          {page === 'settings' && user.role === 'admin' && (
            <>
              <PageHeading eyebrow="Ommaviy ko‘rinish" title="Markaz sozlamalari" description="O‘quvchilar login sahifasida va ommaviy sahifalarda ko‘radigan aloqa va markaz ma’lumotlarini boshqaring." />
              <section className="content-card">
                <div className="card-heading"><div><span className="section-kicker">TASHQI MA’LUMOTLAR</span><h2>Markaz haqida</h2></div></div>
                <CenterSettingsForm settings={centerSettings} onSave={saveCenterSettings} busy={adminSettingsBusy} />
              </section>
              <section className="content-card public-preview">
                <span className="section-kicker">KO‘RINISH NAMUNASI</span>
                <h2>{centerSettings.centerName || 'Markaz'}</h2>
                <p>{centerSettings.slogan}</p>
                {centerSettings.address && <p>{centerSettings.address}</p>}
                {centerSettings.phone && <p>{centerSettings.phone}</p>}
              </section>
            </>
          )}
          {page === 'admin-settings' && user.role === 'admin' && (
            <>
              <PageHeading eyebrow="Himoyalangan sozlamalar" title="Admin sozlamalari" description="Administrator profilini, tizimga kirish loginini va parolini yangilang." />
              <section className="content-card">
                <div className="card-heading"><div><span className="section-kicker">ADMINISTRATOR HISOBI</span><h2>Login va xavfsizlik</h2></div></div>
                <AdminSettingsForm user={user} centerName={centerSettings.centerName} centerSettings={centerSettings} onSave={saveAdminSettings} busy={adminSettingsBusy} />
              </section>
              <section className="content-card security-note">
                <strong>Hisobingizni himoyalang</strong>
                <p>Kamida 12 belgili, boshqa saytlarda ishlatilmaydigan parol tanlang. Parolni hech kim bilan ulashmang.</p>
              </section>
            </>
          )}
          {page === 'schedule' && user.role === 'student' && (
            <>
              <PageHeading eyebrow="Haftalik reja" title="Dars jadvalim" description="Guruhingiz uchun administrator kiritgan dars kunlari va vaqtlari." />
              <section className="content-card"><div className="card-heading"><div><span className="section-kicker">{user.groupName || 'GURUH BIRIKTIRILMAGAN'}</span><h2>Haftalik darslar</h2></div></div><Schedule schedule={user.schedule || ''} /></section>
              <StudentLessonFeedback data={studentLessonData} busyId={lessonBusy} onSave={saveLessonFeedback} />
              <p className="schedule-help">Jadvalni o‘zgartirish kerak bo‘lsa, administratorga murojaat qiling.</p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
