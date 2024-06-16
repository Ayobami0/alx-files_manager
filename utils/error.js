/**
 * Formats http errors.
 */
export default class HttpError {
  /**
  * Formats the message into the correct error format.
  * @param {String} message The message to be sent
  * @param {Number} status The status code
  * @returns {Object}       An object containing the formated message and status
  */
  static error(message, status) {
    return {
      message: { error: message },
      status,
    };
  }
}
