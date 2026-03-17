import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { ApiError } from '@/lib/api-client';
import { createContact } from '@/features/support/support-api';

function SupportPage() {
  const [form, setForm] = useState({
    customerName: 'Frontend Demo Customer',
    email: 'customer@bookstore.com',
    phone: '0901000003',
    subject: 'Question about shipping windows',
    content: 'I want to confirm how fast the current local API-first setup can support a checkout experience.',
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const contactMutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      setSuccessMessage('Support request sent successfully. The admin/staff contact queue can now surface it.');
    },
  });

  return (
    <section className="two-column-grid">
      <article className="hero-panel hero-panel-tight">
        <p className="eyebrow">Public contact flow</p>
        <h1>Exercise the support pipeline before the final UI exists.</h1>
        <p>
          This page is intentionally practical: it helps validate public form submission, admin contact management,
          and the data model that the final frontend will rely on later.
        </p>
      </article>

      <article className="form-panel">
        <label className="field">
          <span>Name</span>
          <input value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} />
        </label>
        <label className="field">
          <span>Email</span>
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label className="field">
          <span>Phone</span>
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </label>
        <label className="field">
          <span>Subject</span>
          <input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
        </label>
        <label className="field">
          <span>Message</span>
          <textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} rows={6} />
        </label>

        {contactMutation.isError ? (
          <p className="feedback-text feedback-text-error">
            {contactMutation.error instanceof ApiError ? contactMutation.error.message : 'Unable to submit request'}
          </p>
        ) : null}
        {successMessage ? <p className="feedback-text feedback-text-success">{successMessage}</p> : null}

        <button className="button button-primary" onClick={() => contactMutation.mutate(form)} type="button">
          {contactMutation.isPending ? 'Submitting...' : 'Send message'}
        </button>
      </article>
    </section>
  );
}

export default SupportPage;
