# ReachInbox – Full-Stack Email Job Scheduler

A production-oriented full-stack email scheduling system built for the ReachInbox Software Development Intern Assignment.

The application accepts email scheduling requests, stores them in PostgreSQL, schedules persistent jobs through BullMQ and Redis, sends emails through Ethereal SMTP, indexes email data in Elasticsearch, enforces configurable sending limits, sends Slack notifications when the rate limit is reached, and provides a Next.js dashboard with Google OAuth authentication.

The project is structured as a monorepo containing the Express/TypeScript backend and Next.js/TypeScript frontend.

---

## Project Overview

This project implements a reliable email scheduling workflow:

User → Google Login → Dashboard → Compose Email → Backend API → PostgreSQL + BullMQ/Redis → Worker → Rate Limiting/Spacing → Ethereal SMTP → Elasticsearch → Slack Notification

The scheduler uses BullMQ delayed jobs rather than cron jobs.

Scheduled jobs remain persisted in Redis, while email state is stored in PostgreSQL. This allows future scheduled jobs to continue after backend or worker restarts without rebuilding the schedule from the beginning.

The system also uses an idempotency check before sending so an email already marked as SENT is not sent again.

---

## Technology Stack

### Frontend

- Next.js 16
- React
- TypeScript
- Tailwind CSS
- Lucide React
- NextAuth/Auth.js
- Google OAuth

### Backend

- Node.js
- TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- BullMQ
- Redis
- Nodemailer
- Ethereal Email
- Elasticsearch
- Slack integration
- Bull Board

### Infrastructure

- Docker
- PostgreSQL
- Redis
- Elasticsearch
- GitHub
- Vercel for frontend hosting

---

## Main Features

### Authentication

The frontend implements real Google OAuth authentication.

After successful Google authentication, the user is redirected to the dashboard.

The dashboard displays:

- User name
- User email
- Google profile avatar
- Logout option

Unauthenticated users are redirected to the login page.

Authentication is implemented using Auth.js/NextAuth and Google OAuth credentials.

---

## Dashboard

The authenticated dashboard provides a simple email-management interface containing:

- Scheduled Emails
- Sent Emails
- Compose New Email
- Email search
- User profile information
- Logout

The UI is implemented with Next.js, TypeScript and Tailwind CSS.

The frontend uses reusable components and typed API data structures.

---

## Compose New Email

The compose interface allows the user to provide:

- Recipient email address
- Subject
- Email body
- Scheduled start time
- Delay between emails
- Hourly sending limit
- CSV/text lead input

CSV/text lead processing detects email addresses and displays the number of detected recipients.

The frontend sends scheduling requests to the Express backend.

---

## Scheduled Emails

The dashboard displays scheduled emails with:

- Recipient
- Subject
- Scheduled time
- Status

Loading and empty states are handled in the frontend.

---

## Sent Emails

The dashboard displays sent email information including:

- Recipient
- Subject
- Sent time
- Status

The UI also handles loading and empty states.

---

## Search

Email records are indexed in Elasticsearch after successful sending.

The backend exposes an email search endpoint that allows searching indexed emails by relevant content such as:

- Recipient
- Subject
- Body

Example:

GET /emails/search?q=Slack

This provides searchable sent email data rather than relying only on database queries.

---

## Backend Scheduling Architecture

The backend accepts a scheduling request through the Express API.

The request is stored in PostgreSQL using Prisma.

A delayed BullMQ job is then created using the email's scheduled time.

The job contains the database email ID rather than duplicating the complete email object.

Example workflow:

1. Client sends POST /emails.
2. Express validates and stores the email in PostgreSQL.
3. BullMQ creates a delayed job.
4. Redis persists the queue state.
5. Worker receives the job when the scheduled time arrives.
6. Worker loads the email from PostgreSQL.
7. Worker checks idempotency.
8. Worker obtains a Redis-backed send slot.
9. Worker waits for the required spacing when necessary.
10. Worker sends the email using Ethereal SMTP.
11. PostgreSQL status is updated to SENT.
12. The email is indexed in Elasticsearch.
13. Slack notification is sent when configured and required.
14. BullMQ marks the job as completed.

No cron job is used.

---

## Persistence and Restart Behavior

The scheduler is designed so that future scheduled emails are not lost when the backend or worker is restarted.

BullMQ uses Redis as the persistent queue backend.

Email state is stored in PostgreSQL.

The scheduled job contains the database email ID and its delayed execution time.

Therefore:

- Future delayed jobs remain in Redis.
- Email records remain in PostgreSQL.
- Restarting the API does not recreate the schedule from scratch.
- Restarting the worker does not require manually rescheduling future jobs.
- The worker retrieves the email from PostgreSQL when the BullMQ job becomes available.

This architecture separates durable application state from queue execution state.

---

## Idempotency

The worker performs an idempotency check before sending.

If an email is already marked as:

SENT

the worker skips the email instead of sending it again.

This prevents duplicate delivery if a job is retried or recovered after an interruption.

The queue job ID is also based on the email ID:

email-{emailId}

This provides a stable job identity for scheduled email jobs.

---

## Worker Concurrency

The BullMQ worker uses configurable concurrency.

The value is controlled through:

WORKER_CONCURRENCY

Example:

WORKER_CONCURRENCY=5

The worker can therefore process multiple jobs concurrently while the Redis-backed send-slot mechanism controls the actual sending rate.

Example worker configuration:

5 concurrent jobs

Concurrency can be changed through environment configuration without changing the worker implementation.

---

## Minimum Delay Between Emails

A minimum delay is enforced between individual email sends.

The configured default is:

2 seconds

The delay is implemented using a Redis-backed send-slot mechanism.

The worker obtains a send slot before sending.

If another worker has already reserved a later slot, the current worker waits until its assigned send time.

This prevents multiple concurrent workers from bypassing the global spacing requirement.

The delay can be configured through:

MIN_DELAY_BETWEEN_EMAILS_MS

Example:

MIN_DELAY_BETWEEN_EMAILS_MS=2000

This means the system attempts to maintain at least two seconds between individual sends.

---

## Hourly Rate Limiting

The scheduler also implements a configurable hourly email limit.

Example:

MAX_EMAILS_PER_HOUR=200

The hourly count is stored in Redis rather than only in process memory.

The Redis keys track the sending state across workers.

This allows multiple worker processes to coordinate around the same sending limit.

When the hourly limit is reached, the system does not intentionally drop the email.

The worker uses retry/rescheduling behavior so that the job can become available again when sending is permitted.

The implementation therefore avoids relying on an in-memory counter that would reset when a worker restarts.

---

## Rate Limit Notification

When the sending limit is reached, the application can notify the connected Slack workspace.

Slack integration is designed to be optional.

If a Slack connection is not configured:

- Email processing continues.
- No Slack notification is attempted.
- The absence of Slack does not crash the worker.

When Slack is connected, the backend sends a live Slack notification when the configured sending limit is reached.

The notification can include information such as:

- Email ID
- Recipient
- Subject
- Rate-limit event

Slack connection state is handled dynamically so a reconnect does not require redeploying the application.

---

## Slack Integration

The dashboard provides a Slack connection flow.

The intended flow is:

User → Connect Slack → Slack OAuth → Backend → Store Slack authorization information → Send notifications when required

The backend notification service is separated from the email worker so notification logic is not mixed directly into SMTP implementation.

---

## Ethereal Email

Ethereal Email is used as the fake SMTP provider required by the assignment.

Nodemailer connects to the Ethereal SMTP server.

Successful email sends return an Ethereal message ID.

Example worker output:

Email 19 sent successfully
Message ID: <example-message-id@ethereal.email>

Ethereal is used for testing and demonstration instead of sending real production emails.

---

## Elasticsearch

After a successful email send, the updated email record is indexed in Elasticsearch.

This allows the application to provide searchable email history.

The indexing workflow is:

PostgreSQL → Email SENT → Elasticsearch Index

Search requests are handled through the backend search service.

---

## BullMQ Dashboard

Bull Board provides a live interface for monitoring the BullMQ queue.

The backend exposes the Bull Board interface at:

http://localhost:5000/admin/queues

The dashboard can be used to inspect:

- Waiting jobs
- Active jobs
- Delayed jobs
- Completed jobs
- Failed jobs

This is useful for debugging and for demonstrating the scheduler behavior during the assignment demo.

---

## API Endpoints

### Get all emails

GET /emails

Returns stored email records.

### Get an email

GET /emails/:id

Returns a specific email.

### Create a scheduled email

POST /emails

Example request:

{
  "recipient": "test@example.com",
  "subject": "Test Email",
  "body": "Testing the scheduler",
  "scheduledAt": "2026-08-30T10:00:00.000Z"
}

### Update an email

PUT /emails/:id

Updates email information and scheduled time.

### Delete an email

DELETE /emails/:id

Deletes an email record.

### Search emails

GET /emails/search?q=Slack

Searches indexed email data through Elasticsearch.

---

## Environment Variables

Environment files are intentionally not committed to GitHub.

Create the required environment files locally.

### Backend environment

Example backend configuration:

DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/email_scheduler

REDIS_HOST=localhost
REDIS_PORT=6379

ELASTICSEARCH_URL=http://localhost:9200

SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-user
SMTP_PASS=your-ethereal-password
SMTP_FROM=your-verified-ethereal-address

WORKER_CONCURRENCY=5

MIN_DELAY_BETWEEN_EMAILS_MS=2000

MAX_EMAILS_PER_HOUR=200

SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=your-slack-redirect-uri

### Frontend environment

Create:

frontend/.env.local

Example:

AUTH_SECRET=your-auth-secret
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
NEXT_PUBLIC_API_URL=http://localhost:5000

Real credentials must never be committed to the repository.

---

## Local Setup

### 1. Clone the repository

git clone <YOUR_GITHUB_REPOSITORY_URL>

cd Email_Scheduler

---

### 2. Backend setup

cd backend

Install dependencies:

npm install

Configure the backend environment variables.

Start the Express server:

npx tsx src/index.ts

The API will run on:

http://localhost:5000

Bull Board:

http://localhost:5000/admin/queues

---

### 3. Start the BullMQ worker

Open another terminal:

cd backend

npx tsx src/workers/email.worker.ts

Expected output:

Email worker started with concurrency: 5

---

### 4. Run database, Redis and Elasticsearch

The project uses Docker for infrastructure services.

Start the configured Docker services using the project's Docker configuration.

Verify Redis is running.

Verify PostgreSQL is running.

Verify Elasticsearch is running.

---

### 5. Frontend setup

Open another terminal:

cd frontend

Install dependencies:

npm install

Create:

.env.local

Add the required Google OAuth and backend API variables.

Start the Next.js development server:

npm run dev

The frontend will be available at:

http://localhost:3000

---

## Frontend Authentication Flow

The frontend authentication flow is:

http://localhost:3000/login

↓

Continue with Google

↓

Google OAuth

↓

Authenticated session

↓

Dashboard

The dashboard displays the authenticated user's:

- Name
- Email
- Avatar

A logout action is also provided.

---

## Frontend Folder Structure

The frontend is organized around the Next.js App Router.

frontend/

├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   ├── dashboard/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   └── reusable dashboard components
│   │
│   ├── lib/
│   │   └── frontend utility code
│   │
│   └── auth.ts
│
├── public/
├── package.json
└── tsconfig.json

---

## Backend Folder Structure

backend/

├── src/
│   ├── index.ts
│   ├── routes/
│   │   └── email.routes.ts
│   ├── queue/
│   │   └── email.queue.ts
│   ├── workers/
│   │   └── email.worker.ts
│   ├── services/
│   │   ├── send-spacing.service.ts
│   │   ├── search/
│   │   │   └── elasticsearch.service.ts
│   │   └── notifications/
│   │       └── slack.service.ts
│   └── lib/
│       ├── prisma.ts
│       └── redis.ts
│
├── prisma/
├── package.json
└── tsconfig.json

---

## Complete System Architecture

The application consists of the following components:

Browser / Next.js Frontend

↓

Google OAuth Authentication

↓

Next.js Dashboard

↓

Express.js API

↓

PostgreSQL
Stores email records and status

↓

BullMQ

↓

Redis
Stores delayed jobs, queue state, send-slot state and rate-limit counters

↓

BullMQ Worker

↓

Redis-backed concurrency/rate-control logic

↓

Ethereal SMTP
Sends the email

↓

PostgreSQL
Updates status to SENT

↓

Elasticsearch
Indexes the sent email

↓

Slack
Sends notification when the configured rate limit is reached

Bull Board connects to BullMQ/Redis to provide live queue visibility.

---

## Behavior Under Load

The design supports a large number of scheduled emails, including 1000+ emails scheduled around the same time.

All jobs can be placed into the persistent BullMQ queue.

The worker processes jobs according to the configured concurrency.

The Redis-backed send-slot mechanism ensures that concurrent workers cannot simply send all messages simultaneously.

The minimum spacing between sends is preserved.

The hourly Redis counter prevents the configured hourly limit from being exceeded.

When the hourly limit is reached, additional jobs are delayed/retried instead of being permanently discarded.

This allows the queue to absorb bursts while the sending layer controls the actual throughput.

---

## Restart Scenario

The application is designed to support restart recovery.

Example:

1. Schedule an email for a future time.
2. Confirm the job appears as DELAYED in Bull Board.
3. Stop the backend/worker.
4. Wait.
5. Start the backend again.
6. Start the worker again.
7. BullMQ retrieves the persisted delayed job.
8. The worker processes the job when it becomes available.
9. The email is sent.
10. PostgreSQL is updated to SENT.
11. Elasticsearch is updated.
12. The completed job appears in Bull Board.

The system does not require the user to recreate future scheduled jobs after a restart.

---

## Error Handling and Retries

BullMQ jobs can use retry attempts with backoff.

Temporary failures can therefore be retried instead of immediately losing the email job.

The worker resets the email state appropriately when a send attempt fails.

Completed jobs are marked by BullMQ and successful email records are marked SENT in PostgreSQL.

---

## Type Safety

The backend and frontend are implemented using TypeScript.

Type checking can be performed with:

Backend:

npx tsc --noEmit

Frontend:

npx tsc --noEmit

The frontend also uses typed interfaces for API data and component properties.

---

## Frontend Build Verification

The production frontend build can be tested using:

cd frontend

npm run build

A successful build confirms that the Next.js application compiles and its TypeScript checks pass.

---

## Backend Verification

Backend TypeScript validation:

cd backend

npx tsc --noEmit

Expected result:

No TypeScript errors.

---

## Demo

The assignment demo video is included in the repository:

demo/EMAIL_SCHEDULER_DEMO1.mp4

The demonstration covers the implemented email scheduler workflow and application functionality.

For the final submission, the same video can also be uploaded to Loom or Google Drive and its shareable link can be submitted in the assignment form.

---

## Suggested Demo Flow

The complete demonstration can be presented in the following order:

1. Show the GitHub repository.
2. Start PostgreSQL, Redis and Elasticsearch.
3. Start the Express backend.
4. Start the BullMQ worker.
5. Open Bull Board.
6. Open the Next.js frontend.
7. Demonstrate Google Login.
8. Show the authenticated dashboard.
9. Compose an email.
10. Schedule the email.
11. Show the delayed job in Bull Board.
12. Wait for the scheduled time.
13. Show the worker processing the job.
14. Show the email becoming SENT.
15. Show the email in the dashboard.
16. Demonstrate Elasticsearch search.
17. Demonstrate send spacing/rate limiting.
18. Demonstrate Slack notification when configured.
19. Demonstrate restart persistence.
20. Show the final GitHub repository.

---

## Deployment

### Frontend

The Next.js frontend is designed to be deployed on Vercel.

Production environment variables must be configured in the Vercel project.

The Google OAuth production callback URL must be configured in Google Cloud Console to match the deployed application URL.

The production frontend API URL must point to the deployed backend rather than:

http://localhost:5000

---

### Backend

The Express API, BullMQ worker and infrastructure services require a persistent server/environment.

The backend requires:

- PostgreSQL
- Redis
- Elasticsearch
- SMTP configuration
- Slack OAuth configuration
- Persistent worker process

The worker must remain running for queued jobs to be processed.

The API and worker can be deployed as separate services when required.

---

## Security

Secrets are not committed to GitHub.

The repository ignores:

.env
.env.local
.env.production
node_modules
.next
build
dist

OAuth secrets, SMTP credentials, database credentials, Redis credentials and Slack credentials must be configured through environment variables.

For production deployment, credentials should be stored using the hosting provider's environment-variable/secret management system.

---

## GitHub Repository

The repository contains:

- Backend source code
- Frontend source code
- Infrastructure configuration
- Database/Prisma configuration
- Demo video
- Documentation

The repository is intended to be used as the submission repository for the ReachInbox assignment.

---

## Assignment Requirement Mapping

The implementation covers the major assignment requirements:

Backend:

- TypeScript
- Express.js
- PostgreSQL
- Prisma
- Redis
- BullMQ
- Delayed job scheduling
- No cron jobs
- Ethereal SMTP
- Multiple concurrent workers
- Configurable worker concurrency
- Minimum delay between email sends
- Redis-backed hourly rate limiting
- Retry/backoff behavior
- Idempotency
- Elasticsearch indexing and search
- Bull Board
- Slack notification integration
- Restart persistence

Frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Real Google OAuth
- Login page
- Protected dashboard
- User name/email/avatar
- Logout
- Scheduled Emails
- Sent Emails
- Compose New Email
- CSV/text email lead detection
- Scheduling time
- Send delay configuration
- Hourly limit configuration
- Loading states
- Empty states
- Basic error handling
- Search interface
- Reusable components

Submission:

- GitHub repository
- Assignment demo video
- README documentation
- Architecture documentation
- Setup instructions
- Deployment instructions
- Demo workflow
- Restart scenario
- Rate-limit behavior documentation

---

## Assumptions and Trade-offs

This project is designed as an assignment-scale production-oriented implementation rather than a complete commercial email platform.

Ethereal Email is intentionally used instead of a production email provider because the assignment requires fake SMTP.

The global Redis-backed rate limit provides a simple coordination model for multiple workers.

The minimum send delay is implemented through Redis-backed send-slot reservation rather than relying exclusively on BullMQ's limiter.

The application prioritizes reliable scheduling, persistence, idempotency and clear queue behavior over implementing a complete multi-tenant email platform.

Slack notification is optional and does not prevent email processing when Slack is disconnected.

Production deployment requires persistent infrastructure for PostgreSQL, Redis, Elasticsearch and the BullMQ worker.

---

## License

This project was developed as an original implementation for the own benefit and to learn technologies

The implementation is not copied from another submission or repository.