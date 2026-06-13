# JobCommit Design System

## Project Overview

**JobCommit** is a job application tracking platform for people applying across multiple job boards, company websites, LinkedIn, emails, and cold outreach channels.

The product should feel:

* Professional
* Focused
* Reliable
* Calm
* Productivity-driven
* Slightly motivational, but not playful

The visual identity should communicate  **commitment, follow-up discipline, career progress, and application clarity** .

JobCommit is not just a to-do app. It is a structured job search command center where users can track applications, schedule reminders, send follow-up emails, and manage job-search momentum.

---

# Tech Stack

* Framework: **TanStack Start**
* UI Styling: **Tailwind CSS v4**
* Font: **Plus Jakarta Sans**
* Theme System: CSS variables with Tailwind v4 `@theme`
* Theme Modes: Light theme and dark theme
* Design Style: Modern SaaS dashboard, clean cards, strong hierarchy, subtle gradients, and low visual noise

---

# Brand Font

Use **Plus Jakarta Sans** as the primary font.

## Font Setup

Recommended import in the root CSS file:

```css
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");
```

Font usage:

```css
body {
  font-family: var(--font-sans);
}
```

Tailwind v4 theme token:

```css
@theme {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
}
```

## Font Weight Usage

| Use Case                      | Weight |
| ----------------------------- | -----: |
| Body text                     |    400 |
| Secondary labels              |    500 |
| Buttons                       |    600 |
| Section headings              |    700 |
| Hero headings / major numbers |    800 |

---

# Core Brand Colors

These are the selected primary colors for JobCommit.

```css
--primary-50:  #EEF2FF;
--primary-100: #E0E7FF;
--primary-200: #C7D2FE;
--primary-500: #6366F1;
--primary-600: #4F46E5;
--primary-700: #4338CA;
--primary-900: #312E81;
```

## Primary Color Usage

| Token           | Usage                                       |
| --------------- | ------------------------------------------- |
| `primary-50`  | Very light background, soft selected states |
| `primary-100` | Light badges, subtle hover states           |
| `primary-200` | Soft borders, icon backgrounds              |
| `primary-500` | Secondary brand actions, gradients          |
| `primary-600` | Main CTA buttons                            |
| `primary-700` | CTA hover, active sidebar item              |
| `primary-900` | Strong text, dark brand surfaces            |

The main brand action color should be:

```css
#4F46E5
```

Use it for:

* Primary buttons
* Active navigation
* Main dashboard highlights
* Reminder CTAs
* Email follow-up actions
* Focus states

---

# Semantic Color System

The app should not directly use raw colors everywhere. Use semantic tokens like `background`, `card`, `foreground`, `primary`, `success`, `warning`, and `danger`.

This keeps the design consistent and makes dark mode easier to maintain.

---

# Light Theme

Light theme should feel clean, focused, and professional.

```css
:root {
  /* Brand */
  --primary-50: #EEF2FF;
  --primary-100: #E0E7FF;
  --primary-200: #C7D2FE;
  --primary-500: #6366F1;
  --primary-600: #4F46E5;
  --primary-700: #4338CA;
  --primary-900: #312E81;

  /* Base */
  --background: #F8FAFC;
  --foreground: #0F172A;

  /* Surfaces */
  --card: #FFFFFF;
  --card-foreground: #0F172A;
  --popover: #FFFFFF;
  --popover-foreground: #0F172A;

  /* Borders */
  --border: #E2E8F0;
  --input: #E2E8F0;
  --ring: #6366F1;

  /* Text */
  --muted: #64748B;
  --muted-foreground: #64748B;
  --subtle: #94A3B8;

  /* Primary */
  --primary: #4F46E5;
  --primary-foreground: #FFFFFF;
  --primary-hover: #4338CA;
  --primary-soft: #EEF2FF;

  /* Secondary */
  --secondary: #F1F5F9;
  --secondary-foreground: #334155;
  --secondary-hover: #E2E8F0;

  /* Status */
  --success: #10B981;
  --success-soft: #ECFDF5;
  --success-foreground: #065F46;

  --warning: #F59E0B;
  --warning-soft: #FFFBEB;
  --warning-foreground: #92400E;

  --danger: #EF4444;
  --danger-soft: #FEF2F2;
  --danger-foreground: #991B1B;

  --info: #0EA5E9;
  --info-soft: #EFF6FF;
  --info-foreground: #075985;

  /* Layout */
  --sidebar: #FFFFFF;
  --sidebar-foreground: #334155;
  --sidebar-active: #EEF2FF;
  --sidebar-active-foreground: #4338CA;

  /* Radius */
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.25rem;
}
```

---

# Dark Theme

Dark theme should feel premium, calm, and dashboard-friendly. Avoid pure black because JobCommit will have tables, cards, reminders, and long user sessions.

Use deep slate backgrounds with violet accents.

```css
.dark {
  /* Brand */
  --primary-50: #EEF2FF;
  --primary-100: #E0E7FF;
  --primary-200: #C7D2FE;
  --primary-500: #818CF8;
  --primary-600: #6366F1;
  --primary-700: #4F46E5;
  --primary-900: #312E81;

  /* Base */
  --background: #020617;
  --foreground: #F8FAFC;

  /* Surfaces */
  --card: #0F172A;
  --card-foreground: #F8FAFC;
  --popover: #0F172A;
  --popover-foreground: #F8FAFC;

  /* Borders */
  --border: #1E293B;
  --input: #334155;
  --ring: #818CF8;

  /* Text */
  --muted: #94A3B8;
  --muted-foreground: #94A3B8;
  --subtle: #64748B;

  /* Primary */
  --primary: #818CF8;
  --primary-foreground: #020617;
  --primary-hover: #6366F1;
  --primary-soft: rgba(99, 102, 241, 0.14);

  /* Secondary */
  --secondary: #1E293B;
  --secondary-foreground: #CBD5E1;
  --secondary-hover: #334155;

  /* Status */
  --success: #34D399;
  --success-soft: rgba(16, 185, 129, 0.14);
  --success-foreground: #A7F3D0;

  --warning: #FBBF24;
  --warning-soft: rgba(245, 158, 11, 0.14);
  --warning-foreground: #FDE68A;

  --danger: #F87171;
  --danger-soft: rgba(239, 68, 68, 0.14);
  --danger-foreground: #FECACA;

  --info: #38BDF8;
  --info-soft: rgba(14, 165, 233, 0.14);
  --info-foreground: #BAE6FD;

  /* Layout */
  --sidebar: #020617;
  --sidebar-foreground: #CBD5E1;
  --sidebar-active: rgba(99, 102, 241, 0.16);
  --sidebar-active-foreground: #C7D2FE;

  /* Radius */
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.25rem;
}
```

---

# Tailwind CSS v4 Setup

Add this to the main CSS file, for example:

```css
@import "tailwindcss";

@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");

@theme {
  /* Font */
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;

  /* Brand colors */
  --color-primary-50: var(--primary-50);
  --color-primary-100: var(--primary-100);
  --color-primary-200: var(--primary-200);
  --color-primary-500: var(--primary-500);
  --color-primary-600: var(--primary-600);
  --color-primary-700: var(--primary-700);
  --color-primary-900: var(--primary-900);

  /* Semantic colors */
  --color-background: var(--background);
  --color-foreground: var(--foreground);

  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);

  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);

  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-subtle: var(--subtle);

  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-hover: var(--primary-hover);
  --color-primary-soft: var(--primary-soft);

  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary-hover: var(--secondary-hover);

  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-success-foreground: var(--success-foreground);

  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-warning-foreground: var(--warning-foreground);

  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --color-danger-foreground: var(--danger-foreground);

  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
  --color-info-foreground: var(--info-foreground);

  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-active: var(--sidebar-active);
  --color-sidebar-active-foreground: var(--sidebar-active-foreground);

  /* Radius */
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
}
```

---

# Base Styles

```css
@layer base {
  * {
    border-color: var(--border);
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    min-height: 100vh;
    background: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans);
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  ::selection {
    background: var(--primary-200);
    color: var(--primary-900);
  }

  .dark ::selection {
    background: var(--primary-700);
    color: white;
  }
}
```

---

# Design Hierarchy

## 1. Primary Actions

Primary actions should use the brand violet.

Examples:

* Add Job
* Add Follow-up
* Send Email
* Create Reminder
* Mark as Applied
* Move to Interview

Class example:

```tsx
className="bg-primary text-primary-foreground hover:bg-primary-hover"
```

## 2. Secondary Actions

Secondary actions should be neutral and calm.

Examples:

* Cancel
* Save as Draft
* View Details
* Filter
* Export

Class example:

```tsx
className="bg-secondary text-secondary-foreground hover:bg-secondary-hover"
```

## 3. Destructive Actions

Use red only when the action is truly destructive.

Examples:

* Delete Application
* Remove Email Template
* Clear Reminder

Class example:

```tsx
className="bg-danger text-white hover:opacity-90"
```

---

# Dashboard Design Idea

The dashboard should answer one question quickly:

> “What should I do next in my job search?”

The dashboard should prioritize pending actions over static data.

## Dashboard Sections

### 1. Today’s Follow-ups

Show jobs where the user needs to send a second email, cold email, or follow-up.

Use warning color for due reminders.

### 2. Application Summary

Show quick numbers:

* Total applied
* Waiting response
* Interview stage
* Rejected
* Follow-ups due

### 3. Application Pipeline

A horizontal or kanban-style status view:

```txt
Saved → Applied → Follow-up → Interview → Offer → Rejected
```

### 4. Recent Activity

Show timeline-style updates:

* Applied to Frontend Developer at Company A
* Follow-up email sent
* Interview scheduled
* Reminder created

---

# Application Status Colors

Use status colors consistently.

```txt
Saved:        Neutral / Slate
Applied:      Primary Violet
Follow-up:    Amber
Interview:    Info Blue
Offer:        Success Green
Rejected:     Danger Red
Archived:     Muted Gray
```

Suggested classes:

```tsx
const statusStyles = {
  saved: "bg-secondary text-secondary-foreground",
  applied: "bg-primary-soft text-primary",
  followUp: "bg-warning-soft text-warning-foreground",
  interview: "bg-info-soft text-info-foreground",
  offer: "bg-success-soft text-success-foreground",
  rejected: "bg-danger-soft text-danger-foreground",
  archived: "bg-secondary text-muted-foreground",
}
```

---

# Component Style Direction

## Cards

Cards should be clean, rounded, and lightly bordered.

```tsx
className="rounded-xl border border-border bg-card text-card-foreground shadow-sm"
```

Use cards for:

* Stats
* Job application preview
* Reminder item
* Email template
* Activity timeline block

## Buttons

Buttons should be rounded but not overly soft.

```tsx
className="rounded-lg font-semibold transition-colors"
```

Recommended button height:

```txt
Small: 36px
Default: 40px
Large: 44px
```

## Inputs

Inputs should feel clear and easy to scan.

```tsx
className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
```

## Tables

Tables are important for job tracking.

Recommended columns:

```txt
Company
Role
Platform
Status
Applied Date
Next Follow-up
Priority
Actions
```

Table rows should have subtle hover states.

```tsx
className="hover:bg-secondary/70"
```

## Badges

Badges should be compact and status-driven.

```tsx
className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
```

---

# Visual Style

## Overall Look

JobCommit should look like a serious productivity tool with modern startup polish.

Use:

* Clean white/light surfaces in light mode
* Deep slate surfaces in dark mode
* Violet primary actions
* Soft status badges
* Rounded cards
* Clear spacing
* Minimal shadows
* Strong readable typography

Avoid:

* Too many gradients
* Too many colors
* Heavy shadows
* Decorative illustrations everywhere
* Overly playful UI
* Random accent colors

---

# Spacing System

Use consistent spacing.

```txt
Page padding: 24px to 32px
Card padding: 20px to 24px
Section gap: 24px
Form field gap: 16px
Button gap: 8px
Table row height: 56px to 64px
```

Recommended Tailwind examples:

```tsx
className="p-6"
className="gap-4"
className="space-y-6"
className="grid gap-6"
```

---

# Border Radius System

```txt
Small elements: 8px
Buttons / Inputs: 10px to 12px
Cards: 16px
Large panels / modals: 20px
```

Recommended classes:

```tsx
rounded-lg
rounded-xl
rounded-2xl
```

---

# Logo Direction

The JobCommit logo should represent:

* Job progress
* Commit history
* Follow-up discipline
* Career movement
* Application pipeline

Recommended logo concept:

```txt
A circular progress mark with a straight diagonal commit line pointing to the top-right.
The line should include two commit-style dots, inspired by git commit history.
The arrow direction should suggest career progress and forward movement.
```

Color usage:

```txt
Icon: Primary violet gradient using #4F46E5, #6366F1, #312E81
Text: Job in #312E81, Commit in #4F46E5 or #6366F1
```

---

# Recommended Page Concepts

## Landing Page

The landing page should focus on clarity and conversion.

Main message:

```txt
Track every job application. Never miss a follow-up.
```

Supporting message:

```txt
JobCommit helps you organize applications, schedule reminders, and stay consistent with follow-up emails across every job platform.
```

Primary CTA:

```txt
Start Tracking Jobs
```

Secondary CTA:

```txt
View Demo
```

## Dashboard Page

The dashboard should focus on pending actions.

Main priority:

```txt
What needs my attention today?
```

Important widgets:

* Follow-ups due today
* Applications waiting for response
* Recent job activity
* Upcoming interviews
* Weekly application progress

## Applications Page

This should be the main working area.

Recommended views:

* Table view
* Kanban pipeline view
* Calendar follow-up view

## Follow-up Page

This page should show:

* Due follow-ups
* Overdue follow-ups
* Sent follow-ups
* Cold email reminders
* Email templates

---

# UX Principles

## 1. Action-first Dashboard

Do not make users search for what to do next. Show urgent follow-ups and reminders first.

## 2. Low Cognitive Load

Job search is stressful. The UI should feel organized, calm, and predictable.

## 3. Clear Statuses

Every application should have a clear status and next action.

## 4. Fast Capture

Adding a job should be quick. The form should not feel heavy.

## 5. Follow-up Discipline

The product should encourage users to follow up consistently without feeling spammy.

---

# Suggested Navigation

```txt
Dashboard
Applications
Follow-ups
Cold Emails
Calendar
Analytics
Templates
Settings
```

For MVP, start with:

```txt
Dashboard
Applications
Follow-ups
Templates
Settings
```

---

# MVP Design Priority

Build the MVP around these design priorities:

1. Fast job entry
2. Clear job status
3. Follow-up reminders
4. Email/cold-mail tracking
5. Dashboard showing what needs attention today

Do not overbuild analytics in the first version. Make tracking and follow-up excellent first.

---

# Final Design Direction

JobCommit should feel like:

```txt
Linear + Notion + Git commit history + Job application CRM
```

The product should be clean, focused, and slightly technical, but still friendly for normal job seekers.

The main visual identity is:

```txt
Primary violet brand
Soft slate surfaces
Plus Jakarta Sans typography
Rounded SaaS cards
Status-based badges
Commit-line progress logo
Action-first dashboard
```
