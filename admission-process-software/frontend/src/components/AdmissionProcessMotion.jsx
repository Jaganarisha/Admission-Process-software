import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { COLLEGE } from '../config/college';
import '../styles/admission-motion.css';

export const ADMISSION_STEPS = [
  {
    number: 1,
    title: 'Student Registration',
    shortDesc: 'Create your admission portal account with basic contact details.',
    fullDesc: 'Begin your journey at Bharathidasan Engineering College by setting up your candidate account. Register using your full name, primary email address, mobile number, and a secure password.',
    duration: '2 - 3 Mins',
    statusLabel: 'Instant Setup',
    icon: '👤',
    accent: '#3b82f6',
    actionText: 'Register Now',
    actionLink: '/register',
    highlights: [
      'Instant SMS/Email verification with secure OTP',
      'Unified candidate dashboard access for all rounds',
      'Multi-device compatibility (Mobile, Tablet, Desktop)',
    ],
  },
  {
    number: 2,
    title: 'Fill Application Form',
    shortDesc: 'Enter personal, parent, academic marks and select your preferred course.',
    fullDesc: 'Fill in your 5-part application: Personal Info, Parent/Guardian Details, 10th & 12th Board percentages/marks, and preferred engineering branch (B.E./B.Tech/M.E.). All inputs are automatically draft-saved.',
    duration: '10 - 15 Mins',
    statusLabel: 'Auto-Save Enabled',
    icon: '📝',
    accent: '#06b6d4',
    actionText: 'Start Application',
    actionLink: '/student/apply/personal',
    highlights: [
      'Automated cut-off & eligibility verification',
      'Choice between Government Quota (TNEA) and Management Quota',
      'Drafts saved in real time so you can resume anytime',
    ],
  },
  {
    number: 3,
    title: 'Upload Certificates & Docs',
    shortDesc: 'Upload required academic marksheets, TC, photo, and identity proofs.',
    fullDesc: 'Upload digital copies of your required certificates (10th & 12th marksheets, Transfer Certificate, Community Certificate, and passport-size photo) in JPG, PNG, or PDF format (up to 2 MB each).',
    duration: '5 Mins',
    statusLabel: 'Secure Cloud Upload',
    icon: '☁️',
    accent: '#10b981',
    actionText: 'View Checklist',
    actionLink: '/about-admission#documents',
    highlights: [
      'In-browser thumbnail & document preview',
      'Encrypted cloud document storage',
      'Quick re-upload capability if corrections are requested',
    ],
  },
  {
    number: 4,
    title: 'Final Review & Submit',
    shortDesc: 'Review all entered information and lock your submission to get your App ID.',
    fullDesc: 'Inspect a complete summary of your application. Once verified, click submit. The portal generates an official unique Application Number immediately and timestamps your entry.',
    duration: 'Instant',
    statusLabel: 'Unique App ID',
    icon: '🚀',
    accent: '#8b5cf6',
    actionText: 'Review Guidelines',
    actionLink: '/about-admission',
    highlights: [
      'Immediate Application Number generation (e.g. BEC26-00001)',
      'Downloadable PDF summary copy for your records',
      'Application locked for official college committee evaluation',
    ],
  },
  {
    number: 5,
    title: 'Verification by Committee',
    shortDesc: 'College admission officers verify marks, quota criteria, and uploaded files.',
    fullDesc: 'The BEC Admission Committee scrutinizes each submitted mark sheet, reservation certificate, and Anna University eligibility rule. You can track real-time verification status on your dashboard.',
    duration: '24 - 48 Hours',
    statusLabel: 'Live Status Tracker',
    icon: '🔍',
    accent: '#f59e0b',
    actionText: 'Track Status',
    actionLink: '/student/status',
    highlights: [
      'Transparent verification stages shown in candidate portal',
      'Direct remarks from admission officer if any document needs correction',
      'Instant notification via portal and registered email',
    ],
  },
  {
    number: 6,
    title: 'Merit Approval & Seat Offer',
    shortDesc: 'Application approved and official provisional seat offer issued.',
    fullDesc: 'Upon successful verification and quota allocation, your application receives official committee approval. An official provisional seat allotment offer is issued in your dashboard.',
    duration: 'Official Allotment',
    statusLabel: 'Approved',
    icon: '🎖️',
    accent: '#10b981',
    actionText: 'Check Offer',
    actionLink: '/student/dashboard',
    highlights: [
      'Official seat allotment under AICTE / Anna University norms',
      'Transparent course fee breakdown locked for the candidate',
      'Official notification sent via SMS, email & student portal',
    ],
  },
  {
    number: 7,
    title: 'Online Fee Payment',
    shortDesc: 'Pay the first-year admission fee securely online with instant receipt.',
    fullDesc: 'Complete your first-year admission fee payment securely through the integrated gateway. Government Quota students automatically receive a 50% fee concession on standard tuition and fees.',
    duration: '5 Mins',
    statusLabel: '50% Govt Quota Concession',
    icon: '💳',
    accent: '#ea580c',
    actionText: 'Courses & Fees',
    actionLink: '/courses',
    highlights: [
      'Supports UPI, QR codes, Credit/Debit Cards & Net Banking',
      '50% fee concession automatically deducted for TNEA quota seats',
      'Instant digitally signed fee receipt with payment ID',
    ],
  },
  {
    number: 8,
    title: 'Admission Confirmation',
    shortDesc: 'Download your official Admission Letter and welcome kit.',
    fullDesc: 'Congratulations! Your admission at Bharathidasan Engineering College is formally confirmed. Download and print your official Provisional Admission Order, student ID card slip, and fee receipt.',
    duration: 'Official Enrollment',
    statusLabel: 'Welcome to BEC!',
    icon: '🎓',
    accent: '#f4c20d',
    actionText: 'Explore Campus',
    actionLink: '/',
    highlights: [
      'Printable official Admission Letter with QR verification seal',
      'Allotment of Student Roll Number & Department Section',
      'Campus orientation details and academic calendar schedule',
    ],
  },
];

export default function AdmissionProcessMotion({
  title = 'Admission Process Steps with Roll Transitions',
  subtitle = 'Experience each admission stage unfolding through smooth 3D roll transitions from registration to final enrollment.',
  showTitle = true,
  showAdminOfficeBanner = true,
  initialStep = 0,
}) {
  const [activeStep, setActiveStep] = useState(initialStep);
  const [prevStep, setPrevStep] = useState(initialStep);
  const [rollDirection, setRollDirection] = useState('forward'); // 'forward' | 'backward'
  const [isRolling, setIsRolling] = useState(false);
  const [rollAxis, setRollAxis] = useState('vertical'); // 'vertical' | 'horizontal'
  const [autoRoll, setAutoRoll] = useState(false);
  const [viewMode, setViewMode] = useState('roll'); // 'roll' | 'grid'
  const [modalStep, setModalStep] = useState(null);

  const rollTimeoutRef = useRef(null);
  const autoRollTimerRef = useRef(null);
  const containerRef = useRef(null);

  // Trigger roll transition to target step
  const rollToStep = (newIndex) => {
    if (newIndex === activeStep || isRolling) return;
    const direction = newIndex > activeStep ? 'forward' : 'backward';
    setRollDirection(direction);
    setPrevStep(activeStep);
    setActiveStep(newIndex);
    setIsRolling(true);

    if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
    rollTimeoutRef.current = setTimeout(() => {
      setIsRolling(false);
    }, 600);
  };

  const rollNext = () => {
    const nextIdx = (activeStep + 1) % ADMISSION_STEPS.length;
    rollToStep(nextIdx);
  };

  const rollPrev = () => {
    const prevIdx = (activeStep - 1 + ADMISSION_STEPS.length) % ADMISSION_STEPS.length;
    rollToStep(prevIdx);
  };

  // Auto-roll timer
  useEffect(() => {
    if (!autoRoll || viewMode !== 'roll') {
      if (autoRollTimerRef.current) clearInterval(autoRollTimerRef.current);
      return;
    }

    autoRollTimerRef.current = setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % ADMISSION_STEPS.length;
        setRollDirection('forward');
        setPrevStep(prev);
        setIsRolling(true);
        setTimeout(() => setIsRolling(false), 600);
        return next;
      });
    }, 4500);

    return () => {
      if (autoRollTimerRef.current) clearInterval(autoRollTimerRef.current);
    };
  }, [autoRoll, viewMode]);

  // Keyboard navigation for roll transitions
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (viewMode !== 'roll' || modalStep) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        rollNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        rollPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStep, isRolling, viewMode, modalStep]);

  // Mouse wheel scroll to roll between steps
  const handleWheel = (e) => {
    if (viewMode !== 'roll' || isRolling) return;
    if (Math.abs(e.deltaY) > 35) {
      if (e.deltaY > 0) {
        rollNext();
      } else {
        rollPrev();
      }
    }
  };

  const current = ADMISSION_STEPS[activeStep];
  const progressPercent = ((activeStep) / (ADMISSION_STEPS.length - 1)) * 100;

  return (
    <section
      className="admission-roll-section"
      id="admission-roll-process"
      ref={containerRef}
      onWheel={handleWheel}
      aria-label="Admission process steps with roll transitions"
    >
      <div className="roll-section-container">
        {/* Section Header */}
        {showTitle && (
          <div className="roll-header-block">
            <div className="roll-badge-pill">
              <span className="roll-indicator-dot" />
              <span>Interactive 3D Roll Transitions · {COLLEGE.academicYear}</span>
            </div>
            <h2>{title}</h2>
            <p>{subtitle}</p>

            {/* View Switcher: 3D Roll vs All Steps Grid */}
            <div className="roll-view-mode-bar" role="tablist">
              <button
                type="button"
                className={`roll-mode-btn ${viewMode === 'roll' ? 'active' : ''}`}
                onClick={() => setViewMode('roll')}
                role="tab"
                aria-selected={viewMode === 'roll'}
                title="Interactive 3D Roll Transition Experience"
              >
                <span>🎲 3D Roll Transitions</span>
              </button>
              <button
                type="button"
                className={`roll-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                role="tab"
                aria-selected={viewMode === 'grid'}
                title="All Steps Static Grid"
              >
                <span>📋 All Steps Grid</span>
              </button>
            </div>
          </div>
        )}

        {/* Optional Administrative Building Photo Banner */}
        {showAdminOfficeBanner && (
          <div className="roll-admin-banner">
            <img
              src="/images/admission-building.jpg"
              alt="Bharathidasan Engineering College Admission Office"
              className="roll-banner-img"
            />
            <div className="roll-banner-overlay">
              <span className="roll-banner-badge">BEC Admission &amp; Counselling Centre</span>
              <h3>Digitized Admission Procedure · {COLLEGE.academicYear}</h3>
              <p>
                Roll through all eight verification checkpoints to complete your candidate admission online.
              </p>
            </div>
          </div>
        )}

        {/* =================================================================
            VIEW 1: INTERACTIVE 3D ROLL TRANSITIONS VIEWPORT
            ================================================================= */}
        {viewMode === 'roll' && (
          <div className="roll-viewport-wrapper">
            {/* Top 3D Cylindrical Step Drum / Roller Dial */}
            <div className="roll-drum-track-container" aria-label="Step Roller Dial">
              <div className="roll-drum-track">
                {ADMISSION_STEPS.map((s, idx) => {
                  const isCurrent = idx === activeStep;
                  const isDone = idx < activeStep;
                  return (
                    <button
                      key={s.number}
                      type="button"
                      className={`drum-node-pill ${isCurrent ? 'active' : ''} ${isDone ? 'completed' : ''}`}
                      onClick={() => rollToStep(idx)}
                      title={`Roll to Step ${s.number}: ${s.title}`}
                    >
                      <div className="drum-node-number">
                        <span className="rolling-digit">{isDone ? '✓' : s.number}</span>
                      </div>
                      <span className="drum-node-label">{s.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Progress Beam under drum */}
              <div className="drum-progress-bar">
                <div
                  className="drum-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Roll Controls Toolbar */}
            <div className="roll-controls-toolbar">
              <div className="roll-axis-toggles">
                <button
                  type="button"
                  className={`toolbar-btn ${rollAxis === 'vertical' ? 'active' : ''}`}
                  onClick={() => setRollAxis('vertical')}
                  title="Vertical Drum Roll Transition"
                >
                  <span>↕ Vertical Roll</span>
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${rollAxis === 'horizontal' ? 'active' : ''}`}
                  onClick={() => setRollAxis('horizontal')}
                  title="Horizontal Carousel Roll Transition"
                >
                  <span>↔ Horizontal Roll</span>
                </button>
              </div>

              <div className="roll-playback-controls">
                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={rollPrev}
                  title="Roll to Previous Step (Left/Up arrow)"
                >
                  <span>↶ Roll Prev</span>
                </button>

                <button
                  type="button"
                  className={`toolbar-btn auto-roll-btn ${autoRoll ? 'active' : ''}`}
                  onClick={() => setAutoRoll(!autoRoll)}
                  title={autoRoll ? 'Pause Auto-Roll' : 'Enable Auto-Roll Transitions'}
                >
                  <span>{autoRoll ? '⏸ Pause Roll' : '▶ Auto-Roll'}</span>
                </button>

                <button
                  type="button"
                  className="toolbar-btn"
                  onClick={rollNext}
                  title="Roll to Next Step (Right/Down arrow)"
                >
                  <span>Roll Next ↷</span>
                </button>
              </div>

              <div className="roll-step-counter-chip">
                <span>Rolling Stage</span>
                <b>{activeStep + 1} / {ADMISSION_STEPS.length}</b>
              </div>
            </div>

            {/* 3D Roll Chamber (Where the Card Transitions with 3D Roll Physics) */}
            <div className="roll-3d-stage-viewport">
              <div
                key={`roll-${activeStep}`}
                className={`roll-card-3d-face ${
                  rollAxis === 'vertical'
                    ? rollDirection === 'forward'
                      ? 'roll-in-from-bottom'
                      : 'roll-in-from-top'
                    : rollDirection === 'forward'
                    ? 'roll-in-from-right'
                    : 'roll-in-from-left'
                }`}
              >
                <div className="roll-card-inner-grid">
                  {/* Left Column: Visual Emblem & Odometer Step Number */}
                  <div className="roll-visual-side">
                    <div className="roll-number-odometer">
                      <span className="odometer-label">STEP</span>
                      <span className="odometer-digit">{current.number}</span>
                    </div>

                    <div className="roll-large-icon">{current.icon}</div>

                    <div className="roll-meta-badges">
                      <span className="roll-duration-pill">⏱️ {current.duration}</span>
                      <span className="roll-status-pill">{current.statusLabel}</span>
                    </div>
                  </div>

                  {/* Right Column: Step Description, Highlights & Direct Action */}
                  <div className="roll-details-side">
                    <div className="roll-title-row">
                      <h3>{current.title}</h3>
                      <span className="roll-accent-tag">Stage {current.number} of 8</span>
                    </div>

                    <p className="roll-description-paragraph">{current.fullDesc}</p>

                    <div className="roll-checkpoints-card">
                      <h4>Verified Requirements &amp; Actions:</h4>
                      <ul className="roll-checkpoints-list">
                        {current.highlights.map((h, i) => (
                          <li key={i}>
                            <span className="roll-check-icon">✓</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="roll-card-actions-row">
                      <Link to={current.actionLink} className="roll-primary-action-btn">
                        <span>{current.actionText}</span>
                        <span>→</span>
                      </Link>

                      <div className="roll-nav-action-cluster">
                        <button
                          type="button"
                          className="roll-mini-nav-btn"
                          disabled={activeStep === 0}
                          onClick={rollPrev}
                          title="Roll to previous step"
                        >
                          ↶ Prev Step
                        </button>
                        <button
                          type="button"
                          className="roll-mini-nav-btn"
                          disabled={activeStep === ADMISSION_STEPS.length - 1}
                          onClick={rollNext}
                          title="Roll to next step"
                        >
                          Next Step ↷
                        </button>
                        <button
                          type="button"
                          className="roll-mini-nav-btn"
                          onClick={() => setModalStep(current)}
                          title="Open Full Checklist Modal"
                        >
                          🔍 Full Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Roll Step Indicator Dots */}
            <div className="roll-dots-nav" role="tablist">
              {ADMISSION_STEPS.map((s, idx) => (
                <button
                  key={s.number}
                  type="button"
                  className={`roll-dot ${idx === activeStep ? 'active' : ''}`}
                  onClick={() => rollToStep(idx)}
                  title={`Roll to Step ${s.number}: ${s.title}`}
                  aria-label={`Step ${s.number}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* =================================================================
            VIEW 2: COMPLETE STATIC GRID WITH 3D HOVER TILT ROLLS
            ================================================================= */}
        {viewMode === 'grid' && (
          <div className="roll-grid-showcase">
            {ADMISSION_STEPS.map((s, idx) => (
              <div
                key={s.number}
                className="roll-grid-item"
                onClick={() => {
                  setActiveStep(idx);
                  setViewMode('roll');
                }}
              >
                <div className="grid-item-top">
                  <span className="grid-step-circle">{s.number}</span>
                  <span className="grid-duration-tag">⏱️ {s.duration}</span>
                </div>
                <div className="grid-item-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.shortDesc}</p>
                <div className="grid-item-bottom">
                  <span className="grid-status-lbl">{s.statusLabel}</span>
                  <span className="grid-roll-hint">Roll into View ↷</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Dialog for Step Details */}
        {modalStep && (
          <div
            className="roll-modal-backdrop"
            onClick={() => setModalStep(null)}
          >
            <div
              className="roll-modal-box"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="roll-modal-close"
                onClick={() => setModalStep(null)}
                aria-label="Close"
              >
                ✕
              </button>

              <div className="modal-top-identity">
                <div className="modal-icon-badge">{modalStep.icon}</div>
                <div>
                  <span className="modal-step-sub">
                    Step {modalStep.number} of {ADMISSION_STEPS.length} · {modalStep.duration}
                  </span>
                  <h3>{modalStep.title}</h3>
                </div>
              </div>

              <p className="modal-desc-body">{modalStep.fullDesc}</p>

              <h4 className="modal-checklist-title">Key Guidelines &amp; Checkpoints:</h4>
              <ul className="modal-points-list">
                {modalStep.highlights.map((h, i) => (
                  <li key={i}>
                    <span className="modal-tick-symbol">✓</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div className="modal-buttons-row">
                <Link
                  to={modalStep.actionLink}
                  className="roll-primary-action-btn"
                  onClick={() => setModalStep(null)}
                >
                  <span>{modalStep.actionText}</span>
                  <span>→</span>
                </Link>
                <button
                  type="button"
                  className="roll-mini-nav-btn"
                  onClick={() => setModalStep(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Support Notice */}
        <div className="roll-footer-notice">
          <div className="notice-left">
            <span className="notice-lamp">💡</span>
            <div>
              <b>Need guidance with your admission registration?</b>
              <p>
                Contact the Bharathidasan Engineering College Admission Office at <b>{COLLEGE.phones.join(' / ')}</b> or email <b>{COLLEGE.email}</b>. Government Quota candidates (TNEA) receive a 50% fee concession on standard tuition and fees.
              </p>
            </div>
          </div>
          <div className="notice-right">
            <Link to="/register" className="btn btn-sm btn-gold">Register as Candidate</Link>
            <Link to="/courses" className="btn btn-sm btn-outline">View Course Fees</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
