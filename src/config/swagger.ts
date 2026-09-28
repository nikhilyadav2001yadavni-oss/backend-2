import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'W-Invest API Documentation',
        version: '1.0.0',
        description: 'Comprehensive API documentation for W-Invest platform - A cryptocurrency investment and gaming platform with MLM referral system. Integrated with Firebase Cloud Messaging (FCM) for push notifications.',
        contact: {
            name: 'W-Invest Support',
            email: 'support@winvest.com',
        },
    },
    servers: [
        {
            url: 'http://localhost:3001',
            description: 'Local (Development)',
        },
        {
            url: 'http://51.21.160.131:3001',
            description: 'Server',
        },
    ],
    tags: [
        {
            name: 'User',
            description: 'User authentication and management endpoints',
        },
        {
            name: 'Wallet',
            description: 'Wallet management, deposits, withdrawals, and transactions',
        },
        {
            name: 'Admin',
            description: 'Admin authentication and management endpoints',
        },
        {
            name: 'Team',
            description: 'Team and referral management endpoints',
        },
        {
            name: 'Notification',
            description: 'Notification management endpoints',
        },
        {
            name: 'Firebase',
            description: 'Firebase Cloud Messaging (FCM) integration for push notifications',
        },
        {
            name: 'Games',
            description: 'Game endpoints for placing bets and playing games',
        },
        {
            name: 'Helper',
            description: 'Helper endpoints for image uploads and utilities',
        },
        {
            name: 'Banner',
            description: 'Banner management endpoints for creating, updating, and deleting banners',
        },
        {
            name: 'ROI',
            description: 'ROI (Return on Investment) management endpoints for investments, earnings, and withdrawals',
        },
        {
            name: 'Cron',
            description: 'Cron job endpoints for automated tasks (ROI calculation, etc.)',
        },
        {
            name: 'Support tickets',
            description:
                'Support ticketing (REST) and Socket.IO realtime chat. Full connection steps, event names, payloads, and responses are documented on GET /api/v1/support-tickets/socket.io; reusable payload schemas are under Components (SupportTicketSocket*).',
        },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your JWT token',
            },
        },
        schemas: {
            User: {
                type: 'object',
                properties: {
                    _id: {
                        type: 'string',
                        example: '60d5ec49f8d2e63a4c8e9a1a',
                    },
                    name: {
                        type: 'string',
                        example: 'John Doe',
                    },
                    email: {
                        type: 'string',
                        example: 'john@example.com',
                    },
                    phone: {
                        type: 'string',
                        example: '+1234567890',
                    },
                    referralCode: {
                        type: 'string',
                        example: 'ABC1234567',
                    },
                    totalReferrals: {
                        type: 'number',
                        example: 5,
                    },
                    wallet: {
                        type: 'object',
                        properties: {
                            mainWallet: {
                                type: 'number',
                                example: 1000,
                            },
                            gamingWallet: {
                                type: 'number',
                                example: 500,
                            },
                            roiWallet: {
                                type: 'number',
                                example: 200,
                            },
                        },
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },
            Transaction: {
                type: 'object',
                properties: {
                    _id: {
                        type: 'string',
                        example: '60d5ec49f8d2e63a4c8e9a1b',
                    },
                    transactionId: {
                        type: 'string',
                        example: 'TXN20251228143025457',
                    },
                    userId: {
                        type: 'string',
                        example: '60d5ec49f8d2e63a4c8e9a1a',
                    },
                    category: {
                        type: 'string',
                        enum: ['DEPOSIT', 'WITHDRAWAL', 'GAME_WIN', 'GAME_LOSE', 'ROI_CREDIT', 'REFERRAL_BONUS'],
                        example: 'DEPOSIT',
                    },
                    status: {
                        type: 'string',
                        enum: ['PENDING', 'COMPLETED', 'FAILED', 'REJECTED'],
                        example: 'COMPLETED',
                    },
                    amount: {
                        type: 'number',
                        example: 100,
                    },
                    currency: {
                        type: 'string',
                        example: 'TRX',
                    },
                    network: {
                        type: 'string',
                        enum: ['TRC20', 'BEP20', 'ERC20', 'POLYGON', 'INTERNAL'],
                        example: 'TRC20',
                    },
                    fee: {
                        type: 'number',
                        example: 2,
                    },
                    netAmount: {
                        type: 'number',
                        example: 98,
                    },
                    fromAddress: {
                        type: 'string',
                        example: 'TX1abc...xyz',
                    },
                    toAddress: {
                        type: 'string',
                        example: 'TX2def...uvw',
                    },
                    transactionHash: {
                        type: 'string',
                        example: '0xabc123...',
                    },
                    blockchainVerified: {
                        type: 'boolean',
                        example: true,
                    },
                    metadata: {
                        type: 'object',
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },
            Currency: {
                type: 'object',
                properties: {
                    _id: {
                        type: 'string',
                    },
                    symbol: {
                        type: 'string',
                        enum: ['TRX', 'BNB', 'ETH', 'SOL'],
                        example: 'TRX',
                    },
                    name: {
                        type: 'string',
                        example: 'Tron',
                    },
                    chain: {
                        type: 'string',
                        enum: ['TRC20', 'BEP20', 'ERC20', 'POLYGON'],
                        example: 'TRC20',
                    },
                    colorCode: {
                        type: 'string',
                        example: '#FF0000',
                        description: 'Hex color code for UI (e.g., #FF0000 or #F00)',
                    },
                    image: {
                        type: 'string',
                        example: 'https://res.cloudinary.com/example/image/upload/v1234567890/currency/trx.png',
                        description: 'URL to currency image/icon',
                    },
                    depositAddress: {
                        type: 'string',
                        example: 'TXYZabcdefghijklmnopqrstuvwxyz123456',
                        description: 'Wallet address for receiving deposits',
                    },
                    minimumDepositAmount: {
                        type: 'number',
                        example: 10,
                    },
                    minimumWithdrawalAmount: {
                        type: 'number',
                        example: 20,
                    },
                    depositFee: {
                        type: 'number',
                        example: 2,
                    },
                    depositFeeType: {
                        type: 'string',
                        enum: ['percentage', 'fixed'],
                        example: 'percentage',
                    },
                    withdrawalFee: {
                        type: 'number',
                        example: 1,
                    },
                    withdrawalFeeType: {
                        type: 'string',
                        enum: ['percentage', 'fixed'],
                        example: 'fixed',
                    },
                    isActive: {
                        type: 'boolean',
                        example: true,
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },
            DirectReferral: {
                type: 'object',
                properties: {
                    _id: {
                        type: 'string',
                        example: '60d5ec49f8d2e63a4c8e9a1b',
                    },
                    name: {
                        type: 'string',
                        example: 'Jane Doe',
                    },
                    totalTeam: {
                        type: 'number',
                        example: 3,
                    },
                    totalEarnings: {
                        type: 'number',
                        example: 150,
                    },
                    allLevelsCommissionRate: {
                        type: 'number',
                        example: 1.5,
                    },
                    directCommissionRate: {
                        type: 'number',
                        example: 3,
                    },
                },
            },
            Banner: {
                type: 'object',
                properties: {
                    _id: {
                        type: 'string',
                        example: '60d5ec49f8d2e63a4c8e9a1a',
                    },
                    title: {
                        type: 'string',
                        example: 'MLM Commissions',
                    },
                    description: {
                        type: 'string',
                        example: 'Earn from referrals across unlimited levels',
                    },
                    imageUrl: {
                        type: 'string',
                        format: 'uri',
                        nullable: true,
                        example: 'https://res.cloudinary.com/example/image/upload/v1234567890/banners/mlm-commissions.png',
                    },
                    link: {
                        type: 'string',
                        format: 'uri',
                        nullable: true,
                        example: 'https://example.com/mlm-commissions',
                    },
                    isActive: {
                        type: 'boolean',
                        example: true,
                    },
                    order: {
                        type: 'number',
                        example: 1,
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },
            SystemConfig: {
                type: 'object',
                properties: {
                    _id: {
                        type: 'string',
                        example: '60d5ec49f8d2e63a4c8e9a1a',
                    },
                    darkMode: {
                        type: 'boolean',
                        example: false,
                        description: 'Enable/disable dark mode',
                    },
                    pushNotification: {
                        type: 'boolean',
                        example: true,
                        description: 'Enable/disable push notifications',
                    },
                    twoFA: {
                        type: 'boolean',
                        example: false,
                        description: 'Enable/disable two-factor authentication',
                    },
                    biometricLogin: {
                        type: 'boolean',
                        example: false,
                        description: 'Enable/disable biometric login',
                    },
                    maintenance: {
                        type: 'boolean',
                        example: false,
                        description: 'Enable/disable maintenance mode',
                    },
                    maintenanceMessage: {
                        type: 'string',
                        nullable: true,
                        example: 'System is under maintenance. Please check back later.',
                        description: 'Optional maintenance message',
                    },
                    supportEmail: {
                        type: 'string',
                        example: 'support@winvest.com',
                        description: 'Support contact email address',
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },
            InvestmentConfig: {
                type: 'object',
                properties: {
                    _id: {
                        type: 'string',
                        example: '60d5ec49f8d2e63a4c8e9a1a',
                    },
                    directCommissionRate: {
                        type: 'number',
                        example: 3,
                        description: 'Direct referral commission rate (%). Used when crediting deposit bonuses to direct referrer.',
                    },
                    indirectCommissionRate: {
                        type: 'number',
                        example: 1.5,
                        description: 'Indirect referral commission rate (%). Used when crediting deposit bonuses to indirect referrer.',
                    },
                    monthlyRoiRate: {
                        type: 'number',
                        example: 8,
                        description: 'Monthly ROI rate (%). Applied daily as compounded return.',
                    },
                    dailyRoiRate: {
                        type: 'number',
                        example: 0.00257,
                        description: 'Computed daily ROI rate (decimal) from monthlyRoiRate. Read-only.',
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },
            SupportTicket: {
                type: 'object',
                properties: {
                    _id: {
                        type: 'string',
                        example: '60d5ec49f8d2e63a4c8e9a1a',
                    },
                    userId: {
                        type: 'string',
                        example: '60d5ec49f8d2e63a4c8e9a1b',
                    },
                    subject: {
                        type: 'string',
                        example: 'Payment not processing',
                    },
                    status: {
                        type: 'string',
                        enum: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
                        example: 'OPEN',
                    },
                    lastMessagePreview: {
                        type: 'string',
                        example: 'I tried twice and it failed.',
                    },
                    lastMessageAt: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },
            SupportTicketMessage: {
                type: 'object',
                description:
                    'Message shape in API responses (REST and WebSocket). Uses string `id` instead of `_id` where formatted.',
                properties: {
                    id: {
                        type: 'string',
                        example: '60d5ec49f8d2e63a4c8e9a1c',
                    },
                    ticketId: {
                        type: 'string',
                        example: '60d5ec49f8d2e63a4c8e9a1a',
                    },
                    senderType: {
                        type: 'string',
                        enum: ['USER', 'SUPPORT'],
                        example: 'USER',
                    },
                    senderId: {
                        type: 'string',
                        example: '60d5ec49f8d2e63a4c8e9a1b',
                    },
                    body: {
                        type: 'string',
                        example: 'Hello, I need help with my deposit.',
                    },
                    attachmentUrls: {
                        type: 'array',
                        items: {
                            type: 'string',
                            format: 'uri',
                        },
                        example: [],
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },
            SupportTicketSocketJoinPayload: {
                type: 'object',
                description: 'Emit on event `join_room` or `join_ticket` (same payload).',
                properties: {
                    ticketId: {
                        type: 'string',
                        example: '674a1b2c3d4e5f6789abcdef',
                    },
                    ticket_id: {
                        type: 'string',
                        description: 'Alias for ticketId',
                    },
                },
            },
            SupportTicketSocketSendPayload: {
                type: 'object',
                description: 'Emit on event `send_message` after joining a ticket room.',
                required: ['text'],
                properties: {
                    text: {
                        type: 'string',
                        example: 'Thanks, that fixed it.',
                    },
                    attachmentUrls: {
                        type: 'array',
                        items: { type: 'string', format: 'uri' },
                        description: 'Optional; image URLs from Helper upload, etc.',
                        example: [],
                    },
                },
            },
            SupportTicketSocketJoinedPayload: {
                type: 'object',
                description: 'Server emits event `joined` after a successful join.',
                properties: {
                    ticketId: {
                        type: 'string',
                        example: '674a1b2c3d4e5f6789abcdef',
                    },
                },
            },
            SupportTicketSocketReceiveMessagePayload: {
                type: 'object',
                description: 'Server broadcasts event `receive_message` to all sockets in the ticket room.',
                properties: {
                    message: {
                        $ref: '#/components/schemas/SupportTicketMessage',
                    },
                },
            },
            SupportTicketSocketTicketErrorPayload: {
                type: 'object',
                description: 'Server emits `ticket_error` for validation or business-rule failures while connected.',
                properties: {
                    message: {
                        type: 'string',
                        example: 'join_ticket or join_room first',
                        description:
                            'Other examples: `text required`, `ticketId required`, `send failed`, `join failed`.',
                    },
                },
            },
            SupportTicketSocketAckJoinOk: {
                type: 'object',
                description: 'Optional acknowledgement callback for join (socket.io-client 3rd argument).',
                properties: {
                    ok: { type: 'boolean', example: true },
                    ticketId: { type: 'string' },
                },
            },
            SupportTicketSocketAckJoinErr: {
                type: 'object',
                properties: {
                    ok: { type: 'boolean', example: false },
                    message: { type: 'string' },
                },
            },
            SupportTicketSocketAckSendOk: {
                type: 'object',
                description: 'Optional acknowledgement for send_message.',
                properties: {
                    ok: { type: 'boolean', example: true },
                    message: { $ref: '#/components/schemas/SupportTicketMessage' },
                },
            },
            SupportTicketSocketAckSendErr: {
                type: 'object',
                properties: {
                    ok: { type: 'boolean', example: false },
                    message: { type: 'string' },
                },
            },
            Error: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: false,
                    },
                    message: {
                        type: 'string',
                        example: 'Error message',
                    },
                    data: {
                        type: 'null',
                        example: null,
                    },
                },
            },
            Success: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: true,
                    },
                    message: {
                        type: 'string',
                        example: 'Success message',
                    },
                    data: {
                        type: 'object',
                    },
                },
            },
            FCMToken: {
                type: 'object',
                properties: {
                    fcmToken: {
                        type: 'string',
                        example: 'dKx8Yz9vWqR:APA91bH...your-fcm-token-here',
                        description: 'Firebase Cloud Messaging token for push notifications',
                    },
                },
                required: ['fcmToken'],
            },
            GameConfig: {
                type: 'object',
                properties: {
                    _id: {
                        type: 'string',
                        example: '60d5ec49f8d2e63a4c8e9a1a',
                    },
                    gameType: {
                        type: 'string',
                        enum: ['COLOR_CHANGER', 'DICE_ROLL'],
                        example: 'COLOR_CHANGER',
                        description: 'Type of game',
                    },
                    gameName: {
                        type: 'string',
                        example: 'Color Changer',
                        description: 'Display name of the game',
                    },
                    maxUserProfit: {
                        type: 'number',
                        example: 25,
                        description: 'Maximum profit user can make',
                    },
                    maxUserLoss: {
                        type: 'number',
                        example: 25,
                        description: 'Maximum loss user can have',
                    },
                    winProbability: {
                        type: 'number',
                        example: 0.4,
                        minimum: 0,
                        maximum: 1,
                        description: 'Win probability (0.0 to 1.0)',
                    },
                    winMultiplier: {
                        type: 'number',
                        example: 2,
                        minimum: 1,
                        description: 'Win multiplier (e.g., 2 = 2x bet amount)',
                    },
                    platformBalanceBuffer: {
                        type: 'number',
                        example: 1.1,
                        minimum: 1,
                        description: 'Platform balance buffer multiplier',
                    },
                    maxSmallWinAmount: {
                        type: 'number',
                        example: 5,
                        description: 'Maximum small win when user hits max loss',
                    },
                    minBetAmount: {
                        type: 'number',
                        example: 1,
                        description: 'Minimum bet amount',
                    },
                    maxBetAmount: {
                        type: 'number',
                        example: 25,
                        description: 'Maximum bet amount',
                    },
                    isActive: {
                        type: 'boolean',
                        example: true,
                        description: 'Whether the game is active/enabled',
                    },
                    metadata: {
                        type: 'object',
                        properties: {
                            description: {
                                type: 'string',
                                example: 'Select a color and place your bet. Win 2x your bet amount!',
                            },
                            rules: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                                example: ['Select one of three colors: RED, GREEN, or BLUE', 'Bet amount must be between 1 and 25'],
                            },
                            notes: {
                                type: 'string',
                                example: 'Additional game information',
                            },
                        },
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },
        },
    },
    externalDocs: {
        description: 'Firebase Cloud Messaging Documentation',
        url: 'https://firebase.google.com/docs/cloud-messaging',
    },
};

const options = {
    swaggerDefinition,
    apis: ['./src/swagger/*.yaml'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;

