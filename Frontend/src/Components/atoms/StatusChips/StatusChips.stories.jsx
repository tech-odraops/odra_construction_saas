 import StatusChips from './StatusChips';

export default {
  title: 'Atoms/StatusChips',
  component: StatusChips,
  args: { label: 'Pending', status: 'pending' },
  argTypes: {
    status: {
      control: 'select',
      options: ['pending', 'completed', 'draft', 'in-progress', 'failed', 'approved', 'rejected'],
    },
    tone: {
      control: 'select',
      options: ['orange', 'blue', 'red', 'gray', 'green'],
    },
  },
};

export const Pending = {};

export const Completed = {
  args: { label: 'Completed', status: 'completed' },
};

export const Draft = {
  args: { label: 'Draft', status: 'draft' },
};

export const Gallery = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1rem' }}>
      <StatusChips label="Pending" status="pending" />
      <StatusChips label="Completed" tone="blue" />
      <StatusChips label="Completed" tone="red" />
      <StatusChips label="Draft" status="draft" />
      <StatusChips label="Completed" tone="green" />
    </div>
  ),
  parameters: { controls: { disable: true } },
};
