/**
 * Refresh the current page.
 */
export default async () => {
  const intMs = 5000;
  await browser.refresh();
  pause(intMs);
};
