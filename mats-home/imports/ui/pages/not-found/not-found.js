import './not-found.html';

Template.App_notFound.helpers({
    proxyPrefix() {
        if (process.env.PROXY_PREFIX) {
            return process.env.PROXY_PREFIX + "/";
        } else {
            return "";
        }
    }
});