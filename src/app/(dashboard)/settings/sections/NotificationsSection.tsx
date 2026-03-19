 "use client";

type NotificationPrefs = {
  orders: boolean;
  carts: boolean;
  wishlist: boolean;
  contacts: boolean;
  emailMeOnOrderReceived: boolean;
  emailCustomerOnOrderConfirmed: boolean;
};

export default function NotificationsSection({
  hidden,
  notificationPrefs,
  onUpdatePref,
}: {
  hidden: boolean;
  notificationPrefs: NotificationPrefs;
  onUpdatePref: (key: keyof NotificationPrefs, value: boolean) => void;
}) {
  return (
    <section
      id="panel-notifications"
      role="tabpanel"
      aria-labelledby="tab-notifications"
      hidden={hidden}
      className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
    >
      <div className="w-full max-w-6xl space-y-6">
        <div>
          <h2 className="text-lg font-medium text-foreground">Notification preferences</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose which events should generate notifications in the top bar.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground">Orders</span>
            <input type="checkbox" checked={notificationPrefs.orders} onChange={(e) => onUpdatePref("orders", e.target.checked)} />
          </label>

          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground">Cart items</span>
            <input
              type="checkbox"
              checked={notificationPrefs.carts}
              onChange={(e) => onUpdatePref("carts", e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground">Wishlist items</span>
            <input
              type="checkbox"
              checked={notificationPrefs.wishlist}
              onChange={(e) => onUpdatePref("wishlist", e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground">Contact form submissions</span>
            <input
              type="checkbox"
              checked={notificationPrefs.contacts}
              onChange={(e) => onUpdatePref("contacts", e.target.checked)}
            />
          </label>
        </div>

        <div className="border-t border-border pt-4">
          <label className="text-sm font-medium text-foreground">Email notifications</label>
          <p className="mb-3 text-xs text-muted-foreground">Control when emails are sent for order events.</p>

          <div className="space-y-3">
            <label className="flex items-center justify-between gap-4 text-sm">
              <span className="text-foreground">Email me when an order is received</span>
              <input
                type="checkbox"
                checked={notificationPrefs.emailMeOnOrderReceived}
                onChange={(e) => onUpdatePref("emailMeOnOrderReceived", e.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between gap-4 text-sm">
              <span className="text-foreground">Email customer when an order is confirmed</span>
              <input
                type="checkbox"
                checked={notificationPrefs.emailCustomerOnOrderConfirmed}
                onChange={(e) => onUpdatePref("emailCustomerOnOrderConfirmed", e.target.checked)}
              />
            </label>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <label className="text-sm font-medium text-foreground">Delivery preference</label>
          <p className="mb-2 text-xs text-muted-foreground">Choose how to receive notifications (coming soon).</p>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="radio" name="delivery" disabled />
              Email
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="radio" name="delivery" disabled />
              In-app
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}

