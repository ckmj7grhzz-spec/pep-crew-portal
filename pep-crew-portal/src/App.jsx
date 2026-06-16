import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Users, Plane, Car, Hotel, CalendarDays, FileText, StickyNote, ChevronDown, Plus, Copy, Settings, ArrowLeft, LogOut } from 'lucide-react'
import { supabase } from './supabase'
import './styles.css'
import * as XLSX from 'xlsx'
import pepLogo from './BW Logo_Pep_With bg.png'

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(timeString) {
  if (!timeString) return ''
  if (typeof timeString === 'string' && /^\d{2}:\d{2}/.test(timeString)) return timeString.slice(0, 5)
  return timeString
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}


function personSlug(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function Accordion({ title, subtitle, icon: Icon, children }) {
  const [open, setOpen] = useState(false)

  return (
    <section className="accordion">
      <button className="accordionHeader" onClick={() => setOpen(!open)}>
        <span className="iconWrap"><Icon size={26} /></span>
        <span className="headingBlock">
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </span>
        <ChevronDown className={open ? 'chevron open' : 'chevron'} />
      </button>
      {open && <div className="accordionBody">{children}</div>}
    </section>
  )
}

function Empty({ text }) {
  return <p className="empty">{text}</p>
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0)
  if (!value) return ''
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function normaliseBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback
  const clean = String(value).trim().toLowerCase()
  if (['true', 'yes', 'y', '1', 'public', 'visible'].includes(clean)) return true
  if (['false', 'no', 'n', '0', 'private', 'hidden', 'admin only', 'admin_only'].includes(clean)) return false
  return fallback
}

function DocumentPreviewLinks({ url, label = 'document' }) {
  const [previewOpen, setPreviewOpen] = useState(false)

  if (!url) return null

  const cleanUrl = String(url)
  const lowerUrl = cleanUrl.split('?')[0].toLowerCase()
  const isImage = /\.(png|jpg|jpeg|webp|gif)$/i.test(lowerUrl)
  const isPdf = /\.pdf$/i.test(lowerUrl)
  const canPreview = isImage || isPdf || cleanUrl.startsWith('http')

  return (
    <>
      <div className="documentActionLinks">
        {canPreview && (
          <button
            type="button"
            className="documentPreviewButton"
            onClick={() => setPreviewOpen(true)}
          >
            Preview document
          </button>
        )}
        <a href={cleanUrl} target="_blank" rel="noreferrer">
          Open document
        </a>
        <a href={cleanUrl} target="_blank" rel="noreferrer" download>
          Download
        </a>
      </div>

      {previewOpen && (
        <div className="documentPreviewOverlay" role="dialog" aria-modal="true">
          <div className="documentPreviewModal">
            <div className="documentPreviewHeader">
              <strong>{label}</strong>
              <button type="button" onClick={() => setPreviewOpen(false)}>×</button>
            </div>

            <div className="documentPreviewBody">
              {isImage ? (
                <img src={cleanUrl} alt={label} />
              ) : (
                <iframe src={cleanUrl} title={label}></iframe>
              )}
            </div>

            <div className="documentPreviewFooter">
              <a href={cleanUrl} target="_blank" rel="noreferrer">
                Open in new tab
              </a>
              <a href={cleanUrl} target="_blank" rel="noreferrer" download>
                Download file
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function parseCsv(text) {
  const rows = []
  let current = ''
  let row = []
  let insideQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"' && insideQuotes && next === '"') {
      current += '"'
      i++
    } else if (char === '"') {
      insideQuotes = !insideQuotes
    } else if (char === ',' && !insideQuotes) {
      row.push(current.trim())
      current = ''
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (current || row.length) {
        row.push(current.trim())
        rows.push(row)
        row = []
        current = ''
      }
      if (char === '\r' && next === '\n') i++
    } else {
      current += char
    }
  }

  if (current || row.length) {
    row.push(current.trim())
    rows.push(row)
  }

  if (!rows.length) return []

  const headers = rows[0].map(header =>
    header
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
  )

  return rows
    .slice(1)
    .filter(row => row.some(cell => cell && cell.trim()))
    .map(row => {
      const record = {}
      headers.forEach((header, index) => {
        record[header] = row[index] || ''
      })
      return record
    })
}


function normaliseImportKey(key) {
  return String(key || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
}

function normaliseImportRows(rows) {
  return rows.map(row => {
    const cleaned = {}

    Object.entries(row).forEach(([key, value]) => {
      cleaned[normaliseImportKey(key)] =
        value === undefined || value === null
          ? ''
          : String(value).trim()
    })

    return cleaned
  })
}

async function readImportFile(file, sheetName) {
  const extension = file.name.split('.').pop().toLowerCase()

  if (extension === 'csv') {
    const text = await file.text()
    return parseCsv(text)
  }

  const buffer = await file.arrayBuffer()

  const workbook = XLSX.read(buffer, {
    type: 'array'
  })

  const targetSheetName =
    workbook.SheetNames.find(name => name.toLowerCase() === sheetName.toLowerCase()) ||
    workbook.SheetNames.find(name => name.toLowerCase().includes(sheetName.toLowerCase())) ||
    workbook.SheetNames[0]

  const sheet = workbook.Sheets[targetSheetName]
  if (!sheet) return []

  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false
  })

  const headerRowIndex = rawRows.findIndex(row =>
    row.map(cell => normaliseImportKey(cell)).includes('name')
  )

  if (headerRowIndex === -1) return []

  const headers = rawRows[headerRowIndex].map(header => normaliseImportKey(header))

  const rows = rawRows
    .slice(headerRowIndex + 1)
    .filter(row => row.some(cell => String(cell || '').trim()))
    .map(row => {
      const record = {}
      headers.forEach((header, index) => {
        if (header) {
          record[header] = row[index] === undefined || row[index] === null ? '' : String(row[index]).trim()
        }
      })
      return record
    })

  return normaliseImportRows(rows)
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function login(e) {
    e.preventDefault()
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(`Login failed: ${error.message}`)
      return
    }

    onLogin()
  }

  return (
    <main className="page">
      <header className="hero">
        <img
  src={pepLogo}
  alt="Premium Event Productions"
  className="pepLogo"
/>
        <div>
          <p className="eyebrow">Premium Event Productions</p>
          <h1>PEP Admin Login</h1>
        </div>
      </header>

      <section className="eventCard loginCard">
        <h2>Admin Access</h2>
        <p>Sign in to manage PEP crew sheets.</p>

        <form onSubmit={login} className="adminForm loginForm">
          <label>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@pepled.com" />
          </label>

          <label>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
          </label>

          <button className="primaryButton" type="submit">Login</button>
        </form>

        {message && <p className="adminMessage">{message}</p>}
      </section>
    </main>
  )
}

function AdminShell({ children }) {
  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/admin'
  }

  return (
    <>
      <div className="adminLogoutBar">
        <button type="button" onClick={logout}>
          <LogOut size={16} /> Logout
        </button>
      </div>
      {children}
    </>
  )
}

function AdminPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    show_name: '',
    venue: '',
    start_date: '',
    end_date: '',
    project_manager: '',
    public_slug: '',
    share_enabled: true,
    current_rms_id: '',
    venue_address: '',
    venue_maps_url: '',
    venue_what3words: '',
    venue_access_notes: '',
    loading_bay_notes: '',
  })

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    setLoading(true)

    const { data, error } = await supabase
      .from('Events')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setMessage(`Could not load events: ${error.message}`)
    else setEvents(data || [])

    setLoading(false)
  }

  function updateField(field, value) {
    const next = { ...form, [field]: value }
    if (field === 'show_name' && !form.public_slug) next.public_slug = slugify(value)
    setForm(next)
  }

  async function createEvent(e) {
    e.preventDefault()
    setMessage('')

    if (!form.show_name || !form.public_slug) {
      setMessage('Show name and public slug are required.')
      return
    }

    const { error } = await supabase.from('Events').insert([form])

    if (error) {
      setMessage(`Could not create event: ${error.message}`)
      return
    }

    setForm({
      show_name: '',
      venue: '',
      start_date: '',
      end_date: '',
      project_manager: '',
      public_slug: '',
      share_enabled: true,
      current_rms_id: '',
      venue_address: '',
      venue_maps_url: '',
      venue_what3words: '',
      venue_access_notes: '',
      loading_bay_notes: '',
    })

    setMessage('Event created.')
    loadEvents()
  }

  async function togglePublished(eventRecord) {
    const { error } = await supabase
      .from('Events')
      .update({ share_enabled: !eventRecord.share_enabled })
      .eq('id', eventRecord.id)

    if (error) {
      setMessage(`Could not update event: ${error.message}`)
      return
    }

    loadEvents()
  }

  function copyLink(publicSlug) {
    const url = `${window.location.origin}/${publicSlug}`
    navigator.clipboard.writeText(url)
    setMessage(`Copied: ${url}`)
  }

  return (
    <main className="page">
      <header className="hero">
        <img
  src={pepLogo}
  alt="Premium Event Productions"
  className="pepLogo"
/>
        <div>
          <p className="eyebrow">Premium Event Productions</p>
          <h1>PEP Admin</h1>
        </div>
      </header>

      <section className="eventCard">
        <h2>Create New Crew Sheet</h2>
        <p>Add the event header information. Crew, flights, transfers and hotels are managed from each event.</p>

        <form onSubmit={createEvent} className="adminForm">
          <label>
            Show Name
            <input value={form.show_name} onChange={e => updateField('show_name', e.target.value)} placeholder="EHA Congress 2026" />
          </label>

          <label>
            Venue
            <input value={form.venue} onChange={e => updateField('venue', e.target.value)} placeholder="Bella Center Copenhagen" />
          </label>

          <label>
            Venue Address
            <input value={form.venue_address} onChange={e => updateField('venue_address', e.target.value)} placeholder="Center Blvd. 5, Copenhagen" />
          </label>

          <label>
            Google Maps URL
            <input value={form.venue_maps_url} onChange={e => updateField('venue_maps_url', e.target.value)} placeholder="https://maps.google.com/..." />
          </label>

          <label>
            What3Words
            <input value={form.venue_what3words} onChange={e => updateField('venue_what3words', e.target.value)} placeholder="///filled.count.soap" />
          </label>

          <label>
            Access Notes
            <input value={form.venue_access_notes} onChange={e => updateField('venue_access_notes', e.target.value)} placeholder="Use north entrance / exhibitor access" />
          </label>

          <label>
            Loading Bay Notes
            <input value={form.loading_bay_notes} onChange={e => updateField('loading_bay_notes', e.target.value)} placeholder="Loading bay 3, vehicle pass required" />
          </label>

          <label>
            Start Date
            <input type="date" value={form.start_date} onChange={e => updateField('start_date', e.target.value)} />
          </label>

          <label>
            End Date
            <input type="date" value={form.end_date} onChange={e => updateField('end_date', e.target.value)} />
          </label>

          <label>
            Project Manager
            <input value={form.project_manager} onChange={e => updateField('project_manager', e.target.value)} placeholder="Liam Howard" />
          </label>

          <label>
            Public Slug
            <input value={form.public_slug} onChange={e => updateField('public_slug', e.target.value)} placeholder="eha-2026" />
          </label>

          <label>
            Current RMS ID
            <input value={form.current_rms_id} onChange={e => updateField('current_rms_id', e.target.value)} placeholder="Optional for now" />
          </label>

          <label className="checkboxRow">
            <input type="checkbox" checked={form.share_enabled} onChange={e => updateField('share_enabled', e.target.checked)} />
            Published / share link active
          </label>

          <button className="primaryButton" type="submit">
            <Plus size={18} /> Create Crew Sheet
          </button>
        </form>

        {message && <p className="adminMessage">{message}</p>}
      </section>

      <section className="eventCard">
        <h2>Existing Crew Sheets</h2>

        {loading ? (
          <p>Loading events...</p>
        ) : events.length ? (
          <div className="adminList">
            {events.map(eventRecord => (
              <div className="adminListItem" key={eventRecord.id}>
                <div>
                  <strong>{eventRecord.show_name}</strong>
                  <p>{eventRecord.venue}</p>
                  <small>{formatDate(eventRecord.start_date)} → {formatDate(eventRecord.end_date)}</small>
                  <br />
                  <small>Slug: /{eventRecord.public_slug}</small>
                </div>

                <div className="adminActions">
                  <a href={`/admin/event/${eventRecord.public_slug}`}>
                    <Settings size={16} /> Manage
                  </a>
                  <a href={`/${eventRecord.public_slug}`} target="_blank" rel="noreferrer">Open</a>
                  <button type="button" onClick={() => copyLink(eventRecord.public_slug)}>
                    <Copy size={16} /> Copy Link
                  </button>
                  <button type="button" onClick={() => togglePublished(eventRecord)}>
                    {eventRecord.share_enabled ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No crew sheets created yet." />
        )}
      </section>
    </main>
  )
}

function EventManagerPage() {
  const slug = window.location.pathname.replace('/admin/event/', '')
  const [event, setEvent] = useState(null)
  const [eventLocationForm, setEventLocationForm] = useState({
    venue_address: '',
    venue_maps_url: '',
    venue_what3words: '',
    venue_access_notes: '',
    loading_bay_notes: '',
  })
  const [crew, setCrew] = useState([])
  const [flights, setFlights] = useState([])
  const [hotels, setHotels] = useState([])
  const [transfers, setTransfers] = useState([])
  const [scheduleItems, setScheduleItems] = useState([])
  const [documents, setDocuments] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [globalSearch, setGlobalSearch] = useState('')
  const [editingCrewId, setEditingCrewId] = useState(null)
  const [editingFlightId, setEditingFlightId] = useState(null)
  const [editingHotelId, setEditingHotelId] = useState(null)
  const [editingTransferId, setEditingTransferId] = useState(null)
  const [editingScheduleId, setEditingScheduleId] = useState(null)
  const [editingDocumentId, setEditingDocumentId] = useState(null)

  const [crewForm, setCrewForm] = useState({
    name: '',
    role: '',
    department: '',
    mobile: '',
    email: '',
    hotel: '',
    room_number: '',
    notes: '',
  })

  const [flightForm, setFlightForm] = useState({
    crew_name: '',
    airline: '',
    flight_number: '',
    departure_airport: '',
    arrival_airport: '',
    departure_time: '',
    arrival_time: '',
    booking_reference: '',
    notes: '',
  })

  const [hotelForm, setHotelForm] = useState({
    guest_name: '',
    hotel_name: '',
    address: '',
    maps_url: '',
    what3words: '',
    check_in: '',
    check_out: '',
    room_number: '',
    booking_reference: '',
    hotel_contact: '',
    notes: '',
  })

  const [transferForm, setTransferForm] = useState({
    passenger: '',
    transfer_type: '',
    pickup_location: '',
    pickup_maps_url: '',
    pickup_what3words: '',
    destination: '',
    destination_maps_url: '',
    destination_what3words: '',
    date: '',
    time: '',
    driver_name: '',
    driver_phone: '',
    vehicle: '',
    notes: '',
  })

  const [scheduleForm, setScheduleForm] = useState({
    activity: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    assigned_crew: '',
    notes: '',
  })

  const [documentForm, setDocumentForm] = useState({
    document_name: '',
    category: '',
    file_url: '',
    is_public: true,
    notes: '',
  })

  useEffect(() => {
    loadEventManager()
  }, [slug])

  async function loadEventManager() {
    setLoading(true)

    const { data: eventData, error: eventError } = await supabase
      .from('Events')
      .select('*')
      .eq('public_slug', slug)
      .single()

    if (eventError || !eventData) {
      setMessage('Event not found.')
      setLoading(false)
      return
    }

    setEvent(eventData)
    setEventLocationForm({
      venue_address: eventData.venue_address || '',
      venue_maps_url: eventData.venue_maps_url || '',
      venue_what3words: eventData.venue_what3words || '',
      venue_access_notes: eventData.venue_access_notes || '',
      loading_bay_notes: eventData.loading_bay_notes || '',
    })

    const { data: crewData, error: crewError } = await supabase
      .from('crew')
      .select('*')
      .eq('event_id', eventData.id)
      .order('created_at', { ascending: true })

    if (crewError) setMessage(`Could not load crew: ${crewError.message}`)
    else setCrew(crewData || [])

    const { data: flightData, error: flightError } = await supabase
      .from('flights')
      .select('*')
      .eq('event_id', eventData.id)
      .order('created_at', { ascending: true })

    if (flightError) setMessage(`Could not load flights: ${flightError.message}`)
    else setFlights(flightData || [])

    const { data: hotelData, error: hotelError } = await supabase
      .from('hotels')
      .select('*')
      .eq('event_id', eventData.id)
      .order('created_at', { ascending: true })

    if (hotelError) setMessage(`Could not load hotels: ${hotelError.message}`)
    else setHotels(hotelData || [])

    const { data: transferData, error: transferError } = await supabase
      .from('transfers')
      .select('*')
      .eq('event_id', eventData.id)
      .order('created_at', { ascending: true })

    if (transferError) setMessage(`Could not load transfers: ${transferError.message}`)
    else setTransfers(transferData || [])

    const { data: scheduleData, error: scheduleError } = await supabase
      .from('schedule_items')
      .select('*')
      .eq('event_id', eventData.id)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (scheduleError) setMessage(`Could not load schedule: ${scheduleError.message}`)
    else setScheduleItems(scheduleData || [])

    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .select('*')
      .eq('event_id', eventData.id)
      .order('created_at', { ascending: true })

    if (documentError) setMessage(`Could not load documents: ${documentError.message}`)
    else setDocuments(documentData || [])

    setLoading(false)
  }

  function updateCrewField(field, value) {
    setCrewForm({ ...crewForm, [field]: value })
  }

  function updateFlightField(field, value) {
    setFlightForm({ ...flightForm, [field]: value })
  }

  function updateHotelField(field, value) {
    setHotelForm({ ...hotelForm, [field]: value })
  }

  function updateTransferField(field, value) {
    setTransferForm({ ...transferForm, [field]: value })
  }

  function updateScheduleField(field, value) {
    setScheduleForm({ ...scheduleForm, [field]: value })
  }

  function updateDocumentField(field, value) {
    setDocumentForm({ ...documentForm, [field]: value })
  }

  function updateEventLocationField(field, value) {
    setEventLocationForm({ ...eventLocationForm, [field]: value })
  }

  async function saveEventLocation(e) {
    e.preventDefault()
    setMessage('')

    if (!event) return

    const { error } = await supabase
      .from('Events')
      .update(eventLocationForm)
      .eq('id', event.id)

    if (error) {
      setMessage(`Could not save location details: ${error.message}`)
      return
    }

    setMessage('Location details updated.')
    await loadEventManager()
  }



  function scrollToForm(id) {
    setTimeout(() => {
      const form = document.getElementById(id)
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  function resetFlightForm() {
    setEditingFlightId(null)
    setFlightForm({
      crew_name: '',
      airline: '',
      flight_number: '',
      departure_airport: '',
      arrival_airport: '',
      departure_time: '',
      arrival_time: '',
      booking_reference: '',
      notes: '',
    })
  }

  function startEditFlight(flight) {
    setActiveTab('flights')
    setEditingFlightId(flight.id)
    setFlightForm({
      crew_name: flight.crew_name || '',
      airline: flight.airline || '',
      flight_number: flight.flight_number || '',
      departure_airport: flight.departure_airport || '',
      arrival_airport: flight.arrival_airport || '',
      departure_time: flight.departure_time ? String(flight.departure_time).slice(0, 16) : '',
      arrival_time: flight.arrival_time ? String(flight.arrival_time).slice(0, 16) : '',
      booking_reference: flight.booking_reference || '',
      notes: flight.notes || '',
    })
    scrollToForm('flight-form')
  }

  function resetHotelForm() {
    setEditingHotelId(null)
    setHotelForm({
      guest_name: '',
      hotel_name: '',
      address: '',
      maps_url: '',
      what3words: '',
      check_in: '',
      check_out: '',
      room_number: '',
      booking_reference: '',
      hotel_contact: '',
      notes: '',
    })
  }

  function startEditHotel(hotel) {
    setActiveTab('hotels')
    setEditingHotelId(hotel.id)
    setHotelForm({
      guest_name: hotel.guest_name || '',
      hotel_name: hotel.hotel_name || '',
      address: hotel.address || '',
      maps_url: hotel.maps_url || '',
      what3words: hotel.what3words || '',
      check_in: hotel.check_in || '',
      check_out: hotel.check_out || '',
      room_number: hotel.room_number || '',
      booking_reference: hotel.booking_reference || '',
      hotel_contact: hotel.hotel_contact || '',
      notes: hotel.notes || '',
    })
    scrollToForm('hotel-form')
  }

  function resetTransferForm() {
    setEditingTransferId(null)
    setTransferForm({
      passenger: '',
      transfer_type: '',
      pickup_location: '',
      pickup_maps_url: '',
      pickup_what3words: '',
      destination: '',
      destination_maps_url: '',
      destination_what3words: '',
      date: '',
      time: '',
      driver_name: '',
      driver_phone: '',
      vehicle: '',
      notes: '',
    })
  }

  function startEditTransfer(transfer) {
    setActiveTab('transfers')
    setEditingTransferId(transfer.id)
    setTransferForm({
      passenger: transfer.passenger || transfer.passengers || '',
      transfer_type: transfer.transfer_type || '',
      pickup_location: transfer.pickup_location || '',
      pickup_maps_url: transfer.pickup_maps_url || '',
      pickup_what3words: transfer.pickup_what3words || '',
      destination: transfer.destination || '',
      destination_maps_url: transfer.destination_maps_url || '',
      destination_what3words: transfer.destination_what3words || '',
      date: transfer.date || '',
      time: transfer.time ? String(transfer.time).slice(0, 5) : '',
      driver_name: transfer.driver_name || '',
      driver_phone: transfer.driver_phone || '',
      vehicle: transfer.vehicle || '',
      notes: transfer.notes || '',
    })
    scrollToForm('transfer-form')
  }

  function resetScheduleForm() {
    setEditingScheduleId(null)
    setScheduleForm({
      activity: '',
      date: '',
      start_time: '',
      end_time: '',
      location: '',
      assigned_crew: '',
      notes: '',
    })
  }

  function startEditScheduleItem(item) {
    setActiveTab('schedule')
    setEditingScheduleId(item.id)
    setScheduleForm({
      activity: item.activity || '',
      date: item.date || '',
      start_time: item.start_time ? String(item.start_time).slice(0, 5) : '',
      end_time: item.end_time ? String(item.end_time).slice(0, 5) : '',
      location: item.location || '',
      assigned_crew: item.assigned_crew || '',
      notes: item.notes || '',
    })
    scrollToForm('schedule-form')
  }

  function resetDocumentForm() {
    setEditingDocumentId(null)
    setDocumentForm({
      document_name: '',
      category: '',
      file_url: '',
      is_public: true,
      notes: '',
    })
  }

  function startEditDocument(document) {
    setActiveTab('documents')
    setEditingDocumentId(document.id)
    setDocumentForm({
      document_name: document.document_name || '',
      category: document.category || '',
      file_url: document.file_url || '',
      is_public: document.is_public !== false,
      notes: document.notes || '',
    })
    scrollToForm('document-form')
  }

  function resetCrewForm() {
    setEditingCrewId(null)
    setCrewForm({
      name: '',
      role: '',
      department: '',
      mobile: '',
      email: '',
      hotel: '',
      room_number: '',
      notes: '',
    })
  }

  function startEditCrew(member) {
    setActiveTab('crew')
    setEditingCrewId(member.id)
    setCrewForm({
      name: member.name || '',
      role: member.role || '',
      department: member.department || '',
      mobile: member.mobile || '',
      email: member.email || '',
      hotel: member.hotel || '',
      room_number: member.room_number || '',
      notes: member.notes || '',
    })
    setTimeout(() => {
      const form = document.getElementById('crew-form')
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  async function saveCrewMember(e) {
    e.preventDefault()
    setMessage('')

    if (!event) return
    if (!crewForm.name) {
      setMessage('Crew member name is required.')
      return
    }

    const payload = { ...crewForm, event_id: event.id }

    if (editingCrewId) {
      const { error } = await supabase
        .from('crew')
        .update(payload)
        .eq('id', editingCrewId)

      if (error) {
        setMessage(`Could not save crew member: ${error.message}`)
        return
      }

      resetCrewForm()
      setMessage('Crew member updated.')
      await loadEventManager()
      return
    }

    const { error } = await supabase
      .from('crew')
      .insert([payload])

    if (error) {
      setMessage(`Could not save crew member: ${error.message}`)
      return
    }

    resetCrewForm()
    setMessage('Crew member added.')
    await loadEventManager()
  }

  async function deleteCrewMember(id) {
    const { error } = await supabase.from('crew').delete().eq('id', id)

    if (error) {
      setMessage(`Could not delete crew member: ${error.message}`)
      return
    }

    setMessage('Crew member deleted.')
    loadEventManager()
  }


  async function importCrewFile(e) {
    try {
      const file = e.target.files?.[0]

      if (!file) {
        setMessage('No file selected.')
        return
      }

      if (!event) {
        setMessage('Event has not loaded yet. Please refresh and try again.')
        e.target.value = ''
        return
      }

      console.log('PEP import selected file:', file.name, file.type, file.size)
      setMessage(`Reading file: ${file.name}`)

      const rows = await readImportFile(file, 'Crew Import')
      console.log('PEP import rows found:', rows)

      if (!rows.length) {
        setMessage('No rows found. Make sure the Excel file has a sheet called Crew Import and that the sheet contains a name header.')
        e.target.value = ''
        return
      }

      const crewRows = rows
        .map(row => ({
          event_id: event.id,
          name: row.name || row.crew_name || row.full_name || '',
          role: row.role || row.position || '',
          department: row.department || '',
          mobile: row.mobile || row.phone || row.telephone || '',
          email: row.email || '',
          hotel: row.hotel || '',
          room_number: row.room_number || row.room || '',
          notes: row.notes || '',
        }))
        .filter(row => row.name)

      console.log('PEP import cleaned crew rows:', crewRows)

      if (!crewRows.length) {
        setMessage('Rows were found, but no valid crew names were detected. Check the sheet has a header called name.')
        e.target.value = ''
        return
      }

      setMessage(`Uploading ${crewRows.length} crew members...`)

      const { error } = await supabase
        .from('crew')
        .insert(crewRows)

      if (error) {
        console.error('PEP import Supabase error:', error)
        setMessage(`Could not import crew file: ${error.message}`)
        e.target.value = ''
        return
      }

      setMessage(`${crewRows.length} crew members imported.`)
      e.target.value = ''
      await loadEventManager()
    } catch (error) {
      console.error('PEP import error:', error)
      setMessage(`Import failed: ${error.message}`)
      e.target.value = ''
    }
  }


  function combineDateTime(dateValue, timeValue) {
    if (!dateValue && !timeValue) return null
    if (dateValue && String(dateValue).includes('T')) return String(dateValue)
    if (dateValue && timeValue) return `${dateValue}T${String(timeValue).slice(0, 5)}`
    if (dateValue) return String(dateValue)
    return null
  }

  async function importEventWorkbook(e) {
    try {
      const file = e.target.files?.[0]

      if (!file) {
        setMessage('No file selected.')
        return
      }

      if (!event) {
        setMessage('Event has not loaded yet. Please refresh and try again.')
        e.target.value = ''
        return
      }

      setMessage(`Reading event workbook: ${file.name}`)

      const [
        crewRowsRaw,
        flightRowsRaw,
        hotelRowsRaw,
        transferRowsRaw,
        scheduleRowsRaw,
        documentRowsRaw,
      ] = await Promise.all([
        readImportFile(file, 'Crew'),
        readImportFile(file, 'Flights'),
        readImportFile(file, 'Hotels'),
        readImportFile(file, 'Transfers'),
        readImportFile(file, 'Schedule'),
        readImportFile(file, 'Documents'),
      ])

      const crewRows = crewRowsRaw
        .map(row => ({
          event_id: event.id,
          name: row.name || row.crew_name || row.full_name || '',
          role: row.role || row.position || '',
          department: row.department || '',
          mobile: row.mobile || row.phone || row.telephone || '',
          email: row.email || '',
          hotel: row.hotel || '',
          room_number: row.room_number || row.room || '',
          notes: row.notes || '',
        }))
        .filter(row => row.name)

      const flightRows = flightRowsRaw
        .map(row => ({
          event_id: event.id,
          crew_name: row.crew_name || row.name || row.passenger || '',
          airline: row.airline || '',
          flight_number: row.flight_number || row.flight || '',
          departure_airport: row.departure_airport || row.from || '',
          arrival_airport: row.arrival_airport || row.to || '',
          departure_time: combineDateTime(row.departure_date, row.departure_time) || row.departure_datetime || null,
          arrival_time: combineDateTime(row.arrival_date, row.arrival_time) || row.arrival_datetime || null,
          booking_reference: row.booking_reference || row.reference || '',
          notes: row.notes || '',
        }))
        .filter(row => row.crew_name)

      const hotelRows = hotelRowsRaw
        .map(row => ({
          event_id: event.id,
          guest_name: row.guest_name || row.name || row.crew_name || '',
          hotel_name: row.hotel_name || row.hotel || '',
          address: row.address || '',
          maps_url: row.maps_url || row.google_maps_url || row.hotel_maps_url || '',
          what3words: row.what3words || row.w3w || row.hotel_what3words || '',
          check_in: row.check_in || row.check_in_date || null,
          check_out: row.check_out || row.check_out_date || null,
          room_number: row.room_number || row.room || '',
          booking_reference: row.booking_reference || row.reference || '',
          hotel_contact: row.hotel_contact || row.contact || '',
          notes: row.notes || '',
        }))
        .filter(row => row.guest_name)

      const transferRows = transferRowsRaw
        .map(row => ({
          event_id: event.id,
          passenger: row.passenger || row.name || row.crew_name || '',
          transfer_type: row.transfer_type || row.type || '',
          pickup_location: row.pickup_location || row.pickup || '',
          pickup_maps_url: row.pickup_maps_url || row.pickup_google_maps_url || row.pickup_map || '',
          pickup_what3words: row.pickup_what3words || row.pickup_w3w || '',
          destination: row.destination || row.dropoff || row.drop_off || '',
          destination_maps_url: row.destination_maps_url || row.destination_google_maps_url || row.destination_map || '',
          destination_what3words: row.destination_what3words || row.destination_w3w || '',
          date: row.date || row.transfer_date || null,
          time: row.time || row.transfer_time || null,
          driver_name: row.driver_name || row.driver || '',
          driver_phone: row.driver_phone || row.driver_mobile || row.phone || '',
          vehicle: row.vehicle || '',
          notes: row.notes || '',
        }))
        .filter(row => row.passenger)

      const scheduleRows = scheduleRowsRaw
        .map(row => ({
          event_id: event.id,
          activity: row.activity || row.title || '',
          date: row.date || row.schedule_date || null,
          start_time: row.start_time || '',
          end_time: row.end_time || '',
          location: row.location || '',
          assigned_crew: row.assigned_crew || row.crew || '',
          notes: row.notes || '',
        }))
        .filter(row => row.activity)

      const documentRows = documentRowsRaw
        .map(row => ({
          event_id: event.id,
          document_name: row.document_name || row.name || row.title || '',
          category: row.category || '',
          file_url: row.file_url || row.url || row.link || '',
          is_public: normaliseBoolean(row.is_public || row.visible_on_public_sheet || row.public || row.visible, true),
          notes: row.notes || '',
        }))
        .filter(row => row.document_name)

      const counts = {
        crew: crewRows.length,
        flights: flightRows.length,
        hotels: hotelRows.length,
        transfers: transferRows.length,
        schedule: scheduleRows.length,
        documents: documentRows.length,
      }

      if (!Object.values(counts).some(Boolean)) {
        setMessage('No importable rows found. Check the workbook sheet names and headers.')
        e.target.value = ''
        return
      }

      setMessage(`Importing workbook: ${counts.crew} crew, ${counts.flights} flights, ${counts.hotels} hotels, ${counts.transfers} transfers, ${counts.schedule} schedule, ${counts.documents} documents...`)

      const operations = []

      if (crewRows.length) operations.push(supabase.from('crew').insert(crewRows))
      if (flightRows.length) operations.push(supabase.from('flights').insert(flightRows))
      if (hotelRows.length) operations.push(supabase.from('hotels').insert(hotelRows))
      if (transferRows.length) operations.push(supabase.from('transfers').insert(transferRows))
      if (scheduleRows.length) operations.push(supabase.from('schedule_items').insert(scheduleRows))
      if (documentRows.length) operations.push(supabase.from('documents').insert(documentRows))

      const results = await Promise.all(operations)
      const failed = results.find(result => result.error)

      if (failed?.error) {
        setMessage(`Workbook import failed: ${failed.error.message}`)
        e.target.value = ''
        return
      }

      setMessage(`Workbook imported: ${counts.crew} crew, ${counts.flights} flights, ${counts.hotels} hotels, ${counts.transfers} transfers, ${counts.schedule} schedule, ${counts.documents} documents.`)
      e.target.value = ''
      await loadEventManager()
    } catch (error) {
      console.error('PEP workbook import error:', error)
      setMessage(`Workbook import failed: ${error.message}`)
      e.target.value = ''
    }
  }


  async function importFlightsFile(e) {
    try {
      const file = e.target.files?.[0]
      if (!file || !event) return
      setMessage(`Reading flights file: ${file.name}`)
      const rows = await readImportFile(file, 'Flights')

      const flightRows = rows
        .map(row => ({
          event_id: event.id,
          crew_name: row.crew_name || row.name || row.passenger || '',
          airline: row.airline || '',
          flight_number: row.flight_number || row.flight || '',
          departure_airport: row.departure_airport || row.from || '',
          arrival_airport: row.arrival_airport || row.to || '',
          departure_time: combineDateTime(row.departure_date, row.departure_time) || row.departure_datetime || null,
          arrival_time: combineDateTime(row.arrival_date, row.arrival_time) || row.arrival_datetime || null,
          booking_reference: row.booking_reference || row.reference || '',
          notes: row.notes || '',
        }))
        .filter(row => row.crew_name)

      if (!flightRows.length) {
        setMessage('No valid flight rows found. The file must include crew_name or name.')
        e.target.value = ''
        return
      }

      const { error } = await supabase.from('flights').insert(flightRows)

      if (error) {
        setMessage(`Could not import flights: ${error.message}`)
        e.target.value = ''
        return
      }

      setMessage(`${flightRows.length} flights imported.`)
      e.target.value = ''
      await loadEventManager()
    } catch (error) {
      console.error('PEP flights import error:', error)
      setMessage(`Flights import failed: ${error.message}`)
      e.target.value = ''
    }
  }

  async function importHotelsFile(e) {
    try {
      const file = e.target.files?.[0]
      if (!file || !event) return
      setMessage(`Reading hotels file: ${file.name}`)
      const rows = await readImportFile(file, 'Hotels')

      const hotelRows = rows
        .map(row => ({
          event_id: event.id,
          guest_name: row.guest_name || row.name || row.crew_name || '',
          hotel_name: row.hotel_name || row.hotel || '',
          address: row.address || '',
          maps_url: row.maps_url || row.google_maps_url || row.hotel_maps_url || '',
          what3words: row.what3words || row.w3w || row.hotel_what3words || '',
          check_in: row.check_in || row.check_in_date || null,
          check_out: row.check_out || row.check_out_date || null,
          room_number: row.room_number || row.room || '',
          booking_reference: row.booking_reference || row.reference || '',
          hotel_contact: row.hotel_contact || row.contact || '',
          notes: row.notes || '',
        }))
        .filter(row => row.guest_name)

      if (!hotelRows.length) {
        setMessage('No valid hotel rows found. The file must include guest_name or name.')
        e.target.value = ''
        return
      }

      const { error } = await supabase.from('hotels').insert(hotelRows)

      if (error) {
        setMessage(`Could not import hotels: ${error.message}`)
        e.target.value = ''
        return
      }

      setMessage(`${hotelRows.length} hotel bookings imported.`)
      e.target.value = ''
      await loadEventManager()
    } catch (error) {
      console.error('PEP hotels import error:', error)
      setMessage(`Hotels import failed: ${error.message}`)
      e.target.value = ''
    }
  }

  async function importTransfersFile(e) {
    try {
      const file = e.target.files?.[0]
      if (!file || !event) return
      setMessage(`Reading transfers file: ${file.name}`)
      const rows = await readImportFile(file, 'Transfers')

      const transferRows = rows
        .map(row => ({
          event_id: event.id,
          passenger: row.passenger || row.name || row.crew_name || '',
          transfer_type: row.transfer_type || row.type || '',
          pickup_location: row.pickup_location || row.pickup || '',
          pickup_maps_url: row.pickup_maps_url || row.pickup_google_maps_url || row.pickup_map || '',
          pickup_what3words: row.pickup_what3words || row.pickup_w3w || '',
          destination: row.destination || row.dropoff || row.drop_off || '',
          destination_maps_url: row.destination_maps_url || row.destination_google_maps_url || row.destination_map || '',
          destination_what3words: row.destination_what3words || row.destination_w3w || '',
          date: row.date || row.transfer_date || null,
          time: row.time || row.transfer_time || null,
          driver_name: row.driver_name || row.driver || '',
          driver_phone: row.driver_phone || row.driver_mobile || row.phone || '',
          vehicle: row.vehicle || '',
          notes: row.notes || '',
        }))
        .filter(row => row.passenger)

      if (!transferRows.length) {
        setMessage('No valid transfer rows found. The file must include passenger or name.')
        e.target.value = ''
        return
      }

      const { error } = await supabase.from('transfers').insert(transferRows)

      if (error) {
        setMessage(`Could not import transfers: ${error.message}`)
        e.target.value = ''
        return
      }

      setMessage(`${transferRows.length} transfers imported.`)
      e.target.value = ''
      await loadEventManager()
    } catch (error) {
      console.error('PEP transfers import error:', error)
      setMessage(`Transfers import failed: ${error.message}`)
      e.target.value = ''
    }
  }

  async function importScheduleFile(e) {
    try {
      const file = e.target.files?.[0]
      if (!file || !event) return
      setMessage(`Reading schedule file: ${file.name}`)
      const rows = await readImportFile(file, 'Schedule')

      const scheduleRows = rows
        .map(row => ({
          event_id: event.id,
          activity: row.activity || row.title || '',
          date: row.date || row.schedule_date || null,
          start_time: row.start_time || '',
          end_time: row.end_time || '',
          location: row.location || '',
          assigned_crew: row.assigned_crew || row.crew || '',
          notes: row.notes || '',
        }))
        .filter(row => row.activity)

      if (!scheduleRows.length) {
        setMessage('No valid schedule rows found. The file must include activity.')
        e.target.value = ''
        return
      }

      const { error } = await supabase.from('schedule_items').insert(scheduleRows)

      if (error) {
        setMessage(`Could not import schedule: ${error.message}`)
        e.target.value = ''
        return
      }

      setMessage(`${scheduleRows.length} schedule items imported.`)
      e.target.value = ''
      await loadEventManager()
    } catch (error) {
      console.error('PEP schedule import error:', error)
      setMessage(`Schedule import failed: ${error.message}`)
      e.target.value = ''
    }
  }

  async function importDocumentsFile(e) {
    try {
      const file = e.target.files?.[0]
      if (!file || !event) return
      setMessage(`Reading documents file: ${file.name}`)
      const rows = await readImportFile(file, 'Documents')

      const documentRows = rows
        .map(row => ({
          event_id: event.id,
          document_name: row.document_name || row.name || row.title || '',
          category: row.category || '',
          file_url: row.file_url || row.url || row.link || '',
          is_public: normaliseBoolean(row.is_public || row.visible_on_public_sheet || row.public || row.visible, true),
          notes: row.notes || '',
        }))
        .filter(row => row.document_name)

      if (!documentRows.length) {
        setMessage('No valid document rows found. The file must include document_name or name.')
        e.target.value = ''
        return
      }

      const { error } = await supabase.from('documents').insert(documentRows)

      if (error) {
        setMessage(`Could not import documents: ${error.message}`)
        e.target.value = ''
        return
      }

      setMessage(`${documentRows.length} documents imported.`)
      e.target.value = ''
      await loadEventManager()
    } catch (error) {
      console.error('PEP documents import error:', error)
      setMessage(`Documents import failed: ${error.message}`)
      e.target.value = ''
    }
  }

  async function saveFlight(e) {
    e.preventDefault()
    setMessage('')

    if (!event) return
    if (!flightForm.crew_name) {
      setMessage('Select a crew member for this flight.')
      return
    }

    const cleanFlight = {
      ...flightForm,
      event_id: event.id,
      arrival_time: flightForm.arrival_time || null,
      departure_time: flightForm.departure_time || null,
    }

    const { error } = editingFlightId
      ? await supabase.from('flights').update(cleanFlight).eq('id', editingFlightId)
      : await supabase.from('flights').insert([cleanFlight])

    if (error) {
      setMessage(`Could not save flight: ${error.message}`)
      return
    }

    resetFlightForm()
    setMessage(editingFlightId ? 'Flight updated.' : 'Flight added.')
    await loadEventManager()
  }

  async function deleteFlight(id) {
    const { error } = await supabase.from('flights').delete().eq('id', id)

    if (error) {
      setMessage(`Could not delete flight: ${error.message}`)
      return
    }

    setMessage('Flight deleted.')
    loadEventManager()
  }

  async function saveHotel(e) {
    e.preventDefault()
    setMessage('')

    if (!event) return
    if (!hotelForm.guest_name) {
      setMessage('Select a guest for this hotel booking.')
      return
    }

    const cleanHotel = {
      ...hotelForm,
      event_id: event.id,
      check_in: hotelForm.check_in || null,
      check_out: hotelForm.check_out || null,
    }

    const { error } = editingHotelId
      ? await supabase.from('hotels').update(cleanHotel).eq('id', editingHotelId)
      : await supabase.from('hotels').insert([cleanHotel])

    if (error) {
      setMessage(`Could not save hotel: ${error.message}`)
      return
    }

    resetHotelForm()
    setMessage(editingHotelId ? 'Hotel booking updated.' : 'Hotel booking added.')
    await loadEventManager()
  }

  async function deleteHotel(id) {
    const { error } = await supabase.from('hotels').delete().eq('id', id)

    if (error) {
      setMessage(`Could not delete hotel booking: ${error.message}`)
      return
    }

    setMessage('Hotel booking deleted.')
    loadEventManager()
  }

  async function saveTransfer(e) {
    e.preventDefault()
    setMessage('')

    if (!event) return
    if (!transferForm.passenger) {
      setMessage('Select a passenger for this transfer.')
      return
    }

    const cleanTransfer = {
      ...transferForm,
      event_id: event.id,
      date: transferForm.date || null,
      time: transferForm.time || null,
    }

    const { error } = editingTransferId
      ? await supabase.from('transfers').update(cleanTransfer).eq('id', editingTransferId)
      : await supabase.from('transfers').insert([cleanTransfer])

    if (error) {
      setMessage(`Could not save transfer: ${error.message}`)
      return
    }

    resetTransferForm()
    setMessage(editingTransferId ? 'Transfer updated.' : 'Transfer added.')
    await loadEventManager()
  }

  async function deleteTransfer(id) {
    const { error } = await supabase.from('transfers').delete().eq('id', id)

    if (error) {
      setMessage(`Could not delete transfer: ${error.message}`)
      return
    }

    setMessage('Transfer deleted.')
    loadEventManager()
  }

  async function saveScheduleItem(e) {
    e.preventDefault()
    setMessage('')

    if (!event) return
    if (!scheduleForm.activity) {
      setMessage('Schedule activity is required.')
      return
    }

    const cleanScheduleItem = {
      ...scheduleForm,
      event_id: event.id,
      date: scheduleForm.date || null,
      start_time: scheduleForm.start_time || null,
      end_time: scheduleForm.end_time || null,
    }

    const { error } = editingScheduleId
      ? await supabase.from('schedule_items').update(cleanScheduleItem).eq('id', editingScheduleId)
      : await supabase.from('schedule_items').insert([cleanScheduleItem])

    if (error) {
      setMessage(`Could not save schedule item: ${error.message}`)
      return
    }

    resetScheduleForm()
    setMessage(editingScheduleId ? 'Schedule item updated.' : 'Schedule item added.')
    await loadEventManager()
  }

  async function deleteScheduleItem(id) {
    const { error } = await supabase.from('schedule_items').delete().eq('id', id)

    if (error) {
      setMessage(`Could not delete schedule item: ${error.message}`)
      return
    }

    setMessage('Schedule item deleted.')
    loadEventManager()
  }


  function makeSafeFileName(name) {
    return String(name || 'document')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  async function uploadDocumentFile(e) {
    try {
      const file = e.target.files?.[0]

      if (!file) {
        setMessage('No file selected.')
        return
      }

      if (!event) {
        setMessage('Event has not loaded yet. Please refresh and try again.')
        e.target.value = ''
        return
      }

      setMessage(`Uploading ${file.name}...`)

      const safeFileName = makeSafeFileName(file.name)
      const storagePath = `${event.id}/${Date.now()}-${safeFileName}`

      const { error: uploadError } = await supabase.storage
        .from('event-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        setMessage(`Could not upload file: ${uploadError.message}`)
        e.target.value = ''
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('event-documents')
        .getPublicUrl(storagePath)

      const publicUrl = publicUrlData?.publicUrl || ''

      const { error: insertError } = await supabase
        .from('documents')
        .insert([{
          event_id: event.id,
          document_name: file.name.replace(/\.[^/.]+$/, ''),
          category: 'Uploaded File',
          file_url: publicUrl,
          storage_path: storagePath,
          file_name: file.name,
          file_type: file.type || '',
          file_size: file.size || 0,
          is_public: true,
          notes: '',
        }])

      if (insertError) {
        setMessage(`File uploaded, but document record could not be saved: ${insertError.message}`)
        e.target.value = ''
        return
      }

      setMessage(`${file.name} uploaded.`)
      e.target.value = ''
      await loadEventManager()
    } catch (error) {
      console.error('PEP file upload error:', error)
      setMessage(`File upload failed: ${error.message}`)
      e.target.value = ''
    }
  }

  async function saveDocument(e) {
    e.preventDefault()
    setMessage('')

    if (!event) return
    if (!documentForm.document_name) {
      setMessage('Document name is required.')
      return
    }

    const cleanDocument = { ...documentForm, event_id: event.id }

    const { error } = editingDocumentId
      ? await supabase.from('documents').update(cleanDocument).eq('id', editingDocumentId)
      : await supabase.from('documents').insert([cleanDocument])

    if (error) {
      setMessage(`Could not save document: ${error.message}`)
      return
    }

    resetDocumentForm()
    setMessage(editingDocumentId ? 'Document updated.' : 'Document added.')
    await loadEventManager()
  }

  async function deleteDocument(id) {
    const documentToDelete = documents.find(document => document.id === id)

    if (documentToDelete?.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('event-documents')
        .remove([documentToDelete.storage_path])

      if (storageError) {
        setMessage(`Could not delete stored file: ${storageError.message}`)
        return
      }
    }

    const { error } = await supabase.from('documents').delete().eq('id', id)

    if (error) {
      setMessage(`Could not delete document: ${error.message}`)
      return
    }

    setMessage('Document deleted.')
    loadEventManager()
  }

  async function toggleDocumentVisibility(document) {
    setMessage('')

    const nextVisibility = document.is_public === false

    const { error } = await supabase
      .from('documents')
      .update({ is_public: nextVisibility })
      .eq('id', document.id)

    if (error) {
      setMessage(`Could not update document visibility: ${error.message}`)
      return
    }

    setMessage(nextVisibility ? 'Document is now visible publicly.' : 'Document is now admin only.')
    await loadEventManager()
  }



  const crewNamesWithFlights = new Set(flights.map(flight => flight.crew_name).filter(Boolean))
  const crewNamesWithHotels = new Set(hotels.map(hotel => hotel.guest_name).filter(Boolean))
  const crewNamesWithTransfers = new Set(transfers.map(transfer => transfer.passenger || transfer.passengers).filter(Boolean))

  const missingFlights = crew.filter(member => !crewNamesWithFlights.has(member.name))
  const missingHotels = crew.filter(member => !crewNamesWithHotels.has(member.name))
  const missingTransfers = crew.filter(member => !crewNamesWithTransfers.has(member.name))

  const readinessChecks = [
    ...crew.map(member => ({
      type: 'Flight',
      name: member.name,
      issue: 'No flight assigned',
      complete: crewNamesWithFlights.has(member.name),
    })),
    ...crew.map(member => ({
      type: 'Hotel',
      name: member.name,
      issue: 'No hotel assigned',
      complete: crewNamesWithHotels.has(member.name),
    })),
    ...crew.map(member => ({
      type: 'Transfer',
      name: member.name,
      issue: 'No transfer assigned',
      complete: crewNamesWithTransfers.has(member.name),
    })),
  ]

  const completedChecks = readinessChecks.filter(check => check.complete).length
  const readinessScore = readinessChecks.length
    ? Math.round((completedChecks / readinessChecks.length) * 100)
    : 100

  function getStatusColour(score) {
    if (score === 100) return '#16a34a'
    if (score >= 70) return '#f97316'
    return '#dc2626'
  }

  function getStatusClass(score) {
    if (score === 100) return 'statusGreen'
    if (score >= 70) return 'statusOrange'
    return 'statusRed'
  }

  const readinessStatus = readinessScore === 100
    ? 'Complete'
    : readinessScore >= 70
      ? 'Needs attention'
      : 'High risk'

  const flightCompletion = crew.length ? Math.round((crewNamesWithFlights.size / crew.length) * 100) : 100
  const hotelCompletion = crew.length ? Math.round((crewNamesWithHotels.size / crew.length) * 100) : 100
  const transferCompletion = crew.length ? Math.round((crewNamesWithTransfers.size / crew.length) * 100) : 100

  const searchText = globalSearch.toLowerCase().trim()

  function matchesSearch(item) {
    if (!searchText) return true
    return Object.values(item || {})
      .join(' ')
      .toLowerCase()
      .includes(searchText)
  }

  const filteredCrew = crew.filter(matchesSearch)
  const filteredFlights = flights.filter(matchesSearch)
  const filteredHotels = hotels.filter(matchesSearch)
  const filteredTransfers = transfers.filter(matchesSearch)
  const filteredScheduleItems = scheduleItems.filter(matchesSearch)
  const filteredDocuments = documents.filter(matchesSearch)
  const documentCategories = Array.from(new Set(documents.map(document => document.category || 'Uncategorised'))).sort()

  if (loading) return <main className="page"><p>Loading event manager...</p></main>

  if (!event) {
    return (
      <main className="page">
        <p>{message || 'Event not found.'}</p>
        <a href="/admin">Back to Admin</a>
      </main>
    )
  }

  return (
    <main className="page">
      <section className="eventCard managerHeaderCard">
        <div className="managerHeaderTop">
          <img
            src={pepLogo}
            alt="Premium Event Productions"
            className="managerLogo"
          />

          <div className="managerTitle">
            <a href="/admin" className="backLink"><ArrowLeft size={16} /> Back to Admin</a>
            <h1>{event.show_name}</h1>
            <p>{formatDate(event.start_date)} - {formatDate(event.end_date)} • {event.venue}</p>
            {event.venue_address && <small>{event.venue_address}</small>}
            <small>Project Manager: {event.project_manager || 'Not set'}</small>
            <div className="locationButtonRow">
              {event.venue_maps_url && <a href={event.venue_maps_url} target="_blank" rel="noreferrer" className="locationButton">📍 Open Maps</a>}
              {event.venue_what3words && <a href={`https://what3words.com/${String(event.venue_what3words).replace(/^\/\/\//, '')}`} target="_blank" rel="noreferrer" className="locationButton">/// What3Words</a>}
            </div>
          </div>

          <div className="adminActions managerTopActions">
            <a href={`/${event.public_slug}`} target="_blank" rel="noreferrer">Open Public Sheet</a>
          </div>
        </div>
      </section>

      <section className="eventCard compactControlCard">
        <div className="statsGrid">
          <div>
            <strong>{crew.length}</strong>
            <span>Crew</span>
          </div>
          <div className={getStatusClass(flightCompletion)}>
            <strong>{flights.length}</strong>
            <span>Flights</span>
            <small>{flightCompletion}% complete</small>
          </div>
          <div className={getStatusClass(hotelCompletion)}>
            <strong>{hotels.length}</strong>
            <span>Hotels</span>
            <small>{hotelCompletion}% complete</small>
          </div>
          <div className={getStatusClass(transferCompletion)}>
            <strong>{transfers.length}</strong>
            <span>Transfers</span>
            <small>{transferCompletion}% complete</small>
          </div>
          <div>
            <strong>{scheduleItems.length}</strong>
            <span>Schedule</span>
          </div>
          <div>
            <strong>{documents.length}</strong>
            <span>Documents</span>
          </div>
        </div>

        <div className="globalSearchBox">
          <label>
            Global Search
            <input
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Search crew, flights, hotels, transfers, schedule or documents..."
            />
          </label>

          {globalSearch && (
            <button type="button" onClick={() => setGlobalSearch('')}>
              Clear
            </button>
          )}
        </div>

        <div className="tabs">
          {[
            ['overview', 'Overview'],
            ['crew', 'Crew'],
            ['flights', 'Flights'],
            ['hotels', 'Hotels'],
            ['transfers', 'Transfers'],
            ['schedule', 'Schedule'],
            ['documents', 'Documents'],
            ['import', 'Import Workbook'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`${activeTab === key ? 'active' : ''} ${key === 'import' ? 'importTabButton' : ''}`.trim()}
              onClick={() => setActiveTab(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'overview' && (
        <>
          <section className={`eventCard dashboardHero modernReadiness ${getStatusClass(readinessScore)}`}>
            <div>
              <p className="eyebrowDark">Event Readiness</p>
              <h2>{readinessScore}%</h2>
              <p>{readinessStatus}</p>
            </div>

            <div className="readinessBar">
              <span style={{ width: `${readinessScore}%`, background: getStatusColour(readinessScore) }}></span>
            </div>

            <div className="dashboardSummary">
              <div className={getStatusClass(flightCompletion)}>
                <strong>{flightCompletion}%</strong>
                <span>Flights Complete</span>
                <small>{crewNamesWithFlights.size}/{crew.length} crew booked</small>
              </div>
              <div className={getStatusClass(hotelCompletion)}>
                <strong>{hotelCompletion}%</strong>
                <span>Hotels Complete</span>
                <small>{crewNamesWithHotels.size}/{crew.length} crew booked</small>
              </div>
              <div className={getStatusClass(transferCompletion)}>
                <strong>{transferCompletion}%</strong>
                <span>Transfers Complete</span>
                <small>{crewNamesWithTransfers.size}/{crew.length} crew booked</small>
              </div>
            </div>
          </section>

          <section className="eventCard">
            <h2>Overview</h2>
            <p>This is the admin overview for this PEP crew sheet.</p>
            <div className="overviewGrid">
              <div><strong>Public Link</strong><a href={`/${event.public_slug}`} target="_blank" rel="noreferrer">/{event.public_slug}</a></div>
              <div><strong>Current RMS ID</strong><span>{event.current_rms_id || 'Not linked yet'}</span></div>
              <div><strong>Project Manager</strong><span>{event.project_manager || 'Not set'}</span></div>
              <div><strong>Venue</strong><span>{event.venue || 'Not set'}</span></div>
            </div>
          </section>

          <section className="eventCard">
            <h2>Venue Location</h2>
            <p>Add map links and access notes for the venue. These appear on the public call sheet and crew personal view.</p>

            <form onSubmit={saveEventLocation} className="adminForm">
              <label>
                Venue Address
                <input value={eventLocationForm.venue_address} onChange={e => updateEventLocationField('venue_address', e.target.value)} placeholder="Center Blvd. 5, Copenhagen" />
              </label>

              <label>
                Google Maps URL
                <input value={eventLocationForm.venue_maps_url} onChange={e => updateEventLocationField('venue_maps_url', e.target.value)} placeholder="https://maps.google.com/..." />
              </label>

              <label>
                What3Words
                <input value={eventLocationForm.venue_what3words} onChange={e => updateEventLocationField('venue_what3words', e.target.value)} placeholder="///filled.count.soap" />
              </label>

              <label>
                Access Notes
                <input value={eventLocationForm.venue_access_notes} onChange={e => updateEventLocationField('venue_access_notes', e.target.value)} placeholder="Use north entrance / exhibitor access" />
              </label>

              <label>
                Loading Bay Notes
                <input value={eventLocationForm.loading_bay_notes} onChange={e => updateEventLocationField('loading_bay_notes', e.target.value)} placeholder="Loading bay 3, vehicle pass required" />
              </label>

              <button className="primaryButton" type="submit">Save Location Details</button>
            </form>
          </section>

          <section className="eventCard">
            <h2>Missing Information</h2>
            <p>These are the crew records that still need travel, accommodation or transfer details.</p>

            <div className="missingGrid">
              {missingFlights.length > 0 && (
                <div className="statusRed">
                  <h3>Missing Flights</h3>
                  {missingFlights.map(member => <p key={member.id}>⚠ {member.name}</p>)}
                </div>
              )}

              {missingHotels.length > 0 && (
                <div className="statusRed">
                  <h3>Missing Hotels</h3>
                  {missingHotels.map(member => <p key={member.id}>⚠ {member.name}</p>)}
                </div>
              )}

              {missingTransfers.length > 0 && (
                <div className="statusRed">
                  <h3>Missing Transfers</h3>
                  {missingTransfers.map(member => <p key={member.id}>⚠ {member.name}</p>)}
                </div>
              )}

              {missingFlights.length === 0 && missingHotels.length === 0 && missingTransfers.length === 0 && (
                <div className="statusGreen completeInfoCard">
                  <h3>All Information Complete</h3>
                  <p>All crew have flights, hotels and transfers assigned.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === 'import' && (
        <section className="eventCard importCard workbookImportCard">
          <h2>Import Event Workbook</h2>
          <p>Upload one PEP Excel workbook to import crew, flights, hotels, transfers, schedule items and documents in one go.</p>

          <div className="csvTemplateBox">
            <strong>Workbook sheets supported:</strong>
            <code>Crew, Flights, Hotels, Transfers, Schedule, Documents</code>
          </div>

          <label className="fileUploadBox">
            Upload Event Workbook
            <input type="file" accept=".xlsx,.xls" onChange={importEventWorkbook} />
          </label>

          {message && <p className="adminMessage">{message}</p>}
        </section>
      )}

      {activeTab === 'crew' && (
      <>
      <section className="eventCard importCard">
        <h2>Import Crew Excel</h2>
        <p>Upload the PEP Excel template to add multiple crew members at once. CSV files are still supported.</p>

        <div className="csvTemplateBox">
          <strong>Accepted file:</strong>
          <code>.xlsx template using the Crew Import sheet, or .csv with name,role,department,mobile,email,hotel,room_number,notes</code>
        </div>

        <label className="fileUploadBox">
          Upload Crew Excel
          <input type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={importCrewFile} />
        </label>
      </section>

      <section className="eventCard" id="crew-form">
        <h2>{editingCrewId ? 'Edit Crew Member' : 'Add Crew Member'}</h2>
        {editingCrewId && <p className="editNotice">Editing: {crewForm.name}</p>}

        <form onSubmit={saveCrewMember} className="adminForm">
          <label>
            Name
            <input value={crewForm.name} onChange={e => updateCrewField('name', e.target.value)} placeholder="Liam Howard" />
          </label>

          <label>
            Role
            <input value={crewForm.role} onChange={e => updateCrewField('role', e.target.value)} placeholder="Project Manager" />
          </label>

          <label>
            Department
            <input value={crewForm.department} onChange={e => updateCrewField('department', e.target.value)} placeholder="Production" />
          </label>

          <label>
            Mobile
            <input value={crewForm.mobile} onChange={e => updateCrewField('mobile', e.target.value)} placeholder="+44..." />
          </label>

          <label>
            Email
            <input value={crewForm.email} onChange={e => updateCrewField('email', e.target.value)} placeholder="name@pepled.com" />
          </label>

          <label>
            Hotel
            <input value={crewForm.hotel} onChange={e => updateCrewField('hotel', e.target.value)} placeholder="Hilton ExCeL" />
          </label>

          <label>
            Room Number
            <input value={crewForm.room_number} onChange={e => updateCrewField('room_number', e.target.value)} placeholder="401" />
          </label>

          <label>
            Notes
            <input value={crewForm.notes} onChange={e => updateCrewField('notes', e.target.value)} placeholder="Optional" />
          </label>

          <button className="primaryButton" type="submit">
            <Plus size={18} /> {editingCrewId ? 'Update Crew Member' : 'Add Crew Member'}
          </button>

          {editingCrewId && (
            <button className="secondaryButton" type="button" onClick={resetCrewForm}>
              Cancel Edit
            </button>
          )}
        </form>

        {message && <p className="adminMessage">{message}</p>}
      </section>

      <section className="eventCard">
        <h2>Crew Members</h2>

        {crew.length ? (
          <div className="adminList">
            {filteredCrew.map(member => (
              <div className="adminListItem" key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <p>{member.role} {member.department && `| ${member.department}`}</p>
                  <small>{member.mobile} {member.email && `| ${member.email}`}</small>
                  <br />
                  <small>{member.hotel} {member.room_number && `Room ${member.room_number}`}</small>
                  {member.notes && <p>{member.notes}</p>}
                </div>

                <div className="adminActions">
                  <button type="button" onClick={() => startEditCrew(member)}>Edit</button>
                  <button type="button" onClick={() => deleteCrewMember(member.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No crew added yet." />
        )}
      </section>

      </>
      )}

      {activeTab === 'flights' && (
      <>
      <section className="eventCard importCard">
        <h2>Import Flights Excel</h2>
        <p>Upload a flights sheet to add multiple flight records at once.</p>

        <div className="csvTemplateBox">
          <strong>Accepted file:</strong>
          <code>.xlsx sheet named Flights, or .csv with crew_name,airline,flight_number,departure_airport,arrival_airport,departure_date,departure_time,arrival_date,arrival_time,booking_reference,notes</code>
        </div>

        <label className="fileUploadBox">
          Upload Flights Excel
          <input type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={importFlightsFile} />
        </label>
      </section>

      <section className="eventCard" id="flight-form">
        <h2>{editingFlightId ? 'Edit Flight' : 'Add Flight'}</h2>
        {editingFlightId && <p className="editNotice">Editing: {flightForm.crew_name} {flightForm.flight_number && `- ${flightForm.flight_number}`}</p>}
        <p>Assign each flight to an existing crew member.</p>

        <form onSubmit={saveFlight} className="adminForm">
          <label>
            Crew Member
            <select value={flightForm.crew_name} onChange={e => updateFlightField('crew_name', e.target.value)}>
              <option value="">Select crew member</option>
              {crew.map(member => (
                <option key={member.id} value={member.name}>{member.name}</option>
              ))}
            </select>
          </label>

          <label>
            Airline
            <input value={flightForm.airline} onChange={e => updateFlightField('airline', e.target.value)} placeholder="British Airways" />
          </label>

          <label>
            Flight Number
            <input value={flightForm.flight_number} onChange={e => updateFlightField('flight_number', e.target.value)} placeholder="BA812" />
          </label>

          <label>
            Departure Airport
            <input value={flightForm.departure_airport} onChange={e => updateFlightField('departure_airport', e.target.value)} placeholder="LHR T2" />
          </label>

          <label>
            Arrival Airport
            <input value={flightForm.arrival_airport} onChange={e => updateFlightField('arrival_airport', e.target.value)} placeholder="CPH T2" />
          </label>

          <label>
            Departure Date / Time
            <input type="datetime-local" value={flightForm.departure_time} onChange={e => updateFlightField('departure_time', e.target.value)} />
          </label>

          <label>
            Arrival Date / Time
            <input type="datetime-local" value={flightForm.arrival_time} onChange={e => updateFlightField('arrival_time', e.target.value)} />
          </label>

          <label>
            Booking Reference
            <input value={flightForm.booking_reference} onChange={e => updateFlightField('booking_reference', e.target.value)} placeholder="ABC123" />
          </label>

          <label>
            Notes
            <input value={flightForm.notes} onChange={e => updateFlightField('notes', e.target.value)} placeholder="Optional" />
          </label>

          <button className="primaryButton" type="submit">
            <Plus size={18} /> {editingFlightId ? 'Update Flight' : 'Add Flight'}
          </button>

          {editingFlightId && (
            <button className="secondaryButton" type="button" onClick={resetFlightForm}>
              Cancel Edit
            </button>
          )}
        </form>
      </section>

      <section className="eventCard">
        <h2>Flights</h2>

        {flights.length ? (
          <div className="adminList">
            {filteredFlights.map(flight => (
              <div className="adminListItem" key={flight.id}>
                <div>
                  <strong>{flight.crew_name}</strong>
                  <p>{flight.airline} {flight.flight_number}: {flight.departure_airport} → {flight.arrival_airport}</p>
                  {flight.departure_time && <small>Departure: {formatDateTime(flight.departure_time)}</small>}
                  {flight.arrival_time && (
                    <small>
                      <br />
                      Arrival: {formatDateTime(flight.arrival_time)}
                    </small>
                  )}
                  {flight.booking_reference && (
                    <small>
                      <br />
                      Booking Ref: {flight.booking_reference}
                    </small>
                  )}
                  {flight.notes && <p>{flight.notes}</p>}
                </div>

                <div className="adminActions">
                  <button type="button" onClick={() => startEditFlight(flight)}>Edit</button>
                  <button type="button" onClick={() => deleteFlight(flight.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No flights added yet." />
        )}
      </section>

      </>
      )}

      {activeTab === 'hotels' && (
      <>
      <section className="eventCard importCard">
        <h2>Import Hotels Excel</h2>
        <p>Upload a hotels sheet to add multiple hotel bookings at once.</p>

        <div className="csvTemplateBox">
          <strong>Accepted file:</strong>
          <code>.xlsx sheet named Hotels, or .csv with guest_name,hotel_name,address,check_in,check_out,room_number,booking_reference,hotel_contact,notes</code>
        </div>

        <label className="fileUploadBox">
          Upload Hotels Excel
          <input type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={importHotelsFile} />
        </label>
      </section>

      <section className="eventCard" id="hotel-form">
        <h2>{editingHotelId ? 'Edit Hotel' : 'Add Hotel'}</h2>
        {editingHotelId && <p className="editNotice">Editing: {hotelForm.guest_name} {hotelForm.hotel_name && `- ${hotelForm.hotel_name}`}</p>}
        <p>Assign each hotel booking to an existing crew member.</p>

        <form onSubmit={saveHotel} className="adminForm">
          <label>
            Guest
            <select value={hotelForm.guest_name} onChange={e => updateHotelField('guest_name', e.target.value)}>
              <option value="">Select guest</option>
              {crew.map(member => (
                <option key={member.id} value={member.name}>{member.name}</option>
              ))}
            </select>
          </label>

          <label>
            Hotel Name
            <input value={hotelForm.hotel_name} onChange={e => updateHotelField('hotel_name', e.target.value)} placeholder="AC Bella Sky Copenhagen" />
          </label>

          <label>
            Address
            <input value={hotelForm.address} onChange={e => updateHotelField('address', e.target.value)} placeholder="Center Blvd. 5, Copenhagen" />
          </label>

          <label>
            Google Maps URL
            <input value={hotelForm.maps_url} onChange={e => updateHotelField('maps_url', e.target.value)} placeholder="https://maps.google.com/..." />
          </label>

          <label>
            What3Words
            <input value={hotelForm.what3words} onChange={e => updateHotelField('what3words', e.target.value)} placeholder="///filled.count.soap" />
          </label>

          <label>
            Check In
            <input type="date" value={hotelForm.check_in} onChange={e => updateHotelField('check_in', e.target.value)} />
          </label>

          <label>
            Check Out
            <input type="date" value={hotelForm.check_out} onChange={e => updateHotelField('check_out', e.target.value)} />
          </label>

          <label>
            Room Number
            <input value={hotelForm.room_number} onChange={e => updateHotelField('room_number', e.target.value)} placeholder="1205" />
          </label>

          <label>
            Booking Reference
            <input value={hotelForm.booking_reference} onChange={e => updateHotelField('booking_reference', e.target.value)} placeholder="HOTEL123" />
          </label>

          <label>
            Hotel Contact
            <input value={hotelForm.hotel_contact} onChange={e => updateHotelField('hotel_contact', e.target.value)} placeholder="+45..." />
          </label>

          <label>
            Notes
            <input value={hotelForm.notes} onChange={e => updateHotelField('notes', e.target.value)} placeholder="Optional" />
          </label>

          <button className="primaryButton" type="submit">
            <Plus size={18} /> {editingHotelId ? 'Update Hotel' : 'Add Hotel'}
          </button>

          {editingHotelId && (
            <button className="secondaryButton" type="button" onClick={resetHotelForm}>
              Cancel Edit
            </button>
          )}
        </form>
      </section>

      <section className="eventCard">
        <h2>Hotels</h2>

        {hotels.length ? (
          <div className="adminList">
            {filteredHotels.map(hotel => (
              <div className="adminListItem" key={hotel.id}>
                <div>
                  <strong>{hotel.guest_name}</strong>
                  <p>{hotel.hotel_name}</p>
                  {hotel.address && <p>{hotel.address}</p>}
                  <div className="locationButtonRow">
                    {hotel.maps_url && <a href={hotel.maps_url} target="_blank" rel="noreferrer" className="locationButton">📍 Hotel Maps</a>}
                    {hotel.what3words && <a href={`https://what3words.com/${String(hotel.what3words).replace(/^\/\/\//, '')}`} target="_blank" rel="noreferrer" className="locationButton">/// Hotel What3Words</a>}
                  </div>
                  {hotel.check_in && <small>Check-in: {formatDate(hotel.check_in)}</small>}
                  {hotel.check_out && (
                    <small>
                      <br />
                      Check-out: {formatDate(hotel.check_out)}
                    </small>
                  )}
                  {hotel.room_number && (
                    <small>
                      <br />
                      Room: {hotel.room_number}
                    </small>
                  )}
                  {hotel.booking_reference && (
                    <small>
                      <br />
                      Booking Ref: {hotel.booking_reference}
                    </small>
                  )}
                  {hotel.hotel_contact && (
                    <small>
                      <br />
                      Hotel Contact: {hotel.hotel_contact}
                    </small>
                  )}
                  {hotel.notes && <p>{hotel.notes}</p>}
                </div>

                <div className="adminActions">
                  <button type="button" onClick={() => startEditHotel(hotel)}>Edit</button>
                  <button type="button" onClick={() => deleteHotel(hotel.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No hotels added yet." />
        )}
      </section>

      </>
      )}

      {activeTab === 'transfers' && (
      <>
      <section className="eventCard importCard">
        <h2>Import Transfers Excel</h2>
        <p>Upload a transfers sheet to add multiple transfer records at once.</p>

        <div className="csvTemplateBox">
          <strong>Accepted file:</strong>
          <code>.xlsx sheet named Transfers, or .csv with passenger,transfer_type,pickup_location,destination,date,time,driver_name,driver_phone,vehicle,notes</code>
        </div>

        <label className="fileUploadBox">
          Upload Transfers Excel
          <input type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={importTransfersFile} />
        </label>
      </section>

      <section className="eventCard" id="transfer-form">
        <h2>{editingTransferId ? 'Edit Transfer' : 'Add Transfer'}</h2>
        {editingTransferId && <p className="editNotice">Editing: {transferForm.passenger} {transferForm.transfer_type && `- ${transferForm.transfer_type}`}</p>}
        <p>Add airport transfers, taxis, hotel shuttles or venue transport.</p>

        <form onSubmit={saveTransfer} className="adminForm">
          <label>
            Passenger
            <select value={transferForm.passenger} onChange={e => updateTransferField('passenger', e.target.value)}>
              <option value="">Select passenger</option>
              {crew.map(member => (
                <option key={member.id} value={member.name}>{member.name}</option>
              ))}
            </select>
          </label>

          <label>
            Transfer Type
            <input value={transferForm.transfer_type} onChange={e => updateTransferField('transfer_type', e.target.value)} placeholder="Airport Transfer" />
          </label>

          <label>
            Pickup Location
            <input value={transferForm.pickup_location} onChange={e => updateTransferField('pickup_location', e.target.value)} placeholder="Copenhagen Airport" />
          </label>

          <label>
            Pickup Google Maps URL
            <input value={transferForm.pickup_maps_url} onChange={e => updateTransferField('pickup_maps_url', e.target.value)} placeholder="https://maps.google.com/..." />
          </label>

          <label>
            Pickup What3Words
            <input value={transferForm.pickup_what3words} onChange={e => updateTransferField('pickup_what3words', e.target.value)} placeholder="///filled.count.soap" />
          </label>

          <label>
            Destination
            <input value={transferForm.destination} onChange={e => updateTransferField('destination', e.target.value)} placeholder="AC Bella Sky Copenhagen" />
          </label>

          <label>
            Destination Google Maps URL
            <input value={transferForm.destination_maps_url} onChange={e => updateTransferField('destination_maps_url', e.target.value)} placeholder="https://maps.google.com/..." />
          </label>

          <label>
            Destination What3Words
            <input value={transferForm.destination_what3words} onChange={e => updateTransferField('destination_what3words', e.target.value)} placeholder="///filled.count.soap" />
          </label>

          <label>
            Date
            <input type="date" value={transferForm.date} onChange={e => updateTransferField('date', e.target.value)} />
          </label>

          <label>
            Time
            <input type="time" value={transferForm.time} onChange={e => updateTransferField('time', e.target.value)} />
          </label>

          <label>
            Driver Name
            <input value={transferForm.driver_name} onChange={e => updateTransferField('driver_name', e.target.value)} placeholder="Peter Jensen" />
          </label>

          <label>
            Driver Phone
            <input value={transferForm.driver_phone} onChange={e => updateTransferField('driver_phone', e.target.value)} placeholder="+45..." />
          </label>

          <label>
            Vehicle
            <input value={transferForm.vehicle} onChange={e => updateTransferField('vehicle', e.target.value)} placeholder="Mercedes V-Class" />
          </label>

          <label>
            Notes
            <input value={transferForm.notes} onChange={e => updateTransferField('notes', e.target.value)} placeholder="Meet driver at arrivals" />
          </label>

          <button className="primaryButton" type="submit">
            <Plus size={18} /> {editingTransferId ? 'Update Transfer' : 'Add Transfer'}
          </button>

          {editingTransferId && (
            <button className="secondaryButton" type="button" onClick={resetTransferForm}>
              Cancel Edit
            </button>
          )}
        </form>
      </section>

      <section className="eventCard">
        <h2>Transfers</h2>

        {transfers.length ? (
          <div className="adminList">
            {filteredTransfers.map(transfer => (
              <div className="adminListItem" key={transfer.id}>
                <div>
                  <strong>{transfer.passenger || transfer.passengers}</strong>
                  <p>{transfer.transfer_type}</p>
                  <p>{transfer.pickup_location} → {transfer.destination}</p>
                  <div className="locationButtonRow">
                    {transfer.pickup_maps_url && <a href={transfer.pickup_maps_url} target="_blank" rel="noreferrer" className="locationButton">📍 Pickup Maps</a>}
                    {transfer.pickup_what3words && <a href={`https://what3words.com/${String(transfer.pickup_what3words).replace(/^\/\/\//, '')}`} target="_blank" rel="noreferrer" className="locationButton">/// Pickup What3Words</a>}
                    {transfer.destination_maps_url && <a href={transfer.destination_maps_url} target="_blank" rel="noreferrer" className="locationButton">📍 Destination Maps</a>}
                    {transfer.destination_what3words && <a href={`https://what3words.com/${String(transfer.destination_what3words).replace(/^\/\/\//, '')}`} target="_blank" rel="noreferrer" className="locationButton">/// Destination What3Words</a>}
                  </div>
                  <small>
                    {formatDate(transfer.date)}
                    {transfer.time && ` at ${formatTime(transfer.time)}`}
                  </small>
                  {transfer.driver_name && (
                    <small>
                      <br />
                      Driver: {transfer.driver_name}
                      {transfer.driver_phone && ` | ${transfer.driver_phone}`}
                    </small>
                  )}
                  {transfer.vehicle && (
                    <small>
                      <br />
                      Vehicle: {transfer.vehicle}
                    </small>
                  )}
                  {transfer.notes && <p>{transfer.notes}</p>}
                </div>

                <div className="adminActions">
                  <button type="button" onClick={() => startEditTransfer(transfer)}>Edit</button>
                  <button type="button" onClick={() => deleteTransfer(transfer.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No transfers added yet." />
        )}
      </section>

      </>
      )}

      {activeTab === 'schedule' && (
      <>
      <section className="eventCard importCard">
        <h2>Import Schedule Excel</h2>
        <p>Upload a schedule sheet to add multiple schedule items at once.</p>

        <div className="csvTemplateBox">
          <strong>Accepted file:</strong>
          <code>.xlsx sheet named Schedule, or .csv with activity,date,start_time,end_time,location,assigned_crew,notes</code>
        </div>

        <label className="fileUploadBox">
          Upload Schedule Excel
          <input type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={importScheduleFile} />
        </label>
      </section>

      <section className="eventCard" id="schedule-form">
        <h2>{editingScheduleId ? 'Edit Schedule Item' : 'Add Schedule Item'}</h2>
        {editingScheduleId && <p className="editNotice">Editing: {scheduleForm.activity}</p>}
        <p>Add crew calls, build timings, show timings, breaks and load-out information.</p>

        <form onSubmit={saveScheduleItem} className="adminForm">
          <label>
            Activity
            <input value={scheduleForm.activity} onChange={e => updateScheduleField('activity', e.target.value)} placeholder="Crew Call" />
          </label>

          <label>
            Date
            <input type="date" value={scheduleForm.date} onChange={e => updateScheduleField('date', e.target.value)} />
          </label>

          <label>
            Start Time
            <input type="time" value={scheduleForm.start_time} onChange={e => updateScheduleField('start_time', e.target.value)} />
          </label>

          <label>
            End Time
            <input type="time" value={scheduleForm.end_time} onChange={e => updateScheduleField('end_time', e.target.value)} />
          </label>

          <label>
            Location
            <input value={scheduleForm.location} onChange={e => updateScheduleField('location', e.target.value)} placeholder="Hall A / Stand 42" />
          </label>

          <label>
            Assigned Crew
            <input value={scheduleForm.assigned_crew} onChange={e => updateScheduleField('assigned_crew', e.target.value)} placeholder="All Crew / LED Team / Video Team" />
          </label>

          <label>
            Notes
            <input value={scheduleForm.notes} onChange={e => updateScheduleField('notes', e.target.value)} placeholder="Optional" />
          </label>

          <button className="primaryButton" type="submit">
            <Plus size={18} /> {editingScheduleId ? 'Update Schedule Item' : 'Add Schedule Item'}
          </button>

          {editingScheduleId && (
            <button className="secondaryButton" type="button" onClick={resetScheduleForm}>
              Cancel Edit
            </button>
          )}
        </form>
      </section>

      <section className="eventCard">
        <h2>Schedule</h2>

        {scheduleItems.length ? (
          <div className="adminList">
            {filteredScheduleItems.map(item => (
              <div className="adminListItem" key={item.id}>
                <div>
                  <strong>{item.activity}</strong>
                  <p>{item.location}</p>
                  <small>
                    {formatDate(item.date)}
                    {item.start_time && ` | ${formatTime(item.start_time)}`}
                    {item.end_time && ` - ${formatTime(item.end_time)}`}
                  </small>
                  {item.assigned_crew && (
                    <small>
                      <br />
                      Assigned Crew: {item.assigned_crew}
                    </small>
                  )}
                  {item.notes && <p>{item.notes}</p>}
                </div>

                <div className="adminActions">
                  <button type="button" onClick={() => startEditScheduleItem(item)}>Edit</button>
                  <button type="button" onClick={() => deleteScheduleItem(item.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No schedule added yet." />
        )}
      </section>

      </>
      )}

      {activeTab === 'documents' && (
      <>
      <section className="eventCard importCard">
        <h2>Import Documents Excel</h2>
        <p>Upload a documents sheet to add multiple document links at once.</p>

        <div className="csvTemplateBox">
          <strong>Accepted file:</strong>
          <code>.xlsx sheet named Documents, or .csv with document_name,category,file_url,notes</code>
        </div>

        <label className="fileUploadBox">
          Upload Documents Excel
          <input type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={importDocumentsFile} />
        </label>
      </section>

      <section className="eventCard uploadCard">
        <h2>Upload Document File</h2>
        <p>Upload RAMS, floorplans, venue maps, power plans or crew briefing files directly into this event.</p>

        <label className="fileUploadBox">
          Choose Document File
          <input type="file" onChange={uploadDocumentFile} />
        </label>

        <p className="uploadHint">Uploaded files appear in the Documents list and on the public call sheet.</p>
      </section>

      <section className="eventCard" id="document-form">
        <h2>{editingDocumentId ? 'Edit Document' : 'Add Document'}</h2>
        {editingDocumentId && <p className="editNotice">Editing: {documentForm.document_name}</p>}
        <p>Add links to RAMS, venue packs, floor plans, power plans, call sheets or Current RMS documents.</p>

        <form onSubmit={saveDocument} className="adminForm">
          <label>
            Document Name
            <input value={documentForm.document_name} onChange={e => updateDocumentField('document_name', e.target.value)} placeholder="RAMS" />
          </label>

          <label>
            Category
            <input value={documentForm.category} onChange={e => updateDocumentField('category', e.target.value)} placeholder="Health & Safety" />
          </label>

          <label>
            File URL
            <input value={documentForm.file_url} onChange={e => updateDocumentField('file_url', e.target.value)} placeholder="https://..." />
          </label>

          <label className="checkboxRow documentVisibilityToggle">
            <input type="checkbox" checked={documentForm.is_public} onChange={e => updateDocumentField('is_public', e.target.checked)} />
            Visible on public call sheet and crew personal views
          </label>

          <label>
            Notes
            <input value={documentForm.notes} onChange={e => updateDocumentField('notes', e.target.value)} placeholder="Optional" />
          </label>

          <button className="primaryButton" type="submit">
            <Plus size={18} /> {editingDocumentId ? 'Update Document' : 'Add Document'}
          </button>

          {editingDocumentId && (
            <button className="secondaryButton" type="button" onClick={resetDocumentForm}>
              Cancel Edit
            </button>
          )}
        </form>
      </section>

      <section className="eventCard">
        <h2>Documents</h2>
        <p>Documents are grouped by category. Use the visibility toggle to keep internal files off the public call sheet.</p>

        {documents.length > 0 && (
          <div className="documentCategoryBar">
            <span>Categories:</span>
            {documentCategories.map(category => (
              <strong key={category}>{category}</strong>
            ))}
          </div>
        )}

        {documents.length ? (
          <div className="adminList">
            {filteredDocuments.map(document => (
              <div className="adminListItem" key={document.id}>
                <div>
                  <strong>{document.document_name}</strong>
                  <div className="documentMetaRow">
                    <span>{document.category || 'Uncategorised'}</span>
                    <span className={document.is_public === false ? 'documentPrivateBadge' : 'documentPublicBadge'}>
                      {document.is_public === false ? 'Admin only' : 'Public'}
                    </span>
                    {document.file_type && <span>{document.file_type}</span>}
                    {document.file_size ? <span>{formatFileSize(document.file_size)}</span> : null}
                  </div>
                  {document.file_url && <DocumentPreviewLinks url={document.file_url} label={document.document_name} />}
                  {document.notes && <p>{document.notes}</p>}
                </div>

                <div className="adminActions">
                  <button
                    type="button"
                    className={document.is_public === false ? 'visibilityPublicButton' : 'visibilityPrivateButton'}
                    onClick={() => toggleDocumentVisibility(document)}
                  >
                    {document.is_public === false ? 'Make Public' : 'Make Admin Only'}
                  </button>
                  <button type="button" onClick={() => startEditDocument(document)}>Edit</button>
                  <button type="button" onClick={() => deleteDocument(document.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No documents added yet." />
        )}
      </section>
      </>
      )}
    </main>
  )
}


function CrewPersonalView() {
  const parts = window.location.pathname.split('/').filter(Boolean)
  const eventSlug = parts[0]
  const crewId = parts[2]

  const [event, setEvent] = useState(null)
  const [member, setMember] = useState(null)
  const [data, setData] = useState({
    flights: [],
    transfers: [],
    hotels: [],
    schedule_items: [],
    documents: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCrewView() {
      setLoading(true)

      const { data: eventData, error: eventError } = await supabase
        .from('Events')
        .select('*')
        .eq('public_slug', eventSlug)
        .eq('share_enabled', true)
        .single()

      if (eventError || !eventData) {
        setError('Crew sheet not found or not published.')
        setLoading(false)
        return
      }

      setEvent(eventData)

      const { data: crewData, error: crewError } = await supabase
        .from('crew')
        .select('*')
        .eq('event_id', eventData.id)
        .eq('id', crewId)
        .single()

      if (crewError || !crewData) {
        setError('Crew member not found.')
        setLoading(false)
        return
      }

      setMember(crewData)

      const crewName = crewData.name

      const { data: flights } = await supabase
        .from('flights')
        .select('*')
        .eq('event_id', eventData.id)
        .eq('crew_name', crewName)

      const { data: hotels } = await supabase
        .from('hotels')
        .select('*')
        .eq('event_id', eventData.id)
        .eq('guest_name', crewName)

      const { data: transfers } = await supabase
        .from('transfers')
        .select('*')
        .eq('event_id', eventData.id)

      const { data: scheduleItems } = await supabase
        .from('schedule_items')
        .select('*')
        .eq('event_id', eventData.id)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('event_id', eventData.id)
        .eq('is_public', true)

      const filteredTransfers = (transfers || []).filter(item => {
        const passenger = String(item.passenger || item.passengers || '').toLowerCase()
        return passenger === crewName.toLowerCase()
      })

      const filteredSchedule = (scheduleItems || []).filter(item => {
        const assigned = String(item.assigned_crew || '').toLowerCase()
        return !assigned || assigned.includes('all') || assigned.includes(crewName.toLowerCase())
      })

      setData({
        flights: flights || [],
        hotels: hotels || [],
        transfers: filteredTransfers,
        schedule_items: filteredSchedule,
        documents: documents || [],
      })

      setLoading(false)
    }

    loadCrewView()
  }, [eventSlug, crewId])

  if (loading) return <main className="page"><p>Loading crew view...</p></main>
  if (error) return <main className="page"><p>{error}</p></main>

  return (
    <main className="page">
      <header className="hero">
        <img
          src={pepLogo}
          alt="Premium Event Productions"
          className="pepLogo"
        />
        <div>
          <p className="eyebrow">Personal Crew View</p>
          <h1>{member.name}</h1>
        </div>
      </header>

      <section className="eventCard">
        <a href={`/${event.public_slug}`} className="backLink"><ArrowLeft size={16} /> Back to Full Call Sheet</a>
        <h2>{event.show_name}</h2>
        <p>{event.venue}</p>
        {event.venue_address && <p><strong>Address:</strong> {event.venue_address}</p>}
        <div className="locationButtonRow">
          {event.venue_maps_url && <a href={event.venue_maps_url} target="_blank" rel="noreferrer" className="locationButton">📍 Open Maps</a>}
          {event.venue_what3words && <a href={`https://what3words.com/${String(event.venue_what3words).replace(/^\/\/\//, '')}`} target="_blank" rel="noreferrer" className="locationButton">/// What3Words</a>}
        </div>
        <div className="eventGrid">
          <span><strong>Role:</strong> {member.role || 'Not set'}</span>
          <span><strong>Department:</strong> {member.department || 'Not set'}</span>
          <span><strong>Mobile:</strong> {member.mobile || 'Not set'}</span>
        </div>
        {(event.venue_access_notes || event.loading_bay_notes) && (
          <div className="locationNotes">
            {event.venue_access_notes && <p><strong>Access:</strong> {event.venue_access_notes}</p>}
            {event.loading_bay_notes && <p><strong>Loading Bay:</strong> {event.loading_bay_notes}</p>}
          </div>
        )}
        {member.notes && <p><strong>Notes:</strong> {member.notes}</p>}
      </section>

      <div className="accordionStack">
        <Accordion title="My Flights" subtitle={`${data.flights.length} flight records`} icon={Plane}>
          {data.flights.length ? (
            data.flights.map(x => (
              <div className="item" key={x.id}>
                <strong>{x.airline} {x.flight_number}</strong>
                <p>{x.departure_airport} → {x.arrival_airport}</p>
                {x.departure_time && <small>Departure: {formatDateTime(x.departure_time)}</small>}
                {x.arrival_time && (
                  <small>
                    <br />
                    Arrival: {formatDateTime(x.arrival_time)}
                  </small>
                )}
                {x.booking_reference && (
                  <small>
                    <br />
                    Booking Ref: {x.booking_reference}
                  </small>
                )}
                {x.notes && <p>{x.notes}</p>}
              </div>
            ))
          ) : (
            <Empty text="No flights assigned to you yet." />
          )}
        </Accordion>

        <Accordion title="My Hotel" subtitle={`${data.hotels.length} hotel records`} icon={Hotel}>
          {data.hotels.length ? (
            data.hotels.map(x => (
              <div className="item" key={x.id}>
                <strong>{x.hotel_name}</strong>
                {x.address && <p>{x.address}</p>}
                <div className="locationButtonRow">
                  {x.maps_url && <a href={x.maps_url} target="_blank" rel="noreferrer" className="locationButton">📍 Hotel Maps</a>}
                  {x.what3words && <a href={`https://what3words.com/${String(x.what3words).replace(/^\/\/\//, '')}`} target="_blank" rel="noreferrer" className="locationButton">/// Hotel What3Words</a>}
                </div>
                <small>
                  Check-in: {formatDate(x.check_in)}
                  {x.check_out && (
                    <>
                      <br />
                      Check-out: {formatDate(x.check_out)}
                    </>
                  )}
                  {x.room_number && (
                    <>
                      <br />
                      Room: {x.room_number}
                    </>
                  )}
                </small>
                {x.booking_reference && (
                  <small>
                    <br />
                    Booking Ref: {x.booking_reference}
                  </small>
                )}
                {x.hotel_contact && (
                  <small>
                    <br />
                    Hotel Contact: {x.hotel_contact}
                  </small>
                )}
                {x.notes && <p>{x.notes}</p>}
              </div>
            ))
          ) : (
            <Empty text="No hotel assigned to you yet." />
          )}
        </Accordion>

        <Accordion title="My Transfers" subtitle={`${data.transfers.length} transfer records`} icon={Car}>
          {data.transfers.length ? (
            data.transfers.map(x => (
              <div className="item" key={x.id}>
                <strong>{x.transfer_type}</strong>
                <p>{x.pickup_location} → {x.destination}</p>
                <div className="locationButtonRow">
                  {x.pickup_maps_url && <a href={x.pickup_maps_url} target="_blank" rel="noreferrer" className="locationButton">📍 Pickup Maps</a>}
                  {x.pickup_what3words && <a href={`https://what3words.com/${String(x.pickup_what3words).replace(/^\/\/\//, '')}`} target="_blank" rel="noreferrer" className="locationButton">/// Pickup What3Words</a>}
                  {x.destination_maps_url && <a href={x.destination_maps_url} target="_blank" rel="noreferrer" className="locationButton">📍 Destination Maps</a>}
                  {x.destination_what3words && <a href={`https://what3words.com/${String(x.destination_what3words).replace(/^\/\/\//, '')}`} target="_blank" rel="noreferrer" className="locationButton">/// Destination What3Words</a>}
                </div>
                <small>
                  {formatDate(x.date)}
                  {x.time && ` at ${formatTime(x.time)}`}
                </small>
                {x.driver_name && (
                  <small>
                    <br />
                    Driver: {x.driver_name}
                    {x.driver_phone && ` | ${x.driver_phone}`}
                  </small>
                )}
                {x.vehicle && (
                  <small>
                    <br />
                    Vehicle: {x.vehicle}
                  </small>
                )}
                {x.notes && <p>{x.notes}</p>}
              </div>
            ))
          ) : (
            <Empty text="No transfers assigned to you yet." />
          )}
        </Accordion>

        <Accordion title="My Schedule" subtitle={`${data.schedule_items.length} schedule items`} icon={CalendarDays}>
          {data.schedule_items.length ? (
            data.schedule_items.map(x => (
              <div className="item" key={x.id}>
                <strong>{x.activity}</strong>
                <p>{x.location}</p>
                <small>
                  {formatDate(x.date)}
                  {x.start_time && ` | ${formatTime(x.start_time)}`}
                  {x.end_time && ` - ${formatTime(x.end_time)}`}
                </small>
                {x.assigned_crew && (
                  <small>
                    <br />
                    Assigned Crew: {x.assigned_crew}
                  </small>
                )}
                {x.notes && <p>{x.notes}</p>}
              </div>
            ))
          ) : (
            <Empty text="No schedule items assigned to you yet." />
          )}
        </Accordion>

        <Accordion title="Documents" subtitle={`${data.documents.length} documents`} icon={FileText}>
          {data.documents.length ? (
            data.documents.map(x => (
              <div className="item" key={x.id}>
                <strong>{x.document_name}</strong>
                <div className="documentMetaRow">
                  <span>{x.category || 'Uncategorised'}</span>
                  {x.file_size ? <span>{formatFileSize(x.file_size)}</span> : null}
                </div>
                {x.file_url && <DocumentPreviewLinks url={x.file_url} label={x.document_name} />}
                {x.notes && <p>{x.notes}</p>}
              </div>
            ))
          ) : (
            <Empty text="No documents added yet." />
          )}
        </Accordion>
      </div>
    </main>
  )
}

function PublicCrewSheet() {
  const slug = window.location.pathname.replace('/', '') || 'test-pep-show'

  const [event, setEvent] = useState(null)
  const [data, setData] = useState({
    crew: [],
    flights: [],
    transfers: [],
    hotels: [],
    schedule_items: [],
    documents: [],
    notes: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCrewSheet() {
      setLoading(true)

      const { data: eventData, error: eventError } = await supabase
        .from('Events')
        .select('*')
        .eq('public_slug', slug)
        .eq('share_enabled', true)
        .single()

      if (eventError || !eventData) {
        setError('Crew sheet not found or not published.')
        setLoading(false)
        return
      }

      setEvent(eventData)

      const tables = ['crew', 'flights', 'transfers', 'hotels', 'schedule_items', 'documents', 'notes']
      const results = {}

      for (const table of tables) {
        const { data } = await supabase
          .from(table)
          .select('*')
          .eq('event_id', eventData.id)

        results[table] = data || []
      }

      results.documents = (results.documents || []).filter(document => document.is_public !== false)

      setData(results)
      setLoading(false)
    }

    loadCrewSheet()
  }, [slug])

  if (loading) return <main className="page"><p>Loading PEP crew sheet...</p></main>
  if (error) return <main className="page"><p>{error}</p></main>

  return (
    <main className="page">
      <header className="hero">
        <img
          src={pepLogo}
          alt="Premium Event Productions"
          className="pepLogo"
        />
        <div>
          <p className="eyebrow">Premium Event Productions</p>
          <h1>PEP Crew Sheet</h1>
        </div>
      </header>

      <section className="eventCard publicOverviewCard">
        <div className="publicOverviewHeader">
          <div>
            <p className="eyebrowDark">Event Overview</p>
            <h2>{event.show_name}</h2>
            <p className="publicVenueLine">{event.venue}</p>
            {event.venue_address && <p className="publicAddressLine"><strong>Address:</strong> {event.venue_address}</p>}
          </div>

          <div className="publicDateCard">
            <span>Event Dates</span>
            <strong>{formatDate(event.start_date)}</strong>
            <small>to {formatDate(event.end_date)}</small>
          </div>
        </div>

        <div className="publicQuickStats">
          <div>
            <strong>{data.crew.length}</strong>
            <span>Crew</span>
          </div>
          <div>
            <strong>{data.flights.length}</strong>
            <span>Flights</span>
          </div>
          <div>
            <strong>{data.hotels.length}</strong>
            <span>Hotels</span>
          </div>
          <div>
            <strong>{data.transfers.length}</strong>
            <span>Transfers</span>
          </div>
          <div>
            <strong>{data.schedule_items.length}</strong>
            <span>Schedule</span>
          </div>
          <div>
            <strong>{data.documents.length}</strong>
            <span>Documents</span>
          </div>
        </div>

        <div className="publicQuickActions">
          {event.venue_maps_url && <a href={event.venue_maps_url} target="_blank" rel="noreferrer" className="locationButton">📍 Venue Map</a>}
          {event.venue_what3words && <a href={`https://what3words.com/${String(event.venue_what3words).replace(/^\/\/\//, '')}`} target="_blank" rel="noreferrer" className="locationButton">/// What3Words</a>}
          {event.venue_access_notes && <a href="#venue-access-notes" className="locationButton">Access Info</a>}
          {event.loading_bay_notes && <a href="#venue-access-notes" className="locationButton">Loading Bay</a>}
          {event.project_manager && <span className="publicManagerPill">PM: {event.project_manager}</span>}
        </div>

        {(event.venue_access_notes || event.loading_bay_notes) && (
          <div className="locationNotes publicLocationNotes" id="venue-access-notes">
            {event.venue_access_notes && <p><strong>Access:</strong> {event.venue_access_notes}</p>}
            {event.loading_bay_notes && <p><strong>Loading Bay:</strong> {event.loading_bay_notes}</p>}
          </div>
        )}
      </section>

      <div className="accordionStack">
        <Accordion title="Crew" subtitle={`${data.crew.length} crew members`} icon={Users}>
          {data.crew.length ? (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Mobile</th>
                  <th>Hotel</th>
                </tr>
              </thead>
              <tbody>
                {data.crew.map(x => (
                  <tr key={x.id}>
                    <td>
                      <a href={`/${slug}/crew/${x.id}`}>{x.name}</a>
                    </td>
                    <td>{x.role}</td>
                    <td>{x.mobile}</td>
                    <td>{x.hotel} {x.room_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty text="No crew added yet." />
          )}
        </Accordion>

        <Accordion title="Flights" subtitle={`${data.flights.length} flight records`} icon={Plane}>
          {data.flights.length ? (
            data.flights.map(x => (
              <div className="item" key={x.id}>
                <strong>{x.crew_name}</strong>
                <p>{x.airline} {x.flight_number}: {x.departure_airport} → {x.arrival_airport}</p>

                {x.departure_time && <small>Departure: {formatDateTime(x.departure_time)}</small>}

                {x.arrival_time && (
                  <small>
                    <br />
                    Arrival: {formatDateTime(x.arrival_time)}
                  </small>
                )}

                {x.booking_reference && (
                  <small>
                    <br />
                    Booking Ref: {x.booking_reference}
                  </small>
                )}

                {x.notes && <p>{x.notes}</p>}
              </div>
            ))
          ) : (
            <Empty text="No flights added yet." />
          )}
        </Accordion>

        <Accordion title="Transfers" subtitle={`${data.transfers.length} transfer records`} icon={Car}>
          {data.transfers.length ? (
            data.transfers.map(x => (
              <div className="item" key={x.id}>
                <strong>{x.transfer_type}</strong>
                <p>{x.pickup_location} → {x.destination}</p>
                <div className="locationButtonRow">
                  {x.pickup_maps_url && <a href={x.pickup_maps_url} target="_blank" rel="noreferrer" className="locationButton">📍 Pickup Maps</a>}
                  {x.pickup_what3words && <a href={`https://what3words.com/${String(x.pickup_what3words).replace(/^\/\/\//, '')}`} target="_blank" rel="noreferrer" className="locationButton">/// Pickup What3Words</a>}
                  {x.destination_maps_url && <a href={x.destination_maps_url} target="_blank" rel="noreferrer" className="locationButton">📍 Destination Maps</a>}
                  {x.destination_what3words && <a href={`https://what3words.com/${String(x.destination_what3words).replace(/^\/\/\//, '')}`} target="_blank" rel="noreferrer" className="locationButton">/// Destination What3Words</a>}
                </div>
                <small>
                  {formatDate(x.date)}
                  {x.time && ` at ${formatTime(x.time)}`}
                  {(x.passenger || x.passengers) && ` | ${x.passenger || x.passengers}`}
                </small>
                {x.driver_name && (
                  <small>
                    <br />
                    Driver: {x.driver_name}
                    {x.driver_phone && ` | ${x.driver_phone}`}
                  </small>
                )}
                {x.vehicle && (
                  <small>
                    <br />
                    Vehicle: {x.vehicle}
                  </small>
                )}
                {x.notes && <p>{x.notes}</p>}
              </div>
            ))
          ) : (
            <Empty text="No transfers added yet." />
          )}
        </Accordion>

        <Accordion title="Hotels" subtitle={`${data.hotels.length} hotel records`} icon={Hotel}>
          {data.hotels.length ? (
            data.hotels.map(x => (
              <div className="item" key={x.id}>
                <strong>{x.guest_name}</strong>
                <p>{x.hotel_name}</p>
                {x.address && <p>{x.address}</p>}
                <div className="locationButtonRow">
                  {x.maps_url && <a href={x.maps_url} target="_blank" rel="noreferrer" className="locationButton">📍 Hotel Maps</a>}
                  {x.what3words && <a href={`https://what3words.com/${String(x.what3words).replace(/^\/\/\//, '')}`} target="_blank" rel="noreferrer" className="locationButton">/// Hotel What3Words</a>}
                </div>
                <small>
                  Check-in: {formatDate(x.check_in)}
                  {x.check_out && (
                    <>
                      <br />
                      Check-out: {formatDate(x.check_out)}
                    </>
                  )}
                  {x.room_number && (
                    <>
                      <br />
                      Room: {x.room_number}
                    </>
                  )}
                </small>
                {x.booking_reference && (
                  <small>
                    <br />
                    Booking Ref: {x.booking_reference}
                  </small>
                )}
                {x.hotel_contact && (
                  <small>
                    <br />
                    Hotel Contact: {x.hotel_contact}
                  </small>
                )}
                {x.notes && <p>{x.notes}</p>}
              </div>
            ))
          ) : (
            <Empty text="No hotels added yet." />
          )}
        </Accordion>

        <Accordion title="Schedule" subtitle={`${data.schedule_items.length} schedule items`} icon={CalendarDays}>
          {data.schedule_items.length ? (
            data.schedule_items.map(x => (
              <div className="item" key={x.id}>
                <strong>{x.activity}</strong>
                <p>{x.location}</p>
                <small>
                  {formatDate(x.date)}
                  {x.start_time && ` | ${formatTime(x.start_time)}`}
                  {x.end_time && ` - ${formatTime(x.end_time)}`}
                </small>
                {x.assigned_crew && (
                  <small>
                    <br />
                    Assigned Crew: {x.assigned_crew}
                  </small>
                )}
                {x.notes && <p>{x.notes}</p>}
              </div>
            ))
          ) : (
            <Empty text="No schedule added yet." />
          )}
        </Accordion>

        <Accordion title="Documents" subtitle={`${data.documents.length} documents`} icon={FileText}>
          {data.documents.length ? (
            data.documents.map(x => (
              <div className="item" key={x.id}>
                <strong>{x.document_name}</strong>
                <div className="documentMetaRow">
                  <span>{x.category || 'Uncategorised'}</span>
                  {x.file_size ? <span>{formatFileSize(x.file_size)}</span> : null}
                </div>
                {x.file_url && <DocumentPreviewLinks url={x.file_url} label={x.document_name} />}
                {x.notes && <p>{x.notes}</p>}
              </div>
            ))
          ) : (
            <Empty text="No documents added yet." />
          )}
        </Accordion>

        <Accordion title="Notes" subtitle={`${data.notes.length} notes`} icon={StickyNote}>
          {data.notes.length ? (
            data.notes.map(x => (
              <div className="item" key={x.id}>
                <strong>{x.title}</strong>
                <p>{x.content}</p>
              </div>
            ))
          ) : (
            <Empty text="No notes added yet." />
          )}
        </Accordion>
      </div>
    </main>
  )
}

function App() {
  const path = window.location.pathname
  const isAdminRoute = path === '/admin' || path.startsWith('/admin/event/')

  const [session, setSession] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(isAdminRoute)

  useEffect(() => {
    if (!isAdminRoute) return

    async function checkSession() {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setCheckingAuth(false)
    }

    checkSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [isAdminRoute])

  if (!isAdminRoute) {
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 3 && parts[1] === 'crew') {
      return <CrewPersonalView />
    }

    return <PublicCrewSheet />
  }

  if (checkingAuth) {
    return <main className="page"><p>Checking admin access...</p></main>
  }

  if (!session) {
    return <LoginPage onLogin={() => window.location.reload()} />
  }

  if (path === '/admin') {
    return <AdminShell><AdminPage /></AdminShell>
  }

  if (path.startsWith('/admin/event/')) {
    return <AdminShell><EventManagerPage /></AdminShell>
  }

  return <PublicCrewSheet />
}

createRoot(document.getElementById('root')).render(<App />)
