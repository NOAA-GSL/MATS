/**
 * Set the date range to a predefined range
 * @param  {String}   plotType   The type of date range selector (curve or date)
 * */
export default async (plotType) => {
    await $('#plotTypes-selector').scrollIntoView();
    await $('#plotTypes-selector').click();
    await $('#plot-type-' + plotType).scrollIntoView();
    await $('#plot-type-' + plotType).click();
};
