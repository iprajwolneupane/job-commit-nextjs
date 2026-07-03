import {
  CheckCircle2,
  FileSearch,
  Gauge,
  Lightbulb,
  XCircle,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { SkillMatchReport } from '@/lib/api'

type JobAnalyzeData = {
  link: string
  data: {
    title: string
    report: SkillMatchReport
  }
}

type JobAnalyzeProps = {
  isLoading: boolean
  data: JobAnalyzeData | null
}

function getRatingTone(rating: SkillMatchReport['rating']) {
  if (rating >= 4) {
    return {
      label: 'Strong match',
      className: 'bg-success-soft text-success-foreground',
      barClassName: 'bg-success',
    }
  }

  if (rating >= 2) {
    return {
      label: 'Partial match',
      className: 'bg-warning-soft text-warning-foreground',
      barClassName: 'bg-warning',
    }
  }

  return {
    label: 'Weak match',
    className: 'bg-danger-soft text-danger-foreground',
    barClassName: 'bg-danger',
  }
}

function SkillList({
  emptyText,
  items,
  tone,
}: {
  emptyText: string
  items: string[]
  tone: 'success' | 'danger'
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className={
            tone === 'success'
              ? 'inline-flex min-h-8 items-center rounded-full border border-success/20 bg-success-soft px-3 py-1 text-xs font-semibold text-success-foreground'
              : 'inline-flex min-h-8 items-center rounded-full border border-danger/20 bg-danger-soft px-3 py-1 text-xs font-semibold text-danger-foreground'
          }
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function JobAnalyzeSkeleton() {
  return (
    <section
      className="border-t pt-6"
      aria-label="Loading job analysis"
      aria-busy="true"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSearch className="size-5 animate-pulse text-primary" />
            <Skeleton className="h-7 w-40" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>

        <div className="grid gap-4 md:grid-cols-[350px_1fr]">
          <div className="rounded-lg border border-border bg-background p-4">
            <Skeleton className="h-4 w-28" />
            <div className="mt-4 flex items-end gap-2">
              <Skeleton className="h-10 w-12" />
              <Skeleton className="mb-1 h-4 w-8" />
            </div>
            <Skeleton className="mt-4 h-2 w-full rounded-full" />
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <Skeleton className="h-4 w-32" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="rounded-lg border border-border bg-background p-4"
            >
              <Skeleton className="h-4 w-32" />
              <div className="mt-4 flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((__, badgeIndex) => (
                  <Skeleton
                    key={badgeIndex}
                    className="h-8 w-24 rounded-full"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <Skeleton className="h-4 w-16" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-8/12" />
          </div>
        </div>
      </div>
    </section>
  )
}

export default function JobAnalyze({ isLoading, data }: JobAnalyzeProps) {
  if (isLoading) {
    return <JobAnalyzeSkeleton />
  }

  if (!data) {
    return null
  }

  const report = data.data.report
  const ratingTone = getRatingTone(report.rating)
  const ratingPercent = (report.rating / 5) * 100

  return (
    <section className="border-t pt-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <FileSearch className="size-5 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">
              Job analyze
            </h2>
          </div>
          <a
            href={data.link}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            View job link
          </a>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Position
          </p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">
            {data.data.title}
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-[350px_1fr]">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Gauge className="size-4 text-primary" />
                Match score
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ratingTone.className}`}
              >
                {ratingTone.label}
              </span>
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-4xl font-bold text-foreground">
                {report.rating}
              </span>
              <span className="pb-1 text-sm font-semibold text-muted-foreground">
                / 5
              </span>
            </div>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"
              role="meter"
              aria-label="Job match score"
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={report.rating}
            >
              <div
                className={`h-full rounded-full ${ratingTone.barClassName}`}
                style={{ width: `${ratingPercent}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <FileSearch className="size-4 text-primary" />
              Analysis summary
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground">
              {report.summary || 'No summary was returned for this report.'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="size-4 text-success" />
              Matched skills
            </div>
            <SkillList
              items={report.matchedSkills}
              tone="success"
              emptyText="No matched skills were found."
            />
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <XCircle className="size-4 text-danger" />
              Missing skills
            </div>
            <SkillList
              items={report.missingSkills}
              tone="danger"
              emptyText="No missing skills were returned."
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb className="size-4 text-warning" />
            Tips
          </div>
          {report.tips.length > 0 ? (
            <ul className="space-y-2 text-sm leading-6 text-foreground">
              {report.tips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tips were returned.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
