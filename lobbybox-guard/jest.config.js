module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native' +
      '|@react-native' +
      '|@react-navigation' +
      '|@react-native-community' +
      '|react-native-gesture-handler' +
      '|react-native-reanimated' +
      '|@tanstack' +
      ')/)',
  ],
  setupFiles: ['./jest.setup.js'],
};
