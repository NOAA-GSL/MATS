
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

Template.data.onRendered(function() {
    $('.modal').on('show.bs.modal', function () {
        $(this).show();
        setModalMaxHeight(this);
    });

    $(window).resize(function () {
        if ($('.modal.in').length != 0) {
            setModalMaxHeight($('.modal.in'));
        }
    });
});

Template.data.helpers({
    data:function() {
        var key = Session.get("plotResultKey");
        var keyResult = matsCollections.Results.findOne({key: Session.get("plotResultKey")});
        if (keyResult) {
            return keyResult.result.data;
        } else {
            return undefined;
        }

    },
    options:function() {
        return {collapsed:true,nl2br:true,recursive_collapser:true};
    }
});
