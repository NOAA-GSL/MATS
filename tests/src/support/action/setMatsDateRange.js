/**
 * Set the date range to a predefined range
 * @param  {String}   value   The range to set the selector to
 * */
import pause from './pause';

export default (value) => {
    const dateRange = value;
    const dates = dateRange.split(' - ');
    $('#controlButton-dates-value').waitForDisplayed();
    $('#controlButton-dates-value').scrollIntoView();
    $('#controlButton-dates-value').waitForClickable();
    $('#controlButton-dates-value').click(); // brings up date menu
    // eslint-disable-next-line max-len
    $$('input[name="daterangepicker_start"]')[$$('input[name="daterangepicker_start"]').length - 1].setValue('');
    // eslint-disable-next-line max-len
    $$('input[name="daterangepicker_start"]')[$$('input[name="daterangepicker_start"]').length - 1].setValue(dates[0]);
    // eslint-disable-next-line max-len
    $$('input[name="daterangepicker_end"]')[$$('input[name="daterangepicker_end"]').length - 1].setValue('');
    // eslint-disable-next-line max-len
    $$('input[name="daterangepicker_end"]')[$$('input[name="daterangepicker_end"]').length - 1].setValue(dates[1]);
    $$('/html/body/div[3]/div[1]/div/div/button[1]')[0].waitForClickable();
    $$('/html/body/div[3]/div[1]/div/div/button[1]')[0].click();
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
