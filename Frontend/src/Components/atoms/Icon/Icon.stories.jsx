import { ICON_NAMES } from './icon-names';
import { Icon } from './Icon';

export default {
  title: 'Atoms/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ICON_NAMES,
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
    },
    gradient: {
      control: 'select',
      options: ['', 'primary', 'inverted', 'disabled'],
      description: 'Choose a gradient or an empty value to use the SVG sprite.',
    },
  },
};

export const Playground = {
  args: {
    variant: 'add-user-male',
    size: 'xxl',
    gradient: 'primary',
  },
};

export const Gallery = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
        gap: '24px',
        maxWidth: '760px',
        width: '100%',
      }}
    >
      {ICON_NAMES.map((variant) => (
        <div
          key={variant}
          style={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minHeight: '80px',
          }}
        >
          <Icon variant={variant} size="xxl" gradient="" />
          <code>{variant}</code>
        </div>
      ))}
    </div>
  ),
  parameters: {
    controls: { disable: true },
  },
};
