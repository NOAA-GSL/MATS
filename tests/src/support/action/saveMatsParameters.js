/**
 * Check if the previously stored parameters match the current parameters.
 */
export default () => {
    browser.saveMatsParameters = $$('.control-button').map((element) => element.getText());
    // console.log(browser.saveMatsParameters);
    // browser.debug();
};
