"use client";

import {
  getStreamingService,
  type StreamingServiceId,
} from "@/lib/streaming";

export function ServiceBadge({
  serviceId,
  size = "sm",
}: {
  serviceId: StreamingServiceId | null | undefined;
  size?: "sm" | "md";
}) {
  const service = getStreamingService(serviceId);
  if (!service) return null;
  return (
    <span
      className={`inline-flex items-center rounded-md font-semibold text-ink ${
        size === "md" ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]"
      }`}
      style={{ background: `hsl(${service.hue} 70% 62%)` }}
      title={`Watching on ${service.name} (social badge only)`}
    >
      {service.shortName}
    </span>
  );
}
