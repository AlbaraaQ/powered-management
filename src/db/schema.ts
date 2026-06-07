import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  decimal,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'supervisor', 'representative', 'client']);
export const visitStatusEnum = pgEnum('visit_status', ['pending', 'in_progress', 'completed', 'cancelled']);
export const photoTypeEnum = pgEnum('photo_type', ['shelf', 'display', 'other']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  role: userRoleEnum('role').notNull().default('representative'),
  avatar: text('avatar'),
  active: boolean('active').notNull().default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Branches table
export const branches = pgTable('branches', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  address: text('address'),
  addressAr: text('address_ar'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  clientId: integer('client_id').references(() => users.id),
  contactName: varchar('contact_name', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Daily assignments table
export const dailyAssignments = pgTable('daily_assignments', {
  id: serial('id').primaryKey(),
  representativeId: integer('representative_id').notNull().references(() => users.id),
  branchId: integer('branch_id').notNull().references(() => branches.id),
  assignmentDate: date('assignment_date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Visits table
export const visits = pgTable('visits', {
  id: serial('id').primaryKey(),
  representativeId: integer('representative_id').notNull().references(() => users.id),
  branchId: integer('branch_id').notNull().references(() => branches.id),
  assignmentId: integer('assignment_id').references(() => dailyAssignments.id),
  checkInTime: timestamp('check_in_time'),
  checkOutTime: timestamp('check_out_time'),
  checkInLat: decimal('check_in_lat', { precision: 10, scale: 8 }),
  checkInLng: decimal('check_in_lng', { precision: 11, scale: 8 }),
  checkOutLat: decimal('check_out_lat', { precision: 10, scale: 8 }),
  checkOutLng: decimal('check_out_lng', { precision: 11, scale: 8 }),
  status: visitStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Visit photos table
export const visitPhotos = pgTable('visit_photos', {
  id: serial('id').primaryKey(),
  visitId: integer('visit_id').notNull().references(() => visits.id, { onDelete: 'cascade' }),
  photoUrl: text('photo_url').notNull(),
  photoType: photoTypeEnum('photo_type').notNull().default('other'),
  caption: varchar('caption', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Shortages table
export const shortages = pgTable('shortages', {
  id: serial('id').primaryKey(),
  visitId: integer('visit_id').notNull().references(() => visits.id, { onDelete: 'cascade' }),
  productName: varchar('product_name', { length: 255 }).notNull(),
  productNameAr: varchar('product_name_ar', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// System settings table
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
  description: varchar('description', { length: 255 }),
  category: varchar('category', { length: 50 }).notNull().default('general'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// AI Chat history table
export const aiChats = pgTable('ai_chats', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  message: text('message').notNull(),
  response: text('response'),
  context: text('context'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  tableName: varchar('table_name', { length: 100 }),
  recordId: integer('record_id'),
  oldValues: text('old_values'),
  newValues: text('new_values'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Notifications table
export const notificationTypeEnum = pgEnum('notification_type', ['info', 'success', 'warning', 'error']);

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull().default('info'),
  title: varchar('title', { length: 255 }).notNull(),
  titleAr: varchar('title_ar', { length: 255 }),
  message: text('message').notNull(),
  messageAr: text('message_ar'),
  link: varchar('link', { length: 500 }),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignments: many(dailyAssignments),
  visits: many(visits),
  branches: many(branches),
  aiChats: many(aiChats),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  client: one(users, {
    fields: [branches.clientId],
    references: [users.id],
  }),
  assignments: many(dailyAssignments),
  visits: many(visits),
}));

export const dailyAssignmentsRelations = relations(dailyAssignments, ({ one, many }) => ({
  representative: one(users, {
    fields: [dailyAssignments.representativeId],
    references: [users.id],
  }),
  branch: one(branches, {
    fields: [dailyAssignments.branchId],
    references: [branches.id],
  }),
  visits: many(visits),
}));

export const visitsRelations = relations(visits, ({ one, many }) => ({
  representative: one(users, {
    fields: [visits.representativeId],
    references: [users.id],
  }),
  branch: one(branches, {
    fields: [visits.branchId],
    references: [branches.id],
  }),
  assignment: one(dailyAssignments, {
    fields: [visits.assignmentId],
    references: [dailyAssignments.id],
  }),
  photos: many(visitPhotos),
  shortages: many(shortages),
}));

export const visitPhotosRelations = relations(visitPhotos, ({ one }) => ({
  visit: one(visits, {
    fields: [visitPhotos.visitId],
    references: [visits.id],
  }),
}));

export const shortagesRelations = relations(shortages, ({ one }) => ({
  visit: one(visits, {
    fields: [shortages.visitId],
    references: [visits.id],
  }),
}));

export const aiChatsRelations = relations(aiChats, ({ one }) => ({
  user: one(users, {
    fields: [aiChats.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
export type DailyAssignment = typeof dailyAssignments.$inferSelect;
export type Shortage = typeof shortages.$inferSelect;
export type VisitPhoto = typeof visitPhotos.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
