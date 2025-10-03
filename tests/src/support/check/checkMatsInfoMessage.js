/**
 * Check the message in the Mats info modal
 *  @param   {String}   message      the modal message
 */
export default async (message) => {
    const expectedText = message;
    await $('#infoModalText').waitForDisplayed();
    await $('#infoModalText').scrollIntoView();
    const text = await $('#infoModalText').getText();
    // notice that the expectedText contains the actual text.
    // that is because the expected text has a leading "Info:  "
    // that the actual modal text selector filters out
    expect(expectedText).toContain(text,
        `The info modal does not contain the expected text ${expectedText}`);
};
