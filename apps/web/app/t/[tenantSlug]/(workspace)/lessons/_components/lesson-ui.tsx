import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatIsoDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type LessonStatus = "scheduled" | "completed" | "cancelled" | "no_show";

function statusClasses(status: string): string {
  switch (status as LessonStatus) {
    case "completed":
      return "border-primary/20 bg-primary/10 text-primary";
    case "cancelled":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    case "no_show":
      return "border-secondary-foreground/15 bg-secondary text-secondary-foreground";
    case "scheduled":
    default:
      return "border-border bg-muted text-foreground";
  }
}

export function LessonStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
        statusClasses(status),
        className,
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function LessonPageHeader({
  title,
  description,
  backHref,
  backLabel = "Lessons",
  actions,
}: {
  title: string;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {backHref ? (
        <Button variant="link" asChild className="h-auto w-fit justify-start p-0">
          <Link href={backHref}>← {backLabel}</Link>
        </Button>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <div className="text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

function LessonMetaItem({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function LessonSummaryCard({
  startsAt,
  endsAt,
  status,
  studentLabel,
  subjectLabel,
  tutorLabel,
  notes,
}: {
  startsAt: string;
  endsAt: string;
  status: string;
  studentLabel: string;
  subjectLabel: string;
  tutorLabel: string;
  notes?: string | null;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3 border-b bg-muted/30">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Schedule</CardTitle>
            <CardDescription>
              {formatIsoDateTime(startsAt)} → {formatIsoDateTime(endsAt)}
            </CardDescription>
          </div>
          <LessonStatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <dl className="grid gap-4 sm:grid-cols-2">
        <LessonMetaItem label="Student" value={studentLabel} />
        <LessonMetaItem label="Subject" value={subjectLabel} />
        <LessonMetaItem label="Tutor" value={tutorLabel} />
        <LessonMetaItem
          label="Notes"
          className="sm:col-span-2"
          value={
            notes && notes.trim() !== "" ? (
              <span className="whitespace-pre-wrap">{notes}</span>
            ) : (
              <span className="text-muted-foreground">No notes added.</span>
            )
          }
        />
        </dl>
      </CardContent>
    </Card>
  );
}
