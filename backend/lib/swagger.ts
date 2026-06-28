import swaggerJsdoc from 'swagger-jsdoc'

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ORBIS API',
      version: '2.0.0',
      description: 'One platform. Every business. Everywhere. — API Documentation',
      contact: { name: 'ORBIS Inc', email: 'api@orbis.app', url: 'https://orbis-smoky-gamma.vercel.app' },
      license: { name: 'MIT' },
    },
    servers: [
      { url: 'http://localhost:4080', description: 'Local Development' },
      { url: 'https://orbis-production-6ad0.up.railway.app', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token from /api/auth/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id:          { type: 'string', format: 'uuid' },
            email:       { type: 'string', format: 'email' },
            firstName:   { type: 'string' },
            lastName:    { type: 'string' },
            isVerified:  { type: 'boolean' },
            isActive:    { type: 'boolean' },
            createdAt:   { type: 'string', format: 'date-time' },
          },
        },
        Organization: {
          type: 'object',
          properties: {
            id:          { type: 'string', format: 'uuid' },
            name:        { type: 'string' },
            description: { type: 'string' },
            industry:    { type: 'string' },
            website:     { type: 'string' },
            isActive:    { type: 'boolean' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id:          { type: 'string', format: 'uuid' },
            name:        { type: 'string' },
            description: { type: 'string' },
            status:      { type: 'string', enum: ['active','paused','completed'] },
          },
        },
        Listing: {
          type: 'object',
          properties: {
            id:          { type: 'string', format: 'uuid' },
            title:       { type: 'string' },
            description: { type: 'string' },
            type:        { type: 'string', enum: ['service','product','expertise','partnership'] },
            price:       { type: 'number' },
            currency:    { type: 'string' },
            priceType:   { type: 'string', enum: ['fixed','hourly','monthly','custom'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        Token: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user:  { '$ref': '#/components/schemas/User' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth',          description: 'Authentication — register, login, 2FA, OAuth' },
      { name: 'Profile',       description: 'User profile management' },
      { name: 'Organizations', description: 'Organizations and team management' },
      { name: 'Projects',      description: 'Projects and tasks' },
      { name: 'Marketplace',   description: 'B2B marketplace listings' },
      { name: 'Messages',      description: 'Real-time messaging' },
      { name: 'Contracts',     description: 'Smart contracts' },
      { name: 'Payments',      description: 'Payments and escrow' },
      { name: 'Trust',         description: 'Trust Passport and verification' },
      { name: 'AI',            description: 'AI assistant and predictions' },
      { name: 'Memory',        description: 'Business memory and knowledge base' },
      { name: 'Opportunities', description: 'Deal pipeline and opportunities' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Auth'],
          summary: 'Health check',
          security: [],
          responses: {
            '200': { description: 'API is running', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, version: { type: 'string' }, websocket: { type: 'boolean' } } } } } },
          },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['email','password','firstName','lastName'], properties: { email: { type: 'string', format: 'email', example: 'john@company.com' }, password: { type: 'string', minLength: 6, example: 'secret123' }, firstName: { type: 'string', example: 'John' }, lastName: { type: 'string', example: 'Doe' } } } } },
          },
          responses: {
            '201': { description: 'User created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Token' } } } },
            '409': { description: 'Email already in use' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login and get JWT token',
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['email','password'], properties: { email: { type: 'string', format: 'email', example: 'admin@orbis.com' }, password: { type: 'string', example: 'secret123' } } } } },
          },
          responses: {
            '200': { description: 'Login successful', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Token' } } } },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Profile'],
          summary: 'Get current user profile',
          responses: {
            '200': { description: 'User profile', content: { 'application/json': { schema: { type: 'object', properties: { user: { '$ref': '#/components/schemas/User' } } } } } },
          },
        },
        patch: {
          tags: ['Profile'],
          summary: 'Update current user profile',
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, avatarUrl: { type: 'string' } } } } },
          },
          responses: {
            '200': { description: 'Profile updated' },
          },
        },
      },
      '/api/auth/change-password': {
        post: {
          tags: ['Profile'],
          summary: 'Change password',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['currentPassword','newPassword'], properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 6 } } } } },
          },
          responses: {
            '200': { description: 'Password changed' },
            '401': { description: 'Invalid current password' },
          },
        },
      },
      '/api/auth/forgot-password': {
        post: {
          tags: ['Auth'],
          summary: 'Request password reset link',
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } },
          },
          responses: {
            '200': { description: 'Reset link sent (if email exists)' },
          },
        },
      },
      '/api/auth/reset-password': {
        post: {
          tags: ['Auth'],
          summary: 'Reset password with token',
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['token','newPassword'], properties: { token: { type: 'string' }, newPassword: { type: 'string', minLength: 6 } } } } },
          },
          responses: {
            '200': { description: 'Password reset successfully' },
            '400': { description: 'Invalid or expired token' },
          },
        },
      },
      '/api/organizations': {
        get: {
          tags: ['Organizations'],
          summary: 'List all organizations for current user',
          responses: {
            '200': { description: 'List of organizations', content: { 'application/json': { schema: { type: 'object', properties: { organizations: { type: 'array', items: { '$ref': '#/components/schemas/Organization' } } } } } } },
          },
        },
        post: {
          tags: ['Organizations'],
          summary: 'Create a new organization',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', example: 'ORBIS Corp' }, description: { type: 'string' }, industry: { type: 'string', example: 'Technology' }, website: { type: 'string', example: 'https://orbis.app' } } } } },
          },
          responses: {
            '201': { description: 'Organization created' },
          },
        },
      },
      '/api/projects': {
        get: {
          tags: ['Projects'],
          summary: 'List all projects',
          responses: {
            '200': { description: 'List of projects', content: { 'application/json': { schema: { type: 'object', properties: { projects: { type: 'array', items: { '$ref': '#/components/schemas/Project' } } } } } } },
          },
        },
        post: {
          tags: ['Projects'],
          summary: 'Create a new project',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, description: { type: 'string' }, orgId: { type: 'string', format: 'uuid' } } } } },
          },
          responses: {
            '201': { description: 'Project created' },
          },
        },
      },
      '/api/marketplace/listings': {
        get: {
          tags: ['Marketplace'],
          summary: 'List marketplace listings',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search query' },
            { name: 'categoryId', in: 'query', schema: { type: 'string' }, description: 'Filter by category' },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['service','product','expertise','partnership'] } },
          ],
          responses: {
            '200': { description: 'List of listings', content: { 'application/json': { schema: { type: 'object', properties: { listings: { type: 'array', items: { '$ref': '#/components/schemas/Listing' } } } } } } },
          },
        },
        post: {
          tags: ['Marketplace'],
          summary: 'Create a marketplace listing',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Listing' } } },
          },
          responses: {
            '201': { description: 'Listing created' },
          },
        },
      },
      '/api/messaging': {
        get: {
          tags: ['Messages'],
          summary: 'List all channels',
          responses: { '200': { description: 'Channels list' } },
        },
      },
      '/api/contracts': {
        get: {
          tags: ['Contracts'],
          summary: 'List all contracts',
          responses: { '200': { description: 'Contracts list' } },
        },
      },
      '/api/payments': {
        get: {
          tags: ['Payments'],
          summary: 'List all payments',
          responses: { '200': { description: 'Payments list' } },
        },
      },
      '/api/trust': {
        get: {
          tags: ['Trust'],
          summary: 'Get trust passport score',
          responses: { '200': { description: 'Trust score and verification status' } },
        },
      },
      '/api/ai': {
        post: {
          tags: ['AI'],
          summary: 'Send message to ORBIS AI Assistant',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['message'], properties: { message: { type: 'string', example: 'Analyze my latest deals and suggest improvements' }, context: { type: 'string' } } } } },
          },
          responses: { '200': { description: 'AI response' } },
        },
      },
      '/api/memory': {
        get: {
          tags: ['Memory'],
          summary: 'List business memory entries',
          responses: { '200': { description: 'Memory entries' } },
        },
        post: {
          tags: ['Memory'],
          summary: 'Add a memory entry',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' }, category: { type: 'string' } } } } },
          },
          responses: { '201': { description: 'Memory entry created' } },
        },
      },
      '/api/opportunity': {
        get: {
          tags: ['Opportunities'],
          summary: 'List opportunities pipeline',
          responses: { '200': { description: 'Opportunities list' } },
        },
      },
      '/api/stripe/plans': {
        get: {
          tags: ['Payments'],
          summary: 'Get available subscription plans',
          security: [],
          responses: { '200': { description: 'Plans list with pricing' } },
        },
      },
      '/api/stripe/checkout': {
        post: {
          tags: ['Payments'],
          summary: 'Create Stripe checkout session',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['planId'], properties: { planId: { type: 'string', enum: ['pro','enterprise'], example: 'pro' } } } } },
          },
          responses: { '200': { description: 'Checkout URL or demo response' } },
        },
      },
    },
  },
  apis: [],
})
