/**
 * Check if the graph page is visible
 */
export default async () => {
  /**
   * Is the main page visible?
   */

  await $("#controlButton-label-value").waitForDisplayed();
  const isDisplayed = await $("#controlButton-label-value").isDisplayed();

  expect(isDisplayed).toEqual(true, 'Expected element "#controlButton-label-value" to be displayed');
};
