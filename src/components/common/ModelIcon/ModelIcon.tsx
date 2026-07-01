"use client";
import classNames from "classnames";
import { FC, memo, useCallback, useState } from "react";

interface ModelIconProps {
  name: string;
  iconUrl?: string;
  size: number;
  radius?: number;
}

const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url);

const encodeApiPath = (path: string) =>
  path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const resolveIconUrl = (iconUrl: string): string => {
  if (isAbsoluteUrl(iconUrl)) return iconUrl;
  if (iconUrl.startsWith("files/")) {
    return `/api/dial/v1/${encodeApiPath(iconUrl)}`;
  }
  return `/api/themes/image/${encodeURIComponent(iconUrl)}`;
};

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
        <img
          src={resolvedUrl}
          width={size}
          height={size}
          alt={name}
          className="size-full object-cover"
          onError={handleError}
        />
      </span>
    );
  },
);

ModelIcon.displayName = "ModelIcon";

export { ModelIcon };
