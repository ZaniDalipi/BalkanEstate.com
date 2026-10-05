/**
 * Minimal typings for the parts of `sax` the agency-feed XML reader uses.
 * sax ships no declarations and @types/sax is not a dependency.
 */
declare module 'sax' {
  export interface QualifiedAttribute {
    name: string;
    value: string;
    prefix: string;
    local: string;
    uri: string;
  }

  export interface QualifiedTag {
    name: string;
    prefix: string;
    local: string;
    uri: string;
    attributes: Record<string, QualifiedAttribute>;
    isSelfClosing: boolean;
  }

  export interface SAXOptions {
    xmlns?: boolean;
    trim?: boolean;
    normalize?: boolean;
    lowercase?: boolean;
    position?: boolean;
    strictEntities?: boolean;
  }

  export interface SAXParser {
    onerror: ((error: Error) => void) | null;
    ontext: ((text: string) => void) | null;
    oncdata: ((cdata: string) => void) | null;
    ondoctype: ((doctype: string) => void) | null;
    onprocessinginstruction: ((pi: { name: string; body: string }) => void) | null;
    onopentag: ((tag: QualifiedTag) => void) | null;
    onclosetag: ((tagName: string) => void) | null;
    onend: (() => void) | null;
    write(chunk: string): SAXParser;
    close(): SAXParser;
    resume(): SAXParser;
  }

  export function parser(strict: boolean, options?: SAXOptions): SAXParser;
}
