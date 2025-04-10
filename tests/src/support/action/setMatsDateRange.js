/**
 * Set the date range to a predefined range
 * @param  {String}   value   The range to set the selector to
 * */
import pause from './pause';

export default async (value) => {
    const dateRange = value;
    const dateCharArray = dateRange.split('');
    await $('#controlButton-dates-value').waitForDisplayed();
    await $('#controlButton-dates-value').scrollIntoView();
    await $('#controlButton-dates-value').waitForClickable();
    await $('#controlButton-dates-value').click();
    await $('#dates-dateRange').click(); // brings up date menu
    await browser.keys(['Meta', 'a']);
    await browser.keys("Backspace");
    await browser.keys(dateCharArray);
    await $('#dates-applyBtn').click();
    let datesValue = '';
    let count = 0;
    while (count < 10 && datesValue !== dateRange) {
        datesValue = await $('#controlButton-dates-value').getText();
        if (datesValue !== dateRange) {
            pause(2000);
        }
        count += 1;
    }
    if (datesValue !== dateRange) {
        console.log(`value is ${value}`);
        // browser.debug();
    }
    expect(datesValue).toEqual(value, `"date range" should be ${value} but was ${datesValue}`);
};
