import Input from './Input';
import { ICON_NAMES } from '../Icon/icon-names';

export default {
  title: 'Atoms/Input',
  component: Input,
  args: {
    placeholder: 'Enter value',
  },
  argTypes: {
    icon: {
      control: 'select',
      options: ICON_NAMES,
    },
    iconColor: {
      control: 'color',
    },
    validationState: {
      control: 'select',
      options: ['', 'error', 'success'],
    },
  },
};

export const WithoutIcon = {};

export const WithIcon = {
  args: {
    icon: 'user',
  },
};

export const Error = {
  args: {
    validationState: 'error',
  },
};

export const Success = {
  args: {
    validationState: 'success',
  },
};

export const Disabled = {
  args: {
    disabled: true,
  },
};

export const Gallery = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', padding: '1.5rem' }}>
      <Input placeholder="Without icon" />
      <Input icon="user" placeholder="With icon" />
      <Input validationState="error" placeholder="Required field" />
      <Input validationState="success" placeholder="Valid field" />
      <Input disabled placeholder="Disabled" />
    </div>
  ),
  parameters: {
    controls: { disable: true },
  },
};
