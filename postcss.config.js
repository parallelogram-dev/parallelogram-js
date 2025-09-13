module.exports = {
  plugins: [
    require('postcss-scss'), // Handles SCSS syntax including // comments
    require('postcss-import'),
    require('cssnano'),
  ],
};
