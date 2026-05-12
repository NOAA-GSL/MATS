/**
 * Check the title (in the plottype element)
 * @param  {String}   title the selection parameter
 */
import pause from "../action/pause";

export default async (title) => {
  const command = "getText";
  const intMs = 500;

  /**
   * The expected text
   * @type {String}
   */
  const stringExpectedText = title;

  /**
   * The text of the element
   * @type {String}
   */
  const elem = await $("#appTitleText");
  await elem.waitForDisplayed();
  await elem.scrollIntoView();
  pause(intMs);
  const text = await elem[command]();

  expect(text).toContain(stringExpectedText);
};
