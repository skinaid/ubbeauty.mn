"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card } from "@/components/ui";

type EngagementJob = {
  id: string;
  patient_id: string;
  job_type: string;
  channel: string;
  status: string;
  scheduled_for: string;
  patient?: { full_name?: string | null } | null;
};

function getEngagementJobLabel(jobType: string) {
  switch (jobType) {
    case "appointment_reminder_24h":
      return "Appointment reminder · 24h";
    case "appointment_reminder_2h":
      return "Appointment reminder · 2h";
    case "no_show_recovery_24h":
      return "No-show recovery · 24h";
    case "follow_up_24h":
      return "Follow-up · 24h";
    case "follow_up_7d":
      return "Follow-up · 7d";
    default:
      return jobType;
  }
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "succeeded":
      return "success" as const;
    case "failed":
      return "danger" as const;
    case "running":
      return "warning" as const;
    default:
      return "info" as const;
  }
}

export function EngagementJobsPanel({
  title,
  jobs,
  limit = 6
}: {
  title: string;
  jobs: EngagementJob[];
  limit?: number;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "queued" | "succeeded">("all");
  const [channelFilter, setChannelFilter] = useState<"all" | "sms" | "call_task">("all");

  const filteredJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return jobs
      .filter((job) => {
        const matchesQuery =
          normalized.length === 0 ||
          (job.patient?.full_name ?? "").toLowerCase().includes(normalized) ||
          getEngagementJobLabel(job.job_type).toLowerCase().includes(normalized);
        const matchesStatus = statusFilter === "all" || job.status === statusFilter;
        const matchesChannel = channelFilter === "all" || job.channel === channelFilter;
        return matchesQuery && matchesStatus && matchesChannel;
      })
      .slice(0, limit);
  }, [channelFilter, jobs, limit, query, statusFilter]);

  return (
    <Card padded stack>
      <h2 className="ui-section-title" style={{ marginTop: 0 }}>
        {title}
      </h2>

      <div style={{ display: "grid", gap: "0.55rem" }}>
        <input
          className="ui-input"
          placeholder="Patient эсвэл automation хайх"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div
          style={{
            display: "grid",
            gap: "0.5rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))"
          }}
        >
          <select
            className="ui-input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="all">All status</option>
            <option value="queued">Queued</option>
            <option value="succeeded">Succeeded</option>
          </select>

          <select
            className="ui-input"
            value={channelFilter}
            onChange={(event) => setChannelFilter(event.target.value as typeof channelFilter)}
          >
            <option value="all">All channels</option>
            <option value="sms">SMS</option>
            <option value="call_task">Call task</option>
          </select>
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <p style={{ margin: 0 }}>Тохирох reminder/follow-up job алга байна.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "var(--space-3)" }}>
          {filteredJobs.map((job) => (
            <li key={job.id} className="ui-card ui-card--padded ui-card--stack">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                <strong>{job.patient?.full_name ?? "Patient"}</strong>
                <Badge variant={getStatusBadgeVariant(job.status)}>{job.status}</Badge>
              </div>
              <span className="ui-text-muted">
                {getEngagementJobLabel(job.job_type)} · {job.channel}
              </span>
              <span className="ui-text-muted">{new Date(job.scheduled_for).toLocaleString("mn-MN")}</span>
              <Link href={`/patients/${job.patient_id}`} className="ui-table__link">
                Patient CRM
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
