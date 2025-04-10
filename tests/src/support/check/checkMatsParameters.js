/**
 * Check if the previously stored parameters match the current parameters.
 */
export default async () => {
    const currentMatsParameters = await $$('.control-button').map((element) => element.getText());
    const matches = await currentMatsParameters.sort().join(',')
        === await browser.saveMatsParameters.sort().join(',');
    expect(matches).toEqual(true, 'saved MATS parameters do not match current parameters');
    // browser.debug();
};
