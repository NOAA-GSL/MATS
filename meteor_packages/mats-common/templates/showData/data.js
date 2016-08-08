//import 'jquery.json-viewer/jquery.json/jquery.json-viewer.css';
//import 'jquery.json-viewer/jquery.json/jquery.json-viewer.js';
//require('jquery.json-viewer');
var setModalMaxHeight = function(element) {
    this.$element     = $(element);
    this.$content     = this.$element.find('.modal-content');
    var borderWidth   = this.$content.outerHeight() - this.$content.innerHeight();
    var dialogMargin  = $(window).width() > 767 ? 60 : 20;
    var contentHeight = $(window).height() - (dialogMargin + borderWidth);
    var headerHeight  = this.$element.find('.modal-header').outerHeight() || 0;
    var footerHeight  = this.$element.find('.modal-footer').outerHeight() || 0;
    var maxHeight     = contentHeight - (headerHeight + footerHeight);

    this.$content.css({
        'overflow': 'hidden'
    });

    this.$element
        .find('.modal-body').css({
        'max-height': maxHeight,
        'overflow-y': 'auto'
    });
};

Template.data.rendered = function() {
    $('.modal').on('show.bs.modal', function () {
        $(this).show();
        setModalMaxHeight(this);
    });

    $(window).resize(function () {
        if ($('.modal.in').length != 0) {
            setModalMaxHeight($('.modal.in'));
        }
    });
};

Template.data.helpers({
    data:function() {
        // use jQuery json-viewer
        return JSON.stringify(Session.get("data"), null, 4).toString();
        //$('#data-viewer').jsonViewer(Session.get("data"));
    }
});
