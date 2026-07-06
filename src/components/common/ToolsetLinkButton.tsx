'use client';

import { IconCopy, IconCheck } from '@tabler/icons-react';
import React, { FC, useCallback, useState } from 'react';

import { encodeApiUrl } from '@/utils/api';
import { isApplicationId } from '@/utils/api';

interface ToolsetLinkButtonProps {
  entityId?: string;
  dialCoreExternalUrl?: string;
}

const getMcpUrl = (
  entityId: string,
  dialCoreExternalUrl: string,
): string => {
  const encodedId = encodeApiUrl(entityId);
  if (isApplicationId(entityId)) {
    return `${dialCoreExternalUrl}/v1/deployments/${encodedId}/mcp`;
  }
  return `${dialCoreExternalUrl}/v1/toolset/${encodedId}/mcp`;
};

export const ToolsetLinkButton: FC<ToolsetLinkButtonProps> = ({
  entityId,
  dialCoreExternalUrl,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!entityId || !dialCoreExternalUrl) return;
    const url = getMcpUrl(entityId, dialCoreExternalUrl);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [entityId, dialCoreExternalUrl]);

  if (!dialCoreExternalUrl || !entityId) return null;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="dial-tiny-text flex items-center gap-1 text-secondary hover:text-primary"
      title="Copy MCP URL"
    >
      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
      {copied ? 'Copied' : 'Copy URL'}
    </button>
  );
};
