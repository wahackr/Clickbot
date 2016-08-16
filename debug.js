module.exports = function(enable_debug) {
    function log(message) {
        if (enable_debug) console.log("[debug]" + message);
    }

    return {
        log: log
    };
};