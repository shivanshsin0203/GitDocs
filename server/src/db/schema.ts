import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  username:      text('username').unique().notNull(),
  name:          text('name'),
  email:         text('email'),
  avatar:        text('avatar'),
  githubToken:   text('github_token'),   
  grantedScope:  text('granted_scope'),
  createdAt:     timestamp('created_at').defaultNow(),
  updatedAt:     timestamp('updated_at').defaultNow(),
})
