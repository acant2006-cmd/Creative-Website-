import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, Menu, X, Compass, RotateCcw, Utensils, Dumbbell, CalendarDays, Check } from 'lucide-react';

const VIDEO_SCRUB_SRC = `${import.meta.env.BASE_URL}doorway_scrub.mp4`;
const VIDEO_FALLBACK_LOCAL = `${import.meta.env.BASE_URL}doorway.mp4`;

export default function App() {
  const [minutes, setMinutes] = useState(20);
  const [goal, setGoal] = useState('Build consistency');
  const [meal, setMeal] = useState('Family favorites');
  const [completed, setCompleted] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0); // 0.0 to 1.0
  const [videoDuration, setVideoDuration] = useState(10.0);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const menuToggleRef = useRef<HTMLButtonElement>(null);

  // Cross-page anchors must wait for React to mount their destination.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const destination = document.getElementById(window.location.hash.slice(1));
      destination?.scrollIntoView({ behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Dismiss the mobile drawer on Escape or when moving to the desktop layout.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 801px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    };
    desktop.addEventListener('change', closeOnDesktop);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileMenuOpen]);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTimeRef = useRef(0);
  const currentTimeRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  // Calculate normalized scroll progress [0, 1] and map to target video time
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollableDistance = rect.height - (containerRef.current.firstElementChild?.clientHeight || window.innerHeight);
    if (scrollableDistance <= 0) return;

    // Current scrolled amount inside the container
    const currentScroll = -rect.top;
    const progress = Math.min(1, Math.max(0, currentScroll / scrollableDistance));

    setScrollProgress(progress);

    const duration = videoRef.current?.duration || videoDuration || 10.0;
    // Map scroll progress directly onto video duration
    targetTimeRef.current = progress * duration;
  }, [videoDuration]);

  // Video metadata loaded: pause permanently and initialize timeline
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    // Strictly pause the video permanently
    video.pause();
    const duration = video.duration || 10.0;
    setVideoDuration(duration);
    setIsVideoReady(true);

    // Initial position based on current window scroll
    handleScroll();
    currentTimeRef.current = targetTimeRef.current;
    video.currentTime = targetTimeRef.current;
  };

  // Keep video paused permanently - reject any unexpected play requests
  const handlePlayAttempt = () => {
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  };

  // Continuous animation frame loop: smoothly LERP current video time to target time
  useEffect(() => {
    let isMounted = true;

    const animate = () => {
      if (!isMounted) return;

      const video = videoRef.current;
      if (video && isVideoReady) {
        // Guarantee video stays paused
        if (!video.paused) {
          video.pause();
        }

        const target = targetTimeRef.current;
        const current = currentTimeRef.current;
        const diff = target - current;

        // Only interpolate if there is a noticeable difference
        if (Math.abs(diff) > 0.0003) {
          // LERP factor (0.12) creates a direct, physically grounded link to scrolling
          currentTimeRef.current += diff * 0.12;

          const duration = video.duration || videoDuration || 10.0;
          // Clamp time securely between 0 and duration
          const clampedTime = Math.min(duration - 0.001, Math.max(0, currentTimeRef.current));

          // Set currentTime when video is ready to receive seek without dropping
          if (!video.seeking) {
            video.currentTime = clampedTime;
          }
        }
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      isMounted = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isVideoReady, videoDuration]);

  // Handle seeked callback to ensure instantaneous catch-up if user scrubs quickly
  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video) return;
    const diff = Math.abs(video.currentTime - currentTimeRef.current);
    if (diff > 0.03) {
      const duration = video.duration || videoDuration || 10.0;
      video.currentTime = Math.min(duration - 0.001, Math.max(0, currentTimeRef.current));
    }
  };

  // Attach scroll and resize listeners
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [handleScroll]);

  // Smooth jump to specific scroll checkpoints
  const scrollToProgress = (targetProgress: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollableDistance = rect.height - (containerRef.current.firstElementChild?.clientHeight || window.innerHeight);
    const targetScrollY = window.scrollY + rect.top + targetProgress * scrollableDistance;
    window.scrollTo({
      top: targetScrollY,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  // Keep the original scroll-to-video journey; reveal the destination at its end.
  const textOpacity = Math.min(1, Math.max(0, (scrollProgress - 0.70) / 0.28));
  const phaseLabel = scrollProgress < 0.32 ? 'Make room for you' : scrollProgress < 0.76 ? 'Find your rhythm' : 'Step into your routine';
  const blocks = [
    { id: 'prepare', time: `${Math.round(minutes * .2)} min`, title: 'Prepare', detail: 'A warm-up slot before your session.' },
    { id: 'move', time: `${Math.round(minutes * .6)} min`, title: goal === 'Build strength' ? 'Strength focus' : goal === 'Make time to move' ? 'Movement break' : 'Your daily movement', detail: 'Space for a workout matched to your preferences.' },
    { id: 'reset', time: `${minutes - Math.round(minutes * .2) - Math.round(minutes * .6)} min`, title: 'Reset', detail: 'Time to cool down and reflect on your day.' },
  ];
  const links = [['#approach', 'The approach'], ['#sample-day', 'Your sample day'], ['#questions', 'Good to know'], ['pricing.html', 'Membership']];
  return (
    <>
      <header className="site-header">
        <a href="#" className="brand" aria-label="Threshold Fit home">Threshold<span>Fit</span><span className="brand-dot" /></a>
        <nav className="desktop-nav" aria-label="Main navigation">{links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</nav>
        <a className="nav-cta" href="#sample-day">Try the concept <ArrowUpRight size={16} /></a>
        <button ref={menuToggleRef} className="menu-toggle" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen} aria-controls="mobile-drawer" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X /> : <Menu />}</button>
        <AnimatePresence>{mobileMenuOpen && <motion.nav id="mobile-drawer" aria-label="Mobile navigation" initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>{links.map(([href,label]) => <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}>{label}</a>)}</motion.nav>}</AnimatePresence>
      </header>
      <main>
        <div ref={containerRef} id="scroll-container-track" className="journey-track">
          <div id="pinned-viewport" className="journey-viewport">
            <video ref={videoRef} muted playsInline preload="auto" onLoadedMetadata={handleLoadedMetadata} onPlay={handlePlayAttempt} onSeeked={handleSeeked} className="journey-video" aria-label="A doorway opens from a dark meadow into a bright landscape as you scroll">
              <source src={VIDEO_SCRUB_SRC} type="video/mp4" /><source src={VIDEO_FALLBACK_LOCAL} type="video/mp4" />
            </video>
            <div className="video-shade" />
            <div className="opening-copy" style={{opacity:Math.max(0, 1 - scrollProgress * 4),visibility:scrollProgress >= .25 ? 'hidden' : 'visible'}}>
              <p className="eyebrow">FITNESS, WITH A WAY FORWARD</p>
              <h1>A busy life.<br />A little room<br /><em>for you.</em></h1>
              <p>Meals, movement, and motivation.<br />One simpler path through it all.</p>
              <a href="#sample-day" className="button">Find your rhythm <ArrowUpRight size={18} /></a>
            </div>
            <div id="hero-content" className="destination-copy" style={{opacity:textOpacity,visibility:textOpacity === 0 ? 'hidden' : 'visible'}}>
              <p className="eyebrow">MEET THRESHOLD FIT</p>
              <h2>Your goals.<br /><em>Your real life.</em></h2>
              <p>An AI fitness companion concept for busy adults. A plan for what to eat, when to move, and how to keep going—all in one place.</p>
              <a href="#sample-day" className="button">Explore a sample day <ArrowUpRight size={18} /></a>
            </div>
            <div className="journey-footer">
              <span className="scroll-hint">SCROLL TO STEP THROUGH <span>↓</span></span>
              <div id="scroll-journey-hud" className="journey-hud"><Compass size={15} /><span className="phase-label">{phaseLabel}</span><span className="progress">{Math.round(scrollProgress * 100)}%</span>
                {[0,.5,1].map(n => <button key={n} onClick={() => scrollToProgress(n)} aria-label={`Jump to ${n * 100}% of the journey`}>{n * 100}%</button>)}
                <button onClick={() => scrollToProgress(0)} aria-label="Reset scroll to first frame"><RotateCcw size={14} /></button>
              </div>
            </div>
          </div>
        </div>
        <section id="approach" className="section approach">
          <div className="section-heading"><p className="eyebrow">LESS GUESSWORK. MORE LIVING.</p><h2>Fitness shouldn't be<br />another full-time job.</h2><p>Wondering what to eat, which workout to choose, or where to start? Our idea is simple: bring the pieces together, around the life you already have.</p></div>
          <div className="feature-grid">
            <article><Utensils /><span className="card-number">01 / NOURISH</span><h3>Your food. A clearer plan.</h3><p>Meal planning designed around familiar foods, preferences, and family routines. Less starting over. More working with what you love.</p></article>
            <article><Dumbbell /><span className="card-number">02 / MOVE</span><h3>A place for every step.</h3><p>Warm-ups, workouts, and stretches in one guided routine. A proposed AI companion to help take the uncertainty out of getting started.</p></article>
            <article><CalendarDays /><span className="card-number">03 / KEEP GOING</span><h3>Built around your day.</h3><p>Flexible plans, simple tracking, and reminders on your terms. Encouragement that makes room for busy weeks and fresh starts.</p></article>
          </div>
        </section>
        <section id="sample-day" className="section demo-section">
          <div className="demo-intro"><p className="eyebrow">MAKE SPACE. SEE WHAT FITS.</p><h2>A little structure.<br /><em>A lot less guessing.</em></h2><p>Choose a focus and a time window to explore how a day could come together.</p><div className="concept-note">Interactive concept preview · Illustrative scheduling only. These examples are not AI-generated or personalized exercise or nutrition advice.</div></div>
          <div className="planner">
            <div className="planner-heading"><span className="eyebrow">YOUR SAMPLE DAY</span><span className="preview-badge">CONCEPT</span></div>
            <label htmlFor="goal">What would you like to focus on?</label><select id="goal" value={goal} onChange={e => {setGoal(e.target.value);setCompleted([]);}}>{['Build consistency','Build strength','Make time to move'].map(g => <option key={g}>{g}</option>)}</select>
            <fieldset><legend>How much time can you set aside?</legend><div className="time-options">{[10,20,30].map(n => <button key={n} aria-pressed={minutes === n} onClick={() => {setMinutes(n);setCompleted([]);}}>{n} min</button>)}</div></fieldset>
            <label htmlFor="meal">What should meals fit around?</label><select id="meal" value={meal} onChange={e => setMeal(e.target.value)}>{['Family favorites','Quick assembly','Preparing ahead'].map(m => <option key={m}>{m}</option>)}</select>
            <div className="sample-result" aria-live="polite"><div className="result-title"><h3>{minutes} minutes for you</h3><span>{completed.length}/3 explored</span></div>
              {blocks.map(block => <button className={`timeline-row ${completed.includes(block.id) ? 'checked' : ''}`} key={block.id} aria-pressed={completed.includes(block.id)} onClick={() => setCompleted(prev => prev.includes(block.id) ? prev.filter(id => id !== block.id) : [...prev,block.id])}><span className="check-box">{completed.includes(block.id) && <Check size={14} />}</span><span><strong>{block.title}</strong><small>{block.detail}</small></span><span className="time-label">{block.time}</span></button>)}
              <div className="meal-note"><Utensils size={18} /><p><strong>{meal}</strong><br />{meal === 'Family favorites' ? 'Make room for a shared meal using foods your household already enjoys.' : meal === 'Quick assembly' ? 'Reserve a meal break for something simple to put together.' : 'Set aside a planning moment for meals you can prepare ahead.'}</p></div>
            </div>
            <p className="planner-footnote">Tap each step to try the checklist. Your selections stay in this page and reset when you reload.</p>
          </div>
        </section>
        <section id="questions" className="section questions"><div><p className="eyebrow">A CLEAR START</p><h2>Good to know.</h2><p>One app is the vision.<br />Everyday simplicity is the goal.</p></div><div className="faq-list">
          <details open><summary>Who is Threshold Fit for?</summary><p>Busy adults who want a clearer fitness routine and less time spent piecing together meals, movement, and reminders across different apps.</p></details>
          <details><summary>Can I download the app today?</summary><p>Not yet. This website presents a marketing venture concept. The interactive sample demonstrates the idea; a working AI coach and downloadable app are not available here.</p></details>
          <details><summary>How would a subscription work?</summary><p>The proposed model is one subscription for meal planning, exercise guidance, reminders, and tracking. The confirmed price is $14.99 USD per month. Launch details are still to come. This preview requires no payment or account. <a className="text-link" href="pricing.html">Explore the membership →</a></p></details>
          <details><summary>What matters most as the idea develops?</summary><p>Easy logging, dependable performance, clear pricing, and guidance people can trust. Nutrition data quality and appropriate professional input are priorities to validate as the product develops.</p></details>
        </div></section>
        <section className="section membership-teaser" aria-labelledby="membership-heading"><div><p className="eyebrow">ONE MEMBERSHIP. A CLEARER ROUTINE.</p><h2 id="membership-heading">A little room.<br /><em>All in one place.</em></h2><p>Explore the proposed Threshold Fit Membership: workouts, meals, warm-ups, stretches, reminders, and schedule-aware guidance.</p></div><div><p className="teaser-price">$14.99 <span>USD / month</span></p><p>App concept · Not yet available</p><a className="button" href="pricing.html">Explore the membership <ArrowUpRight size={18} /></a></div></section>
        <section className="closing"><p className="eyebrow">YOUR NEXT STEP CAN BE SMALL.</p><h2>Make room for a routine<br />that makes room for you.</h2><a className="button" href="#sample-day">Try your sample day <ArrowUpRight size={18} /></a></section>
      </main>
      <footer className="site-footer"><a className="brand" href="#">Threshold<span>Fit</span></a><p>A fitness startup concept for real life.</p><a href="#questions">About this concept ↑</a></footer>
    </>
  );
}
