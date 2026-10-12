import './StatusChips.css';
import { typography } from '../../../shared-theme/themePrimitives';

const STATUS_TONES = {
  pending: 'orange',
  completed: 'green',
  draft: 'gray',
  'in-progress': 'blue',
  failed: 'red',
  approved: 'green',
  rejected: 'red',
};

export default function StatusChips({
  label,
  status = 'pending',
  tone,
  className = '',
  style,
  ...props
}) {
  const normalizedStatus = String(status).toLowerCase();
  const normalizedTone = tone || STATUS_TONES[normalizedStatus] || 'gray';
  const text = label ?? status;
  const classes = [
    'status-chip',
    `status-chip--${normalizedTone}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span
      className={classes}
      data-status={normalizedStatus}
      style={{ fontFamily: typography.fontFamily, ...style }}
      {...props}
    >
      <span className="status-chip__dot" aria-hidden="true" />
      <span className="status-chip__label">{text}</span>
    </span>
  );
}
