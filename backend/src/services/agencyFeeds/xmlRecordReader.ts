import { TextDecoder } from 'util';
import sax, { type QualifiedTag } from 'sax';
import { FeedDocumentError, type XmlNode } from './feedTypes';

/**
 * Streaming, bounded XML reader for agency feeds.
 *
 * Built on sax in strict, namespace-aware mode:
 *  - DOCTYPE is refused outright, so no DTD, internal entity declarations,
 *    external entities (XXE) or entity expansion ("billion laughs") can occur.
 *    sax never resolves external resources, and without a DTD only the five
 *    predefined XML entities and numeric references exist.
 *  - Element names are matched by local name, so `<re:listing>` and
 *    `<listing xmlns="…">` both read as `listing`.
 *  - CDATA is folded into the element's text.
 *  - Bytes, records, depth, nodes per record and text length are all capped;
 *    exceeding any cap fails the whole document instead of truncating it,
 *    because a silently truncated snapshot must never look complete.
 *  - A document that ends before its root closes is an error, which is how a
 *    cut-off download is detected.
 */

export interface XmlReaderLimits {
  maxBytes: number;
  maxRecords: number;
  maxDepth: number;
  maxNodesPerRecord: number;
  maxTextLength: number;
  maxHeaderNodes: number;
}

export const DEFAULT_XML_LIMITS: XmlReaderLimits = {
  maxBytes: 50 * 1024 * 1024,
  maxRecords: 10_000,
  maxDepth: 48,
  maxNodesPerRecord: 2_000,
  maxTextLength: 200_000,
  maxHeaderNodes: 500,
};

export interface XmlReadResult {
  /** The root element with every record subtree removed (feed-level metadata). */
  header: XmlNode;
  records: XmlNode[];
  bytes: number;
}

const ENCODING_DECL = /^<\?xml[^>]*encoding\s*=\s*["']([A-Za-z0-9._-]+)["']/;

/** Pick a decoder from the BOM or the XML declaration; default UTF-8. */
const detectEncoding = (head: Buffer): string => {
  if (head.length >= 2 && head[0] === 0xff && head[1] === 0xfe) return 'utf-16le';
  if (head.length >= 2 && head[0] === 0xfe && head[1] === 0xff) return 'utf-16be';
  const ascii = head.subarray(0, 200).toString('latin1');
  const match = ENCODING_DECL.exec(ascii.replace(/^﻿|^\xEF\xBB\xBF/, ''));
  return match ? match[1].toLowerCase() : 'utf-8';
};

const createDecoder = (label: string): TextDecoder => {
  try {
    return new TextDecoder(label, { fatal: false });
  } catch {
    throw new FeedDocumentError('unsupported_encoding', `Unsupported XML encoding "${label}"`);
  }
};

const newNode = (tag: QualifiedTag): XmlNode => {
  const attrs: Record<string, string> = {};
  for (const attr of Object.values(tag.attributes)) {
    // Namespace declarations are not data.
    if (attr.name === 'xmlns' || attr.prefix === 'xmlns') continue;
    attrs[(attr.local || attr.name).toLowerCase()] = attr.value;
  }
  return { name: (tag.local || tag.name).toLowerCase(), attrs, children: [], text: '' };
};

export class XmlRecordReader {
  private readonly parser = sax.parser(true, { xmlns: true, trim: false, normalize: false });
  private readonly limits: XmlReaderLimits;
  private readonly recordName: string;
  private decoder: TextDecoder | null = null;
  private bytes = 0;
  private error: Error | null = null;
  private ended = false;
  private rootClosed = false;

  private header: XmlNode | null = null;
  private headerNodes = 0;
  /** Stack of open elements; entries inside a record are record nodes. */
  private stack: Array<{ node: XmlNode | null; inRecord: boolean; isRecordRoot: boolean }> = [];
  private recordNodes = 0;
  private readonly records: XmlNode[] = [];

  constructor(recordElement: string, limits: Partial<XmlReaderLimits> = {}) {
    this.limits = { ...DEFAULT_XML_LIMITS, ...limits };
    this.recordName = recordElement.toLowerCase();
    this.bindParser();
  }

  private fail(error: Error): never {
    this.error = error;
    throw error;
  }

  private bindParser(): void {
    const p = this.parser;
    p.onerror = (err) => {
      // Keep the first error: a refused DOCTYPE is reported as such, not as
      // the undefined entity it declared.
      if (this.error) return;
      this.error = new FeedDocumentError('invalid_xml', `Invalid XML: ${err.message.split('\n')[0]}`);
    };
    p.ondoctype = () => {
      if (this.error) return;
      this.error = new FeedDocumentError(
        'doctype_forbidden',
        'XML DOCTYPE declarations are not allowed in property feeds'
      );
    };
    p.onopentag = (tag) => {
      if (this.error) return;
      if (this.rootClosed) {
        this.error = new FeedDocumentError('invalid_xml', 'Content after the root element');
        return;
      }
      if (this.stack.length >= this.limits.maxDepth) {
        this.error = new FeedDocumentError('too_deep', `XML nesting deeper than ${this.limits.maxDepth} levels`);
        return;
      }
      const parent = this.stack[this.stack.length - 1];
      const node = newNode(tag);

      if (!parent) {
        this.header = node;
        this.headerNodes = 1;
        this.stack.push({ node, inRecord: false, isRecordRoot: false });
        return;
      }

      if (parent.inRecord) {
        this.recordNodes += 1;
        if (this.recordNodes > this.limits.maxNodesPerRecord) {
          this.error = new FeedDocumentError(
            'record_too_large',
            `A listing has more than ${this.limits.maxNodesPerRecord} XML elements`
          );
          return;
        }
        parent.node?.children.push(node);
        this.stack.push({ node, inRecord: true, isRecordRoot: false });
        return;
      }

      if (node.name === this.recordName) {
        if (this.records.length >= this.limits.maxRecords) {
          this.error = new FeedDocumentError(
            'too_many_records',
            `Feed has more than ${this.limits.maxRecords} listings, the per-feed maximum`
          );
          return;
        }
        this.recordNodes = 1;
        this.stack.push({ node, inRecord: true, isRecordRoot: true });
        return;
      }

      // Feed-level element outside any record: keep a bounded copy for metadata.
      this.headerNodes += 1;
      const keep = this.headerNodes <= this.limits.maxHeaderNodes;
      if (keep) parent.node?.children.push(node);
      this.stack.push({ node: keep ? node : null, inRecord: false, isRecordRoot: false });
    };
    const appendText = (text: string) => {
      if (this.error) return;
      const top = this.stack[this.stack.length - 1];
      if (!top?.node) return;
      if (top.node.text.length + text.length > this.limits.maxTextLength) {
        this.error = new FeedDocumentError(
          'text_too_long',
          `An XML text value is longer than ${this.limits.maxTextLength} characters`
        );
        return;
      }
      top.node.text += text;
    };
    p.ontext = appendText;
    p.oncdata = appendText;
    p.onclosetag = () => {
      if (this.error) return;
      const top = this.stack.pop();
      if (top?.isRecordRoot && top.node) this.records.push(top.node);
      if (this.stack.length === 0) this.rootClosed = true;
    };
  }

  /** Feed the next chunk of the response body. Throws as soon as the document is invalid. */
  write(chunk: Buffer): void {
    if (this.error) throw this.error;
    if (this.ended) throw new Error('XmlRecordReader: write after end');
    this.bytes += chunk.length;
    if (this.bytes > this.limits.maxBytes) {
      this.fail(
        new FeedDocumentError('too_large', `Feed is larger than ${Math.round(this.limits.maxBytes / 1048576)} MB`)
      );
    }
    if (!this.decoder) this.decoder = createDecoder(detectEncoding(chunk));
    this.parser.write(this.decoder.decode(chunk, { stream: true }));
    if (this.error) throw this.error;
  }

  /** Finish the document. Throws if it was empty, truncated or malformed. */
  end(): XmlReadResult {
    if (this.error) throw this.error;
    this.ended = true;
    if (this.decoder) this.parser.write(this.decoder.decode());
    if (this.error) throw this.error;
    if (!this.header) throw new FeedDocumentError('empty_document', 'The feed response contained no XML');
    // Checked before close(): sax would report this as a generic parse error.
    if (!this.rootClosed) {
      throw new FeedDocumentError('truncated', 'The feed ended before the XML document was complete');
    }
    this.parser.close();
    if (this.error) throw this.error;
    return { header: this.header, records: this.records, bytes: this.bytes };
  }
}

/** Convenience for tests and small in-memory documents. */
export const readXmlDocument = (
  xml: string | Buffer,
  recordElement: string,
  limits: Partial<XmlReaderLimits> = {}
): XmlReadResult => {
  const reader = new XmlRecordReader(recordElement, limits);
  reader.write(Buffer.isBuffer(xml) ? xml : Buffer.from(xml, 'utf8'));
  return reader.end();
};
