import ToggleSwitch from './ToggleSwitch';

export default {
  title: 'Atoms/ToggleSwitch',
  component: ToggleSwitch,
  args: { label: 'On' },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export const Off = { args: { label: 'Off', checked: false } };
export const On = { args: { label: 'On', checked: true } };
export const Disabled = { args: { label: 'Disabled', checked: false, disabled: true } };
