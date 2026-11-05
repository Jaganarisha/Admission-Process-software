import { useEffect, useRef, useState } from 'react';
import { COLLEGE } from '../config/college';

const CAMPUS_MEDIA = [
  {
    id: 'aerial',
    title: 'Scenic Hillside Campus & Greenery',
    subtitle: 'Aerial Panorama',
    tag: '25+ Acres Green Campus',
    description: 'Nestled against scenic natural hills along Chennai-Bangalore NH, featuring expansive eco-friendly academic grounds.',
    src: '/images/campus.jpg',
    aspect: '4/3',
    stats: '25+ Acres · Anna Univ.',
  },
  {
    id: 'banner',
    title: 'Academic Grounds & Entrance Boulevard',
    subtitle: 'Campus Gateway',
    tag: 'Hi-Tech Infrastructure',
    description: 'Well-connected entrance boulevard with multi-lane access, landscaped central gardens, and seminar halls.',
    src: '/images/campus-banner.jpg',
    aspect: '4/3',
    stats: 'Smart Classrooms · Library',
  },
  {
    id: 'mech',
    title: 'Mechanical & Robotics Technology Block',
    subtitle: 'Modern Labs',
    tag: 'Advanced Engineering',
    description: 'Spacious dedicated technical complex housing modern CAD/CAM, Thermal, Robotics, and Manufacturing workshops.',
    src: '/images/mech-block.jpg',
    aspect: '4/3',
    stats: '15+ Modern Labs · AICTE',
  },
];

export default function CampusImageShowcase({ onSelectImage }) {
  const [viewMode, setViewMode] = useState('tilt'); // 'tilt' | 'carousel' | 'tour'
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [tourIndex, setTourIndex] = useState(0);
  const [isAutoSpin, setIsAutoSpin] = useState(true);
  const [globalMouse, setGlobalMouse] = useState({ x: 0, y: 0 });
  const sectionRef = useRef(null);

  // Global cursor tracking across showcase for smooth parallax movement
  const handleSectionMouseMove = (e) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setGlobalMouse({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
  };

  const handleSectionMouseLeave = () => {
    setGlobalMouse({ x: 0, y: 0 });
  };

  // Auto-spin for 3D carousel
  useEffect(() => {
    if (viewMode !== 'carousel' || !isAutoSpin) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % CAMPUS_MEDIA.length);
    }, 4200);
    return () => clearInterval(interval);
  }, [viewMode, isAutoSpin]);

  return (
    <section
      ref={sectionRef}
      className="container section campus-movement-showcase"
      onMouseMove={handleSectionMouseMove}
      onMouseLeave={handleSectionMouseLeave}
    >
      {/* Header with Mode Switcher */}
      <div className="movement-header">
        <div className="movement-header-text">
          <div className="pill-badge">
            <span className="live-dot pulse"></span>
            <span>Dynamic 3D Campus Gallery</span>
          </div>
          <h2>Campus Life &amp; Infrastructure in Motion</h2>
          <p className="muted">
            Move your cursor across the cards to experience dynamic 3D depth, perspective parallax, and live campus exploration.
          </p>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="movement-mode-pills" role="tablist" aria-label="Movement Gallery Modes">
          <button
            type="button"
            className={`mode-pill ${viewMode === 'tilt' ? 'active' : ''}`}
            onClick={() => setViewMode('tilt')}
          >
            <span>🎴</span>
            <b>3D Tilt Parallax</b>
          </button>
          <button
            type="button"
            className={`mode-pill ${viewMode === 'carousel' ? 'active' : ''}`}
            onClick={() => setViewMode('carousel')}
          >
            <span>🎠</span>
            <b>3D Rotating Carousel</b>
          </button>
          <button
            type="button"
            className={`mode-pill ${viewMode === 'tour' ? 'active' : ''}`}
            onClick={() => setViewMode('tour')}
          >
            <span>🔍</span>
            <b>Interactive 3D Lens</b>
          </button>
        </div>
      </div>

      {/* MODE 1: 3D PARALLAX TILT CARDS */}
      {viewMode === 'tilt' && (
        <div className="movement-cards-grid">
          {CAMPUS_MEDIA.map((item, idx) => (
            <ParallaxCard
              key={item.id}
              item={item}
              index={idx}
              globalMouse={globalMouse}
              onOpen={() => onSelectImage?.(item)}
            />
          ))}
        </div>
      )}

      {/* MODE 2: 3D CYLINDER ROTATING CAROUSEL */}
      {viewMode === 'carousel' && (
        <div className="movement-carousel-stage">
          <div className="movement-carousel-viewport">
            <div
              className="movement-carousel-cylinder"
              style={{
                transform: `translateZ(-280px) rotateY(${-carouselIndex * (360 / CAMPUS_MEDIA.length)}deg)`,
              }}
            >
              {CAMPUS_MEDIA.map((item, idx) => {
                const angle = idx * (360 / CAMPUS_MEDIA.length);
                const isCurrent = idx === carouselIndex;
                return (
                  <div
                    key={item.id}
                    className={`carousel-3d-card ${isCurrent ? 'active' : ''}`}
                    style={{
                      transform: `rotateY(${angle}deg) translateZ(280px)`,
                    }}
                    onClick={() => {
                      if (isCurrent) onSelectImage?.(item);
                      else setCarouselIndex(idx);
                    }}
                  >
                    <div className="carousel-card-inner">
                      <div className="carousel-img-wrap">
                        <img src={item.src} alt={item.title} />
                        <span className="carousel-floating-badge">{item.tag}</span>
                      </div>
                      <div className="carousel-card-body">
                        <span className="badge tone-blue">{item.subtitle}</span>
                        <h4>{item.title}</h4>
                        <p className="small muted">{item.description}</p>
                        <div className="carousel-card-footer">
                          <span className="stats-pill">{item.stats}</span>
                          <span className="btn-peek">Inspect 🔍</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Carousel Navigation Controls */}
          <div className="carousel-controls-bar">
            <button
              type="button"
              className="carousel-btn"
              onClick={() => setCarouselIndex((prev) => (prev - 1 + CAMPUS_MEDIA.length) % CAMPUS_MEDIA.length)}
              aria-label="Previous Campus Photo"
            >
              ❮ Prev
            </button>
            <div className="carousel-dots">
              {CAMPUS_MEDIA.map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  className={`dot ${idx === carouselIndex ? 'active' : ''}`}
                  onClick={() => setCarouselIndex(idx)}
                  aria-label={`Go to ${m.title}`}
                />
              ))}
            </div>
            <button
              type="button"
              className="carousel-btn"
              onClick={() => setCarouselIndex((prev) => (prev + 1) % CAMPUS_MEDIA.length)}
              aria-label="Next Campus Photo"
            >
              Next ❯
            </button>
            <button
              type="button"
              className={`carousel-btn auto-toggle ${isAutoSpin ? 'active' : ''}`}
              onClick={() => setIsAutoSpin(!isAutoSpin)}
              title={isAutoSpin ? 'Pause auto 3D rotation' : 'Resume auto 3D rotation'}
            >
              {isAutoSpin ? '⏸️ Auto' : '▶️ Play'}
            </button>
          </div>
        </div>
      )}

      {/* MODE 3: INTERACTIVE 3D LENS & PAN */}
      {viewMode === 'tour' && (
        <InteractiveLensViewer
          item={CAMPUS_MEDIA[tourIndex]}
          items={CAMPUS_MEDIA}
          currentIndex={tourIndex}
          onSelect={setTourIndex}
          onOpenModal={() => onSelectImage?.(CAMPUS_MEDIA[tourIndex])}
        />
      )}
    </section>
  );
}

// ==========================================
// PARALLAX 3D TILT CARD COMPONENT
// ==========================================
function ParallaxCard({ item, index, globalMouse, onOpen }) {
  const cardRef = useRef(null);
  const [localTilt, setLocalTilt] = useState({ rotX: 0, rotY: 0, glareX: 50, glareY: 50, isHover: false });

  // Compute slight parallax offset from global section movement
  const depthFactor = (index % 2 === 0 ? 1.2 : 0.8) * 8;
  const globalOffsetX = -globalMouse.x * depthFactor;
  const globalOffsetY = -globalMouse.y * depthFactor;

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normX = (x / rect.width - 0.5) * 2;
    const normY = (y / rect.height - 0.5) * 2;

    setLocalTilt({
      rotX: -normY * 15,
      rotY: normX * 15,
      glareX: (x / rect.width) * 100,
      glareY: (y / rect.height) * 100,
      isHover: true,
    });
  };

  const handleMouseLeave = () => {
    setLocalTilt({ rotX: 0, rotY: 0, glareX: 50, glareY: 50, isHover: false });
  };

  return (
    <div
      ref={cardRef}
      className={`parallax-card-shell ${localTilt.isHover ? 'hovered' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(); }}
      aria-label={`View ${item.title}`}
      style={{
        transform: `perspective(1000px) rotateX(${localTilt.rotX.toFixed(2)}deg) rotateY(${localTilt.rotY.toFixed(2)}deg) translate3d(${globalOffsetX.toFixed(1)}px, ${globalOffsetY.toFixed(1)}px, 0)`,
      }}
    >
      {/* Specular Glare Layer */}
      <div
        className="card-specular-glare"
        style={{
          background: `radial-gradient(circle at ${localTilt.glareX}% ${localTilt.glareY}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 65%)`,
          opacity: localTilt.isHover ? 1 : 0.15,
        }}
      />

      {/* Floating 3D Depth Badge */}
      <div
        className="card-floating-pill"
        style={{
          transform: `translateZ(36px) translateX(${(-localTilt.rotY * 0.7).toFixed(1)}px) translateY(${(-localTilt.rotX * 0.7).toFixed(1)}px)`,
        }}
      >
        <span className="live-dot pulse"></span>
        <span>{item.tag}</span>
      </div>

      {/* Image Wrap with depth counter-pan */}
      <div className="card-img-container">
        <img
          src={item.src}
          alt={item.title}
          className="card-parallax-img"
          style={{
            transform: `scale(${localTilt.isHover ? 1.1 : 1.03}) translate(${(-localTilt.rotY * 0.5).toFixed(1)}px, ${(-localTilt.rotX * 0.5).toFixed(1)}px)`,
          }}
        />
        <div className="card-img-gradient-scrim" />
      </div>

      {/* 3D Card Content Details */}
      <div
        className="card-content-depth"
        style={{
          transform: `translateZ(26px) translateX(${(-localTilt.rotY * 0.4).toFixed(1)}px)`,
        }}
      >
        <span className="badge tone-amber">{item.subtitle}</span>
        <h3>{item.title}</h3>
        <p className="card-desc">{item.description}</p>
        <div className="card-footer-row">
          <span className="small muted">📍 {COLLEGE.short}</span>
          <span className="btn-zoom-hint">🔍 Expand 3D Photo</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// INTERACTIVE 3D LENS & PAN COMPONENT
// ==========================================
function InteractiveLensViewer({ item, items, currentIndex, onSelect, onOpenModal }) {
  const viewerRef = useRef(null);
  const [lensPos, setLensPos] = useState({ x: 50, y: 50, isHover: false });

  const handleMouseMove = (e) => {
    if (!viewerRef.current) return;
    const rect = viewerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLensPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)), isHover: true });
  };

  const handleMouseLeave = () => {
    setLensPos({ x: 50, y: 50, isHover: false });
  };

  return (
    <div className="movement-lens-stage">
      <div
        ref={viewerRef}
        className="lens-viewport"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onOpenModal}
      >
        <img
          src={item.src}
          alt={item.title}
          className="lens-main-img"
          style={{
            transformOrigin: `${lensPos.x}% ${lensPos.y}%`,
            transform: lensPos.isHover ? 'scale(1.45)' : 'scale(1.0)',
          }}
        />

        {/* Dynamic Holographic Scanner Crosshair */}
        {lensPos.isHover && (
          <div
            className="lens-crosshair"
            style={{
              left: `${lensPos.x}%`,
              top: `${lensPos.y}%`,
            }}
          >
            <div className="crosshair-ring"></div>
            <div className="crosshair-label">3D Focus: {item.tag}</div>
          </div>
        )}

        <div className="lens-overlay-info">
          <span className="badge tone-gold">{item.tag}</span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <span className="hint-pill">Move cursor over image to inspect with 3D zoom lens</span>
        </div>
      </div>

      {/* Thumbnails strip for selecting photo */}
      <div className="lens-thumbs-strip">
        {items.map((m, idx) => (
          <button
            key={m.id}
            type="button"
            className={`lens-thumb-btn ${idx === currentIndex ? 'active' : ''}`}
            onClick={() => onSelect(idx)}
          >
            <img src={m.src} alt={m.title} />
            <div className="thumb-caption">
              <b>{m.subtitle}</b>
              <span>{m.stats}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
