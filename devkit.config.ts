import { defineDevKitConfig } from '@buildplease/devkit';

export default defineDevKitConfig({
  ignore: ['**/.archicat/**'],

  clean: {
    mode: 'override',
    targets: ['.'],
    directories: ['dist', '.archicat'],
  },
});
