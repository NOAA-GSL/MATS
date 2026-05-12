/**
 * Select an option of a select element
 * @param  {String}   parameter Element selector label
 */

import pause from "./pause";

export default (parameter) => {
  /**
   * The method to use for selecting the option
   * @type {String}
   */

  const intMs = 500;
  // noinspection JSJQueryEfficiency
  $(`#controlButton-${parameter}`).waitForDisplayed();
  $(`#controlButton-${parameter}`).scrollIntoView();
  pause(intMs);
  $(`#controlButton-${parameter}`).click();
  pause(intMs);
  if ($(`#${parameter}-select-clear`).isDisplayed()) {
    $(`#${parameter}-select-clear`).click();
  }
  if ($(`#${parameter}-select-all`).isDisplayed()) {
    $(`#${parameter}-select-all`).click();
  }
  if ($(`#${parameter}-select-done`).isDisplayed()) {
    // if it is a multi-select selector, have to click the done button
    $(`#${parameter}-select-done`).click();
  }
  pause(intMs);
};
