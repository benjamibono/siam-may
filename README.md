# Siam May – The Next-Gen Martial Arts Club Management Platform

> **Status:** ⚠️ **Actively under heavy development – expect rapid iteration & breaking changes.**
>
> I'm polishing this project in public as part of my portfolio: the codebase evolves daily as I experiment with the latest patterns in Next.js, TypeScript, and modern UI/UX. ⭐ **Star** the repo and follow the journey!

---

## ✨ Why it exists
Running a combat-sports academy is more than taking attendance – it's about **community, scheduling, payments & growth at scale**.  Existing "all-in-one" solutions feel dated, slow, or locked behind paywalls.  _Siam May_ is my answer: a fully-serverless, open-source platform that brings the seamless user experience of modern SaaS to martial-arts gyms.

**Key goals**
1. **Delight the end-user** – lightning-fast class booking, crystal-clear schedules, mobile-first UX.
2. **Empower staff & owners** – rich admin tools, real-time analytics, automated billing & notifications.
3. **Showcase engineering craft** – strong typing, scalable architecture, defensive programming, DX that sparks joy.

---

## 🏆 Feature highlights (implemented & planned)
- **Real-time Class Scheduling** – instant updates powered by Supabase subscriptions.
- **One-click Enrolment / Unenrolment** with optimistic UI & rate-limited endpoints to prevent abuse.
- **Secure Auth** – Magic Link, OAuth, and RBAC (`member`, `staff`, `admin` roles) baked-in.
- **Automated Payments** – background cron workers reconcile payment status & reset expired classes.
- **Admin Dashboard** – filter / search classes, see live capacity, and manage enrolments visually.
- **Mobile-Perfect UX** – Tailwind v4 + Radix UI primitives + Headless animations ensure pixel-perfect responsiveness.
- **Blazing Performance** – React 19 server components, HTTP caching, and on-demand ISR keep TTFB low.
- **Type Safety Everywhere** – shared Zod schemas & Supabase generated types reduce runtime bugs.
- **Defence-in-Depth** – edge-ready rate-limiting, centralized error handling, secure tokens.
- **Dark Mode** (because recruiters notice 😉).

> **Coming soon**
> – Attendance analytics (PR in progress) • In-app notifications • Stripe integration • Progressive Web App • i18n (EN/ES).

---

## 🖥️ Tech stack at a glance
| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (app router), React 19, TypeScript 5, Tailwind v4, Shadcn/Radix UI, TanStack React-Query v5 |
| **Backend / APIs** | Next.js Route Handlers, Supabase (Postgres + Realtime + Storage), Edge Runtime, Cron jobs |
| **Auth** | Supabase Auth + custom role guard helpers |
| **State & Data** | React Server Components, React-Query, Node-Cache, incremental static regeneration |
| **Tooling** | ESLint v9, Prettier, pnpm, Vitest/Jest + React Testing Library |

---

## 📐 Architecture snapshot
```
                       +-------------+            (Cron / Edge)
      Client <--> Next.js Route Handlers ------> Background Jobs
         |                |                             |
         | React-Query    | Supabase (Postgres, Auth)   |
         v                v                             v
     React 19 RSC     Server Actions            Payment Processor
```
*Stateless frontends talk to typed endpoints; server actions cache & revalidate via standardised tags (`classes`, `users`, `payments`).*

---

## 🚀 Quick start (local)
```bash
pnpm install     # fast dependency install
pnpm dev         # next dev on http://localhost:3000
```
1. Create a `.env.local` with your Supabase keys (see `.env.example`).
2. Run **Reset Logic** test script to seed mock data:
   ```bash
   pnpm test:reset:dev
   ```
3. Log in with the magic link provided in the terminal and explore!

---

## 🎯 Roadmap
- [ ] Stripe billing flow (checkout + webhooks)
- [ ] Staff push notifications (PWA)  
- [ ] Attendance heat-map & member analytics  
- [ ] Multi-gym support (tenant-aware schemas)  
- [ ] Public marketing site

---

## 🤝 Hiring me
I'm seeking a **Full-Stack / Frontend Engineering** role where I can craft delightful products.  _Siam May_ is a taste of how I blend **system-2 thinking**, relentless iteration, and UX empathy to ship production-ready code.

If my work resonates with you:
- Connect on **LinkedIn**: https://www.linkedin.com/in/your-profile
- Shoot me an **email**: hello@yourdomain.dev

Let's build the next big thing together! 🥋✨

---

## 📜 License
MIT – _because great software should be free to learn from._ 