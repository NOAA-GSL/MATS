// Functions to help show/hide various verification sources (MATS/METexpress apps)
// as opposed to toggling them.

// Hides all ".multi-collapse" elements, then shows the elements with the given selector
function showSelector(selector) {
  const collapseElements = document.querySelectorAll(".multi-collapse");
  const showElements = document.querySelectorAll(selector);

  collapseElements.forEach(function (element) {
    let bsCollapse = new bootstrap.Collapse(element, { toggle: false });
    bsCollapse.hide();
  });

  showElements.forEach(function (element) {
    let bsShow = new bootstrap.Collapse(element, { toggle: false });
    bsShow.show();
  });
}

// Shows all elements with the ".appgroup" and ".multi-collapse" selector
function showAll() {
  const appGroups = document.querySelectorAll(".appgroup");
  const collapseElements = document.querySelectorAll(".multi-collapse");

  // Show all app group headers
  appGroups.forEach(function (appGroup) {
    let appGroupCollapse = new bootstrap.Collapse(appGroup, { toggle: false });
    appGroupCollapse.show();
  });

  // Show all the apps
  collapseElements.forEach(function (element) {
    let bsCollapse = new bootstrap.Collapse(element, { toggle: false });
    bsCollapse.show();
  });
}

// Checks if all ".multi-collapse" children of an ".appgroup" are collapsed
function allChildrenAreCollapsed(appGroup) {
  const collapseElements = appGroup.querySelectorAll(".multi-collapse");
  collapseElements.forEach((element) => {
    if (element.classList.contains("show")) {
      return false; // At least one child is not collapsed
    }
  });
  return true; // All children are collapsed
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
