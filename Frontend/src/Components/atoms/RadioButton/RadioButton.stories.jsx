import RadioButton from './RadioButton';

export default {
  title: 'Atoms/RadioButton',
  component: RadioButton,
  args: { label: 'Daily', name: 'frequency' },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export const Unselected = { args: { checked: false } };
export const Selected = { args: { checked: true } };
export const Disabled = { args: { checked: true, disabled: true } };
