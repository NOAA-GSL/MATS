/**
 * Check if the given elements contains text
 * @param  {String}   plotType  The text to check against
 */
import pause from "../action/pause";

export default async (plotType) => {
  /**
   * Check that the header contains the plot type
   * @plotType {String}
   */
  const command = "getText";
  const intMs = 500;

  const stringExpectedText = plotType;

  const elem = await $("#header");
  await elem.waitForDisplayed();
  await elem.scrollIntoView();
  pause(intMs);
  const text = await elem[command]();

  expect(text).toContain(stringExpectedText);
};
