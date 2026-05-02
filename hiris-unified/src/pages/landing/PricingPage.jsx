import { Link } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

const PLANS = [
  {
    name: 'Starter',
    size: 'Up to 50 users',
    price: '₹12,000',
    period: '/ month',
    desc: 'Ideal for small departments or pilot programmes. All core hiring workflows included.',
    features: [
      'Up to 3 active job postings',
      'Basic AI screening questions',
      'Standard hiring pipeline',
      'Email notifications',
      'Candidate portal (public link)',
      'CSV export',
      '5 user seats',
    ],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Growth',
    size: '51–200 users',
    price: '₹38,000',
    period: '/ month',
    desc: 'For institutions running multiple concurrent hiring pipelines with customised workflows.',
    features: [
      'Unlimited active job postings',
      'Advanced AI screening + scoring',
      'Customisable per-role pipelines',
      'JD collaboration and version history',
      'AI interview assistant',
      'Analytics dashboard',
      'Role-based access control',
      '25 user seats',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    size: '200+ users',
    price: 'Custom',
    period: '',
    desc: 'Full-scale deployment for large institutions with complex, multi-department hiring operations.',
    features: [
      'Everything in Growth',
      'Unlimited user seats',
      'Custom integrations (HRMS, LMS)',
      'Dedicated account manager',
      'SLA guarantees',
      'Advanced audit trails',
      'On-premise deployment option',
      'SSO / SAML authentication',
    ],
    cta: 'Start Enterprise Setup',
    highlight: false,
  },
]

const FAQS = [
  {
    q: 'How is pricing calculated?',
    a: 'Pricing is based on your organisation size (number of registered users). You choose the plan that fits your headcount at setup, and can upgrade anytime.',
  },
  {
    q: 'Can I change my plan later?',
    a: 'Yes. CHRO administrators can upgrade or downgrade the plan from the Settings panel. Changes take effect from the next billing cycle.',
  },
  {
    q: 'What counts as a "user seat"?',
    a: 'Any person with login access to HIRIS counts as a seat — regardless of their role (CHRO, Hiring Manager, Department Leader, etc.).',
  },
  {
    q: 'Is there a free trial?',
    a: 'All plans include a 30-day free trial with full feature access. No credit card is required to start.',
  },
  {
    q: 'Does HIRIS support custom roles beyond the three defaults?',
    a: 'Yes. During organisation setup, the CHRO can define any number of custom roles with granular permission settings.',
  },
]

export default function PricingPage() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Navbar />

      {/* ── Header ── */}
      <section style={{ paddingTop: 120, paddingBottom: 72, background: 'var(--slate-50)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
        <div className="container">
          <div className="badge" style={{ marginBottom: 18 }}>Simple Pricing</div>
          <h1 style={{ fontSize: '2.8rem', marginBottom: 16 }}>Transparent pricing for every institution</h1>
          <p style={{ fontSize: 16, color: 'var(--slate-600)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            No hidden fees. Plans scale with your organisation size. Every plan includes a 30-day free trial.
          </p>
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, alignItems: 'start' }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{
                border: plan.highlight ? '2px solid var(--teal)' : '1px solid var(--border)',
                borderRadius: 16, overflow: 'hidden',
                background: 'var(--surface)',
                boxShadow: plan.highlight ? '0 12px 40px rgba(40,102,110,0.15)' : 'var(--shadow-sm)',
                position: 'relative',
              }}>
                {plan.highlight && (
                  <div style={{ background: 'var(--teal)', color: 'white', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Most Popular
                  </div>
                )}
                <div style={{ padding: '32px 28px' }}>
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{plan.size}</div>
                    <h3 style={{ fontSize: 22, marginBottom: 12 }}>{plan.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                      <span style={{ fontFamily: 'var(--font-h)', fontSize: plan.price === 'Custom' ? 28 : 36, fontWeight: 900, color: 'var(--navy)' }}>{plan.price}</span>
                      <span style={{ fontSize: 13, color: 'var(--slate-500)', fontWeight: 500 }}>{plan.period}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--slate-600)', lineHeight: 1.6 }}>{plan.desc}</p>
                  </div>

                  <Link
                    to="/login"
                    style={{
                      display: 'block', textAlign: 'center', padding: '12px', borderRadius: 8,
                      background: plan.highlight ? 'var(--teal)' : 'transparent',
                      color: plan.highlight ? 'white' : 'var(--text-primary)',
                      border: plan.highlight ? 'none' : '1.5px solid var(--border)',
                      fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)',
                      transition: 'all 0.15s', marginBottom: 28,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = plan.highlight ? 'var(--teal-dark)' : 'var(--slate-50)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = plan.highlight ? 'var(--teal)' : 'transparent' }}
                  >{plan.cta}</Link>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--teal)', flexShrink: 0, marginTop: 1 }}>check_circle</span>
                        <span style={{ fontSize: 13, color: 'var(--slate-700)', lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section-sm" style={{ background: 'var(--slate-50)', borderTop: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <h2 style={{ textAlign: 'center', marginBottom: 48, fontSize: '1.8rem' }}>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border)', padding: '24px 0' }}>
                <h3 style={{ fontSize: 15, marginBottom: 10, fontWeight: 700 }}>{faq.q}</h3>
                <p style={{ fontSize: 13, color: 'var(--slate-600)', lineHeight: 1.7 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'var(--navy)', padding: '72px 0', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ color: 'white', marginBottom: 16 }}>Still have questions?</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginBottom: 32 }}>Talk to our team about the right plan for your organisation.</p>
          <Link to="/login" className="btn-white">Get Started Free</Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
