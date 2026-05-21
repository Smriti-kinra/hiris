import { Link } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

/* ── Data ──────────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: 'smart_toy',
    title: 'AI-Powered Screening',
    desc: 'Automatically generate contextual screening questions for each role. AI analyses responses and ranks candidates before a human ever reads them.',
  },
  {
    icon: 'record_voice_over',
    title: 'Intelligent Interview Assistant',
    desc: 'During live interviews, HIRIS surfaces AI-generated follow-up questions based on the candidate\'s resume, prior round performance, and your institution\'s rubric.',
  },
  {
    icon: 'account_tree',
    title: 'Customisable Hiring Pipelines',
    desc: 'Every role can have its own pipeline. Define stages, assign reviewers, and set approval requirements — all without touching a line of code.',
  },
  {
    icon: 'manage_accounts',
    title: 'Role-Based Access Control',
    desc: 'CHRO, Hiring Manager, Department Leader, or custom roles — each user sees only what they need to. Permissions are configured at org setup.',
  },
  {
    icon: 'leaderboard',
    title: 'Unified Analytics Dashboard',
    desc: 'Track time-to-fill, offer acceptance rates, pipeline velocity, and inter-rater reliability across every department from a single view.',
  },
  {
    icon: 'link',
    title: 'Candidate Portal & Public Link',
    desc: 'Each job posting generates a branded candidate portal with an application form, AI screening, and automated status updates — ready to share instantly.',
  },
]

const PIPELINE_STEPS = [
  {
    step: '01',
    actor: 'Department Leader',
    title: 'Submit a Hiring Request',
    desc: 'A department leader submits a structured job request — role type, positions, required qualifications, and desired pipeline stages.',
    color: 'var(--pipeline-dept)',
  },
  {
    step: '02',
    actor: 'Hiring Manager',
    title: 'Build JD & Candidate Portal',
    desc: 'The hiring assistant drafts the job description with AI assistance, configures the hiring pipeline, and generates the public application portal.',
    color: 'var(--pipeline-hiring)',
  },
  {
    step: '03',
    actor: 'Department Leader',
    title: 'Review & Approve JD',
    desc: 'The department leader reviews the draft, leaves inline comments, and either requests changes or formally approves to publish.',
    color: 'var(--pipeline-dept)',
  },
  {
    step: '04',
    actor: 'Hiring Manager',
    title: 'Publish & Collect Applications',
    desc: 'The job goes live. Candidates apply through the branded portal. AI screening questions are served automatically. All responses are collected.',
    color: 'var(--pipeline-hiring)',
  },
  {
    step: '05',
    actor: 'Hiring Manager',
    title: 'Shortlist Candidates',
    desc: 'The hiring assistant reviews AI-ranked applications, shortlists qualified candidates, and forwards them to the department leader for review.',
    color: 'var(--pipeline-hiring)',
  },
  {
    step: '06',
    actor: 'Department Leader',
    title: 'Technical Interview',
    desc: 'The department leader conducts a structured technical interview, scores the candidate against defined rubrics, and forwards qualified candidates to the CHRO.',
    color: 'var(--pipeline-dept)',
  },
  {
    step: '07',
    actor: 'CHRO',
    title: 'Final Interview & Decision',
    desc: 'The CHRO conducts the final round. HIRIS surfaces AI follow-up questions based on the institutional fit rubric. A final Accept, Reject, or Waitlist decision is recorded.',
    color: 'var(--pipeline-chro)',
  },
]

const STATS = [
  { value: '65%', label: 'Reduction in time-to-fill' },
  { value: '3x', label: 'Faster JD approval cycles' },
  { value: '90%', label: 'Candidate data completeness' },
  { value: '40%', label: 'Drop in mis-hires' },
]

const LOGOS = ['University of Technology', 'National Institute', 'Metro College', 'Research Foundation', 'City University']

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(160deg, #0F172A 0%, #1e3a4a 55%, #28666E 100%)',
        paddingTop: 140, paddingBottom: 96, position: 'relative', overflow: 'hidden',
      }}>
        {/* background grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px', pointerEvents: 'none',
        }} />
        {/* glow */}
        <div style={{ position: 'absolute', top: '10%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(40,102,110,0.35) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div className="badge" style={{ display: 'inline-flex', marginBottom: 28, background: 'rgba(40,102,110,0.25)', color: '#7ecdd4', borderColor: 'rgba(40,102,110,0.4)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>auto_awesome</span>
            AI-Driven Hiring Intelligence
          </div>

          <h1 style={{ color: 'white', marginBottom: 24, maxWidth: 820, margin: '0 auto 24px', lineHeight: 1.1, textShadow: '0 2px 18px rgba(0,0,0,0.25)' }}>
            Streamline Hiring for<br />
            <span style={{ color: '#7ecdd4' }}>Faculty and Non-Faculty</span> Roles
          </h1>

          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.76)', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7 }}>
            HIRIS is a complete hiring management platform for institutions and organisations. From job requisition to final offer — every step, every stakeholder, one system.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
            <Link to="/get-started" className="btn-white" style={{ fontSize: 15, padding: '14px 32px' }}>Get Started</Link>
            <Link to="/pricing" className="btn-secondary" style={{ fontSize: 15, padding: '14px 32px', color: 'rgba(255,255,255,0.75)', borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
            >Pricing</Link>
          </div>

          {/* Dashboard mockup */}
          <div style={{
            maxWidth: 960, margin: '0 auto',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
          }}>
            {/* Browser chrome */}
            <div style={{ height: 36, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['#EF4444', '#F59E0B', '#22C55E'].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
              ))}
              <div style={{ flex: 1, height: 20, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginLeft: 12, maxWidth: 320 }} />
            </div>
            {/* Mock UI */}
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ── LOGOS BAR ────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: '1px solid var(--border)', padding: '28px 0', background: 'var(--slate-50)' }}>
        <div className="container">
          <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--slate-400)', marginBottom: 20 }}>
            Trusted by leading institutions
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap', alignItems: 'center' }}>
            {LOGOS.map(name => (
              <span key={name} style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-400)', letterSpacing: '-0.2px', fontFamily: 'var(--font-h)' }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section className="section-sm" style={{ background: 'var(--surface)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
            {STATS.map(s => (
              <div key={s.value} style={{ textAlign: 'center', padding: '32px 16px', borderRadius: 12, background: 'var(--slate-50)', border: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--font-h)', fontSize: 42, fontWeight: 900, color: 'var(--teal)', lineHeight: 1, marginBottom: 8 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: 'var(--slate-600)', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="section" style={{ background: 'var(--slate-50)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div className="badge" style={{ marginBottom: 16 }}>Platform Features</div>
            <h2 style={{ marginBottom: 16 }}>Everything you need to hire better</h2>
            <p style={{ fontSize: 16, color: 'var(--slate-600)', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
              HIRIS brings AI, workflow automation, and structured evaluation into a single platform designed for institutional hiring.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--teal-10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--teal)', fontSize: 22 }}>{f.icon}</span>
                </div>
                <h3 style={{ fontSize: 15 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--slate-600)', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PIPELINE WALKTHROUGH ─────────────────────────────────────────── */}
      <section id="pipeline" className="section" style={{ background: 'var(--surface)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="badge" style={{ marginBottom: 16 }}>The Hiring Pipeline</div>
            <h2 style={{ marginBottom: 16 }}>A structured process,<br />from request to offer</h2>
            <p style={{ fontSize: 16, color: 'var(--slate-600)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
              HIRIS coordinates every stakeholder across every stage. No emails, no spreadsheets, no dropped candidates.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {PIPELINE_STEPS.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 24, position: 'relative' }}>
                {/* Step number + connector */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: s.color, color: 'var(--pipeline-number-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 13, flexShrink: 0, zIndex: 1 }}>{s.step}</div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 8 }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ paddingBottom: 36, paddingTop: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: s.color, marginBottom: 6 }}>{s.actor}</div>
                  <h3 style={{ fontSize: 17, marginBottom: 8 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--slate-600)', lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI HIGHLIGHT ─────────────────────────────────────────────────── */}
      <section className="section" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1e3a4a 100%)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 80, alignItems: 'center' }}>
            <div>
              <div className="badge" style={{ marginBottom: 20, background: 'rgba(40,102,110,0.25)', color: '#7ecdd4', borderColor: 'rgba(40,102,110,0.4)' }}>
                AI at the Core
              </div>
              <h2 style={{ color: 'white', marginBottom: 20 }}>Hiring intelligence that works while you interview</h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, marginBottom: 32 }}>
                HIRIS reads the candidate's resume, prior round transcripts, and your institutional rubric — then surfaces follow-up questions in real time. No preparation required.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { icon: 'psychology', label: 'Contextual follow-up question generation' },
                  { icon: 'fact_check', label: 'Rubric-aligned scoring and gap identification' },
                  { icon: 'summarize', label: 'Post-interview summary and recommendation' },
                  { icon: 'compare', label: 'Cross-candidate comparative analysis' },
                ].map(item => (
                  <div key={item.icon} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(40,102,110,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ color: '#7ecdd4', fontSize: 18 }}>{item.icon}</span>
                    </div>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* AI mock panel */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>AI Interview Assistant</div>
              {[
                { label: 'Candidate', text: 'I led the curriculum redesign for the advanced algorithms module across two semesters.' },
                { label: 'AI Suggestion', text: 'Based on the rubric criterion "pedagogy innovation" — ask: How did you measure student outcomes before and after the redesign?', ai: true },
                { label: 'AI Suggestion', text: 'The resume lists NPTEL but no publications. Consider asking about research dissemination expectations.', ai: true },
              ].map((msg, i) => (
                <div key={i} style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 10, background: msg.ai ? 'rgba(40,102,110,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${msg.ai ? 'rgba(40,102,110,0.35)' : 'rgba(255,255,255,0.08)'}` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: msg.ai ? '#7ecdd4' : 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{msg.label}</div>
                  <p style={{ fontSize: 12, color: msg.ai ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{msg.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--teal)', padding: '80px 0' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'white', marginBottom: 16, fontSize: '2.2rem' }}>Ready to transform your hiring process?</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
            Set up your organisation in minutes. No credit card required for the first 30 days.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link to="/get-started" className="btn-white" style={{ fontSize: 15 }}>Get Started</Link>
            <Link to="/pricing" className="btn-secondary" style={{ color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', fontSize: 15 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
            >View Pricing</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

/* ── Dashboard Mockup ──────────────────────────────────────────────────────── */
function DashboardMockup() {
  return (
    <div style={{ background: '#F8FAFC', padding: 24, display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, minHeight: 340 }}>
      {/* Sidebar */}
      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 14, border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--teal)' }} />
          <div style={{ height: 10, width: 60, background: 'var(--slate-200)', borderRadius: 4 }} />
        </div>
        {['Dashboard', 'Hiring Requests', 'Active Postings', 'Candidates', 'Analytics'].map((item, i) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 6, background: i === 0 ? 'var(--teal-10)' : 'transparent', marginBottom: 2 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: i === 0 ? 'var(--teal)' : 'var(--slate-200)' }} />
            <div style={{ height: 8, width: `${40 + i * 8}px`, background: i === 0 ? 'var(--teal)' : 'var(--slate-200)', borderRadius: 4 }} />
          </div>
        ))}
      </div>
      {/* Main */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 10 }}>
          {[['47', 'Open Positions'], ['312', 'Applicants'], ['32d', 'Avg. Time to Fill'], ['78%', 'Offer Rate']].map(([v, l]) => (
            <div key={l} style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 900, fontSize: 22, color: 'var(--teal)', marginBottom: 2 }}>{v}</div>
              <div style={{ fontSize: 10, color: 'var(--slate-400)', fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid #E2E8F0', padding: 16, flex: 1 }}>
          <div style={{ height: 10, width: 120, background: 'var(--slate-200)', borderRadius: 4, marginBottom: 14 }} />
          {['Computer Science — 6 candidates', 'Life Sciences — 3 candidates', 'Administration — 8 candidates'].map((row, i) => (
            <div key={row} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--slate-100)' }}>
              <div style={{ height: 8, width: `${120 + i * 28}px`, background: 'var(--slate-100)', borderRadius: 4 }} />
              <div style={{ height: 18, width: 56, borderRadius: 20, background: 'var(--teal-10)', border: '1px solid rgba(40,102,110,0.2)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
