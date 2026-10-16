 import StatusChips from './StatusChips';

export default {
  title: 'Atoms/StatusChips',
  component: StatusChips,
  args: { label: 'Ongoing', status: 'ongoing' },
  argTypes: {
    status: {
      control: 'select',
      options: ['ongoing', 'upcoming', 'cancelled', 'completed', 'draft', 'approved', 'rejected'],
    },
    tone: {
      control: 'select',
      options: ['orange', 'blue', 'red', 'gray', 'green'],
    },
  },
};

export const Ongoing = {};

export const Upcoming = {
  args: { label: 'Upcoming', status: 'upcoming' },
};

export const Cancelled = {
  args: { label: 'Cancelled', status: 'cancelled' },
};

export const Completed = {
  args: { label: 'Completed', status: 'completed' },
};

export const Draft = {
  args: { label: 'Draft', status: 'draft' },
};

export const Gallery = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1rem' }}>
      <StatusChips label="Ongoing" status="ongoing" />
      <StatusChips label="Upcoming" status="upcoming" />
      <StatusChips label="Cancelled" status="cancelled" />
      <StatusChips label="Draft" status="draft" />
      <StatusChips label="Completed" status="completed" />
    </div>
  ),
  parameters: { controls: { disable: true } },
};
