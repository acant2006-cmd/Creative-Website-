import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, Check, Menu, X, Dumbbell, Utensils, CalendarDays, Bell, Sunrise, Wind } from 'lucide-react';
import './index.css';
import './pricing.css';

const features = [
  { name: 'AI generated workouts', icon: Dumbbell },
  { name: 'Meal plans', icon: Utensils },
  { name: 'Warm-ups', icon: Sunrise },
  { name: 'Stretches', icon: Wind },
  { name: 'Reminders', icon: Bell },
  { name: 'Schedule-aware guidance', icon: CalendarDays },
];
function Pricing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 801px)');
    const close = () => { if (media.matches) setMenuOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && menuOpen) { setMenuOpen(false); toggle.current?.focus(); } };
    media.addEventListener('change', close);
    window.addEventListener('keydown', escape);
    return () => { media.removeEventListener('change', close); window.removeEventListener('keydown', escape); };
  }, [menuOpen]);
  const links = [['./#approach', 'The approach'], ['./#sample-day', 'Your sample day'], ['./#questions', 'Good to know'], ['pricing.html', 'Membership']];
  return <>
    <a href="#membership" className="skip-link">Skip to membership</a>
    <header className="site-header">
      <a href="./" className="brand" aria-label="Threshold Fit home">Threshold<span>Fit</span><span className="brand-dot" /></a>
      <nav className="desktop-nav" aria-label="Main navigation">{links.map(([href, label]) => <a key={href} href={href} aria-current={label === 'Membership' ? 'page' : undefined}>{label}</a>)}</nav>
      <a className="nav-cta" href="./#sample-day">Try the concept <ArrowUpRight size={16} /></a>
      <button ref={toggle} className="menu-toggle" aria-label="Toggle navigation" aria-expanded={menuOpen} aria-controls="mobile-drawer" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      {menuOpen && <nav id="mobile-drawer" aria-label="Mobile navigation">{links.map(([href, label]) => <a key={href} href={href} aria-current={label === 'Membership' ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>}
    </header>
    <main id="membership" className="pricing-main">
      <section className="pricing-hero" aria-labelledby="pricing-title">
        <div className="pricing-intro"><p className="eyebrow">THE THRESHOLD FIT MEMBERSHIP</p><h1>One routine.<br />More room<br /><em>for real life.</em></h1><p className="pricing-lead">Workouts, meals, and reminders.<br />One integrated fitness and meal-planning app concept.</p><a className="text-link" href="#included">Explore what’s included <span aria-hidden="true">↓</span></a><div className="pricing-status"><span className="status-dot" /><p>App concept · Not yet available<br /><span>Explore the idea with our interactive sample day.</span></p></div></div>
        <article className="membership-card" aria-labelledby="plan-name"><div className="card-topline"><span className="eyebrow">ONE PROPOSED PLAN</span><span className="plan-mark" aria-hidden="true">TF</span></div><h2 id="plan-name">Threshold Fit<br />Membership</h2><p className="plan-description">One integrated fitness and meal-planning app concept.</p><p className="membership-price"><span>$14.99</span><span>USD / month</span></p><p className="billing-note">Monthly billing</p><ul className="included-list">{features.map(f => <li key={f.name}><Check size={17} aria-hidden="true" />{f.name}</li>)}</ul><a className="button" href="./#sample-day">Explore a sample day <ArrowUpRight size={18} /></a><p className="card-footnote">Proposed membership · No payment or account required to explore the concept.</p></article>
      </section>
      <section id="included" className="section included-section" aria-labelledby="included-title"><div className="included-heading"><p className="eyebrow">BRING THE PIECES TOGETHER</p><h2 id="included-title">Six parts.<br /><em>One simpler routine.</em></h2><p>All six proposed features are included in the membership.</p></div><div className="membership-features">{features.map((f, i) => <article key={f.name}><f.icon size={25} strokeWidth={1.4} aria-hidden="true" /><span className="card-number">0{i + 1} / INCLUDED</span><h3>{f.name}</h3></article>)}</div></section>
      <section className="section questions" aria-labelledby="pricing-questions"><div><p className="eyebrow">A CLEAR START</p><h2 id="pricing-questions">A few things<br />to know.</h2><p>A clear price.<br />Room to explore the concept.</p></div><div className="faq-list"><details open><summary>What is the membership price?</summary><p>Threshold Fit Membership is priced at $14.99 USD per month, billed monthly.</p></details><details><summary>Are there other plans or add-ons?</summary><p>One monthly membership is proposed. No optional add-ons are proposed.</p></details><details><summary>Can I subscribe or download the app now?</summary><p>Not yet. Threshold Fit is an app concept. This website presents the proposed membership and an interactive sample day; subscriptions, payments, and app downloads are not available here.</p></details><details><summary>What can I try today?</summary><p>Explore the interactive sample day on our homepage. Choose a focus and a time window, explore the checklist, and select a meal-planning preference. It is an illustrative concept preview, not AI-generated or personalized exercise or nutrition advice.</p><a className="text-link" href="./#sample-day">Try your sample day →</a></details></div></section>
      <section className="closing"><p className="eyebrow">YOUR NEXT STEP CAN BE SMALL.</p><h2>See where a little<br /><em>structure could take you.</em></h2><a className="button" href="./#sample-day">Try your sample day <ArrowUpRight size={18} /></a></section>
    </main>
    <footer className="site-footer"><a className="brand" href="./">Threshold<span>Fit</span></a><p>A fitness startup concept for real life.</p><a href="./#questions">About this concept ↑</a></footer>
  </>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Pricing /></StrictMode>);
