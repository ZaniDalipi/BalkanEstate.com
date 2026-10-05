import {
  FEED_FIELDS,
  MULTI_VALUE_FIELDS,
  type FeedField,
  type FeedMapping,
  type XmlNode,
} from './feedTypes';

/**
 * Evaluate the small path language mappings use against an XmlNode tree.
 *
 *   `.`                 the node itself
 *   `price`             child elements named price
 *   `location/city`     nested children
 *   `price/@currency`   an attribute of the matched elements
 *   `@id`               an attribute of the node itself
 *
 * Names are compared case-insensitively against namespace-local names, so a
 * mapping never has to know which prefix a feed happened to use.
 */

const PATH_PATTERN = /^(\.|(@[A-Za-z_][\w.-]*)|([A-Za-z_][\w.-]*(\/[A-Za-z_][\w.-]*)*(\/@[A-Za-z_][\w.-]*)?))$/;
const MAX_PATH_LENGTH = 200;

export const isValidPath = (path: string): boolean =>
  typeof path === 'string' && path.length > 0 && path.length <= MAX_PATH_LENGTH && PATH_PATTERN.test(path);

interface PathMatch {
  node: XmlNode;
  /** Set when the path ended in `@attr`. */
  attribute?: string;
}

const select = (root: XmlNode, path: string): PathMatch[] => {
  if (path === '.') return [{ node: root }];
  const segments = path.toLowerCase().split('/');
  const last = segments[segments.length - 1];
  const attribute = last.startsWith('@') ? last.slice(1) : undefined;
  const elementSegments = attribute ? segments.slice(0, -1) : segments;

  let current: XmlNode[] = [root];
  for (const segment of elementSegments) {
    const next: XmlNode[] = [];
    for (const node of current) {
      for (const child of node.children) if (child.name === segment) next.push(child);
    }
    current = next;
    if (current.length === 0) return [];
  }
  return current.map((node) => ({ node, attribute }));
};

/**
 * The value of a matched element. An element with no text of its own falls
 * back to a URL-ish attribute, so `<image url="…"/>` and `<image>…</image>`
 * both work for repeated media elements.
 */
const valueOf = ({ node, attribute }: PathMatch): string | undefined => {
  if (attribute) return node.attrs[attribute];
  const text = node.text.trim();
  if (text) return text;
  return node.attrs.url ?? node.attrs.src ?? node.attrs.href;
};

export const selectValues = (root: XmlNode, path: string): string[] =>
  select(root, path)
    .map(valueOf)
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    .map((v) => v.trim());

export const selectFirst = (root: XmlNode, path: string): string | undefined => selectValues(root, path)[0];

/** Matched elements for a path (used for floor plans, which carry a label attribute). */
export const selectNodes = (root: XmlNode, path: string): XmlNode[] =>
  select(root, path)
    .filter((m) => !m.attribute)
    .map((m) => m.node);

export type MappedRecord = Partial<Record<FeedField, string | string[]>> & {
  /** Labels of floor plans, index-aligned with `floorplans`. */
  floorplanLabels?: Array<string | undefined>;
};

/** Apply a mapping's paths to one record. Values are raw strings; normalization comes later. */
export const mapRecord = (record: XmlNode, mapping: FeedMapping): MappedRecord => {
  const out: MappedRecord = {};
  for (const field of FEED_FIELDS) {
    const path = mapping.fields[field];
    if (!path) continue;
    if (MULTI_VALUE_FIELDS.has(field)) {
      const values = selectValues(record, path);
      if (values.length) out[field] = values;
      if (field === 'floorplans') {
        out.floorplanLabels = select(record, path).map((m) => m.node.attrs.label ?? m.node.attrs.title);
      }
    } else {
      const value = selectFirst(record, path);
      if (value !== undefined) out[field] = value;
    }
  }
  return out;
};

/** Validate a mapping supplied by an agency. Returns human-readable problems. */
export const validateMapping = (mapping: unknown): string[] => {
  const problems: string[] = [];
  if (!mapping || typeof mapping !== 'object') return ['Mapping must be an object'];
  const m = mapping as Partial<FeedMapping>;
  if (typeof m.recordElement !== 'string' || !/^[A-Za-z_][\w.-]{0,63}$/.test(m.recordElement)) {
    problems.push('recordElement must be an XML element name, e.g. "property"');
  }
  if (!m.fields || typeof m.fields !== 'object') {
    problems.push('fields must map feed fields to paths');
    return problems;
  }
  for (const [field, path] of Object.entries(m.fields)) {
    if (!(FEED_FIELDS as readonly string[]).includes(field)) problems.push(`Unknown field "${field}"`);
    else if (typeof path !== 'string' || !isValidPath(path)) problems.push(`Invalid path for ${field}: "${String(path)}"`);
  }
  for (const required of ['externalId', 'title', 'price', 'city'] as const) {
    if (!m.fields[required]) problems.push(`A path for "${required}" is required`);
  }
  for (const key of ['totalCount', 'nextPage'] as const) {
    const path = m.feed?.[key];
    if (path !== undefined && (typeof path !== 'string' || !isValidPath(path))) {
      problems.push(`Invalid feed.${key} path`);
    }
  }
  if (m.valueMaps !== undefined) {
    if (typeof m.valueMaps !== 'object' || m.valueMaps === null) problems.push('valueMaps must be an object');
    else {
      for (const [name, map] of Object.entries(m.valueMaps)) {
        if (!['listingType', 'propertyType', 'status', 'rentPeriod', 'addressVisibility'].includes(name)) {
          problems.push(`Unknown value map "${name}"`);
          continue;
        }
        if (!map || typeof map !== 'object' || Object.keys(map).length > 200) {
          problems.push(`Value map "${name}" must be an object with at most 200 entries`);
          continue;
        }
        for (const [k, v] of Object.entries(map)) {
          if (typeof v !== 'string' || k.length > 100 || v.length > 50) problems.push(`Invalid entry in ${name} map`);
        }
      }
    }
  }
  if (m.areaUnit !== undefined && m.areaUnit !== 'm2' && m.areaUnit !== 'sqft') problems.push('areaUnit must be m2 or sqft');
  if (m.defaults !== undefined) {
    const { country, currency } = m.defaults ?? {};
    if (country !== undefined && (typeof country !== 'string' || country.length > 60)) problems.push('Invalid default country');
    if (currency !== undefined && (typeof currency !== 'string' || !/^[A-Za-z]{3}$/.test(currency))) {
      problems.push('Default currency must be a 3-letter code');
    }
  }
  return problems;
};
