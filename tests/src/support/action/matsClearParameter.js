/**
 * Clear a given input parameter
 * @param  {String}   parameter Element selector
 */
import pause from "./pause";

export default (parameter) => {
  const intMs = 500;
  $(`[id='controlButton-${parameter}-value']`).scrollIntoView();
  pause(intMs);
  $(`#controlButton-${parameter}-value`).click();
  if ($(`[id*='${parameter}-select-clear']`).waitForDisplayed()) {
    $(`[id*='${parameter}-select-clear']`).click();
  }
  $(`#controlButton-${parameter}-value`).click();
  pause(intMs);
};
