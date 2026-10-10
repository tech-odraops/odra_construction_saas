import Button from './Button';

export default {
  title: 'Atoms/Button',
  component: Button,
  args: {
    children: 'Continue',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary'],
    },
  },
};

export const Primary = {
  args: {
    variant: 'primary',
  },
};

export const PrimaryHover = {
  args: {
    variant: 'primary',
    className: 'storybook-force-hover',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
  },
};

export const Tertiary = {
  args: {
    variant: 'tertiary',
  },
};

export const Disabled = {
  args: {
    variant: 'primary',
    disabled: true,
  },
};