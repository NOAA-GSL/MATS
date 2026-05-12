/**
 * Open the given URL
 * @param  {String}   type Type of navigation (getUrl or site)
 * @param  {String}   page The URL to navigate to
 */
export default async (type, page) => {
  /**
   * The URL to navigate to
   * @type {String}
   */
  const intMs = 5000;
  const url = type === "url" ? page : browser.options.baseUrl + page;
  await browser.url(url);
  pause(intMs);
};
