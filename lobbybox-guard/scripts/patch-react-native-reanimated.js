const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-reanimated',
  'android',
  'src',
  'reactNativeVersionPatch',
  'BorderRadiiDrawableUtils',
  '75',
  'com',
  'swmansion',
  'reanimated',
  'BorderRadiiDrawableUtils.java'
);

const patchMarker = 'ReactViewBackgroundDrawable';
const replacement = `package com.swmansion.reanimated;\n\nimport android.graphics.drawable.Drawable;\nimport android.view.View;\nimport com.facebook.react.views.view.ReactViewBackgroundDrawable;\nimport com.facebook.react.views.view.ReactViewBackgroundDrawable.BorderRadiusLocation;\n\npublic class BorderRadiiDrawableUtils {\n  public static ReactNativeUtils.BorderRadii getBorderRadii(View view) {\n    Drawable background = view.getBackground();\n    if (background instanceof ReactViewBackgroundDrawable) {\n      ReactViewBackgroundDrawable drawable = (ReactViewBackgroundDrawable) background;\n      return new ReactNativeUtils.BorderRadii(\n          drawable.getFullBorderRadius(),\n          drawable.getBorderRadiusOrDefaultTo(Float.NaN, BorderRadiusLocation.TOP_LEFT),\n          drawable.getBorderRadiusOrDefaultTo(Float.NaN, BorderRadiusLocation.TOP_RIGHT),\n          drawable.getBorderRadiusOrDefaultTo(Float.NaN, BorderRadiusLocation.BOTTOM_LEFT),\n          drawable.getBorderRadiusOrDefaultTo(Float.NaN, BorderRadiusLocation.BOTTOM_RIGHT));\n    } else {\n      return new ReactNativeUtils.BorderRadii(0, 0, 0, 0, 0);\n    }\n  }\n}\n`;

if (!fs.existsSync(targetFile)) {
  console.warn('[patch-react-native-reanimated] File not found, skipping:', targetFile);
  process.exit(0);
}

const current = fs.readFileSync(targetFile, 'utf8');
if (current.includes(patchMarker)) {
  console.log('[patch-react-native-reanimated] BorderRadiiDrawableUtils already patched.');
  process.exit(0);
}

fs.writeFileSync(targetFile, replacement, 'utf8');
console.log('[patch-react-native-reanimated] Patched BorderRadiiDrawableUtils for RN 0.74 compatibility.');
