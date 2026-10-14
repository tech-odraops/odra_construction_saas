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
    endIcon: {
      control: 'select',
      options: ICON_NAMES,
    },
    iconColor: {
      control: 'color',
    },
    endIconColor: {
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

export const ErrorWithIcon = {
  args: {
    icon: 'user',
    validationState: 'error',
  },
};

export const Success = {
  args: {
    validationState: 'success',
  },
};

export const SuccessWithIcon = {
  args: {
    icon: 'user',
    endIcon: 'check-mark',
    endIconColor: '#20A21A',
    validationState: 'success',
    value: 'A valid value',
  },
};

export const WithCustomIconColor = {
  args: {
    icon: 'user',
    iconColor: '#F97316',
  },
};

export const Disabled = {
  args: {
    disabled: true,
  },
};

export const DisabledWithRequestedIcon = {
  args: {
    disabled: true,
    icon: 'user',
    placeholder: 'Disabled inputs use a lock icon',
  },
};

export const Gallery = {
  render: () => (
    <div style={{ display: 'grid', gap: '1.5rem', padding: '1.5rem', maxWidth: '30rem' }}>
      <Input placeholder="Without icon" />
      <Input icon="user" placeholder="With icon" />
      <Input validationState="error" placeholder="Required field" />
      <Input icon="user" validationState="error" placeholder="Required field with icon" />
      <Input validationState="success" value="Valid value" />
      <Input icon="user" endIcon="check-mark" endIconColor="#20A21A" validationState="success" value="Valid value with icon" />
      <Input icon="user" iconColor="#F97316" placeholder="Custom icon color" />
      <Input disabled icon="user" placeholder="Disabled uses lock icon" />
    </div>
  ),
  parameters: {
    controls: { disable: true },
  },
};
