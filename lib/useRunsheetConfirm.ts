import { useTranslation } from 'react-i18next';

import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { confirmRunsheetReceipt, rejectNewParcels, rejectRunsheet } from '../services/api';
import type { Runsheet } from '../types';
import { promptText } from './promptText';
import { invalidateDeliveryData } from './query';
import { runChange, runChangeText } from './runsheetDay';
import { useWrite } from './useWrite';
import { safely } from './writeResult';

/**
 * Where a run waiting on the driver stands:
 *  - `first`   — never confirmed: "Confirmer la tournée" (confirm, then start)
 *  - `recount` — the agency changed the parcels since: "Confirmer la tournée modifiée"
 *  - `start`   — confirmed, but the run didn't start: "Démarrer la tournée"
 */
export type ConfirmStep = 'first' | 'recount' | 'start';

export function confirmStepOf(runsheet: Runsheet): ConfirmStep {
  if (runsheet.needsStart) return 'start';
  return runsheet.status === 'A_CONFIRMER' ? 'first' : 'recount';
}

/**
 * Confirming and refusing a run, shared by Home and Runsheets so both cards
 * behave the same. What the driver confirms is the RUN — they accept it and
 * become responsible for it — never a count of parcels. Nothing on screen
 * changes until the server (or the mock) says yes; a refusal or failure is
 * shown and the card stays as it was.
 */
export function useRunsheetConfirm() {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  // One write at a time: a second tap on Confirm (or Refuse) sends nothing.
  const write = useWrite();

  function title(runsheet: Runsheet) {
    switch (confirmStepOf(runsheet)) {
      case 'start':
        return t('runsheets.day.startTitle');
      case 'recount':
        return t('runsheets.day.modifiedTitle');
      default:
        return t('runsheets.day.newTitle');
    }
  }

  function actionLabel(runsheet: Runsheet) {
    switch (confirmStepOf(runsheet)) {
      case 'start':
        return t('runsheets.day.start');
      case 'recount':
        return t('runsheets.day.confirmModified');
      default:
        return t('runsheets.day.confirm');
    }
  }

  /** One word, for a small button (Home). */
  function shortActionLabel(runsheet: Runsheet) {
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
    const code = runsheet.code ?? runsheet.id;
    const accepted = await confirm(
      step === 'start'
        ? {
            title: t('runsheets.day.startTitle'),
            message: t('runsheets.confirm.startDialogMessage'),
            confirmLabel: t('runsheets.day.start'),
            cancelLabel: t('common.cancel'),
          }
        : step === 'recount'
          ? {
              title: t('runsheets.day.confirmModifiedDialogTitle'),
              message: `${runChangeText(t, runChange(runsheet))} ${t('runsheets.day.modifiedAccept')}`,
              confirmLabel: t('runsheets.confirm.action'),
              cancelLabel: t('common.cancel'),
            }
          : {
              title: t('runsheets.day.confirmDialogTitle', { code }),
              message: t('runsheets.day.confirmDialogMessage', { count: runsheet.stopCount }),
              confirmLabel: t('runsheets.confirm.action'),
              cancelLabel: t('common.cancel'),
            }
    );
    if (!accepted) return;

    // Never crashes on a server or network error: the failure is shown and
    // the card stays exactly as it was.
    if (!write.begin()) return;
    const result = await safely(() => confirmRunsheetReceipt(runsheet.id));
    write.end();
    if (!result.success) {
      write.fail(result, () => confirmReceipt(runsheet));
      // Confirmed, but not started: that did change the run — refresh so the
      // card turns into "Démarrer la tournée".
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

    if (!write.begin()) return;
    const result = await safely(() =>
      onlyNew ? rejectNewParcels(runsheet.id, reason) : rejectRunsheet(runsheet.id, reason)
    );
    write.end();
    if (!result.success) {
      write.fail(result);
      return;
    }
    await invalidateDeliveryData();
    showToast(onlyNew ? t('runsheets.refuse.newToast') : t('runsheets.refuse.toast'));
  }

  return { confirmReceipt, refuse, title, actionLabel, shortActionLabel, refuseLabel, sending: write.sending };
}
