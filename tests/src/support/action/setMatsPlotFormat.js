/**
 * Set the plotFormat
 * @param  {String}   plotFormat   The plot format
 * */
import pause from "./pause";

export default async (plotFormat) => {
  const intMs = 500;
  switch (plotFormat) {
    case "matching diffs":
      await $("#plotFormat-radioGroup-matching").scrollIntoView();
      pause(intMs);
      await $("#plotFormat-radioGroup-matching").click();
      break;
    case "pairwise diffs":
      await $("#plotFormat-radioGroup-pairwise").scrollIntoView();
      pause(intMs);
      await $("#plotFormat-radioGroup-pairwise").click();
      break;
    case "no diffs":
      await $("#plotFormat-radioGroup-none").scrollIntoView();
      pause(intMs);
      await $("#plotFormat-radioGroup-none").click();
      break;
    default:
      throw new Error("invalid plotFormat in setMatsPlotFormat");
  }
  pause(intMs);
};
