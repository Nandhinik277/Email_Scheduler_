import type { EmailCreatePayload, EmailRecord } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const errorMessage = await response.text();
    throw new Error(errorMessage || "Something went wrong while contacting the server.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: T = await response.json();
  return payload;
}

export async function getEmails(): Promise<EmailRecord[]> {
  return request<EmailRecord[]>("/emails");
}

export async function searchEmails(query: string): Promise<EmailRecord[]> {
  const value = encodeURIComponent(query.trim());
  return request<EmailRecord[]>(`/emails/search?q=${value}`);
}

export async function createEmail(payload: EmailCreatePayload): Promise<EmailRecord> {
  return request<EmailRecord>("/emails", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export { API_URL };
