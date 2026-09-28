'use strict'

const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set.')
    process.exit(1)
}

/**
 * Socket.IO path aligned with REST base `/api/v1` (same segment as NEXT_PUBLIC_API_URL).
 * Client: base URL = origin only, e.g. `http://51.21.160.131:3001`
 * with `path: '/api/v1/support-tickets/socket.io'`.
 */
const SUPPORT_SOCKET_PATH = '/api/v1/support-tickets/socket.io'

/**
 * If the client URL includes a pathname (e.g. Postman uses the full URL as "server URL"),
 * socket.io-client treats that pathname as the **namespace**. We register the same handlers
 * on this namespace so those clients still connect. Prefer namespace `/` in production apps.
 */
const POSTMAN_STYLE_NAMESPACE = '/api/v1/support-tickets/socket.io'

/**
 * @param {import('http').Server} httpServer
 */
/** @type {import('socket.io').Server | null} */
let _io = null

/** Return the live Socket.IO server (available after `attachSupportWebSocket`). */
function getSupportIO() {
    return _io
}

function attachSupportWebSocket(httpServer) {
    const SupportTicketService = require('./services/SupportTicketService').default
    const { SupportMessageSenderType } = require('./models/SupportTicketMessageModel')

    const io = new Server(httpServer, {
        path: SUPPORT_SOCKET_PATH,
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    })

    io.use((socket, next) => {
        try {
            const raw =
                socket.handshake.auth?.token ??
                socket.handshake.query?.token ??
                socket.handshake.query?.auth
            const token = Array.isArray(raw) ? raw[0] : raw
            if (!token || typeof token !== 'string') {
                next(new Error('token required'))
                return
            }
            const decoded = jwt.verify(token, JWT_SECRET)
            socket.data.user = {
                id: decoded.id,
                role: decoded.role,
                email: decoded.email,
            }
            next()
        } catch (_e) {
            next(new Error('invalid token'))
        }
    })

    const ticketRoom = (ticketId) => `ticket:${ticketId}`

    /**
     * @param {import('socket.io').Socket} socket
     * @param {{ id: string, role?: string, email?: string }} user
     * @param {object} payload
     * @param {((response: object) => void) | undefined} ack
     */
    async function handleJoin(socket, user, payload, ack) {
        const ticketId = payload?.ticketId || payload?.ticket_id
        if (!ticketId || typeof ticketId !== 'string') {
            const err = { message: 'ticketId required' }
            socket.emit('ticket_error', err)
            if (typeof ack === 'function') {
                ack({ ok: false, ...err })
            }
            return
        }
        try {
            await SupportTicketService.getTicketForParticipant(ticketId, user)
            const prev = socket.data.supportTicketId
            if (prev) {
                socket.leave(ticketRoom(prev))
            }
            socket.join(ticketRoom(ticketId))
            socket.data.supportTicketId = ticketId
            const response = { ticketId }
            socket.emit('joined', response)
            if (typeof ack === 'function') {
                ack({ ok: true, ...response })
            }
        } catch (err) {
            const e = { message: err.message || 'join failed' }
            socket.emit('ticket_error', e)
            if (typeof ack === 'function') {
                ack({ ok: false, ...e })
            }
        }
    }

    /**
     * @param {import('socket.io').Socket} socket
     */
    function onSupportConnection(socket) {
        const user = socket.data.user
        const nsp = socket.nsp

        socket.on('join_room', (payload, ack) => {
            handleJoin(socket, user, payload, ack)
        })

        socket.on('join_ticket', (payload, ack) => {
            handleJoin(socket, user, payload, ack)
        })

        socket.on('send_message', async (payload, ack) => {
            const ticketId = socket.data.supportTicketId
            if (!ticketId) {
                const err = { message: 'join_ticket or join_room first' }
                socket.emit('ticket_error', err)
                if (typeof ack === 'function') {
                    ack({ ok: false, ...err })
                }
                return
            }
            const text = payload?.text
            if (typeof text !== 'string' || !text.trim()) {
                const err = { message: 'text required' }
                socket.emit('ticket_error', err)
                if (typeof ack === 'function') {
                    ack({ ok: false, ...err })
                }
                return
            }
            const attachmentUrls = Array.isArray(payload?.attachmentUrls)
                ? payload.attachmentUrls.filter((u) => typeof u === 'string')
                : []

            const role = user.role
            const senderType =
                role === 'admin' || role === 'superadmin' || role === 'subadmin'
                    ? SupportMessageSenderType.SUPPORT
                    : SupportMessageSenderType.USER

            try {
                const message = await SupportTicketService.addMessage({
                    ticketId,
                    senderType,
                    senderId: user.id,
                    body: text,
                    attachmentUrls,
                    actor: { id: user.id, role },
                })

                const formatted = SupportTicketService.formatMessage(message)
                nsp.to(ticketRoom(ticketId)).emit('receive_message', {
                    message: formatted,
                })
                if (typeof ack === 'function') {
                    ack({ ok: true, message: formatted })
                }
            } catch (err) {
                const e = { message: err.message || 'send failed' }
                socket.emit('ticket_error', e)
                if (typeof ack === 'function') {
                    ack({ ok: false, ...e })
                }
            }
        })
    }

    io.of('/').on('connection', onSupportConnection)
    io.of(POSTMAN_STYLE_NAMESPACE).on('connection', onSupportConnection)

    _io = io

    console.log(
        `Socket.IO (support tickets): path ${SUPPORT_SOCKET_PATH}; namespaces "/" and "${POSTMAN_STYLE_NAMESPACE}" (Postman-style URL). App: io('http://host:3001', { path: '${SUPPORT_SOCKET_PATH}', auth: { token } })`
    )
}

module.exports = { attachSupportWebSocket, getSupportIO }
