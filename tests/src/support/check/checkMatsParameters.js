/**
 * Check if the previously stored parameters match the current parameters.
 */
export default () => {
    const currentMatsParameters = $$('.control-button').map((element) => element.getText());
    const matches = currentMatsParameters.sort().join(',')
        === browser.saveMatsParameters.sort().join(',');
    expect(matches).toEqual(true, 'saved MATS parameters do not match current parameters');
    // browser.debug();
};
