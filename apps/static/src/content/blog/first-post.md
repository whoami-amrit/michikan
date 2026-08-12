---
title: "I Was Unemployed for 3 Months, So I Built the Job Search Tool I Actually Needed"
description: "Built after months of job hunting: an app that turns your LaTeX resume into editable JSON, adds AI-powered analysis, and tracks every application in one place."
date: 2026-07-25
tags:
  [
    "First Post",
    "LaTeX",
    "Resumes",
    "AI Analysis",
    "Job Search",
    "r/EngineeringResumes",
    "Software Developer",
  ]
cover: "../../assets/resume-demo.png"
---

As a full-stack software engineer with a degree in Computer Science, I found myself on the job search trail for the past two months. Like most devs in the modern market, I built a system to stay competitive. My daily stack was a mix of ChatGPT, Overleaf, Google Drive, and a massive tracking spreadsheet.

It worked, but it was tedious, manual, and frankly, soul-crushing.

Every single application felt like an exercise in friction: copying job descriptions across multiple tabs, wrestling with LaTeX syntax on Overleaf just to tweak a few bullet points, hunting down PDF versions on Google Drive, and logging rows in a spreadsheet. I realized my job search wasn't hindered by my technical skills—it was being slowed down by a broken workflow.

So I decided to optimize it. I built **[Michikan](https://www.michikan.dev/)** to iron out the friction and give full-stack job seekers the streamlined, single-dashboard experience we actually need.

---

## The Friction Points That Led to Michikan

### 1. Overleaf is Great for Papers, Terrible for Quick Resume Edits

LaTeX gives you pixel-perfect control, but making quick edits on mobile or on the fly is nearly impossible. Storing compiled PDFs on Google Drive or local folders leaves you with fragmented files (`Resume_v2_Final_Final.pdf`). There was no single source of truth for every iteration of my resume, nor was there a mobile-friendly way to adjust a bullet point when an opportunity popped up while away from a desktop.

### 2. LLMs Are Great at Text, Bad at Rendering

When you want to tailor a resume for a specific role using AI, pasting LaTeX code into an LLM often breaks formatting or produces messy code blocks.

LLMs were designed to handle structured text and semantics—not layout compilation.

Michikan solves this by **decoupling resume data from formatting**. Your resume content lives as a clean, structured JSON schema based on opinionated `r/EngineeringResumes` guidelines. When an LLM tailors your experience for a job description, it works purely with structured text. Michikan then seamlessly compiles that data into an ATS-friendly, LaTeX-backed render behind the scenes.

### 3. Tool Fatigue: Too Many Tabs for 1 Application

Job hunting shouldn't require juggling four or five different tools:

- **Tab 1:** Job Board
- **Tab 2:** Application Tracker (Spreadsheet / Notion)
- **Tab 3:** AI Chat (Job Fit Analysis)
- **Tab 4:** Overleaf / Resume Builder
- **Tab 5:** Google Drive / Local Storage

Michikan brings this entire workflow under **one roof**:

1. **Job Application Tracker:** Keep tabs on every role you've applied to in one place.
2. **Job Fit Analysis:** Real-time gap analysis and feedback against job descriptions based on proven resume guidelines.
3. **Structured Resume Builder:** AI-assisted tailoring with zero formatting headaches.

---

## Opinionated by Design, Open Source by Choice

Michikan is deliberately opinionated. It doesn't give you 50 flashy, multi-column graphic design templates that fail ATS parsers. Instead, it enforces what actually works in technical recruiting: clean, single-column layout, standard typography, and bulleted accomplishment metrics.

And because your resume data is personal, **Michikan is completely open-source**.

If you prefer full control over your privacy, you can inspect the code, hack on features, or spin up your own offline local instance.

- **Try the app:** [michikan.dev](https://www.michikan.dev/)
- **Explore / Host the code:** Open source on [GitHub](https://github.com/whoami-amrit/michikan)

Whether you want to streamline your own job search or contribute to making resume management less painful for everyone, give it a try—and I'd love to hear your feedback!
