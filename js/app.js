// ── N8N AI PROXY ──
const AI_PROXY_URL = 'https://n8n.srv1047408.hstgr.cloud/webhook/upg-ai';

async function callAI(systemPrompt, userMessage, maxTokens = 1000) {
  const response = await fetch(AI_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `API error ${response.status}`);
  }
  return response.json();
}

// ── QUESTION DATA ──
const standardQuestions = [
  {
    q: "Walk me through what happens when someone calls UPG Insurance for help with Medicare or an ACA plan — from that first phone call to the day they're enrolled and covered. What does that process look like step by step?",
    why: "Maps the full intake-to-enrolled workflow — surfaces every manual step, handoff, and time sink"
  },
  {
    q: "When Annual Enrollment (AEP) or Open Enrollment hits, what does the workload look like for Tim, Roger, and the team? Where does it get ugly?",
    why: "AEP and OEP are the insurance side's version of renewal season — massive volume, compressed timelines"
  },
  {
    q: "If I asked your team what they spend the most time on that they wish they didn't, what would they say?",
    why: "Surfaces hidden manual work leadership may not even see"
  },
  {
    q: "How many calls or questions do you get from existing clients about their Medicare or ACA coverage — things like 'is this covered?', 'which doctor is in-network?', 'what's my copay?' How are those handled today?",
    why: "Quantifies the member Q&A burden — the single clearest AI chatbot use case for insurance agencies"
  },
  {
    q: "When a new client needs a plan comparison — say someone turning 65 looking at Medicare options, or a family shopping ACA plans — how do you build that comparison today and how long does it take?",
    why: "Plan comparison is high-effort, repetitive, and perfect for AI-powered automation"
  },
  {
    q: "Outside of AEP and OEP, what does ongoing client service look like? Are people calling year-round with questions, life changes, billing issues?",
    why: "Surfaces the year-round support burden that AI could absorb — not just seasonal spikes"
  },
  {
    q: "Where does data live in your business — and who can get to it when they need it?",
    why: "Surfaces data silos — foundational to any AI or automation play"
  },
  {
    q: "If your team could get back 10 hours a week per person, what would you want them spending that time on?",
    why: "Shifts the conversation from cost to growth — reveals strategic priorities"
  }
];

const customQuestions = [
  {
    q: "You expanded UPG into direct individual and Medicare coverage because you saw people getting bad advice from call centers and chatbots. What's the biggest operational challenge in delivering that personal, local experience at scale?",
    why: "Gets Jason talking about the core tension — high-touch service vs. growth constraints. AI resolves this."
  },
  {
    q: "You're working with BCBS, Cigna, Aetna, Humana, Ambetter, Devoted and more. When someone needs a Medicare Advantage or ACA plan comparison, how much of that carrier research and side-by-side comparison is manual today?",
    why: "Multi-carrier plan comparison is labor-intensive and highly automatable — core AI play for insurance agencies"
  },
  {
    q: "Tim and Roger are covering the Lowcountry and Upstate respectively, and you serve all 46 SC counties through agent partners. How do you maintain that personal, local feel when clients are spread across the whole state?",
    why: "AI can be the force multiplier that lets a small local team deliver personal service at scale"
  },
  {
    q: "What systems are Tim and Roger living in day to day — CRM, quoting tools, carrier portals, AgentMethods? Where do those systems not talk to each other?",
    why: "Maps the insurance-side tech stack and identifies integration gaps where automation can bridge silos"
  },
  {
    q: "Medicare compliance is strict — CMS rules, SOAs, scope of appointments, call recording requirements. How are you tracking all of that today, and how confident are you that nothing slips through?",
    why: "Medicare compliance is high-stakes and manual — AI monitoring and automated documentation is a clear win"
  },
  {
    q: "How do you know when a Medicare or ACA client is thinking about switching — or when they're confused enough about their coverage that they might just disengage? Do you have any early warning signals?",
    why: "Retention and re-enrollment are everything in individual insurance — AI can surface at-risk clients proactively"
  },
  {
    q: "If we could put an AI assistant on your website or in your agents' hands that could answer Medicare and ACA questions from real plan documents, walk people through plan comparisons, and schedule consultations — what would that change for your business?",
    why: "Paints the vision of AI as their competitive weapon against call centers — and gets Jason imagining the future"
  }
];

// ── STATE ──
const state = {
  notes: {},
  transcripts: {},
  followups: {},
  completed: new Set(),
  activeCard: null,
  recognition: null,
  recording: false,
  currentRecId: null
};

// ── RENDER ──
function renderQuestions(questions, containerId, prefix) {
  const container = document.getElementById(containerId);
  container.innerHTML = questions.map((item, i) => {
    const id = `${prefix}-${i}`;
    return `
      <div class="q-card" id="card-${id}" data-id="${id}">
        <div class="q-card-header" onclick="toggleCard('${id}')">
          <div class="q-num">${String(i+1).padStart(2,'0')}</div>
          <div class="q-main">
            <div class="q-text">${item.q}</div>
            <div class="q-why">${item.why}</div>
          </div>
          <div class="q-status">✓</div>
        </div>
        <div class="q-body">
          <div class="rec-controls">
            <button class="btn-rec record" id="btn-rec-${id}" onclick="toggleRecording('${id}')">🎙 Record Answer</button>
            <button class="btn-rec generate" id="btn-gen-${id}" onclick="generateFollowups('${id}')" disabled>✨ AI Follow-ups</button>
            <button class="btn-rec done" onclick="markComplete('${id}')">✓ Done</button>
          </div>
          <div id="rec-indicator-${id}" style="display:none;" class="rec-indicator">
            <span class="rec-dot"></span> Recording...
          </div>
          <div id="transcript-${id}" style="display:none;">
            <div class="transcript-label">Live Transcript</div>
            <div class="transcript-text" id="transcript-text-${id}"></div>
          </div>
          <textarea class="notes-area" id="notes-${id}"
            placeholder="Type notes here, or use the mic to record and transcribe..."
            oninput="onNotesChange('${id}')"
          ></textarea>
          <div id="followup-${id}"></div>
        </div>
      </div>`;
  }).join('');
}

function toggleCard(id) {
  const card = document.getElementById(`card-${id}`);
  if (state.activeCard === id) {
    card.classList.remove('active');
    state.activeCard = null;
  } else {
    if (state.activeCard) {
      document.getElementById(`card-${state.activeCard}`)?.classList.remove('active');
      // Stop any active recording when switching cards
      if (state.recording) stopRecording(state.currentRecId);
    }
    card.classList.add('active');
    state.activeCard = id;
  }
}

function onNotesChange(id) {
  state.notes[id] = document.getElementById(`notes-${id}`).value;
  document.getElementById(`btn-gen-${id}`).disabled = !state.notes[id].trim();
}

function markComplete(id) {
  if (state.recording && state.currentRecId === id) stopRecording(id);
  state.completed.add(id);
  const card = document.getElementById(`card-${id}`);
  card.classList.add('completed');
  card.classList.remove('active');
  state.activeCard = null;
  updateCounts();
}

function updateCounts() {
  const stdCount = [...state.completed].filter(id => id.startsWith('std')).length;
  const custCount = [...state.completed].filter(id => id.startsWith('upg')).length;
  document.getElementById('count-standard').textContent = `${stdCount} / ${standardQuestions.length} completed`;
  document.getElementById('count-custom').textContent = `${custCount} / ${customQuestions.length} completed`;
}

// ── AUDIO / SPEECH RECOGNITION ──
function toggleRecording(id) {
  if (state.recording && state.currentRecId === id) {
    stopRecording(id);
  } else {
    if (state.recording) stopRecording(state.currentRecId);
    startRecording(id);
  }
}

function startRecording(id) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('Speech recognition not supported. Use Chrome or Edge, or type notes manually.');
    return;
  }

  const recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let finalTranscript = state.notes[id] ? state.notes[id] + ' ' : '';

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    const el = document.getElementById(`transcript-text-${id}`);
    el.innerHTML = finalTranscript + '<span style="color:var(--light)">' + interim + '</span>';
    el.scrollTop = el.scrollHeight;
    document.getElementById(`transcript-${id}`).style.display = 'block';
    document.getElementById(`notes-${id}`).value = finalTranscript.trim();
    state.notes[id] = finalTranscript.trim();
    document.getElementById(`btn-gen-${id}`).disabled = !finalTranscript.trim();
  };

  recognition.onerror = (event) => {
    if (event.error === 'not-allowed') {
      alert('Microphone access denied. Please allow mic access and try again.');
      stopRecording(id);
    }
  };

  recognition.onend = () => {
    if (state.recording && state.currentRecId === id) {
      try { recognition.start(); } catch(e) {}
    }
  };

  try {
    recognition.start();
    state.recording = true;
    state.currentRecId = id;
    state.recognition = recognition;
    document.getElementById(`btn-rec-${id}`).textContent = '⏹ Stop';
    document.getElementById(`btn-rec-${id}`).classList.add('recording');
    document.getElementById(`rec-indicator-${id}`).style.display = 'flex';
  } catch(e) {
    alert('Could not start recording: ' + e.message);
  }
}

function stopRecording(id) {
  state.recording = false;
  state.currentRecId = null;
  if (state.recognition) {
    try { state.recognition.stop(); } catch(e) {}
    state.recognition = null;
  }
  const btn = document.getElementById(`btn-rec-${id}`);
  if (btn) {
    btn.textContent = '🎙 Record Answer';
    btn.classList.remove('recording');
  }
  const ind = document.getElementById(`rec-indicator-${id}`);
  if (ind) ind.style.display = 'none';
}

// ── AI FOLLOW-UP GENERATION ──
async function generateFollowups(id) {
  const notes = state.notes[id] || '';
  if (!notes.trim()) return;

  const followupEl = document.getElementById(`followup-${id}`);
  followupEl.innerHTML = `<div class="ai-followup"><div class="ai-loading"><div class="spinner"></div> AI analyzing response and generating follow-ups...</div></div>`;

  let originalQ = '';
  if (id.startsWith('std')) {
    originalQ = standardQuestions[parseInt(id.split('-')[1])].q;
  } else {
    originalQ = customQuestions[parseInt(id.split('-')[1])].q;
  }

  const systemPrompt = `You are an AI & workflow automation consultant at Knowlogix conducting a discovery session with UPG Insurance (a division of UPG Benefits) in Mount Pleasant, SC.

About UPG Insurance (CRITICAL CONTEXT):
- UPG Insurance is a direct-to-consumer insurance agency serving individuals and families across all 46 counties in South Carolina.
- Products: Medicare Advantage, Medicare Supplement (Medigap), Part D Prescription Drug Plans, ACA/Marketplace individual & family health plans, dental, vision.
- Carriers: BCBS, Cigna, Aetna, Humana, Ambetter, Devoted, and others.
- Founded 2015 by Jason Newman (President). Key team: Tim Dasinger (Dir. of Individual & Senior Markets, North Charleston/Summerville), Roger Garner (Dir. of Individual & Senior Markets, Travelers Rest/Upstate).
- Core value prop: "We're your neighbors, not a call center." Local, face-to-face, concierge-level service competing against distant call centers, chatbots, and impersonal apps.
- Primary focus: Charleston/Berkeley/Dorchester Lowcountry + Greenville/Upstate, but serves statewide.
- Website built on AgentMethods platform.
- Sister division UPG Benefits is a General Agency serving employee benefits brokers (separate operation).

Based on the question asked and client response, generate:
1. 2-3 sharp follow-up questions that dig deeper into AI/automation opportunities for their INSURANCE operations
2. An "Opportunity Signal" identifying what you heard that maps to a concrete solution (Medicare Plan Comparison AI, Member Q&A Chatbot, AEP/OEP Enrollment Automation, Client Retention Intelligence, Compliance/SOA Automation, Lead Intake & Scheduling AI, Carrier Quoting Automation, Document Generation, CRM/Workflow Automation, Website AI Assistant)

Rules:
- Be specific to what they said — not generic
- Focus on the insurance/Medicare/ACA side of the business, not the GA broker side
- Keep follow-ups conversational
- Return ONLY valid JSON: {"followup_questions": ["..."], "opportunity_signal": "..."}`;

  try {
    const data = await callAI(systemPrompt, `Question: "${originalQ}"\n\nClient response/notes: "${notes}"\n\nGenerate follow-ups and opportunity signal as JSON only.`, 1000);
    const text = (data.content || []).map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();

    let parsed;
    try { parsed = JSON.parse(clean); }
    catch(e) {
      followupEl.innerHTML = `<div class="ai-followup"><div class="ai-followup-label">✨ AI Follow-Up</div><div class="ai-followup-content">${text.replace(/\n/g,'<br>')}</div></div>`;
      return;
    }

    const fqHtml = (parsed.followup_questions || []).map(fq =>
      `<div class="followup-q"><strong>→</strong> ${fq}</div>`
    ).join('');

    const sigHtml = parsed.opportunity_signal
      ? `<div class="opportunity-signal"><strong>🎯 Opportunity Signal:</strong> ${parsed.opportunity_signal}</div>`
      : '';

    followupEl.innerHTML = `<div class="ai-followup"><div class="ai-followup-label">✨ AI-Generated Follow-Ups</div><div class="ai-followup-content">${fqHtml}${sigHtml}</div></div>`;
    state.followups[id] = parsed;

  } catch(err) {
    followupEl.innerHTML = `<div class="ai-followup" style="border-color:#fca5a5;background:#fef2f2;"><div class="ai-followup-label" style="color:var(--red);">Error</div><div class="ai-followup-content">Could not generate follow-ups: ${err.message}. Type notes manually and move on.</div></div>`;
  }
}

// ── ATTENDEE PICKER ──
const teamMembers = [
  { name: "Tim Dasinger", role: "Director of Individual & Senior Markets", poc: true, division: "UPG Insurance", email: "tdasinger@upgbenefits.com" },
  { name: "Roger Garner", role: "Director of Individual & Senior Markets", poc: false, division: "UPG Insurance", email: "rgarner@upgbenefits.com" },
  { name: "Jason Newman", role: "President", poc: false, division: "UPG (Both Divisions)", email: "jnewman@upgbenefits.com" },
  { name: "Lee Howard", role: "Vice President of Sales", poc: false, division: "UPG Benefits (GA)", email: "lhoward@upgbenefits.com" },
  { name: "Stephen Osborne", role: "Vice President of Sales", poc: false, division: "UPG Benefits (GA)", email: "sosborne@upgbenefits.com" },
  { name: "McClain Goodwin", role: "Vice President of Sales", poc: false, division: "UPG Benefits (GA)", email: "mgoodwin@upgbenefits.com" },
  { name: "Jon Bailey", role: "VP of Sales, Georgia", poc: false, division: "UPG Benefits (GA)", email: "jbailey@upgbenefits.com" },
  { name: "Scott Neville", role: "Director of Technology Applications", poc: false, division: "UPG Benefits", email: "sneville@upgbenefits.com" },
  { name: "Stefan Alamia", role: "Enrollment Specialist", poc: false, division: "UPG Benefits", email: "salamia@upgbenefits.com" },
  { name: "Kassie Bennett", role: "Account Executive", poc: false, division: "UPG Benefits (GA)", email: "kbennett@upgbenefits.com" },
  { name: "Melissa Forrester", role: "RFP & Implementation Specialist", poc: false, division: "UPG Benefits (GA)", email: "mforrester@upgbenefits.com" },
  { name: "Brian Beattie", role: "Sales Consultant", poc: false, division: "UPG Benefits (GA)", email: "bbeattie@upgbenefits.com" },
];

state.attendees = new Set();
state.deletedMembers = new Set();
state.managers = new Set();

function renderAttendees() {
  const grid = document.getElementById('attendee-grid');
  grid.innerHTML = teamMembers.map((m, i) => {
    if (state.deletedMembers.has(i)) return '';
    const isChecked = state.attendees.has(i);
    const isManager = state.managers.has(i);
    return `
    <div class="attendee-row ${isChecked ? 'checked' : ''}">
      <div class="attendee-check" onclick="toggleAttendee(${i})" title="Attending">✓</div>
      <div class="attendee-info" onclick="toggleAttendee(${i})">
        <div class="attendee-name">${m.name}</div>
        <div class="attendee-role">${m.role} · ${m.division}</div>
        <div style="font-size:10px;color:var(--blue);margin-top:1px;">${m.email || ''}</div>
        ${m.poc ? '<div class="attendee-poc">★ Primary Contact</div>' : ''}
        ${isManager ? '<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-top:1px;">👁 Receives Master Copy</div>' : ''}
      </div>
      <button onclick="event.stopPropagation();toggleManager(${i})" title="${isManager ? 'Remove master copy access' : 'Send master copy (sees all attendee sections)'}" style="background:${isManager ? 'var(--green)' : 'var(--off-white)'};border:1px solid ${isManager ? 'var(--green)' : 'var(--rule)'};color:${isManager ? '#fff' : 'var(--light)'};cursor:pointer;font-size:10px;padding:4px 8px;border-radius:4px;transition:all 0.15s;font-family:'Outfit',sans-serif;font-weight:600;" onmouseover="if(!${isManager})this.style.borderColor='var(--green)'" onmouseout="if(!${isManager})this.style.borderColor='var(--rule)'">👁</button>
      <button onclick="event.stopPropagation();deleteAttendee(${i})" style="background:none;border:none;color:var(--light);cursor:pointer;font-size:14px;padding:4px 6px;border-radius:4px;transition:color 0.15s;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--light)'" title="Remove">✕</button>
    </div>`;
  }).join('') + `
    <div class="add-attendee-row">
      <input class="add-input" id="add-name" placeholder="Name" style="flex:1;">
      <input class="add-input" id="add-title" placeholder="Job title" style="flex:1;">
      <input class="add-input" id="add-email" placeholder="Email" style="flex:1.2;">
      <button class="btn-add" onclick="addAttendee()">+ Add</button>
    </div>
    <div style="margin-top:8px;font-size:10px;color:var(--light);padding:0 10px;">
      ✓ = attending &nbsp;&nbsp; 👁 = receives master copy with all attendees' sections
    </div>
  `;
}

function toggleManager(idx) {
  if (state.managers.has(idx)) {
    state.managers.delete(idx);
  } else {
    state.managers.add(idx);
    // Auto-check as attending too
    state.attendees.add(idx);
  }
  renderAttendees();
}

function toggleAttendee(idx) {
  if (state.attendees.has(idx)) {
    state.attendees.delete(idx);
  } else {
    state.attendees.add(idx);
  }
  renderAttendees();
}

function deleteAttendee(idx) {
  state.attendees.delete(idx);
  state.deletedMembers.add(idx);
  renderAttendees();
}

function addAttendee() {
  const name = document.getElementById('add-name').value.trim();
  const title = document.getElementById('add-title').value.trim();
  const email = document.getElementById('add-email').value.trim();
  if (!name) return;
  teamMembers.push({
    name: name,
    role: title || 'Guest',
    poc: false,
    division: 'Added',
    email: email || ''
  });
  const newIdx = teamMembers.length - 1;
  state.attendees.add(newIdx);
  renderAttendees();
}

// ── BROCHURE GENERATOR ──
async function generateBrochure() {
  // Gather attendees
  const attendees = [...state.attendees]
    .filter(i => !state.deletedMembers.has(i))
    .map(i => teamMembers[i]);

  if (attendees.length === 0) {
    alert('Check at least one attendee in the "Who\'s in the Room?" section before generating.');
    return;
  }

  // Gather all notes and opportunity signals
  const allNotes = [];
  const allSignals = [];

  const gatherFromSection = (questions, prefix) => {
    questions.forEach((item, i) => {
      const id = `${prefix}-${i}`;
      const notes = state.notes[id];
      const followup = state.followups[id];
      if (notes) {
        allNotes.push({ question: item.q, answer: notes });
      }
      if (followup && followup.opportunity_signal) {
        allSignals.push(followup.opportunity_signal);
      }
    });
  };

  gatherFromSection(standardQuestions, 'std');
  gatherFromSection(customQuestions, 'upg');

  if (allNotes.length === 0) {
    alert('Complete at least a few questions with notes before generating the brochure. The AI needs discovery data to work with.');
    return;
  }

  // Show loading
  document.getElementById('btn-brochure').disabled = true;
  document.getElementById('brochure-loading').style.display = 'flex';
  document.getElementById('brochure-output').innerHTML = '';

  const attendeeList = attendees.map(a => `- ${a.name} (${a.role}, ${a.division})`).join('\n');
  const notesList = allNotes.map(n => `Q: ${n.question}\nA: ${n.answer}`).join('\n\n');
  const signalsList = allSignals.length > 0 ? allSignals.map(s => `- ${s}`).join('\n') : 'No signals generated yet — infer from notes.';

  const systemPrompt = `You are a senior AI & automation consultant at Knowlogix, a technology integration firm in Charleston, SC. You've just completed a discovery session with UPG Insurance and need to generate a personalized HTML brochure/leave-behind document.

This brochure is a SALES TOOL and a DEMONSTRATION of AI capability. The fact that it was generated live in the meeting by AI is part of the pitch — it shows what AI can do.

FORMAT REQUIREMENTS — return ONLY raw HTML (no markdown, no backticks, no explanation):

1. Open with a header: "AI & Automation Roadmap — UPG Insurance" with subtitle "Custom workup generated by Knowlogix AI — [today's date]"

2. Brief "What We Heard" summary — 3-4 sentences synthesizing the key themes from the discovery.

3. FOR EACH CHECKED ATTENDEE: Create a personalized section wrapped in a div with class "person-block". Include:
   - Their name (class "person-name") and role (class "person-role")
   - 2-4 specific AI/automation opportunities tailored to THEIR role based on what was discussed. Each opportunity in a div with class "opp-item" containing a bold opportunity name and 1-2 sentences on what it would do for them specifically.
   - Be concrete — not "AI could help" but "An AI plan comparison tool would let [name] generate Medicare Advantage side-by-sides across 6 carriers in 30 seconds instead of 2 hours."

4. "Recommended Next Steps" section with 3 concrete steps (workflow audit, Phase 1 build, timeline).

5. Close with a CTA block (div class "cta-block") with Knowlogix contact info: knowlogix.com | 843-900-4576 | info@knowlogix.com

Make it sharp, specific, and impressive. No filler. Every sentence should make UPG think "these people understand our business."`;

  const userPrompt = `ATTENDEES IN THE ROOM:
${attendeeList}

DISCOVERY NOTES:
${notesList}

OPPORTUNITY SIGNALS FROM AI:
${signalsList}

Generate the HTML brochure now. Return ONLY the inner HTML content — no doctype, html, head, or body tags. Use h1, h2, h3, p, strong, and the CSS classes documented above (person-block, person-name, person-role, opp-item, cta-block, brochure-sub).`;

  try {
    const data = await callAI(systemPrompt, userPrompt, 4000);
    const html = (data.content || []).map(b => b.text || '').join('');
    const cleanHtml = html.replace(/```html|```/g, '').trim();

    document.getElementById('brochure-output').innerHTML = `
      <div class="brochure-frame">
        <div class="brochure-toolbar">
          <span class="brochure-toolbar-title">📄 AI-Generated Brochure — Ready to Send</span>
          <div style="display:flex;gap:8px;">
            <button class="btn-print" onclick="sendViaOutlook()" style="background:var(--green);">📧 Send via Outlook (n8n)</button>
            <button class="btn-print" onclick="printBrochure()">🖨 Print / PDF</button>
          </div>
        </div>
        <div class="brochure-content" id="print-target">
          ${cleanHtml}
        </div>
        <div id="send-status" style="display:none;padding:12px 20px;font-size:12px;"></div>
      </div>
    `;

    // Scroll to brochure
    document.getElementById('brochure-output').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch(err) {
    document.getElementById('brochure-output').innerHTML = `
      <div class="ai-followup" style="border-color:#fca5a5;background:#fef2f2;">
        <div class="ai-followup-label" style="color:var(--red);">Brochure Generation Error</div>
        <div class="ai-followup-content">Could not generate brochure: ${err.message}</div>
      </div>
    `;
  } finally {
    document.getElementById('btn-brochure').disabled = false;
    document.getElementById('brochure-loading').style.display = 'none';
  }
}

function printBrochure() {
  const content = document.getElementById('print-target').innerHTML;
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head>
    <title>Knowlogix — UPG Insurance AI Roadmap</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'DM Sans',sans-serif; color:#3a3a3c; padding:0.5in 0.6in; line-height:1.65; font-size:13px; }
      h1 { font-family:'Outfit',sans-serif; font-weight:800; font-size:26px; color:#3a3a3c; margin-bottom:4px; }
      h1 span { color:#f1592a; }
      .brochure-sub { font-size:12px; color:#6b6b6e; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid #e2e2e4; }
      h2 { font-family:'Outfit',sans-serif; font-weight:700; font-size:16px; color:#f1592a; margin-top:24px; margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid #fef0eb; }
      h3 { font-family:'Outfit',sans-serif; font-weight:700; font-size:13px; color:#3a3a3c; margin-top:14px; margin-bottom:4px; }
      p { margin-bottom:8px; }
      strong { font-weight:600; }
      .person-block { background:#f8f8f9; border:1px solid #e2e2e4; border-radius:8px; padding:14px 18px; margin-bottom:12px; }
      .person-name { font-family:'Outfit',sans-serif; font-weight:700; font-size:14px; }
      .person-role { font-size:11px; color:#a0a0a3; margin-bottom:8px; }
      .opp-item { padding-left:12px; border-left:3px solid #f1592a; margin-bottom:8px; }
      .cta-block { background:#f1592a; color:#fff; border-radius:8px; padding:18px 22px; margin-top:24px; }
      .cta-block h3 { color:#fff; margin-top:0; font-size:15px; }
      .cta-block p { color:rgba(255,255,255,0.9); margin-bottom:4px; }
    </style>
  </head><body>${content}</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

// ── N8N WEBHOOK CONFIG ──
// IMPORTANT: Replace this URL with your actual n8n webhook URL after creating the workflow
const N8N_WEBHOOK_URL = 'https://n8n.srv1047408.hstgr.cloud/webhook/upg-brochure-send';

async function sendViaOutlook() {
  const statusEl = document.getElementById('send-status');
  const brochureHtml = document.getElementById('print-target').innerHTML;

  // Separate managers (get master copy) from regular attendees (get individual)
  const allChecked = [...state.attendees]
    .filter(i => !state.deletedMembers.has(i))
    .map(i => ({ ...teamMembers[i], idx: i }))
    .filter(m => m.email);

  if (allChecked.length === 0) {
    statusEl.style.display = 'block';
    statusEl.style.background = '#fef2f2';
    statusEl.style.color = '#dc2626';
    statusEl.innerHTML = '⚠️ No attendees with email addresses are checked. Add emails to send.';
    return;
  }

  const managers = allChecked.filter(m => state.managers.has(m.idx));
  const regulars = allChecked.filter(m => !state.managers.has(m.idx));

  statusEl.style.display = 'block';
  statusEl.style.background = '#eff6ff';
  statusEl.style.color = '#2563eb';

  const sendResults = [];
  let errorOccurred = false;

  // Send master copy to managers (full brochure with all person blocks)
  for (const mgr of managers) {
    statusEl.innerHTML = `<div class="ai-loading"><div class="spinner"></div> Sending master copy to ${mgr.name}...</div>`;
    try {
      const resp = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [{ name: mgr.name, email: mgr.email, role: mgr.role }],
          subject: 'AI & Automation Roadmap — UPG Insurance (Master Copy) | Knowlogix',
          brochureHtml: brochureHtml,
          senderNote: 'Here is the complete AI & automation roadmap from our discovery session — this master copy includes personalized sections for all team members in attendance.',
          timestamp: new Date().toISOString()
        })
      });
      if (resp.ok) sendResults.push(`✅ ${mgr.name} (${mgr.email}) — master copy`);
      else throw new Error(`${resp.status}`);
    } catch(e) {
      sendResults.push(`❌ ${mgr.name} — failed (${e.message})`);
      errorOccurred = true;
    }
  }

  // Generate and send individual brochures for regular attendees
  for (const person of regulars) {
    statusEl.innerHTML = `<div class="ai-loading"><div class="spinner"></div> Generating personalized brochure for ${person.name}...</div>`;

    // Extract just this person's block from the master brochure
    // We'll ask AI to generate a slim individual version
    try {
      const data = await callAI(
        'You are rewriting a master brochure into a personalized individual version for ONE person. Keep the header, the "What We Heard" section, the recommended next steps, and the CTA block. But ONLY include the person-block for the specified individual — remove all other person-blocks. Return ONLY raw HTML, no markdown backticks.',
        `Master brochure HTML:\n${brochureHtml}\n\nCreate an individual version for: ${person.name} (${person.role}). Keep only their person-block, remove everyone else's. Return raw HTML only.`,
        2000
      );
      const individualHtml = (data.content || []).map(b => b.text || '').join('').replace(/```html|```/g, '').trim();

      statusEl.innerHTML = `<div class="ai-loading"><div class="spinner"></div> Sending to ${person.name}...</div>`;

      const sendResp = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [{ name: person.name, email: person.email, role: person.role }],
          subject: 'AI & Automation Roadmap — Personalized for You | Knowlogix',
          brochureHtml: individualHtml,
          senderNote: `Hi ${person.name.split(' ')[0]}, great meeting today. Here is your personalized AI & automation roadmap — tailored specifically to your role. Looking forward to the next step.`,
          timestamp: new Date().toISOString()
        })
      });
      if (sendResp.ok) sendResults.push(`✅ ${person.name} (${person.email}) — individual`);
      else throw new Error(`${sendResp.status}`);
    } catch(e) {
      sendResults.push(`❌ ${person.name} — failed (${e.message})`);
      errorOccurred = true;
    }
  }

  // Show results
  statusEl.style.background = errorOccurred ? '#fef0eb' : '#f0fdf4';
  statusEl.style.color = errorOccurred ? '#3a3a3c' : '#166534';
  statusEl.innerHTML = `<div style="font-weight:600;margin-bottom:6px;">${errorOccurred ? '⚠️ Some sends failed:' : '✅ All emails sent successfully:'}</div>` +
    sendResults.map(r => `<div style="font-size:11px;margin-bottom:2px;">${r}</div>`).join('') +
    (errorOccurred ? `<div style="margin-top:8px;display:flex;gap:8px;"><button class="btn-print" onclick="printBrochure()">🖨 Print / PDF as fallback</button></div>` : '');
}

function copyBrochureHtml() {
  const content = document.getElementById('print-target').innerHTML;
  navigator.clipboard.writeText(content).then(() => {
    alert('Brochure HTML copied to clipboard. Paste into an email as needed.');
  });
}

function openMailto() {
  const recipients = [...state.attendees]
    .filter(i => !state.deletedMembers.has(i))
    .map(i => teamMembers[i])
    .filter(m => m.email);
  const emails = recipients.map(r => r.email).join(';');
  const subject = encodeURIComponent('AI & Automation Roadmap — Customized for UPG Insurance | Knowlogix');
  const body = encodeURIComponent('Hi team,\n\nGreat meeting today. As promised, attached is your personalized AI & automation roadmap — generated live during our conversation using AI.\n\nLooking forward to the next step.\n\nBest,\nKnowlogix Team\nknowlogix.com | 843-900-4576');
  window.open(`mailto:${emails}?subject=${subject}&body=${body}`);
}

// ── INIT ──
renderAttendees();
renderQuestions(standardQuestions, 'standard-questions', 'std');
renderQuestions(customQuestions, 'custom-questions', 'upg');
