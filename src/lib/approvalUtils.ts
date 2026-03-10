import { supabase } from '@/integrations/supabase/client';

/**
 * Records an approval for a content and checks if all assigned approvers have approved.
 * Returns true if the content should advance to the next status (all approved).
 */
export async function recordApproval(contentId: string, userId: string): Promise<{ allApproved: boolean; error?: string }> {
  // Insert approval record
  const { error: insertError } = await supabase.from('approvals').insert({
    content_id: contentId,
    reviewer_id: userId,
    decision: 'approved',
  });

  if (insertError) {
    // Check if it's a duplicate
    if (insertError.code === '23505') {
      return { allApproved: false, error: 'Você já aprovou este conteúdo.' };
    }
    return { allApproved: false, error: insertError.message };
  }

  // Fetch assigned approvers
  const { data: assignedApprovers } = await supabase
    .from('content_approvers' as any)
    .select('user_id')
    .eq('content_id', contentId);

  // If no approvers assigned, approve immediately
  if (!assignedApprovers || assignedApprovers.length === 0) {
    return { allApproved: true };
  }

  // Fetch existing approvals for this content
  const { data: existingApprovals } = await supabase
    .from('approvals')
    .select('reviewer_id')
    .eq('content_id', contentId)
    .eq('decision', 'approved');

  const approvedIds = new Set((existingApprovals ?? []).map((a: any) => a.reviewer_id));
  const allApproved = (assignedApprovers as any[]).every((a: any) => approvedIds.has(a.user_id));

  return { allApproved };
}
