import pause from "../action/pause";

/**
 * Check if the given elements contains text
 * @param  {String}   expected  The textual list to check against
 */
export default async (expected) => {
    /**
     * Check that the curve list contains specific curve label
     * @curveNumber {Number}
     */
    const expectedList = expected.split(',').sort();
    await $('.displayItemLabelSpan').waitForDisplayed();
    await $('.displayItemLabelSpan').scrollIntoView();
    pause(1000);
    const actualList = await $$('.displayItemLabelSpan').map(
        (elem) => elem.getText()
    ).sort();
    const expectedText = expectedList.join(',');
    const actualText = actualList.join(',');
    const matches = expectedText === actualText;
    expect(matches).toBe(true,
        `expected list ${expectedList} does not match actualList ${actualList}`);
};
