"use client";
import classNames from "classnames";
import Image from "next/image";
import { FC, memo, useCallback, useState } from "react";
import { resolveIconUrl } from "@/utils/resolve-icon-url";

interface ModelIconProps {
  name: string;
  iconUrl?: string;
  size: number;
  radius?: number;
}

const ModelIcon: FC<ModelIconProps> = memo(
  ({ name, iconUrl, size, radius = 8 }) => {
    const [hasError, setHasError] = useState(false);

    const handleError = useCallback(() => setHasError(true), []);

    const resolvedUrl = iconUrl && !hasError ? resolveIconUrl(iconUrl) : null;

    if (!resolvedUrl) {
      return (
        <div
          className="flex shrink-0 items-center justify-center bg-layer-4 font-semibold text-secondary"
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            fontSize: Math.round(size * 0.4),
          }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      );
    }

    return (
      <span
        className={classNames(
          "relative shrink-0 overflow-hidden",
          "flex items-center justify-center",
        )}
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <Image
          src={resolvedUrl}
          width={size}
          height={size}
          alt={name}
          className="size-full object-cover"
          onError={handleError}
          unoptimized
        />
      </span>
    );
  },
);

ModelIcon.displayName = "ModelIcon";

export { ModelIcon };
