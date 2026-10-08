import { createElement } from 'react';
import AppTheme from '../src/shared-theme/AppTheme';

const preview = {
  decorators: [
    (Story) => createElement(AppTheme, null, createElement(Story)),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;