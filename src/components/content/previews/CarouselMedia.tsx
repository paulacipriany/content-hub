import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAspectClass } from './previewUtils';

interface CarouselMediaProps {
  urls: string[];
  platform: string;
  contentType?: string;
  poster?: string | null;
}

const CarouselMedia = ({ urls, platform, contentType, poster }: CarouselMediaProps) => {
  const [current, setCurrent] = useState(0);
  const aspectClass = getAspectClass(platform, contentType);

  return (
    <div className="relative group">
      {urls[current].match(/\.(mp4|webm|mov)$/i) ? (
        <video 
          src={urls[current]} 
          controls 
          poster={poster || undefined}
          className={cn("w-full object-cover", aspectClass)} 
        />
      ) : (
        <div className={cn("w-full overflow-hidden", aspectClass)}>
          <img src={urls[current]} alt={`Slide ${current + 1}`} className="w-full h-full object-cover" />
        </div>
      )}
      {urls.length > 1 && (
        <>
          {current > 0 && (
            <button
              onClick={() => setCurrent(c => c - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={14} />
            </button>
          )}
          {current < urls.length - 1 && (
            <button
              onClick={() => setCurrent(c => c + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={14} />
            </button>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {urls.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  i === current ? "bg-white" : "bg-white/40"
                )}
              />
            ))}
          </div>
          <span className="absolute top-2 right-2 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded-full">
            {current + 1}/{urls.length}
          </span>
        </>
      )}
    </div>
  );
};

export default CarouselMedia;
