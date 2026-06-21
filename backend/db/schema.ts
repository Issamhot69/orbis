import { pgTable, uuid, varchar, text, timestamp, boolean, integer, real, pgEnum } from 'drizzle-orm/pg-core'

// ─── Enums ───────────────────────────────────
export const orgRoleEnum      = pgEnum('org_role',      ['owner', 'admin', 'member', 'guest'])
export const contractStatusEnum = pgEnum('contract_status', ['draft', 'sent', 'signed', 'active', 'completed', 'cancelled', 'disputed'])
export const paymentStatusEnum  = pgEnum('payment_status',  ['pending', 'processing', 'completed', 'failed', 'refunded'])
export const opportunityStageEnum = pgEnum('opportunity_stage', ['identified', 'qualified', 'proposal', 'negotiation', 'won', 'lost'])

// ─── Users ───────────────────────────────────
export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName:    varchar('first_name', { length: 100 }).notNull(),
  lastName:     varchar('last_name', { length: 100 }).notNull(),
  avatarUrl:    text('avatar_url'),
  resetToken:   varchar('reset_token', { length: 255 }),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  isVerified:   boolean('is_verified').default(false).notNull(),
  isActive:     boolean('is_active').default(true).notNull(),
  lastLoginAt:  timestamp('last_login_at'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
})

// ─── Organizations ───────────────────────────
export const organizations = pgTable('organizations', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        varchar('name', { length: 255 }).notNull(),
  slug:        varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  logoUrl:     text('logo_url'),
  website:     varchar('website', { length: 255 }),
  industry:    varchar('industry', { length: 100 }),
  size:        varchar('size', { length: 50 }),
  isActive:    boolean('is_active').default(true).notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
})

export const orgMembers = pgTable('org_members', {
  id:             uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId:         uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role:           orgRoleEnum('role').default('member').notNull(),
  joinedAt:       timestamp('joined_at').defaultNow().notNull(),
})

// ─── Messaging ───────────────────────────────
export const channels = pgTable('channels', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      varchar('name', { length: 255 }).notNull(),
  orgId:     uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  type:      varchar('type', { length: 50 }).default('public').notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const messages = pgTable('messages', {
  id:        uuid('id').primaryKey().defaultRandom(),
  channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').notNull().references(() => users.id),
  content:   text('content').notNull(),
  type:      varchar('type', { length: 50 }).default('text').notNull(),
  editedAt:  timestamp('edited_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Projects ────────────────────────────────
export const projects = pgTable('projects', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        varchar('name', { length: 255 }).notNull(),
  orgId:       uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  description: text('description'),
  status:      varchar('status', { length: 50 }).default('active').notNull(),
  dueDate:     timestamp('due_date'),
  createdBy:   uuid('created_by').notNull().references(() => users.id),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
})

export const tasks = pgTable('tasks', {
  id:          uuid('id').primaryKey().defaultRandom(),
  projectId:   uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title:       varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  assigneeId:  uuid('assignee_id').references(() => users.id),
  priority:    varchar('priority', { length: 50 }).default('medium').notNull(),
  status:      varchar('status', { length: 50 }).default('todo').notNull(),
  dueDate:     timestamp('due_date'),
  createdBy:   uuid('created_by').notNull().references(() => users.id),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
})

// ─── Memory ──────────────────────────────────
export const memories = pgTable('memories', {
  id:        uuid('id').primaryKey().defaultRandom(),
  orgId:     uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  type:      varchar('type', { length: 100 }),
  title:     varchar('title', { length: 255 }).notNull(),
  content:   text('content').notNull(),
  source:    varchar('source', { length: 100 }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Trust Passport ──────────────────────────
export const trustPassports = pgTable('trust_passports', {
  id:         uuid('id').primaryKey().defaultRandom(),
  orgId:      uuid('org_id').notNull().unique().references(() => organizations.id, { onDelete: 'cascade' }),
  type:       varchar('type', { length: 100 }),
  bio:        text('bio'),
  trustScore: integer('trust_score').default(0).notNull(),
  verified:   boolean('verified').default(false).notNull(),
  createdBy:  uuid('created_by').notNull().references(() => users.id),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
})

// ─── Marketplace ─────────────────────────────
export const listings = pgTable('listings', {
  id:           uuid('id').primaryKey().defaultRandom(),
  orgId:        uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title:        varchar('title', { length: 255 }).notNull(),
  description:  text('description').notNull(),
  categoryId:   varchar('category_id', { length: 50 }).notNull(),
  type:         varchar('type', { length: 100 }).notNull(),
  price:        real('price'),
  currency:     varchar('currency', { length: 10 }).default('USD').notNull(),
  priceType:    varchar('price_type', { length: 50 }),
  remote:       boolean('remote').default(true).notNull(),
  status:       varchar('status', { length: 50 }).default('active').notNull(),
  views:        integer('views').default(0).notNull(),
  saves:        integer('saves').default(0).notNull(),
  createdBy:    uuid('created_by').notNull().references(() => users.id),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
})

// ─── Contracts ───────────────────────────────
export const contracts = pgTable('contracts', {
  id:          uuid('id').primaryKey().defaultRandom(),
  title:       varchar('title', { length: 255 }).notNull(),
  fromOrgId:   uuid('from_org_id').notNull().references(() => organizations.id),
  toOrgId:     uuid('to_org_id').notNull().references(() => organizations.id),
  description: text('description'),
  amount:      real('amount').notNull(),
  currency:    varchar('currency', { length: 10 }).default('USD').notNull(),
  status:      contractStatusEnum('status').default('draft').notNull(),
  startDate:   timestamp('start_date'),
  endDate:     timestamp('end_date'),
  createdBy:   uuid('created_by').notNull().references(() => users.id),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
})

// ─── Payments ────────────────────────────────
export const payments = pgTable('payments', {
  id:          uuid('id').primaryKey().defaultRandom(),
  contractId:  uuid('contract_id').references(() => contracts.id),
  fromOrgId:   uuid('from_org_id').notNull().references(() => organizations.id),
  toOrgId:     uuid('to_org_id').notNull().references(() => organizations.id),
  amount:      real('amount').notNull(),
  currency:    varchar('currency', { length: 10 }).default('USD').notNull(),
  method:      varchar('method', { length: 100 }),
  status:      paymentStatusEnum('status').default('pending').notNull(),
  createdBy:   uuid('created_by').notNull().references(() => users.id),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
})

// ─── Opportunities ───────────────────────────
export const opportunities = pgTable('opportunities', {
  id:          uuid('id').primaryKey().defaultRandom(),
  orgId:       uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title:       varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type:        varchar('type', { length: 100 }),
  value:       real('value'),
  currency:    varchar('currency', { length: 10 }).default('USD').notNull(),
  probability: integer('probability').default(50).notNull(),
  stage:       opportunityStageEnum('stage').default('identified').notNull(),
  createdBy:   uuid('created_by').notNull().references(() => users.id),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
})
