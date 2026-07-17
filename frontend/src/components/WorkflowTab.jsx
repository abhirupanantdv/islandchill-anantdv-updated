import React from 'react';
import { PRODUCTS } from '../data/mockData';

/**
 * WorkflowTab Component
 * Animated serpentine business workflow simulation.
 */
export default function WorkflowTab({
  WORKFLOW_STAGES,
  simStep,
  setSimStep,
  simPlaying,
  setSimPlaying,
  simSpeed,
  setSimSpeed
}) {
  const STAGE_POINTS = [
    { x: 12.5, y: 16.6, col: 1, row: 1 },
    { x: 37.5, y: 16.6, col: 2, row: 1 },
    { x: 62.5, y: 16.6, col: 3, row: 1 },
    { x: 87.5, y: 16.6, col: 4, row: 1 },
    { x: 87.5, y: 50.0, col: 4, row: 2 },
    { x: 62.5, y: 50.0, col: 3, row: 2 },
    { x: 37.5, y: 50.0, col: 2, row: 2 },
    { x: 12.5, y: 50.0, col: 1, row: 2 },
    { x: 12.5, y: 83.3, col: 1, row: 3 },
    { x: 37.5, y: 83.3, col: 2, row: 3 },
    { x: 62.5, y: 83.3, col: 3, row: 3 }
  ];

  return (
    <div className="maintenance-tab-container">
      <div className="module-header" style={{ borderBottom: 'none', paddingBottom: 0, flexWrap: 'wrap', gap: '16px' }}>
        <div className="module-title">
          <h2>Process Workflow</h2>
          <p>Interactive, animated simulation of the entire end-to-end beverage production line.</p>
        </div>

        {/* Simulation Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button className="primary-btn" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setSimPlaying(!simPlaying)}>
            {simPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button className="secondary-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => { setSimPlaying(false); setSimStep(0); }}>
            🔄 Reset
          </button>
          <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
            {[{ label: 'Slow', speed: 4000 }, { label: '1x', speed: 2000 }, { label: 'Fast', speed: 800 }].map(btn => (
              <button key={btn.label} className="secondary-btn" style={{ padding: '4px 8px', fontSize: '10px', backgroundColor: simSpeed === btn.speed ? 'var(--accent)' : '', color: simSpeed === btn.speed ? '#111' : '' }} onClick={() => setSimSpeed(btn.speed)}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Serpentine SVG Pipeline Flow */}
      <div className="workflow-diagram-board">
        <svg className="workflow-pipelines-svg">
          <defs>
            <filter id="neon-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {STAGE_POINTS.slice(0, 10).map((pt, idx) => {
            const nextPt = STAGE_POINTS[idx + 1];
            const stage = WORKFLOW_STAGES[idx];
            const isSegmentActive = simPlaying ? (simStep >= idx) : (simStep > idx);
            const segmentColor = isSegmentActive ? stage.color : 'rgba(255, 255, 255, 0.08)';

            return (
              <g key={idx}>
                <line x1={`${pt.x}%`} y1={`${pt.y}%`} x2={`${nextPt.x}%`} y2={`${nextPt.y}%`} stroke={segmentColor} strokeWidth="10" opacity={isSegmentActive ? 0.35 : 0.02} style={{ filter: isSegmentActive ? 'url(#neon-glow-filter)' : 'none', transition: 'all 0.5s ease' }} />
                <line x1={`${pt.x}%`} y1={`${pt.y}%`} x2={`${nextPt.x}%`} y2={`${nextPt.y}%`} stroke={segmentColor} strokeWidth="3" style={{ transition: 'all 0.5s ease' }} />
                {isSegmentActive && simPlaying && (
                  <line x1={`${pt.x}%`} y1={`${pt.y}%`} x2={`${nextPt.x}%`} y2={`${nextPt.y}%`} stroke="#ffffff" strokeWidth="3.5" strokeDasharray="8 12" className="dash-animation" style={{ opacity: 0.85 }} />
                )}
              </g>
            );
          })}
        </svg>

        {/* Stage Pods Grid */}
        <div className="workflow-grid-container">
          {WORKFLOW_STAGES.map((stage, idx) => {
            const pt = STAGE_POINTS[idx];
            const isActive = simStep === idx;
            const isPassed = simStep > idx;

            return (
              <div key={stage.id} className={`workflow-node-capsule ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`} style={{ gridColumn: pt.col, gridRow: pt.row, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }} onClick={() => setSimStep(idx)}>
                {isActive && (
                  <div style={{ position: 'absolute', top: '5px', width: '90px', height: '90px', borderRadius: '50%', background: `radial-gradient(circle, rgba(${stage.colorRgb}, 0.35) 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 1, animation: 'pulse-glow 1.5s infinite alternate' }} />
                )}
                {isActive && stage.tagline && (
                  <div className="workflow-pointer-tag" style={{ backgroundColor: stage.color, bottom: '105px', zIndex: 10 }}>
                    {stage.tagline}
                  </div>
                )}
                <div className="workflow-node-pod" style={{ width: '70px', height: '70px', borderRadius: '20px', border: isActive ? `2.5px solid ${stage.color}` : '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: isActive ? `rgba(${stage.colorRgb}, 0.22)` : isPassed ? `rgba(${stage.colorRgb}, 0.08)` : 'rgba(11, 15, 26, 0.7)', boxShadow: isActive ? `0 0 28px rgba(${stage.colorRgb}, 0.65), inset 0 1px 2px rgba(255, 255, 255, 0.3)` : isPassed ? `0 0 15px rgba(${stage.colorRgb}, 0.25)` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 3 }}>
                  <span style={{ textShadow: isActive || isPassed ? `0 0 8px ${stage.color}` : 'none' }}>{stage.icon}</span>
                </div>
                <div className="workflow-node-label" style={{ marginTop: '12px', textAlign: 'center', zIndex: 3, pointerEvents: 'none' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: isActive || isPassed ? '#ffffff' : '#8892b0', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>
                    {(idx + 1).toString().padStart(2, '0')}. {stage.name}
                  </div>
                  <div style={{ fontSize: '9px', color: isActive ? stage.color : 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>
                    {stage.dept}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Stage Detail Panel */}
      <div className="dashboard-card" style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ fontSize: '48px', backgroundColor: 'rgba(251, 191, 36, 0.1)', width: '90px', height: '90px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {WORKFLOW_STAGES[simStep].icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '4px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Stage {simStep + 1}: {WORKFLOW_STAGES[simStep].name}</h3>
            <span className="badge badge-completed">{WORKFLOW_STAGES[simStep].dept}</span>
          </div>
          <p className="text-muted" style={{ fontSize: '13px', marginBottom: '12px' }}>{WORKFLOW_STAGES[simStep].desc}</p>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ fontSize: '12px' }}>
              <span className="text-muted">Live Reading: </span>
              <strong style={{ color: 'var(--accent)' }}>{WORKFLOW_STAGES[simStep].metrics}</strong>
            </div>
            <div style={{ fontSize: '12px' }}>
              <span className="text-muted">Status: </span>
              <strong style={{ color: 'var(--success)' }}>Active Pipeline</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
