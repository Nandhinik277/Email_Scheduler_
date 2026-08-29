export type EmailStatus = "PENDING" | "PROCESSING" | "SENT" | "FAILED";

export interface EmailRecord {
  id: number;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: EmailStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface EmailCreatePayload {
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
}
