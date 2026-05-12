/**
 * Select an option of a select element
 * @param  {String}   parameter Element selector label
 * @param  {String}   selectionValue Value to select by
 */
import pause from "./pause";

export default async (parameter, selectionValue) => {
  /**
   * The method to use for selecting the option
   * @type {String}
   */

  // console.log(`$('#controlButton-${parameter}')`);
  // browser.debug();

  // noinspection JSJQueryEfficiency
  const intMs = 500;
  await $(`#controlButton-${parameter}`).waitForDisplayed();
  await $(`#controlButton-${parameter}`).scrollIntoView();
  pause(intMs);
  await $(`#controlButton-${parameter}`).click();

  let multi = false;
  if (await $(`#${parameter}-select-clear`).isDisplayed()) {
    multi = true;
    // if it is a multi-select selector it has a clear button. Better clear it
    await $(`#${parameter}-select-clear`).scrollIntoView();
    pause(intMs);
    await $(`#${parameter}-select-clear`).click();
    // noinspection JSJQueryEfficiency
    await $(`[value="${selectionValue}"]`).scrollIntoView();
    pause(intMs);
    await $(`[value="${selectionValue}"]`).click();
    // if it is a multi-select selector, have to click the done button
    await $(`#${parameter}-select-done`).scrollIntoView();
    pause(intMs);
    await $(`#${parameter}-select-done`).click();
  } else {
    // noinspection JSJQueryEfficiency
    await $(`[id*="${parameter}"][data-value="${selectionValue}"]`).scrollIntoView();
    pause(intMs);
    await $(`[id*="${parameter}"][data-value="${selectionValue}"]`).click();
  }
  pause(intMs);

  let matchValue = selectionValue;
  if (multi) {
    // multi-selects have a range value
    matchValue = `${selectionValue} .. ${selectionValue}`;
  }
  let text = "";
  let count = 0;
  // this is essentially giving the parameter 60 seconds to show the new value
  // this is mostly for when it is really busy doing parallel instances
  while (count < 30 && text !== matchValue) {
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
    `Expexted ${text} to be ${matchValue} for parameter: ${parameter}`,
  );
  pause(intMs);
};
