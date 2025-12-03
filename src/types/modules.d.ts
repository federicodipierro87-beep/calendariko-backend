// Type declarations for modules without built-in TypeScript support

declare module 'cors' {
  import { RequestHandler } from 'express';
  
  interface CorsOptions {
    origin?: boolean | string | string[] | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
    credentials?: boolean;
    optionsSuccessStatus?: number;
    preflightContinue?: boolean;
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    maxAge?: number;
  }

  function cors(options?: CorsOptions): RequestHandler;
  export = cors;
}

declare module 'morgan' {
  import { RequestHandler } from 'express';
  
  type FormatFn = (tokens: any, req: any, res: any) => string;
  type TokenIndexer = (req: any, res: any, param?: string) => string;
  
  function morgan(format: string | FormatFn, options?: any): RequestHandler;
  
  namespace morgan {
    function token(name: string, fn: TokenIndexer): typeof morgan;
    function format(name: string, fmt: string | FormatFn): typeof morgan;
    function compile(format: string): FormatFn;
  }
  
  export = morgan;
}

declare module 'jsonwebtoken' {
  export interface SignOptions {
    algorithm?: string;
    keyid?: string;
    expiresIn?: string | number;
    notBefore?: string | number;
    audience?: string | string[];
    subject?: string;
    issuer?: string;
    jwtid?: string;
    noTimestamp?: boolean;
    header?: object;
    encoding?: string;
  }

  export interface VerifyOptions {
    algorithms?: string[];
    audience?: string | string[];
    clockTimestamp?: number;
    clockTolerance?: number;
    complete?: boolean;
    issuer?: string | string[];
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
    jwtid?: string;
    nonce?: string;
    subject?: string | string[];
    maxAge?: string | number;
  }

  export interface JsonWebTokenError extends Error {
    name: 'JsonWebTokenError';
  }

  export interface TokenExpiredError extends JsonWebTokenError {
    name: 'TokenExpiredError';
    expiredAt: Date;
  }

  export interface NotBeforeError extends JsonWebTokenError {
    name: 'NotBeforeError';
    date: Date;
  }

  export function sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: string | Buffer,
    options?: SignOptions
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: VerifyOptions
  ): any;

  export function decode(token: string, options?: any): any;
}