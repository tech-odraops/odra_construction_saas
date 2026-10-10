import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function withoutPwaPlugins(plugins = []) {
  const filteredPlugins = [];

  for (const plugin of await Promise.all(plugins)) {
    if (Array.isArray(plugin)) {
      filteredPlugins.push(await withoutPwaPlugins(plugin));
    } else if (plugin && !plugin.name?.startsWith('vite-plugin-pwa:')) {
      filteredPlugins.push(plugin);
    }
  }

  return filteredPlugins;
}

export default {
  stories: ['../src/**/*.stories.@(js|jsx)'],
  staticDirs: ['../public'],
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    const plugins = await withoutPwaPlugins(config.plugins);

    return {
      ...config,
      plugins,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@': resolve(projectRoot, 'src'),
        },
      },
    };
  },
};