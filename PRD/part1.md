# Enterprise Knowledge Assistant with Email Automation
## Part 1 — Master Product Vision, Architecture, Design System & Global Application Rules

> This document is written for an AI coding agent (Antigravity).
>
> Your objective is to build a production-quality enterprise web application that looks like a premium SaaS platform rather than a student project.
>
> The application must feel comparable to Microsoft Copilot, Notion AI, Atlassian Intelligence, Slack AI, and enterprise knowledge management systems.
>
> Every screen must be responsive, modern, animated, accessible, and professionally designed.

---

# 1. Project Name

Enterprise Knowledge Assistant with Email Automation

---

# 2. Project Goal

Build an AI-powered internal enterprise knowledge platform that enables employees to retrieve company knowledge through Retrieval-Augmented Generation (RAG), automate internal communication using SMTP email automation, and securely manage organizational information through role-based access control.

The system should serve as the organization's central AI assistant, allowing users to search documents, interact with an intelligent chatbot, automate emails, generate summaries, monitor organizational insights, and manage enterprise resources.

This is NOT a simple chatbot.

It is an Enterprise AI Operating System.

---

# 3. Primary Objectives

The application must:

- Reduce time spent searching documents.
- Centralize enterprise knowledge.
- Improve employee productivity.
- Automate repetitive communication.
- Secure company information.
- Provide department-specific AI assistants.
- Deliver explainable AI responses.
- Maintain complete audit logs.
- Enable intelligent document management.
- Scale to thousands of users.

---

# 4. Technology Stack

Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Shadcn UI
- Lucide Icons

Backend

- FastAPI

Database

- PostgreSQL (Supabase)

Authentication

- Supabase Auth

Vector Database

- Pinecone

Embedding Model

- llama-text-embed-v2

Large Language Model

- Llama 3.3 70B Instruct

Email

- SMTP

Storage

- Supabase Storage

Deployment

- Vercel
- Railway / Render

---

# 5. Core Modules

The application consists of these major modules:

- Authentication
- Dashboard
- AI Chat
- Knowledge Base
- Semantic Search
- Document Management
- Email Automation
- Analytics
- Notifications
- Conversation History
- User Management
- Role Management
- AI Monitoring
- Settings

---

# 6. User Roles

There are four completely different portals.

Employee

HR

Manager

Admin

Each role has:

- unique dashboard
- unique navigation
- unique chatbot permissions
- unique document access
- unique analytics
- unique workflows

Users must NEVER see features they do not have permission to access.

---

# 7. Login Flow

User opens website

↓

Login

↓

Authentication

↓

Role Detection

↓

Load User Permissions

↓

Load Dashboard

↓

Load Chatbot Context

↓

Ready

---

# 8. Authentication Requirements

Support

Email & Password

Google Login

Microsoft Login

Password Reset

Remember Me

Session Management

JWT Authentication

Protected Routes

Role Validation

---

# 9. Design Philosophy

The application should look like a premium AI SaaS platform.

Design Keywords

Glassmorphism

Minimal

Elegant

Enterprise

Futuristic

Professional

Fast

Clean

Responsive

Animated

---

# 10. Color Palette

Primary

Purple

Indigo

Blue

Accent

Cyan

Background

Dark Gradient

Cards

Glassmorphism

Borders

Soft White

Hover

Glow Animation

---

# 11. Typography

Headings

Bold

Large

Modern

Body

Readable

Professional

Buttons

Rounded

Medium Weight

---

# 12. UI Style

Every page should include:

Rounded Cards

Blur Effects

Animated Charts

Modern Tables

Gradient Buttons

Floating Widgets

Hover Effects

Micro Animations

Skeleton Loaders

Empty States

Smooth Page Transitions

Sticky Sidebar

Sticky Header

Floating Search

Responsive Layout

---

# 13. Sidebar

Every role has a left sidebar.

Contains

Logo

Navigation

Workspace

Notifications

Profile

Settings

Logout

Sidebar should collapse.

---

# 14. Header

Top Header contains

Global Search

AI Assistant Button

Notifications

Profile

Theme Toggle

Workspace Switcher

---

# 15. Dashboard Layout

Each dashboard contains

Header

Analytics Cards

Charts

Activity Timeline

Quick Actions

AI Recommendations

Recent Activity

Recent Conversations

Notifications

Footer

---

# 16. Global Search

Global Search searches

Documents

Chats

Policies

Employees

Reports

Emails

Announcements

FAQs

Search should be semantic.

Not keyword only.

---

# 17. AI Chat Assistant

The AI chatbot is the heart of the application.

It should:

Answer questions

Search documents

Summarize files

Generate emails

Explain policies

Retrieve reports

Compare documents

Answer with citations

Answer only from authorized documents.

Never hallucinate.

---

# 18. RAG Workflow

User asks question

↓

Embedding generated

↓

Pinecone Search

↓

Relevant Chunks Retrieved

↓

Prompt Created

↓

LLM

↓

Answer Generated

↓

Sources Added

↓

Conversation Stored

---

# 19. AI Response Format

Every response must display

Answer

Confidence Score

Retrieved Documents

Similarity Score

Document Version

Last Updated Date

Citations

Copy Button

Export Button

Feedback Buttons

---

# 20. SMTP Email Workflow

User opens Email Assistant

↓

Types Prompt

↓

AI Generates Email

↓

Preview

↓

User Edits

↓

Select Recipient

↓

SMTP Sends Email

↓

Success Notification

↓

Conversation Logged

---

# 21. Notifications

Real-time notifications.

Examples

New Policy

Meeting Reminder

Document Updated

Email Sent

Task Assigned

Approval Received

Knowledge Updated

---

# 22. Conversation History

Store

Question

Answer

Sources

Time

Department

User

Email Generated

Downloads

Feedback

---

# 23. Explainable AI

Every answer should explain

Why this answer?

Where information came from?

Which documents were used?

How confident is AI?

---

# 24. File Support

PDF

DOCX

TXT

CSV

Excel

PowerPoint

Markdown

Images (OCR)

---

# 25. AI Features

Built-in AI capabilities

Summarization

Translation

Document Comparison

Email Writing

Policy Explanation

Meeting Notes

Text Extraction

Knowledge Search

Question Answering

Document Recommendations

---

# 26. Security

RBAC

JWT

Encrypted Passwords

Audit Logs

Rate Limiting

Session Timeout

Role Validation

Secure File Access

---

# 27. Accessibility

Keyboard Navigation

Screen Reader Support

High Contrast

Responsive Design

WCAG Compliance

---

# 28. Performance

Lazy Loading

Streaming AI Responses

Pagination

Virtualized Tables

Optimized Images

Caching

Fast Search

---

# 29. Global AI Widgets

Recent Conversations

AI Suggestions

Quick Actions

Knowledge Updates

Announcements

Pinned Documents

Bookmarks

Learning Recommendations

Favorite Chats

Recent Emails

---

# 30. AI Personality

The assistant should behave like an enterprise knowledge expert.

It should be

Professional

Helpful

Accurate

Friendly

Secure

Transparent

Never fabricate information.

If information cannot be found:

Say

"I could not find sufficient information in the company's knowledge base."

Then recommend related documents.

---

# 31. Project Quality Requirements

The application should feel like a commercial enterprise SaaS product.

Every page must include

Loading States

Animations

Error Handling

Success Messages

Empty States

Responsive Layout

Modern UI

Professional Icons

Consistent Design

No placeholder-looking pages.

Every screen should appear fully designed and production-ready.

---

# END OF PART 1

Next document:

Part 2 — Employee Portal (Complete Feature Specification, UI, AI Chat, SMTP Workflow, Pages, Components, APIs, and User Journey)