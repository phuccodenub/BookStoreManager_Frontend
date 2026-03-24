import { useState } from 'react';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';

import SectionHeading from '@/components/SectionHeading';
import { useAuth } from '@/features/auth/AuthContext';
import { getSettings } from '@/features/home/home-api';
import { createContact } from '@/features/support/support-api';
import { ApiError } from '@/lib/api-client';

function SupportPage() {
  const { session } = useAuth();
  const { data: settings } = useSuspenseQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });
  const [form, setForm] = useState({
    customerName: session?.user.fullName ?? '',
    email: session?.user.email ?? '',
    phone: session?.user.phone ?? '',
    subject: '',
    content: '',
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isFormValid = Boolean(form.customerName.trim() && form.email.trim() && form.subject.trim() && form.content.trim());

  const contactMutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      setSuccessMessage('Yêu cầu hỗ trợ đã được gửi. Cửa hàng sẽ phản hồi bạn trong thời gian sớm nhất.');
      setForm((current) => ({ ...current, subject: '', content: '' }));
    },
  });

  const supportDetails = [
    {
      label: 'Khung giờ hỗ trợ',
      value: settings.supportHours ?? 'Mỗi ngày',
      description: 'Cửa hàng tiếp nhận yêu cầu theo khung giờ hiển thị tại đây.',
    },
    {
      label: 'Email liên hệ',
      value: settings.contactEmail ?? 'support@bookstore.local',
      description: 'Dùng khi bạn cần trao đổi về đơn hàng, thanh toán hoặc giao nhận.',
    },
    {
      label: 'Số điện thoại',
      value: settings.contactPhone ?? 'Đang cập nhật',
      description: 'Phù hợp cho những trường hợp cần xác nhận nhanh trước khi giao hàng.',
    },
    {
      label: 'Địa chỉ cửa hàng',
      value: settings.contactAddress ?? 'TP. Hồ Chí Minh',
      description: 'Thông tin này giúp bạn dễ dàng đối chiếu với cửa hàng hoặc điểm nhận hàng.',
    },
  ];

  return (
    <section className="support-layout">
      <article className="support-info-panel">
        <SectionHeading
          eyebrow="Hỗ trợ khách hàng"
          title="Kết nối với cửa hàng theo cách nhanh gọn và rõ ràng"
          description="Chọn kênh liên hệ phù hợp để được hỗ trợ về đơn hàng, thanh toán hoặc thông tin giao nhận."
        />

        <div className="support-detail-list">
          {supportDetails.map((item) => (
            <article key={item.label} className="support-detail-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </article>

      <article className="support-form-panel">
        <SectionHeading
          eyebrow="Gửi yêu cầu"
          title="Mô tả vấn đề của bạn ngắn gọn và rõ ràng"
          description="Cửa hàng sẽ dựa trên thông tin này để phản hồi bạn nhanh và chính xác hơn."
        />

        <div className="form-grid">
          <label className="field"><span>Họ tên</span><input value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} /></label>
          <label className="field"><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label className="field"><span>Số điện thoại</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label className="field"><span>Chủ đề</span><input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label>
          <label className="field field-wide">
            <span>Nội dung</span>
            <textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} rows={6} />
          </label>
        </div>

        {contactMutation.isError ? (
          <p className="feedback-text feedback-text-error">
            {contactMutation.error instanceof ApiError ? contactMutation.error.message : 'Không thể gửi yêu cầu hỗ trợ'}
          </p>
        ) : null}
        {successMessage ? <p className="feedback-text feedback-text-success">{successMessage}</p> : null}

        <button
          className="button button-primary"
          disabled={!isFormValid || contactMutation.isPending}
          onClick={() => {
            setSuccessMessage(null);
            contactMutation.mutate({
              customerName: form.customerName.trim(),
              email: form.email.trim(),
              phone: form.phone.trim() || undefined,
              subject: form.subject.trim(),
              content: form.content.trim(),
            });
          }}
          type="button"
        >
          {contactMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </button>
      </article>
    </section>
  );
}

export default SupportPage;
