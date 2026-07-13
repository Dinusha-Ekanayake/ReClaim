function statusTransitionError(currentStatus, targetStatus, { isAdmin, hasApprovedClaim }) {
  if (hasApprovedClaim && targetStatus !== 'RETURNED') {
    return {
      status: 409,
      message: 'An item with an approved claim must remain returned',
    };
  }
  if (currentStatus === targetStatus) return null;
  if (isAdmin) return null;

  if (['RETURNED', 'CLOSED', 'REJECTED'].includes(currentStatus)) {
    return {
      status: 409,
      message: 'Completed or rejected items cannot be reopened',
    };
  }
  if (currentStatus === 'CLAIM_PENDING') {
    return {
      status: 409,
      message: 'Review the pending claim before changing this item status',
    };
  }
  if (!['ACTIVE', 'MATCHED'].includes(currentStatus) || !['RETURNED', 'CLOSED'].includes(targetStatus)) {
    return {
      status: 403,
      message: 'This status can only be set by the claim, matching, or moderation workflow',
    };
  }
  return null;
}

module.exports = { statusTransitionError };
