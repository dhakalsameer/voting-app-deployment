let ioInstance = null;

export function setIO(io) {
  ioInstance = io;
}

export function emitEvent(event, data) {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
}
