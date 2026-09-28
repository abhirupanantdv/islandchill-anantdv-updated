import { useEffect, useRef } from 'react';
import { isLabSignatureImage } from './labFieldMetadata';

export function LabSignatureValue({ value, label = 'Signature' }) {
  return isLabSignatureImage(value)
    ? <img src={value} alt={label} style={{ display: 'block', maxWidth: '100%', maxHeight: 180, objectFit: 'contain' }} />
    : <span style={{ fontFamily: 'cursive' }}>{value || 'Not signed'}</span>;
}

export default function LabSignatureField({ value, onChange, disabled, required, label, id }) {
  const canvasRef = useRef(null);
  const activePointer = useRef(null);
  const lastOutput = useRef(undefined);
  const lastCanvas = useRef(null);
  const loadingImage = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas === lastCanvas.current && value === lastOutput.current) return;
    lastCanvas.current = canvas;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    let cancelled = false;
    loadingImage.current = false;
    if (isLabSignatureImage(value)) {
      const image = new Image();
      loadingImage.current = true;
      image.onload = () => {
        if (cancelled) return;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        loadingImage.current = false;
      };
      image.onerror = () => { if (!cancelled) loadingImage.current = false; };
      image.src = value;
    } else if (value) {
      // Existing typed signatures remain readable when older records are opened.
      context.font = '28px cursive';
      context.fillStyle = '#172033';
      context.fillText(String(value), 16, 90);
    }
    return () => { cancelled = true; };
  }, [value, disabled]);

  const point = event => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) * canvas.width / rect.width, (event.clientY - rect.top) * canvas.height / rect.height];
  };
  const startStroke = event => {
    if (disabled || loadingImage.current || activePointer.current !== null || event.button !== 0) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    activePointer.current = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    const [x, y] = point(event);
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#172033';
    context.fillStyle = '#172033';
    context.beginPath();
    context.arc(x, y, 1, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(x, y);
  };
  const moveStroke = event => {
    if (activePointer.current !== event.pointerId) return;
    const context = canvasRef.current.getContext('2d');
    context.lineTo(...point(event));
    context.stroke();
  };
  const endStroke = event => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    const canvas = canvasRef.current;
    lastOutput.current = canvas.toDataURL('image/png');
    onChange(lastOutput.current);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    activePointer.current = null;
    loadingImage.current = false;
    lastOutput.current = '';
    onChange('');
  };

  if (disabled) return <LabSignatureValue value={value} label={label} />;
  return <div style={{ position: 'relative', minWidth: 180 }}>
    <canvas id={id} ref={canvasRef} width={600} height={180} tabIndex={0} aria-label={`Draw ${label || 'signature'}`}
      onPointerDown={startStroke} onPointerMove={moveStroke} onPointerUp={endStroke} onPointerCancel={endStroke} onLostPointerCapture={endStroke}
      style={{ display: 'block', width: '100%', height: 180, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, touchAction: 'none', cursor: 'crosshair' }} />
    <input type="text" value={value || ''} onChange={() => {}} required={required} tabIndex={-1} aria-label={label || 'Signature'}
      onInvalid={() => canvasRef.current?.focus()}
      style={{ position: 'absolute', left: 0, bottom: 32, width: 1, height: 1, opacity: 0, padding: 0, border: 0, pointerEvents: 'none' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 8 }}>
      <small style={{ color: 'var(--text-muted)' }}>Sign above using your mouse or finger.</small>
      <button type="button" className="secondary-btn" onClick={clear}>Clear</button>
    </div>
  </div>;
}
