import { useEffect, useRef, useState } from 'react';
import Campus3DViewer from './Campus3DViewer';
import { COLLEGE } from '../config/college';

export default function HeroInteractiveMedia({ onOpenLightbox }) {
  const [activeTab, setActiveTab] = useState('3d'); // '3d' | 'photo'
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0, glareX: 50, glareY: 50, isHovered: false });
  const animFrameRef = useRef(null);
  const targetTiltRef = useRef({ rotX: 0, rotY: 0, glareX: 50, glareY: 50 });

  const handleMouseMove = (e) => {
    if (activeTab !== 'photo' || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normX = (x / rect.width - 0.5) * 2;
    const normY = (y / rect.height - 0.5) * 2;

    const maxTilt = 15;
    targetTiltRef.current = {
      rotX: -normY * maxTilt,
      rotY: normX * maxTilt,
      glareX: (x / rect.width) * 100,
      glareY: (y / rect.height) * 100,
    };
  };

  const handleMouseEnter = () => {
    setTilt((prev) => ({ ...prev, isHovered: true }));
  };

  const handleMouseLeave = () => {
    targetTiltRef.current = { rotX: 0, rotY: 0, glareX: 50, glareY: 50 };
    setTilt((prev) => ({ ...prev, isHovered: false }));
  };

  useEffect(() => {
    if (activeTab !== 'photo') return;
    let isRunning = true;
    const updatePhysics = () => {
      setTilt((prev) => {
        const target = targetTiltRef.current;
        const ease = 0.12;
        const newRotX = prev.rotX + (target.rotX - prev.rotX) * ease;
        const newRotY = prev.rotY + (target.rotY - prev.rotY) * ease;
        const newGlareX = prev.glareX + (target.glareX - prev.glareX) * ease;
        const newGlareY = prev.glareY + (target.glareY - prev.glareY) * ease;

        return {
          ...prev,
          rotX: newRotX,
          rotY: newRotY,
          glareX: newGlareX,
          glareY: newGlareY,
        };
      });

      if (isRunning) {
        animFrameRef.current = requestAnimationFrame(updatePhysics);
      }
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeTab]);

  return (
    <div className="hero-interactive-shell">
      {/* View Switcher Tabs */}
      <div className="hero-media-tabs" role="tablist" aria-label="Hero Media View">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === '3d'}
          className={`hero-tab-pill ${activeTab === '3d' ? 'active' : ''}`}
          onClick={() => setActiveTab('3d')}
        >
          <span className="tab-icon">🧊</span>
          <span><b>3D Interactive BEC Model</b></span>
          <span className="tab-badge">Real Image 360°</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'photo'}
          className={`hero-tab-pill ${activeTab === 'photo' ? 'active' : ''}`}
          onClick={() => setActiveTab('photo')}
        >
          <span className="tab-icon">🖼️</span>
          <span><b>3D Tilt Campus Photo</b></span>
          <span className="tab-badge">Motion Parallax</span>
        </button>
      </div>

      <div className="hero-interactive-frame">
        {activeTab === '3d' ? (
          <div className="hero-3d-wrapper">
            <Campus3DViewer
              compact={true}
              height="460px"
              allowSwitch={true}
            />
          </div>
        ) : (
          <div
            ref={cardRef}
            className="hero-tilt-card-root"
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={onOpenLightbox}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenLightbox(); }}
            aria-label="View original campus photograph with dynamic 3D tilt movement"
            style={{
              transform: `perspective(1000px) rotateX(${tilt.rotX.toFixed(2)}deg) rotateY(${tilt.rotY.toFixed(2)}deg) scale3d(${tilt.isHovered ? 1.025 : 1}, ${tilt.isHovered ? 1.025 : 1}, 1)`,
            }}
          >
            {/* Dynamic Cursor Glare */}
            <div
              className="tilt-card-glare"
              style={{
                background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 65%)`,
                opacity: tilt.isHovered ? 1 : 0.25,
              }}
            />

            {/* Depth Layer 1: Floating Top Badge */}
            <div
              className="tilt-depth-badge top"
              style={{
                transform: `translateZ(44px) translateX(${(-tilt.rotY * 0.8).toFixed(1)}px) translateY(${(-tilt.rotX * 0.8).toFixed(1)}px)`,
              }}
            >
              <span className="glass-dot pulse"></span>
              <span>Original Aerial Campus Photograph · 3D Parallax</span>
            </div>

            {/* Depth Layer 0: Original BEC Campus Photo with Parallax Pan */}
            <div className="tilt-image-viewport">
              <img
                src="/images/campus.jpg"
                alt={`${COLLEGE.name} original campus building nestled in scenic hills`}
                className="tilt-campus-img"
                loading="eager"
                style={{
                  transform: `scale(${tilt.isHovered ? 1.08 : 1.03}) translate(${(-tilt.rotY * 0.6).toFixed(1)}px, ${(-tilt.rotX * 0.6).toFixed(1)}px)`,
                }}
              />
            </div>

            {/* Depth Layer 2: Floating Bottom Caption Card */}
            <div
              className="tilt-depth-badge bottom"
              style={{
                transform: `translateZ(34px) translateX(${(-tilt.rotY * 0.5).toFixed(1)}px) translateY(${(-tilt.rotX * 0.5).toFixed(1)}px)`,
              }}
            >
              <div className="glass-caption-title">
                <span>{COLLEGE.name}</span>
                <span className="view-badge">🔍 Zoom View</span>
              </div>
              <div className="glass-caption-subtitle">
                <span>📍 {COLLEGE.place} · 25+ Acres Green Campus</span>
              </div>
            </div>

            <div className="tilt-motion-hint">
              <span>✦ Move cursor across image to shift 3D perspective</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
