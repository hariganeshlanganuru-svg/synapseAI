# Enterprise Knowledge Assistant with Email Automation
# Part 8 — Development Roadmap, UI Blueprint & AI Agent Implementation Rules

> This document tells the AI coding agent exactly HOW to build the project step-by-step.

---

# 1. Development Philosophy

This project must feel like an enterprise SaaS application.

Never build placeholder pages.

Every page should contain

- Professional layout
- Real functionality
- Modern animations
- Error handling
- Loading states
- Empty states
- Responsive design

---

# 2. Development Phases

The project should be developed in the following order.

Phase 1

Authentication

↓

Supabase

↓

RBAC

↓

Dashboard Layout

↓

Navigation

---

Phase 2

Knowledge Base

↓

Document Upload

↓

OCR

↓

Chunking

↓

Embeddings

↓

Pinecone

---

Phase 3

Enterprise Chatbot

↓

Semantic Search

↓

LLM

↓

Streaming Response

↓

Conversation History

↓

Citations

---

Phase 4

SMTP Email

↓

Templates

↓

AI Generator

↓

SMTP

↓

History

---

Phase 5

Role Dashboards

Employee

HR

Manager

Admin

---

Phase 6

Analytics

↓

Charts

↓

Reports

↓

Monitoring

---

Phase 7

Testing

↓

Optimization

↓

Deployment

---

# 3. UI Theme

Theme

Modern Enterprise

Style

Glassmorphism

Rounded Corners

24px Radius

Gradient Cards

Floating Panels

Blur Background

Dark Theme

Light Theme

Animated Background

---

# 4. Color Palette

Primary

#6D5DF6

Secondary

#7C3AED

Accent

#06B6D4

Success

#22C55E

Warning

#F59E0B

Danger

#EF4444

Background

#09090B

Card

rgba(255,255,255,0.08)

---

# 5. Typography

Headings

Inter Bold

Body

Inter Regular

Numbers

JetBrains Mono

---

# 6. Components

Create reusable components.

Examples

AI Card

Stats Card

Dashboard Card

Search Bar

Sidebar

Header

Chat Bubble

Email Card

Analytics Card

Knowledge Card

Notification Card

File Upload

Data Table

Modal

Chart

Workflow Card

Timeline

Progress Card

Empty State

Loader

Toast

Avatar

Badge

---

# 7. Pages

Authentication

Login

Register

Forgot Password

Reset Password

---

Employee

Dashboard

AI Chat

Knowledge Base

Email Assistant

My Documents

Tasks

Learning Hub

Bookmarks

Settings

---

HR

Dashboard

Recruitment

Employees

Policies

Training

Analytics

Document Generator

SMTP

---

Manager

Dashboard

Projects

Approvals

Meetings

Decision Center

Performance

Reports

Email

---

Admin

Dashboard

Users

Roles

Permissions

Prompt Studio

AI Models

SMTP

Knowledge Base

Analytics

Audit Logs

Security

---

# 8. AI Chat UI

The chat interface should include

Floating AI Assistant

Conversation Sidebar

Source Citations

Confidence Badge

Typing Animation

Streaming Text

Regenerate Button

Copy Button

Bookmark Button

Download Button

Feedback Buttons

Voice Placeholder

Suggested Questions

---

# 9. Email UI

Generate

↓

Preview

↓

Edit

↓

Attachments

↓

SMTP

↓

Delivery

↓

History

Display

Subject

Recipient

Preview

HTML Preview

Send Button

Status

Delivery Logs

---

# 10. Dashboard Widgets

Every dashboard should contain

Quick Actions

Recent Activity

AI Insights

Charts

Notifications

Recent Chats

Recent Emails

KPIs

Announcements

Search

---

# 11. Charts

Bar

Line

Area

Pie

Donut

Radar

Heatmap

Timeline

---

# 12. Animations

Page Transition

Card Hover

Sidebar Collapse

Chart Loading

Typing Indicator

Progress Bars

Toast

Notification Slide

Button Ripple

Smooth Scroll

---

# 13. AI Coding Rules

Always

Use reusable components.

Never duplicate code.

Keep business logic separated.

Use service layer.

Use repository pattern.

Use dependency injection.

Keep API modular.

Follow SOLID principles.

---

# 14. Folder Naming

Use

kebab-case

for folders

PascalCase

for components

camelCase

for functions

UPPER_CASE

for constants

---

# 15. Code Quality

Use

ESLint

Prettier

TypeScript Strict Mode

Pydantic Validation

SQLAlchemy ORM

Environment Variables

Logging

Error Handling

---

# 16. Performance

Lazy Loading

Dynamic Imports

Code Splitting

Caching

Image Optimization

Streaming

Pagination

Memoization

Debouncing

Virtualization

---

# 17. Accessibility

Keyboard Support

ARIA Labels

Screen Reader

High Contrast

Focus Indicators

Color Contrast

Responsive Layout

---

# 18. Responsive Design

Desktop

Laptop

Tablet

Mobile

Every screen should adapt automatically.

---

# 19. AI Prompt Rules

The AI should

Never hallucinate.

Always cite documents.

Always respect RBAC.

Always explain confidence.

Always recommend related documents.

Never expose confidential information.

---

# 20. Final Goal

The completed application should look like a commercial enterprise product similar to

Microsoft Copilot

Notion AI

Atlassian Intelligence

ServiceNow

Salesforce Einstein

Google Vertex AI Search

The application should impress recruiters, software engineers, and hiring managers by demonstrating modern AI architecture, scalable engineering, enterprise UX, secure design, and practical business workflows.

---

# END OF PART 8