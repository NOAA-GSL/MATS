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
  await $(`#controlButton-${parameter}`).waitForDisplayed();
  await $(`#controlButton-${parameter}`).scrollIntoView();
  await $(`#controlButton-${parameter}`).click();

  let multi = false;
  if (await $(`#${parameter}-select-clear`).isDisplayed()) {
    multi = true;
    // if it is a multi-select selector it has a clear button. Better clear it
    await $(`#${parameter}-select-clear`).scrollIntoView();
    await $(`#${parameter}-select-clear`).waitForClickable();
    await $(`#${parameter}-select-clear`).click();
    // noinspection JSJQueryEfficiency
    if (parameter === "sites") {
      await $(`[value="${selectionValue}"]`).scrollIntoView();
      await $(`[value="${selectionValue}"]`).waitForClickable();
      await $(`[value="${selectionValue}"]`).click();
    } else {
      // noinspection JSJQueryEfficiency
      await $(`#element-${parameter} > div:nth-child(2) > div > div > div.dropdown-menu.w-100 > div [data-value="${selectionValue}"]`).scrollIntoView();
      await $(`#element-${parameter} > div:nth-child(2) > div > div > div.dropdown-menu.w-100 > div [data-value="${selectionValue}"]`).waitForClickable();
      await $(`#element-${parameter} > div:nth-child(2) > div > div > div.dropdown-menu.w-100 > div [data-value="${selectionValue}"]`).click();
    }
    // if it is a multi-select selector, have to click the done button
    await $(`#${parameter}-select-done`).scrollIntoView();
    await $(`#${parameter}-select-done`).waitForClickable();
    await $(`#${parameter}-select-done`).click();
  } else {
    // noinspection JSJQueryEfficiency
    await $(`#element-${parameter} > div:nth-child(2) > div > div > div.dropdown-menu.w-100 > div [data-value="${selectionValue}"]`).scrollIntoView();
    await $(`#element-${parameter} > div:nth-child(2) > div > div > div.dropdown-menu.w-100 > div [data-value="${selectionValue}"]`).waitForClickable();
    await $(`#element-${parameter} > div:nth-child(2) > div > div > div.dropdown-menu.w-100 > div [data-value="${selectionValue}"]`).click();
  }

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
    `Expexted ${text} to be ${matchValue} for parameter: ${parameter}`
  );
};
