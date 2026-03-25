import http from 'http';
import https from 'https';

interface RequestOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface HttpResponse {
  status: number;
  data: any;
}

export async function request(opts: RequestOptions): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(opts.url);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOpts: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...opts.headers,
      },
      timeout: opts.timeout || 10000,
    };

    const req = lib.request(reqOpts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let data: any;
        try {
          data = body ? JSON.parse(body) : null;
        } catch {
          data = body;
        }
        resolve({ status: res.statusCode || 0, data });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (opts.body) {
      req.write(JSON.stringify(opts.body));
    }
    req.end();
  });
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
