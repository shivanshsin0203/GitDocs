import { pgTable, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core'

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

export const projects = pgTable('projects', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:         text('user_id').notNull()
                    .references(() => users.id, { onDelete: 'cascade' }),
  repoOwner:      text('repo_owner').notNull(),
  repoName:       text('repo_name').notNull(),
  displayName:    text('display_name'),
  description:    text('description'),
  language:       text('language'),
  readmeMarkdown: text('readme_markdown'),
  status:         text('status').notNull(),
  errorMessage:   text('error_message'),
  prUrl:          text('pr_url'),
  prNumber:       integer('pr_number'),
  prStatus:       text('pr_status'),
  prCheckedAt:    timestamp('pr_checked_at'),
  createdAt:      timestamp('created_at').defaultNow(),
  updatedAt:      timestamp('updated_at').defaultNow(),
})
