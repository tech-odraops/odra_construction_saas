import Popup from './Popup';

export default {
  title: 'Atoms/Popup',
  component: Popup,
  args: { title: 'Success !', message: 'logged in successfully', variant: 'success' },
  argTypes: {
    variant: { control: 'select', options: ['success', 'error'] },
    onClose: { action: 'dismissed' },
  },
};

export const Success = {};

export const Error = {
  args: { title: 'Error !', message: 'logged in successfully', variant: 'error' },
};

export const Gallery = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
      <Popup />
      <Popup variant="error" />
    </div>
  ),
  parameters: { controls: { disable: true } },
};
