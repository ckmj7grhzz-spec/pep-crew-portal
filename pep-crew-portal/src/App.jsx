import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Users, Plane, Car, Hotel, CalendarDays, FileText, StickyNote, ChevronDown, Plus, Copy, Settings, ArrowLeft, LogOut } from 'lucide-react'
import { supabase } from './supabase'
import './styles.css'
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
  const [crew, setCrew] = useState([])
  const [flights, setFlights] = useState([])
  const [hotels, setHotels] = useState([])
  const [transfers, setTransfers] = useState([])
  const [scheduleItems, setScheduleItems] = useState([])
  const [documents, setDocuments] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
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
    destination: '',
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
      destination: '',
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
      destination: transfer.destination || '',
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
    const { error } = await supabase.from('documents').delete().eq('id', id)

    if (error) {
      setMessage(`Could not delete document: ${error.message}`)
      return
    }

    setMessage('Document deleted.')
    loadEventManager()
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
            <small>Project Manager: {event.project_manager || 'Not set'}</small>
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

        <div className="tabs">
          {[
            ['overview', 'Overview'],
            ['crew', 'Crew'],
            ['flights', 'Flights'],
            ['hotels', 'Hotels'],
            ['transfers', 'Transfers'],
            ['schedule', 'Schedule'],
            ['documents', 'Documents'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={activeTab === key ? 'active' : ''}
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
            <h2>Missing Information</h2>
            <p>These are the crew records that still need travel, accommodation or transfer details.</p>

            <div className="missingGrid">
              <div className={missingFlights.length ? 'statusRed' : 'statusGreen'}>
                <h3>Missing Flights</h3>
                {missingFlights.length ? (
                  missingFlights.map(member => <p key={member.id}>⚠ {member.name}</p>)
                ) : (
                  <p className="allGood">✓ All crew have flights</p>
                )}
              </div>

              <div className={missingHotels.length ? 'statusRed' : 'statusGreen'}>
                <h3>Missing Hotels</h3>
                {missingHotels.length ? (
                  missingHotels.map(member => <p key={member.id}>⚠ {member.name}</p>)
                ) : (
                  <p className="allGood">✓ All crew have hotels</p>
                )}
              </div>

              <div className={missingTransfers.length ? 'statusRed' : 'statusGreen'}>
                <h3>Missing Transfers</h3>
                {missingTransfers.length ? (
                  missingTransfers.map(member => <p key={member.id}>⚠ {member.name}</p>)
                ) : (
                  <p className="allGood">✓ All crew have transfers</p>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'crew' && (
      <>
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
            {crew.map(member => (
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
            {flights.map(flight => (
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
            {hotels.map(hotel => (
              <div className="adminListItem" key={hotel.id}>
                <div>
                  <strong>{hotel.guest_name}</strong>
                  <p>{hotel.hotel_name}</p>
                  {hotel.address && <p>{hotel.address}</p>}
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
            Destination
            <input value={transferForm.destination} onChange={e => updateTransferField('destination', e.target.value)} placeholder="AC Bella Sky Copenhagen" />
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
            {transfers.map(transfer => (
              <div className="adminListItem" key={transfer.id}>
                <div>
                  <strong>{transfer.passenger || transfer.passengers}</strong>
                  <p>{transfer.transfer_type}</p>
                  <p>{transfer.pickup_location} → {transfer.destination}</p>
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
            {scheduleItems.map(item => (
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

        {documents.length ? (
          <div className="adminList">
            {documents.map(document => (
              <div className="adminListItem" key={document.id}>
                <div>
                  <strong>{document.document_name}</strong>
                  <p>{document.category}</p>
                  {document.file_url && <a href={document.file_url} target="_blank" rel="noreferrer">Open document</a>}
                  {document.notes && <p>{document.notes}</p>}
                </div>

                <div className="adminActions">
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
        <div className="eventGrid">
          <span><strong>Role:</strong> {member.role || 'Not set'}</span>
          <span><strong>Department:</strong> {member.department || 'Not set'}</span>
          <span><strong>Mobile:</strong> {member.mobile || 'Not set'}</span>
        </div>
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
                <p>{x.category}</p>
                {x.file_url && <a href={x.file_url} target="_blank" rel="noreferrer">Open document</a>}
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

      <section className="eventCard">
        <h2>{event.show_name}</h2>
        <p>{event.venue}</p>
        <div className="eventGrid">
          <span><strong>Start:</strong> {formatDate(event.start_date)}</span>
          <span><strong>End:</strong> {formatDate(event.end_date)}</span>
          <span><strong>Project Manager:</strong> {event.project_manager}</span>
        </div>
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
                <p>{x.category}</p>
                {x.file_url && <a href={x.file_url}>Open document</a>}
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
