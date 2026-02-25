const crypto = require('crypto');

/**
 * Generate Checksum for PhonePe Request
 * @param {string} payload - Base64 encoded payload
 * @param {string} apiEndpoint - Endpoint (e.g., /pg/v1/pay)
 * @param {string} saltKey - Merchant Salt Key
 * @param {string} saltIndex - Salt Key Index
 * @returns {string} - Checksum
 */
exports.generateChecksum = (payload, apiEndpoint, saltKey, saltIndex) => {
    const string = payload + apiEndpoint + saltKey;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    return `${sha256}###${saltIndex}`;
};

/**
 * Verify Checksum for PhonePe Callbacks
 * @param {string} xVerifyHeader - Header from PhonePe
 * @param {string} payload - Response body as string (un-encoded)
 * @param {string} saltKey - Merchant Salt Key
 * @returns {boolean} - Is valid
 */
exports.verifyChecksum = (xVerifyHeader, payload, saltKey) => {
    const [checksum, saltIndex] = xVerifyHeader.split('###');
    const string = payload + saltKey;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    return sha256 === checksum;
};
