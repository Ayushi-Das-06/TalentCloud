import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = fs.mkdtempSync(path.join(backendDir, '.talentcloud-e2e-'));
const tempName = path.basename(tempDir);
if (!tempName.startsWith('.talentcloud-e2e-') || path.dirname(tempDir) !== backendDir) {
  throw new Error('Refusing to use an unexpected E2E temporary directory path.');
}

const databaseUrl = `file:../${tempName}/talentcloud.db`;
const storagePath = path.join(tempDir, 'uploads');
const dbEnvironment = { ...process.env, DATABASE_URL: databaseUrl };
const prismaCli = path.join(backendDir, 'node_modules', 'prisma', 'build', 'index.js');
const sqliteHelper = path.join(backendDir, 'prisma', 'ensure-sqlite-file.js');
const serverEntry = path.join(backendDir, 'dist', 'index.js');
const pass = (condition, label) => { if (!condition) throw new Error(`E2E assertion failed: ${label}`); };

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitForHealth(baseUrl, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`API exited before becoming healthy (code ${child.exitCode}).`);
    try {
      const response = await fetch(`${baseUrl}/ready`);
      if (response.ok) return;
    } catch { /* API is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('API did not become healthy within 15 seconds.');
}

async function request(baseUrl, route, { token, method = 'GET', json, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    ...(body ? { body } : {}),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

let apiProcess;
try {
  if (!fs.existsSync(serverEntry)) throw new Error('Build the backend first with `npm run build`.');
  execFileSync(process.execPath, [sqliteHelper], { cwd: backendDir, env: dbEnvironment, stdio: 'inherit' });
  execFileSync(process.execPath, [prismaCli, 'db', 'push', '--schema', 'prisma/schema.prisma', '--skip-generate'], {
    cwd: backendDir,
    env: dbEnvironment,
    stdio: 'inherit',
  });

  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;
  const serviceEnvironment = {
    ...dbEnvironment,
    NODE_ENV: 'development',
    PORT: String(port),
    STORAGE_DRIVER: 'local',
    STORAGE_LOCAL_PATH: storagePath,
    QUEUE_DRIVER: 'memory',
    TRUST_PROXY_HOPS: '0',
    RATE_LIMIT_REDIS_URL: '',
  };
  apiProcess = spawn(process.execPath, [serverEntry], { cwd: backendDir, env: serviceEnvironment, stdio: 'ignore' });
  await waitForHealth(baseUrl, apiProcess);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = `TalentCloud-E2E-${suffix}`;
  async function register(name, role) {
    const { response, data } = await request(baseUrl, '/auth/register', {
      method: 'POST',
      json: { name, email: `${name.toLowerCase().replace(/\s+/g, '-')}-${suffix}@example.test`, password, role, companyName: 'E2E Studio' },
    });
    pass(response.status === 201 && data.token && data.user?.id, `register ${role}`);
    return { token: data.token, user: data.user };
  }

  const client = await register('E2E Client', 'CLIENT');
  const freelancerOne = await register('E2E Freelancer One', 'FREELANCER');
  const freelancerTwo = await register('E2E Freelancer Two', 'FREELANCER');
  const draftResult = await request(baseUrl, '/projects', {
    method: 'POST', token: client.token,
    json: {
      title: 'E2E publishable draft project',
      description: 'This draft verifies private visibility and explicit publication before discovery.',
      category: 'Cloud / DevOps', minBudget: 250, maxBudget: 500,
      estimatedDurationDays: 30, skills: ['TypeScript'], status: 'DRAFT',
    },
  });
  pass(draftResult.response.status === 201 && draftResult.data.data.status === 'DRAFT', 'client saves a project draft');
  const draftId = draftResult.data.data.id;
  const hiddenDraft = await request(baseUrl, `/projects/${draftId}`);
  pass(hiddenDraft.response.status === 404, 'draft details remain hidden from unauthenticated users');
  const nonOwnerPublish = await request(baseUrl, `/projects/${draftId}`, {
    method: 'PUT', token: freelancerOne.token, json: { status: 'OPEN' },
  });
  pass(nonOwnerPublish.response.status === 403, 'non-client cannot publish a project draft');
  const publishResult = await request(baseUrl, `/projects/${draftId}`, {
    method: 'PUT', token: client.token, json: { status: 'OPEN' },
  });
  pass(publishResult.response.status === 200 && publishResult.data.data.status === 'OPEN', 'project owner publishes a draft');
  const protectedOpenDelete = await request(baseUrl, `/projects/${draftId}`, { method: 'DELETE', token: client.token });
  pass(protectedOpenDelete.response.status === 409, 'published project cannot be destructively deleted');

  const deletableDraft = await request(baseUrl, '/projects', {
    method: 'POST', token: client.token,
    json: {
      title: 'E2E deletable draft project',
      description: 'An empty draft can be removed by its owner without affecting marketplace work.',
      category: 'Cloud / DevOps', minBudget: 250, maxBudget: 500,
      estimatedDurationDays: 30, skills: ['TypeScript'], status: 'DRAFT',
    },
  });
  pass(deletableDraft.response.status === 201, 'create deletable draft');
  const draftDeleteUrl = `/projects/${deletableDraft.data.data.id}`;
  const nonOwnerDelete = await request(baseUrl, draftDeleteUrl, { method: 'DELETE', token: freelancerOne.token });
  pass(nonOwnerDelete.response.status === 403, 'non-owner cannot delete a draft');
  const ownerDelete = await request(baseUrl, draftDeleteUrl, { method: 'DELETE', token: client.token });
  pass(ownerDelete.response.status === 204, 'owner deletes an empty draft');
  const deletedDraftLookup = await request(baseUrl, draftDeleteUrl, { token: client.token });
  pass(deletedDraftLookup.response.status === 404, 'deleted draft is no longer accessible');

  const projectResult = await request(baseUrl, '/projects', {
    method: 'POST', token: client.token,
    json: {
      title: 'E2E cloud telemetry service',
      description: 'Build and verify a cloud telemetry API for distributed application metrics.',
      category: 'Cloud / DevOps', experienceLevel: 'INTERMEDIATE', complexity: 'MEDIUM',
      minBudget: 250, maxBudget: 500, estimatedDurationDays: 30,
      skills: ['TypeScript', 'PostgreSQL'],
    },
  });
  pass(projectResult.response.status === 201, 'create project');
  const projectId = projectResult.data.data.id;

  const applications = [];
  for (const [freelancer, amount] of [[freelancerOne, 300], [freelancerTwo, 350]]) {
    const { response, data } = await request(baseUrl, '/applications', {
      method: 'POST', token: freelancer.token,
      json: { projectId, coverLetter: 'I can deliver the requested telemetry workflow.', proposedBudget: amount, estimatedDays: 20 },
    });
    pass(response.status === 201, 'submit application');
    applications.push({ applicationId: data.data.id, freelancer });
  }

  const clientNotifications = await request(baseUrl, '/notifications', { token: client.token });
  const freelancerNotifications = await request(baseUrl, '/notifications', { token: freelancerOne.token });
  const applicationNotice = clientNotifications.data.data.find((item) => item.link === `/client/projects/${projectId}/applications`);
  pass(!!applicationNotice && !freelancerNotifications.data.data.some((item) => item.id === applicationNotice.id), 'application notification is private to its client recipient');
  const unauthorizedNotificationRead = await request(baseUrl, `/notifications/${applicationNotice.id}/read`, {
    method: 'PATCH', token: freelancerOne.token,
  });
  const clientNotificationsAfterDeniedRead = await request(baseUrl, '/notifications', { token: client.token });
  pass(unauthorizedNotificationRead.response.status === 404 &&
    clientNotificationsAfterDeniedRead.data.data.find((item) => item.id === applicationNotice.id)?.isRead === false,
  'non-recipient cannot read or mark another user notification');

  const proposalPage = await request(baseUrl, `/applications/project/${projectId}?page=1&limit=1`, { token: client.token });
  pass(proposalPage.response.status === 200 && proposalPage.data.data.length === 1 && proposalPage.data.pagination.total === 2, 'client proposal list paginates with total count');

  const simultaneousHires = await Promise.all(applications.map(({ applicationId }) =>
    request(baseUrl, '/hiring/hire', { method: 'POST', token: client.token, json: { applicationId } }),
  ));
  const winners = simultaneousHires.filter((result) => result.response.status === 201);
  pass(winners.length === 1, 'concurrent hiring creates exactly one contract');
  const contract = winners[0].data.data;
  const hired = applications.find(({ applicationId }) => applicationId === contract.applicationId).freelancer;
  const otherFreelancer = applications.find(({ applicationId }) => applicationId !== contract.applicationId).freelancer;

  const transitionProjectResult = await request(baseUrl, '/projects', {
    method: 'POST', token: client.token,
    json: {
      title: 'E2E withdrawal and hiring race',
      description: 'Verify withdrawal and hiring cannot produce a conflicting accepted proposal.',
      category: 'Cloud / DevOps', minBudget: 250, maxBudget: 500,
      estimatedDurationDays: 30, skills: ['TypeScript'],
    },
  });
  pass(transitionProjectResult.response.status === 201, 'create withdrawal race project');
  const transitionProjectId = transitionProjectResult.data.data.id;
  const transitionApplication = await request(baseUrl, '/applications', {
    method: 'POST', token: hired.token,
    json: { projectId: transitionProjectId, coverLetter: 'I can deliver this race-safe workflow.', proposedBudget: 300, estimatedDays: 20 },
  });
  pass(transitionApplication.response.status === 201, 'submit withdrawal race proposal');
  const transitionApplicationId = transitionApplication.data.data.id;
  const unauthorizedWithdrawal = await request(baseUrl, `/applications/${transitionApplicationId}/withdraw`, {
    method: 'POST', token: otherFreelancer.token,
  });
  pass(unauthorizedWithdrawal.response.status === 403, 'freelancer cannot withdraw another profile application');
  const [withdrawalRace, hiringRace] = await Promise.all([
    request(baseUrl, `/applications/${transitionApplicationId}/withdraw`, { method: 'POST', token: hired.token }),
    request(baseUrl, '/hiring/hire', { method: 'POST', token: client.token, json: { applicationId: transitionApplicationId } }),
  ]);
  const finalTransitionProject = await request(baseUrl, `/projects/${transitionProjectId}`, { token: client.token });
  const finalApplications = await request(baseUrl, '/applications/my-applications', { token: hired.token });
  const finalTransitionApplication = finalApplications.data.data.find((item) => item.id === transitionApplicationId);
  const hireWon = hiringRace.response.status === 201 && withdrawalRace.response.status !== 200 &&
    finalTransitionProject.data.data.status === 'IN_PROGRESS' && finalTransitionApplication?.status === 'ACCEPTED';
  const withdrawalWon = withdrawalRace.response.status === 200 && hiringRace.response.status !== 201 &&
    finalTransitionProject.data.data.status === 'OPEN' && finalTransitionApplication?.status === 'WITHDRAWN';
  pass(hireWon || withdrawalWon, 'concurrent proposal withdrawal and hiring leave consistent state');

  const tasksResult = await request(baseUrl, `/tasks/project/${projectId}`, { token: hired.token });
  pass(tasksResult.response.status === 200 && tasksResult.data.data.length === 1, 'hired freelancer sees kickoff task');
  const taskId = tasksResult.data.data[0].id;

  const form = new FormData();
  form.append('file', new Blob(['private project notes'], { type: 'text/plain' }), 'notes.txt');
  form.append('taskId', taskId);
  form.append('category', 'DELIVERABLE');
  const upload = await request(baseUrl, `/files/projects/${projectId}`, { method: 'POST', token: hired.token, body: form });
  pass(upload.response.status === 201, 'upload task attachment');
  const fileUrl = `/files/${encodeURIComponent(upload.data.data.fileKey)}`;
  const deniedDownload = await request(baseUrl, fileUrl, { token: otherFreelancer.token });
  const allowedDownload = await request(baseUrl, fileUrl, { token: client.token });
  pass(deniedDownload.response.status === 403 && allowedDownload.response.status === 200, 'private attachment access policy');
  const deletedFile = await request(baseUrl, `/files/projects/${projectId}/${upload.data.data.id}`, { method: 'DELETE', token: client.token });
  pass(deletedFile.response.status === 200, 'project owner deletes attachment');

  const publicProject = await request(baseUrl, `/projects/${projectId}`);
  const publicList = await request(baseUrl, '/projects?status=ALL');
  pass(publicProject.response.status === 404 && !publicList.data.data.some((item) => item.id === projectId), 'non-open project stays private');

  const resumeForm = new FormData();
  resumeForm.append('file', new Blob(['TypeScript React Node.js PostgreSQL AWS Docker'], { type: 'text/plain' }), 'resume.txt');
  const resumeUpload = await request(baseUrl, '/files/resume', { method: 'POST', token: otherFreelancer.token, body: resumeForm });
  pass(resumeUpload.response.status === 202, 'resume upload queued');
  let resumeStatus;
  const analysisDeadline = Date.now() + 10_000;
  while (Date.now() < analysisDeadline) {
    resumeStatus = await request(baseUrl, '/files/resume/status', { token: otherFreelancer.token });
    if (resumeStatus.data.data?.status === 'COMPLETED' || resumeStatus.data.data?.status === 'FAILED') break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  pass(resumeStatus?.data.data?.status === 'COMPLETED', 'memory worker completes resume analysis');
  const suggestions = JSON.parse(resumeStatus.data.data.analysis.extractedSkills);
  pass(suggestions.length > 0, 'resume analysis persists extracted skills');
  const confirmedSkill = await request(baseUrl, '/profiles/freelancer/skills', {
    method: 'POST', token: otherFreelancer.token,
    json: { skillName: suggestions[0].skill, yearsExperience: 1 },
  });
  pass(confirmedSkill.response.status === 201 && confirmedSkill.data.data.isVerified, 'freelancer confirms an extracted skill');

  const completions = await Promise.all([1, 2].map(() => request(baseUrl, `/hiring/complete/${contract.id}`, { method: 'POST', token: client.token })));
  pass(completions.filter((result) => result.response.status === 200).length === 1, 'concurrent contract completion has one winner');
  const review = await request(baseUrl, '/reviews', {
    method: 'POST', token: client.token,
    json: { projectId, revieweeId: hired.user.id, rating: 5, feedback: 'Clear communication and reliable delivery.' },
  });
  pass(review.response.status === 201, 'completed-contract participant submits review');

  const raceProjectResult = await request(baseUrl, '/projects', {
    method: 'POST', token: client.token,
    json: {
      title: 'E2E cancellation and hiring race',
      description: 'Verify cancellation and hiring cannot produce conflicting project states.',
      category: 'Cloud / DevOps', minBudget: 250, maxBudget: 500,
      estimatedDurationDays: 30, skills: ['TypeScript'],
    },
  });
  pass(raceProjectResult.response.status === 201, 'create cancellation race project');
  const raceProjectId = raceProjectResult.data.data.id;
  const raceApplication = await request(baseUrl, '/applications', {
    method: 'POST', token: freelancerOne.token,
    json: { projectId: raceProjectId, coverLetter: 'I can deliver this safely.', proposedBudget: 300, estimatedDays: 20 },
  });
  pass(raceApplication.response.status === 201, 'apply to cancellation race project');
  const [cancellation, raceHire] = await Promise.all([
    request(baseUrl, `/projects/${raceProjectId}`, { method: 'PUT', token: client.token, json: { status: 'CANCELLED' } }),
    request(baseUrl, '/hiring/hire', { method: 'POST', token: client.token, json: { applicationId: raceApplication.data.data.id } }),
  ]);
  const raceState = await request(baseUrl, `/projects/${raceProjectId}`, { token: client.token });
  const raceContracts = raceState.data.data?.contracts || [];
  pass(
    (raceState.data.data?.status === 'CANCELLED' && cancellation.response.status === 200 && raceContracts.length === 0) ||
    (raceState.data.data?.status === 'IN_PROGRESS' && cancellation.response.status !== 200 && raceContracts.some((item) => item.status === 'ACTIVE') && raceHire.response.status === 201),
    'concurrent cancellation and hiring preserve a consistent project/contract state',
  );

  console.log('E2E smoke passed: registration, draft publication/deletion, proposals, concurrent hiring/withdrawal/cancellation consistency, private files, resume worker/skill confirmation, contract completion, and review.');
} finally {
  if (apiProcess && apiProcess.exitCode === null) {
    apiProcess.kill(process.platform === 'win32' ? undefined : 'SIGTERM');
    await Promise.race([
      new Promise((resolve) => apiProcess.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
    if (apiProcess.exitCode === null) apiProcess.kill();
  }
  const resolvedBackend = path.resolve(backendDir);
  const resolvedTemp = path.resolve(tempDir);
  if (path.dirname(resolvedTemp) === resolvedBackend && path.basename(resolvedTemp).startsWith('.talentcloud-e2e-')) {
    fs.rmSync(resolvedTemp, { recursive: true, force: true });
  }
}
