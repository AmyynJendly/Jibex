import { useTranslation } from 'react-i18next';

import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { confirmRunsheetReceipt, rejectNewParcels, rejectRunsheet } from '../services/api';
import type { Runsheet } from '../types';
import { promptText } from './promptText';
import { invalidateDeliveryData } from './query';
import { safely, writeErrorText } from './writeResult';

/**
 * Where a run waiting on the driver stands:
 *  - `first`   — never confirmed: "Confirm" (confirm receipt, then start)
 *  - `recount` — dispatch changed the parcels since: "Re-confirm"
 *  - `start`   — confirmed, but the run didn't start: "Start run"
 */
export type ConfirmStep = 'first' | 'recount' | 'start';

export function confirmStepOf(runsheet: Runsheet): ConfirmStep {
  if (runsheet.needsStart) return 'start';
  return runsheet.status === 'A_CONFIRMER' ? 'first' : 'recount';
}

/**
 * Confirming and refusing a run, shared by Home and Runsheets so both cards
 * behave the same. Nothing on screen changes until the server (or the mock)
 * says yes; a refusal or failure is shown and the card stays as it was.
 */
export function useRunsheetConfirm() {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  function title(runsheet: Runsheet) {
    const count = runsheet.stopCount;
    switch (confirmStepOf(runsheet)) {
      case 'start':
        return t('runsheets.confirm.startTitle', { count });
      case 'recount':
        return t('runsheets.confirm.recountTitle', { count });
      default:
        return t('runsheets.confirm.title', { count });
    }
  }

  function actionLabel(runsheet: Runsheet) {
    switch (confirmStepOf(runsheet)) {
      case 'start':
        return t('runsheets.confirm.startAction');
      case 'recount':
        return t('runsheets.confirm.recountAction');
      default:
        return t('runsheets.confirm.action');
    }
  }

  /** Nothing to refuse on a run the driver has already signed for. */
  function refuseLabel(runsheet: Runsheet): string | null {
    switch (confirmStepOf(runsheet)) {
      case 'first':
        return t('runsheets.refuse.action');
      case 'recount':
        return t('runsheets.refuse.newAction');
      default:
        return null;
    }
  }

  async function confirmReceipt(runsheet: Runsheet) {
    const step = confirmStepOf(runsheet);
    const accepted = await confirm({
      title: title(runsheet),
      message:
        step === 'start'
          ? t('runsheets.confirm.startDialogMessage')
          : t('runsheets.confirm.dialogMessage', { count: runsheet.stopCount }),
      confirmLabel: actionLabel(runsheet),
      cancelLabel: t('common.cancel'),
    });
    if (!accepted) return;

    // Never crashes on a server or network error: the failure is shown and
    // the card stays exactly as it was.
    const result = await safely(() => confirmRunsheetReceipt(runsheet.id));
    if (!result.success) {
      showToast(writeErrorText(t, result));
      // Confirmed, but not started: that did change the run — refresh so the
      // card turns into "Start run".
      if ('confirmedOnly' in result && result.confirmedOnly) await invalidateDeliveryData();
      return;
    }
    await invalidateDeliveryData();
    showToast(step === 'start' ? t('runsheets.confirm.startedToast') : t('runsheets.confirm.toast'));
  }

  async function refuse(runsheet: Runsheet) {
    const step = confirmStepOf(runsheet);
    if (step === 'start') return;
    const onlyNew = step === 'recount';
    const reason = await promptText({
      title: onlyNew ? t('runsheets.refuse.newTitle') : t('runsheets.refuse.title'),
      message: onlyNew ? t('runsheets.refuse.newMessage') : t('runsheets.refuse.message'),
      confirmLabel: t('runsheets.refuse.confirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (reason === null) return;
    if (!reason.trim()) {
      showToast(t('runsheets.refuse.reasonRequired'));
      return;
    }

    const result = await safely(() =>
      onlyNew ? rejectNewParcels(runsheet.id, reason) : rejectRunsheet(runsheet.id, reason)
    );
    if (!result.success) {
      showToast(writeErrorText(t, result));
      return;
    }
    await invalidateDeliveryData();
    showToast(onlyNew ? t('runsheets.refuse.newToast') : t('runsheets.refuse.toast'));
  }

  return { confirmReceipt, refuse, title, actionLabel, refuseLabel };
}
