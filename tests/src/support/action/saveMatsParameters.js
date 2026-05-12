/**
 * Check if the previously stored parameters match the current parameters.
 */
export default async () => {
  const intMs = 500;
  browser.saveMatsParameters = await $$(".control-button").map((element) =>
    element.getText(),
  );
  // console.log(browser.saveMatsParameters);
  // browser.debug();
  pause(intMs);
};
