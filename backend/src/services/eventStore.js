const MAX_EVENTS = 500;
let events = [];

export function addEvent(event) {
  events.unshift({
    ...event,
    timestamp: event.timestamp || Math.floor(Date.now() / 1000),
  });
  if (events.length > MAX_EVENTS) events.pop();
}

export function getEvents(limit = 100) {
  return events.slice(0, limit);
}
