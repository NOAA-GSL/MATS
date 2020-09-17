/**
 * refresh the browser
 * Creates a new Selenium session with your current capabilities.
 * This is useful if you test highly stateful application where you need
 * to clean the browser session between the tests in your spec file
 * to avoid creating hundreds of single test files with WDIO.
 */
export default () => {
    browser.reloadSession();
};
