import { Router } from 'express'
import { authenticate } from '../../auth/middleware/authenticate'

const router = Router()
router.use(authenticate)

const meetings: any[] = []
const attendees: any[] = []
const notes: any[] = []

// ─── Create meeting ──────────────────────────
router.post('/', (req, res) => {
  const { title, orgId, startAt, endAt, description, location, type = 'internal' } = req.body
  if (!title || !orgId || !startAt) return res.status(400).json({ error: 'title, orgId, startAt required' })
  const meeting = {
    id:          crypto.randomUUID(),
    title,
    orgId,
    description,
    location,
    type,
    startAt:     new Date(startAt),
    endAt:       endAt ? new Date(endAt) : null,
    status:      'scheduled',
    createdBy:   (req as any).userId,
    createdAt:   new Date(),
  }
  meetings.push(meeting)
  attendees.push({ meetingId: meeting.id, userId: (req as any).userId, role: 'organizer', status: 'accepted' })
  res.status(201).json({ meeting })
})

// ─── List meetings ───────────────────────────
router.get('/', (req, res) => {
  const userId = (req as any).userId
  const { orgId } = req.query
  const myMeetingIds = attendees.filter(a => a.userId === userId).map(a => a.meetingId)
  let list = meetings.filter(m => myMeetingIds.includes(m.id))
  if (orgId) list = list.filter(m => m.orgId === orgId)
  list = list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  res.json({ meetings: list })
})

// ─── Get one meeting ─────────────────────────
router.get('/:meetingId', (req, res) => {
  const meeting = meetings.find(m => m.id === req.params.meetingId)
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' })
  const meetingAttendees = attendees.filter(a => a.meetingId === req.params.meetingId)
  const meetingNotes = notes.filter(n => n.meetingId === req.params.meetingId)
  res.json({ meeting, attendees: meetingAttendees, notes: meetingNotes })
})

// ─── Update meeting ──────────────────────────
router.patch('/:meetingId', (req, res) => {
  const meeting = meetings.find(m => m.id === req.params.meetingId && m.createdBy === (req as any).userId)
  if (!meeting) return res.status(404).json({ error: 'Meeting not found or not yours' })
  const { title, description, startAt, endAt, status, location } = req.body
  if (title)       meeting.title       = title
  if (description) meeting.description = description
  if (startAt)     meeting.startAt     = new Date(startAt)
  if (endAt)       meeting.endAt       = new Date(endAt)
  if (status)      meeting.status      = status
  if (location)    meeting.location    = location
  res.json({ meeting })
})

// ─── Invite attendee ─────────────────────────
router.post('/:meetingId/attendees', (req, res) => {
  const { userId, role = 'attendee' } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })
  const existing = attendees.find(a => a.meetingId === req.params.meetingId && a.userId === userId)
  if (existing) return res.status(409).json({ error: 'Already invited' })
  const attendee = {
    id:        crypto.randomUUID(),
    meetingId: req.params.meetingId,
    userId,
    role,
    status:    'pending',
    invitedAt: new Date(),
  }
  attendees.push(attendee)
  res.status(201).json({ attendee })
})

// ─── RSVP ────────────────────────────────────
router.patch('/:meetingId/attendees/rsvp', (req, res) => {
  const { status } = req.body
  if (!['accepted', 'declined', 'tentative'].includes(status)) {
    return res.status(400).json({ error: 'status must be accepted, declined or tentative' })
  }
  const attendee = attendees.find(a => a.meetingId === req.params.meetingId && a.userId === (req as any).userId)
  if (!attendee) return res.status(404).json({ error: 'Not invited to this meeting' })
  attendee.status    = status
  attendee.updatedAt = new Date()
  res.json({ attendee })
})

// ─── Meeting notes ───────────────────────────
router.post('/:meetingId/notes', (req, res) => {
  const { content } = req.body
  if (!content) return res.status(400).json({ error: 'content required' })
  const note = {
    id:        crypto.randomUUID(),
    meetingId: req.params.meetingId,
    userId:    (req as any).userId,
    content,
    createdAt: new Date(),
  }
  notes.push(note)
  res.status(201).json({ note })
})

router.get('/:meetingId/notes', (req, res) => {
  const meetingNotes = notes.filter(n => n.meetingId === req.params.meetingId)
  res.json({ notes: meetingNotes })
})

// ─── Cancel meeting ──────────────────────────
router.delete('/:meetingId', (req, res) => {
  const meeting = meetings.find(m => m.id === req.params.meetingId && m.createdBy === (req as any).userId)
  if (!meeting) return res.status(404).json({ error: 'Meeting not found or not yours' })
  meeting.status = 'cancelled'
  res.json({ success: true, meeting })
})

export default router
