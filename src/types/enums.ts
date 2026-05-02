// Type aliases to replace Prisma enums (SQLite doesn't support native enums).
// When switching to MySQL via prisma/schema.mysql.prisma, these types still work
// because they match the enum value names exactly.

export type Role = 'manager' | 'supervisor' | 'admin';
export type PeriodStatus = 'planning' | 'active' | 'closed';
export type AllocationStatus = 'active' | 'locked' | 'closed';
export type ProposalStatus = 'draft' | 'final' | 'cancelled';
export type LpjStatus =
  | 'draft'
  | 'submitted'
  | 'supervisor_reviewed'
  | 'admin_approved'
  | 'rejected';
export type ReallocationType = 'transfer' | 'topup' | 'reversal';
export type ReallocationStatus =
  | 'draft'
  | 'submitted'
  | 'supervisor_reviewed'
  | 'admin_approved'
  | 'rejected';
export type AttachmentType = 'receipt' | 'documentation' | 'plan' | 'signature' | 'report';
export type NumberingResetPeriod = 'never' | 'year' | 'month';
