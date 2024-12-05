const pluginRss = require("@11ty/eleventy-plugin-rss");
const escape = require('lodash.escape');
const { DateTime } = require("luxon");

module.exports = eleventyConfig => {
  // post feed RSS
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addFilter("dateToRfc822", pluginRss.dateToRfc822);
  eleventyConfig.addFilter('xmlEscape', (value) => escape(value));
  eleventyConfig.addShortcode ("year", () => `${new Date ().getFullYear ()}`); 

  // Filters let you modify the content https://www.11ty.dev/docs/filters/
  eleventyConfig.addFilter("htmlDateString", dateObj => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd");
  });

  // Newest date in the collection
  eleventyConfig.addFilter('collectionLastUpdatedDate', (collection) => {
    if (!collection || !collection.length) {
      throw new Error(
        'Collection is empty in collectionLastUpdatedDate filter.'
      );
    }

    return pluginRss.dateToRfc822(
      new Date(
        Math.max(...collection.map((item) => {
          return item.date;
        }))
      )
    );
    });
};
