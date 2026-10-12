import { DeploymentIcon, ItemHeader } from '@epam/ai-dial-chat-shared';
import {
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  ElementSize,
  GhostIconButton,
} from '@epam/ai-dial-ui-kit';
import { IconTrash } from '@tabler/icons-react';
import { FC, ReactNode, useId } from 'react';

const AVATAR_SIZE = 36;

export interface AddOnListItemProps {
  id: string;
  name: string;
  version?: string;
  /** Already-resolved icon URL; the avatar falls back to the name's initials. */
  iconUrl?: string;
  /** A status line under the name, e.g. "Logged out toolset." */
  statusText?: string;
  /** Overlaid on the avatar, e.g. the logged-out credentials badge. */
  badge?: ReactNode;
  /** Accessible name of the details button, e.g. "Figma details". */
  detailsLabel: string;
  /** Accessible name of the remove button, e.g. "Remove Figma". */
  removeLabel: string;
  onClick: (id: string) => void;
  /** Omitted in a read-only app, which hides the remove button. */
  onRemove?: (id: string) => void;
}

/**
 * One attached add-on (skill, toolset or agent) in an Add-ons row: the same
 * avatar + name + version as the catalog list's Name cell, so the row and the
 * picker read alike, plus a trash button revealed on hover or focus. The
 * details control is a native button because the kit has no clickable list
 * item that holds this content (its `Tag` is a single-line pill); the trash
 * button sits beside it, since buttons cannot nest.
 */
export const AddOnListItem: FC<AddOnListItemProps> = ({
  id,
  name,
  version,
  iconUrl,
  statusText,
  badge,
  detailsLabel,
  removeLabel,
  onClick,
  onRemove,
}) => {
  const statusId = useId();

  return (
    <div className="group flex min-w-0 items-center gap-1 rounded-[10px] pe-1 hover:bg-control-accent-alpha">
      {/* A native button, not a kit one: the kit's buttons take only a label and icons, and
          this whole row (avatar, name, version, status) is the control that opens details. */}
      <button
        type="button"
        aria-label={detailsLabel}
        aria-describedby={statusText ? statusId : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] py-1 text-start outline-none focus-visible:outline focus-visible:outline-accent-focus"
        onClick={() => onClick(id)}
      >
        {/* Hidden as a whole: the button's own label names the item, and a
            badge's meaning is announced through the status line instead. */}
        <span aria-hidden="true" className="relative shrink-0">
          <DeploymentIcon
            size={AVATAR_SIZE}
            src={iconUrl}
            initialsName={name}
            styles={{ badgeClassName: 'rounded-[10px]' }}
          />
          {badge}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <ItemHeader
            title={name}
            postfix={version}
            titleClassName="dial-small-semi-text text-primary"
            postfixClassName="dial-tiny-text text-secondary"
            className="min-w-0 items-baseline gap-1.5"
          />
          {statusText && (
            <span id={statusId} className="dial-tiny-text truncate text-secondary">
              {statusText}
            </span>
          )}
        </span>
      </button>
      {onRemove && (
        // Hidden with opacity, not `hidden`, so it stays in the tab order.
        <GhostIconButton
          size={ElementSize.Small}
          icon={<IconTrash size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />}
          aria-label={removeLabel}
          className="shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
          onClick={() => onRemove(id)}
        />
      )}
    </div>
  );
};
