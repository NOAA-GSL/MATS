/**
 * Perform an click action on the button with the given label
 * @param  {String}   label button label
 */
import pause from "./pause";

export default async (label) => {
  /**
   * LabelOf the Mats button to click
   * @type {String}
   */
  let selector;
  let nrOfElements;
  let cPart;
  const intMs = 500;
  pause(intMs);
  // special buttons first
  if (label === "Remove All") {
    selector = await $("#remove-all");
    await selector.waitForDisplayed();
    await selector.scrollIntoView();
    pause(intMs);
    await selector.click();
  } else if (label === "Remove all the curves") {
    // Note, there are two #confirm-remove-all id's present on the
    // page. Until that's fixed workaround it by grabbing the button text.
    // selector = await $('#confirm-remove-all');
    selector = await $("button=Remove all the curves");
    await selector.waitForDisplayed();
    await selector.scrollIntoView();
    pause(intMs);
    await selector.click();
  } else if (label.match("Remove curve .*")) {
    // this is the 'Remove curve curvelabel' confirm button
    selector = await $(`#confirm-remove-curve`);
    await selector.waitForDisplayed();
    await selector.scrollIntoView();
    pause(intMs);
    await selector.click();
  } else if (label.match("Remove .*")) {
    // This is the 'Remove curvelabel' remove button
    cPart = label.replace("Remove ", "");
    await $(`#curve-list-remove*=${cPart}`).scrollIntoView();
    pause(intMs);
    await $(`#curve-list-remove*=${cPart}`).click();
  } else {
    // normal buttons
    switch (label) {
      case "Add Curve":
        selector = await $("#add");
        await selector.waitForDisplayed();
        await selector.scrollIntoView();
        break;
      case "Back":
        selector = await $("#backButton");
        await selector.waitForDisplayed();
        await selector.scrollIntoView();
        break;
      case "Plot Unmatched":
        selector = await $("#plotUnmatched");
        await selector.waitForDisplayed();
        await selector.scrollIntoView();
        break;
      case "Plot Matched":
        selector = await $("#plotMatched");
        await selector.waitForDisplayed();
        await selector.scrollIntoView();
        break;
      case "Reset to Defaults":
        selector = await $("#reset");
        await selector.waitForDisplayed();
        await selector.scrollIntoView();
        break;
      case "Clear":
        selector = await $("#clear-info");
        await selector.waitForDisplayed();
        await selector.scrollIntoView();
        break;
      default:
        throw new Error("Unhandled button label???");
    }
    // these are for the switch statement i.e. 'normal buttons'
    pause(intMs);
    await selector.click();
    pause(intMs);
  }
};
