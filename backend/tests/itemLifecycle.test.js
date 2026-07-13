const { statusTransitionError } = require('../src/services/itemLifecycleService');

const ownerOptions = { isAdmin: false, hasApprovedClaim: false };

describe('item lifecycle invariants', () => {
  test.each([
    ['ACTIVE', 'RETURNED'],
    ['ACTIVE', 'CLOSED'],
    ['MATCHED', 'RETURNED'],
    ['MATCHED', 'CLOSED'],
  ])('allows an owner transition from %s to %s', (currentStatus, targetStatus) => {
    expect(statusTransitionError(currentStatus, targetStatus, ownerOptions)).toBeNull();
  });

  test.each(['RETURNED', 'CLOSED', 'REJECTED'])('does not let an owner reopen %s items', (currentStatus) => {
    expect(statusTransitionError(currentStatus, 'ACTIVE', ownerOptions)).toMatchObject({ status: 409 });
  });

  test('requires pending claims to be resolved through the claim workflow', () => {
    expect(statusTransitionError('CLAIM_PENDING', 'CLOSED', ownerOptions)).toMatchObject({ status: 409 });
  });

  test('does not allow generic owner transitions into workflow-only states', () => {
    expect(statusTransitionError('ACTIVE', 'CLAIM_PENDING', ownerOptions)).toMatchObject({ status: 403 });
  });

  test('locks an approved-claim item in RETURNED even for administrators', () => {
    expect(statusTransitionError('RETURNED', 'ACTIVE', {
      isAdmin: true,
      hasApprovedClaim: true,
    })).toMatchObject({ status: 409 });
  });

  test('repairs rather than accepting an inconsistent approved-claim state', () => {
    expect(statusTransitionError('ACTIVE', 'ACTIVE', {
      isAdmin: true,
      hasApprovedClaim: true,
    })).toMatchObject({ status: 409 });
    expect(statusTransitionError('ACTIVE', 'RETURNED', {
      isAdmin: true,
      hasApprovedClaim: true,
    })).toBeNull();
  });

  test('allows idempotent status requests without reopening an item', () => {
    expect(statusTransitionError('RETURNED', 'RETURNED', {
      isAdmin: false,
      hasApprovedClaim: true,
    })).toBeNull();
  });
});
