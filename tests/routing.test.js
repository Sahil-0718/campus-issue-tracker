import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, departmentFor, resolvePriority, isForwardMove } from '../src/routing.js';
import { hashPassword, verifyPassword } from '../src/db.js';

test('every category routes to a department', () => {
  for (const category of Object.keys(CATEGORIES)) assert.ok(departmentFor(category), category);
});

test('routing rules match the department table', () => {
  assert.equal(departmentFor('Wi-Fi / Network'), 'IT');
  assert.equal(departmentFor('Computer / Lab Equipment'), 'CSE');
  assert.equal(departmentFor('AI / ML Models & Datasets'), 'AIML');
  assert.equal(departmentFor('Projector / Smart Board'), 'IT');
  assert.equal(departmentFor('AC / Fan'), 'IT');
  assert.equal(departmentFor('Classroom & Lab Infrastructure'), 'CSE');
  assert.equal(departmentFor('Unknown'), null);
});

test('priority defaults to Medium and respects the requested value', () => {
  assert.equal(resolvePriority(undefined, 'Chair is wobbly'), 'Medium');
  assert.equal(resolvePriority('Low', 'Chair is wobbly'), 'Low');
  assert.equal(resolvePriority('bogus', 'Chair is wobbly'), 'Medium');
});

test('hazard keywords escalate priority to High', () => {
  assert.equal(resolvePriority('Low', 'Socket is sparking near the desk'), 'High');
  assert.equal(resolvePriority('Low', 'There is smoke from the AC'), 'High');
  assert.equal(resolvePriority('Medium', 'Corridor is flooded after rain'), 'High');
});

test('status can only move forward', () => {
  assert.equal(isForwardMove('Submitted', 'Assigned'), true);
  assert.equal(isForwardMove('Assigned', 'In Progress'), true);
  assert.equal(isForwardMove('Resolved', 'In Progress'), false);
  assert.equal(isForwardMove('Assigned', 'Assigned'), false);
});

test('passwords are hashed and verified', () => {
  const h = hashPassword('secret123');
  assert.notEqual(h, 'secret123');
  assert.equal(verifyPassword('secret123', h), true);
  assert.equal(verifyPassword('wrong', h), false);
});
