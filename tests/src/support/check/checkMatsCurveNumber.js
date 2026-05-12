/**
 * Check if the given elements contains text
 * @param  {number}   curveNumber  The text to check against
 */
import pause from "../action/pause";

export default async (curveNumber) => {
  /**
   * Check that the graph contains curveNumber of curves
   * @curveNumber {Number}
   * @type {String}
   */
  const intMs = 500;
  if (curveNumber === 0) {
    // there won't be any curvelist
    let count = 0;
    let exists =
      (await $("#curveList").isExisting()) && (await $("#curveList").isDisplayed());
    while (count < 10 && exists !== false) {
      if (exists !== false) {
        pause(2000);
        exists =
          (await $("#curveList").isExisting()) && (await $("#curveList").isDisplayed());
        count += 1;
      }
    }
    expect(exists).toEqual(false, "There should be no curves remaining");
  } else {
    let count = 0;
    await $("#curveList").waitForDisplayed(20000);
    await $("#curveList").scrollIntoView();
    pause(intMs);
    let curveItemsLength = await $$("[id|='curveItem']").length;
    while (count < 5 && curveItemsLength !== curveNumber) {
      pause(1000);
      curveItemsLength = await $$("[id|='curveItem']").length;
      count += 1;
    }
    expect(curveItemsLength).toEqual(
      curveNumber,
      `The expected number of curves #{curveNumber} does not match ${curveItemsLength}`,
    );
  }
};
