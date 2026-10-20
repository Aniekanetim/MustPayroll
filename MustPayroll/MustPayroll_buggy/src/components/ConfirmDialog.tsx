import { useEffect, useRef } from 'react';

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }: {
  open: boolean; title: string; description: string; confirmLabel: string; cancelLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  return <dialog ref={dialog} className="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-description"
    onCancel={event => { event.preventDefault(); onCancel(); }}>
    <h2 id="confirm-title">{title}</h2><p id="confirm-description">{description}</p>
    <div className="form-actions"><button className="btn-secondary" onClick={onCancel} autoFocus>{cancelLabel}</button>
      <button className={`btn-primary${danger ? ' btn-danger' : ''}`} onClick={onConfirm}>{confirmLabel}</button></div>
  </dialog>;
}
