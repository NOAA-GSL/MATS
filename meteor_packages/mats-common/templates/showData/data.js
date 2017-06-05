
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
        //var dataObj = Session.get("data") === undefined ? {} : Session.get("data");
        if (dataObj === undefined || dataObj['dataLink'] === undefined) {
            return dataObj;
        }
        const fName = dataObj['dataLink'].replace('file://', '');
        const data = matsMethods.readDataFile.call({path: fName}, function (error, result) {
            if(error !== undefined) {
                dataObj['data'] = error;
            } else {
                if (result !== undefined) {
                    dataObj['data'] = JSON.parse(result.toString());
                }
            }

            Session.set('data',dataObj);
        });
        return Session.get('data');
    },
    options:function() {
        return {collapsed:true,nl2br:true,recursive_collapser:true};
    }
});
