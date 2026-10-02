import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, Menu, X, ChevronDown, Compass, RotateCcw } from 'lucide-react';

const VIDEO_SCRUB_SRC = `${import.meta.env.BASE_URL}doorway_scrub.mp4`;
const VIDEO_FALLBACK_LOCAL = `${import.meta.env.BASE_URL}doorway.mp4`;

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0); // 0.0 to 1.0
  const [videoDuration, setVideoDuration] = useState(10.0);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTimeRef = useRef(0);
  const currentTimeRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  // Calculate normalized scroll progress [0, 1] and map to target video time
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollableDistance = rect.height - window.innerHeight;
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
    const scrollableDistance = rect.height - window.innerHeight;
    const targetScrollY = window.scrollY + rect.top + targetProgress * scrollableDistance;
    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth',
    });
  };

  // "make all text appear on the last frame not on first frame"
  // At 0% scroll (first frame): text is completely hidden (pure cinematic doorway)
  // Approaching & passing the doorway (0.70 - 1.0): text smoothly emerges into view
  // At 100% scroll (last frame): all text is fully visible at 100% opacity in pristine placement
  const lastFrameProgress = Math.min(1, Math.max(0, (scrollProgress - 0.70) / 0.28));
  // Smooth cubic ease-in-out curve
  const textOpacity = lastFrameProgress * lastFrameProgress * (3 - 2 * lastFrameProgress);
  const textTranslateY = (1 - textOpacity) * 28;

  // Current visual phase description for HUD
  const phaseLabel =
    scrollProgress < 0.32
      ? 'Approaching Doorway'
      : scrollProgress < 0.76
      ? 'Passing Through Portal'
      : 'Nature Sanctuary';

  return (
    <div
      ref={containerRef}
      id="scroll-container-track"
      className="relative w-full h-[400vh] bg-black"
    >
      {/* Pinned Viewport: Stays fixed on screen as the user scrolls through the 400vh track */}
      <div
        id="pinned-viewport"
        className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between select-none bg-black"
      >
        {/* Visual Animation Source: Video (No normal playback, timeline bound directly to scroll) */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay={false}
            preload="auto"
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={handlePlayAttempt}
            onSeeked={handleSeeked}
            className="absolute inset-0 w-full h-full object-cover opacity-100 pointer-events-none"
            style={{
              imageRendering: 'auto',
            }}
          >
            <source src={VIDEO_SCRUB_SRC} type="video/mp4" />
            <source src={VIDEO_FALLBACK_LOCAL} type="video/mp4" />
          </video>
        </div>

        {/* Navigation Bar: Appears on the last frame together with all text */}
        <nav
          id="navbar"
          style={{
            opacity: textOpacity,
            transform: `translateY(${-textTranslateY * 0.5}px)`,
            pointerEvents: textOpacity < 0.1 ? 'none' : 'auto',
          }}
          className="relative z-20 w-full px-6 sm:px-10 md:px-16 lg:px-20 pt-7 md:pt-9 pb-4 flex items-center justify-between drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] transition-all duration-150"
        >
          {/* Left: Brand Logo */}
          <div className="flex items-center">
            <button
              onClick={() => scrollToProgress(0)}
              id="brand-logo"
              className="text-white text-2xl md:text-[26px] font-bold tracking-tight hover:opacity-90 transition-opacity text-left cursor-pointer"
            >
              Threshold
            </button>
          </div>

          {/* Center: Navigation Links */}
          <div id="nav-links" className="hidden md:flex items-center space-x-10 lg:space-x-12">
            <a
              href="#vision"
              id="nav-vision"
              className="text-white/90 hover:text-white text-sm lg:text-[15px] font-normal tracking-wide transition-colors duration-200"
            >
              Vision
            </a>
            <a
              href="#resources"
              id="nav-resources"
              className="text-white/90 hover:text-white text-sm lg:text-[15px] font-normal tracking-wide transition-colors duration-200"
            >
              Resources
            </a>
            <a
              href="#platform"
              id="nav-platform"
              className="text-white/90 hover:text-white text-sm lg:text-[15px] font-normal tracking-wide transition-colors duration-200"
            >
              Platform
            </a>
          </div>

          {/* Right: Actions */}
          <div id="nav-actions" className="hidden md:flex items-center space-x-6">
            <a
              href="#signin"
              id="nav-signin"
              className="text-white/90 hover:text-white text-sm lg:text-[15px] font-normal transition-colors duration-200"
            >
              Sign in
            </a>
            <a
              href="#get-started"
              id="nav-get-started"
              className="px-4 py-1.5 rounded-[5px] border border-white/30 bg-black/20 backdrop-blur-md text-white text-sm lg:text-[15px] font-normal hover:bg-white/10 hover:border-white/50 active:scale-[0.98] transition-all duration-200 shadow-sm"
            >
              Get Started
            </a>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="md:hidden flex items-center space-x-3">
            <button
              id="mobile-menu-toggle"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white/90 hover:text-white rounded-md hover:bg-black/30 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile Drawer Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              id="mobile-drawer"
              className="md:hidden absolute top-20 inset-x-4 z-30 bg-black/95 backdrop-blur-2xl border border-white/15 rounded-xl p-6 shadow-2xl flex flex-col space-y-4"
            >
              <a
                href="#vision"
                onClick={() => setMobileMenuOpen(false)}
                className="text-zinc-200 hover:text-white text-base py-2 border-b border-white/10"
              >
                Vision
              </a>
              <a
                href="#resources"
                onClick={() => setMobileMenuOpen(false)}
                className="text-zinc-200 hover:text-white text-base py-2 border-b border-white/10"
              >
                Resources
              </a>
              <a
                href="#platform"
                onClick={() => setMobileMenuOpen(false)}
                className="text-zinc-200 hover:text-white text-base py-2 border-b border-white/10"
              >
                Platform
              </a>
              <div className="pt-2 flex flex-col space-y-3">
                <a
                  href="#signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center text-zinc-300 hover:text-white py-2"
                >
                  Sign in
                </a>
                <a
                  href="#get-started"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-md border border-white/25 bg-white/10 text-white font-medium hover:bg-white/20 transition-all"
                >
                  Get Started
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Hero Content Section: Appears on the last frame in full clarity */}
        <div
          id="hero-content"
          style={{
            opacity: textOpacity,
            transform: `translateY(${textTranslateY}px)`,
            pointerEvents: textOpacity < 0.1 ? 'none' : 'auto',
          }}
          className="relative z-10 w-full px-6 sm:px-10 md:px-16 lg:px-20 pb-12 sm:pb-14 md:pb-16 lg:pb-20 pt-16 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-10 lg:gap-16 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] transition-all duration-150"
        >
          {/* Left Side: Headline & Subtitle */}
          <div className="max-w-2xl xl:max-w-3xl flex flex-col">
            <h1
              id="hero-title"
              className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-[66px] xl:text-[72px] font-normal leading-[1.07] tracking-[-0.03em] drop-shadow-[0_3px_14px_rgba(0,0,0,0.9)]"
            >
              Step Inside the
              <br />
              World of Synthetic Minds
            </h1>
            <p
              id="hero-subtitle"
              className="mt-6 md:mt-8 text-zinc-100 text-sm sm:text-base md:text-[17px] font-normal leading-relaxed max-w-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
            >
              Discover the frontier where artificial intelligence begins to think, create
              and evolve like never before.
            </p>
          </div>

          {/* Right Side: Description & CTA Button */}
          <div className="max-w-sm sm:max-w-md flex flex-col items-start lg:items-start">
            <p
              id="hero-right-description"
              className="text-zinc-100 text-sm sm:text-base md:text-[15px] font-normal leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
            >
              Experience the next evolution of digital intelligence — built to empower innovation,
              automation, and imagination.
            </p>
            <button
              onClick={() => scrollToProgress(1)}
              id="explore-cta-btn"
              className="mt-6 group inline-flex items-center justify-center gap-2 bg-[#f05a22] hover:bg-[#e04f19] active:bg-[#c94313] text-white font-medium text-sm md:text-[15px] px-6 py-3 rounded-[3px] transition-all duration-200 shadow-xl shadow-orange-950/40 cursor-pointer"
            >
              <span>Explore the Future</span>
              <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>

        {/* Scroll Journey HUD & Controller Bar */}
        <div
          id="scroll-journey-hud"
          className="absolute bottom-4 right-6 sm:right-10 md:right-16 lg:right-20 z-30 flex items-center gap-3 bg-black/65 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-xs text-white shadow-2xl transition-all"
        >
          {/* Phase Badge */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide">
            <Compass className="w-3.5 h-3.5 text-orange-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span className="text-white/90 hidden sm:inline">{phaseLabel}</span>
            <span className="text-orange-400 font-semibold">{Math.round(scrollProgress * 100)}%</span>
          </div>

          <div className="h-3 w-[1px] bg-white/20" />

          {/* Quick Jump Buttons */}
          <button
            onClick={() => scrollToProgress(0)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              scrollProgress < 0.05 ? 'bg-white/25 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title="Scroll to first frame"
          >
            0%
          </button>
          <button
            onClick={() => scrollToProgress(0.5)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              scrollProgress >= 0.45 && scrollProgress <= 0.55 ? 'bg-white/25 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title="Scroll to middle"
          >
            50%
          </button>
          <button
            onClick={() => scrollToProgress(1)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              scrollProgress > 0.95 ? 'bg-white/25 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title="Scroll to last frame (All text appears)"
          >
            100%
          </button>

          <div className="h-3 w-[1px] bg-white/20" />

          {/* Reset to Start */}
          <button
            onClick={() => scrollToProgress(0)}
            className="p-1 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
            title="Reset to first frame"
            aria-label="Reset scroll to first frame"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Minimal Non-Text Scroll Icon at Start: Fades out completely as soon as user begins scrolling */}
        {scrollProgress < 0.05 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-6 left-6 sm:left-10 md:left-16 lg:left-20 z-20 flex items-center justify-center pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          >
            <div className="w-5 h-8 rounded-full border border-white/40 flex items-start justify-center p-1">
              <div className="w-1 h-2 bg-orange-400 rounded-full animate-bounce" />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
