/*
 * Singleton Socket.IO instance setter and event emitter.
 * Modules like candidateController use emitEvent() to push real-time
 * updates to connected admin/student clients without coupling to the
 * HTTP server setup.
 */
let ioInstance = null;

export function setIO(io) {
  ioInstance = io;
}

export function emitEvent(event, data) {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
}
