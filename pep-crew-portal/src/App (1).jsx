import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Users, Plane, Car, Hotel, CalendarDays, FileText, StickyNote, ChevronDown } from 'lucide-react'
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

  // Handles Supabase time fields like "08:00:00" or "08:00"
  if (typeof timeString === 'string' && /^\d{2}:\d{2}/.test(timeString)) {
    return timeString.slice(0, 5)
  }

  return timeString
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

function App() {
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
                <p>
                  {x.airline} {x.flight_number}: {x.departure_airport} → {x.arrival_airport}
                </p>

                {x.departure_time && (
                  <small>
                    Departure: {formatDateTime(x.departure_time)}
                  </small>
                )}

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
                  {x.passengers && ` | ${x.passengers}`}
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

createRoot(document.getElementById('root')).render(<App />)
