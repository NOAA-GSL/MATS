/**
 * Select an option of a text or number spinner element
 * @param  {String}   parameter Element selector label
 * @param  {String}   selectionValue Value to select by
 */
import pause from "./pause";

export default async (parameter, selectionValue) => {
  /**
   * The method to use for selecting the option
   * @type {String}
   */

  // noinspection JSJQueryEfficiency
  await $(`#controlButton-${parameter}`).waitForDisplayed();
  await $(`#controlButton-${parameter}`).scrollIntoView();
  await $(`#controlButton-${parameter}`).waitForClickable();
  await $(`#controlButton-${parameter}`).click();
  await $(`#${parameter}-numberSpinner`).waitForDisplayed();
  await $(`#${parameter}-numberSpinner`).setValue(parseInt(selectionValue));
  await $(`#controlButton-${parameter}`).waitForClickable();
  await $(`#controlButton-${parameter}`).click();

  let matchValue = selectionValue;
  let text = "";
  let count = 0;
  // this is essentially giving the parameter 20 seconds to show the new value
  // this is mostly for when it is really busy doing parallel instances
  while (count < 20 && text !== matchValue) {
    text = await $(`#controlButton-${parameter}-value`).getText();
    if (text !== matchValue) {
      pause(2000);
    }
    count += 1;
  }
  if (text !== matchValue) {
    console.log(`parameter is ${parameter}, selectionValue is ${selectionValue}`);
    // browser.debug();
  }
  expect(text).toEqual(
    matchValue,
    `Expexted ${text} to be ${matchValue} for parameter: ${parameter}`
  );
};
