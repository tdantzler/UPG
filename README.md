# Knowlogix — UPG Insurance Discovery Session Tool

AI-powered interactive discovery session tool built by Knowlogix for the UPG Insurance engagement.

## What This Does

A live, in-meeting sales tool that:
- Presents customized discovery questions for UPG Insurance (Medicare, ACA, individual/family coverage)
- Records answers via microphone with live transcription (Web Speech API)
- Generates AI-powered follow-up questions and opportunity signals in real-time (Anthropic Claude API)
- Tracks attendees with role-based email distribution (manager vs individual)
- Generates a personalized AI brochure at the end of the session
- Sends brochures via Outlook through an n8n webhook workflow

## Live URL

**GitHub Pages:** [https://tdantzler.github.io/UPG/](https://tdantzler.github.io/UPG/)

## Project Structure

```
UPG/
├── index.html                      # Main app entry point
├── css/
│   └── styles.css                  # All styles (Knowlogix brand: #3a3a3c + #f1592a)
├── js/
│   └── app.js                      # Application logic (questions, recording, AI, brochure gen)
├── assets/
│   └── knowlogix-logo.png          # Knowlogix logo (transparent background)
├── docs/
│   └── UPG_Benefits_AI_Strategy.md # Original strategy document
├── n8n-workflows/
│   └── brochure-send-outlook.json  # n8n workflow for sending brochures via Outlook
└── README.md
```

## Requirements

- **Browser:** Chrome or Edge (required for speech recognition)
- **Internet:** Required for AI follow-ups (Anthropic API), email sending (n8n webhook)
- **n8n:** Webhook workflow must be published at `https://n8n.srv1047408.hstgr.cloud/webhook/upg-brochure-send`
- **Outlook:** Microsoft Outlook OAuth2 credential configured in n8n

## Setup

1. Clone this repo
2. Enable GitHub Pages (Settings → Pages → Deploy from main branch)
3. Import `n8n-workflows/brochure-send-outlook.json` into your n8n instance
4. Configure Microsoft Outlook credential in n8n
5. Open the live URL on your iPad in Chrome

## Key Contacts

- **POC:** Tim Dasinger (tdasinger@upgbenefits.com) — Director of Individual & Senior Markets
- **Company:** UPG Insurance (division of United Producers Group LLC)
- **Location:** Mount Pleasant, SC

## Brand Colors

- Charcoal: `#3a3a3c`
- Orange: `#f1592a`

---

*Built by Knowlogix · Charleston, SC · knowlogix.com*
