import { useEffect, useState } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import SectionHeading from '@/components/SectionHeading';
import { updateAdminSettings } from '@/features/admin/admin-api';
import { getSettings } from '@/features/home/home-api';

function buildFormState(settings: Awaited<ReturnType<typeof getSettings>>) {
  return {
    storeName: settings.storeName,
    contactEmail: settings.contactEmail ?? '',
    contactPhone: settings.contactPhone ?? '',
    contactAddress: settings.contactAddress ?? '',
    shippingFee: String(settings.shippingFee),
    supportHours: settings.supportHours ?? '',
    paymentProviderName: settings.paymentProviderName ?? '',
    paymentInstructions: settings.paymentInstructions ?? '',
  };
}

function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings } = useSuspenseQuery({ queryKey: ['settings', 'admin'], queryFn: getSettings });
  const [form, setForm] = useState(() => buildFormState(settings));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildFormState(settings));
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () =>
      updateAdminSettings({
        storeName: form.storeName.trim(),
        contactEmail: form.contactEmail.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        contactAddress: form.contactAddress.trim() || null,
        shippingFee: Number(form.shippingFee),
        supportHours: form.supportHours.trim() || null,
        paymentProviderName: form.paymentProviderName.trim() || null,
        paymentInstructions: form.paymentInstructions.trim() || null,
      }),
    onSuccess: async (saved) => {
      setErrorMessage(null);
      setFeedback(`Đã lưu cấu hình cửa hàng "${saved.storeName}".`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['settings'] }),
        queryClient.invalidateQueries({ queryKey: ['settings', 'admin'] }),
      ]);
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu cài đặt');
    },
  });

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Cài đặt"
        title="Cập nhật thông tin vận hành cửa hàng"
        description="Sau khi lưu, frontend sẽ chủ động invalidate cache để storefront và các màn checkout/account lấy lại cấu hình mới nhất."
      />
      <section className="surface-card form-panel">
        {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
        {feedback ? <p className="feedback-text feedback-text-success">{feedback}</p> : null}
        <div className="form-grid">
          <label className="field">
            <span>Tên cửa hàng</span>
            <input onChange={(event) => setForm((prev) => ({ ...prev, storeName: event.target.value }))} value={form.storeName} />
          </label>
          <label className="field">
            <span>Email liên hệ</span>
            <input onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))} type="email" value={form.contactEmail} />
          </label>
          <label className="field">
            <span>Số điện thoại</span>
            <input onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))} value={form.contactPhone} />
          </label>
          <label className="field">
            <span>Địa chỉ</span>
            <input onChange={(event) => setForm((prev) => ({ ...prev, contactAddress: event.target.value }))} value={form.contactAddress} />
          </label>
          <label className="field">
            <span>Phí giao hàng</span>
            <input min="0" onChange={(event) => setForm((prev) => ({ ...prev, shippingFee: event.target.value }))} type="number" value={form.shippingFee} />
          </label>
          <label className="field">
            <span>Giờ hỗ trợ</span>
            <input onChange={(event) => setForm((prev) => ({ ...prev, supportHours: event.target.value }))} value={form.supportHours} />
          </label>
          <label className="field">
            <span>Đối tác thanh toán</span>
            <input onChange={(event) => setForm((prev) => ({ ...prev, paymentProviderName: event.target.value }))} value={form.paymentProviderName} />
          </label>
          <label className="field field-wide">
            <span>Hướng dẫn thanh toán</span>
            <textarea onChange={(event) => setForm((prev) => ({ ...prev, paymentInstructions: event.target.value }))} rows={4} value={form.paymentInstructions} />
          </label>
        </div>
        <div className="inline-actions">
          <button className="button button-primary" disabled={mutation.isPending} onClick={() => mutation.mutate()} type="button">
            {mutation.isPending ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              setForm(buildFormState(settings));
              setFeedback(null);
              setErrorMessage(null);
            }}
            type="button"
          >
            Hoàn tác thay đổi
          </button>
        </div>
      </section>
    </div>
  );
}

export default AdminSettingsPage;
