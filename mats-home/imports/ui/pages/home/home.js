import './home.html';
import '../../components/landing/landing.js';

Template.App_home.helpers({
    proxyPrefix() {
        if (process.env.PROXY_PREFIX) {
            return process.env.PROXY_PREFIX + "/";
        } else {
            return "";
        }
    }
});