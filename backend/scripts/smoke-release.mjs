import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:18090/api/v1');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use an isolated local API');

async function request(path, { key, method = 'GET', body, status = 200 } = {}) {
  const headers = new Headers();
  if (key) headers.set('Authorization', `Bearer ${key}`);
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }
  const response = await fetch(`${base.origin}${base.pathname.replace(/\/$/, '')}${path}`, {
    method, headers, body, redirect: 'error', signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json();
  assert.equal(response.status, status, `${method} ${path} (${data?.code ?? response.status})`);
  return data;
}

async function login(email, role) {
  const result = await request('/auth/login', {
    method: 'POST', body: { email, password: 'FieldOps@2026' },
  });
  assert.equal(result.user.role, role);
  return result;
}

const health = await request('/actuator/health');
assert.equal(health.status, 'UP');
assert.equal(health.details, undefined);
assert.equal(health.components, undefined);

const admin = await login('admin@fieldops.local', 'ADMIN');
const technician = await login('tecnico@fieldops.local', 'TECHNICIAN');
const supervisor = await login('supervisor@fieldops.local', 'SUPERVISOR');
const adminKey = admin.accessToken;
const techKey = technician.accessToken;
const reviewerKey = supervisor.accessToken;

const clientId = '20000000-0000-0000-0000-000000000001';
const siteId = '30000000-0000-0000-0000-000000000001';
const equipmentId = '40000000-0000-0000-0000-000000000001';
const templateVersionId = '51000000-0000-0000-0000-000000000001';

const inspection = await request('/inspections', {
  key: adminKey, method: 'POST', status: 201,
  body: {
    clientId, siteId, equipmentId, templateVersionId, technicianId: technician.user.id,
    supervisorId: supervisor.user.id, title: 'AC-RELEASE HTTP', priority: 'MEDIUM',
    scheduledFor: new Date(Date.now() + 3_600_000).toISOString(),
  },
});
const inspectionPath = `/inspections/${inspection.id}`;
const mobilePath = `/mobile${inspectionPath}`;
const assigned = await request(`${inspectionPath}/assign`, {
  key: adminKey, method: 'POST', body: { technicianId: technician.user.id },
});
assert.equal(assigned.status, 'ASSIGNED');

const downloaded = await request(mobilePath, { key: techKey });
assert.equal(downloaded.status, 'ASSIGNED');
assert.equal(downloaded.items.length, 4);
const battery = downloaded.items.find(item => item.itemOrder === 3);
assert.ok(battery);
const scanned = await request('/equipment/by-qr/QR-GD-001', { key: techKey });
assert.equal(scanned.id, equipmentId);
const { nextCursor } = await request('/mobile/sync/pull', { key: techKey });
assert.ok(nextCursor);
console.log('Logins, agendamento, atribuição, download e resolução do QR pela API aprovados.');

const deviceId = randomUUID();
const capturedAt = new Date().toISOString();
const location = { latitude: -23.5, longitude: -47.4, accuracyMeters: 10, capturedAt };
const operation = (entityType, entityId, payload) => ({
  operationId: randomUUID(), entityType, entityId, operationType: 'UPSERT', payload,
});
const push = operations => request('/mobile/sync/push', {
  key: techKey, method: 'POST', body: { deviceId, operations },
});
const initialBatch = [
  operation('INSPECTION', inspection.id, { status: 'IN_PROGRESS', startedAtDevice: capturedAt, location }),
  ...downloaded.items.map(item => operation('INSPECTION_RESPONSE', item.id, {
    inspectionId: inspection.id,
    conformity: item.id === battery.id ? 'NON_CONFORMING' : 'CONFORMING',
    observation: item.id === battery.id ? 'Bateria com avaria no terminal.' : null,
  })),
];
assert.deepEqual((await push(initialBatch)).results.map(result => result.status),
  initialBatch.map(() => 'APPLIED'));
assert.deepEqual((await push(initialBatch)).results.map(result => result.status),
  initialBatch.map(() => 'ALREADY_APPLIED'));
const inProgress = await request(mobilePath, { key: techKey });
assert.equal(inProgress.status, 'IN_PROGRESS');
assert.equal(inProgress.responses.length, downloaded.items.length);
const response = inProgress.responses.find(item => item.inspectionItemId === battery.id);
assert.equal(response.conformity, 'NON_CONFORMING');
console.log('Envio em lote e reenvio idempotente confirmados para o início e as respostas.');

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGNgAAAAAgABSK+kcQAAAABJRU5ErkJggg==', 'base64');
const evidenceForm = new FormData();
for (const [name, value] of Object.entries({
  idempotencyKey: randomUUID(), type: 'PHOTO', responseId: response.id, capturedAtDevice: capturedAt,
  latitude: location.latitude, longitude: location.longitude,
})) evidenceForm.set(name, String(value));
evidenceForm.set('file', new Blob([png], { type: 'image/png' }), 'fieldops.png');

const evidencePath = `${inspectionPath}/evidence`;
const evidence = await request(evidencePath, { key: techKey, method: 'POST', body: evidenceForm, status: 201 });
assert.equal(evidence.responseId, response.id);
assert.equal(evidence.latitude, location.latitude);
assert.equal(evidence.longitude, location.longitude);
await request(evidencePath, { key: techKey, method: 'POST', body: evidenceForm, status: 409 });
assert.deepEqual((await request(evidencePath, { key: adminKey })).map(item => item.id), [evidence.id]);
const objectUrl = new URL(evidence.accessUrl);
assert(['127.0.0.1', 'localhost', '[::1]'].includes(objectUrl.hostname), 'Use isolated local object storage');
const object = await fetch(objectUrl, { redirect: 'error', signal: AbortSignal.timeout(15_000) });
assert.equal(object.status, 200, 'Read the evidence via the signed URL');
assert.deepEqual(Buffer.from(await object.arrayBuffer()), png);
console.log('Evidência vinculada, coordenadas gravadas, duplicata rejeitada e conteúdo assinado conferido.');

const completion = operation('INSPECTION', inspection.id, { status: 'SUBMITTED', completedAtDevice: capturedAt, location });
assert.equal((await push([completion])).results[0].status, 'APPLIED');
assert.equal((await push([completion])).results[0].status, 'ALREADY_APPLIED');
assert.equal((await request(inspectionPath, { key: adminKey })).status, 'SUBMITTED');
assert.equal((await request(`${inspectionPath}/begin-review`, { key: reviewerKey, method: 'POST' })).status,
  'UNDER_REVIEW');
assert.equal((await request(`${inspectionPath}/approve`, { key: reviewerKey, method: 'POST' })).status, 'APPROVED');

const changes = await request(`/mobile/sync/pull?cursor=${encodeURIComponent(nextCursor)}`, { key: techKey });
assert.ok(changes.changes.some(change => change.entityId === inspection.id && change.payload.status === 'APPROVED'));
assert.equal((await request(mobilePath, { key: techKey })).status, 'APPROVED');
const history = await request(`${inspectionPath}/history`, { key: adminKey });
for (const action of ['INSPECTION_STARTED', 'INSPECTION_SUBMITTED', 'INSPECTION_APPROVED']) {
  assert.ok(history.content.some(entry => entry.action === action), `Missing ${action} in inspection history`);
}
console.log('Conclusão idempotente, revisão, aprovação, atualização por pull e histórico aprovados.');
