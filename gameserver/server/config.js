module.exports = {
    PORT: process.env.PORT || 3842,
    // USE_HTTPS: true,
    USE_HTTPS: false,
    HTTPS_KEY: process.env.HTTPS_KEY || '/root/ssl/sonicxrocket.com.key',
    HTTPS_CERT: process.env.HTTPS_CERT || '/root/ssl/certificates/sonicxrocket.com.crt',
    HTTPS_CA: process.env.HTTPS_CA,
    DATABASE_URL:  process.env.DATABASE_URL || "postgres://bustabit:root@localhost:5432/bustabitdb",
    ENC_KEY: process.env.ENC_KEY || 'devkey',
    PRODUCTION: process.env.NODE_ENV  === 'production',

    //Do not set any of this on production

    CRASH_AT: process.env.CRASH_AT //Force the crash point
};
