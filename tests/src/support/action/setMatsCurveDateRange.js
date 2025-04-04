import pause from './pause';

/**
 * Set the curve date range to a predefined range
 * @param  {String}   value   The range to set the selector to
 * */
export default async (value) => {
    const dateRange = value;
    const dateCharArray = dateRange.split('');
    await $('#controlButton-curve-dates-value').waitForDisplayed();
    await $('#controlButton-curve-dates-value').scrollIntoView();
    await $('#controlButton-curve-dates-value').waitForClickable();
    await $('#controlButton-curve-dates-value').click();
    await $('#curve-dates-dateRange').click(); // brings up date menu
    await browser.keys(['Meta', 'a']);
    await browser.keys("Backspace");
    await browser.keys(dateCharArray);
    await $('#curve-dates-applyBtn').click();
    let datesValue = '';
    let count = 0;
    while (count < 10 && datesValue !== dateRange) {
        datesValue = await $('#controlButton-curve-dates-value').getText();
        if (datesValue !== dateRange) {
            pause(2000);
        }
        count += 1;
    }
    if (datesValue !== dateRange) {
        console.log(`value is ${value}`);
        // browser.debug();
    }
    expect(datesValue).toEqual(value, `"curve date range" should be ${value} but was ${datesValue}`);
};
