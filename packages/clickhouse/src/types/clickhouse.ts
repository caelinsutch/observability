import type { Event } from '@observability/types';

// ClickHouse-specific types where JSON fields are stored as strings

export interface EventRecord extends Omit<Event, 'attributes' | 'resource_attributes'> {
  attributes: string; // JSON string in ClickHouse
  resource_attributes: string; // JSON string in ClickHouse
}

// Helper functions for converting between types

export function parseEventRecord(record: EventRecord): Event {
  return {
    ...record,
    attributes: JSON.parse(record.attributes),
    resource_attributes: JSON.parse(record.resource_attributes),
  };
}

export function prepareEventForInsert(event: Event): EventRecord {
  return {
    ...event,
    attributes: typeof event.attributes === 'string' 
      ? event.attributes 
      : JSON.stringify(event.attributes),
    resource_attributes: typeof event.resource_attributes === 'string'
      ? event.resource_attributes
      : JSON.stringify(event.resource_attributes),
  };
}

// Batch operations
export function prepareEventsForInsert(events: Event[]): EventRecord[] {
  return events.map(prepareEventForInsert);
}

export function parseEventRecords(records: EventRecord[]): Event[] {
  return records.map(parseEventRecord);
}