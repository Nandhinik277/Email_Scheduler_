"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Search,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  Loader2,
  Trash2,
} from "lucide-react";

type Email = {
  id: number;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: "PENDING" | "PROCESSING" | "SENT";
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Home() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadEmails() {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/emails`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch emails");
      }

      const data = await response.json();
      setEmails(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function createEmail(e: React.FormEvent) {
    e.preventDefault();

    if (!recipient || !subject || !body || !scheduledAt) {
      alert("Please fill all fields.");
      return;
    }

    try {
      setCreating(true);

      const response = await fetch(`${API_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient,
          subject,
          body,
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create email");
      }

      setRecipient("");
      setSubject("");
      setBody("");
      setScheduledAt("");

      await loadEmails();
    } catch (error) {
      console.error(error);
      alert("Failed to schedule email.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteEmail(id: number) {
    if (!confirm("Delete this email?")) return;

    try {
      const response = await fetch(`${API_URL}/emails/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete email");
      }

      await loadEmails();
    } catch (error) {
      console.error(error);
      alert("Failed to delete email.");
    }
  }

  async function searchEmails() {
    if (!search.trim()) {
      loadEmails();
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/emails/search?q=${encodeURIComponent(search)}`
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setEmails(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmails();
  }, []);

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
              <Mail size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Email Scheduler
              </h1>
              <p className="text-sm text-stone-500">
                Schedule, monitor and manage emails
              </p>
            </div>
          </div>

          <button
            onClick={loadEmails}
            className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-stone-100"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <div className="mb-5 flex items-center gap-2">
              <Plus size={20} />
              <h2 className="text-lg font-semibold">
                Schedule Email
              </h2>
            </div>

            <form onSubmit={createEmail} className="space-y-4">
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                type="email"
                placeholder="Recipient email"
                className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:ring-2 focus:ring-stone-300"
              />

              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:ring-2 focus:ring-stone-300"
              />

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email body"
                rows={5}
                className="w-full resize-none rounded-xl border border-stone-200 px-4 py-3 outline-none focus:ring-2 focus:ring-stone-300"
              />

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Schedule time
                </label>

                <input
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  type="datetime-local"
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:ring-2 focus:ring-stone-300"
                />
              </div>

              <button
                disabled={creating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 font-medium text-white hover:bg-stone-800 disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Plus size={18} />
                )}

                {creating ? "Scheduling..." : "Schedule Email"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Email History
                </h2>

                <p className="text-sm text-stone-500">
                  {emails.length} email(s)
                </p>
              </div>

              <div className="flex">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      searchEmails();
                    }
                  }}
                  placeholder="Search emails..."
                  className="w-full rounded-l-xl border border-stone-200 px-4 py-2 text-sm outline-none sm:w-56"
                />

                <button
                  onClick={searchEmails}
                  className="rounded-r-xl bg-stone-900 px-4 text-white"
                >
                  <Search size={17} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin" />
              </div>
            ) : emails.length === 0 ? (
              <div className="py-16 text-center text-stone-500">
                No emails found.
              </div>
            ) : (
              <div className="space-y-3">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className="rounded-2xl border border-stone-200 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            {email.subject}
                          </span>

                          {email.status === "SENT" && (
                            <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">
                              <CheckCircle2 size={13} />
                              SENT
                            </span>
                          )}

                          {email.status === "PENDING" && (
                            <span className="flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-1 text-xs text-yellow-700">
                              <Clock size={13} />
                              PENDING
                            </span>
                          )}

                          {email.status === "PROCESSING" && (
                            <span className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-xs">
                              <Loader2
                                size={13}
                                className="animate-spin"
                              />
                              PROCESSING
                            </span>
                          )}
                        </div>

                        <p className="truncate text-sm text-stone-600">
                          {email.recipient}
                        </p>

                        <p className="mt-1 text-xs text-stone-400">
                          Scheduled:{" "}
                          {new Date(email.scheduledAt).toLocaleString()}
                        </p>
                      </div>

                      <button
                        onClick={() => deleteEmail(email.id)}
                        className="self-end rounded-xl p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 md:self-auto"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}