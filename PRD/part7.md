# Enterprise Knowledge Assistant with Email Automation
# Part 7 — Database Schema, Deployment Architecture, Development Roadmap & Master AI Agent Instructions

> This document defines the production database architecture, Supabase design, Pinecone index structure, API contracts, deployment strategy, testing approach, CI/CD pipeline, and master development instructions for the Antigravity AI Agent.

---

# 1. Database Overview

The backend uses PostgreSQL (Supabase).

The database must support:

- Multi-role users
- Enterprise authentication
- Document management
- Conversation history
- AI analytics
- SMTP email history
- Audit logging
- Notifications
- Departments
- Projects
- Meetings
- Tasks
- Policies
- Prompt versions
- AI model configuration

The schema must be normalized (3NF).

---

# 2. Database Tables

## Authentication

Users

Roles

Permissions

RolePermissions

Sessions

RefreshTokens

---

## Organization

Departments

Teams

Designations

Managers

OfficeLocations

---

## Documents

Documents

DocumentVersions

DocumentCategories

DocumentTags

DocumentPermissions

DocumentChunks

ChunkMetadata

---

## AI

Conversations

ConversationMessages

ConversationSources

PromptTemplates

PromptVersions

AIModels

EmbeddingLogs

AIAnalytics

KnowledgeRecommendations

---

## Email

EmailTemplates

GeneratedEmails

EmailHistory

SMTPLogs

Attachments

---

## Workflow

Tasks

Projects

Meetings

MeetingSummaries

Announcements

Notifications

Approvals

LeaveRequests

TrainingAssignments

---

## Monitoring

AuditLogs

SystemHealth

ErrorLogs

UsageStatistics

Feedback

KnowledgeGapReports

SecurityEvents

---

# 3. Users Table

Fields

id

employee_id

full_name

email

password_hash

phone

department_id

role_id

manager_id

designation

profile_image

status

created_at

updated_at

last_login

---

# 4. Roles Table

Fields

id

role_name

description

created_at

---

Roles

Employee

HR

Manager

Admin

---

# 5. Permissions Table

Fields

id

permission_name

description

module

---

Examples

VIEW_DOCUMENTS

UPLOAD_DOCUMENTS

DELETE_DOCUMENTS

SEND_EMAIL

VIEW_ANALYTICS

VIEW_USERS

CONFIGURE_AI

CHANGE_PROMPTS

---

# 6. Documents Table

Fields

id

title

description

department

uploaded_by

version

file_url

file_type

size

status

visibility

created_at

updated_at

---

# 7. Document Chunks

Each document should be chunked.

Fields

id

document_id

chunk_text

embedding_id

page_number

chunk_order

metadata

created_at

---

# 8. Pinecone Structure

Index Name

enterprise-knowledge

Namespace

department-name

Metadata

Document ID

Department

Role

Author

Version

Tags

Created Date

Updated Date

Page Number

Confidentiality

---

# 9. Conversation Tables

Conversation

id

user_id

role

department

created_at

---

ConversationMessages

conversation_id

sender

message

tokens

citations

confidence_score

timestamp

---

# 10. Email History

Store

Recipient

Subject

Generated Prompt

Generated Body

SMTP Status

Sent Time

Opened

Delivery Failure

Attachments

---

# 11. Audit Logs

Store

User

Action

Module

Timestamp

Old Value

New Value

Device

IP Address

Browser

Location

Status

---

# 12. Notifications

Fields

id

title

description

user_id

role

department

type

read_status

created_at

---

# 13. Analytics Tables

Track

Daily Active Users

AI Requests

Search Requests

SMTP Usage

Documents Uploaded

Most Asked Questions

Popular Policies

Average Response Time

Average Confidence

---

# 14. Backend Folder Structure

backend/

app/

api/

authentication/

middleware/

database/

models/

schemas/

crud/

rag/

pinecone/

embeddings/

llm/

prompts/

smtp/

notifications/

analytics/

audit/

security/

workflow/

meeting/

documents/

knowledge/

config/

utils/

tests/

---

# 15. Frontend Folder Structure

frontend/

app/

components/

layouts/

features/

hooks/

services/

types/

store/

assets/

animations/

theme/

pages/

utils/

constants/

---

# 16. API Standards

Use REST API.

Response format

Success

Message

Data

Errors

Metadata

Pagination

Example

```

{
"success":true,
"message":"Conversation retrieved",
"data":{},
"errors":[],
"metadata":{}
}

```

---

# 17. API Modules

Authentication

Documents

Chat

Knowledge Search

Emails

Users

Roles

Departments

Meetings

Projects

Analytics

Audit

Notifications

Admin

Settings

---

# 18. Security

Every API must validate

JWT

Role

Permission

Department

Rate Limit

CSRF

Input Validation

SQL Injection

XSS

CORS

---

# 19. SMTP Configuration

Store securely

SMTP Host

SMTP Port

SMTP Username

SMTP Password

Encryption

Sender Name

Sender Email

Timeout

Retry

Daily Limit

---

# 20. AI Model Configuration

Store

Provider

Model Name

Temperature

Max Tokens

Streaming

Context Length

Retry

Fallback

Version

---

# 21. Prompt Management

Store prompts in database.

Each prompt should have

Prompt Name

Prompt Category

Version

Created By

Updated By

Created Date

Status

Rollback

---

# 22. Knowledge Processing Workflow

```

Upload

↓

Virus Scan

↓

OCR

↓

Extract Text

↓

Chunk

↓

Metadata

↓

Embedding

↓

Pinecone

↓

Ready

```

---

# 23. Chat Workflow

```

User

↓

Authentication

↓

Permission Check

↓

Embedding

↓

Pinecone

↓

Top K Search

↓

Prompt

↓

LLM

↓

Citation

↓

Confidence

↓

Conversation

↓

Response

```

---

# 24. SMTP Workflow

```

Generate Email

↓

Preview

↓

Approve

↓

SMTP

↓

Success

↓

Notification

↓

History

```

---

# 25. AI Confidence Engine

Calculate

Similarity Score

Retrieved Chunks

Document Freshness

Feedback Score

Confidence %

Show

High

Medium

Low

---

# 26. Logging

Log

API Calls

Errors

Searches

Emails

Prompt Usage

LLM Tokens

Embedding Requests

Failures

Latency

---

# 27. Monitoring Dashboard

Display

CPU

Memory

Disk

FastAPI

Supabase

Pinecone

SMTP

LLM

Embedding Queue

Requests

Errors

Response Time

---

# 28. Deployment Architecture

```

Browser

↓

Next.js

↓

FastAPI

↓

Supabase

↓

Pinecone

↓

LLM

↓

SMTP

```

---

# 29. CI/CD Pipeline

GitHub

↓

Pull Request

↓

Lint

↓

Unit Test

↓

Integration Test

↓

Build

↓

Deploy

↓

Health Check

↓

Production

---

# 30. Testing Strategy

Unit Tests

API Tests

Authentication Tests

RAG Tests

Embedding Tests

SMTP Tests

Load Tests

Security Tests

UI Tests

Role Tests

Regression Tests

---

# 31. Performance Goals

Chat Response

<3 seconds

Search

<2 seconds

Dashboard

<2 seconds

Document Upload

<10 seconds

Email Generation

<5 seconds

SMTP Delivery

<30 seconds

---

# 32. Enterprise Dashboard KPIs

Daily Users

AI Usage

Search Accuracy

Knowledge Coverage

Document Growth

Average Confidence

SMTP Success Rate

Project Activity

Department Activity

---

# 33. AI Coding Standards

Use

TypeScript

Pydantic

SQLAlchemy

FastAPI Dependency Injection

React Hooks

Server Components

Tailwind

Reusable Components

Strict Typing

Error Boundaries

---

# 34. UX Guidelines

Every page must include

Loading

Skeleton

Animation

Error State

Success State

Empty State

Responsive Layout

Accessibility

Keyboard Navigation

---

# 35. Future Ready Features

Architecture must support

Voice Assistant

Multi-Agent AI

Image Search

OCR

Calendar

Slack

Microsoft Teams

SharePoint

SSO

MCP

LangGraph

Agentic Workflows

---

# 36. Master Instructions for Antigravity AI Agent

You are building a production-ready Enterprise AI Knowledge Platform.

This is NOT a CRUD project.

This is NOT a basic chatbot.

This is NOT a simple RAG application.

Your goal is to create an enterprise-grade SaaS platform with premium UI/UX, modular architecture, scalable backend, secure authentication, role-based dashboards, explainable AI, semantic search, SMTP email automation, and intelligent workflows.

Follow these principles:

- Build reusable React components.
- Use clean architecture.
- Keep backend modular.
- Apply RBAC to every API and page.
- Implement responsive layouts for desktop, tablet, and mobile.
- Use smooth animations with Framer Motion.
- Stream AI responses where possible.
- Ensure every AI answer includes citations and confidence scores.
- Design every dashboard as if it will be used daily by thousands of employees.
- Prioritize security, maintainability, scalability, and performance.
- Make the UI feel polished, modern, and premium.
- Avoid placeholder pages; every screen should have meaningful functionality.
- Write clean, well-documented code with consistent naming conventions.

The final product should resemble a commercial enterprise platform rather than an academic project and should be suitable for showcasing in a professional software engineering portfolio.

---

# END OF PART 7

**This completes the full specification (Parts 1–7). Together, these documents form the master blueprint for building the Enterprise Knowledge Assistant with Email Automation using Next.js, FastAPI, Supabase, Pinecone, Llama 3.3, and SMTP.**