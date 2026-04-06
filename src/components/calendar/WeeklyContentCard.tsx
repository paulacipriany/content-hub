import { ContentWithRelations, STATUS_LABELS, CONTENT_TYPE_LABELS, WorkflowStatus, ContentType } from '@/data/types';
import { platformIcon } from '@/components/content/PlatformIcons';
import { cn } from '@/lib/utils';
import { useDraggable } from '@dnd-kit/core';

const STATUS_DOT_COLOR: Record<string, string> = {
  'published': 'bg-green-500',
  'scheduled': 'bg-blue-500',
  'programmed': 'bg-blue-500',
  'approval-client': 'bg-amber-500',
  'review': 'bg-yellow-500',
  'production': 'bg-orange-500',
  'idea': 'bg-gray-400',
  'idea-bank': 'bg-gray-400',
  'client-request': 'bg-purple-500',
};

interface Props {
  content: ContentWithRelations;
  onClick: () => void;
  disabled?: boolean;
  hideProjectName?: boolean;
}

const WeeklyContentCard = ({ content, onClick, disabled, hideProjectName }: Props) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: content.id,
    data: { type: 'content', content },
    disabled,
  });

  const platforms: string[] = Array.isArray(content.platform) ? content.platform : [content.platform];
  const firstPlatform = platforms[0];
  const contentTypeLabel = CONTENT_TYPE_LABELS[content.content_type as ContentType] || content.content_type;
  const statusLabel = STATUS_LABELS[content.status as WorkflowStatus];
  const dotColor = STATUS_DOT_COLOR[content.status] ?? 'bg-gray-400';

  const projectName = content.project?.name ?? '';
  const projectLogo = content.project?.logo_url;

  const mediaUrls = content.media_urls && content.media_urls.length > 0 ? content.media_urls : content.media_url ? [content.media_url] : [];
  const thumbnailUrl = (content as any).thumbnail_url;
  const firstMedia = mediaUrls[0] ?? '';
  const isVideo = /\.(mp4|webm|mov)$/i.test(firstMedia);
  const previewSrc = isVideo ? thumbnailUrl : firstMedia;
  const hasMedia = previewSrc || (mediaUrls.length > 0 && !isVideo);
  const copyText = content.copy_text;
  const hasCopy = copyText && copyText.trim().length > 0;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "w-full bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden",
        "hover:shadow-md transition-all",
        disabled ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30"
      )}
    >
      {/* Header: platform icon + type + source name */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        <span className="shrink-0">{platformIcon([firstPlatform] as any, 14)}</span>
        <span className="text-xs font-semibold text-foreground">{contentTypeLabel}</span>
        {!hideProjectName && projectName && (
          <span className="text-[11px] text-muted-foreground truncate ml-auto">
            {projectName}
          </span>
        )}
      </div>

      {/* Media thumbnails or copy text */}
      {hasMedia ? (
        <div className="relative px-2 pb-1.5">
          <div className="relative rounded-lg overflow-hidden">
            {isVideo && !previewSrc ? (
              <video src={firstMedia} className="w-full aspect-square object-cover rounded-lg" muted />
            ) : (
              <img
                src={previewSrc || firstMedia}
                alt=""
                className="w-full aspect-square object-cover rounded-lg"
              />
            )}
            {content.publish_time && (
              <span className="absolute bottom-1.5 left-1.5 bg-card/90 backdrop-blur-sm text-[10px] font-medium text-foreground px-1.5 py-0.5 rounded">
                {content.publish_time.slice(0, 5)}
              </span>
            )}
          </div>
        </div>
      ) : hasCopy ? (
        <div className="px-2.5 pb-1.5">
          <div className="bg-muted/30 rounded-lg p-2 relative">
            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-3">
              <span className="text-primary font-bold text-sm mr-0.5">❝</span>
              {copyText}
            </p>
            {content.publish_time && (
              <span className="text-[10px] text-muted-foreground mt-1 block">
                {content.publish_time.slice(0, 5)}
              </span>
            )}
          </div>
        </div>
      ) : (
        content.publish_time && (
          <div className="px-2.5 pb-1">
            <span className="text-[10px] text-muted-foreground">
              {content.publish_time.slice(0, 5)}
            </span>
          </div>
        )
      )}

      {/* Status badge */}
      <div className="px-2.5 pb-2 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
          <span className="text-[11px] font-medium text-foreground">{statusLabel}</span>
        </div>
      </div>
    </div>
  );
};

export default WeeklyContentCard;
