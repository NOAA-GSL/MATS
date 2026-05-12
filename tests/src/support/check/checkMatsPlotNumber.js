/**
 * Check if the given elements contains text
 * @param  {number}   curveNumber  The text to check against
 */
import pause from "../action/pause";

export default async (curveNumber) => {
  /**
   * Check that the graph contains curveNumber of curves
   * @curveNumber {Number}
   * @type {String}
   */
  const intMs = 500;
  await $("#curves").waitForDisplayed(20000);
  await $("#curves").scrollIntoView();
  pause(intMs);
  // use the heatMapVisibility button (it's a unique selector) to count the curves
  const curveItems = await $$(".traces");
  // eslint-disable-next-line no-template-curly-in-string
  expect(curveItems).toHaveLength(curveNumber, 'Should have "${curveNumber}" curves');
};
