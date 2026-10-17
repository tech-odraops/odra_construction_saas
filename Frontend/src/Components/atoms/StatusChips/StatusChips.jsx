import './StatusChips.css';
import { componentStyles } from '../../../shared-theme/themePrimitives';

const STATUS_TONES = {
  ongoing: 'orange',
  completed: 'green',
  draft: 'gray',
  upcoming: 'blue',
  cancelled: 'red',
  approved: 'green',
  rejected: 'red',
};

export default function StatusChips({
  label,
  status = 'ongoing',
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
      style={{ ...componentStyles.statusChip, ...style }}
      {...props}
    >
      <span className="status-chip__dot" aria-hidden="true" />
      <span className="status-chip__label">{text}</span>
    </span>
  );
}
