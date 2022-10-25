/**
 * Set the date range to a predefined range
 * @param  {String}   value   The range to set the selector to
 * */
import pause from './pause';

export default (value) => {
    const dateRange = value;
    const dateCharArray = dateRange.split('');
    $('#controlButton-dates-value').waitForDisplayed();
    $('#controlButton-dates-value').scrollIntoView();
    $('#controlButton-dates-value').waitForClickable();
    $('#controlButton-dates-value').click();
    $('#dates-dateRange').click(); // brings up date menu
    browser.keys(['Meta', 'a']);
    browser.keys("Backspace");
    browser.keys(dateCharArray);
    $('#dates-applyBtn').click();
    let datesValue = '';
    let count = 0;
    while (count < 10 && datesValue !== dateRange) {
        datesValue = $('#controlButton-dates-value').getText();
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
