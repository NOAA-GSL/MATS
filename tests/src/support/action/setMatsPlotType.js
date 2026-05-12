/**
 * Set the date range to a predefined range
 * @param  {String}   plotType   The type of date range selector (curve or date)
 * */
import pause from "./pause";

export default async (plotType) => {
  const intMs = 500;
  await $("#plotTypes-selector").scrollIntoView();
  pause(intMs);
  await $("#plotTypes-selector").click();
  await $("#plot-type-" + plotType).scrollIntoView();
  pause(intMs);
  await $("#plot-type-" + plotType).click();
  pause(intMs);
};
