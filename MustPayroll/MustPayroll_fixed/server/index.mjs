import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { InputError, PayrollService, BUILD_VARIANT } from './payroll.mjs';
import { BUILD_INFO } from './build-info.mjs';

if (BUILD_INFO.variant !== BUILD_VARIANT) throw new Error('Build metadata and payment implementation disagree.');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const database = resolve(process.env.PAYROLL_DB ?? resolve(root, 'data', 'payroll-usd.sqlite'));
mkdirSync(dirname(database), { recursive: true });
const service = new PayrollService(database);
const dist = resolve(root, 'dist');

async function readJsonBody(request) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
    if (Buffer.byteLength(text) > 65536) throw new InputError('Limit the request body to 65,536 bytes.', 413);
  }
  try { const value = JSON.parse(text || '{}'); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(); return value; }
  catch { throw new InputError('Send a JSON object as the request body.'); }
}
function sendJsonResponse(response, value, httpStatus = 200) {
  response.writeHead(httpStatus, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/api/health' && request.method === 'GET') return sendJsonResponse(response, { status: 'ok', storage: 'sqlite', application: 'MustPayroll', schemaVersion: 3, build: BUILD_INFO });
    if (path === '/api/payroll-datasets' && request.method === 'POST') return sendJsonResponse(response, service.createPayrollDataset(await readJsonBody(request)), 201);
    const routeMatch = path.match(/^\/api\/payroll-datasets\/([a-zA-Z0-9_-]+)(?:\/(employees|earnings|pay-runs|test-controls\/next-failure|notifications\/retry-pending|pay-periods\/reset))?$/)
      ?? path.match(/^\/api\/payroll-datasets\/([a-zA-Z0-9_-]+)\/(earnings)\/([a-zA-Z0-9_-]+)\/(approve|reject)$/);
    if (routeMatch) {
      const [, payrollDatasetId, action, earningId, reviewAction] = routeMatch;
      if (!action && request.method === 'GET') return sendJsonResponse(response, service.getPayrollState(payrollDatasetId, new URL(request.url, 'http://localhost').searchParams.get('scheduledPayRunAt') ?? undefined));
      if (request.method === 'POST') {
        const input = await readJsonBody(request);
        if (action === 'employees') return sendJsonResponse(response, service.addEmployee(payrollDatasetId, input), 201);
        if (action === 'pay-periods/reset') return sendJsonResponse(response, service.resetPayPeriod(payrollDatasetId, input.scheduledPayRunAt));
        if (action === 'earnings' && earningId) return sendJsonResponse(response, reviewAction === 'reject' ? service.rejectEarning(payrollDatasetId, earningId) : service.approveEarning(payrollDatasetId, earningId));
        if (action === 'earnings') return sendJsonResponse(response, service.recordEarnings(payrollDatasetId, input.earnings));
        if (action === 'pay-runs') return sendJsonResponse(response, service.processPayRun(payrollDatasetId, input.scheduledPayRunAt, input.simulatedProcessingAt));
        if (action === 'test-controls/next-failure') return sendJsonResponse(response, service.simulateNextFailure(payrollDatasetId, input.failureType));
        if (action === 'notifications/retry-pending') return sendJsonResponse(response, service.retryPendingNotifications(payrollDatasetId));
      }
    }
    if (path.startsWith('/api/')) throw new InputError('Endpoint not found.', 404);
    if (request.method !== 'GET' && request.method !== 'HEAD') throw new InputError('Method not supported.', 405);
    const candidate = resolve(dist, '.' + decodeURIComponent(path));
    if (candidate !== dist && !candidate.startsWith(dist + sep)) throw new InputError('Path not permitted.', 403);
    const file = existsSync(candidate) && statSync(candidate).isFile() ? candidate : resolve(dist, 'index.html');
    if (!existsSync(file)) throw new InputError('Build the frontend with npm run build, or use npm run dev.', 404);
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }[extname(file)] ?? 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': mime, 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : readFileSync(file));
  } catch (error) {
    if (!(error instanceof InputError)) console.error(error);
    sendJsonResponse(response, { error: error instanceof InputError ? error.message : 'Unable to complete the request. Refresh payroll and review the payment records before retrying.' }, error instanceof InputError ? error.httpStatus : 500);
  }
});
server.on('close', () => service.close());
server.listen(Number(process.env.PORT ?? BUILD_INFO.defaultPort), process.env.HOST ?? '127.0.0.1', () => console.log(`MustPayroll ${BUILD_INFO.id} listening on ${process.env.PORT ?? BUILD_INFO.defaultPort}`));
process.on('SIGINT', () => server.close());
process.on('SIGTERM', () => server.close());
