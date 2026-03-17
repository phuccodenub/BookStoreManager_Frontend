import { useQuery, useSuspenseQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import StatCard from '@/components/StatCard';
import { useAuth } from '@/features/auth/AuthContext';
import { downloadDeliveryNote, downloadInvoice, getContacts, getDashboard, getInventoryTransactions, getOrders } from '@/features/admin/admin-api';
import { formatCurrency, formatDate } from '@/lib/format';
import { useRealtimeFeed } from '@/lib/realtime/useRealtimeFeed';

async function saveBlob(blobPromise: Promise<Blob>, filename: string) {
  const blob = await blobPromise;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function AdminPage() {
  const { session } = useAuth();
  const realtimeFeed = useRealtimeFeed(session?.accessToken ?? null, true);
  const { data: orders } = useSuspenseQuery({ queryKey: ['admin', 'orders'], queryFn: getOrders });
  const { data: contacts } = useSuspenseQuery({ queryKey: ['admin', 'contacts'], queryFn: getContacts });
  const { data: inventoryTransactions } = useSuspenseQuery({ queryKey: ['admin', 'inventory'], queryFn: getInventoryTransactions });
  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: getDashboard,
    enabled: session?.user.role === 'admin',
  });

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Backoffice"
        title="Operational cockpit for admin and staff"
        description="Orders, contacts, inventory, PDFs, and socket-driven signals are all reachable from this first API-first shell."
      />

      {dashboardQuery.data ? (
        <section className="stat-grid stat-grid-wide">
          <StatCard label="Users" value={dashboardQuery.data.totalUsers} />
          <StatCard label="Books" value={dashboardQuery.data.totalBooks} tone="ink" />
          <StatCard label="Orders" value={dashboardQuery.data.totalOrders} />
          <StatCard label="Revenue" value={formatCurrency(dashboardQuery.data.totalRevenue)} tone="ink" />
        </section>
      ) : null}

      <section className="two-column-grid two-column-grid-wide">
        <article className="surface-card">
          <SectionHeading eyebrow="Recent orders" title="With live PDF endpoints" />
          <div className="list-stack compact-list">
            {orders.map((order) => (
              <article key={order.id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <strong>{order.orderCode}</strong>
                    <p>{formatDate(order.createdAt)}</p>
                  </div>
                  <span>{order.orderStatus}</span>
                </div>
                <p>{formatCurrency(order.totalAmount)} • {order.paymentStatus}</p>
                <div className="inline-actions">
                  <button className="text-link" onClick={() => void saveBlob(downloadInvoice(order.id), `invoice-${order.orderCode}.pdf`)} type="button">Invoice</button>
                  <button className="text-link" onClick={() => void saveBlob(downloadDeliveryNote(order.id), `delivery-note-${order.orderCode}.pdf`)} type="button">Delivery note</button>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <SectionHeading eyebrow="Realtime feed" title="Latest socket events" />
          <div className="feed-stack">
            {realtimeFeed.length === 0 ? <p>No events yet. Trigger order/payment/inventory actions from the backend flows to see them here.</p> : realtimeFeed.map((event) => (
              <article key={`${event.event}-${event.receivedAt}`} className="feed-card">
                <strong>{event.event}</strong>
                <p>{formatDate(event.receivedAt)}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="two-column-grid two-column-grid-wide">
        <article className="surface-card">
          <SectionHeading eyebrow="Contacts queue" title="Incoming support requests" />
          {contacts.length === 0 ? <EmptyState title="No contacts" description="Public support submissions will appear here." /> : (
            <div className="list-stack compact-list">
              {contacts.map((contact) => (
                <article key={contact.id} className="contact-card">
                  <strong>{contact.subject}</strong>
                  <p>{contact.customerName} • {contact.status}</p>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="surface-card">
          <SectionHeading eyebrow="Inventory" title="Latest transactions" />
          {inventoryTransactions.length === 0 ? <EmptyState title="No inventory entries" description="Imports, exports, and automatic order transactions will appear here." /> : (
            <div className="list-stack compact-list">
              {inventoryTransactions.map((transaction) => (
                <article key={transaction.id} className="inventory-card">
                  <strong>{transaction.book?.title ?? 'Inventory record'}</strong>
                  <p>{transaction.type} • {transaction.quantity} • {formatDate(transaction.createdAt)}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

export default AdminPage;
