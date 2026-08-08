import type { QueryClient } from '@tanstack/react-query';

/** Invalidate all caches affected by expense mutations. */
export async function invalidateExpenseQueries(
  qc: QueryClient,
  groupId: number | null | undefined,
  expenseId?: number,
) {
  const tasks: Promise<unknown>[] = [
    qc.invalidateQueries({ queryKey: ['summary'] }),
    qc.invalidateQueries({ queryKey: ['activity'] }),
  ];

  if (groupId != null && Number.isFinite(groupId)) {
    tasks.push(
      qc.invalidateQueries({ queryKey: ['expenses', groupId] }),
      qc.invalidateQueries({ queryKey: ['balances', groupId] }),
      qc.invalidateQueries({ queryKey: ['settlement', groupId] }),
      qc.invalidateQueries({ queryKey: ['group-activity', groupId] }),
      qc.invalidateQueries({ queryKey: ['group', groupId] }),
    );
  }

  if (expenseId != null) {
    tasks.push(qc.invalidateQueries({ queryKey: ['expense', expenseId] }));
  }

  await Promise.all(tasks);
}
