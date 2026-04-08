import { useState } from 'react';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';

import SectionHeading from '@/components/SectionHeading';
import { useAuth } from '@/features/auth/AuthContext';
import { getSettings } from '@/features/home/home-api';
import { createContact } from '@/features/support/support-api';
import { ApiError } from '@/lib/api-client';

function IconClock() {
  return (
    <svg aria-hidden fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg aria-hidden fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 7h16v10H4V7z" strokeLinejoin="round" />
      <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg aria-hidden fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
      <path
        d="M6.5 4.5h3l1.5 4.5-2 1.5a12 12 0 006 6l1.5-2 4.5 1.5v3a2 2 0 01-2.2 2 17 17 0 01-15.3-15.3 2 2 0 012-2.2z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMap() {
  return (
    <svg aria-hidden fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

const supportIcons = [<IconClock key="c" />, <IconMail key="m" />, <IconPhone key="p" />, <IconMap key="map" />];

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
    <section className="support-page">
      <div className="support-layout">
        <article className="support-info-panel">
          <SectionHeading
            eyebrow="Hỗ trợ khách hàng"
            title="Kết nối với cửa hàng theo cách nhanh gọn và rõ ràng"
            description="Chọn kênh liên hệ phù hợp để được hỗ trợ về đơn hàng, thanh toán hoặc thông tin giao nhận."
          />

          <div className="support-detail-list">
            {supportDetails.map((item, index) => (
              <article key={item.label} className="support-detail-card">
                <div className="support-detail-icon">{supportIcons[index]}</div>
                <div className="support-detail-body">
                  <p className="support-detail-label">{item.label}</p>
                  <p className="support-detail-value">{item.value}</p>
                  <p className="support-detail-desc">{item.description}</p>
                </div>
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

          <div className="support-form-grid form-grid">
            <label className="field">
              <span>Họ tên</span>
              <input autoComplete="name" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} />
            </label>
            <label className="field">
              <span>Email</span>
              <input autoComplete="email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label className="field">
              <span>Số điện thoại</span>
              <input autoComplete="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
            <label className="field">
              <span>Chủ đề</span>
              <input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
            </label>
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

          <div className="support-form-actions">
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
          </div>
        </article>
      </div>
    </section>
  );
}

export default SupportPage;
