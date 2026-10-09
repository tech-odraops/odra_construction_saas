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