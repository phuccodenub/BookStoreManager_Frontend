import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import {
  deleteAdminContact,
  getAdminContactById,
  getAdminContacts,
  getAdminUsers,
  updateContact,
} from '@/features/admin/admin-api';
import { getContactStatusLabel, getContactStatusTone } from '@/features/admin/admin-presentation';
import { useAuth } from '@/features/auth/AuthContext';
import { formatDate } from '@/lib/format';
import type { ContactStatus } from '@/lib/types';

interface ContactFormState {
  status: ContactStatus;
  note: string;
  assignedTo: string;
}

function createInitialForm(): ContactFormState {
  return {
    status: 'new',
    note: '',
    assignedTo: '',
  };
}

function AdminContactsPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const isAdmin = session?.user.role === 'admin';
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContactStatus>('all');
  const [page, setPage] = useState(1);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactFormState>(createInitialForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: contactList } = useSuspenseQuery({
    queryKey: ['admin', 'contacts', 'full', page, search, statusFilter],
    queryFn: () =>
      getAdminContacts({
        page,
        limit: 12,
        search,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

  const contacts = contactList.items;
  const meta = contactList.meta;

  useEffect(() => {
    if (contacts.length === 0) {
      setSelectedContactId(null);
      return;
    }

    if (!selectedContactId || !contacts.some((contact) => contact.id === selectedContactId)) {
      setSelectedContactId(contacts[0].id);
    }
  }, [contacts, selectedContactId]);

  const selectedContactQuery = useQuery({
    queryKey: ['admin', 'contacts', 'detail', selectedContactId],
    queryFn: () => getAdminContactById(selectedContactId ?? ''),
    enabled: Boolean(selectedContactId),
  });

  const staffUsersQuery = useQuery({
    queryKey: ['admin', 'users', 'staff-options'],
    queryFn: () => getAdminUsers({ role: 'staff', limit: 100 }),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!selectedContactQuery.data) {
      return;
    }

    setForm({
      status: selectedContactQuery.data.status,
      note: selectedContactQuery.data.note ?? '',
      assignedTo: selectedContactQuery.data.assignedTo ?? '',
    });
  }, [selectedContactQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateContact(selectedContactId ?? '', {
        status: form.status,
        note: form.note.trim() ? form.note.trim() : null,
        assignedTo: isAdmin ? form.assignedTo || null : undefined,
      }),
    onSuccess: async (updated) => {
      setErrorMessage(null);
      setFeedback(`Đã cập nhật yêu cầu "${updated.subject}" sang trạng thái ${getContactStatusLabel(updated.status)}.`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'contacts'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật yêu cầu hỗ trợ');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (contactId: string) => deleteAdminContact(contactId),
    onSuccess: async () => {
      setErrorMessage(null);
      setFeedback('Đã xóa yêu cầu hỗ trợ khỏi hệ thống.');
      setSelectedContactId(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'contacts'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa yêu cầu hỗ trợ');
    },
  });

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Liên hệ"
        title="Quản trị yêu cầu hỗ trợ với filter, ghi chú và phân công xử lý"
        description="Trang này đã được nâng từ danh sách rất ngắn sang màn hỗ trợ nội bộ thực thụ: lọc, phân trang, xem chi tiết nội dung, cập nhật ghi chú và xóa khi cần."
      />

      <section className="surface-card admin-manager-toolbar">
        <form className="inline-actions" onSubmit={handleSearchSubmit}>
          <label className="field admin-manager-search">
            <span>Tìm yêu cầu</span>
            <input
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tên khách, email, chủ đề"
              value={searchInput}
            />
          </label>
          <label className="field">
            <span>Trạng thái</span>
            <select onChange={(event) => setStatusFilter(event.target.value as 'all' | ContactStatus)} value={statusFilter}>
              <option value="all">Tất cả</option>
              <option value="new">Mới tiếp nhận</option>
              <option value="in_progress">Đang xử lý</option>
              <option value="resolved">Đã phản hồi</option>
            </select>
          </label>
          <button className="button button-secondary" type="submit">
            Lọc
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setStatusFilter('all');
              setPage(1);
            }}
            type="button"
          >
            Bỏ lọc
          </button>
        </form>
      </section>

      {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
      {feedback ? <p className="feedback-text feedback-text-success">{feedback}</p> : null}

      {contacts.length === 0 ? (
        <EmptyState title="Không có yêu cầu phù hợp" description="Thử nới điều kiện lọc hoặc chờ khách hàng gửi yêu cầu mới." />
      ) : (
        <section className="two-column-grid two-column-grid-wide">
          <article className="surface-card">
            <SectionHeading
              eyebrow="Danh sách"
              title="Các yêu cầu hỗ trợ"
              description={meta ? `Trang ${meta.page}/${meta.totalPages} • ${meta.total} yêu cầu` : 'Danh sách yêu cầu trả về từ backend'}
            />
            <div className="list-stack compact-list">
              {contacts.map((contact) => (
                <article className="contact-card" key={contact.id}>
                  <div className="order-card-header">
                    <div>
                      <strong>{contact.subject}</strong>
                      <p>{contact.customerName} • {contact.email}</p>
                    </div>
                    <span className={`status-chip status-chip-${getContactStatusTone(contact.status)}`}>{getContactStatusLabel(contact.status)}</span>
                  </div>
                  <p>{contact.content}</p>
                  <div className="inline-actions">
                    <button className="button button-secondary" onClick={() => setSelectedContactId(contact.id)} type="button">
                      {selectedContactId === contact.id ? 'Đang xem' : 'Chi tiết'}
                    </button>
                    {contact.assignedStaff ? <span>Người xử lý: {contact.assignedStaff.fullName}</span> : <span>Chưa phân công</span>}
                  </div>
                </article>
              ))}
            </div>
            {meta ? (
              <div className="inline-actions">
                <button className="button button-secondary" disabled={meta.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">
                  Trang trước
                </button>
                <span>Trang {meta.page} / {meta.totalPages}</span>
                <button className="button button-secondary" disabled={meta.page >= meta.totalPages} onClick={() => setPage((current) => current + 1)} type="button">
                  Trang sau
                </button>
              </div>
            ) : null}
          </article>

          <article className="surface-card">
            <SectionHeading
              eyebrow="Chi tiết"
              title="Nội dung yêu cầu và thao tác nội bộ"
              description={isAdmin ? 'Admin có thể cập nhật, phân công và xóa yêu cầu.' : 'Staff có thể cập nhật trạng thái và ghi chú xử lý.'}
            />
            {selectedContactQuery.isLoading ? <p>Đang tải chi tiết yêu cầu...</p> : null}
            {selectedContactQuery.error ? (
              <p className="feedback-text feedback-text-error">
                {selectedContactQuery.error instanceof Error ? selectedContactQuery.error.message : 'Không thể tải chi tiết yêu cầu'}
              </p>
            ) : null}
            {selectedContactQuery.data ? (
              <div className="page-stack">
                <div className="order-card-header">
                  <div>
                    <strong>{selectedContactQuery.data.subject}</strong>
                    <p>{selectedContactQuery.data.customerName} • {selectedContactQuery.data.email}</p>
                  </div>
                  <span className={`status-chip status-chip-${getContactStatusTone(selectedContactQuery.data.status)}`}>
                    {getContactStatusLabel(selectedContactQuery.data.status)}
                  </span>
                </div>

                <div className="details-grid">
                  <div>
                    <span>Điện thoại</span>
                    <strong>{selectedContactQuery.data.phone?.trim() || 'Chưa có'}</strong>
                  </div>
                  <div>
                    <span>Thời điểm tạo</span>
                    <strong>{selectedContactQuery.data.createdAt ? formatDate(selectedContactQuery.data.createdAt) : 'Vừa tiếp nhận'}</strong>
                  </div>
                  <div>
                    <span>Người xử lý</span>
                    <strong>{selectedContactQuery.data.assignedStaff?.fullName ?? 'Chưa phân công'}</strong>
                  </div>
                  <div>
                    <span>Cập nhật gần nhất</span>
                    <strong>{selectedContactQuery.data.updatedAt ? formatDate(selectedContactQuery.data.updatedAt) : 'Chưa cập nhật'}</strong>
                  </div>
                </div>

                <div className="reason-callout">
                  <span>Nội dung khách hàng gửi</span>
                  <strong>{selectedContactQuery.data.content}</strong>
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span>Trạng thái xử lý</span>
                    <select onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ContactStatus }))} value={form.status}>
                      <option value="new">Mới tiếp nhận</option>
                      <option value="in_progress">Đang xử lý</option>
                      <option value="resolved">Đã phản hồi</option>
                    </select>
                  </label>

                  {isAdmin ? (
                    <label className="field">
                      <span>Phân công staff</span>
                      <select onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))} value={form.assignedTo}>
                        <option value="">Chưa phân công</option>
                        {(staffUsersQuery.data?.items ?? []).map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <label className="field field-wide">
                    <span>Ghi chú nội bộ</span>
                    <textarea
                      onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                      placeholder="Nhập ghi chú để đội vận hành cùng theo dõi"
                      rows={5}
                      value={form.note}
                    />
                  </label>
                </div>

                <div className="inline-actions">
                  <button className="button button-primary" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button">
                    {saveMutation.isPending ? 'Đang lưu...' : 'Lưu cập nhật'}
                  </button>
                  {isAdmin ? (
                    <button
                      className="button button-danger"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (selectedContactId && window.confirm('Bạn chắc chắn muốn xóa yêu cầu hỗ trợ này?')) {
                          deleteMutation.mutate(selectedContactId);
                        }
                      }}
                      type="button"
                    >
                      {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa yêu cầu'}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p>Chọn một yêu cầu ở cột bên trái để xem chi tiết.</p>
            )}
          </article>
        </section>
      )}
    </div>
  );
}

export default AdminContactsPage;
