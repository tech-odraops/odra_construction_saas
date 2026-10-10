import Button from './Button';
import { ICON_NAMES } from '../Icon/icon-names';

export default {
  title: 'Atoms/Button',
  component: Button,
  args: {
    children: 'Continue',
  },
  argTypes: {
    icon: {
      control: 'select',
      options: ICON_NAMES,
    },
    'icon-only-button': {
      control: 'select',
      options: ICON_NAMES,
    },
    state: {
      control: 'select',
      options: ['running', 'completed', 'failed'],
    },
  },
};

export const Primary = {};

export const PrimaryHover = {
  args: {
    className: 'storybook-force-hover',
  },
};

export const WithIcon = {
  args: {
    icon: 'check-mark',
  },
};

export const Running = {
  args: {
    state: 'running',
    children: 'Adding...',
  },
};

export const Completed = {
  args: {
    state: 'completed',
    children: 'Added',
  },
};

export const Failed = {
  args: {
    state: 'failed',
    children: 'Failed',
  },
};

export const IconOnly = {
  args: {
    'icon-only-button': 'plus-math',
    'aria-label': 'Add',
  },
};

export const Disabled = {
  args: {
    disabled: true,
  },
};

export const Gallery = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
        alignItems: 'center',
        gap: '1.5rem',
        maxWidth: '48rem',
        padding: '1.5rem',
      }}
    >
      <Button>Primary</Button>
      <Button className="storybook-force-hover">Primary hover</Button>
      <Button icon="check-mark">With icon</Button>
      <Button aria-label="Add item" iconOnlyButton="plus-math" />
      <Button disabled>Disabled</Button>
      <Button state="running">Running</Button>
      <Button state="completed">Completed</Button>
      <Button state="failed">Failed</Button>
    </div>
  ),
  parameters: {
    controls: { disable: true },
  },
};