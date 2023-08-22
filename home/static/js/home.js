// Functions to help show/hide various verification sources (MATS/METexpress apps)
// as opposed to toggling them.

// Hides all ".multi-collapse" elements, then shows the elements with the given selector
function showSelector(selector) {
    var collapseElements = document.querySelectorAll('.multi-collapse');
    var showElements = document.querySelectorAll(selector);

    collapseElements.forEach(function(element) {
      var bsCollapse = new bootstrap.Collapse(element, {toggle: false});
      bsCollapse.hide();
    });

    showElements.forEach(function(element) {
      var bsShow = new bootstrap.Collapse(element, {toggle: false});
      bsShow.show();
    });
}

// Shows all elements with the ".multi-collapse" selector
function showAll() {
    var collapseElements = document.querySelectorAll('.multi-collapse');

    collapseElements.forEach(function(element) {
        var bsCollapse = new bootstrap.Collapse(element, {toggle: false});
        bsCollapse.show();
    });
}