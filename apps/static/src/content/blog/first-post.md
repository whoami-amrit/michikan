---
title: "I Was Unemployed for 3 Months, So I Built the Job Search Tool I Actually Needed"
description: "Built after 3 months of job searching: an app that turns your LaTeX resume into editable JSON, adds AI-powered analysis, and tracks every application in one place."
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

Three months ago, my job search looked like this: open a posting, copy the description, paste it into an AI chat, ask it to compare the role against my resume, switch tabs to Overleaf, manually rewrite a bullet or two, compile, download, apply, close the tab, and try not to think about it again.

Repeat. Forty, fifty, sixty times.

It worked, technically. It also left me exhausted, scattered across a dozen browser tabs, and quietly convinced that the process itself was part of why nothing was landing. If you've done a real job search in the last year, you already know this loop. You've probably built your own version of it. And you've probably felt the same low hum of despair that comes from doing a lot of _activity_ without a lot of _progress_.

So I stopped patching the workflow and looked at what was actually broken.

## The Problem Wasn't the Advice. It Was the Plumbing.

The advice I was following was good. The r/EngineeringResumes wiki is one of the best free resources out there, and the LaTeX template it recommends produces a clean, single-column, genuinely ATS-friendly resume. That part wasn't the issue.

The issue was everything _around_ it:

**Updating the resume was harder than it should have been.** LaTeX gives you a beautiful, consistent PDF — but every tweak meant opening Overleaf, finding the right line in a wall of markup, editing carefully so I didn't break the formatting, and recompiling. For a two-minute edit, that's a lot of friction.

**My resume lived on one laptop.** Half my applications happen on my phone — scrolling LinkedIn on the couch, replying to a recruiter between errands. But there's no reasonable way to edit LaTeX on a phone. So "quick apply" became "apply once I'm back at my laptop," which in job searching often means "apply after the moment has passed."

**The AI analysis and the resume update were two disconnected steps.** I had a solid prompt template for comparing a job description against my resume. But the AI could only _tell_ me what to change — it couldn't hand me back a finished, correctly formatted PDF. So I was the manual bridge between "here's what to fix" and "here's the fixed document," every single time, for every single application.

**Tracking fell apart because it wasn't part of the flow.** I tried a spreadsheet. It worked for exactly nine days. Anything that requires a separate habit, outside the thing you're already doing, quietly dies. Not from laziness — from friction.

None of these problems were dramatic on their own. Together, over sixty-plus applications, they added up to a process that was slow, inconsistent, and quietly demoralizing.

## What I Actually Needed

Somewhere around month two, I realized I didn't need more job search advice. I needed the four disconnected steps — resume editing, AI analysis, exporting, and tracking — to live in one place and talk to each other.

That's the app I've spent the last two months building.

## How It Works

**Resumes as structured data, not just documents.** Instead of storing my resume as a LaTeX file, I store the content as JSON. When I need a PDF, that content gets mapped straight into the same r/EngineeringResumes-recommended LaTeX template — so I still get the polished, ATS-friendly, single-column output that format is known for. I just never have to hand-edit LaTeX markup again.

**AI that edits the actual content, not just a suggestion.** Because the resume is structured data instead of typeset markup, an AI can directly edit the _content_ — rewrite a bullet, retarget a summary line for a specific posting — without ever touching or breaking the formatting. The gap between "here's my feedback" and "here's your updated resume" disappears.

**One place for the whole loop.** Paste a job description, get AI analysis against your current resume, apply the suggested edits, and download a clean PDF — all in the same app, in the same session.

**Your resume, everywhere.** Because everything lives in the cloud, I can open the app on my phone, tweak a line, and download a print-ready PDF in under a minute. Applying to a job the moment I see it — on a train, on a couch, wherever — stopped requiring a laptop.

**Tracking that doesn't need a separate habit.** Every application funnels into a tracker that's just... there, as part of applying, not a chore I have to remember to do afterward. I can filter by status, company, or role and actually see patterns instead of guessing.

## Built for a Specific Kind of Job Seeker

I want to be upfront about something: this app has a strong opinion. It's built around the single-column, LaTeX-based resume format the r/EngineeringResumes community advocates for — because that format has a real, evidence-backed reputation for being ATS-friendly and easy for recruiters to scan. If that's not your resume philosophy, this probably isn't your tool. But if you've ever used that template, or you've bookmarked that wiki, or you're an engineer applying to roles where a clean, no-nonsense resume format matters — this was built for exactly that.

## Where This Goes From Here

This started as a personal fix for my own three-month stretch of unemployment. It's still early, and I'm still the primary user testing it against my own applications. But if any part of this — the LaTeX-without-the-LaTeX-editing, the AI that edits your actual resume instead of just critiquing it, the tracking that doesn't require a new habit — sounds like a problem you've been quietly living with too, I'd love for you to try it.
