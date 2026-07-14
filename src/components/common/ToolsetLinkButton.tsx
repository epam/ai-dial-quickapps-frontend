'use client';

import { IconCopy, IconCheck } from '@tabler/icons-react';
import React, { FC, useCallback, useState } from 'react';

import { encodeApiUrl } from '@/utils/api';

interface ToolsetLinkButtonProps {
  entityId?: string;
  entityType?: string;
  dialCoreExternalUrl?: string;
}

const getMcpUrl = (entityId: string, entityType: string | undefined, dialCoreExternalUrl: string): string => {
  const encodedId = encodeApiUrl(entityId);
  if (entityType === 'application') {
    return `${dialCoreExternalUrl}/v1/deployments/${encodedId}/mcp`;
  }
  return `${dialCoreExternalUrl}/v1/toolset/${encodedId}/mcp`;
};

export const ToolsetLinkButton: FC<ToolsetLinkButtonProps> = ({
  entityId,
  entityType,
  dialCoreExternalUrl,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!entityId || !dialCoreExternalUrl) return;
    const url = getMcpUrl(entityId, entityType, dialCoreExternalUrl);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [entityId, entityType, dialCoreExternalUrl]);

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
