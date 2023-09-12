// Functions to help show/hide various verification sources (MATS/METexpress apps)
// as opposed to toggling them.

// Hides all ".multi-collapse" elements, then shows the elements with the given selector
function showSelector(selector) {
  const collapseElements = document.querySelectorAll(".multi-collapse");
  const showElements = document.querySelectorAll(selector);

  collapseElements.forEach((element) => {
    let bsCollapse = new bootstrap.Collapse(element, { toggle: false });
    bsCollapse.hide();
  });

  showElements.forEach((element) => {
    let bsShow = new bootstrap.Collapse(element, { toggle: false });
    bsShow.show();
  });
}

// Shows all elements with the ".appgroup" and ".multi-collapse" selector
function showAll() {
  const appGroups = document.querySelectorAll(".appgroup");
  const collapseElements = document.querySelectorAll(".multi-collapse");

  // Show all app group headers
  appGroups.forEach((appGroup) => {
    let appGroupCollapse = new bootstrap.Collapse(appGroup, { toggle: false });
    appGroupCollapse.show();
  });

  // Show all the apps
  collapseElements.forEach((element) => {
    let bsCollapse = new bootstrap.Collapse(element, { toggle: false });
    bsCollapse.show();
  });
}

// Checks if all ".multi-collapse" children of an ".appgroup" are collapsed
function allChildrenAreCollapsed(appGroup) {
  const collapseElements = appGroup.querySelectorAll(".multi-collapse");
  return [...collapseElements].every(
    (collapse) => !collapse.classList.contains("show")
  );
}

// Handle collapsing/showing the "appgroup" headers
function handleAppGroups() {
  const appGroups = document.querySelectorAll(".appgroup");
  appGroups.forEach((appGroup) => {
    const groupCollapse = new bootstrap.Collapse(appGroup, { toggle: false });
    if (allChildrenAreCollapsed(appGroup)) {
      groupCollapse.hide();
    } else {
      groupCollapse.show();
    }
  });
}

// Register event listeners to all elements with the "multi-collapse" class
document.addEventListener("DOMContentLoaded", function () {
  const collapseElements = document.querySelectorAll(".multi-collapse");
  collapseElements.forEach((element) => {
    element.addEventListener("shown.bs.collapse", handleAppGroups);
    element.addEventListener("hidden.bs.collapse", handleAppGroups);
  });
});
