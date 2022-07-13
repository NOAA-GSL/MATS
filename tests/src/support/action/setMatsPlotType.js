/**
 * Set the date range to a predefined range
 * @param  {String}   plotType   The type of date range selector (curve or date)
 * */
export default (plotType) => {
    $('#plotTypes-selector').scrollIntoView();
    $('#plotTypes-selector').click();
    $('#plot-type-' + plotType).scrollIntoView();
    $('#plot-type-' + plotType).click();
};
