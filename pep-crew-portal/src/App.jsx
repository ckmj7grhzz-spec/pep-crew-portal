import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Users, Plane, Car, Hotel, CalendarDays, FileText, StickyNote, ChevronDown, Plus, Copy, Settings, ArrowLeft } from 'lucide-react'
import { supabase } from './supabase'
import './styles.css'

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
        <div className="brand">PEP</div>
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
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

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

  async function addCrewMember(e) {
    e.preventDefault()
    setMessage('')

    if (!event) return
    if (!crewForm.name) {
      setMessage('Crew member name is required.')
      return
    }

    const { error } = await supabase
      .from('crew')
      .insert([{ ...crewForm, event_id: event.id }])

    if (error) {
      setMessage(`Could not add crew member: ${error.message}`)
      return
    }

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

    setMessage('Crew member added.')
    loadEventManager()
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

  async function addFlight(e) {
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

    const { error } = await supabase
      .from('flights')
      .insert([cleanFlight])

    if (error) {
      setMessage(`Could not add flight: ${error.message}`)
      return
    }

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

    setMessage('Flight added.')
    loadEventManager()
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

  async function addHotel(e) {
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

    const { error } = await supabase
      .from('hotels')
      .insert([cleanHotel])

    if (error) {
      setMessage(`Could not add hotel: ${error.message}`)
      return
    }

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

    setMessage('Hotel booking added.')
    loadEventManager()
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

  async function addTransfer(e) {
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

    const { error } = await supabase
      .from('transfers')
      .insert([cleanTransfer])

    if (error) {
      setMessage(`Could not add transfer: ${error.message}`)
      return
    }

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

    setMessage('Transfer added.')
    loadEventManager()
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
      <header className="hero">
        <div className="brand">PEP</div>
        <div>
          <p className="eyebrow">Premium Event Productions</p>
          <h1>Manage Crew Sheet</h1>
        </div>
      </header>

      <section className="eventCard">
        <a href="/admin" className="backLink"><ArrowLeft size={16} /> Back to Admin</a>
        <h2>{event.show_name}</h2>
        <p>{event.venue}</p>
        <div className="eventGrid">
          <span><strong>Start:</strong> {formatDate(event.start_date)}</span>
          <span><strong>End:</strong> {formatDate(event.end_date)}</span>
          <span><strong>Project Manager:</strong> {event.project_manager}</span>
        </div>
        <div className="adminActions managerTopActions">
          <a href={`/${event.public_slug}`} target="_blank" rel="noreferrer">Open Public Sheet</a>
        </div>
      </section>

      <section className="eventCard">
        <h2>Add Crew Member</h2>

        <form onSubmit={addCrewMember} className="adminForm">
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
            <Plus size={18} /> Add Crew Member
          </button>
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
                  <button type="button" onClick={() => deleteCrewMember(member.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No crew added yet." />
        )}
      </section>

      <section className="eventCard">
        <h2>Add Flight</h2>
        <p>Assign each flight to an existing crew member.</p>

        <form onSubmit={addFlight} className="adminForm">
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
            <Plus size={18} /> Add Flight
          </button>
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
                  <button type="button" onClick={() => deleteFlight(flight.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No flights added yet." />
        )}
      </section>

      <section className="eventCard">
        <h2>Add Hotel</h2>
        <p>Assign each hotel booking to an existing crew member.</p>

        <form onSubmit={addHotel} className="adminForm">
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
            <Plus size={18} /> Add Hotel
          </button>
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
                  <button type="button" onClick={() => deleteHotel(hotel.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No hotels added yet." />
        )}
      </section>

      <section className="eventCard">
        <h2>Add Transfer</h2>
        <p>Add airport transfers, taxis, hotel shuttles or venue transport.</p>

        <form onSubmit={addTransfer} className="adminForm">
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
            <Plus size={18} /> Add Transfer
          </button>
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
                  <button type="button" onClick={() => deleteTransfer(transfer.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No transfers added yet." />
        )}
      </section>
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
        <div className="brand">PEP</div>
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
                    <td>{x.name}</td>
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

  if (path === '/admin') return <AdminPage />
  if (path.startsWith('/admin/event/')) return <EventManagerPage />

  return <PublicCrewSheet />
}

createRoot(document.getElementById('root')).render(<App />)
