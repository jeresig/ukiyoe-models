var me = require("matchengine")({
    server: process.env.ME_SERVER,
    username: process.env.ME_USERNAME,
    password: process.env.ME_PASSWORD
});

module.exports = function(ukiyoe) {
    return me;
};