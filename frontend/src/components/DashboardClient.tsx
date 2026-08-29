"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";
import { createEmail, getEmails, searchEmails } from "@/lib/api";
import { extractEmailAddresses, parseEmailFile } from "@/lib/email-parser";
import { formatDateTime } from "@/lib/date";
import type { DashboardUser, EmailCreatePayload, EmailRecord, EmailStatus } from "@/lib/types";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  LayoutGrid,
  LogOut,
  Mail,
  PencilLine,
  RefreshCw,
  Search,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

interface DashboardClientProps {
  user: DashboardUser;
}

const tabs = [
  { id: "scheduled", label: "Scheduled Emails", icon: CalendarClock },
  { id: "sent", label: "Sent Emails", icon: Send },
  { id: "compose", label: "Compose New Email", icon: PencilLine },
] as const;

const getStatusVariant = (status: EmailStatus): "default" | "success" | "warning" | "danger" | "muted" => {
  switch (status) {
    case "SENT":
      return "success";
    case "PENDING":
      return "warning";
    case "PROCESSING":
      return "default";
    case "FAILED":
      return "danger";
    default:
      return "muted";
  }
};

export default function DashboardClient({ user }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("scheduled");
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeStartTime, setComposeStartTime] = useState("");
  const [composeDelaySeconds, setComposeDelaySeconds] = useState("2");
  const [hourlyLimit, setHourlyLimit] = useState("200");
  const [detectedEmails, setDetectedEmails] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchEmails = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const data = await getEmails();
      setEmails(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Unable to load emails right now.";
      setError(message.length > 0 ? message : "Unable to load emails right now.");
      setEmails([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchEmails();
  }, []);

  const scheduledEmails = useMemo(
    () => emails.filter((email) => email.status !== "SENT"),
    [emails],
  );
  const sentEmails = useMemo(
    () => emails.filter((email) => email.status === "SENT"),
    [emails],
  );

  const handleSearch = async () => {
    const query = searchTerm.trim();

    if (!query) {
      await fetchEmails();
      setSearchError(null);
      return;
    }

    try {
      setSearchLoading(true);
      setSearchError(null);
      const data = await searchEmails(query);
      setEmails(Array.isArray(data) ? data : []);
    } catch (searchFetchError) {
      const message = searchFetchError instanceof Error ? searchFetchError.message : "Search failed.";
      setSearchError(message.length > 0 ? message : "Search failed.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setIsParsing(true);
      const parsed = await parseEmailFile(file);
      const unique = Array.from(new Set(parsed.map((email) => email.toLowerCase())));
      setDetectedEmails(unique);
    } catch {
      setDetectedEmails([]);
      setScheduleError("Unable to read the uploaded file. Please check the file format and try again.");
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  };

  const handleSchedule = async () => {
    const subject = composeSubject.trim();
    const body = composeBody.trim();
    const startTime = composeStartTime.trim();

    if (!subject) {
      setScheduleError("Please enter a subject.");
      return;
    }

    if (!body) {
      setScheduleError("Please enter the email body.");
      return;
    }

    if (!startTime) {
      setScheduleError("Please choose a start time.");
      return;
    }

    if (detectedEmails.length === 0) {
      setScheduleError("Please add at least one email address.");
      return;
    }

    const delaySeconds = Number(composeDelaySeconds);
    const parsedLimit = Number(hourlyLimit);

    if (Number.isNaN(delaySeconds) || delaySeconds < 0) {
      setScheduleError("Delay between emails must be zero or greater.");
      return;
    }

    if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
      setScheduleError("Hourly limit must be greater than zero.");
      return;
    }

    try {
      setIsScheduling(true);
      setScheduleMessage(null);
      setScheduleError(null);

      const startDate = new Date(startTime);
      if (Number.isNaN(startDate.getTime())) {
        setScheduleError("The selected start time is invalid.");
        return;
      }

      const scheduledRequests: Promise<unknown>[] = [];
      const uniqueTargets = Array.from(new Set(detectedEmails.map((email) => email.trim().toLowerCase()))).filter(Boolean);

      uniqueTargets.forEach((recipient, index) => {
        const scheduledAt = new Date(startDate.getTime() + index * delaySeconds * 1000);
        const payload: EmailCreatePayload = {
          recipient,
          subject,
          body,
          scheduledAt: scheduledAt.toISOString(),
        };

        scheduledRequests.push(createEmail(payload));
      });

      const results = await Promise.allSettled(scheduledRequests);
      const successful = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.filter((result) => result.status === "rejected").length;

      if (failed > 0) {
        setScheduleError(
          `${successful} email jobs created successfully. ${failed} failed to create. Please review the batch and retry failed items.`
        );
      } else {
        setScheduleMessage(`${successful} email jobs scheduled successfully.`);
      }

      setComposeSubject("");
      setComposeBody("");
      setComposeStartTime("");
      setComposeDelaySeconds("2");
      setHourlyLimit("200");
      setDetectedEmails([]);
      setIsComposeOpen(false);
      setActiveTab("scheduled");
      await fetchEmails(false);
    } catch (scheduleFetchError) {
      const message = scheduleFetchError instanceof Error ? scheduleFetchError.message : "Scheduling failed.";
      setScheduleError(message.length > 0 ? message : "Scheduling failed.");
    } finally {
      setIsScheduling(false);
    }
  };

  const activeTable = activeTab === "sent" ? sentEmails : scheduledEmails;

  const tableHeaders = ["Email", "Subject", "Scheduled Time", "Status"];

  const tableRows = activeTable.map((email) => [
    email.recipient,
    email.subject,
    formatDateTime(email.scheduledAt),
    <Badge key={email.id} variant={getStatusVariant(email.status)}>{email.status}</Badge>,
  ]);

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
        <div className="flex min-h-[calc(100vh-3rem)] flex-col lg:flex-row">
          <aside className="w-full border-b border-stone-200 bg-stone-50 p-5 lg:w-72 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-stone-900">Email Scheduler</p>
                <p className="text-xs text-stone-500">Operations dashboard</p>
              </div>
            </div>

            <nav className="mt-8 space-y-2">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    activeTab === id
                      ? "bg-stone-900 text-white"
                      : "text-stone-700 hover:bg-stone-200 hover:text-stone-900"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ))}
            </nav>

            <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-3">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || "User avatar"}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-stone-700">
                    <UserRound className="h-5 w-5" />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-900">{user.name || "User"}</p>
                  <p className="truncate text-xs text-stone-500">{user.email || "No email provided"}</p>
                </div>
              </div>

              <Button
                variant="outline"
                className="mt-4 w-full justify-center rounded-xl border-stone-300 text-stone-700 hover:bg-stone-100"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </aside>

          <div className="flex-1 bg-stone-50 p-6 md:p-8">
            <header className="mb-6 flex flex-col gap-4 border-b border-stone-200 pb-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">Overview</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Dashboard</h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search emails"
                    className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 sm:w-64"
                  />
                </div>

                <Button
                  variant="outline"
                  className="justify-center rounded-xl border-stone-300 text-stone-700 hover:bg-stone-100"
                  onClick={() => void handleSearch()}
                  disabled={searchLoading}
                >
                  {searchLoading ? <Clock3 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>

                <Button
                  variant="outline"
                  className="justify-center rounded-xl border-stone-300 text-stone-700 hover:bg-stone-100"
                  onClick={() => {
                    setSearchTerm("");
                    void fetchEmails();
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </header>

            <section className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">Scheduled</p>
                <p className="mt-3 text-3xl font-semibold text-stone-900">{scheduledEmails.length}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">Sent</p>
                <p className="mt-3 text-3xl font-semibold text-stone-900">{sentEmails.length}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">System</p>
                <div className="mt-3 flex items-center gap-2 text-lg font-semibold text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  Online
                </div>
              </div>
            </section>

            {error && (
              <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {searchError && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {searchError}
              </div>
            )}

            {scheduleMessage && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {scheduleMessage}
              </div>
            )}

            {scheduleError && (
              <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {scheduleError}
              </div>
            )}

            {activeTab === "compose" ? (
              <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-stone-900">Compose New Email</h2>
                    <p className="mt-1 text-sm text-stone-500">Create a campaign schedule across multiple recipients.</p>
                  </div>
                  <Button
                    className="rounded-xl bg-stone-900 px-4 py-2.5 text-white hover:bg-stone-800"
                    onClick={handleSchedule}
                    disabled={isScheduling}
                  >
                    {isScheduling ? <Clock3 className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4" />}
                    {isScheduling ? "Scheduling..." : "Schedule"}
                  </Button>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-stone-700">Subject</label>
                      <input
                        value={composeSubject}
                        onChange={(event) => setComposeSubject(event.target.value)}
                        placeholder="Campaign subject"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-stone-700">Body</label>
                      <Textarea
                        rows={7}
                        value={composeBody}
                        onChange={(event) => setComposeBody(event.target.value)}
                        placeholder="Write your email body here..."
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-stone-700">CSV / text upload</label>
                      <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.txt,text/csv,text/plain"
                          className="hidden"
                          onChange={handleFileSelection}
                        />
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm text-stone-600">
                            <FileText className="h-4 w-4" />
                            Upload recipients
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl border-stone-300 text-stone-700 hover:bg-stone-100"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Browse
                          </Button>
                        </div>
                        {isParsing && <p className="mt-3 text-xs text-stone-500">Parsing email addresses...</p>}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-stone-700">Start time</label>
                        <input
                          type="datetime-local"
                          value={composeStartTime}
                          onChange={(event) => setComposeStartTime(event.target.value)}
                          className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-stone-700">Delay between emails</label>
                        <input
                          type="number"
                          min="0"
                          value={composeDelaySeconds}
                          onChange={(event) => setComposeDelaySeconds(event.target.value)}
                          className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-stone-700">Hourly limit</label>
                      <input
                        type="number"
                        min="1"
                        value={hourlyLimit}
                        onChange={(event) => setHourlyLimit(event.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                      />
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">Detected recipients</p>
                      <p className="mt-2 text-2xl font-semibold text-stone-900">{detectedEmails.length}</p>
                      <p className="text-sm text-stone-500">email addresses detected</p>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-stone-900">
                      {activeTab === "scheduled" ? "Scheduled Emails" : "Sent Emails"}
                    </h2>
                    <p className="text-sm text-stone-500">
                      {activeTab === "scheduled"
                        ? "Campaigns waiting to be sent and processing jobs."
                        : "Delivered email records from completed jobs."}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="justify-center rounded-xl border-stone-300 text-stone-700 hover:bg-stone-100"
                    onClick={() => void fetchEmails()}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Reload
                  </Button>
                </div>

                {loading ? (
                  <div className="flex min-h-48 items-center justify-center text-sm text-stone-600">Loading emails...</div>
                ) : activeTab === "scheduled" && scheduledEmails.length === 0 ? (
                  <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
                    <CalendarClock className="h-10 w-10 text-stone-300" />
                    <p className="mt-4 text-lg font-semibold text-stone-900">No scheduled emails</p>
                    <p className="mt-2 text-sm text-stone-500">Create a new campaign to schedule outgoing email jobs.</p>
                  </div>
                ) : activeTab === "sent" && sentEmails.length === 0 ? (
                  <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
                    <Send className="h-10 w-10 text-stone-300" />
                    <p className="mt-4 text-lg font-semibold text-stone-900">No sent emails yet</p>
                    <p className="mt-2 text-sm text-stone-500">Complete campaigns will appear here once they are sent.</p>
                  </div>
                ) : activeTab === "scheduled" && scheduledEmails.length > 0 ? (
                  <Table headers={tableHeaders} rows={tableRows} />
                ) : activeTab === "sent" && sentEmails.length > 0 ? (
                  <Table headers={tableHeaders} rows={tableRows} />
                ) : (
                  <div className="flex min-h-48 items-center justify-center text-sm text-stone-600">No matching records to show.</div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
