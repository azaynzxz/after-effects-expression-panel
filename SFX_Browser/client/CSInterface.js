/**
 * CSInterface - Minimal CEP bridge for Adobe host applications.
 * Based on Adobe CEP CSInterface.js v11.
 */

function CSInterface() {
    this.hostEnvironment = JSON.parse(window.__adobe_cep__.getHostEnvironment());
}

CSInterface.prototype.evalScript = function (script, callback) {
    if (callback === null || callback === undefined) {
        callback = function () { };
    }
    window.__adobe_cep__.evalScript(script, callback);
};

CSInterface.prototype.getSystemPath = function (pathType) {
    return window.__adobe_cep__.getSystemPath(pathType);
};

CSInterface.prototype.addEventListener = function (type, listener, obj) {
    window.__adobe_cep__.addEventListener(type, listener, obj);
};

CSInterface.prototype.removeEventListener = function (type, listener, obj) {
    window.__adobe_cep__.removeEventListener(type, listener, obj);
};

CSInterface.prototype.requestOpenExtension = function (extensionId, params) {
    window.__adobe_cep__.requestOpenExtension(extensionId, params);
};

CSInterface.prototype.closeExtension = function () {
    window.__adobe_cep__.closeExtension();
};

CSInterface.prototype.getExtensions = function (extensionIds) {
    return JSON.parse(window.__adobe_cep__.getExtensions(extensionIds));
};

CSInterface.prototype.getNetworkPreferences = function () {
    return JSON.parse(window.__adobe_cep__.getNetworkPreferences());
};

var SystemPath = {
    USER_DATA: "userData",
    COMMON_FILES: "commonFiles",
    MY_DOCUMENTS: "myDocuments",
    APPLICATION: "application",
    EXTENSION: "extension",
    HOST_APPLICATION: "hostApplication"
};
