# Studiqo

**Studiqo** is a tutor management platform designed to help private tutors organise students, lessons, homework, and day to day admin in one place.

> A focused platform for running the business side of private tutoring.

---

## Description

Studiqo is a fullstack application built to solve the real operational problems private tutors deal with every week. Instead of juggling spreadsheets, calendars, notes apps, and messages, tutors can use a single platform to manage their workflow.

The platform is being developed with a clear MVP focus around:

- student management
- lesson scheduling
- lesson notes
- homework tracking
- tutor dashboard workflows

This repository contains the **public backend API** for Studiqo.

**Frontend repository:** _TODO: add private frontend details if needed_  
**Live demo:** _TODO_  
**API docs:** OpenAPI 3.1 spec at [`docs/openapi/openapi.yaml`](docs/openapi/openapi.yaml) (served path prefix `/api/v1`).

---

## Motivation

<!-- Studiqo started as a real world product idea rather than just a portfolio exercise. -->

The goal is to build a tool that genuinely helps private tutors manage the admin side of their work. A tutor’s job is not just teaching, it also involves tracking students, planning lessons, setting homework, writing notes, following up on progress, and staying organised across a busy weekly schedule.

This project exists to reduce that friction.

From a development point of view, Studiqo is also being built to demonstrate:

- backend API design
- modular Express architecture
- authentication and authorization
- relational data modelling
- validation and error handling
- testing strategy
- product focused software development

---

## Quick Start

_TODO_

---

## Usage

### Current project scope

The current backend is being built around the following modules:

- authentication
- users
- students
- lessons
- lesson notes
- homework
- dashboard

### Planned MVP capabilities

The MVP is intended to allow a tutor to:

1. create and manage student profiles
2. schedule and track lessons
3. record lesson notes
4. assign and monitor homework
5. view upcoming work from a dashboard

**API examples:** _TODO_  
**Postman collection:** _TODO_  
**OpenAPI:** [`docs/openapi/openapi.yaml`](docs/openapi/openapi.yaml). Validate with `npm run docs:lint`. Preview in the browser with `npm run docs:preview` (uses [redocly.yaml](redocly.yaml); default port 4000). To emit a static HTML file: `npx redocly build-docs docs/openapi/openapi.yaml -o api-docs.html`. For the frontend, point [openapi-typescript](https://github.com/drwpow/openapi-typescript) or [Orval](https://orval.dev/) at that file (or a hosted copy) to generate types or clients.

---

## Tech Stack

### Backend

- Node.js
- Express
- TypeScript
- Drizzle
- PostgreSQL
- Zod
- Argon2
- JWT
- Vitest
- Supertest

---

## Project Status

Studiqo is currently in active development.

---

## Contributing

Contributions are not open at this stage while the initial product architecture is still being established.

That said, feedback, suggestions, and discussions are welcome.

### For later

- _TODO: define contribution guidelines_
- _TODO: define branching strategy_
- _TODO: add issue / PR templates_
- _TODO: add coding standards section_

---

## License

_TODO: choose a license_

Common options:

- MIT
- Apache-2.0
- Proprietary / All Rights Reserved

---

## Author

**Paul Smith**

https://pafsmith.dev
https://www.linkedin.com/in/pafsmith/
paul@pafsmith.dev

---
