import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { COLLEGE } from '../../config/college';
import HeroInteractiveMedia from '../../components/HeroInteractiveMedia';
import Campus3DViewer from '../../components/Campus3DViewer';
import CampusImageShowcase from '../../components/CampusImageShowcase';

export default function Home() {
  const [modalImage, setModalImage] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setModalImage(null);
    };
    if (modalImage) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalImage]);

  return (
    <>
      {/* HERO SECTION WITH DUAL 3D INTERACTIVE BEC MODEL & 3D PARALLAX PHOTO */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-glass">
              <span className="badge tone-amber">Admissions Open {COLLEGE.academicYear}</span>
              <h1 style={{ marginTop: '.75rem' }}>Apply to {COLLEGE.name}, {COLLEGE.place}</h1>
              <p>
                A complete online admission process - register, apply, upload documents, track your application, pay fees and download your admission confirmation, all in one place.
              </p>
              <div className="row" style={{ marginTop: '1.25rem' }}>
                <Link to="/register" className="btn btn-gold">Start your application</Link>
                <Link
                  to="/courses"
                  className="btn btn-outline"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
                >
                  View courses &amp; fees
                </Link>
              </div>
              <div className="row mt" style={{ opacity: 0.9, fontSize: '0.86rem' }}>
                <span>✨ <b>3D Interactive BEC Model:</b> Real College Imagery Mapped in 3D Space</span>
              </div>
            </div>

            {/* 3D Interactive BEC Model with Real BEC Image / 3D Tilt Photo */}
            <HeroInteractiveMedia
              onOpenLightbox={() =>
                setModalImage({
                  src: '/images/campus.jpg',
                  title: `${COLLEGE.name} - Aerial Campus View`,
                  subtitle: `${COLLEGE.place} · 25+ Acres Green Campus`,
                  description: 'Sprawling lush green engineering campus situated on Chennai-Bangalore National Highway.',
                })
              }
            />
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="container glass-stats">
        <div className="grid g4">
          {[
            ['Est. ' + COLLEGE.established, 'Managed by KTA & GRS Educational Trust'],
            ['Anna University', 'Affiliated, Chennai'],
            ['AICTE', 'Approved, New Delhi'],
            ['25+ acres', 'Campus on the Chennai-Bangalore NH'],
          ].map(([a, b]) => (
            <div key={a} className="glass-stat-card">
              <div className="fee-big">{a}</div>
              <div className="muted small">{b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DYNAMIC 3D CAMPUS IMAGE MOVEMENT SHOWCASE (ORIGINAL PHOTOS) */}
      <CampusImageShowcase onSelectImage={(img) => setModalImage(img)} />

      {/* 3D INTERACTIVE BEC MODEL EXPLORATION SECTION */}
      <section className="home-3d-experience-section">
        <div className="container">
          <div className="home-3d-banner-grid">
            <div className="home-3d-banner-text">
              <div className="pill-badge" style={{ background: 'rgba(244, 194, 13, 0.15)', color: '#f4c20d', borderColor: 'rgba(244, 194, 13, 0.35)' }}>
                <span className="live-dot pulse"></span>
                <span>Virtual 3D Interactive Exploration</span>
              </div>
              <h2>3D Interactive BEC Model</h2>
              <p>
                Experience Bharathidasan Engineering College in genuine 3D space. Our 3D model incorporates authentic BEC college imagery, institutional crests, and multi-view 3D photo prisms with real-time 360° orbit rotation, lighting controls, and interactive hotspots.
              </p>

              <div className="home-3d-feature-list">
                <div className="feature-item">
                  <span className="f-icon">💎</span>
                  <span><b>3D Rotating BEC Photo Prism:</b> Revolving 3D prism featuring the 3 official campus landmarks (25+ Acres Green Campus, Hi-Tech Infrastructure, Advanced Engineering) with authentic photos.</span>
                </div>
                <div className="feature-item">
                  <span className="f-icon">🎓</span>
                  <span><b>Graduation Honours:</b> Realistic 3D mortarboard with swaying silk tassel &amp; official BEC wax seal.</span>
                </div>
                <div className="feature-item">
                  <span className="f-icon">🌐</span>
                  <span><b>Tech &amp; Innovation Core:</b> Concentric gyroscopic rings representing CSE, AI/DS, ECE, Mech &amp; Civil.</span>
                </div>
              </div>

              <div className="row">
                <Link to="/register" className="btn btn-gold">
                  Apply for Admission {COLLEGE.academicYear} →
                </Link>
                <Link
                  to="/courses"
                  className="btn"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
                >
                  View Courses &amp; Fees
                </Link>
              </div>
            </div>

            {/* 3D Interactive Viewer with Real BEC Image */}
            <div className="home-3d-full-viewer-card">
              <Campus3DViewer
                height="100%"
                compact={false}
                allowSwitch={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* UNIFIED LIGHTBOX MODAL */}
      {modalImage && (
        <div className="modal-back glass-lightbox-backdrop" onClick={() => setModalImage(null)}>
          <div className="glass-lightbox-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="glass-lightbox-close"
              onClick={() => setModalImage(null)}
              aria-label="Close modal"
            >
              ✕
            </button>
            <div className="glass-lightbox-body">
              <img
                src={modalImage.src}
                alt={modalImage.title}
                className="glass-lightbox-img"
              />
              <div className="glass-lightbox-footer">
                <div>
                  <h3>{modalImage.title}</h3>
                  <p>{modalImage.subtitle || modalImage.description}</p>
                </div>
                <span className="badge tone-amber">Anna University Affiliated</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
