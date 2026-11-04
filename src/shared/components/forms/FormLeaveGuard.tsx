import React, { useContext } from 'react';
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom';
import LeaveFormDialog from './LeaveFormDialog';

interface FormLeaveGuardProps {
  /** The form holds unsent data */
  dirty: boolean;
  /**
   * Read at the moment of leaving: true lets the navigation through without
   * asking (the form was just sent, or it moves on to its own next page).
   * A ref, because sending and navigating happen before the next render.
   */
  bypassRef?: React.RefObject<boolean>;
  /** Throw the draft away; called just before leaving with "Discard" */
  onDiscard: () => void;
}

/** Leaving to another page shows the dialog; changing only the query (a tab, a filter) does not. */
export const shouldAskBeforeLeaving = (
  dirty: boolean,
  bypass: boolean,
  currentPathname: string,
  nextPathname: string,
): boolean => dirty && !bypass && currentPathname !== nextPathname;

const Blocker: React.FC<FormLeaveGuardProps> = ({ dirty, bypassRef, onDiscard }) => {
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    shouldAskBeforeLeaving(dirty, !!bypassRef?.current, currentLocation.pathname, nextLocation.pathname),
  );
  const blocked = blocker.state === 'blocked';

  return (
    <LeaveFormDialog
      open={blocked}
      onStay={() => blocker.reset?.()}
      onKeepDraft={() => blocker.proceed?.()}
      onDiscard={() => {
        onDiscard();
        blocker.proceed?.();
      }}
    />
  );
};

/**
 * Asks "Leave this form?" when someone presses back, taps a link or the form's
 * own back arrow while it holds unsent data. Closing the app or the tab needs
 * no prompt: the draft is already saved on this device.
 * A no-op outside a data router (e.g. in tests), where blocking is unavailable.
 */
const FormLeaveGuard: React.FC<FormLeaveGuardProps> = props => {
  const dataRouter = useContext(UNSAFE_DataRouterContext);
  return dataRouter ? <Blocker {...props} /> : null;
};

export default FormLeaveGuard;
